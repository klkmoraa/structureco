import { describe, expect, it } from 'vitest';
import { computeCameraPlacement } from './cameraModel';

describe('computeCameraPlacement', () => {
  it('places front and isometric cameras around the exact model center', () => {
    const bounds = {
      min: [-2, 1, 0] as const,
      max: [6, 5, 0] as const,
      center: [2, 3, 0] as const,
      span: 8,
    };

    const front = computeCameraPlacement(bounds, 'front');
    const isometric = computeCameraPlacement(bounds, 'isometric');

    expect(front.target).toEqual([2, 3, 0]);
    expect(front.position[0]).toBe(2);
    expect(front.position[1]).toBe(3);
    expect(front.position[2]).toBeGreaterThan(8);
    expect(isometric.target).toEqual([2, 3, 0]);
    expect(isometric.position[0]).toBeGreaterThan(2);
    expect(isometric.position[1]).toBeGreaterThan(3);
    expect(isometric.position[2]).toBeGreaterThan(0);
  });

  it('always returns finite clipping planes for empty or degenerate bounds', () => {
    const placement = computeCameraPlacement({
      min: [0, 0, 0],
      max: [0, 0, 0],
      center: [0, 0, 0],
      span: 0,
    }, 'isometric');

    expect(placement.position.every(Number.isFinite)).toBe(true);
    expect(placement.near).toBeGreaterThan(0);
    expect(placement.far).toBeGreaterThan(placement.near);
  });
});
