import { memo, useMemo } from 'react';
import type { AnalysisResult, MemberModel, NodeModel, ProjectModel } from '../../types';
import type { CanvasCamera } from './canvasInteraction';
import type { TranslationKey } from '../../i18n/catalogs';
import { segmentBezierControls } from '../../engine/diagram';
import { memberAxis } from '../../graphics/structureGeometry';
import { STACK_QUANTITIES, STACK_SYMBOLS, type StackQuantity } from './diagramStack';

type MemberResult = AnalysisResult['memberResults'][number];
type Translate = (key: TranslationKey, variables?: Record<string, string | number>) => string;

const laneOffset: Readonly<Record<StackQuantity, number>> = { axial: -18, shear: 0, moment: 18 };

const maximumFor = (results: readonly MemberResult[], quantity: StackQuantity): number => Math.max(
  1e-9,
  ...results.map((result) => quantity === 'axial'
    ? Math.max(Math.abs(result.minAxial), Math.abs(result.maxAxial))
    : quantity === 'shear'
      ? Math.max(Math.abs(result.minShear), Math.abs(result.maxShear))
      : Math.max(Math.abs(result.minMoment), Math.abs(result.maxMoment))),
);

/**
 * ACM is a complete structural reading: each solved member keeps its own N, V
 * and M traces attached to the actual member geometry. It deliberately does
 * not reuse the former bottom-card chart, which only described one member and
 * hid the relationship between bays, columns and joints.
 */
export const CanvasDiagramStack = memo(({
  project, results, quantities, nodeMap, camera, toScreen, t,
}: {
  project: ProjectModel;
  results: readonly MemberResult[];
  quantities: readonly StackQuantity[];
  nodeMap: ReadonlyMap<string, NodeModel>;
  camera: CanvasCamera;
  toScreen: (x: number, y: number) => { x: number; y: number };
  t: Translate;
}) => {
  const resultMap = useMemo(() => new Map(results.map((result) => [result.memberId, result])), [results]);
  const maxima = useMemo(() => Object.fromEntries(STACK_QUANTITIES.map((quantity) => [quantity, maximumFor(results, quantity)])) as Record<StackQuantity, number>, [results]);
  const members = useMemo(() => project.members.flatMap((member) => {
    const result = resultMap.get(member.id);
    const start = nodeMap.get(member.i);
    const end = nodeMap.get(member.j);
    if (!result?.diagramSegments.length || !start || !end) return [];
    const axis = memberAxis(member, start, end);
    if (axis.length <= 1e-12) return [];
    return STACK_QUANTITIES.filter((quantity) => quantities.includes(quantity)).map((quantity) => ({ member, result, axis, quantity }));
  }), [nodeMap, project.members, quantities, resultMap]);

  if (!members.length) return null;
  const position = (member: MemberModel, result: MemberResult, axis: ReturnType<typeof memberAxis>, quantity: StackQuantity, x: number, value = 0) => {
    const start = nodeMap.get(member.i)!;
    const grossX = (result.startOffset ?? 0) + x;
    const pixels = laneOffset[quantity] + value * 15 / maxima[quantity];
    return toScreen(
      start.x + axis.c * grossX + axis.normal.x * pixels / camera.scale,
      start.y + axis.s * grossX + axis.normal.y * pixels / camera.scale,
    );
  };

  return <g className="diagram-stack-layer diagram-stack-layer--structure" data-canvas-layer="diagram-stack" aria-label={t('canvas.evidenceStackStructure')}>
    <title>{t('canvas.evidenceStackStructureDetail')}</title>
    <g className="diagram-stack-legend" transform="translate(16 16)" aria-hidden="true">
      <rect width="184" height="26" rx="8" />
      <text x="10" y="17">ACM · {t('canvas.evidenceStackStructure')}</text>
      {STACK_QUANTITIES.filter((quantity) => quantities.includes(quantity)).map((quantity, index) => <g key={quantity} className={`diagram-stack-legend__item ${quantity}`} transform={`translate(${104 + index * 24} 0)`}>
        <circle cx="5" cy="13" r="3" /><text x="10" y="17">{STACK_SYMBOLS[quantity]}</text>
      </g>)}
    </g>
    {members.map(({ member, result, axis, quantity }) => {
      const first = segmentBezierControls(result.diagramSegments[0], quantity);
      const baselineStart = position(member, result, axis, quantity, 0);
      const firstPoint = position(member, result, axis, quantity, first.x0, first.y0);
      const line = [`M ${firstPoint.x} ${firstPoint.y}`];
      const fill = [`M ${baselineStart.x} ${baselineStart.y}`, `L ${firstPoint.x} ${firstPoint.y}`];
      result.diagramSegments.forEach((segment, index) => {
        const control = segmentBezierControls(segment, quantity);
        const c1 = position(member, result, axis, quantity, control.c1x, control.c1y);
        const c2 = position(member, result, axis, quantity, control.c2x, control.c2y);
        const end = position(member, result, axis, quantity, control.x1, control.y1);
        line.push(`C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${end.x} ${end.y}`);
        fill.push(`C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${end.x} ${end.y}`);
        const next = result.diagramSegments[index + 1];
        if (!next) return;
        const nextControl = segmentBezierControls(next, quantity);
        if (Math.abs(nextControl.y0 - control.y1) > 1e-10) {
          const jump = position(member, result, axis, quantity, nextControl.x0, nextControl.y0);
          line.push(`L ${jump.x} ${jump.y}`);
          fill.push(`L ${jump.x} ${jump.y}`);
        }
      });
      const baselineEnd = position(member, result, axis, quantity, result.length);
      fill.push(`L ${baselineEnd.x} ${baselineEnd.y}`, 'Z');
      return <g key={`${member.id}:${quantity}`} className={`diagram-stack-member-lane ${quantity}`} data-stack-member={member.id} data-stack-lane={quantity}>
        <path className="diagram-stack-member-baseline" d={`M ${baselineStart.x} ${baselineStart.y} L ${baselineEnd.x} ${baselineEnd.y}`} />
        <path className="diagram-stack-member-fill" d={fill.join(' ')} />
        <path className="diagram-stack-member-line" d={line.join(' ')} />
        <title>{`${member.id} · ${STACK_SYMBOLS[quantity]}`}</title>
      </g>;
    })}
  </g>;
});
