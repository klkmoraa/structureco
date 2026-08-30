import { memo, useMemo } from 'react';
import type { AnalysisResult, NodeModel, ProjectModel } from '../../types';
import type { TranslationKey } from '../../i18n/catalogs';
import { segmentBezierControls } from '../../engine/diagram';
import { memberAxis } from '../../graphics/structureGeometry';
import { formatFixed } from '../../utils/numberFormat';
import { STACK_QUANTITIES, STACK_SYMBOLS, type StackQuantity } from './diagramStack';

type MemberResult = AnalysisResult['memberResults'][number];
type Translate = (key: TranslationKey, variables?: Record<string, string | number>) => string;
type DiagramSize = { width: number; height: number };
type Bounds = { minX: number; maxX: number; minY: number; maxY: number };
type CanvasCell = { quantity: StackQuantity; x: number; y: number; width: number; height: number };

const boundsOf = (project: ProjectModel): Bounds => {
  const [first, ...rest] = project.nodes;
  if (!first) return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
  return rest.reduce<Bounds>((bounds, node) => ({
    minX: Math.min(bounds.minX, node.x), maxX: Math.max(bounds.maxX, node.x),
    minY: Math.min(bounds.minY, node.y), maxY: Math.max(bounds.maxY, node.y),
  }), { minX: first.x, maxX: first.x, minY: first.y, maxY: first.y });
};

const maximumFor = (results: readonly MemberResult[], quantity: StackQuantity): number => Math.max(
  1e-9,
  ...results.map((result) => quantity === 'axial'
    ? Math.max(Math.abs(result.minAxial), Math.abs(result.maxAxial))
    : quantity === 'shear'
      ? Math.max(Math.abs(result.minShear), Math.abs(result.maxShear))
      : Math.max(Math.abs(result.minMoment), Math.abs(result.maxMoment))),
);

/**
 * ACM is a canvas mode, not a floating appendage below the editable structure.
 * The cells consume the usable drawing viewport and leave only the persistent
 * canvas controls uncovered. On phones the three readings are stacked; on a
 * genuinely wide viewport they can share one row.
 */
const canvasCells = (size: DiagramSize, quantities: readonly StackQuantity[]): CanvasCell[] => {
  if (!quantities.length) return [];
  const compact = size.width < 700 || size.height < 600;
  const left = compact ? 10 : 18;
  const right = compact ? 10 : 84;
  const top = compact ? 76 : 70;
  const bottom = compact ? 68 : 54;
  const gap = compact ? 6 : 10;
  const usableWidth = Math.max(1, size.width - left - right);
  const usableHeight = Math.max(1, size.height - top - bottom);

  if (!compact && usableWidth / Math.max(1, usableHeight) > 1.7) {
    const width = Math.max(1, (usableWidth - gap * (quantities.length - 1)) / quantities.length);
    return quantities.map((quantity, index) => ({
      quantity,
      x: left + index * (width + gap),
      y: top,
      width,
      height: usableHeight,
    }));
  }

  const height = Math.max(1, (usableHeight - gap * (quantities.length - 1)) / quantities.length);
  return quantities.map((quantity, index) => ({
    quantity,
    x: left,
    y: top + index * (height + gap),
    width: usableWidth,
    height,
  }));
};

/** ACM no longer reserves a second drawing zone outside the canvas model area. */
export const externalStackBottomReserve = (_project: ProjectModel, _size: DiagramSize, _quantityCount: number): number => 0;

/**
 * Combined Axial/Cortante/Momento view rendered as a dedicated canvas scene.
 * A solid canvas background masks the normal editor scene while ACM is active,
 * so the analytical copies are not visually superimposed on the live model.
 */
