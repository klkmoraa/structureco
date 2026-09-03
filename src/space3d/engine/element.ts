/**
 * Elemento frame espacial de doce grados de libertad.
 *
 * Orden local de GDL: `[u, v, w, rx, ry, rz]` en el nudo `i` y luego los mismos
 * seis en el nudo `j`. `Iz` gobierna la flexión en el plano `x–y` (pareja
 * `v`–`rz`) e `Iy` la del plano `x–z` (`w`, `ry`); esta última cambia de signo
 * porque un giro positivo alrededor de `+y` desplaza `w` en `-z`.
 *
 * El elemento es Timoshenko cuando la barra declara área de cortante: los
 * factores `phi = 12·E·I / (G·As·L²)` reblandecen los bloques de flexión y se
 * anulan solos cuando `As = 0`, recuperando exactamente Euler–Bernoulli. Es la
 * misma frontera que usa el dominio 2D, así que un mismo perfil corto se
 * comporta igual en las dos superficies.
 *
 * Las liberaciones de extremo se aplican por condensación estática sobre la
 * matriz local y sobre las acciones de empotramiento perfecto, de modo que un
 * extremo liberado devuelve exactamente cero en esa acción.
 */
import { multiply, transpose, zeros, type Matrix } from '../../engine/math';
import { buildMemberOrientation, memberLength } from './orientation';
import {
  SPACE3D_RELEASE_KEYS,
  Space3DGeometryError,
  hasSpace3DReleases,
  noSpace3DReleases,
  type Space3DFrameMember,
  type Space3DMemberReleases,
  type Space3DNode,
  type Space3DOrientationBasis,
} from '../model/types';

export interface Space3DSectionProperties {
  readonly E: number;
  readonly G: number;
  readonly A: number;
  readonly Iy: number;
  readonly Iz: number;
  readonly J: number;
  /** Área efectiva a cortante en `y`, m². Cero ⇒ sin deformación por cortante. */
  readonly shearAreaY?: number;
  /** Área efectiva a cortante en `z`, m². Cero ⇒ sin deformación por cortante. */
  readonly shearAreaZ?: number;
}

/**
 * Factores de cortante del elemento. `phiZ` corresponde a la flexión gobernada
 * por `Iz` (plano `x–y`, cortante según `y`) y `phiY` a la de `Iy`.
 */
export interface Space3DShearFactors {
  readonly phiY: number;
  readonly phiZ: number;
}

export interface Space3DElement {
  readonly memberId: string;
  readonly length: number;
  readonly basis: Space3DOrientationBasis;
  readonly shear: Space3DShearFactors;
  /** Matriz local ya condensada por las liberaciones declaradas. */
  readonly localStiffness: Matrix;
  /** Matriz local sin condensar; las acciones de empotramiento se condensan con ella. */
  readonly uncondensedStiffness: Matrix;
  readonly transformation: Matrix;
  readonly globalStiffness: Matrix;
  readonly releases: Space3DMemberReleases;
  /** Índices locales liberados, en orden creciente. */
  readonly releasedDofs: readonly number[];
}

/** Índice local de cada liberación dentro del vector de doce GDL. */
export const SPACE3D_RELEASE_DOF: Readonly<Record<(typeof SPACE3D_RELEASE_KEYS)[number], number>> = Object.freeze({
  iN: 0, iVy: 1, iVz: 2, iT: 3, iMy: 4, iMz: 5,
  jN: 6, jVy: 7, jVz: 8, jT: 9, jMy: 10, jMz: 11,
});

const addSymmetric2 = (k: Matrix, [a, b]: readonly [number, number], diagonal: number, offDiagonal: number) => {
  k[a][a] += diagonal;
  k[b][b] += diagonal;
  k[a][b] += offDiagonal;
  k[b][a] += offDiagonal;
};

/**
 * Bloque de flexión sobre los índices `[traslación_i, giro_i, traslación_j,
 * giro_j]`. `sign` es `+1` para la pareja `v`–`rz` y `-1` para `w`–`ry`.
 * `phi` es el factor de cortante; con `phi = 0` el bloque es el de
 * Euler–Bernoulli.
 */
const addBendingBlock = (
  k: Matrix,
  [a, b, c, d]: readonly [number, number, number, number],
  EI: number,
  L: number,
  sign: 1 | -1,
  phi: number,
) => {
  const scale = 1 / (1 + phi);
  const t = scale * 12 * EI / L ** 3;
  const m = sign * scale * 6 * EI / L ** 2;
  const r4 = scale * (4 + phi) * EI / L;
  const r2 = scale * (2 - phi) * EI / L;

  k[a][a] += t; k[a][b] += m; k[a][c] += -t; k[a][d] += m;
  k[b][a] += m; k[b][b] += r4; k[b][c] += -m; k[b][d] += r2;
  k[c][a] += -t; k[c][b] += -m; k[c][c] += t; k[c][d] += -m;
  k[d][a] += m; k[d][b] += r2; k[d][c] += -m; k[d][d] += r4;
};

/**
 * `phi = 12·E·I / (G·As·L²)`. Un área de cortante nula, negativa o no finita
 * significa «sin deformación por cortante»: se devuelve cero en vez de dividir
 * por cero y propagar un `Infinity` a toda la matriz.
 */
