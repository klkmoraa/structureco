import { describe, expect, it } from 'vitest';
import { ANGLE_CONSTRAINT_STEP_DEG, constrainToAngleStep, normalizeAngleDeg } from './angleConstraint';

const origin = { x: 0, y: 0 };

describe('angle constraint while drawing', () => {
  it('snaps a nearly vertical drag to an exactly vertical member', () => {
    const constrained = constrainToAngleStep(origin, { x: 0.04, y: 4 });
    expect(constrained.angleDeg).toBe(90);
    expect(constrained.x).toBeCloseTo(0, 12);
    expect(constrained.y).toBeCloseTo(4.0002, 3);
  });

  it('keeps the pointer distance when the grid step is off', () => {
    const constrained = constrainToAngleStep(origin, { x: 3.13, y: 0.02 });
    expect(constrained.angleDeg).toBe(0);
    expect(constrained.length).toBeCloseTo(Math.hypot(3.13, 0.02), 12);
  });

  it('rounds the distance onto the grid while the angle still governs', () => {
    const constrained = constrainToAngleStep(origin, { x: 2.7, y: 2.6 }, { radiusStep: 1 });
    expect(constrained.angleDeg).toBe(45);
    expect(constrained.length).toBe(4);
    expect(constrained.x).toBeCloseTo(4 * Math.SQRT1_2, 12);
  });

  it('never collapses a moved pointer onto the origin', () => {
    expect(constrainToAngleStep(origin, { x: 0.1, y: 0 }, { radiusStep: 1 }).length).toBe(1);
  });

  it('reports no direction until the pointer actually leaves the origin', () => {
    expect(constrainToAngleStep(origin, { x: 0, y: 0 })).toEqual({ x: 0, y: 0, angleDeg: 0, length: 0 });
  });

  it('serves every multiple of the step and normalises the reported angle', () => {
    expect(ANGLE_CONSTRAINT_STEP_DEG).toBe(15);
    expect(constrainToAngleStep(origin, { x: -1, y: -0.02 }).angleDeg).toBe(180);
    expect(constrainToAngleStep(origin, { x: -1, y: -1 }).angleDeg).toBe(-135);
    expect(normalizeAngleDeg(360)).toBe(0);
    expect(normalizeAngleDeg(-370)).toBe(-10);
  });

  it('stays finite when the caller hands it a broken point', () => {
    expect(constrainToAngleStep(origin, { x: Number.NaN, y: 2 })).toEqual({ x: 0, y: 0, angleDeg: 0, length: 0 });
  });
});
