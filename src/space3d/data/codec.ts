/**
 * Códec portable estricto de Space 3D.
 *
 * Sin Zod ni Ajv: cada objeto se recorre con una allowlist exacta antes de
 * convertirse al tipo de dominio. Un campo desconocido no se ignora — se
 * rechaza. Un archivo que «casi» encaja es la forma más rápida de corromper un
 * modelo estructural sin que nadie se entere.
 *
 * `JSON.stringify` convierte `NaN` e `Infinity` en `null`, así que aceptar
 * `null` donde se espera un número equivaldría a aceptar basura numérica: el
 * lector exige `typeof value === 'number' && Number.isFinite(value)`.
 */
import { validateSpace3DProject } from '../model/validation';
import { isCustomUnitSystemId, isUnitSystemId } from '../../engine/units';
import {
  DENSITY_UNITS,
  FORCE_UNITS,
  LENGTH_UNITS,
  MAX_CUSTOM_UNIT_SYSTEMS,
  STRESS_UNITS,
} from '../../engine/unitSystems';
import type { CustomUnitSystem } from '../../types';
import {
  SPACE3D_ANALYSIS_SPACE,
  SPACE3D_LIMITS,
  SPACE3D_READABLE_SCHEMA_VERSIONS,
  SPACE3D_RELEASE_KEYS,
  SPACE3D_SCHEMA_VERSION,
  noSpace3DReleases,
  noSpace3DSprings,
  type Space3DFrameMember,
  type Space3DLoadAxes,
  type Space3DLoadCase,
  type Space3DLoadCombination,
  type Space3DMemberLoad,
  type Space3DMemberLoadKind,
  type Space3DMemberReleases,
  type Space3DNodalLoad,
  type Space3DNode,
  type Space3DProject,
  type Space3DRestraints,
  type Space3DSpringStiffness,
  type Space3DSupportSettlement,
  type Space3DVector,
} from '../model/types';

export type Space3DCodecErrorCode =
  | 'malformed-json'
  | 'not-a-choice'
  | 'analysis-space'
  | 'schema-version'
  | 'unknown-field'
  | 'missing-field'
  | 'not-a-number'
  | 'not-a-string'
  | 'not-a-boolean'
  | 'not-an-array'
  | 'not-a-vector'
  | 'limit-exceeded'
  | 'invalid-model';

export class Space3DCodecError extends Error {
  readonly code: Space3DCodecErrorCode;

  constructor(code: Space3DCodecErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = 'Space3DCodecError';
    this.code = code;
  }
}

type Raw = Record<string, unknown>;

const fail = (code: Space3DCodecErrorCode, detail: string): never => { throw new Space3DCodecError(code, detail); };

const object = (value: unknown, path: string): Raw => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail('malformed-json', path);
  return value as Raw;
};

/** Allowlist exacta: sobra un campo ⇒ se rechaza; falta uno ⇒ se rechaza. */
const exactKeys = (source: Raw, allowed: readonly string[], path: string): void => {
  for (const key of Object.keys(source)) {
    if (!allowed.includes(key)) fail('unknown-field', `${path}.${key}`);
  }
  for (const key of allowed) {
    if (!Object.hasOwn(source, key)) fail('missing-field', `${path}.${key}`);
  }
};

const num = (source: Raw, key: string, path: string): number => {
  const value = source[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) fail('not-a-number', `${path}.${key}`);
  return value as number;
};

const text = (source: Raw, key: string, path: string): string => {
  const value = source[key];
  if (typeof value !== 'string') fail('not-a-string', `${path}.${key}`);
  return value as string;
};

const flag = (source: Raw, key: string, path: string): boolean => {
  const value = source[key];
  if (typeof value !== 'boolean') fail('not-a-boolean', `${path}.${key}`);
  return value as boolean;
};

const list = (source: Raw, key: string, path: string, limit?: number): unknown[] => {
  const value = source[key];
  if (!Array.isArray(value)) fail('not-an-array', `${path}.${key}`);
  const array = value as unknown[];
  if (limit !== undefined && array.length > limit) fail('limit-exceeded', `${path}.${key} (${array.length} > ${limit})`);
  return array;
};

