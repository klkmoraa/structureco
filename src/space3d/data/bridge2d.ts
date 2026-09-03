/**
 * Puente explícito del dominio plano 2D al dominio espacial S3D-1.
 *
 * Es un adaptador de una sola dirección y sin estado: lee un `ProjectModel` y
 * devuelve un `Space3DProject` nuevo. Los dos dominios siguen separados —
 * ningún store se acopla, ningún solver se vuelve híbrido— y el proyecto 2D
 * nunca se toca.
 *
 * La regla que gobierna todo el archivo: **lo que el modelo plano no dice, no
 * se inventa**; y su recíproca: lo que el modelo plano sí dice y el espacial
 * sabe representar, se traduce en vez de perderse. Desde S3D-2 cruzan el puente
 * las cargas de barra, el peso propio, las liberaciones de extremo, los muelles
 * de apoyo alineados con los ejes y los desplazamientos impuestos por caso.
 *
 * Un marco 2D no contiene el eje débil, la torsión ni ninguna restricción fuera
 * del plano; rellenarlos con «valores razonables» produciría un análisis
 * espacial creíble y falso. En su lugar:
 *
 *   · las propiedades que faltan quedan en `0`, que el validador rechaza y el
 *     editor pide completar;
 *   · lo que no es un número (una celosía, un muelle, un apoyo inclinado) se
 *     publica como nota **bloqueante** que el usuario debe reconocer.
 *
 * Hasta que no quede ninguna nota sin resolver, la superficie no analiza.
 */
import {
  SPACE3D_ANALYSIS_SPACE,
  SPACE3D_DOF_KEYS,
  SPACE3D_RELEASE_KEYS,
  SPACE3D_SCHEMA_VERSION,
  freeSpace3DRestraints,
  noSpace3DReleases,
  noSpace3DSprings,
  type Space3DEntityKind,
  type Space3DFrameMember,
  type Space3DLoadCombination,
  type Space3DMemberLoad,
  type Space3DMemberReleases,
  type Space3DNodalLoad,
  type Space3DNode,
  type Space3DProject,
  type Space3DRestraints,
  type Space3DSpringStiffness,
  type Space3DSupportSettlement,
  type Space3DVector,
} from '../model/types';
import type { MemberLoad, MemberModel, NodeModel, ProjectModel } from '../../types';

export const SPACE3D_DERIVED_ID_PREFIX = 'space3d-from-';

export const derivedSpace3DId = (sourceProjectId: string): string => `${SPACE3D_DERIVED_ID_PREFIX}${sourceProjectId}`;

export type Space3DBridgeCode =
  /** Datos que S3D-1 necesita y el plano no puede aportar: se dejan a cero. */
  | 'pending-shear-modulus'
  | 'pending-weak-axis-inertia'
  | 'pending-torsion-constant'
  /** Semántica que S3D-1 no representa: se declara y el usuario la reconoce. */
  | 'out-of-plane-unrestrained'
  | 'truss-member-as-frame'
  | 'dropped-member-release'
  | 'dropped-internal-hinge'
  | 'dropped-semi-rigid-connection'
  | 'dropped-rigid-offset'
  | 'dropped-support-spring'
  | 'dropped-inclined-support'
  | 'dropped-prescribed-support-motion'
  | 'dropped-member-load'
  | 'dropped-prescribed-displacement'
  | 'dropped-initial-effect'
  /** Traducciones que cruzan el puente, informativas y no bloqueantes. */
  | 'carried-member-load'
  | 'carried-member-release'
  | 'carried-support-spring'
  | 'carried-prescribed-displacement'
  | 'carried-self-weight';

export interface Space3DBridgeNote {
  readonly code: Space3DBridgeCode;
  readonly entityKind: Space3DEntityKind;
  readonly entityId: string;
  readonly field: string;
  /** Una nota bloqueante impide analizar hasta que se resuelve o se reconoce. */
  readonly blocking: boolean;
}

export interface Space3DBridgeResult {
  readonly project: Space3DProject;
  readonly notes: readonly Space3DBridgeNote[];
}

/** Notas cuya resolución es un número que el usuario escribe en el editor. */
const PROPERTY_NOTES: Record<string, keyof Pick<Space3DFrameMember, 'G' | 'Iy' | 'J'>> = {
  'pending-shear-modulus': 'G',
  'pending-weak-axis-inertia': 'Iy',
  'pending-torsion-constant': 'J',
};

