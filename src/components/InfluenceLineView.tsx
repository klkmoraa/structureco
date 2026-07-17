import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  evaluateAxleTrain,
  evaluateInfluenceLine,
  type AxleTrainEnvelope,
  type ConcentratedAxle,
  type InfluenceLine,
  type InfluenceQuantity,
} from '../engine/influence';
import { useInfluenceAnalysis } from '../engine/useInfluenceAnalysis';
import { fromDisplay, toDisplay, unitLabel } from '../engine/units';
import type { DiagramQuantity, ProjectModel, Selection } from '../types';
import type { InfluenceCanvasState } from '../store/ProjectContext';

export interface InfluenceLineViewProps {
  project: ProjectModel;
  selection?: Selection;
  onCanvasStateChange?: (state: InfluenceCanvasState | null) => void;
}

type InfluenceSubtab = 'line' | 'train';

interface CurveSegment {
  x0: number;
  x1: number;
  coefficients: readonly [number, number, number, number];
}

interface CurveJump {
  x: number;
  left: number;
  right: number;
}

interface CurveExtreme {
  x: number;
  value: number;
  label: string;
}

interface CursorReading {
  position: number;
  value: number;
}

const controlGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
  gap: 10,
  alignItems: 'end',
};

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
};

const fieldStyle: CSSProperties = {
  display: 'grid',
  gap: 5,
  minWidth: 0,
  fontSize: 10,
  color: 'var(--muted)',
};

const inputStyle: CSSProperties = {
  width: '100%',
  minWidth: 0,
  border: '1px solid var(--border)',
  borderRadius: 7,
  padding: '7px 8px',
  background: 'var(--surface)',
  color: 'var(--text)',
  fontVariantNumeric: 'tabular-nums',
};

const secondaryButtonStyle: CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 8,
  background: 'var(--surface)',
  color: 'var(--text)',
  padding: '8px 10px',
};

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.max(minimum, Math.min(maximum, value));

const finiteExponential = (value: number, digits = 2): string =>
  Number.isFinite(value) ? value.toExponential(digits) : '—';

const polynomialValue = (coefficients: readonly number[], xi: number): number =>
  coefficients.reduceRight((value, coefficient) => value * xi + coefficient, 0);

const segmentEndValue = (segment: CurveSegment): number =>
  polynomialValue(segment.coefficients, segment.x1 - segment.x0);

const deriveJumps = (segments: readonly CurveSegment[]): CurveJump[] => {
  const jumps: CurveJump[] = [];
  for (let index = 1; index < segments.length; index += 1) {
    const previous = segments[index - 1];
    const next = segments[index];
    const left = segmentEndValue(previous);
    const right = polynomialValue(next.coefficients, 0);
    if (Math.abs(left - right) > 1e-10 * Math.max(1, Math.abs(left), Math.abs(right))) {
      jumps.push({ x: next.x0, left, right });
    }
  }
  return jumps;
};

const memberDeformableLength = (project: ProjectModel, memberId: string): number => {
  const member = project.members.find((candidate) => candidate.id === memberId);
  if (!member) return 0;
  const nodeI = project.nodes.find((node) => node.id === member.i);
  const nodeJ = project.nodes.find((node) => node.id === member.j);
  if (!nodeI || !nodeJ) return 0;
  return Math.max(0, Math.hypot(nodeJ.x - nodeI.x, nodeJ.y - nodeI.y)
    - (member.rigidOffsetI ?? 0) - (member.rigidOffsetJ ?? 0));
};

const selectionFrameIds = (project: ProjectModel, selection: Selection | undefined): string[] => {
  const requested = selection?.kind === 'member'
    ? [selection.id]
    : selection?.kind === 'multi'
      ? selection.memberIds
      : [];
  const frameIds = new Set(project.members.filter((member) => member.type === 'frame').map((member) => member.id));
  return requested.filter((id) => frameIds.has(id));
};

const diagramQuantity = (quantity: InfluenceQuantity): DiagramQuantity =>
  quantity === 'N' ? 'axial' : quantity === 'V' ? 'shear' : 'moment';

const curveClass = (quantity: InfluenceQuantity): DiagramQuantity => diagramQuantity(quantity);

