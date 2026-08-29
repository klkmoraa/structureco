import { describe, expect, it } from 'vitest';
import {
  backSubstitute, choleskyFactor, constraintNullSpaceBasis, expandFromBasis, forwardSubstitute, projectOntoBasis, symmetricEigenJacobi,
  generalizedSmallestEigenpairs,
} from './eigen';
import { multiplyMatrixVector, zeros, type Matrix } from './math';

const tridiagonal = (size: number): Matrix => {
  const matrix = zeros(size, size);
  for (let index = 0; index < size; index += 1) {
    matrix[index][index] = 2;
    if (index) matrix[index][index - 1] = -1;
    if (index + 1 < size) matrix[index][index + 1] = -1;
  }
  return matrix;
};

const identity = (size: number): Matrix => {
  const matrix = zeros(size, size);
  for (let index = 0; index < size; index += 1) matrix[index][index] = 1;
  return matrix;
};

describe('base de autovalores', () => {
  it('factoriza y resuelve una matriz definida positiva sin inventar mecanismos', () => {
    const matrix: Matrix = [[4, 2, 1], [2, 5, 3], [1, 3, 6]];
    const factor = choleskyFactor(matrix)!;
    const solution = backSubstitute(factor.L, forwardSubstitute(factor.L, [1, -2, 3]));
    multiplyMatrixVector(matrix, solution).forEach((value, index) => expect(value).toBeCloseTo([1, -2, 3][index], 10));
    expect(choleskyFactor([[1, 2], [2, 1]])).toBeNull();
  });

  it('recupera pares propios de una tridiagonal con forma cerrada', () => {
    const size = 6;
    const result = symmetricEigenJacobi(tridiagonal(size));
    const expected = Array.from({ length: size }, (_, index) => 4 * Math.sin(((index + 1) * Math.PI) / (2 * (size + 1))) ** 2).sort((a, b) => b - a);
    result.values.forEach((value, index) => expect(value).toBeCloseTo(expected[index], 10));
    result.vectors.forEach((vector, index) => multiplyMatrixVector(tridiagonal(size), vector)
      .forEach((value, row) => expect(value).toBeCloseTo(result.values[index] * vector[row], 9)));
  });

  it('proyecta restricciones exactas sin penalizaciones', () => {
    const basis = constraintNullSpaceBasis([[1, -1, 0], [2, -2, 0]], 3);
    expect(basis.rank).toBe(1);
    expect(basis.nullity).toBe(2);
    basis.vectors.forEach((vector) => expect(vector[0]).toBeCloseTo(vector[1], 12));
    const projected = projectOntoBasis(tridiagonal(3), basis.vectors);
    expect(projected).toHaveLength(2);
    expect(expandFromBasis([2, -5], basis.vectors)[0]).toBeCloseTo(expandFromBasis([2, -5], basis.vectors)[1], 12);
  });

  it('recupera los modos bajos del problema generalizado y admite B indefinida', () => {
    const result = generalizedSmallestEigenpairs(tridiagonal(12), identity(12), 3);
    const expected = [1, 2, 3].map((index) => 4 * Math.sin((index * Math.PI) / 26) ** 2);
    expect(result.converged).toBe(true);
    result.values.forEach((value, index) => expect(value).toBeCloseTo(expected[index], 8));
    expect(result.residual).toBeLessThan(1e-8);

    const mixed = generalizedSmallestEigenpairs(identity(2), [[1, 0], [0, -1]], 2, { positiveOnly: true });
    expect(mixed.values).toHaveLength(1);
    expect(mixed.values[0]).toBeCloseTo(1, 12);
  });
});