export const CanvasDiagramStack = memo(({
  project, results, quantities, nodeMap, size, t,
}: {
  project: ProjectModel;
  results: readonly MemberResult[];
  quantities: readonly StackQuantity[];
  nodeMap: ReadonlyMap<string, NodeModel>;
  size: DiagramSize;
  t: Translate;
}) => {
  const compact = size.width < 700 || size.height < 600;
  const resultMap = useMemo(() => new Map(results.map((result) => [result.memberId, result])), [results]);
  const visibleQuantities = useMemo(() => STACK_QUANTITIES.filter((quantity) => quantities.includes(quantity)), [quantities]);
  const bounds = useMemo(() => boundsOf(project), [project]);
  const cells = useMemo(() => canvasCells(size, visibleQuantities), [size, visibleQuantities]);
  const maxima = useMemo(() => Object.fromEntries(STACK_QUANTITIES.map((quantity) => [quantity, maximumFor(results, quantity)])) as Record<StackQuantity, number>, [results]);
  const solvedMembers = useMemo(() => project.members.flatMap((member) => {
    const result = resultMap.get(member.id);
    const start = nodeMap.get(member.i);
    const end = nodeMap.get(member.j);
    if (!result?.diagramSegments.length || !start || !end) return [];
    const axis = memberAxis(member, start, end);
    return axis.length > 1e-12 ? [{ member, result, start, end, axis }] : [];
  }), [nodeMap, project.members, resultMap]);

  if (!cells.length || !solvedMembers.length) return null;
  const labelFor = (quantity: StackQuantity) => quantity === 'axial'
    ? t('results.axial')
    : quantity === 'shear'
      ? t('results.shear')
      : t('results.moment');
  const formatValue = (value: number) => {
    const stable = Math.abs(value) < 5e-8 ? 0 : value;
    const text = formatFixed(stable, Math.abs(stable) >= 100 ? 0 : 2, 'canvas');
    return text.includes('.') ? text.replace(/0+$/, '').replace(/\.$/, '') : text;
  };

  return <g className="diagram-stack-layer diagram-stack-layer--canvas" data-canvas-layer="diagram-stack" aria-label={t('canvas.evidenceStackStructure')}>
    <title>{t('canvas.evidenceStackStructureDetail')}</title>
    <rect className="diagram-stack-canvas-mask" x="0" y="0" width={size.width} height={size.height} fill="var(--canvas-bg)" />
    {cells.map((cell) => {
      const spanX = Math.max(1e-9, bounds.maxX - bounds.minX);
      const spanY = Math.max(1e-9, bounds.maxY - bounds.minY);
      const titleHeight = compact ? 18 : 24;
      const paddingX = compact ? 12 : 18;
      const paddingY = compact ? 8 : 14;
      const amplitude = Math.max(compact ? 10 : 15, Math.min(compact ? 19 : 30, cell.height * .17));
      const usableHeight = Math.max(1, cell.height - titleHeight - paddingY * 2 - amplitude * 2);
      const usableWidth = Math.max(1, cell.width - paddingX * 2);
      const scale = Math.min(usableWidth / spanX, usableHeight / spanY);
      const contentWidth = spanX * scale;
      const contentHeight = spanY * scale;
      const originX = cell.x + (cell.width - contentWidth) / 2 - bounds.minX * scale;
      const originY = cell.y + titleHeight + paddingY + amplitude + (usableHeight - contentHeight) / 2 + bounds.maxY * scale;
      const screenPoint = (node: NodeModel) => ({ x: originX + node.x * scale, y: originY - node.y * scale });

      return <g key={cell.quantity} className={`diagram-stack-panel ${cell.quantity}`} data-stack-panel={cell.quantity}>
        <rect className="diagram-stack-panel-surface" x={cell.x} y={cell.y} width={cell.width} height={cell.height} rx={compact ? 10 : 14} />
        <text className="diagram-stack-panel-title" x={cell.x + 10} y={cell.y + (compact ? 14 : 18)}>{compact ? STACK_SYMBOLS[cell.quantity] : `${STACK_SYMBOLS[cell.quantity]} · ${labelFor(cell.quantity)}`}</text>
        {solvedMembers.map(({ member, result, start, end, axis }) => {
          const memberStart = screenPoint(start);
          const memberEnd = screenPoint(end);
          const dx = memberEnd.x - memberStart.x;
          const dy = memberEnd.y - memberStart.y;
          const length = Math.hypot(dx, dy) || 1;
          const normal = { x: -dy / length, y: dx / length };
          const position = (x: number, value = 0) => {
            const ratio = ((result.startOffset ?? 0) + x) / axis.length;
            const base = { x: memberStart.x + dx * ratio, y: memberStart.y + dy * ratio };
            const pixels = value * amplitude / maxima[cell.quantity];
            return { x: base.x + normal.x * pixels, y: base.y + normal.y * pixels };
          };
          const first = segmentBezierControls(result.diagramSegments[0], cell.quantity);
          const baselineStart = position(0);
          const firstPoint = position(first.x0, first.y0);
          const line = [`M ${firstPoint.x} ${firstPoint.y}`];
          const fill = [`M ${baselineStart.x} ${baselineStart.y}`, `L ${firstPoint.x} ${firstPoint.y}`];
          result.diagramSegments.forEach((segment, index) => {
            const control = segmentBezierControls(segment, cell.quantity);
            const c1 = position(control.c1x, control.c1y);
            const c2 = position(control.c2x, control.c2y);
            const point = position(control.x1, control.y1);
            const curve = `C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${point.x} ${point.y}`;
            line.push(curve);
            fill.push(curve);
            const next = result.diagramSegments[index + 1];
            if (!next) return;
            const nextControl = segmentBezierControls(next, cell.quantity);
            if (Math.abs(nextControl.y0 - control.y1) > 1e-10) {
              const jump = position(nextControl.x0, nextControl.y0);
              line.push(`L ${jump.x} ${jump.y}`);
              fill.push(`L ${jump.x} ${jump.y}`);
            }
          });
          const baselineEnd = position(result.length);
          fill.push(`L ${baselineEnd.x} ${baselineEnd.y}`, 'Z');
          const midpoint = { x: (memberStart.x + memberEnd.x) / 2, y: (memberStart.y + memberEnd.y) / 2 };
          const readingPoints = result.criticalPoints
            .filter((point) => point.quantity === cell.quantity && (point.kind === 'maximum' || point.kind === 'minimum' || point.kind === 'end'))
            .filter((point, index, points) => index === points.findIndex((candidate) => Math.abs(candidate.x - point.x) < 1e-9 && Math.abs(candidate.value - point.value) < 1e-9))
            .slice(0, compact ? 2 : 3);

          return <g key={`${member.id}:${cell.quantity}`} className={`diagram-stack-member-lane ${cell.quantity}`} data-stack-member={member.id} data-stack-lane={cell.quantity}>
            <line className="diagram-stack-replica-member" x1={memberStart.x} y1={memberStart.y} x2={memberEnd.x} y2={memberEnd.y} />
            <path className="diagram-stack-member-baseline" d={`M ${baselineStart.x} ${baselineStart.y} L ${baselineEnd.x} ${baselineEnd.y}`} />
            <path className="diagram-stack-member-fill" d={fill.join(' ')} />
            <path className="diagram-stack-member-line" d={line.join(' ')} />
            {!compact ? <text className="diagram-stack-member-label" x={midpoint.x} y={midpoint.y - 6} textAnchor="middle">{member.id}</text> : null}
            {readingPoints.map((point, index) => {
              const reading = position(point.x, point.value);
              const side = Math.sign(point.value) || (index % 2 ? -1 : 1);
              return <g key={`${point.kind}:${point.x}:${point.value}`} className="diagram-stack-reading" data-stack-reading={`${member.id}:${cell.quantity}:${point.kind}`}>
                <circle cx={reading.x} cy={reading.y} r={compact ? 1.6 : 2.3} />
                <text x={reading.x + normal.x * side * (compact ? 6 : 8)} y={reading.y + normal.y * side * (compact ? 6 : 8) - 2} textAnchor="middle">{formatValue(point.value)}</text>
              </g>;
            })}
            <title>{`${member.id} · ${STACK_SYMBOLS[cell.quantity]}`}</title>
          </g>;
        })}
      </g>;
    })}
  </g>;
});
