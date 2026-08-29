/** Operaciones lineales para problemas de autovalores simétricos restringidos. */
import { multiply, multiplyMatrixVector, transpose, zeros, type Matrix } from './math';

const EPS = 1e-12;

export interface CholeskyFactor {
  L: Matrix;
}

/** Factorización sin pivoteo; `null` preserva la señal de un mecanismo. */
export const choleskyFactor = (matrix: Matrix): CholeskyFactor | null => {
  const L = zeros(matrix.length, matrix.length);
  for (let i = 0; i < matrix.length; i += 1) {
    for (let j = 0; j <= i; j += 1) {
      let sum = matrix[i][j];
      for (let k = 0; k < j; k += 1) sum -= L[i][k] * L[j][k];
      if (i === j) {
        if (!(sum > Math.abs(matrix[i][i]) * 1e-14) || !Number.isFinite(sum)) return null;
        L[i][i] = Math.sqrt(sum);
      } else {
        L[i][j] = sum / L[j][j];
      }
    }
  }
  return { L };
};

export const forwardSubstitute = (L: Matrix, b: readonly number[]): number[] => {
  const result = Array(L.length).fill(0);
  for (let i = 0; i < L.length; i += 1) {
    let sum = b[i];
    for (let k = 0; k < i; k += 1) sum -= L[i][k] * result[k];
    result[i] = sum / L[i][i];
  }
  return result;
};

export const backSubstitute = (L: Matrix, b: readonly number[]): number[] => {
  const result = Array(L.length).fill(0);
  for (let i = L.length - 1; i >= 0; i -= 1) {
    let sum = b[i];
    for (let k = i + 1; k < L.length; k += 1) sum -= L[k][i] * result[k];
    result[i] = sum / L[i][i];
  }
  return result;
};

export interface SymmetricEigenResult {
  values: number[];
  vectors: number[][];
}

/** Jacobi cíclico para las proyecciones simétricas pequeñas del subespacio modal. */
export const symmetricEigenJacobi = (input: Matrix, maxSweeps = 60): SymmetricEigenResult => {
  const a = input.map((row) => [...row]);
  const vectors = zeros(a.length, a.length);
  for (let i = 0; i < vectors.length; i += 1) vectors[i][i] = 1;
  const scale = Math.max(...a.flatMap((row) => row.map(Math.abs)), 0) || 1;
  const threshold = scale / 1e18;
  const offDiagonalNorm = () => Math.sqrt(2 * a.reduce((sum, row, i) =>
    sum + row.slice(i + 1).reduce((part, value) => part + value * value, 0), 0));

  for (let sweep = 0; sweep < maxSweeps && offDiagonalNorm() > scale * 1e-15; sweep += 1) {
    for (let p = 0; p < a.length - 1; p += 1) for (let q = p + 1; q < a.length; q += 1) {
      if (Math.abs(a[p][q]) <= threshold) continue;
      const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
      const tangent = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const cosine = 1 / Math.sqrt(tangent * tangent + 1);
      const sine = tangent * cosine;
      for (let k = 0; k < a.length; k += 1) {
        const kp = a[k][p]; const kq = a[k][q];
        a[k][p] = cosine * kp - sine * kq; a[k][q] = sine * kp + cosine * kq;
      }
      for (let k = 0; k < a.length; k += 1) {
        const pk = a[p][k]; const qk = a[q][k];
        a[p][k] = cosine * pk - sine * qk; a[q][k] = sine * pk + cosine * qk;
      }
      for (let k = 0; k < vectors.length; k += 1) {
        const vp = vectors[k][p]; const vq = vectors[k][q];
        vectors[k][p] = cosine * vp - sine * vq; vectors[k][q] = sine * vp + cosine * vq;
      }
    }
  }
  const order = Array.from({ length: a.length }, (_, index) => index).sort((left, right) => a[right][right] - a[left][left]);
  return {
    values: order.map((index) => a[index][index]),
    vectors: order.map((index) => {
      const vector = vectors.map((row) => row[index]);
      const norm = Math.hypot(...vector) || 1;
      const first = vector.find((value) => Math.abs(value) > 1e-10) ?? 1;
      const sign = first < 0 ? -1 : 1;
      return vector.map((value) => (value / norm) * sign);
    }),
  };
};

