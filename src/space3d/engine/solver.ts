/**
 * Solver estático lineal para marcos espaciales.
 *
 * Flujo fail-closed: validar → resolver el objetivo de carga → ensamblar →
 * reducir por restricciones → resolver → recuperar reacciones, acciones de
 * extremo, diagramas y auditoría de equilibrio 6D. Cualquier problema devuelve
 * un resultado sin `nodeResults` ni `memberResults`: nunca se publica una
 * respuesta parcialmente utilizable.
 *
 * Lo que el ensamblaje contempla:
 *
 *   · cargas nodales, cargas sobre barra y peso propio, reducidos al vector de
 *     cargas consistente de cada elemento;
 *   · liberaciones de extremo, por condensación estática de la matriz y de las
 *     acciones de empotramiento;
 *   · muelles de apoyo, como rigidez añadida sobre los GDL libres;
 *   · asientos de apoyo, resueltos con la partición `Kff·uf = Ff − Kfs·us`.
 *
 * `solveLinearSystem` se consume como primitiva numérica de sólo lectura; el
 * dominio 2D no se toca.
 */
import { multiplyMatrixVector, solveLinearSystem, submatrix, subvector, transpose, zeros } from '../../engine/math';
import { buildSpaceFrameElement, condenseReleases } from './element';
import {
  buildLocalLoadField,
  consistentLoadVector,
  evaluateStationActions,
  hasConcentratedAction,
  stationBreakpoints,
  type Space3DLocalLoadField,
} from './memberLoads';
import { validateSpace3DProject } from '../model/validation';
import {
  SPACE3D_ACTION_KEYS,
  SPACE3D_DIAGRAM_STATIONS,
  SPACE3D_DOF_KEYS,
  Space3DGeometryError,
  type Space3DActionKey,
  type Space3DAnalysisDiagnostics,
  type Space3DAnalysisIssue,
  type Space3DAnalysisResult,
  type Space3DDofValues,
  type Space3DEquilibriumAudit,
  type Space3DMemberEndForces,
  type Space3DMemberExtreme,
  type Space3DMemberResult,
  type Space3DMemberStation,
  type Space3DNodeResult,
  type Space3DProject,
  type Space3DVector,
} from '../model/types';

const DOF_PER_NODE = 6;

const EMPTY_EQUILIBRIUM: Space3DEquilibriumAudit = Object.freeze({
  force: Object.freeze([0, 0, 0] as const),
  moment: Object.freeze([0, 0, 0] as const),
  normalized: 0,
});

const emptyDiagnostics = (): Space3DAnalysisDiagnostics => Object.freeze({
  dofCount: 0,
  freeDofCount: 0,
  restrainedDofCount: 0,
  relativeResidual: 0,
  conditionEstimate: 0,
  equilibrium: EMPTY_EQUILIBRIUM,
});

const failed = (
  targetId: string,
  targetKind: Space3DAnalysisResult['targetKind'],
  issues: readonly Space3DAnalysisIssue[],
  diagnostics: Space3DAnalysisDiagnostics = emptyDiagnostics(),
): Space3DAnalysisResult => Object.freeze({
  success: false,
  targetId,
  targetKind,
  nodeResults: Object.freeze([]),
  memberResults: Object.freeze([]),
  issues: Object.freeze([...issues]),
  diagnostics,
});

const issue = (
  code: Space3DAnalysisIssue['code'],
  entityKind: Space3DAnalysisIssue['entityKind'],
  entityId: string,
  field = '',
): Space3DAnalysisIssue => ({ code, entityKind, entityId, field });

const dofValues = (values: readonly number[], offset: number): Space3DDofValues => Object.freeze({
  ux: values[offset],
  uy: values[offset + 1],
  uz: values[offset + 2],
  rx: values[offset + 3],
  ry: values[offset + 4],
  rz: values[offset + 5],
});

const endForces = (values: readonly number[], offset: number): Space3DMemberEndForces => Object.freeze({
  N: values[offset],
  Vy: values[offset + 1],
  Vz: values[offset + 2],
  T: values[offset + 3],
  My: values[offset + 4],
  Mz: values[offset + 5],
});

const crossProduct = (r: Space3DVector, f: Space3DVector): Space3DVector => [
  r[1] * f[2] - r[2] * f[1],
  r[2] * f[0] - r[0] * f[2],
  r[0] * f[1] - r[1] * f[0],
];

/**
 * Reparte el objetivo de análisis en factores por caso. Un caso vale 1×; una
 * combinación acumula los factores declarados, sumando los repetidos.
 */