const cubicBezier = (segment: CurveSegment) => {
  const length = segment.x1 - segment.x0;
  const [c0, c1, c2, c3] = segment.coefficients;
  const y0 = c0;
  const y1 = polynomialValue(segment.coefficients, length);
  const slope0 = c1;
  const slope1 = c1 + 2 * c2 * length + 3 * c3 * length ** 2;
  return {
    x0: segment.x0,
    y0,
    c1x: segment.x0 + length / 3,
    c1y: y0 + slope0 * length / 3,
    c2x: segment.x1 - length / 3,
    c2y: y1 - slope1 * length / 3,
    x1: segment.x1,
    y1,
  };
};

interface ExactPolynomialChartProps {
  ariaLabel: string;
  colorClass: DiagramQuantity;
  segments: readonly CurveSegment[];
  jumps: readonly CurveJump[];
  domain: readonly [number, number];
  minimum: CurveExtreme;
  maximum: CurveExtreme;
  valueAt: (position: number) => number;
  formatX: (position: number) => string;
  formatY: (value: number) => string;
  xAxisLabel: string;
  yAxisLabel: string;
  onCursorChange: (reading: CursorReading | null) => void;
}

const ExactPolynomialChart = ({
  ariaLabel,
  colorClass,
  segments,
  jumps,
  domain,
  minimum,
  maximum,
  valueAt,
  formatX,
  formatY,
  xAxisLabel,
  yAxisLabel,
  onCursorChange,
}: ExactPolynomialChartProps) => {
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [pinnedPosition, setPinnedPosition] = useState<number | null>(null);
  const [domainStart, domainEnd] = domain;
  const domainLength = Math.max(1e-12, domainEnd - domainStart);
  const maxAbs = Math.max(Math.abs(minimum.value), Math.abs(maximum.value), 1e-12);
  const width = 880;
  const height = 220;
  const baseline = 106;
  const amplitude = 76;
  const sx = useCallback(
    (x: number) => ((x - domainStart) / domainLength) * width,
    [domainLength, domainStart],
  );
  const sy = useCallback(
    (value: number) => baseline - value / maxAbs * amplitude,
    [maxAbs],
  );
  const activePosition = pinnedPosition ?? hoverPosition;
  const activeValue = activePosition === null ? null : valueAt(activePosition);

  useEffect(() => {
    setHoverPosition(null);
    setPinnedPosition(null);
  }, [domainEnd, domainStart, segments]);

  useEffect(() => {
    onCursorChange(activePosition === null || activeValue === null
      ? null
      : { position: activePosition, value: activeValue });
  }, [activePosition, activeValue, onCursorChange]);

  const paths = useMemo(() => segments.map((segment) => {
    const control = cubicBezier(segment);
    const number = (value: number) => value.toFixed(5);
    return `M ${number(sx(control.x0))} ${number(sy(control.y0))} C ${number(sx(control.c1x))} ${number(sy(control.c1y))} ${number(sx(control.c2x))} ${number(sy(control.c2y))} ${number(sx(control.x1))} ${number(sy(control.y1))}`;
  }), [segments, sx, sy]);

  const positionFromPointer = (event: ReactPointerEvent<SVGSVGElement>): number => {
    const rectangle = event.currentTarget.getBoundingClientRect();
    if (rectangle.width <= 0) return domainStart;
    return clamp(domainStart + (event.clientX - rectangle.left) / rectangle.width * domainLength, domainStart, domainEnd);
  };

  const onKeyDown = (event: ReactKeyboardEvent<SVGSVGElement>) => {
    const step = domainLength / 100;
    const current = activePosition ?? domainStart;
    let next: number | null = null;
    if (event.key === 'ArrowLeft') next = current - step;
    else if (event.key === 'ArrowRight') next = current + step;
    else if (event.key === 'Home') next = domainStart;
    else if (event.key === 'End') next = domainEnd;
    else if (event.key === 'Escape') {
      event.preventDefault();
      setPinnedPosition(null);
      return;
    }
    if (next === null) return;
    event.preventDefault();
    const clamped = clamp(next, domainStart, domainEnd);
    setPinnedPosition(clamped);
    setHoverPosition(clamped);
  };

  const extrema = minimum.x === maximum.x && minimum.value === maximum.value ? [minimum] : [minimum, maximum];
  const first = segments[0];
  const last = segments.at(-1);
  const endpoints = first && last
    ? [
        { x: first.x0, value: polynomialValue(first.coefficients, 0) },
        { x: last.x1, value: segmentEndValue(last) },
      ]
    : [];

  return <div className={`diagram-chart ${colorClass}`}>
    <div className="diagram-chart-heading">
      <strong>{ariaLabel}</strong>
      <small>{pinnedPosition === null ? 'Mueve el cursor · toca para fijar' : 'Lectura fijada · Esc para liberar'}</small>
    </div>
    <svg
      tabIndex={0}
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      onKeyDown={onKeyDown}
      onPointerMove={(event) => setHoverPosition(positionFromPointer(event))}
      onPointerDown={(event) => {
        const position = positionFromPointer(event);
        setHoverPosition(position);
        setPinnedPosition((current) => current === null ? position : null);
      }}
      onPointerLeave={() => setHoverPosition(null)}
    >
      <title>{ariaLabel}</title>
      <desc>Cada intervalo se representa con una Bézier cúbica equivalente al polinomio del motor; no se muestrea la curva.</desc>
      <line className="chart-axis" x1="0" y1={baseline} x2={width} y2={baseline} />
      {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
        const position = domainStart + fraction * domainLength;
        return <g className="chart-tick" key={fraction}>
          <line x1={sx(position)} y1={baseline - 4} x2={sx(position)} y2={baseline + 5} />
          <text x={sx(position)} y={height - 10} textAnchor={fraction === 0 ? 'start' : fraction === 1 ? 'end' : 'middle'}>{formatX(position)}</text>
        </g>;
      })}
      <text x="8" y="14">{yAxisLabel}</text>
      <text x={width - 8} y={height - 10} textAnchor="end">{xAxisLabel}</text>
      <text x="4" y={sy(maxAbs) - 4}>{formatY(maxAbs)}</text>
      <text x="4" y={sy(-maxAbs) + 12}>{formatY(-maxAbs)}</text>
      {paths.map((path, index) => <path className="chart-line" d={path} fill="none" key={`${segments[index].x0}-${segments[index].x1}`} />)}
      {jumps.map((jump, index) => <line className="chart-jump" x1={sx(jump.x)} y1={sy(jump.left)} x2={sx(jump.x)} y2={sy(jump.right)} key={`${jump.x}-${index}`} />)}
      {endpoints.map((point, index) => <circle className="chart-line" cx={sx(point.x)} cy={sy(point.value)} fill="var(--surface)" r="3.8" key={`end-${index}`} />)}
      {extrema.map((point) => <g className="chart-critical" key={`${point.label}-${point.x}-${point.value}`}>
        <circle cx={sx(point.x)} cy={sy(point.value)} r="3.4" />
        <text x={sx(point.x)} y={sy(point.value) + (point.value >= 0 ? -8 : 14)} textAnchor={point.x < domainStart + domainLength * 0.08 ? 'start' : point.x > domainEnd - domainLength * 0.08 ? 'end' : 'middle'}>{point.label} {formatY(point.value)}</text>
      </g>)}
      {activePosition !== null && activeValue !== null ? <g className={`chart-hover ${pinnedPosition === null ? '' : 'pinned'}`}>
        <line x1={sx(activePosition)} y1="18" x2={sx(activePosition)} y2={height - 24} />
        <circle cx={sx(activePosition)} cy={sy(activeValue)} r="4" />
      </g> : null}
    </svg>
    {activePosition !== null && activeValue !== null
      ? <div className="diagram-cursor-readout"><span><b>x</b>{formatX(activePosition)}</span><span><b>valor</b>{formatY(activeValue)}</span></div>
      : <div className="diagram-cursor-placeholder">Cursor exacto sobre el polinomio · los saltos conservan sus límites laterales</div>}
  </div>;
};

