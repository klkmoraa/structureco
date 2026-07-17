export interface SnapTarget {
  x: number;
  y: number;
}

export type SnapKind = 'node' | 'midpoint' | 'intersection' | 'perpendicular' | 'target' | 'grid';

export interface SnapCandidate extends SnapTarget {
  kind: Exclude<SnapKind, 'grid'>;
  /** Stable source identifiers are useful for drawing a snap glyph and tooltip. */
  sourceIds?: string[];
}

export interface SnapSegment {
  id: string;
  start: SnapTarget;
  end: SnapTarget;
}

export type SnapModeToggles = Partial<Record<SnapKind, boolean>>;

export interface SnapOptions {
  enabled: boolean;
  gridSize: number;
  pixelsPerUnit: number;
  /** Legacy untyped targets. Prefer candidates for new call sites. */
  targets?: SnapTarget[];
  candidates?: SnapCandidate[];
  modes?: SnapModeToggles;
  pixelTolerance?: number;
  priority?: SnapKind[];
}

export interface SnapResult {
  point: SnapTarget;
  kind: SnapKind | 'none';
  distancePixels: number;
  candidate?: SnapCandidate;
}

export interface IntersectionCandidateOptions {
  epsilon?: number;
  /** End intersections normally duplicate node snaps, so they are excluded by default. */
  includeEndpoints?: boolean;
}

export interface PerpendicularCandidateOptions {
  epsilon?: number;
  /** Includes a projection on the segment extension rather than only on the finite member. */
  includeExtensions?: boolean;
}

export const DEFAULT_SNAP_PRIORITY: SnapKind[] = [
  'node',
  'intersection',
  'midpoint',
  'perpendicular',
  'target',
  'grid',
];

const squaredDistance = (a: SnapTarget, b: SnapTarget): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};

const cross = (ax: number, ay: number, bx: number, by: number): number => ax * by - ay * bx;

const isModeEnabled = (kind: SnapKind, modes?: SnapModeToggles): boolean => modes?.[kind] !== false;

const normalizedPriority = (priority?: SnapKind[]): Map<SnapKind, number> => {
  const ordered = priority?.length ? priority : DEFAULT_SNAP_PRIORITY;
  const ranks = new Map<SnapKind, number>();
  for (const kind of ordered) if (!ranks.has(kind)) ranks.set(kind, ranks.size);
  for (const kind of DEFAULT_SNAP_PRIORITY) if (!ranks.has(kind)) ranks.set(kind, ranks.size);
  return ranks;
};

/**
 * Computes strict segment intersections once per geometry revision. Collinear
 * overlaps are intentionally ignored because they do not define a unique snap.
 */
export const buildIntersectionSnapCandidates = (
  segments: SnapSegment[],
  options: IntersectionCandidateOptions = {},
): SnapCandidate[] => {
  const epsilon = Math.max(options.epsilon ?? 1e-9, Number.EPSILON);
  const candidates: SnapCandidate[] = [];

  for (let firstIndex = 0; firstIndex < segments.length; firstIndex += 1) {
    const first = segments[firstIndex];
    const rx = first.end.x - first.start.x;
    const ry = first.end.y - first.start.y;
    if (rx * rx + ry * ry <= epsilon * epsilon) continue;

    for (let secondIndex = firstIndex + 1; secondIndex < segments.length; secondIndex += 1) {
      const second = segments[secondIndex];
      const sx = second.end.x - second.start.x;
      const sy = second.end.y - second.start.y;
      if (sx * sx + sy * sy <= epsilon * epsilon) continue;

      const denominator = cross(rx, ry, sx, sy);
      const scale = Math.max(Math.hypot(rx, ry) * Math.hypot(sx, sy), 1);
      if (Math.abs(denominator) <= epsilon * scale) continue;

      const qpx = second.start.x - first.start.x;
      const qpy = second.start.y - first.start.y;
      const t = cross(qpx, qpy, sx, sy) / denominator;
      const u = cross(qpx, qpy, rx, ry) / denominator;
      const onSegments = t >= -epsilon && t <= 1 + epsilon && u >= -epsilon && u <= 1 + epsilon;
      if (!onSegments) continue;
      if (!options.includeEndpoints && (t <= epsilon || t >= 1 - epsilon || u <= epsilon || u >= 1 - epsilon)) continue;

      const point = { x: first.start.x + t * rx, y: first.start.y + t * ry };
      const duplicate = candidates.find((candidate) => squaredDistance(candidate, point) <= epsilon * epsilon);
      if (duplicate) {
        duplicate.sourceIds = [...new Set([...(duplicate.sourceIds ?? []), first.id, second.id])];
      } else {
        candidates.push({ ...point, kind: 'intersection', sourceIds: [first.id, second.id] });
      }
    }
  }

  return candidates;
};