const vector = (value: unknown, path: string): Space3DVector => {
  if (!Array.isArray(value) || value.length !== 3) fail('not-a-vector', path);
  const array = value as unknown[];
  return array.map((component, index) => {
    if (typeof component !== 'number' || !Number.isFinite(component)) fail('not-a-number', `${path}[${index}]`);
    return component as number;
  }) as unknown as Space3DVector;
};

const readRestraints = (value: unknown, path: string): Space3DRestraints => {
  const source = object(value, path);
  exactKeys(source, ['ux', 'uy', 'uz', 'rx', 'ry', 'rz'], path);
  return {
    ux: flag(source, 'ux', path), uy: flag(source, 'uy', path), uz: flag(source, 'uz', path),
    rx: flag(source, 'rx', path), ry: flag(source, 'ry', path), rz: flag(source, 'rz', path),
  };
};

const readSprings = (value: unknown, path: string): Space3DSpringStiffness => {
  const source = object(value, path);
  exactKeys(source, ['ux', 'uy', 'uz', 'rx', 'ry', 'rz'], path);
  return {
    ux: num(source, 'ux', path), uy: num(source, 'uy', path), uz: num(source, 'uz', path),
    rx: num(source, 'rx', path), ry: num(source, 'ry', path), rz: num(source, 'rz', path),
  };
};

const readReleases = (value: unknown, path: string): Space3DMemberReleases => {
  const source = object(value, path);
  exactKeys(source, SPACE3D_RELEASE_KEYS, path);
  const releases = {} as Record<string, boolean>;
  for (const key of SPACE3D_RELEASE_KEYS) releases[key] = flag(source, key, path);
  return releases as unknown as Space3DMemberReleases;
};

const choice = <T extends string>(source: Raw, key: string, allowed: readonly T[], path: string): T => {
  const value = source[key];
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    fail('not-a-choice', `${path}.${key} «${String(value)}»`);
  }
  return value as T;
};

const CUSTOM_UNIT_SYSTEM_KEYS = [
  'id',
  'name',
  'force',
  'length',
  'sectionLength',
  'sectionDimension',
  'modulus',
  'density',
] as const;

const readCustomUnitSystem = (value: unknown, index: number): CustomUnitSystem => {
  const path = `customUnitSystems[${index}]`;
  const source = object(value, path);
  exactKeys(source, CUSTOM_UNIT_SYSTEM_KEYS, path);
  const id = text(source, 'id', path);
  const name = text(source, 'name', path);
  if (!isCustomUnitSystemId(id)) fail('not-a-choice', `${path}.id «${id}»`);
  if (name.trim() === '' || name.length > 60) fail('invalid-model', `${path}.name`);
  return {
    id: id as CustomUnitSystem['id'],
    name,
    force: choice(source, 'force', FORCE_UNITS.map((unit) => unit.id), path),
    length: choice(source, 'length', LENGTH_UNITS.map((unit) => unit.id), path),
    sectionLength: choice(source, 'sectionLength', LENGTH_UNITS.map((unit) => unit.id), path),
    sectionDimension: choice(source, 'sectionDimension', LENGTH_UNITS.map((unit) => unit.id), path),
    modulus: choice(source, 'modulus', STRESS_UNITS.map((unit) => unit.id), path),
    density: choice(source, 'density', DENSITY_UNITS.map((unit) => unit.id), path),
  };
};

const readNode = (legacy: boolean) => (value: unknown, index: number): Space3DNode => {
  const path = `nodes[${index}]`;
  const source = object(value, path);
  exactKeys(source, legacy ? ['id', 'x', 'y', 'z', 'restraints'] : ['id', 'x', 'y', 'z', 'restraints', 'springs'], path);
  return {
    id: text(source, 'id', path),
    x: num(source, 'x', path),
    y: num(source, 'y', path),
    z: num(source, 'z', path),
    restraints: readRestraints(source.restraints, `${path}.restraints`),
    springs: legacy ? noSpace3DSprings() : readSprings(source.springs, `${path}.springs`),
  };
};

const LEGACY_MEMBER_KEYS = ['id', 'i', 'j', 'E', 'G', 'A', 'Iy', 'Iz', 'J', 'orientation'] as const;
const MEMBER_KEYS = ['id', 'i', 'j', 'E', 'G', 'A', 'Iy', 'Iz', 'J', 'shearAreaY', 'shearAreaZ', 'density', 'releases', 'orientation'] as const;

