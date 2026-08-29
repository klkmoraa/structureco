import { describe, expect, it } from 'vitest';
import type { MemberModel } from '../types';
import { frameConsistentMass, linearMass, lumpedMass, trussConsistentMass } from './mass';

const member = (overrides: Partial<MemberModel> = {}): MemberModel => ({
  id: 'M1', i: 'A', j: 'B', type: 'frame', E: 200e6, A: 0.01, I: 8e-5, density: 7850,
  ...overrides,
});

const total = (matrix: readonly (readonly number[])[]) => matrix.flat().reduce((sum, value) => sum + value, 0);

describe('dynamic mass primitives', () => {
  it('uses Mg consistently with the kN-m solver base units', () => {
    expect(linearMass(member())).toBeCloseTo(0.0785, 12);
    expect(linearMass(member({ density: undefined }))).toBe(0);
    expect(linearMass(member({ A: 0 }))).toBe(0);
  });

  it('conserves translational mass in lumped and consistent formulations', () => {
    const massPerLength = 0.0785;
    const length = 3;
    const expected = massPerLength * length;

    expect(total(lumpedMass(massPerLength, length))).toBeCloseTo(expected * 2, 12);
    expect(frameConsistentMass(massPerLength, length)[0][0] + frameConsistentMass(massPerLength, length)[0][3]).toBeCloseTo(expected / 2, 12);
    expect(trussConsistentMass(massPerLength, length)[1][1] + trussConsistentMass(massPerLength, length)[1][4]).toBeCloseTo(expected / 2, 12);
  });

  it('keeps truss rotations massless', () => {
    const matrix = trussConsistentMass(0.1, 2);
    expect(matrix[2].every((value) => value === 0)).toBe(true);
    expect(matrix[5].every((value) => value === 0)).toBe(true);
  });
});