const positive = (value: number | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

const restraintsOf = (node: NodeModel): Space3DRestraints => {
  const support = node.support;
  const base = freeSpace3DRestraints();
  switch (support.type) {
    case 'fixed': return { ...base, ux: true, uy: true, rz: true };
    case 'pin': return { ...base, ux: true, uy: true };
    case 'roller': return { ...base, uy: true };
    case 'custom': return {
      ...base,
      ux: support.restrainX === true,
      uy: support.restrainY === true,
      rz: support.restrainR === true,
    };
    default: return base;
  }
};

/**
 * Referencia del eje local `y` para un miembro contenido en el plano global XY.
 *
 * `[0, 1, 0]` —el valor por defecto de S3D-1— es paralelo a cualquier pilar
 * vertical y degeneraría su triada. La perpendicular dentro del plano,
 * `ẑ_global × x̂`, existe siempre para un miembro plano y hace que `Iz` gobierne
 * exactamente la misma flexión que gobernaba `I` en 2D.
 */
const planarLocalYReference = (start: NodeModel, end: NodeModel): Space3DVector => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (!Number.isFinite(length) || length === 0) return [0, 1, 0];
  // ẑ × x̂ = (-x̂_y, x̂_x, 0)
  return [-dy / length, dx / length, 0];
};

/**
 * Liberaciones planas traducidas a ejes espaciales. En el plano sólo existen el
 * axil, el cortante transversal y el flector alrededor de `z`; la flexión fuera
 * del plano y la torsión siguen siendo continuas porque el modelo plano no dice
 * nada de ellas. Devuelve `null` cuando no hay ninguna liberación que traducir.
 */
const planarReleases = (member: MemberModel): Space3DMemberReleases | null => {
  const source = member.releases;
  if (!source) return null;
  const releases: Space3DMemberReleases = {
    ...noSpace3DReleases(),
    iN: source.iAxial === true,
    iVy: source.iShear === true,
    iMz: source.iMoment === true,
    jN: source.jAxial === true,
    jVy: source.jShear === true,
    jMz: source.jMoment === true,
  };
  return Object.values(releases).some(Boolean) ? releases : null;
};

/**
 * Escala que convierte una intensidad medida sobre una proyección en otra
 * medida por metro de barra: el total es el mismo, así que basta multiplicar
 * por la proporción de la proyección respecto a la longitud real.
 */
const lengthBasisScale = (basis: MemberLoad['lengthBasis'], start: NodeModel, end: NodeModel): number => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (!Number.isFinite(length) || length === 0) return 1;
  if (basis === 'horizontal') return Math.abs(dx) / length;
  if (basis === 'vertical') return Math.abs(dy) / length;
  return 1;
};

/**
 * Carga de barra plana traducida al dominio espacial.
 *
 * El eje local `y` del puente es `ẑ × x̂`, exactamente el mismo perpendicular
 * que usa el modelo plano, así que una carga local cruza sin girar. Una carga
 * global `(fx, fy)` se convierte en `(fx, fy, 0)`. Devuelve `null` si el tipo
 * no tiene equivalente espacial.
 */
const planarMemberLoad = (load: MemberLoad, start: NodeModel, end: NodeModel): Space3DMemberLoad | null => {
  const axes = load.coordinateSystem === 'local' ? 'local' : 'global';
  const common = { id: load.id, caseId: load.caseId, memberId: load.memberId, axes } as const;
  if (load.type === 'distributed') {
    const scale = lengthBasisScale(load.lengthBasis, start, end);
    const span = Math.max(0, Math.min(1, load.end)) - Math.max(0, Math.min(1, load.start));
    if (span <= 0) return null;
    return {
      ...common,
      kind: 'distributed',
      start: Math.max(0, Math.min(1, load.start)),
      end: Math.max(0, Math.min(1, load.end)),
      startValue: [(load.qxStart ?? 0) * scale, (load.qyStart ?? 0) * scale, 0],
      endValue: [(load.qxEnd ?? 0) * scale, (load.qyEnd ?? 0) * scale, 0],
    };
  }
  const position = Math.max(0, Math.min(1, load.position ?? load.start ?? 0));
  if (load.type === 'point') {
    return {
      ...common,
      kind: 'force',
      start: position,
      end: position,
      startValue: [load.px ?? 0, load.py ?? 0, 0],
      endValue: [0, 0, 0],
    };
  }
  return {
    ...common,
    kind: 'moment',
    start: position,
    end: position,
    // El momento plano gira alrededor de `z`, el mismo eje en los dos dominios.
    startValue: [0, 0, load.moment ?? 0],
    endValue: [0, 0, 0],
  };
};

