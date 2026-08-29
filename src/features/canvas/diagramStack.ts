import { evaluateDiagramAt, segmentBezierControls } from '../../engine/diagram';
import type { DiagramCriticalPoint, MemberResult, ProjectModel, Selection } from '../../types';

/** Axial, shear and moment are read at one shared station on the canvas. */
export type StackQuantity = 'axial' | 'shear' | 'moment';
export const STACK_QUANTITIES: readonly StackQuantity[] = ['axial', 'shear', 'moment'];
export const STACK_SYMBOLS: Readonly<Record<StackQuantity, string>> = { axial: 'N', shear: 'V', moment: 'M' };

export const DIAGRAM_STACK_STORAGE_KEY = 'structureco:diagram-stack:v1';

/** Keep the stack useful and ordered even if an old preference is malformed. */
export const parseStackQuantities = (raw: string | null): StackQuantity[] => {
  if (!raw) return [...STACK_QUANTITIES];
  try {
    const parsed: unknown = JSON.parse(raw);
    const chosen = Array.isArray(parsed) ? STACK_QUANTITIES.filter((item) => parsed.includes(item)) : [];
    return chosen.length ? chosen : [...STACK_QUANTITIES];
  } catch { return [...STACK_QUANTITIES]; }
};

export const readStoredStackQuantities = (): StackQuantity[] => {
  if (typeof window === 'undefined') return [...STACK_QUANTITIES];
  try { return parseStackQuantities(window.localStorage.getItem(DIAGRAM_STACK_STORAGE_KEY)); } catch { return [...STACK_QUANTITIES]; }
};

export const persistStackQuantities = (quantities: readonly StackQuantity[]): void => {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(DIAGRAM_STACK_STORAGE_KEY, JSON.stringify(quantities)); } catch { /* Optional view preference. */ }
};

/** The last visible lane cannot be removed: an active empty ACM would be misleading. */
export const toggleStackQuantity = (current: readonly StackQuantity[], quantity: StackQuantity): StackQuantity[] => {
  if (current.includes(quantity) && current.length === 1) return [...current];
  const next = current.includes(quantity) ? current.filter((item) => item !== quantity) : [...current, quantity];
  return STACK_QUANTITIES.filter((item) => next.includes(item));
};

export const resolveStackMemberId = (
  project: ProjectModel,
  selection: Selection,
  resultMap: ReadonlyMap<string, MemberResult>,
): string | null => {
  const usable = (id: string | undefined): id is string => Boolean(id && (resultMap.get(id)?.diagramSegments.length ?? 0) > 0);
  if (selection?.kind === 'member' && usable(selection.id)) return selection.id;
  if (selection?.kind === 'multi') {
    const selected = selection.memberIds.find(usable);
    if (selected) return selected;
  }
  return project.members
    .filter((member) => usable(member.id))
    .sort((left, right) => (resultMap.get(right.id)?.length ?? 0) - (resultMap.get(left.id)?.length ?? 0))[0]?.id ?? null;
};

export const stackMetricsFor = (viewportHeight: number, laneCount: number): { offset: number; laneGap: number; laneHeight: number; total: number } => {
  const lanes = Math.max(1, laneCount);
  const laneGap = 8;
  const offset = viewportHeight < 640 ? 88 : 104;
  const laneHeight = Math.min(88, Math.max(46, (Math.max(150, viewportHeight * 0.56) - offset - laneGap * (lanes - 1)) / lanes));
  return { offset, laneGap, laneHeight, total: offset + laneHeight * lanes + laneGap * (lanes - 1) };
};

export interface DiagramStackLane {
  quantity: StackQuantity;
  symbol: string;
  top: number;
  height: number;
  baselineY: number;
  left: number;
  right: number;
  linePath: string;
  fillPath: string;
  pixelsPerLength: number;
  pixelsPerValue: number;
  maxAbs: number;
  amplitude: number;
  extremes: Array<{ kind: 'max' | 'min'; x: number; value: number; screen: { x: number; y: number } }>;
}

const extremesOf = (points: readonly DiagramCriticalPoint[], quantity: StackQuantity): Array<{ kind: 'max' | 'min'; x: number; value: number }> => {
  const candidates = points.filter((point) => point.quantity === quantity);
  if (!candidates.length) return [];
  const highest = candidates.reduce((best, point) => point.value > best.value ? point : best);
  const lowest = candidates.reduce((best, point) => point.value < best.value ? point : best);
  return Math.abs(highest.value - lowest.value) <= 1e-9
    ? [{ kind: 'max', x: highest.x, value: highest.value }]
    : [{ kind: 'max', x: highest.x, value: highest.value }, { kind: 'min', x: lowest.x, value: lowest.value }];
};