export const resolveSpace3DTarget = (project: Space3DProject, targetId: string) => {
  if (project.loadCases.some((item) => item.id === targetId)) {
    return { kind: 'case' as const, factors: new Map([[targetId, 1]]) };
  }
  const combination = project.loadCombinations.find((item) => item.id === targetId);
  if (!combination) return null;
  const factors = new Map<string, number>();
  for (const term of combination.terms) {
    factors.set(term.caseId, (factors.get(term.caseId) ?? 0) + term.factor);
  }
  return { kind: 'combination' as const, factors };
};

/** Traduce un fallo numérico del solve en un issue estable, o lo relanza si es un bug. */
const classifySolveFailure = (error: unknown): Space3DAnalysisIssue => {
  if (!(error instanceof Error)) throw error;
  if (/singular|mecanismo/i.test(error.message)) return issue('mechanism', 'project', '');
  if (/no finitos/i.test(error.message)) return issue('non-finite-solution', 'project', '');
  throw error;
};

const memberDofMap = (i: number, j: number): number[] => [
  i * DOF_PER_NODE, i * DOF_PER_NODE + 1, i * DOF_PER_NODE + 2,
  i * DOF_PER_NODE + 3, i * DOF_PER_NODE + 4, i * DOF_PER_NODE + 5,
  j * DOF_PER_NODE, j * DOF_PER_NODE + 1, j * DOF_PER_NODE + 2,
  j * DOF_PER_NODE + 3, j * DOF_PER_NODE + 4, j * DOF_PER_NODE + 5,
];

/**
 * Muestrea las acciones internas del vano. Las estaciones equiespaciadas se
 * completan con los bordes de cada tramo repartido y con las acciones
 * puntuales, que se duplican para que el salto se lea como salto.
 */
const sampleStations = (
  field: Space3DLocalLoadField,
  start: Space3DMemberEndForces,
  length: number,
): Space3DMemberStation[] => {
  const tolerance = Math.max(length, 1) * 1e-9;
  const stations: Space3DMemberStation[] = [];
  const push = (x: number, side: 'left' | 'right') => {
    const actions = evaluateStationActions(field, start, x, side);
    stations.push(Object.freeze({
      position: length > 0 ? x / length : 0,
      x,
      N: actions.N,
      Vy: actions.Vy,
      Vz: actions.Vz,
      T: actions.T,
      My: actions.My,
      Mz: actions.Mz,
    }));
  };

  for (const x of stationBreakpoints(field, length, SPACE3D_DIAGRAM_STATIONS)) {
    if (hasConcentratedAction(field, x, tolerance) && x > tolerance) push(x, 'left');
    push(x, 'right');
  }
  return stations;
};

const extremesOf = (stations: readonly Space3DMemberStation[]): Record<Space3DActionKey, Space3DMemberExtreme> => {
  const result = {} as Record<Space3DActionKey, Space3DMemberExtreme>;
  for (const key of SPACE3D_ACTION_KEYS) {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    let minPosition = 0;
    let maxPosition = 0;
    for (const station of stations) {
      const value = station[key];
      if (value < min) { min = value; minPosition = station.position; }
      if (value > max) { max = value; maxPosition = station.position; }
    }
    result[key] = Object.freeze({
      min: Number.isFinite(min) ? min : 0,
      max: Number.isFinite(max) ? max : 0,
      minPosition,
      maxPosition,
    });
  }
  return result;
};