const readMember = (legacy: boolean) => (value: unknown, index: number): Space3DFrameMember => {
  const path = `members[${index}]`;
  const source = object(value, path);
  exactKeys(source, legacy ? LEGACY_MEMBER_KEYS : MEMBER_KEYS, path);
  const orientationPath = `${path}.orientation`;
  const orientation = object(source.orientation, orientationPath);
  exactKeys(orientation, ['localYReferenceGlobal', 'rollRadians'], orientationPath);
  return {
    id: text(source, 'id', path),
    i: text(source, 'i', path),
    j: text(source, 'j', path),
    E: num(source, 'E', path),
    G: num(source, 'G', path),
    A: num(source, 'A', path),
    Iy: num(source, 'Iy', path),
    Iz: num(source, 'Iz', path),
    J: num(source, 'J', path),
    shearAreaY: legacy ? 0 : num(source, 'shearAreaY', path),
    shearAreaZ: legacy ? 0 : num(source, 'shearAreaZ', path),
    density: legacy ? 0 : num(source, 'density', path),
    releases: legacy ? noSpace3DReleases() : readReleases(source.releases, `${path}.releases`),
    orientation: {
      localYReferenceGlobal: vector(orientation.localYReferenceGlobal, `${orientationPath}.localYReferenceGlobal`),
      rollRadians: num(orientation, 'rollRadians', orientationPath),
    },
  };
};

const readLoad = (value: unknown, index: number): Space3DNodalLoad => {
  const path = `nodalLoads[${index}]`;
  const source = object(value, path);
  exactKeys(source, ['id', 'caseId', 'nodeId', 'fx', 'fy', 'fz', 'mx', 'my', 'mz'], path);
  return {
    id: text(source, 'id', path),
    caseId: text(source, 'caseId', path),
    nodeId: text(source, 'nodeId', path),
    fx: num(source, 'fx', path), fy: num(source, 'fy', path), fz: num(source, 'fz', path),
    mx: num(source, 'mx', path), my: num(source, 'my', path), mz: num(source, 'mz', path),
  };
};

const readCase = (legacy: boolean) => (value: unknown, index: number): Space3DLoadCase => {
  const path = `loadCases[${index}]`;
  const source = object(value, path);
  exactKeys(source, legacy ? ['id', 'name'] : ['id', 'name', 'selfWeightFactor'], path);
  return {
    id: text(source, 'id', path),
    name: text(source, 'name', path),
    selfWeightFactor: legacy ? 0 : num(source, 'selfWeightFactor', path),
  };
};

const MEMBER_LOAD_KINDS = ['distributed', 'force', 'moment'] as const;
const LOAD_AXES = ['global', 'local'] as const;

const readMemberLoad = (value: unknown, index: number): Space3DMemberLoad => {
  const path = `memberLoads[${index}]`;
  const source = object(value, path);
  exactKeys(source, ['id', 'caseId', 'memberId', 'kind', 'axes', 'start', 'end', 'startValue', 'endValue'], path);
  return {
    id: text(source, 'id', path),
    caseId: text(source, 'caseId', path),
    memberId: text(source, 'memberId', path),
    kind: choice<Space3DMemberLoadKind>(source, 'kind', MEMBER_LOAD_KINDS, path),
    axes: choice<Space3DLoadAxes>(source, 'axes', LOAD_AXES, path),
    start: num(source, 'start', path),
    end: num(source, 'end', path),
    startValue: vector(source.startValue, `${path}.startValue`),
    endValue: vector(source.endValue, `${path}.endValue`),
  };
};

const readSettlement = (value: unknown, index: number): Space3DSupportSettlement => {
  const path = `settlements[${index}]`;
  const source = object(value, path);
  exactKeys(source, ['id', 'caseId', 'nodeId', 'ux', 'uy', 'uz', 'rx', 'ry', 'rz'], path);
  return {
    id: text(source, 'id', path),
    caseId: text(source, 'caseId', path),
    nodeId: text(source, 'nodeId', path),
    ux: num(source, 'ux', path), uy: num(source, 'uy', path), uz: num(source, 'uz', path),
    rx: num(source, 'rx', path), ry: num(source, 'ry', path), rz: num(source, 'rz', path),
  };
};