const maxAbsOf = (result: MemberResult, quantity: StackQuantity): number => {
  const min = quantity === 'axial' ? result.minAxial : quantity === 'shear' ? result.minShear : result.minMoment;
  const max = quantity === 'axial' ? result.maxAxial : quantity === 'shear' ? result.maxShear : result.maxMoment;
  return Math.max(Math.abs(min), Math.abs(max), 1e-9);
};

export const buildDiagramStack = (
  result: MemberResult,
  quantities: readonly StackQuantity[],
  rect: { x: number; y: number; width: number; laneHeight: number; laneGap: number },
): DiagramStackLane[] => {
  if (!result.diagramSegments.length || result.length <= 0 || rect.width <= 0) return [];
  return STACK_QUANTITIES.filter((quantity) => quantities.includes(quantity)).map((quantity, index) => {
    const top = rect.y + index * (rect.laneHeight + rect.laneGap);
    const baselineY = top + rect.laneHeight / 2;
    const amplitude = Math.max(6, rect.laneHeight / 2 - 14);
    const maxAbs = maxAbsOf(result, quantity);
    const sx = (x: number) => rect.x + (x / result.length) * rect.width;
    const sy = (value: number) => baselineY - (value / maxAbs) * amplitude;
    const first = segmentBezierControls(result.diagramSegments[0], quantity);
    const line = [`M ${sx(first.x0)} ${sy(first.y0)}`];
    const fill = [`M ${sx(0)} ${baselineY}`, `L ${sx(first.x0)} ${sy(first.y0)}`];
    result.diagramSegments.forEach((segment, position) => {
      const control = segmentBezierControls(segment, quantity);
      const curve = `C ${sx(control.c1x)} ${sy(control.c1y)} ${sx(control.c2x)} ${sy(control.c2y)} ${sx(control.x1)} ${sy(control.y1)}`;
      line.push(curve); fill.push(curve);
      const next = result.diagramSegments[position + 1];
      if (!next) return;
      const nextControl = segmentBezierControls(next, quantity);
      if (Math.abs(nextControl.y0 - control.y1) > 1e-10) {
        const jump = `L ${sx(nextControl.x0)} ${sy(nextControl.y0)}`;
        line.push(jump); fill.push(jump);
      }
    });
    fill.push(`L ${sx(result.length)} ${baselineY}`, 'Z');
    return {
      quantity, symbol: STACK_SYMBOLS[quantity], top, height: rect.laneHeight, baselineY, left: sx(0), right: sx(result.length), linePath: line.join(' '), fillPath: fill.join(' '), pixelsPerLength: rect.width / result.length, pixelsPerValue: amplitude / maxAbs, maxAbs, amplitude,
      extremes: extremesOf(result.criticalPoints, quantity).map((extreme) => ({ ...extreme, screen: { x: sx(extreme.x), y: sy(extreme.value) } })),
    };
  });
};

export const stationFromScreenX = (lane: Pick<DiagramStackLane, 'left' | 'pixelsPerLength'>, length: number, screenX: number): number =>
  lane.pixelsPerLength <= 0 ? 0 : Math.min(length, Math.max(0, (screenX - lane.left) / lane.pixelsPerLength));

export const laneScreenX = (lane: Pick<DiagramStackLane, 'left' | 'pixelsPerLength'>, x: number): number => lane.left + x * lane.pixelsPerLength;
export const laneScreenY = (lane: Pick<DiagramStackLane, 'baselineY' | 'pixelsPerValue'>, value: number): number => lane.baselineY - value * lane.pixelsPerValue;

export const notableStations = (result: MemberResult): number[] => Array.from(new Set([0, result.length, ...result.diagramSegments.flatMap((segment) => [segment.x0, segment.x1]), ...result.diagramJumps.map((jump) => jump.x), ...result.criticalPoints.map((point) => point.x)])).sort((a, b) => a - b);

export const snapStation = (result: MemberResult, x: number): number => {
  const stations = notableStations(result);
  const nearest = stations.reduce((best, station) => Math.abs(station - x) < Math.abs(best - x) ? station : best, stations[0] ?? x);
  return Math.abs(nearest - x) <= Math.max(result.length * 0.012, 1e-8) ? nearest : x;
};

export const stationReadings = (result: MemberResult, x: number): ReadonlyArray<{ quantity: StackQuantity; value: number; jump: { left: number; right: number } | null }> => {
  const left = evaluateDiagramAt(result.diagramSegments, result.diagramJumps, x, 'left');
  const right = evaluateDiagramAt(result.diagramSegments, result.diagramJumps, x, 'right');
  if (!left && !right) return [];
  return STACK_QUANTITIES.map((quantity) => {
    const leftValue = left?.[quantity] ?? right?.[quantity] ?? 0;
    const rightValue = right?.[quantity] ?? leftValue;
    const scale = Math.max(Math.abs(leftValue), Math.abs(rightValue), 1e-12);
    return { quantity, value: rightValue, jump: Math.abs(rightValue - leftValue) > scale * 1e-9 ? { left: leftValue, right: rightValue } : null };
  });
};