export const analyzeSpace3DProject = (project: Space3DProject, targetId: string): Space3DAnalysisResult => {
  const validationIssues = validateSpace3DProject(project);
  if (validationIssues.length > 0) {
    return failed(targetId, 'unknown', validationIssues.map((item) => issue(item.code, item.entityKind, item.entityId, item.field)));
  }

  const target = resolveSpace3DTarget(project, targetId);
  if (!target) return failed(targetId, 'unknown', [issue('unknown-target', 'project', targetId)]);

  if (project.nodes.length === 0 || project.members.length === 0) {
    return failed(targetId, target.kind, [issue('empty-model', 'project', '')]);
  }

  const nodeIndex = new Map(project.nodes.map((node, index) => [node.id, index]));
  const totalDofs = project.nodes.length * DOF_PER_NODE;

  const K = zeros(totalDofs, totalDofs);
  const F = new Array<number>(totalDofs).fill(0);
  const elements: {
    element: ReturnType<typeof buildSpaceFrameElement>;
    i: number;
    j: number;
    field: Space3DLocalLoadField;
    fixedEnd: number[];
  }[] = [];

  try {
    for (const member of project.members) {
      const i = nodeIndex.get(member.i)!;
      const j = nodeIndex.get(member.j)!;
      const element = buildSpaceFrameElement(member, project.nodes[i], project.nodes[j]);
      const field = buildLocalLoadField({
        member,
        basis: element.basis,
        length: element.length,
        memberLoads: project.memberLoads,
        loadCases: project.loadCases,
        factors: target.factors,
      });
      const applied = consistentLoadVector(field, element.length, element.shear);
      const fixedEnd = condenseReleases(
        element.uncondensedStiffness,
        element.releasedDofs,
        applied.map((value) => -value),
      ).forces;
      elements.push({ element, i, j, field, fixedEnd });

      const map = memberDofMap(i, j);
      for (let row = 0; row < 12; row += 1) {
        for (let col = 0; col < 12; col += 1) K[map[row]][map[col]] += element.globalStiffness[row][col];
      }
      // Carga equivalente en global: `-Tᵀ·Qf`, con `Qf` ya condensado, de modo
      // que un extremo liberado no reparte lo que no puede transmitir.
      const globalEquivalent = multiplyMatrixVector(transpose(element.transformation), fixedEnd);
      for (let row = 0; row < 12; row += 1) F[map[row]] -= globalEquivalent[row];
    }
  } catch (error) {
    if (!(error instanceof Space3DGeometryError)) throw error;
    const code = error.code === 'release-mechanism' ? 'invalid-release' : 'degenerate-orientation';
    return failed(targetId, target.kind, [issue(code, 'member', '', error.code)]);
  }

  for (const load of project.nodalLoads) {
    const factor = target.factors.get(load.caseId);
    if (factor === undefined || factor === 0) continue;
    const base = nodeIndex.get(load.nodeId)! * DOF_PER_NODE;
    F[base] += load.fx * factor;
    F[base + 1] += load.fy * factor;
    F[base + 2] += load.fz * factor;
    F[base + 3] += load.mx * factor;
    F[base + 4] += load.my * factor;
    F[base + 5] += load.mz * factor;
  }

  const restrained = new Set<number>();
  const springs = new Array<number>(totalDofs).fill(0);
  project.nodes.forEach((node, index) => {
    SPACE3D_DOF_KEYS.forEach((key, dof) => {
      const global = index * DOF_PER_NODE + dof;
      if (node.restraints[key]) {
        restrained.add(global);
        return;
      }
      // Un muelle sobre un GDL restringido es inerte: la restricción rígida
      // manda y el muelle no se ensambla.
      const stiffness = node.springs?.[key];
      if (typeof stiffness === 'number' && Number.isFinite(stiffness) && stiffness > 0) springs[global] = stiffness;
    });
  });

  // Asientos impuestos: sólo cuentan sobre GDL restringidos, donde el apoyo
  // puede imponerlos de verdad.
  const prescribed = new Array<number>(totalDofs).fill(0);
  for (const settlement of project.settlements) {
    const factor = target.factors.get(settlement.caseId);
    if (factor === undefined || factor === 0) continue;
    const base = nodeIndex.get(settlement.nodeId)! * DOF_PER_NODE;
    SPACE3D_DOF_KEYS.forEach((key, dof) => {
      const global = base + dof;
      if (restrained.has(global)) prescribed[global] += settlement[key] * factor;
    });
  }

  const free: number[] = [];
  for (let index = 0; index < totalDofs; index += 1) if (!restrained.has(index)) free.push(index);

  const Kspring = K.map((row, rowIndex) => row.map((value, colIndex) => (rowIndex === colIndex ? value + springs[rowIndex] : value)));
  const Kff = submatrix(Kspring, free, free);
  const supported = [...restrained].sort((a, b) => a - b);
  const settlementActive = supported.some((index) => prescribed[index] !== 0);
  const Ff = subvector(F, free).map((value, row) => {
    if (!settlementActive) return value;
    let carried = 0;
    for (const column of supported) carried += Kspring[free[row]][column] * prescribed[column];
    return value - carried;
  });

  // Un modelo con todos los grados restringidos —la viga biempotrada de una
  // sola barra— no es un fallo: no hay incógnitas, los desplazamientos son los
  // impuestos y sólo quedan reacciones y acciones de extremo por recuperar.
  let solved = { x: [] as number[], relativeResidual: 0, conditionEstimate: 1 };
  if (free.length > 0) {
    try {
      solved = solveLinearSystem(Kff, Ff);
    } catch (error) {
      return failed(targetId, target.kind, [classifySolveFailure(error)]);
    }
    if (solved.x.some((value) => !Number.isFinite(value)) || !Number.isFinite(solved.relativeResidual)) {
      return failed(targetId, target.kind, [issue('mechanism', 'project', '')]);
    }
  }

  const U = new Array<number>(totalDofs).fill(0);
  free.forEach((global, index) => { U[global] = solved.x[index]; });
  for (const index of supported) U[index] = prescribed[index];

  // Las reacciones se leen de la rigidez **sin** muelles: en un GDL libre con
  // muelle el residual `K·U − F` es exactamente la fuerza que el muelle
  // devuelve a la estructura, y en uno restringido es la reacción del apoyo.
  const rawReactions = multiplyMatrixVector(K, U).map((value, index) => value - F[index]);
  const R = rawReactions.map((value, index) => (restrained.has(index) || springs[index] > 0 ? value : 0));

  const nodeResults: Space3DNodeResult[] = project.nodes.map((node, index) => Object.freeze({
    nodeId: node.id,
    displacement: dofValues(U, index * DOF_PER_NODE),
    reaction: dofValues(R, index * DOF_PER_NODE),
  }));

  const memberResults: Space3DMemberResult[] = elements.map(({ element, i, j, field, fixedEnd }) => {
    const uElement = [
      ...U.slice(i * DOF_PER_NODE, i * DOF_PER_NODE + 6),
      ...U.slice(j * DOF_PER_NODE, j * DOF_PER_NODE + 6),
    ];
    const uLocal = multiplyMatrixVector(element.transformation, uElement);
    const fLocal = multiplyMatrixVector(element.localStiffness, uLocal).map((value, index) => value + fixedEnd[index]);
    const start = endForces(fLocal, 0);
    const stations = sampleStations(field, start, element.length);
    return Object.freeze({
      memberId: element.memberId,
      length: element.length,
      basis: element.basis,
      start,
      end: endForces(fLocal, 6),
      stations: Object.freeze(stations),
      extremes: Object.freeze(extremesOf(stations)),
    });
  });

  const equilibrium = auditEquilibrium(project, nodeResults, F, nodeIndex);

  const diagnostics: Space3DAnalysisDiagnostics = Object.freeze({
    dofCount: totalDofs,
    freeDofCount: free.length,
    restrainedDofCount: restrained.size,
    relativeResidual: solved.relativeResidual,
    conditionEstimate: solved.conditionEstimate,
    equilibrium,
  });

  return Object.freeze({
    success: true,
    targetId,
    targetKind: target.kind,
    nodeResults: Object.freeze(nodeResults),
    memberResults: Object.freeze(memberResults),
    issues: Object.freeze([]),
    diagnostics,
  });
};