export const deriveSpace3DFromPlanarProject = (source: ProjectModel): Space3DBridgeResult => {
  const notes: Space3DBridgeNote[] = [];
  const note = (
    code: Space3DBridgeCode,
    entityKind: Space3DEntityKind,
    entityId: string,
    field: string,
    blocking = true,
  ) => { notes.push({ code, entityKind, entityId, field, blocking }); };

  const nodes: Space3DNode[] = source.nodes.map((node) => {
    const support = node.support;
    const spring = support.spring;
    const springs: Space3DSpringStiffness = {
      ...noSpace3DSprings(),
      ux: positive(spring?.kx) ? spring!.kx! : 0,
      uy: positive(spring?.ky) ? spring!.ky! : 0,
      rz: positive(spring?.kr) ? spring!.kr! : 0,
    };
    if (springs.ux > 0 || springs.uy > 0 || springs.rz > 0) {
      note('carried-support-spring', 'node', node.id, 'support.spring', false);
    }
    // Un muelle normal a un apoyo inclinado no tiene eje global al que ir: ése
    // sí se pierde y sigue siendo bloqueante.
    if (positive(spring?.kNormal)) note('dropped-support-spring', 'node', node.id, 'support.spring.kNormal');
    if (typeof support.angleDeg === 'number' && support.angleDeg % 180 !== 0 && support.type !== 'none') {
      note('dropped-inclined-support', 'node', node.id, 'support.angleDeg');
    }
    if (support.prescribed && Object.values(support.prescribed).some((value) => typeof value === 'number' && value !== 0)) {
      note('dropped-prescribed-support-motion', 'node', node.id, 'support.prescribed');
    }
    if (node.internalHinge) note('dropped-internal-hinge', 'node', node.id, 'internalHinge');

    return { id: node.id, x: node.x, y: node.y, z: 0, restraints: restraintsOf(node), springs };
  });

  const nodeById = new Map(source.nodes.map((node) => [node.id, node]));

  const members: Space3DFrameMember[] = source.members.map((member: MemberModel) => {
    if (member.type === 'truss') note('truss-member-as-frame', 'member', member.id, 'type');
    const releases = planarReleases(member);
    if (releases) note('carried-member-release', 'member', member.id, 'releases', false);
    if (typeof member.rotationalSpringI === 'number' || typeof member.rotationalSpringJ === 'number') {
      note('dropped-semi-rigid-connection', 'member', member.id, 'rotationalSpring');
    }
    if (positive(member.rigidOffsetI) || positive(member.rigidOffsetJ)) {
      note('dropped-rigid-offset', 'member', member.id, 'rigidOffset');
    }

    // `G` sólo existe en modelos planos con teoría de Timoshenko. Sin ese dato
    // no hay forma autoritativa de deducirlo: haría falta el coeficiente de
    // Poisson, que el modelo 2D no guarda.
    const G = positive(member.G) ? member.G : 0;
    if (G === 0) note('pending-shear-modulus', 'member', member.id, 'G');
    note('pending-weak-axis-inertia', 'member', member.id, 'Iy');
    note('pending-torsion-constant', 'member', member.id, 'J');

    const start = nodeById.get(member.i);
    const end = nodeById.get(member.j);

    return {
      id: member.id,
      i: member.i,
      j: member.j,
      E: member.E,
      G,
      A: member.A,
      Iy: 0,
      Iz: member.I,
      J: 0,
      // El área de cortante plana gobierna la misma flexión que `Iz`, así que
      // cruza como `shearAreaY`. La del eje débil no existe en el plano.
      shearAreaY: member.beamTheory === 'timoshenko' && positive(member.shearArea) ? member.shearArea : 0,
      shearAreaZ: 0,
      density: positive(member.density) ? member.density : 0,
      releases: releases ?? noSpace3DReleases(),
      orientation: {
        localYReferenceGlobal: start && end ? planarLocalYReference(start, end) : [0, 1, 0],
        rollRadians: 0,
      },
    };
  });

  if (nodes.length > 0) note('out-of-plane-unrestrained', 'project', '', 'restraints');

  const memberById = new Map(source.members.map((member) => [member.id, member]));
  const memberLoads: Space3DMemberLoad[] = [];
  for (const load of source.memberLoads) {
    const owner = memberById.get(load.memberId);
    const start = owner ? nodeById.get(owner.i) : undefined;
    const end = owner ? nodeById.get(owner.j) : undefined;
    const translated = owner && start && end ? planarMemberLoad(load, start, end) : null;
    if (!translated) {
      note('dropped-member-load', 'member-load', load.id, 'memberLoads');
      continue;
    }
    memberLoads.push(translated);
    note('carried-member-load', 'member-load', load.id, 'memberLoads', false);
  }

  const settlements: Space3DSupportSettlement[] = [];
  for (const item of source.prescribedDisplacements ?? []) {
    if (item.component === 'normal' || !nodeById.has(item.nodeId)) {
      note('dropped-prescribed-displacement', 'settlement', item.id, 'prescribedDisplacements');
      continue;
    }
    settlements.push({
      id: item.id,
      caseId: item.caseId,
      nodeId: item.nodeId,
      ux: item.component === 'ux' ? item.value : 0,
      uy: item.component === 'uy' ? item.value : 0,
      uz: 0,
      rx: 0,
      ry: 0,
      rz: item.component === 'rz' ? item.value : 0,
    });
    note('carried-prescribed-displacement', 'settlement', item.id, 'prescribedDisplacements', false);
  }

  for (const item of source.memberInitialEffects ?? []) note('dropped-initial-effect', 'load', item.id, 'memberInitialEffects');

  const nodalLoads: Space3DNodalLoad[] = source.nodalLoads
    .filter((load) => nodeById.has(load.nodeId))
    .map((load) => ({
      id: load.id,
      caseId: load.caseId,
      nodeId: load.nodeId,
      fx: load.fx,
      fy: load.fy,
      fz: 0,
      mx: 0,
      my: 0,
      // El momento plano gira alrededor del eje global Z, el mismo `mz` espacial.
      mz: load.mz,
    }));

  const loadCases = source.loadCases.map((item) => {
    const selfWeightFactor = typeof item.selfWeightFactor === 'number' && Number.isFinite(item.selfWeightFactor)
      ? item.selfWeightFactor
      : 0;
    if (selfWeightFactor !== 0) note('carried-self-weight', 'case', item.id, 'selfWeightFactor', false);
    return { id: item.id, name: item.name, selfWeightFactor };
  });
  const caseIds = new Set(loadCases.map((item) => item.id));
  const loadCombinations: Space3DLoadCombination[] = source.combinations.map((combination) => ({
    id: combination.id,
    name: combination.name,
    terms: Object.entries(combination.factors)
      .filter(([caseId]) => caseIds.has(caseId))
      .map(([caseId, factor]) => ({ caseId, factor })),
  }));

  const project: Space3DProject = {
    analysisSpace: SPACE3D_ANALYSIS_SPACE,
    schemaVersion: SPACE3D_SCHEMA_VERSION,
    id: derivedSpace3DId(source.id),
    name: source.name,
    units: source.settings.units,
    nodes,
    members,
    nodalLoads,
    memberLoads,
    settlements,
    loadCases,
    loadCombinations,
  };

  return { project, notes };
};