const readCombination = (value: unknown, index: number): Space3DLoadCombination => {
  const path = `loadCombinations[${index}]`;
  const source = object(value, path);
  exactKeys(source, ['id', 'name', 'terms'], path);
  return {
    id: text(source, 'id', path),
    name: text(source, 'name', path),
    terms: list(source, 'terms', path).map((term, termIndex) => {
      const termPath = `${path}.terms[${termIndex}]`;
      const raw = object(term, termPath);
      exactKeys(raw, ['caseId', 'factor'], termPath);
      return { caseId: text(raw, 'caseId', termPath), factor: num(raw, 'factor', termPath) };
    }),
  };
};


export interface Space3DParseOptions {
  /**
   * Exige además un modelo estructuralmente admisible.
   *
   * Un archivo puede tener la forma correcta y aun así describir un modelo que
   * no se puede analizar — por ejemplo el derivado de un proyecto 2D, con la
   * inercia del eje débil todavía a cero. Eso es trabajo en curso legítimo: se
   * guarda y se reabre, y es el validador quien impide analizarlo. Un archivo
   * que llega de fuera sí se exige coherente.
   */
  readonly requireAdmissibleModel?: boolean;
}

export const parseSpace3DProject = (json: string, options: Space3DParseOptions = {}): Space3DProject => {
  const requireAdmissibleModel = options.requireAdmissibleModel ?? true;
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Space3DCodecError('malformed-json', 'el archivo no es JSON válido');
  }
  const source = object(raw, 'project');

  // La discriminación va primero: así un archivo 2D falla por lo que es, y no
  // por el primer campo que le falte.
  if (source.analysisSpace !== SPACE3D_ANALYSIS_SPACE) {
    fail('analysis-space', `se esperaba «${SPACE3D_ANALYSIS_SPACE}» y llegó «${String(source.analysisSpace)}»`);
  }
  if (!(SPACE3D_READABLE_SCHEMA_VERSIONS as readonly unknown[]).includes(source.schemaVersion)) {
    fail('schema-version', `se esperaba ${SPACE3D_READABLE_SCHEMA_VERSIONS.join(' o ')} y llegó ${String(source.schemaVersion)}`);
  }

  // S3D-1 completa con neutros las capacidades estructurales añadidas en S3D-2.
  // S3D-1 y S3D-2 tampoco tenían definiciones portables para unidades propias;
  // desde S3D-3 el identificador y su composición viajan siempre juntos.
  const legacy = source.schemaVersion === 1;
  const hasPortableCustomUnits = source.schemaVersion === SPACE3D_SCHEMA_VERSION;
  exactKeys(
    source,
    legacy
      ? ['analysisSpace', 'schemaVersion', 'id', 'name', 'units', 'nodes', 'members', 'nodalLoads', 'loadCases', 'loadCombinations']
      : hasPortableCustomUnits
        ? ['analysisSpace', 'schemaVersion', 'id', 'name', 'units', 'customUnitSystems', 'nodes', 'members', 'nodalLoads', 'memberLoads', 'settlements', 'loadCases', 'loadCombinations']
        : ['analysisSpace', 'schemaVersion', 'id', 'name', 'units', 'nodes', 'members', 'nodalLoads', 'memberLoads', 'settlements', 'loadCases', 'loadCombinations'],
    'project',
  );

  const parsedUnits = text(source, 'units', 'project');
  if (!isUnitSystemId(parsedUnits)) fail('not-a-string', `project.units «${parsedUnits}»`);
  const customUnitSystems = hasPortableCustomUnits
    ? list(source, 'customUnitSystems', 'project', MAX_CUSTOM_UNIT_SYSTEMS).map(readCustomUnitSystem)
    : [];
  if (new Set(customUnitSystems.map((system) => system.id)).size !== customUnitSystems.length) {
    fail('invalid-model', 'project.customUnitSystems contiene identificadores duplicados');
  }
  const hasActiveDefinition = customUnitSystems.some((system) => system.id === parsedUnits);
  if (hasPortableCustomUnits && isCustomUnitSystemId(parsedUnits) && !hasActiveDefinition) {
    fail('invalid-model', `project.units «${parsedUnits}» no tiene definición portable`);
  }
  // Los esquemas anteriores podían guardar sólo un id personalizado. Su
  // significado no se puede reconstruir; se conserva la apertura segura con el
  // mismo fallback histórico a kN·m.
  const units = !hasPortableCustomUnits && isCustomUnitSystemId(parsedUnits) ? 'kN-m' : parsedUnits;

  const project: Space3DProject = {
    analysisSpace: SPACE3D_ANALYSIS_SPACE,
    schemaVersion: SPACE3D_SCHEMA_VERSION,
    id: text(source, 'id', 'project'),
    name: text(source, 'name', 'project'),
    units: units as Space3DProject['units'],
    customUnitSystems,
    nodes: list(source, 'nodes', 'project', SPACE3D_LIMITS.maxNodes).map(readNode(legacy)),
    members: list(source, 'members', 'project', SPACE3D_LIMITS.maxMembers).map(readMember(legacy)),
    nodalLoads: list(source, 'nodalLoads', 'project').map(readLoad),
    memberLoads: legacy ? [] : list(source, 'memberLoads', 'project').map(readMemberLoad),
    settlements: legacy ? [] : list(source, 'settlements', 'project').map(readSettlement),
    loadCases: list(source, 'loadCases', 'project').map(readCase(legacy)),
    loadCombinations: list(source, 'loadCombinations', 'project').map(readCombination),
  };

  if (requireAdmissibleModel) {
    const issues = validateSpace3DProject(project);
    if (issues.length > 0) {
      const detail = issues.slice(0, 3).map((item) => `${item.entityKind}:${item.entityId}:${item.code}`).join(', ');
      fail('invalid-model', `${issues.length} problema(s): ${detail}`);
    }
  }

  return project;
};

