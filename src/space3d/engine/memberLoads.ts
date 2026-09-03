/**
 * Cargas sobre barra del dominio espacial: reducción a un campo local, vector
 * de cargas consistente y muestreo de acciones internas.
 *
 * El camino es siempre el mismo:
 *
 *   1. cada carga del proyecto se factoriza por el caso o la combinación y se
 *      expresa en ejes locales de la barra —el peso propio entra aquí como una
 *      repartida global `-Y` más—;
 *   2. el campo resultante se integra contra las funciones de forma del
 *      elemento y produce el vector de cargas consistente de doce términos;
 *   3. con las acciones de extremo ya resueltas, el mismo campo se recorre por
 *      estática para dar las acciones internas en cualquier estación.
 *
 * Las funciones de forma incluyen el factor de cortante `phi`, así que un
 * elemento Timoshenko reparte igual de bien que uno Euler–Bernoulli: para una
 * carga uniforme el resultado sigue siendo exactamente `wL/2` y `wL²/12`,
 * independientemente de `phi`.
 *
 * Convenio de acciones internas —el mismo que usa el dominio 2D—:
 *
 *   · `N` positivo en tracción, `N(x) = −N_i − ∫w_x`.
 *   · `V_y(x) = V_{y,i} + ∫w_y` y `M_z(x) = −M_{z,i} + ∫V_y`, de modo que
 *     `dM_z/dx = V_y` y un momento sagital en el plano `x–y` es positivo.
 *   · En el plano `x–z` el par gira al revés: `dM_y/dx = −V_z`.
 */
import { buildMemberOrientation } from './orientation';
import type { Space3DShearFactors } from './element';
import {
  SPACE3D_GRAVITY,
  type Space3DFrameMember,
  type Space3DLoadCase,
  type Space3DMemberEndForces,
  type Space3DMemberLoad,
  type Space3DNode,
  type Space3DOrientationBasis,
  type Space3DVector,
} from '../model/types';

/** Tramo de carga repartida en ejes locales, con abscisas en metros. */
export interface Space3DDistributedSegment {
  readonly a: number;
  readonly b: number;
  /** Intensidad local `[wx, wy, wz]` en kN/m al inicio del tramo. */
  readonly start: Space3DVector;
  readonly end: Space3DVector;
}

export interface Space3DConcentratedAction {
  /** Abscisa desde el extremo `i`, m. */
  readonly x: number;
  /** Fuerza en kN o momento en kN·m, en ejes locales. */
  readonly value: Space3DVector;
}

/** Todo lo que actúa sobre una barra, ya factorizado y en ejes locales. */
export interface Space3DLocalLoadField {
  readonly distributed: readonly Space3DDistributedSegment[];
  readonly forces: readonly Space3DConcentratedAction[];
  readonly moments: readonly Space3DConcentratedAction[];
}

export const EMPTY_LOAD_FIELD: Space3DLocalLoadField = Object.freeze({
  distributed: Object.freeze([]),
  forces: Object.freeze([]),
  moments: Object.freeze([]),
});

const toLocal = (basis: Space3DOrientationBasis, vector: Space3DVector): Space3DVector => [
  basis.x[0] * vector[0] + basis.x[1] * vector[1] + basis.x[2] * vector[2],
  basis.y[0] * vector[0] + basis.y[1] * vector[1] + basis.y[2] * vector[2],
  basis.z[0] * vector[0] + basis.z[1] * vector[1] + basis.z[2] * vector[2],
];

const scaled = (vector: Space3DVector, factor: number): Space3DVector =>
  [vector[0] * factor, vector[1] * factor, vector[2] * factor];

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Intensidad del peso propio de una barra, kN/m en global `-Y`. */
export const selfWeightIntensity = (member: Space3DFrameMember): number => {
  const density = member.density;
  if (typeof density !== 'number' || !Number.isFinite(density) || density <= 0) return 0;
  return density * member.A * SPACE3D_GRAVITY / 1000;
};