/**
 * Notas todavía sin resolver contra el estado actual del proyecto espacial.
 *
 * Las de propiedad se resuelven solas en cuanto el valor deja de ser cero; la
 * de restricción fuera del plano, cuando algún nudo restringe `uz`, `rx` o `ry`.
 * Las demás describen una diferencia de comportamiento que ningún número
 * cancela, así que se resuelven por reconocimiento explícito del usuario.
 */
export const unresolvedSpace3DBridgeNotes = (
  notes: readonly Space3DBridgeNote[],
  project: Space3DProject,
  acknowledged: ReadonlySet<string>,
): readonly Space3DBridgeNote[] => notes.filter((item) => {
  if (!item.blocking) return false;

  const property = PROPERTY_NOTES[item.code];
  if (property) {
    const member = project.members.find((candidate) => candidate.id === item.entityId);
    // Un miembro que ya no existe no deja nada pendiente.
    return member ? !positive(member[property]) : false;
  }

  if (item.code === 'out-of-plane-unrestrained') {
    if (project.nodes.length === 0) return false;
    return !project.nodes.some((node) => node.restraints.uz || node.restraints.rx || node.restraints.ry);
  }

  return !acknowledged.has(item.code);
});

const sameVector = (a: Space3DVector, b: Space3DVector): boolean =>
  a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

