export type Matrix = number[][];

export const zeros = (rows: number, cols: number): Matrix =>
  Array.from({ length: rows }, () => Array(cols).fill(0));

export const transpose = (a: Matrix): Matrix => {
  if (a.length === 0) return [];
  return a[0].map((_, j) => a.map((row) => row[j]));
};

export const multiply = (a: Matrix, b: Matrix): Matrix => {
  if (!a.length || !b.length || a[0].length !== b.length) {
    throw new Error('Dimensiones incompatibles en multiplicación de matrices.');
  }
  const out = zeros(a.length, b[0].length);
  for (let i = 0; i < a.length; i += 1) {
    for (let k = 0; k < b.length; k += 1) {
      const aik = a[i][k];
      if (Math.abs(aik) < 1e-30) continue;
      for (let j = 0; j < b[0].length; j += 1) out[i][j] += aik * b[k][j];
    }
  }
  return out;
};

export const multiplyMatrixVector = (a: Matrix, x: number[]): number[] =>
  a.map((row) => row.reduce((sum, value, index) => sum + value * x[index], 0));

export const addToMatrix = (target: Matrix, source: Matrix, indices: number[]): void => {
  for (let i = 0; i < indices.length; i += 1) {
    for (let j = 0; j < indices.length; j += 1) {
      target[indices[i]][indices[j]] += source[i][j];
    }
  }
};

export const addToVector = (target: number[], source: number[], indices: number[]): void => {
  for (let i = 0; i < indices.length; i += 1) target[indices[i]] += source[i];
};

export const maxAbs = (values: number[]): number =>
  values.reduce((max, value) => Math.max(max, Math.abs(value)), 0);

export interface LinearSolveResult {
  x: number[];
  /** Estimate of kappa_1(A) = ||A||_1 ||A^-1||_1 using Hager iterations. */
  conditionEstimate: number;
  pivotRatio: number;
  relativeResidual: number;
  refinementIterations: number;
}

interface LUFactorization {
  lu: Matrix;
  permutation: number[];
  maxPivot: number;
  minPivot: number;
}

const matrixOneNorm = (matrix: Matrix): number => {
  if (!matrix.length) return 0;
  let norm = 0;
  for (let column = 0; column < matrix[0].length; column += 1) {
    let sum = 0;
    for (let row = 0; row < matrix.length; row += 1) sum += Math.abs(matrix[row][column]);
    norm = Math.max(norm, sum);
  }
  return norm;
};

const factorizeLU = (matrix: Matrix): LUFactorization => {
  const n = matrix.length;
  const lu = matrix.map((row) => [...row]);
  const permutation = Array.from({ length: n }, (_, index) => index);
  const rowScale = lu.map((row) => Math.max(...row.map(Math.abs), Number.MIN_VALUE));
  const norm = matrixOneNorm(matrix);
  const singularTolerance = Math.max(Number.EPSILON * n * norm, Number.MIN_VALUE);
  let maxPivot = 0;
  let minPivot = Number.POSITIVE_INFINITY;

  for (let k = 0; k < n; k += 1) {
    let pivotRow = k;
    let pivotScore = -1;
    for (let i = k; i < n; i += 1) {
      const score = Math.abs(lu[i][k]) / rowScale[i];
      if (score > pivotScore) {
        pivotScore = score;
        pivotRow = i;
      }
    }

    const pivotMagnitude = Math.abs(lu[pivotRow][k]);
    if (!Number.isFinite(pivotMagnitude) || pivotMagnitude <= singularTolerance) {
      throw new Error(`La matriz es singular o existe un mecanismo estructural cerca del grado de libertad ${k + 1}.`);
    }

    if (pivotRow !== k) {
      [lu[k], lu[pivotRow]] = [lu[pivotRow], lu[k]];
      [rowScale[k], rowScale[pivotRow]] = [rowScale[pivotRow], rowScale[k]];
      [permutation[k], permutation[pivotRow]] = [permutation[pivotRow], permutation[k]];
    }

    const pivot = lu[k][k];
    maxPivot = Math.max(maxPivot, Math.abs(pivot));
    minPivot = Math.min(minPivot, Math.abs(pivot));

    for (let i = k + 1; i < n; i += 1) {
      const factor = lu[i][k] / pivot;
      lu[i][k] = factor;
      if (Math.abs(factor) < 1e-30) continue;
      for (let j = k + 1; j < n; j += 1) lu[i][j] -= factor * lu[k][j];
    }
  }

  return { lu, permutation, maxPivot, minPivot };
};