/** Lectura de trabajo en curso: forma estricta, admisibilidad no exigida. */
export const parseSpace3DDraft = (json: string): Space3DProject =>
  parseSpace3DProject(json, { requireAdmissibleModel: false });

export const serializeSpace3DProject = (project: Space3DProject): string => JSON.stringify({
  analysisSpace: project.analysisSpace,
  schemaVersion: project.schemaVersion,
  id: project.id,
  name: project.name,
  units: project.units,
  customUnitSystems: project.customUnitSystems.map((system) => ({
    id: system.id,
    name: system.name,
    force: system.force,
    length: system.length,
    sectionLength: system.sectionLength,
    sectionDimension: system.sectionDimension,
    modulus: system.modulus,
    density: system.density,
  })),
  nodes: project.nodes.map((node) => ({
    id: node.id, x: node.x, y: node.y, z: node.z,
    restraints: {
      ux: node.restraints.ux, uy: node.restraints.uy, uz: node.restraints.uz,
      rx: node.restraints.rx, ry: node.restraints.ry, rz: node.restraints.rz,
    },
    springs: {
      ux: node.springs.ux, uy: node.springs.uy, uz: node.springs.uz,
      rx: node.springs.rx, ry: node.springs.ry, rz: node.springs.rz,
    },
  })),
  members: project.members.map((member) => ({
    id: member.id, i: member.i, j: member.j,
    E: member.E, G: member.G, A: member.A, Iy: member.Iy, Iz: member.Iz, J: member.J,
    shearAreaY: member.shearAreaY, shearAreaZ: member.shearAreaZ, density: member.density,
    releases: Object.fromEntries(SPACE3D_RELEASE_KEYS.map((key) => [key, member.releases[key]])),
    orientation: {
      localYReferenceGlobal: [...member.orientation.localYReferenceGlobal],
      rollRadians: member.orientation.rollRadians,
    },
  })),
  nodalLoads: project.nodalLoads.map((load) => ({
    id: load.id, caseId: load.caseId, nodeId: load.nodeId,
    fx: load.fx, fy: load.fy, fz: load.fz, mx: load.mx, my: load.my, mz: load.mz,
  })),
  memberLoads: project.memberLoads.map((load) => ({
    id: load.id, caseId: load.caseId, memberId: load.memberId,
    kind: load.kind, axes: load.axes, start: load.start, end: load.end,
    startValue: [...load.startValue], endValue: [...load.endValue],
  })),
  settlements: project.settlements.map((item) => ({
    id: item.id, caseId: item.caseId, nodeId: item.nodeId,
    ux: item.ux, uy: item.uy, uz: item.uz, rx: item.rx, ry: item.ry, rz: item.rz,
  })),
  loadCases: project.loadCases.map((item) => ({ id: item.id, name: item.name, selfWeightFactor: item.selfWeightFactor })),
  loadCombinations: project.loadCombinations.map((item) => ({
    id: item.id, name: item.name,
    terms: item.terms.map((term) => ({ caseId: term.caseId, factor: term.factor })),
  })),
}, null, 2);
