import { describe, expect, it } from 'vitest';
import { buildSpace3DSceneModel } from './sceneModel';
import { analyzeSpace3DProject } from '../engine/solver';
import { createBlankSpace3DProject, createSpace3DPortalExample } from '../model/defaultProject';
import { bendingCantilever, freeFloatingMember } from '../engine/fixtures';

const project = createSpace3DPortalExample();
const analysis = analyzeSpace3DProject(project, 'LC1');

const build = (overrides: Partial<Parameters<typeof buildSpace3DSceneModel>[0]> = {}) =>
  buildSpace3DSceneModel({
    project,
    analysis: null,
    analysisState: 'idle',
    selection: null,
    targetId: 'LC1',
    ...overrides,
  });

describe('Space3D scene model', () => {
  it('coloca cada nudo en su XYZ exacto sin proyectar a un plano', () => {
    const scene = build();
    expect(scene.nodes.map((node) => node.position)).toEqual([
      [0, 0, 0], [5, 0, 0], [0, 0, 4], [2.5, 3.2, 2],
    ]);
    expect(new Set(scene.nodes.map((node) => node.position[2])).size).toBeGreaterThan(1);
  });

  it('resuelve los extremos de cada miembro y su triada local', () => {
    const scene = build();
    expect(scene.members).toHaveLength(3);
    expect(scene.members[0]).toMatchObject({ id: 'M1', nodeI: 'N1', nodeJ: 'N4' });
    expect(scene.members[0].start).toEqual([0, 0, 0]);
    expect(scene.members[0].end).toEqual([2.5, 3.2, 2]);
    const axis = scene.members[0].basis!;
    expect(Math.hypot(...axis.x)).toBeCloseTo(1, 12);
    expect(axis.x[0] * axis.y[0] + axis.x[1] * axis.y[1] + axis.x[2] * axis.y[2]).toBeCloseTo(0, 12);
  });

  it('describe los apoyos por grados de libertad restringidos', () => {
    const scene = build();
    const supports = scene.supports;
    expect(supports.map((support) => support.nodeId)).toEqual(['N1', 'N2', 'N3']);
    expect(supports[0].translations).toEqual([true, true, true]);
    expect(supports[0].rotations).toEqual([true, true, true]);
    expect(supports[0].fullyFixed).toBe(true);
  });

  it('construye vectores de carga unitarios con magnitud y tipo', () => {
    const scene = build();
    const load = scene.loads.find((item) => item.nodeId === 'N4')!;
    expect(load.kind).toBe('force');
    expect(load.nodeId).toBe('N4');
    expect(load.magnitude).toBeCloseTo(Math.hypot(40, 15), 12);
    expect(Math.hypot(...load.direction)).toBeCloseTo(1, 12);
    expect(load.direction[1]).toBeLessThan(0);
    expect(load.origin).toEqual([2.5, 3.2, 2]);
  });

  it('separa fuerzas de momentos y respeta el objetivo de carga activo', () => {
    const withMoment = {
      ...project,
      loadCases: [...project.loadCases, { id: 'LC2', name: 'LC2', selfWeightFactor: 0 }],
      nodalLoads: [
        ...project.nodalLoads,
        { id: 'L2', caseId: 'LC2', nodeId: 'N4', fx: 0, fy: 0, fz: 0, mx: 12, my: 0, mz: 0 },
      ],
    };
    // La carga de barra y el peso propio del ejemplo también pertenecen a LC1:
    // el objetivo activo decide qué se dibuja, y LC2 sólo trae su momento nodal.
    const active = new Set(build({ project: withMoment }).loads.map((load) => load.id));
    expect(active).toContain('L1');
    expect(active).toContain('ML1');
    expect([...active].some((id) => id.endsWith(':self-weight'))).toBe(true);
    const other = build({ project: withMoment, targetId: 'LC2' });
    expect(other.loads.map((load) => load.id)).toEqual(['L2']);
    expect(other.loads[0].kind).toBe('moment');
  });

  it('dibuja una repartida como una serie de flechas sobre su barra', () => {
    const scene = build();
    const line = scene.loads.filter((item) => item.kind === 'line' && item.id === 'ML1');
    expect(line.length).toBeGreaterThan(1);
    expect(new Set(line.map((item) => item.memberId))).toEqual(new Set(['M1']));
    expect(line.every((item) => item.nodeId === null)).toBe(true);
    // Uniforme y global `-Y`: todas las flechas apuntan igual y a lo largo del vano.
    expect(line.every((item) => item.direction[1] < 0)).toBe(true);
    expect(new Set(line.map((item) => item.origin.join(','))).size).toBe(line.length);
  });

  it('dibuja el peso propio, que ninguna carga explícita representa', () => {
    // Una barra que sólo carga su peso aportaba fuerzas y reacciones sin una
    // sola flecha en la escena: no había forma de comprobar visualmente qué
    // estaba actuando.
    const weight = build().loads.filter((item) => item.id.endsWith(':self-weight'));
    expect(new Set(weight.map((item) => item.memberId))).toEqual(new Set(['M1', 'M2', 'M3']));
    expect(weight.every((item) => item.direction[1] < 0 && item.nodeId === null)).toBe(true);

    const project = createSpace3DPortalExample();
    const withoutWeight = build({
      project: { ...project, loadCases: project.loadCases.map((item) => ({ ...item, selfWeightFactor: 0 })) },
    });
    expect(withoutWeight.loads.some((item) => item.id.endsWith(':self-weight'))).toBe(false);
  });

  it('dibuja como apoyo un nudo sostenido sólo por muelles', () => {
    const project = createSpace3DPortalExample();
    const sprung = build({
      project: {
        ...project,
        nodes: project.nodes.map((node) => (node.id === 'N4'
          ? { ...node, springs: { ...node.springs, uy: 350 } }
          : node)),
      },
    });
    const support = sprung.supports.find((item) => item.nodeId === 'N4');
    expect(support).toBeDefined();
    expect(support!.elastic).toBe(true);
    expect(support!.translations[1]).toBe(true);
    // Un muelle sobre un grado ya restringido es inerte y no cambia el dibujo.
    expect(build().supports.some((item) => item.nodeId === 'N4')).toBe(false);
  });

  it('publica la deformada como p + escala·u sólo con un resultado vigente', () => {
    const scene = build({ analysis, analysisState: 'ready' });
    expect(scene.deformed).not.toBeNull();
    const scale = scene.deformed!.scale;
    expect(scale).toBeGreaterThan(0);
    const free = analysis.nodeResults.find((item) => item.nodeId === 'N4')!;
    const source = project.nodes.find((node) => node.id === 'N4')!;
    const deformed = scene.deformed!.nodes.find((item) => item.id === 'N4')!;
    expect(deformed.position[0]).toBeCloseTo(source.x + scale * free.displacement.ux, 12);
    expect(deformed.position[1]).toBeCloseTo(source.y + scale * free.displacement.uy, 12);
    expect(deformed.position[2]).toBeCloseTo(source.z + scale * free.displacement.uz, 12);
    expect(scene.deformed!.members).toHaveLength(3);
  });

  it('oculta la deformada cuando el resultado está obsoleto, ha fallado o no existe', () => {
    expect(build({ analysis, analysisState: 'stale' }).deformed).toBeNull();
    expect(build({ analysis, analysisState: 'failed' }).deformed).toBeNull();
    expect(build({ analysis: null, analysisState: 'ready' }).deformed).toBeNull();
    const mechanism = analyzeSpace3DProject(freeFloatingMember(), 'LC1');
    expect(build({ project: freeFloatingMember(), analysis: mechanism, analysisState: 'ready' }).deformed).toBeNull();
  });

  it('respeta una escala de deformada explícita', () => {
    const scene = build({ analysis, analysisState: 'ready', deformationScale: 100 });
    expect(scene.deformed!.scale).toBe(100);
  });

  it('marca la entidad seleccionada y expone su triada local', () => {
    const scene = build({ selection: { kind: 'member', id: 'M2' } });
    expect(scene.members.find((member) => member.id === 'M2')!.selected).toBe(true);
    expect(scene.members.find((member) => member.id === 'M1')!.selected).toBe(false);
    expect(scene.localAxes).not.toBeNull();
    expect(scene.localAxes!.memberId).toBe('M2');
    expect(scene.localAxes!.origin).toEqual([3.75, 1.6, 1]);

    const nodeSelection = build({ selection: { kind: 'node', id: 'N4' } });
    expect(nodeSelection.nodes.find((node) => node.id === 'N4')!.selected).toBe(true);
    expect(nodeSelection.localAxes).toBeNull();
  });

  it('calcula límites 3D y un proyecto vacío utilizable', () => {
    const scene = build();
    expect(scene.bounds.min).toEqual([0, 0, 0]);
    expect(scene.bounds.max).toEqual([5, 3.2, 4]);
    expect(scene.bounds.center).toEqual([2.5, 1.6, 2]);
    expect(scene.bounds.span).toBeCloseTo(5, 12);

    const empty = build({ project: createBlankSpace3DProject() });
    expect(empty.nodes).toEqual([]);
    expect(empty.bounds.span).toBeGreaterThan(0);
    expect(empty.bounds.center).toEqual([0, 0, 0]);
    expect(empty.isEmpty).toBe(true);
  });

  it('informa la geometría que no puede dibujar en vez de omitirla en silencio', () => {
    const broken = { ...project, members: [{ ...project.members[0], j: 'ghost' }, ...project.members.slice(1)] };
    const scene = build({ project: broken });
    expect(scene.members.map((member) => member.id)).toEqual(['M2', 'M3']);
    expect(scene.diagnostics).toEqual([{ code: 'unresolved-member-endpoint', entityId: 'M1' }]);
  });

  it('no comparte estructuras mutables con el proyecto', () => {
    const scene = build({ project: bendingCantilever() });
    expect(Object.isFrozen(scene)).toBe(true);
    expect(Object.isFrozen(scene.nodes)).toBe(true);
  });
});