const solveLU = (factorization: LUFactorization, vector: number[]): number[] => {
  const { lu, permutation } = factorization;
  const n = lu.length;
  const x = permutation.map((sourceRow) => vector[sourceRow]);
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < i; j += 1) x[i] -= lu[i][j] * x[j];
  }
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = i + 1; j < n; j += 1) x[i] -= lu[i][j] * x[j];
    x[i] /= lu[i][i];
  }
  return x;
};

/** Solves A^T x=b from P A=L U without forming A^T or refactorizing. */
const solveLUTranspose = (factorization: LUFactorization, vector: number[]): number[] => {
  const { lu, permutation } = factorization;
  const n = lu.length;
  const z = [...vector];
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < i; j += 1) z[i] -= lu[j][i] * z[j];
    z[i] /= lu[i][i];
  }
  const y = [...z];
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = i + 1; j < n; j += 1) y[i] -= lu[j][i] * y[j];
  }
  const x = Array(n).fill(0);
  for (let i = 0; i < n; i += 1) x[permutation[i]] = y[i];
  return x;
};

const estimateInverseOneNorm = (factorization: LUFactorization): number => {
  const n = factorization.lu.length;
  let x = Array(n).fill(1 / n);
  let estimate = 0;
  let previousIndex = -1;
  for (let iteration = 0; iteration < 8; iteration += 1) {
    const y = solveLU(factorization, x);
    estimate = Math.max(estimate, y.reduce((sum, value) => sum + Math.abs(value), 0));
    const signs = y.map((value) => value >= 0 ? 1 : -1);
    const z = solveLUTranspose(factorization, signs);
    let index = 0;
    for (let i = 1; i < n; i += 1) if (Math.abs(z[i]) > Math.abs(z[index])) index = i;
    if (index === previousIndex) break;
    previousIndex = index;
    x = Array(n).fill(0);
    x[index] = 1;
  }
  return estimate;
};

const relativeResidual = (matrix: Matrix, x: number[], vector: number[]): number => {
  const residual = multiplyMatrixVector(matrix, x).map((value, index) => vector[index] - value);
  const numerator = maxAbs(residual);
  const matrixInfinityNorm = matrix.reduce(
    (maximum, row) => Math.max(maximum, row.reduce((sum, value) => sum + Math.abs(value), 0)),
    0,
  );
  return numerator / Math.max(Number.MIN_VALUE, matrixInfinityNorm * maxAbs(x) + maxAbs(vector));
};

/**
 * Dense LU solution with scaled partial pivoting, Hager 1-norm condition
 * estimation and iterative refinement. The condition estimate refers to the
 * matrix supplied to this function; callers should scale mixed-unit systems.
 */
export const solveLinearSystem = (matrix: Matrix, vector: number[]): LinearSolveResult => {
  const n = matrix.length;
  if (n === 0 || matrix.some((row) => row.length !== n) || vector.length !== n) {
    throw new Error('El sistema lineal no es cuadrado.');
  }
  if (matrix.some((row) => row.some((value) => !Number.isFinite(value))) || vector.some((value) => !Number.isFinite(value))) {
    throw new Error('El sistema lineal contiene valores no finitos.');
  }

  const factorization = factorizeLU(matrix);
  let x = solveLU(factorization, vector);
  let residual = relativeResidual(matrix, x, vector);
  let refinementIterations = 0;
  for (let iteration = 0; iteration < 3 && residual > 5e-15; iteration += 1) {
    const correctionRhs = multiplyMatrixVector(matrix, x).map((value, index) => vector[index] - value);
    const correction = solveLU(factorization, correctionRhs);
    const candidate = x.map((value, index) => value + correction[index]);
    const candidateResidual = relativeResidual(matrix, candidate, vector);
    if (candidateResidual >= residual) break;
    x = candidate;
    residual = candidateResidual;
    refinementIterations += 1;
  }

  const pivotRatio = factorization.maxPivot / Math.max(factorization.minPivot, Number.MIN_VALUE);
  const conditionEstimate = matrixOneNorm(matrix) * estimateInverseOneNorm(factorization);
  return { x, conditionEstimate, pivotRatio, relativeResidual: residual, refinementIterations };
};

