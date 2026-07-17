import { describe, expect, it } from 'vitest';
import {
  buildIntersectionSnapCandidates,
  buildPerpendicularSnapCandidates,
  resolveSnap,
  snapModelPoint,
  type SnapSegment,
} from './snapping';

describe('snapModelPoint', () => {
  it('keeps the target tolerance constant in screen pixels across zoom levels', () => {
    const target = { x: 3, y: 2 };
    const zoomedOut = snapModelPoint({ x: 3.2, y: 2 }, { enabled: true, gridSize: 1, pixelsPerUnit: 50, targets: [target] });
    const zoomedIn = snapModelPoint({ x: 3.1, y: 2 }, { enabled: true, gridSize: 1, pixelsPerUnit: 100, targets: [target] });
    expect(zoomedOut).toEqual(target);
    expect(zoomedIn).toEqual(target);
  });

  it('chooses the closest node or midpoint candidate before the grid', () => {
    const result = snapModelPoint({ x: 2.08, y: 2.06 }, {
      enabled: true, gridSize: 1, pixelsPerUnit: 100,
      targets: [{ x: 2, y: 2 }, { x: 2.1, y: 2.05 }],
    });
    expect(result).toEqual({ x: 2.1, y: 2.05 });
  });

  it('falls back to grid snapping outside the screen-space tolerance', () => {
    const result = snapModelPoint({ x: 1.42, y: 2.61 }, { enabled: true, gridSize: 0.5, pixelsPerUnit: 100, targets: [{ x: 9, y: 9 }] });
    expect(result).toEqual({ x: 1.5, y: 2.5 });
  });

  it('preserves the unsnapped point when snapping or the grid mode is disabled', () => {
    const point = { x: 1.42, y: 2.61 };
    expect(resolveSnap(point, { enabled: false, gridSize: 1, pixelsPerUnit: 100 }).kind).toBe('none');
    expect(resolveSnap(point, {
      enabled: true, gridSize: 1, pixelsPerUnit: 100, modes: { grid: false },
    })).toMatchObject({ point, kind: 'none' });
  });

  it('uses semantic priority before distance and allows callers to override it', () => {
    const candidates = [
      { x: 0.02, y: 0, kind: 'midpoint' as const },
      { x: 0.08, y: 0, kind: 'node' as const },
    ];
    const preferredNode = resolveSnap({ x: 0, y: 0 }, {
      enabled: true, gridSize: 1, pixelsPerUnit: 100, candidates,
    });
    expect(preferredNode.kind).toBe('node');

    const preferredMidpoint = resolveSnap({ x: 0, y: 0 }, {
      enabled: true, gridSize: 1, pixelsPerUnit: 100, candidates,
      priority: ['midpoint', 'node', 'grid'],
    });
    expect(preferredMidpoint.kind).toBe('midpoint');
    expect(preferredMidpoint.distancePixels).toBeCloseTo(2);
  });

  it('respects individual mode toggles', () => {
    const result = resolveSnap({ x: 0, y: 0 }, {
      enabled: true,
      gridSize: 1,
      pixelsPerUnit: 100,
      candidates: [
        { x: 0.03, y: 0, kind: 'node' },
        { x: 0.05, y: 0, kind: 'midpoint' },
      ],
      modes: { node: false },
    });
    expect(result.kind).toBe('midpoint');
  });
});

describe('geometric snap candidates', () => {
  const segments: SnapSegment[] = [
    { id: 'M1', start: { x: 0, y: 0 }, end: { x: 4, y: 4 } },
    { id: 'M2', start: { x: 0, y: 4 }, end: { x: 4, y: 0 } },
  ];

  it('finds a unique interior intersection with its source members', () => {
    expect(buildIntersectionSnapCandidates(segments)).toEqual([
      { x: 2, y: 2, kind: 'intersection', sourceIds: ['M1', 'M2'] },
    ]);
  });

  it('ignores parallel, collinear and shared-end intersections by default', () => {
    const candidates = buildIntersectionSnapCandidates([
      { id: 'A', start: { x: 0, y: 0 }, end: { x: 2, y: 0 } },
      { id: 'B', start: { x: 0, y: 1 }, end: { x: 2, y: 1 } },
      { id: 'C', start: { x: 1, y: 0 }, end: { x: 3, y: 0 } },
      { id: 'D', start: { x: 2, y: 0 }, end: { x: 2, y: 2 } },
    ]);
    expect(candidates).toEqual([]);
  });

  it('deduplicates coincident intersections from several members', () => {
    const candidates = buildIntersectionSnapCandidates([
      ...segments,
      { id: 'M3', start: { x: 2, y: -1 }, end: { x: 2, y: 5 } },
    ]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ x: 2, y: 2, kind: 'intersection' });
    expect(candidates[0].sourceIds).toEqual(['M1', 'M2', 'M3']);
  });

  it('can include endpoint intersections explicitly without duplicating their coordinate', () => {
    const candidates = buildIntersectionSnapCandidates([
      { id: 'A', start: { x: 0, y: 0 }, end: { x: 2, y: 0 } },
      { id: 'B', start: { x: 2, y: 0 }, end: { x: 2, y: 2 } },
      { id: 'C', start: { x: 2, y: 0 }, end: { x: 3, y: -1 } },
    ], { includeEndpoints: true });
    expect(candidates).toHaveLength(1);
    expect(candidates[0].sourceIds).toEqual(['A', 'B', 'C']);
  });

  it('builds perpendicular feet only when they lie on finite members', () => {
    const finite = buildPerpendicularSnapCandidates({ x: 2, y: 3 }, [
      { id: 'beam', start: { x: 0, y: 0 }, end: { x: 5, y: 0 } },
    ]);
    expect(finite).toEqual([{ x: 2, y: 0, kind: 'perpendicular', sourceIds: ['beam'] }]);

    const outside = buildPerpendicularSnapCandidates({ x: 7, y: 3 }, [
      { id: 'beam', start: { x: 0, y: 0 }, end: { x: 5, y: 0 } },
    ]);
    expect(outside).toEqual([]);

    const extension = buildPerpendicularSnapCandidates({ x: 7, y: 3 }, [
      { id: 'beam', start: { x: 0, y: 0 }, end: { x: 5, y: 0 } },
    ], { includeExtensions: true });
    expect(extension[0]).toMatchObject({ x: 7, y: 0, kind: 'perpendicular' });
  });
});