export interface NullSpaceBasis {
  vectors: number[][];
  rank: number;
  nullity: number;
}

/** Base exacta de `C u = 0`, con pivoteo para enlaces rígidos y apoyos. */
export const constraintNullSpaceBasis = (rows: readonly number[][], columns: number): NullSpaceBasis => {
  const matrix = rows.map((row) => [...row]);
  const pivots: number[] = [];
  const scale = Math.max(...matrix.flatMap((row) => row.map(Math.abs)), Number.MIN_VALUE);
  let pivotRow = 0;
  for (let column = 0; column < columns && pivotRow < matrix.length; column += 1) {
    let best = pivotRow;
    for (let row = pivotRow + 1; row < matrix.length; row += 1) if (Math.abs(matrix[row][column]) > Math.abs(matrix[best][column])) best = row;
    if (Math.abs(matrix[best][column]) <= scale * EPS) continue;
    [matrix[pivotRow], matrix[best]] = [matrix[best], matrix[pivotRow]];
    const pivot = matrix[pivotRow][column];
    for (let item = 0; item < columns; item += 1) matrix[pivotRow][item] /= pivot;
    for (let row = 0; row < matrix.length; row += 1) {
      if (row === pivotRow) continue;
      const factor = matrix[row][column];
      if (Math.abs(factor) <= EPS) continue;
      for (let item = 0; item < columns; item += 1) matrix[row][item] -= factor * matrix[pivotRow][item];
    }
    pivots.push(column); pivotRow += 1;
  }
  const pivotSet = new Set(pivots);
  const vectors = Array.from({ length: columns }, (_, index) => index).filter((index) => !pivotSet.has(index)).map((free) => {
    const vector = Array(columns).fill(0); vector[free] = 1;
    pivots.forEach((pivot, row) => { vector[pivot] = -matrix[row][free]; });
    return vector;
  });
  return { vectors, rank: pivots.length, nullity: vectors.length };
};

export const projectOntoBasis = (matrix: Matrix, basis: readonly number[][]): Matrix => {
  const Z = transpose(basis as Matrix);
  return multiply(multiply(transpose(Z), matrix), Z);
};

export const expandFromBasis = (reduced: readonly number[], basis: readonly number[][]): number[] => {
  const full = Array(basis[0]?.length ?? 0).fill(0);
  reduced.forEach((coefficient, index) => basis[index].forEach((value, row) => { full[row] += coefficient * value; }));
  return full;
};

export type EigenFailure = 'mechanism' | 'no-degrees-of-freedom' | 'empty-right-hand-side' | 'not-converged';

export interface GeneralizedEigenResult {
  values: number[];
  vectors: number[][];
  converged: boolean;
  iterations: number;
  residual: number;
  failure?: EigenFailure;
  reason: string;
}

export interface GeneralizedEigenOptions {
  subspaceSize?: number;
  maxIterations?: number;
  tolerance?: number;
  positiveOnly?: boolean;
}

/**
 * Resuelve K phi = lambda B phi con una proyección de Rayleigh-Ritz. K tiene
 * que ser definida positiva; B puede ser indefinida, como en pandeo mixto.
 */