export interface Space3DLoadFieldInput {
  readonly member: Space3DFrameMember;
  readonly basis: Space3DOrientationBasis;
  readonly length: number;
  readonly memberLoads: readonly Space3DMemberLoad[];
  readonly loadCases: readonly Space3DLoadCase[];
  /** Factor por caso; los casos ausentes no participan. */
  readonly factors: ReadonlyMap<string, number>;
}

/**
 * Reduce todas las cargas del objetivo que tocan una barra a un único campo
 * local. El peso propio se añade como un tramo repartido más, con el factor de
 * peso propio de cada caso multiplicado por el factor del objetivo.
 */
export const buildLocalLoadField = ({
  member, basis, length, memberLoads, loadCases, factors,
}: Space3DLoadFieldInput): Space3DLocalLoadField => {
  const distributed: Space3DDistributedSegment[] = [];
  const forces: Space3DConcentratedAction[] = [];
  const moments: Space3DConcentratedAction[] = [];

  let selfWeight = 0;
  for (const loadCase of loadCases) {
    const factor = factors.get(loadCase.id);
    if (factor === undefined || factor === 0) continue;
    const share = loadCase.selfWeightFactor;
    if (typeof share === 'number' && Number.isFinite(share) && share !== 0) selfWeight += factor * share;
  }
  const weight = selfWeight * selfWeightIntensity(member);
  if (weight !== 0) {
    const local = toLocal(basis, [0, -weight, 0]);
    distributed.push({ a: 0, b: length, start: local, end: local });
  }

  for (const load of memberLoads) {
    if (load.memberId !== member.id) continue;
    const factor = factors.get(load.caseId);
    if (factor === undefined || factor === 0) continue;
    const startValue = load.axes === 'local' ? load.startValue : toLocal(basis, load.startValue);
    if (load.kind === 'distributed') {
      const a = clamp01(load.start) * length;
      const b = clamp01(load.end) * length;
      if (b - a <= 0) continue;
      const endValue = load.axes === 'local' ? load.endValue : toLocal(basis, load.endValue);
      distributed.push({ a, b, start: scaled(startValue, factor), end: scaled(endValue, factor) });
      continue;
    }
    const action = { x: clamp01(load.start) * length, value: scaled(startValue, factor) };
    if (load.kind === 'force') forces.push(action);
    else moments.push(action);
  }

  return Object.freeze({
    distributed: Object.freeze(distributed),
    forces: Object.freeze(forces),
    moments: Object.freeze(moments),
  });
};

// Cuadratura de Gauss–Legendre de cuatro puntos: la integrando es el producto
// de una forma cúbica por una intensidad lineal, grado cuatro, así que la
// cuadratura es exacta y no aproximada.
const GAUSS_NODES = [-0.8611363115940526, -0.3399810435848563, 0.3399810435848563, 0.8611363115940526];
const GAUSS_WEIGHTS = [0.3478548451374538, 0.6521451548625461, 0.6521451548625461, 0.3478548451374538];

/** Funciones de forma de la traslación, con corrección de cortante. */
const shapeTranslation = (xi: number, length: number, phi: number): readonly [number, number, number, number] => {
  const s = 1 / (1 + phi);
  return [
    s * (2 * xi ** 3 - 3 * xi ** 2 - phi * xi + 1 + phi),
    s * length * (xi ** 3 - (2 + phi / 2) * xi ** 2 + (1 + phi / 2) * xi),
    s * (-2 * xi ** 3 + 3 * xi ** 2 + phi * xi),
    s * length * (xi ** 3 - (1 - phi / 2) * xi ** 2 - (phi / 2) * xi),
  ];
};