/**
 * ¿Sigue este proyecto espacial derivando del proyecto plano indicado?
 *
 * Comprueba en una sola dirección: que **todo lo que el 2D afirma** siga ahí y
 * con el mismo valor. Lo que el usuario haya añadido o completado en 3D es suyo
 * y no cuenta — incluir sus nudos nuevos en la comparación declararía «el 2D
 * cambió» por el simple hecho de haber trabajado, que es justo el aviso que no
 * debe salir.
 *
 * Desde S3D-2 el puente traslada cargas de barra, liberaciones, muelles,
 * asientos y peso propio, así que la comparación tiene que cubrirlos: mirar
 * sólo la geometría dejaba reabrir el modelo espacial con las cargas viejas
 * después de editarlas en 2D, sin un solo aviso.
 *
 * La regla es «afirmaciones positivas»: un muelle, una densidad, una liberación
 * o un peso propio que el 2D declara tienen que seguir declarados; lo que el 2D
 * deja en cero o en falso el usuario puede ponerlo en 3D sin que cuente como
 * divergencia.
 */
export const space3dMatchesPlanarSource = (project: Space3DProject, source: ProjectModel): boolean => {
  if (project.id !== derivedSpace3DId(source.id)) return false;

  const expected = deriveSpace3DFromPlanarProject(source).project;

  const nodeById = new Map(project.nodes.map((node) => [node.id, node]));
  for (const node of expected.nodes) {
    const twin = nodeById.get(node.id);
    if (!twin || twin.x !== node.x || twin.y !== node.y) return false;
    for (const dof of SPACE3D_DOF_KEYS) {
      if (node.springs[dof] > 0 && twin.springs[dof] !== node.springs[dof]) return false;
    }
  }

  const memberById = new Map(project.members.map((member) => [member.id, member]));
  for (const member of expected.members) {
    const twin = memberById.get(member.id);
    if (!twin || twin.i !== member.i || twin.j !== member.j) return false;
    // `E`, `A` e `Iz` los aporta el plano enteros; `Iy`, `J` y `G` los completa
    // el usuario en 3D y por eso no se comparan.
    if (twin.E !== member.E || twin.A !== member.A || twin.Iz !== member.Iz) return false;
    if (member.density > 0 && twin.density !== member.density) return false;
    if (member.shearAreaY > 0 && twin.shearAreaY !== member.shearAreaY) return false;
    for (const key of SPACE3D_RELEASE_KEYS) {
      if (member.releases[key] && !twin.releases[key]) return false;
    }
  }

  const memberLoadById = new Map(project.memberLoads.map((load) => [load.id, load]));
  for (const load of expected.memberLoads) {
    const twin = memberLoadById.get(load.id);
    if (!twin) return false;
    if (twin.memberId !== load.memberId || twin.caseId !== load.caseId) return false;
    if (twin.kind !== load.kind || twin.axes !== load.axes) return false;
    if (twin.start !== load.start || twin.end !== load.end) return false;
    if (!sameVector(twin.startValue, load.startValue) || !sameVector(twin.endValue, load.endValue)) return false;
  }

  const settlementById = new Map(project.settlements.map((item) => [item.id, item]));
  for (const item of expected.settlements) {
    const twin = settlementById.get(item.id);
    if (!twin || twin.nodeId !== item.nodeId || twin.caseId !== item.caseId) return false;
    if (SPACE3D_DOF_KEYS.some((dof) => twin[dof] !== item[dof])) return false;
  }

  const caseById = new Map(project.loadCases.map((item) => [item.id, item]));
  for (const item of expected.loadCases) {
    const twin = caseById.get(item.id);
    if (!twin) return false;
    if (item.selfWeightFactor !== 0 && twin.selfWeightFactor !== item.selfWeightFactor) return false;
  }

  return true;
};
