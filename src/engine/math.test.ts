import { describe, expect, it } from 'vitest';
import { findNullSpaceVector, multiplyMatrixVector, solveLinearSystem, type Matrix } from './math';

const close = (actual: number, expected: number, tolerance = 1e-11) => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance * Math.max(1, Math.abs(expected)));
};

describe('solucionador lineal robusto', () => {
  it('resuelve un sistema con pivote inicial nulo mediante pivoteo', () => {
    const matrix: Matrix = [
      [0, 2, 1],
      [1, -2, -3],
      [2, 3, 1],
    ];
    const expected = [1.25, -0.5, 3];
    const result = solveLinearSystem(matrix, multiplyMatrixVector(matrix, expected));
    result.x.forEach((value, index) => close(value, expected[index]));
    expect(result.relativeResidual).toBeLessThan(1e-14);
    expect(result.conditionEstimate).toBeGreaterThanOrEqual(1);
  });

  it('estima como mal condicionado un sistema de Hilbert', () => {
    const size = 6;
    const matrix: Matrix = Array.from({ length: size }, (_, row) =>
      Array.from({ length: size }, (_, column) => 1 / (row + column + 1)),
    );
    const expected = Array(size).fill(1);
    const result = solveLinearSystem(matrix, multiplyMatrixVector(matrix, expected));
    result.x.forEach((value) => close(value, 1, 2e-8));
    expect(result.conditionEstimate).toBeGreaterThan(1e6);
    expect(result.relativeResidual).toBeLessThan(1e-13);
  });

  it('rechaza dependencias lineales exactas', () => {
    const matrix: Matrix = [
      [1, 2, 3],
      [2, 4, 6],
      [0, 1, 1],
    ];
    expect(() => solveLinearSystem(matrix, [1, 2, 0])).toThrow(/singular|mecanismo/i);
  });

  it('rechaza valores no finitos antes de factorizar', () => {
    expect(() => solveLinearSystem([[1, Number.NaN], [0, 1]], [1, 1])).toThrow(/no finitos/i);
  });

  it('recupera un vector del espacio nulo y su nulidad', () => {
    const matrix: Matrix = [
      [1, -1, 0],
      [-1, 2, -1],
      [0, -1, 1],
    ];
    const result = findNullSpaceVector(matrix);
    expect(result.rank).toBe(2);
    expect(result.nullity).toBe(1);
    expect(result.vector).not.toBeNull();
    expect(result.residual).toBeLessThan(1e-12);
    const vector = result.vector!;
    close(vector[0] / vector[1], 1);
    close(vector[2] / vector[1], 1);
  });
});