/** Funciones de forma del giro asociado, con corrección de cortante. */
const shapeRotation = (xi: number, length: number, phi: number): readonly [number, number, number, number] => {
  const s = 1 / (1 + phi);
  return [
    s * (6 * xi ** 2 - 6 * xi) / length,
    s * (3 * xi ** 2 - (4 + phi) * xi + 1 + phi),
    s * (-6 * xi ** 2 + 6 * xi) / length,
    s * (3 * xi ** 2 - (2 - phi) * xi),
  ];
};

/**
 * Vector de cargas consistente en ejes locales, doce términos en el orden de
 * GDL del elemento. Es la carga **aplicada a la estructura**; las acciones de
 * empotramiento perfecto son su opuesto.
 */
export const consistentLoadVector = (
  field: Space3DLocalLoadField,
  length: number,
  shear: Space3DShearFactors,
): number[] => {
  const q = new Array<number>(12).fill(0);
  if (length <= 0) return q;

  const addTransverse = (xi: number, weight: number, wy: number, wz: number) => {
    if (wy !== 0) {
      const [n1, n2, n3, n4] = shapeTranslation(xi, length, shear.phiZ);
      q[1] += weight * n1 * wy;
      q[5] += weight * n2 * wy;
      q[7] += weight * n3 * wy;
      q[11] += weight * n4 * wy;
    }
    if (wz !== 0) {
      const [n1, n2, n3, n4] = shapeTranslation(xi, length, shear.phiY);
      q[2] += weight * n1 * wz;
      q[4] -= weight * n2 * wz;
      q[8] += weight * n3 * wz;
      q[10] -= weight * n4 * wz;
    }
  };

  for (const segment of field.distributed) {
    const span = segment.b - segment.a;
    if (span <= 0) continue;
    const half = span / 2;
    for (let point = 0; point < GAUSS_NODES.length; point += 1) {
      const t = (GAUSS_NODES[point] + 1) / 2;
      const x = segment.a + span * t;
      const xi = x / length;
      const weight = GAUSS_WEIGHTS[point] * half;
      const wx = segment.start[0] + (segment.end[0] - segment.start[0]) * t;
      const wy = segment.start[1] + (segment.end[1] - segment.start[1]) * t;
      const wz = segment.start[2] + (segment.end[2] - segment.start[2]) * t;
      q[0] += weight * (1 - xi) * wx;
      q[6] += weight * xi * wx;
      addTransverse(xi, weight, wy, wz);
    }
  }

  for (const action of field.forces) {
    const xi = length > 0 ? action.x / length : 0;
    q[0] += (1 - xi) * action.value[0];
    q[6] += xi * action.value[0];
    addTransverse(xi, 1, action.value[1], action.value[2]);
  }

  for (const action of field.moments) {
    const xi = length > 0 ? action.x / length : 0;
    q[3] += (1 - xi) * action.value[0];
    q[9] += xi * action.value[0];
    const my = action.value[1];
    if (my !== 0) {
      const [m1, m2, m3, m4] = shapeRotation(xi, length, shear.phiY);
      q[2] -= m1 * my;
      q[4] += m2 * my;
      q[8] -= m3 * my;
      q[10] += m4 * my;
    }
    const mz = action.value[2];
    if (mz !== 0) {
      const [m1, m2, m3, m4] = shapeRotation(xi, length, shear.phiZ);
      q[1] += m1 * mz;
      q[5] += m2 * mz;
      q[7] += m3 * mz;
      q[11] += m4 * mz;
    }
  }

  return q;
};

/** Resultante `[∫w, ∫(x−ξ)w]` de los tramos repartidos entre `0` y `x`. */
const distributedResultants = (field: Space3DLocalLoadField, x: number) => {
  const force: [number, number, number] = [0, 0, 0];
  const firstMoment: [number, number, number] = [0, 0, 0];
  for (const segment of field.distributed) {
    const a = segment.a;
    const c = Math.min(segment.b, x);
    const span = segment.b - a;
    if (c <= a || span <= 0) continue;
    const len = c - a;
    for (let axis = 0; axis < 3; axis += 1) {
      const wa = segment.start[axis];
      const slope = (segment.end[axis] - wa) / span;
      force[axis] += wa * len + slope * len ** 2 / 2;
      firstMoment[axis] += (x - a) * (wa * len + slope * len ** 2 / 2) - (wa * len ** 2 / 2 + slope * len ** 3 / 3);
    }
  }
  return { force, firstMoment };
};