const InfluenceDiagnostics = ({ line }: { line: InfluenceLine }) => {
  const closurePassed = line.fit.maxAbsoluteError <= 1e-9 || line.fit.maxRelativeError <= 1e-8;
  const equilibriumResidual = Math.max(line.solver.maxEquilibriumResidual, line.solver.maxStructuralResidual);
  const equilibriumPassed = equilibriumResidual <= 1e-8;
  const precisionPassed = (line.solver.maxForwardErrorBound <= 1e-6 || !Number.isFinite(line.solver.maxForwardErrorBound))
    && (line.solver.minReliableDigits >= 6 || !Number.isFinite(line.solver.minReliableDigits));
  return <>
    <div className="verification-grid">
      <div className={closurePassed ? 'passed' : 'warning'}><span>Cierre polinómico</span><strong>{finiteExponential(line.fit.maxAbsoluteError, 3)}</strong><small>Error abs. máx.; relativo {finiteExponential(line.fit.maxRelativeError, 2)} en {line.fit.validations.length} puntos independientes.</small></div>
      <div className={equilibriumPassed ? 'passed' : 'warning'}><span>Equilibrio</span><strong>{finiteExponential(equilibriumResidual, 3)}</strong><small>Máximo entre equilibrio global y residuo estructural de {line.solver.analyses} análisis.</small></div>
      <div className={precisionPassed ? 'passed' : 'warning'}><span>Precisión estimada</span><strong>{Number.isFinite(line.solver.minReliableDigits) ? `${line.solver.minReliableDigits.toFixed(1)} dígitos` : 'No estimada'}</strong><small>Cota de error {finiteExponential(line.solver.maxForwardErrorBound, 2)}; residuo lineal {finiteExponential(line.solver.maxLinearResidual, 2)}.</small></div>
      <div className="passed"><span>Extremos</span><strong>Raíces exactas</strong><small>Se evalúan extremos, saltos y raíces de la derivada cúbica, sin malla de posiciones.</small></div>
    </div>
    <details style={{ margin: '8px 12px 12px' }}>
      <summary style={{ cursor: 'pointer', fontSize: 10, color: 'var(--muted)' }}>Detalle numérico del ajuste y del solver</summary>
      <div className="education-kpis" style={{ marginTop: 8 }}>
        <div><span>κ interpolación</span><strong>{finiteExponential(line.fit.interpolationConditionEstimate, 2)}</strong></div>
        <div><span>Residuo interpolación</span><strong>{finiteExponential(line.fit.interpolationRelativeResidual, 2)}</strong></div>
        <div><span>Razón pivote</span><strong>{finiteExponential(line.fit.interpolationPivotRatio, 2)}</strong></div>
        <div><span>κ estructural máx.</span><strong>{finiteExponential(line.solver.maxConditionEstimate, 2)}</strong></div>
      </div>
    </details>
  </>;
};