export const generalizedSmallestEigenpairs = (
  K: Matrix,
  B: Matrix,
  count: number,
  options: GeneralizedEigenOptions = {},
): GeneralizedEigenResult => {
  const n = K.length;
  const fail = (failure: EigenFailure, reason: string): GeneralizedEigenResult => ({ values: [], vectors: [], converged: false, iterations: 0, residual: Number.NaN, failure, reason });
  if (!n) return fail('no-degrees-of-freedom', 'El modelo no tiene grados de libertad libres una vez aplicadas las condiciones de contorno.');
  if (!(Math.max(...B.flatMap((row) => row.map(Math.abs)), 0) > 0)) return fail('empty-right-hand-side', 'La matriz del lado derecho es idénticamente nula.');
  const factor = choleskyFactor(K);
  if (!factor) return fail('mechanism', 'La rigidez reducida no es definida positiva: el modelo tiene un mecanismo y no admite un análisis de autovalores.');
  const { L } = factor;
  const apply = (vector: readonly number[]) => forwardSubstitute(L, multiplyMatrixVector(B, backSubstitute(L, vector)));
  const maxIterations = options.maxIterations ?? 300;
  const tolerance = options.tolerance ?? 1e-9;
  const size = Math.min(n, Math.max(options.subspaceSize ?? 0, Math.max(count * 2, count + 4)));
  const softness = Array.from({ length: n }, (_, index) => Math.abs(B[index][index]) / Math.max(Math.abs(K[index][index]), Number.MIN_VALUE));
  const order = Array.from({ length: n }, (_, index) => index).sort((left, right) => softness[right] - softness[left]);
  let vectors: number[][] = [Array(n).fill(1)];
  for (let index = 1; index < size; index += 1) {
    const vector = Array(n).fill(0); vector[order[(index - 1) % n]] = 1; vectors.push(vector);
  }
  const orthonormalize = (input: readonly number[][]): number[][] => {
    const basis: number[][] = [];
    for (const candidate of input) {
      const vector = [...candidate];
      for (const previous of basis) {
        const projection = vector.reduce((sum, value, index) => sum + value * previous[index], 0);
        vector.forEach((_, index) => { vector[index] -= projection * previous[index]; });
      }
      const norm = Math.hypot(...vector);
      if (norm > 1e-10) basis.push(vector.map((value) => value / norm));
    }
    return basis;
  };
  const ritzResidual = (value: number, vector: readonly number[]) => {
    const image = apply(vector);
    const reference = Math.abs(value) * Math.hypot(...vector);
    return reference > 0 ? Math.hypot(...image.map((item, index) => item - value * vector[index])) / reference : Number.POSITIVE_INFINITY;
  };
  let iterations = 0;
  let converged = false;
  let values: number[] = [];
  for (; iterations < maxIterations; iterations += 1) {
    const image = orthonormalize(vectors.map(apply));
    if (!image.length) return fail('empty-right-hand-side', 'El subespacio colapsó: el lado derecho no excita ningún grado de libertad.');
    const projected = image.map(apply);
    const small = image.map((row) => projected.map((column) => row.reduce((sum, value, index) => sum + value * column[index], 0)));
    for (let row = 0; row < small.length; row += 1) for (let column = row + 1; column < small.length; column += 1) {
      const mean = (small[row][column] + small[column][row]) / 2; small[row][column] = mean; small[column][row] = mean;
    }
    const eigensystem = symmetricEigenJacobi(small);
    values = eigensystem.values;
    vectors = eigensystem.vectors.map((coefficients) => image[0].map((_, row) => coefficients.reduce((sum, coefficient, column) => sum + coefficient * image[column][row], 0)));
    const wanted = Math.min(count, values.length);
    if (wanted && Math.max(...Array.from({ length: wanted }, (_, index) => ritzResidual(values[index], vectors[index]))) <= tolerance) {
      converged = true; iterations += 1; break;
    }
  }
  const pairs = values.map((value, index) => ({ value, vector: vectors[index] }))
    .filter(({ value }) => Math.abs(value) > 1e-14)
    .map(({ value, vector }) => ({ lambda: 1 / value, vector: backSubstitute(L, vector) }))
    .filter(({ lambda }) => !options.positiveOnly || lambda > 0)
    .sort((left, right) => Math.abs(left.lambda) - Math.abs(right.lambda)).slice(0, count);
  if (!pairs.length) return { values: [], vectors: [], converged, iterations, residual: Number.NaN, failure: 'not-converged', reason: options.positiveOnly ? 'No se encontró ningún autovalor positivo en el subespacio calculado.' : 'No se encontró ningún autovalor finito en el subespacio calculado.' };
  let residual = 0;
  for (const pair of pairs) {
    const kVector = multiplyMatrixVector(K, pair.vector);
    const bVector = multiplyMatrixVector(B, pair.vector);
    const reference = Math.max(Math.hypot(...kVector), Number.MIN_VALUE);
    residual = Math.max(residual, Math.hypot(...kVector.map((value, index) => value - pair.lambda * bVector[index])) / reference);
  }
  return {
    values: pairs.map((pair) => pair.lambda), vectors: pairs.map((pair) => pair.vector), converged, iterations, residual,
    reason: converged ? `Convergió en ${iterations} iteraciones con residuo relativo ${residual.toExponential(2)}.` : `Se agotaron las ${maxIterations} iteraciones sin estabilizar los autovalores.`,
  };
};