export const spaceFrameShearFactors = (
  properties: Space3DSectionProperties,
  length: number,
): Space3DShearFactors => {
  const factor = (inertia: number, shearArea: number | undefined) => {
    if (typeof shearArea !== 'number' || !Number.isFinite(shearArea) || shearArea <= 0) return 0;
    const value = 12 * properties.E * inertia / (properties.G * shearArea * length ** 2);
    return Number.isFinite(value) ? value : 0;
  };
  return Object.freeze({
    phiY: factor(properties.Iy, properties.shearAreaZ),
    phiZ: factor(properties.Iz, properties.shearAreaY),
  });
};

export const spaceFrameLocalStiffness = (
  properties: Space3DSectionProperties,
  length: number,
  shear: Space3DShearFactors = { phiY: 0, phiZ: 0 },
): Matrix => {
  const { E, G, A, Iy, Iz, J } = properties;
  const L = length;
  const k = zeros(12, 12);

  addSymmetric2(k, [0, 6], E * A / L, -(E * A / L));
  addSymmetric2(k, [3, 9], G * J / L, -(G * J / L));
  addBendingBlock(k, [1, 5, 7, 11], E * Iz, L, 1, shear.phiZ);
  addBendingBlock(k, [2, 4, 8, 10], E * Iy, L, -1, shear.phiY);

  return k;
};

/**
 * Matriz de transformación 12×12: cuatro copias del bloque 3×3 cuyas filas son
 * los ejes locales expresados en global, de modo que `uLocal = T · uGlobal`.
 */
export const spaceFrameTransformation = (basis: Space3DOrientationBasis): Matrix => {
  const T = zeros(12, 12);
  const rows = [basis.x, basis.y, basis.z];
  for (let block = 0; block < 4; block += 1) {
    const offset = block * 3;
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) T[offset + row][offset + col] = rows[row][col];
    }
  }
  return T;
};

export const releasedDofsOf = (releases: Space3DMemberReleases): number[] =>
  SPACE3D_RELEASE_KEYS.filter((key) => releases[key]).map((key) => SPACE3D_RELEASE_DOF[key]).sort((a, b) => a - b);

export interface Space3DCondensation {
  readonly stiffness: Matrix;
  readonly forces: number[];
}

/**
 * Condensación estática de los GDL liberados, sobre la matriz y sobre las
 * acciones de empotramiento a la vez.
 *
 * Es el complemento de Schur `kRR − kRC·kCC⁻¹·kCR` escrito como eliminación de
 * Gauss–Jordan in situ: el bloque liberado tiene entre uno y cuatro GDL, así
 * que eliminar sus filas cuesta menos que construir tres productos de matrices
 * y una inversa. Si el pivote se anula, la combinación de liberaciones ha
 * convertido la barra en un mecanismo —los dos cortantes del mismo plano, por
 * ejemplo— y se falla cerrado en vez de devolver ruido numérico.
 */
export const condenseReleases = (
  stiffness: Matrix,
  released: readonly number[],
  forces: readonly number[] = [],
): Space3DCondensation => {
  const size = stiffness.length;
  const q = forces.length === size ? [...forces] : new Array<number>(size).fill(0);
  if (released.length === 0) return { stiffness, forces: q };

  const k = stiffness.map((row) => [...row]);
  for (const pivot of released) {
    const value = k[pivot][pivot];
    const reference = Math.max(...k.map((row) => Math.abs(row[pivot])), 1);
    if (!Number.isFinite(value) || Math.abs(value) <= 1e-12 * reference) {
      throw new Space3DGeometryError('release-mechanism');
    }
    for (let row = 0; row < size; row += 1) {
      if (row === pivot) continue;
      const factor = k[row][pivot] / value;
      if (factor === 0) continue;
      for (let col = 0; col < size; col += 1) k[row][col] -= factor * k[pivot][col];
      q[row] -= factor * q[pivot];
    }
    for (let col = 0; col < size; col += 1) { k[pivot][col] = 0; k[col][pivot] = 0; }
    q[pivot] = 0;
  }
  return { stiffness: k, forces: q };
};

export const buildSpaceFrameElement = (
  member: Space3DFrameMember,
  nodeI: Space3DNode,
  nodeJ: Space3DNode,
): Space3DElement => {
  const start = [nodeI.x, nodeI.y, nodeI.z] as const;
  const end = [nodeJ.x, nodeJ.y, nodeJ.z] as const;
  const length = memberLength(start, end);
  const basis = buildMemberOrientation(start, end, member.orientation);
  const shear = spaceFrameShearFactors(member, length);
  const releases = member.releases ?? noSpace3DReleases();
  const releasedDofs = hasSpace3DReleases(releases) ? releasedDofsOf(releases) : [];
  const uncondensedStiffness = spaceFrameLocalStiffness(member, length, shear);
  const localStiffness = condenseReleases(uncondensedStiffness, releasedDofs).stiffness;
  const transformation = spaceFrameTransformation(basis);
  const globalStiffness = multiply(transpose(transformation), multiply(localStiffness, transformation));

  return {
    memberId: member.id,
    length,
    basis,
    shear,
    localStiffness,
    uncondensedStiffness,
    transformation,
    globalStiffness,
    releases,
    releasedDofs,
  };
};