const lineCurveSegments = (line: InfluenceLine | null): CurveSegment[] => line?.segments.map((segment) => ({
  x0: segment.pathStart,
  x1: segment.pathEnd,
  coefficients: segment.coefficients,
})) ?? [];

const trainCurveSegments = (train: AxleTrainEnvelope | null): CurveSegment[] => train?.segments.map((segment) => ({
  x0: segment.positionStart,
  x1: segment.positionEnd,
  coefficients: segment.coefficients,
})) ?? [];

export const InfluenceLineView = ({ project, selection = null, onCanvasStateChange }: InfluenceLineViewProps) => {
  const deformableMembers = useMemo(() => project.members.filter((member) => member.type !== 'rigid'), [project.members]);
  const frameMembers = useMemo(() => project.members.filter((member) => member.type === 'frame'), [project.members]);
  const selectedFrameIds = useMemo(() => selectionFrameIds(project, selection), [project, selection]);
  const selectedMemberId = selection?.kind === 'member'
    ? selection.id
    : selection?.kind === 'multi'
      ? selection.memberIds[0]
      : undefined;
  const initialTargetId = deformableMembers.some((member) => member.id === selectedMemberId)
    ? selectedMemberId ?? ''
    : frameMembers[0]?.id ?? deformableMembers[0]?.id ?? '';
  const [targetMemberId, setTargetMemberId] = useState(initialTargetId);
  const [targetX, setTargetX] = useState(() => memberDeformableLength(project, initialTargetId) / 2);
  const [quantity, setQuantity] = useState<InfluenceQuantity>('M');
  const [targetSide, setTargetSide] = useState<'left' | 'right'>('right');
  const [pathMemberIds, setPathMemberIds] = useState<string[]>(() => selectedFrameIds.length
    ? selectedFrameIds
    : frameMembers[0] ? [frameMembers[0].id] : []);
  const [subtab, setSubtab] = useState<InfluenceSubtab>('line');
  const [axles, setAxles] = useState<ConcentratedAxle[]>([
    { id: 'E1', P: 100, offset: 0 },
    { id: 'E2', P: 100, offset: 2 },
  ]);
  const [impactFactor, setImpactFactor] = useState(1);
  const [localError, setLocalError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<CursorReading | null>(null);
  const axleIdRef = useRef(3);
  const canvasCallbackRef = useRef(onCanvasStateChange);
  const { line, axleTrain, busy, error, run, clear } = useInfluenceAnalysis(project);
  const units = project.settings.units;
  const lengthUnit = unitLabel(units, 'length');
  const forceUnit = unitLabel(units, 'force');
  const momentUnit = unitLabel(units, 'moment');
  const targetLength = memberDeformableLength(project, targetMemberId);
  const targetLengthDisplay = toDisplay(targetLength, units, 'length');
  const rangeStep = Math.max(targetLengthDisplay / 200, 10 ** -6);

  useEffect(() => {
    canvasCallbackRef.current = onCanvasStateChange;
  }, [onCanvasStateChange]);

  useEffect(() => () => canvasCallbackRef.current?.(null), []);

  useEffect(() => {
    if (deformableMembers.some((member) => member.id === targetMemberId)) return;
    const next = frameMembers[0]?.id ?? deformableMembers[0]?.id ?? '';
    setTargetMemberId(next);
    setTargetX(memberDeformableLength(project, next) / 2);
  }, [deformableMembers, frameMembers, project, targetMemberId]);

  useEffect(() => {
    setTargetX((current) => clamp(current, 0, targetLength));
  }, [targetLength]);

  useEffect(() => {
    const validFrames = new Set(frameMembers.map((member) => member.id));
    setPathMemberIds((current) => {
      const valid = current.filter((id) => validFrames.has(id));
      return valid.length ? valid : frameMembers[0] ? [frameMembers[0].id] : [];
    });
  }, [frameMembers]);

  useEffect(() => {
    const callback = canvasCallbackRef.current;
    if (!callback) return;
    if (!line) {
      callback(null);
      return;
    }
    let source: InfluenceCanvasState['source'];
    if (subtab === 'line' && cursor) {
      const tolerance = Math.max(1, line.path.length) * 1e-10;
      const pathMember = line.path.members.find((member) => cursor.position < member.pathEnd - tolerance)
        ?? line.path.members.at(-1);
      if (pathMember) {
        const alongPath = clamp(cursor.position - pathMember.pathStart, 0, pathMember.length);
        const memberX = pathMember.reversed ? pathMember.length - alongPath : alongPath;
        source = {
          memberId: pathMember.memberId,
          ratio: pathMember.length > 0 ? memberX / pathMember.length : 0,
          ordinate: cursor.value,
        };
      }
    }
    callback({
      pathMemberIds: line.path.members.map((member) => member.memberId),
      target: {
        memberId: line.target.memberId,
        x: line.target.x,
        quantity: diagramQuantity(line.target.quantity),
      },
      source,
    });
  }, [cursor, line, subtab]);

  const invalidate = useCallback(() => {
    clear();
    setCursor(null);
    setLocalError(null);
  }, [clear]);

  const useSelectionAsPath = () => {
    if (!selectedFrameIds.length) {
      setLocalError('La selección no contiene miembros frame. Selecciona una barra o una cadena continua.');
      return;
    }
    invalidate();
    setPathMemberIds(selectedFrameIds);
  };

  const calculate = () => {
    setLocalError(null);
    if (!targetMemberId || targetLength <= 0) {
      setLocalError('Selecciona un miembro objetivo deformable.');
      return;
    }
    if (!pathMemberIds.length) {
      setLocalError('Selecciona una trayectoria de al menos un miembro frame.');
      return;
    }
    if (axles.length < 1 || axles.length > 4) {
      setLocalError('El tren debe contener entre uno y cuatro ejes.');
      return;
    }
    if (axles.some((axle) => !Number.isFinite(axle.P) || axle.P <= 0 || !Number.isFinite(axle.offset))) {
      setLocalError('Cada eje necesita una P positiva hacia abajo y un offset finito.');
      return;
    }
    if (!Number.isFinite(impactFactor) || impactFactor < 1) {
      setLocalError('El factor de impacto debe ser mayor o igual que 1.');
      return;
    }
    setCursor(null);
    run({
      pathMemberIds,
      target: { memberId: targetMemberId, x: targetX, quantity, side: targetSide },
      train: { axles, impactFactor },
    });
  };

  const updateAxle = (index: number, changes: Partial<ConcentratedAxle>) => {
    invalidate();
    setAxles((current) => current.map((axle, axleIndex) => axleIndex === index ? { ...axle, ...changes } : axle));
  };

  const addAxle = () => {
    if (axles.length >= 4) return;
    invalidate();
    const spacing = Math.max(targetLength / 4, 1);
    const lastOffset = axles.at(-1)?.offset ?? -spacing;
    const id = `E${axleIdRef.current}`;
    axleIdRef.current += 1;
    setAxles((current) => [...current, { id, P: 100, offset: lastOffset + spacing }]);
  };

  const removeAxle = (index: number) => {
    if (axles.length <= 1) return;
    invalidate();
    setAxles((current) => current.filter((_, axleIndex) => axleIndex !== index));
  };

  const lineSegments = useMemo(() => lineCurveSegments(line), [line]);
  const trainSegments = useMemo(() => trainCurveSegments(axleTrain), [axleTrain]);
  const lineJumps = useMemo(() => line?.jumps.map((jump) => ({ x: jump.position, left: jump.left, right: jump.right })) ?? [], [line]);
  const trainJumps = useMemo(() => deriveJumps(trainSegments), [trainSegments]);
  const lineValueAt = useCallback((position: number) => line ? evaluateInfluenceLine(line, position, 'right') ?? 0 : 0, [line]);
  const trainValueAt = useCallback((position: number) => axleTrain ? evaluateAxleTrain(axleTrain, position, 'right') : 0, [axleTrain]);
  const formatPathX = useCallback((position: number) => `${toDisplay(position, units, 'length').toFixed(3)} ${lengthUnit}`, [lengthUnit, units]);
  const formatInfluenceValue = useCallback((value: number) => quantity === 'M'
    ? `${toDisplay(value, units, 'length').toPrecision(5)} ${lengthUnit}`
    : value.toPrecision(5), [lengthUnit, quantity, units]);
  const formatTrainValue = useCallback((value: number) => quantity === 'M'
    ? `${toDisplay(value, units, 'moment').toPrecision(5)} ${momentUnit}`
    : `${toDisplay(value, units, 'force').toPrecision(5)} ${forceUnit}`, [forceUnit, momentUnit, quantity, units]);
  const pathSummary = pathMemberIds.length
    ? `${pathMemberIds.length} miembro${pathMemberIds.length === 1 ? '' : 's'} · ${pathMemberIds.join(' → ')}`
    : 'Sin trayectoria';
  const displayedError = localError ?? error;

  return <section className="education-explorer influence-line-view" aria-label="Línea de influencia y tren de ejes">
    <div className="education-explorer-heading">
      <div><strong>Línea de influencia</strong><small>Carga unitaria vertical · reconstrucción cúbica validada · extremos sin barrido</small></div>
      <span>{busy ? 'Calculando…' : line ? `${line.solver.analyses} análisis` : 'N · V · M'}</span>
    </div>
    <div className="education-stage" style={{ display: 'grid', gap: 12 }}>
      <div style={controlGridStyle}>
        <label style={fieldStyle}><span>Esfuerzo objetivo</span><div className="response-selector" role="group" aria-label="Esfuerzo de la línea de influencia">
          {(['N', 'V', 'M'] as const).map((item) => <button type="button" aria-pressed={quantity === item} className={quantity === item ? 'active' : ''} key={item} onClick={() => { invalidate(); setQuantity(item); }}>{item}</button>)}
        </div></label>
        <label style={fieldStyle}><span>Miembro objetivo</span><select style={inputStyle} value={targetMemberId} onChange={(event) => {
          const memberId = event.currentTarget.value;
          invalidate();
          setTargetMemberId(memberId);
          setTargetX(memberDeformableLength(project, memberId) / 2);
        }}>{deformableMembers.map((member) => <option value={member.id} key={member.id}>{member.label ? `${member.id} · ${member.label}` : member.id}</option>)}</select></label>
        <label style={fieldStyle}><span>Límite en el corte</span><select style={inputStyle} value={targetSide} onChange={(event) => { invalidate(); setTargetSide(event.currentTarget.value as 'left' | 'right'); }}><option value="right">Derecho</option><option value="left">Izquierdo</option></select></label>
        <div style={fieldStyle}><span>Trayectoria de la carga</span><button type="button" style={secondaryButtonStyle} disabled={!selectedFrameIds.length || busy} onClick={useSelectionAsPath}>Usar selección ({selectedFrameIds.length})</button></div>
      </div>
      <label style={fieldStyle}>
        <span>Sección objetivo x · 0 a {targetLengthDisplay.toFixed(3)} {lengthUnit}</span>
        <div style={rowStyle}>
          <input style={{ flex: '1 1 260px' }} type="range" min={0} max={targetLengthDisplay || 0} step={rangeStep} value={toDisplay(targetX, units, 'length')} onChange={(event) => { invalidate(); setTargetX(fromDisplay(event.currentTarget.valueAsNumber, units, 'length')); }} />
          <span className="number-control" style={{ width: 150 }}><input aria-label="Coordenada del corte" type="number" min={0} max={targetLengthDisplay || 0} step={rangeStep} value={toDisplay(targetX, units, 'length')} onChange={(event) => {
            if (!Number.isFinite(event.currentTarget.valueAsNumber)) return;
            invalidate();
            setTargetX(clamp(fromDisplay(event.currentTarget.valueAsNumber, units, 'length'), 0, targetLength));
          }} /><small>{lengthUnit}</small></span>
        </div>
      </label>
      <div style={rowStyle}>
        <small style={{ flex: '1 1 280px', color: 'var(--muted)' }}>{pathSummary}</small>
        <button type="button" disabled={busy || !frameMembers.length || !deformableMembers.length} onClick={calculate}>{busy ? 'Calculando…' : 'Calcular'}</button>
      </div>
      {displayedError ? <div className="issue-card error" role="alert"><span className="issue-icon">!</span><div><strong>No se pudo completar el cálculo</strong><p>{displayedError}</p></div></div> : null}
    </div>

    <div className="education-stage-tabs" role="tablist" aria-label="Vista de influencia">
      <button type="button" role="tab" aria-selected={subtab === 'line'} className={subtab === 'line' ? 'active' : ''} onClick={() => { setCursor(null); setSubtab('line'); }}>Línea de influencia</button>
      <button type="button" role="tab" aria-selected={subtab === 'train'} className={subtab === 'train' ? 'active' : ''} onClick={() => { setCursor(null); setSubtab('train'); }}>Tren de ejes</button>
    </div>

    {subtab === 'train' ? <div className="education-stage" style={{ display: 'grid', gap: 10 }}>
      <div style={rowStyle}><strong style={{ fontSize: 11, flex: 1 }}>Editor local · {axles.length}/4 ejes</strong><label style={{ ...fieldStyle, gridTemplateColumns: 'auto 100px', alignItems: 'center' }}><span>Impacto φ ≥ 1</span><input aria-label="Factor de impacto" style={inputStyle} type="number" min={1} step={0.01} value={impactFactor} onChange={(event) => { if (!Number.isFinite(event.currentTarget.valueAsNumber)) return; invalidate(); setImpactFactor(event.currentTarget.valueAsNumber); }} /></label><button type="button" style={secondaryButtonStyle} disabled={axles.length >= 4} onClick={addAxle}>+ Eje</button></div>
      <div className="table-wrap"><table className="results-table"><thead><tr><th>Eje</th><th>P positiva ↓ ({forceUnit})</th><th>Offset ({lengthUnit})</th><th>Acción</th></tr></thead><tbody>{axles.map((axle, index) => <tr key={axle.id ?? index}><td><strong>{axle.id ?? `E${index + 1}`}</strong></td><td><input aria-label={`Carga del eje ${index + 1}`} style={inputStyle} type="number" min={0} step="any" value={toDisplay(axle.P, units, 'force')} onChange={(event) => { if (Number.isFinite(event.currentTarget.valueAsNumber)) updateAxle(index, { P: fromDisplay(event.currentTarget.valueAsNumber, units, 'force') }); }} /></td><td><input aria-label={`Offset del eje ${index + 1}`} style={inputStyle} type="number" step="any" value={toDisplay(axle.offset, units, 'length')} onChange={(event) => { if (Number.isFinite(event.currentTarget.valueAsNumber)) updateAxle(index, { offset: fromDisplay(event.currentTarget.valueAsNumber, units, 'length') }); }} /></td><td><button type="button" style={secondaryButtonStyle} disabled={axles.length <= 1} onClick={() => removeAxle(index)}>Quitar</button></td></tr>)}</tbody></table></div>
      <small style={{ color: 'var(--muted)' }}>El offset se mide desde la referencia del tren. El motor superpone polinomios trasladados y encuentra extremos mediante raíces de la derivada; no usa una cuadrícula de posiciones.</small>
    </div> : null}

    {!line && !busy ? <div className="empty-small">Define la sección y la trayectoria, luego pulsa Calcular.</div> : null}
    {busy ? <div className="empty-small" aria-live="polite">Resolviendo cargas unitarias y validando cada tramo…</div> : null}

    {line && subtab === 'line' ? <>
      <div className="education-stage" style={{ paddingBottom: 0 }}><div className="education-kpis">
        <div><span>Mínimo</span><strong>{formatInfluenceValue(line.minimum.value)}</strong><small>x {formatPathX(line.minimum.position)}</small></div>
        <div><span>Máximo</span><strong>{formatInfluenceValue(line.maximum.value)}</strong><small>x {formatPathX(line.maximum.position)}</small></div>
        <div><span>Longitud de ruta</span><strong>{formatPathX(line.path.length)}</strong><small>{line.path.members.length} miembros ordenados</small></div>
        <div><span>Representación</span><strong>{line.segments.length} cúbicas</strong><small>{line.jumps.length} saltos explícitos</small></div>
      </div></div>
      <ExactPolynomialChart
        ariaLabel={`Línea de influencia ${quantity} en ${line.target.memberId}, x = ${formatPathX(line.target.x)}`}
        colorClass={curveClass(quantity)}
        segments={lineSegments}
        jumps={lineJumps}
        domain={[0, line.path.length]}
        minimum={{ x: line.minimum.position, value: line.minimum.value, label: 'mín.' }}
        maximum={{ x: line.maximum.position, value: line.maximum.value, label: 'máx.' }}
        valueAt={lineValueAt}
        formatX={formatPathX}
        formatY={formatInfluenceValue}
        xAxisLabel={`posición sobre la ruta (${lengthUnit})`}
        yAxisLabel={quantity === 'M' ? `ψM (${lengthUnit})` : `ψ${quantity} (adim.)`}
        onCursorChange={setCursor}
      />
      <InfluenceDiagnostics line={line} />
    </> : null}

    {line && subtab === 'train' && axleTrain ? <>
      <div className="education-stage" style={{ paddingBottom: 0 }}><div className="education-kpis">
        <div><span>Mínimo del tren</span><strong>{formatTrainValue(axleTrain.minimum.value)}</strong><small>ref. {formatPathX(axleTrain.minimum.referencePosition)}</small></div>
        <div><span>Máximo del tren</span><strong>{formatTrainValue(axleTrain.maximum.value)}</strong><small>ref. {formatPathX(axleTrain.maximum.referencePosition)}</small></div>
        <div><span>Dominio de referencia</span><strong>{formatPathX(axleTrain.domain[1] - axleTrain.domain[0])}</strong><small>{formatPathX(axleTrain.domain[0])} a {formatPathX(axleTrain.domain[1])}</small></div>
        <div><span>Solución</span><strong>{axleTrain.segments.length} cúbicas</strong><small>φ = {axleTrain.train.impactFactor.toFixed(3)} · {axleTrain.train.axles.length} ejes</small></div>
      </div></div>
      <ExactPolynomialChart
        ariaLabel={`Respuesta exacta del tren para ${quantity} en ${line.target.memberId}`}
        colorClass={curveClass(quantity)}
        segments={trainSegments}
        jumps={trainJumps}
        domain={axleTrain.domain}
        minimum={{ x: axleTrain.minimum.referencePosition, value: axleTrain.minimum.value, label: 'mín.' }}
        maximum={{ x: axleTrain.maximum.referencePosition, value: axleTrain.maximum.value, label: 'máx.' }}
        valueAt={trainValueAt}
        formatX={formatPathX}
        formatY={formatTrainValue}
        xAxisLabel={`posición de referencia (${lengthUnit})`}
        yAxisLabel={quantity === 'M' ? momentUnit : forceUnit}
        onCursorChange={setCursor}
      />
      <details style={{ margin: '0 12px 12px' }}><summary style={{ cursor: 'pointer', fontSize: 10, color: 'var(--muted)' }}>Posiciones exactas de los ejes en los extremos</summary><div style={{ ...controlGridStyle, marginTop: 8 }}>{([['Mínimo', axleTrain.minimum], ['Máximo', axleTrain.maximum]] as const).map(([label, extreme]) => <div className="matrix-view" style={{ marginTop: 0 }} key={label}><div className="matrix-view-heading"><strong>{label}</strong><span>ref. {formatPathX(extreme.referencePosition)}</span></div><div style={{ padding: 9, display: 'grid', gap: 4 }}>{extreme.axlePositions.map((position, index) => <small key={`${position.id}-${index}`} style={{ color: position.onPath ? 'var(--text)' : 'var(--muted)' }}>{position.id ?? `E${index + 1}`}: {formatPathX(position.position)} · {position.onPath ? 'sobre la ruta' : 'fuera de la ruta'}</small>)}</div></div>)}</div></details>
      <InfluenceDiagnostics line={line} />
    </> : null}
  </section>;
};
