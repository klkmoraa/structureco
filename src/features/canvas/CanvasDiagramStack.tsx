import { memo, useMemo } from 'react';
import type { AnalysisResult, NodeModel, ProjectModel } from '../../types';
import type { TranslationKey } from '../../i18n/catalogs';
import { segmentBezierControls } from '../../engine/diagram';
import { memberAxis } from '../../graphics/structureGeometry';
import { STACK_QUANTITIES, STACK_SYMBOLS, type StackQuantity } from './diagramStack';

type MemberResult = AnalysisResult['memberResults'][number];
type Translate = (key: TranslationKey, variables?: Record<string, string | number>) => string;
type DiagramSize = { width: number; height: number };
type Bounds = { minX: number; maxX: number; minY: number; maxY: number };
type ExternalCell = { quantity: StackQuantity; x: number; y: number; width: number; height: number };

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

const externalCells = (bounds: Bounds, size: DiagramSize, quantities: readonly StackQuantity[]): { cells: ExternalCell[]; bottomReserve: number } => {
  const compact = size.height < 560 || size.width < 700;
  const outerX = compact ? 14 : 30;
  const outerRight = compact ? 14 : 178;
  // The compact canvas keeps its zoom controls at the lower-right corner.
  // Reserve that shelf so the final M replica stays fully readable.
  const bottom = compact ? 96 : 30;
  const gap = compact ? 10 : 18;
  const aspect = (bounds.maxX - bounds.minX) / Math.max(1e-9, bounds.maxY - bounds.minY);
  const sideBySide = aspect < 2;
  if (sideBySide) {
    const height = Math.max(compact ? 96 : 132, Math.min(compact ? 142 : 206, size.height * .31));
    const width = Math.max(1, (size.width - outerX - outerRight - gap * (quantities.length - 1)) / quantities.length);
    const y = size.height - bottom - height;
    return {
    cells: quantities.map((quantity, index) => ({ quantity, x: outerX + index * (width + gap), y, width, height })),
      bottomReserve: height + bottom + (compact ? 30 : 44),
    };
  }
  const height = Math.max(compact ? 56 : 74, Math.min(compact ? 76 : 112, (size.height * .48 - gap * (quantities.length - 1)) / quantities.length));
  const total = quantities.length * height + Math.max(0, quantities.length - 1) * gap;
  const y = size.height - bottom - total;
  return {
    cells: quantities.map((quantity, index) => ({ quantity, x: outerX, y: y + index * (height + gap), width: size.width - outerX - outerRight, height })),
    bottomReserve: total + bottom + (compact ? 30 : 44),
  };
};

/** Reserve enough exterior space to keep ACM separate from the original model. */
export const externalStackBottomReserve = (project: ProjectModel, size: DiagramSize, quantityCount: number): number =>
  externalCells(boundsOf(project), size, STACK_QUANTITIES.slice(0, Math.max(1, quantityCount))).bottomReserve;

/**
 * ACM is a complete structural reading outside the model. Wide structures use
 * vertical bands; pórticos use one miniature structural replica per response
 * beside the others. No analytical trace is painted over the editable model.
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
  const compact = size.height < 560 || size.width < 700;
  const resultMap = useMemo(() => new Map(results.map((result) => [result.memberId, result])), [results]);
  const visibleQuantities = useMemo(() => STACK_QUANTITIES.filter((quantity) => quantities.includes(quantity)), [quantities]);
  const bounds = useMemo(() => boundsOf(project), [project]);
  const cells = useMemo(() => externalCells(bounds, size, visibleQuantities).cells, [bounds, size, visibleQuantities]);
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
  return <g className="diagram-stack-layer diagram-stack-layer--external" data-canvas-layer="diagram-stack" aria-label={t('canvas.evidenceStackStructure')}>
    <title>{t('canvas.evidenceStackStructureDetail')}</title>
    {cells.map((cell) => {
      const spanX = Math.max(1e-9, bounds.maxX - bounds.minX);
      const spanY = Math.max(1e-9, bounds.maxY - bounds.minY);
      const topInset = 30;
      const padding = 14;
      const scale = Math.min((cell.width - padding * 2) / spanX, Math.max(1, cell.height - topInset - padding) / spanY);
      const contentWidth = spanX * scale;
      const contentHeight = spanY * scale;
      const originX = cell.x + (cell.width - contentWidth) / 2 - bounds.minX * scale;
      const originY = cell.y + topInset + (cell.height - topInset - contentHeight) / 2 + bounds.maxY * scale;
      const screenPoint = (node: NodeModel) => ({ x: originX + node.x * scale, y: originY - node.y * scale });
      const amplitude = Math.max(11, Math.min(24, cell.height * .22));
      return <g key={cell.quantity} className={`diagram-stack-panel ${cell.quantity}`} data-stack-panel={cell.quantity}>
        <rect className="diagram-stack-panel-frame" x={cell.x} y={cell.y} width={cell.width} height={cell.height} rx="10" />
        <text className="diagram-stack-panel-title" x={cell.x + 12} y={cell.y + 19}>{compact ? STACK_SYMBOLS[cell.quantity] : `${STACK_SYMBOLS[cell.quantity]} · ${t('canvas.evidenceStackStructure')}`}</text>
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
            line.push(curve); fill.push(curve);
            const next = result.diagramSegments[index + 1];
            if (!next) return;
            const nextControl = segmentBezierControls(next, cell.quantity);
            if (Math.abs(nextControl.y0 - control.y1) > 1e-10) {
              const jump = position(nextControl.x0, nextControl.y0);
              line.push(`L ${jump.x} ${jump.y}`); fill.push(`L ${jump.x} ${jump.y}`);
            }
          });
          const baselineEnd = position(result.length);
          fill.push(`L ${baselineEnd.x} ${baselineEnd.y}`, 'Z');
          const midpoint = { x: (memberStart.x + memberEnd.x) / 2, y: (memberStart.y + memberEnd.y) / 2 };
          return <g key={`${member.id}:${cell.quantity}`} className={`diagram-stack-member-lane ${cell.quantity}`} data-stack-member={member.id} data-stack-lane={cell.quantity}>
            <line className="diagram-stack-replica-member" x1={memberStart.x} y1={memberStart.y} x2={memberEnd.x} y2={memberEnd.y} />
            <path className="diagram-stack-member-baseline" d={`M ${baselineStart.x} ${baselineStart.y} L ${baselineEnd.x} ${baselineEnd.y}`} />
            <path className="diagram-stack-member-fill" d={fill.join(' ')} />
            <path className="diagram-stack-member-line" d={line.join(' ')} />
            <text className="diagram-stack-member-label" x={midpoint.x} y={midpoint.y - 6} textAnchor="middle">{member.id}</text>
            <title>{`${member.id} · ${STACK_SYMBOLS[cell.quantity]}`}</title>
          </g>;
        })}
      </g>;
    })}
  </g>;
});