/**
 * Auditoría global 6D: las acciones aplicadas más las reacciones deben
 * anularse, y lo mismo los momentos respecto al origen incluyendo `r × F`. La
 * auditoría se hace sobre el vector de cargas ya ensamblado, que incluye las
 * cargas equivalentes de barra: el reparto consistente conserva resultante y
 * momento, así que comprobarlo ahí comprueba también las cargas repartidas. El
 * residual se normaliza por separado en fuerza y momento porque comparten
 * magnitud pero no unidad, y se toma el peor de los dos.
 */
const auditEquilibrium = (
  project: Space3DProject,
  nodeResults: readonly Space3DNodeResult[],
  F: readonly number[],
  nodeIndex: ReadonlyMap<string, number>,
): Space3DEquilibriumAudit => {
  const force: [number, number, number] = [0, 0, 0];
  const moment: [number, number, number] = [0, 0, 0];
  let forceScale = 1;
  let momentScale = 1;

  const accumulate = (position: Space3DVector, f: Space3DVector, m: Space3DVector) => {
    const torque = crossProduct(position, f);
    for (let axis = 0; axis < 3; axis += 1) {
      force[axis] += f[axis];
      moment[axis] += m[axis] + torque[axis];
      forceScale = Math.max(forceScale, Math.abs(f[axis]));
      momentScale = Math.max(momentScale, Math.abs(m[axis]), Math.abs(torque[axis]));
    }
  };

  project.nodes.forEach((node, index) => {
    const position: Space3DVector = [node.x, node.y, node.z];
    const base = index * 6;
    accumulate(position, [F[base], F[base + 1], F[base + 2]], [F[base + 3], F[base + 4], F[base + 5]]);
    const reaction = nodeResults[nodeIndex.get(node.id)!].reaction;
    accumulate(position, [reaction.ux, reaction.uy, reaction.uz], [reaction.rx, reaction.ry, reaction.rz]);
  });

  const normalized = Math.max(
    Math.max(...force.map(Math.abs)) / forceScale,
    Math.max(...moment.map(Math.abs)) / momentScale,
  );

  return Object.freeze({
    force: Object.freeze([force[0], force[1], force[2]] as const),
    moment: Object.freeze([moment[0], moment[1], moment[2]] as const),
    normalized,
  });
};

/** Resultado neutro para superficies que aún no han analizado. */
export const emptySpace3DAnalysisResult = (targetId: string): Space3DAnalysisResult =>
  failed(targetId, 'unknown', []);
