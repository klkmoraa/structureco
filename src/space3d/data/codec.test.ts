import { describe, expect, it } from 'vitest';
import { parseSpace3DProject, serializeSpace3DProject } from './codec';
import { createBlankSpace3DProject, createSpace3DPortalExample } from '../model/defaultProject';
import { SPACE3D_LIMITS, SPACE3D_SCHEMA_VERSION } from '../model/types';
import { MAX_CUSTOM_UNIT_SYSTEMS } from '../../engine/unitSystems';

const project = createSpace3DPortalExample();

describe('Space3D portable codec', () => {
  it('hace round-trip exacto del ejemplo y del proyecto vacío', () => {
    expect(parseSpace3DProject(serializeSpace3DProject(project))).toEqual(project);
    const blank = createBlankSpace3DProject();
    expect(parseSpace3DProject(serializeSpace3DProject(blank))).toEqual(blank);
  });

  it('emite JSON estable y legible', () => {
    expect(serializeSpace3DProject(project)).toBe(serializeSpace3DProject(project));
    expect(serializeSpace3DProject(project)).toContain('"analysisSpace": "space-3d"');
  });

  it('rechaza campos desconocidos en cualquier nivel', () => {
    expect(() => parseSpace3DProject(JSON.stringify({ ...project, surprise: true }))).toThrow(/unknown-field/);
    expect(() => parseSpace3DProject(JSON.stringify({
      ...project, nodes: [{ ...project.nodes[0], extra: 1 }, ...project.nodes.slice(1)],
    }))).toThrow(/unknown-field/);
    expect(() => parseSpace3DProject(JSON.stringify({
      ...project,
      members: [{ ...project.members[0], orientation: { ...project.members[0].orientation, twist: 2 } }, ...project.members.slice(1)],
    }))).toThrow(/unknown-field/);
  });

  it('rechaza una versión de esquema desconocida', () => {
    expect(() => parseSpace3DProject(JSON.stringify({ ...project, schemaVersion: 99 }))).toThrow(/schema-version/);
    expect(() => parseSpace3DProject(JSON.stringify({ ...project, schemaVersion: 0 }))).toThrow(/schema-version/);
  });

  it('migra un archivo S3D-1 completando las capacidades nuevas con su neutro', () => {
    const legacy = {
      analysisSpace: 'space-3d',
      schemaVersion: 1,
      id: 'legacy',
      name: 'Legacy',
      units: 'kN-m',
      nodes: project.nodes.map(({ id, x, y, z, restraints }) => ({ id, x, y, z, restraints })),
      members: project.members.map(({ id, i, j, E, G, A, Iy, Iz, J, orientation }) => ({
        id, i, j, E, G, A, Iy, Iz, J, orientation,
      })),
      nodalLoads: project.nodalLoads,
      loadCases: project.loadCases.map(({ id, name }) => ({ id, name })),
      loadCombinations: project.loadCombinations,
    };

    const migrated = parseSpace3DProject(JSON.stringify(legacy));
    expect(migrated.schemaVersion).toBe(SPACE3D_SCHEMA_VERSION);
    expect(migrated.customUnitSystems).toEqual([]);
    expect(migrated.memberLoads).toEqual([]);
    expect(migrated.settlements).toEqual([]);
    expect(migrated.nodes.every((node) => node.springs.uy === 0)).toBe(true);
    expect(migrated.members.every((member) => member.density === 0 && !member.releases.iMz)).toBe(true);
    expect(migrated.loadCases.every((item) => item.selfWeightFactor === 0)).toBe(true);
  });

  it('migra S3D-2 y aplica el fallback seguro a un id propio que no podía definir', () => {
    const { customUnitSystems: _customUnitSystems, ...schema2 } = project;
    const migrated = parseSpace3DProject(JSON.stringify({
      ...schema2,
      schemaVersion: 2,
      units: 'custom:legacy-without-definition',
    }));

    expect(migrated.schemaVersion).toBe(SPACE3D_SCHEMA_VERSION);
    expect(migrated.units).toBe('kN-m');
    expect(migrated.customUnitSystems).toEqual([]);
  });

  it('hace round-trip de la definición completa de un sistema propio', () => {
    const custom = {
      ...project,
      units: 'custom:site' as const,
      customUnitSystems: [{
        id: 'custom:site' as const,
        name: 'Obra métrica',
        force: 'tonf' as const,
        length: 'm' as const,
        sectionLength: 'cm' as const,
        sectionDimension: 'mm' as const,
        modulus: 'MPa' as const,
        density: 't/m3' as const,
      }],
    };

    expect(parseSpace3DProject(serializeSpace3DProject(custom))).toEqual(custom);
  });

  it('rechaza ids propios huérfanos y más definiciones de las que puede persistir', () => {
    expect(() => parseSpace3DProject(JSON.stringify({
      ...project,
      units: 'custom:missing',
    }))).toThrow(/invalid-model/);

    const customUnitSystems = Array.from({ length: MAX_CUSTOM_UNIT_SYSTEMS + 1 }, (_, index) => ({
      id: `custom:test-${index}`,
      name: `Test ${index}`,
      force: 'kN',
      length: 'm',
      sectionLength: 'm',
      sectionDimension: 'mm',
      modulus: 'MPa',
      density: 'kg/m3',
    }));
    expect(() => parseSpace3DProject(JSON.stringify({ ...project, customUnitSystems }))).toThrow(/limit-exceeded/);
  });


  it('rechaza un archivo que no es del espacio 3D', () => {
    expect(() => parseSpace3DProject(JSON.stringify({ ...project, analysisSpace: 'plane-2d' }))).toThrow(/analysis-space/);
    const planar = { id: 'p', name: 'Plano', nodes: [], members: [], units: 'kN-m', settings: {} };
    expect(() => parseSpace3DProject(JSON.stringify(planar))).toThrow(/analysis-space/);
  });

  it('rechaza JSON malformado y valores no objeto', () => {
    expect(() => parseSpace3DProject('{')).toThrow(/malformed-json/);
    expect(() => parseSpace3DProject('[]')).toThrow(/malformed-json/);
    expect(() => parseSpace3DProject('null')).toThrow(/malformed-json/);
  });

  it('rechaza NaN e Infinity serializados como null o string', () => {
    const withNaN = JSON.parse(JSON.stringify(project));
    withNaN.nodes[0].x = Number.NaN;
    expect(() => parseSpace3DProject(JSON.stringify(withNaN))).toThrow(/not-a-number/);
    const asText = JSON.parse(JSON.stringify(project));
    asText.members[0].E = '200000000';
    expect(() => parseSpace3DProject(JSON.stringify(asText))).toThrow(/not-a-number/);
  });

  it('rechaza arrays por encima de los límites antes de construir el modelo', () => {
    const many = {
      ...project,
      nodes: Array.from({ length: SPACE3D_LIMITS.maxNodes + 1 }, (_, index) => ({ ...project.nodes[0], id: `N${index}` })),
    };
    expect(() => parseSpace3DProject(JSON.stringify(many))).toThrow(/limit-exceeded/);
  });

  it('rechaza un modelo estructuralmente inválido aunque el JSON esté bien formado', () => {
    const broken = JSON.parse(JSON.stringify(project));
    broken.members[0].j = 'missing';
    expect(() => parseSpace3DProject(JSON.stringify(broken))).toThrow(/invalid-model/);
  });

  it('no comparte referencias con la entrada', () => {
    const parsed = parseSpace3DProject(serializeSpace3DProject(project));
    expect(parsed.nodes).not.toBe(project.nodes);
    expect(parsed.members[0].orientation.localYReferenceGlobal).not.toBe(project.members[0].orientation.localYReferenceGlobal);
  });
});
