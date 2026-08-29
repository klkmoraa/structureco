import { describe, expect, it } from 'vitest';
import { modeShapePoints, modeShapeScaleFor } from './modeShapePath';

describe('mode shape path', () => {
  it('uses beam rotations to curve a frame mode between its nodal translations', () => {
    const points = modeShapePoints({ x: 0, y: 0 }, { x: 6, y: 0 }, { ux: 0, uy: 0, rz: 1 }, { ux: 0, uy: 0, rz: 0 }, { samples: 5, scale: 1 });
    expect(points).toHaveLength(5);
    expect(points[0]).toEqual({ x: 0, y: 0 });
    expect(points[4]).toEqual({ x: 6, y: 0 });
    expect(points[2].y).not.toBe(0);
  });

  it('scales normalized modes from the model extent rather than physical displacement units', () => {
    expect(modeShapeScaleFor([{ x: 0, y: 0 }, { x: 6, y: 8 }])).toBeCloseTo(0.8, 12);
  });
});