export interface NullSpaceResult {
  rank: number;
  nullity: number;
  vector: number[] | null;
  residual: number;
}

/**
 * Rank-revealing Gauss-Jordan reduction used only after a singular solve.
 * Returns one normalized null vector and prefers a basis vector with motion in
 * the first `preferredLength` coordinates (the structural displacement block).
 */
export const findNullSpaceVector = (matrix: Matrix, preferredLength = matrix[0]?.length ?? 0): NullSpaceResult => {
  if (!matrix.length || !matrix[0].length || matrix.some((row) => row.length !== matrix[0].length)) {
    return { rank: 0, nullity: 0, vector: null, residual: Number.NaN };
  }
  const rows = matrix.length;
  const columns = matrix[0].length;
  const reduced = matrix.map((row) => [...row]);
  const scale = Math.max(Number.MIN_VALUE, ...matrix.flatMap((row) => row.map(Math.abs)));
  const tolerance = Math.max(Number.EPSILON * Math.max(rows, columns) * scale * 32, Number.MIN_VALUE);
  const pivotColumns: number[] = [];
  let pivotRow = 0;

  for (let column = 0; column < columns && pivotRow < rows; column += 1) {
    let bestRow = pivotRow;
    for (let row = pivotRow + 1; row < rows; row += 1) {
      if (Math.abs(reduced[row][column]) > Math.abs(reduced[bestRow][column])) bestRow = row;
    }
    if (Math.abs(reduced[bestRow][column]) <= tolerance) continue;
    if (bestRow !== pivotRow) [reduced[pivotRow], reduced[bestRow]] = [reduced[bestRow], reduced[pivotRow]];
    const pivot = reduced[pivotRow][column];
    for (let j = column; j < columns; j += 1) reduced[pivotRow][j] /= pivot;
    for (let row = 0; row < rows; row += 1) {
      if (row === pivotRow) continue;
      const factor = reduced[row][column];
      if (Math.abs(factor) <= tolerance) continue;
      reduced[row][column] = 0;
      for (let j = column + 1; j < columns; j += 1) reduced[row][j] -= factor * reduced[pivotRow][j];
    }
    pivotColumns.push(column);
    pivotRow += 1;
  }

  const pivotSet = new Set(pivotColumns);
  const freeColumns = Array.from({ length: columns }, (_, index) => index).filter((index) => !pivotSet.has(index));
  if (!freeColumns.length) return { rank: pivotColumns.length, nullity: 0, vector: null, residual: 0 };

  let selected: number[] | null = null;
  let selectedScore = -1;
  for (const freeColumn of freeColumns) {
    const candidate = Array(columns).fill(0);
    candidate[freeColumn] = 1;
    for (let row = pivotColumns.length - 1; row >= 0; row -= 1) {
      const column = pivotColumns[row];
      let sum = 0;
      for (let j = column + 1; j < columns; j += 1) sum += reduced[row][j] * candidate[j];
      candidate[column] = -sum;
    }
    const norm = Math.hypot(...candidate);
    if (norm <= tolerance) continue;
    const normalized = candidate.map((value) => value / norm);
    const preferredNorm = Math.hypot(...normalized.slice(0, Math.min(preferredLength, columns)));
    if (preferredNorm > selectedScore) {
      selected = normalized;
      selectedScore = preferredNorm;
    }
  }

  const residual = selected ? maxAbs(multiplyMatrixVector(matrix, selected)) / scale : Number.NaN;
  return { rank: pivotColumns.length, nullity: freeColumns.length, vector: selected, residual };
};

export const submatrix = (matrix: Matrix, rows: number[], cols: number[]): Matrix =>
  rows.map((r) => cols.map((c) => matrix[r][c]));

export const subvector = (vector: number[], indices: number[]): number[] =>
  indices.map((index) => vector[index]);