/** Builds perpendicular feet from a drawing origin to finite model members. */
export const buildPerpendicularSnapCandidates = (
  origin: SnapTarget,
  segments: SnapSegment[],
  options: PerpendicularCandidateOptions = {},
): SnapCandidate[] => {
  const epsilon = Math.max(options.epsilon ?? 1e-9, Number.EPSILON);
  const candidates: SnapCandidate[] = [];

  for (const segment of segments) {
    const dx = segment.end.x - segment.start.x;
    const dy = segment.end.y - segment.start.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared <= epsilon * epsilon) continue;
    const ratio = ((origin.x - segment.start.x) * dx + (origin.y - segment.start.y) * dy) / lengthSquared;
    if (!options.includeExtensions && (ratio < -epsilon || ratio > 1 + epsilon)) continue;
    const point = { x: segment.start.x + ratio * dx, y: segment.start.y + ratio * dy };
    if (squaredDistance(point, origin) <= epsilon * epsilon) continue;
    const duplicate = candidates.find((candidate) => squaredDistance(candidate, point) <= epsilon * epsilon);
    if (duplicate) duplicate.sourceIds = [...new Set([...(duplicate.sourceIds ?? []), segment.id])];
    else candidates.push({ ...point, kind: 'perpendicular', sourceIds: [segment.id] });
  }

  return candidates;
};

/** Resolves typed geometric snaps in screen-space tolerance, then optionally uses the grid. */
export const resolveSnap = (point: SnapTarget, options: SnapOptions): SnapResult => {
  if (!options.enabled) return { point: { ...point }, kind: 'none', distancePixels: 0 };

  const pixelsPerUnit = Math.max(Math.abs(options.pixelsPerUnit), 1e-12);
  const tolerancePixels = Math.max(options.pixelTolerance ?? 12, 0);
  const toleranceModelSquared = (tolerancePixels / pixelsPerUnit) ** 2;
  const ranks = normalizedPriority(options.priority);
  const legacy: SnapCandidate[] = (options.targets ?? []).map((target) => ({ ...target, kind: 'target' }));
  const eligible = [...(options.candidates ?? []), ...legacy]
    .filter((candidate) => isModeEnabled(candidate.kind, options.modes))
    .map((candidate, index) => ({
      candidate,
      index,
      distanceSquared: squaredDistance(point, candidate),
      rank: ranks.get(candidate.kind) ?? Number.MAX_SAFE_INTEGER,
    }))
    .filter((item) => item.distanceSquared <= toleranceModelSquared)
    .sort((a, b) => a.rank - b.rank || a.distanceSquared - b.distanceSquared || a.index - b.index);

  const nearest = eligible[0];
  if (nearest) {
    return {
      point: { x: nearest.candidate.x, y: nearest.candidate.y },
      kind: nearest.candidate.kind,
      distancePixels: Math.sqrt(nearest.distanceSquared) * pixelsPerUnit,
      candidate: nearest.candidate,
    };
  }

  if (!isModeEnabled('grid', options.modes)) {
    return { point: { ...point }, kind: 'none', distancePixels: 0 };
  }
  const grid = Number.isFinite(options.gridSize) && options.gridSize > 0 ? options.gridSize : 1;
  const gridPoint = { x: Math.round(point.x / grid) * grid, y: Math.round(point.y / grid) * grid };
  return {
    point: gridPoint,
    kind: 'grid',
    distancePixels: Math.sqrt(squaredDistance(point, gridPoint)) * pixelsPerUnit,
  };
};

/** Backwards-compatible point-only API used by the current canvas. */
export const snapModelPoint = (point: SnapTarget, options: SnapOptions): SnapTarget =>
  resolveSnap(point, options).point;