export type Space3DStationSide = 'left' | 'right';

/**
 * Acciones internas en la abscisa `x`, obtenidas por estática desde el extremo
 * `i`. `side` decide si una acción puntual situada exactamente en `x` ya ha
 * actuado (`right`) o todavía no (`left`), que es lo que dibuja el salto.
 */
export const evaluateStationActions = (
  field: Space3DLocalLoadField,
  start: Space3DMemberEndForces,
  x: number,
  side: Space3DStationSide = 'right',
): Space3DMemberEndForces => {
  const { force, firstMoment } = distributedResultants(field, x);
  const includes = (position: number) => (side === 'right' ? position <= x + 1e-12 : position < x - 1e-12);

  let pointX = 0;
  let pointY = 0;
  let pointZ = 0;
  let leverY = 0;
  let leverZ = 0;
  for (const action of field.forces) {
    if (!includes(action.x)) continue;
    pointX += action.value[0];
    pointY += action.value[1];
    pointZ += action.value[2];
    leverY += (x - action.x) * action.value[1];
    leverZ += (x - action.x) * action.value[2];
  }

  let torque = 0;
  let momentY = 0;
  let momentZ = 0;
  for (const action of field.moments) {
    if (!includes(action.x)) continue;
    torque += action.value[0];
    momentY += action.value[1];
    momentZ += action.value[2];
  }

  const Vy = start.Vy + force[1] + pointY;
  const Vz = start.Vz + force[2] + pointZ;
  return Object.freeze({
    N: -start.N - force[0] - pointX,
    Vy,
    Vz,
    T: -start.T - torque,
    My: -start.My - (x * start.Vz + firstMoment[2] + leverZ) - momentY,
    Mz: -start.Mz + (x * start.Vy + firstMoment[1] + leverY) - momentZ,
  });
};

/** Abscisas donde el diagrama tiene un quiebre o un salto, ordenadas y sin repetir. */
export const stationBreakpoints = (field: Space3DLocalLoadField, length: number, stations: number): number[] => {
  const tolerance = Math.max(length, 1) * 1e-9;
  const candidates = [0, length];
  const step = length / Math.max(1, stations - 1);
  for (let index = 1; index < stations - 1; index += 1) candidates.push(index * step);
  for (const segment of field.distributed) candidates.push(segment.a, segment.b);
  for (const action of field.forces) candidates.push(action.x);
  for (const action of field.moments) candidates.push(action.x);

  const sorted = candidates
    .map((value) => Math.min(length, Math.max(0, value)))
    .sort((a, b) => a - b);
  const unique: number[] = [];
  for (const value of sorted) {
    if (unique.length === 0 || value - unique[unique.length - 1] > tolerance) unique.push(value);
  }
  return unique;
};

/** ¿Hay una acción puntual justo en `x`? Marca dónde el diagrama se duplica. */
export const hasConcentratedAction = (field: Space3DLocalLoadField, x: number, tolerance: number): boolean =>
  field.forces.some((action) => Math.abs(action.x - x) <= tolerance)
  || field.moments.some((action) => Math.abs(action.x - x) <= tolerance);

/** Triada local de una barra sin construir el elemento completo. */
export const memberBasis = (
  member: Space3DFrameMember,
  nodeI: Space3DNode,
  nodeJ: Space3DNode,
): Space3DOrientationBasis =>
  buildMemberOrientation([nodeI.x, nodeI.y, nodeI.z], [nodeJ.x, nodeJ.y, nodeJ.z], member.orientation);
