import { describe, expect, it } from 'vitest';
import { createDefaultSettings } from '../data/defaultProject';
import type { ProjectModel } from '../types';
import { analyzeProjectWithActiveSet } from './activeSet';
import { axleTrainFromMovingLoadCase, resolveGeneratedLoads } from './generatedLoads';
import { analyzeModal } from './modal';
import { condenseConnections, frameLocalStiffness, analyzeProject } from './solver';

const close = (actual: number, expected: number, tolerance = 1e-8) =>
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance * Math.max(1, Math.abs(actual), Math.abs(expected)));

const base = (): ProjectModel => ({
  schemaVersion: 7,
  id: 'advanced-capabilities',
  name: 'advanced capabilities',
  nodes: [], members: [],
  loadCases: [{ id: 'LC1', name: 'Caso', category: 'variable', active: true }],
  combinations: [], nodalLoads: [], memberLoads: [], memberInitialEffects: [],
  nodeLinks: [], multiPointConstraints: [], nodalMasses: [], generatedLoadSources: [], movingLoadCases: [],
  settings: createDefaultSettings(),
});

describe('capacidades avanzadas persistentes', () => {
  it('convierte superficie tributaria, patrón, cadena, presión y pretensado en acciones auditables', () => {
    const project = base();
    project.nodes = [{ id: 'A', x: 0, y: 0, support: { type: 'pin' } }, { id: 'B', x: 4, y: 0, support: { type: 'roller', angleDeg: 90 } }];
    project.members = [{ id: 'AB', i: 'A', j: 'B', type: 'frame', E: 200e6, A: 0.02, I: 8e-5 }];
    project.generatedLoadSources = [
      { id: 'T', kind: 'tributary-surface', caseId: 'LC1', memberIds: ['AB'], pressure: -5, tributaryWidth: 2, direction: 'global-y' },
      { id: 'P', kind: 'prestress', caseId: 'LC1', memberIds: ['AB'], force: -400, eccentricity: 0.1 },
      { id: 'H', kind: 'hydrostatic', caseId: 'LC1', memberIds: ['AB'], referenceY: 2, unitWeight: 10, direction: 'global-x' },
      { id: 'L', kind: 'live-pattern', caseId: 'LC1', memberIds: ['AB'], qy: -3, pattern: 'alternating-odd' },
      { id: 'C', kind: 'member-chain', caseId: 'LC1', memberIds: ['AB'], qy: -2 },
    ];
    const resolved = resolveGeneratedLoads(project);
    expect(resolved.memberLoads).toHaveLength(4);
    expect(resolved.memberInitialEffects).toHaveLength(1);
    close(resolved.memberLoads.find((load) => load.id === 'generated:T:AB')?.qyStart ?? 0, -10);
    close(resolved.memberInitialEffects[0].axialStrain ?? 0, -400 / (200e6 * 0.02));
    close(resolved.memberInitialEffects[0].curvature ?? 0, -400 * 0.1 / (200e6 * 8e-5));
  });

  it('incluye la superficie tributaria generada en el cálculo estático', () => {
    const project = base();
    project.nodes = [{ id: 'A', x: 0, y: 0, support: { type: 'pin' } }, { id: 'B', x: 4, y: 0, support: { type: 'roller', angleDeg: 90 } }];
    project.members = [{ id: 'AB', i: 'A', j: 'B', type: 'frame', E: 200e6, A: 0.02, I: 8e-5, releases: { iMoment: true, jMoment: true } }];
    project.generatedLoadSources = [{ id: 'T', kind: 'tributary-surface', caseId: 'LC1', memberIds: ['AB'], pressure: -5, tributaryWidth: 2, direction: 'global-y' }];
    const result = analyzeProject(project);
    expect(result.success).toBe(true);
    close(result.nodeResults[0].ry, 20);
    close(result.nodeResults[1].ry, 20);
  });

  it('integra una fundación elástica distribuida en la rigidez del miembro', () => {
    const project = base();
    project.nodes = [{ id: 'A', x: 0, y: 0, support: { type: 'fixed' } }, { id: 'B', x: 3, y: 0, support: { type: 'none' } }];
    project.members = [{ id: 'AB', i: 'A', j: 'B', type: 'frame', E: 200e6, A: 0.02, I: 8e-5 }];
    project.nodalLoads = [{ id: 'P', nodeId: 'B', caseId: 'LC1', fx: 0, fy: -20, mz: 0 }];
    const bare = analyzeProject(project);
    project.generatedLoadSources = [{ id: 'W', kind: 'elastic-foundation', memberIds: ['AB'], stiffness: 100_000, direction: 'global-y' }];
    const founded = analyzeProject(project);
    expect(bare.success).toBe(true);
    expect(founded.success).toBe(true);
    expect(Math.abs(founded.nodeResults[1].uy)).toBeLessThan(Math.abs(bare.nodeResults[1].uy));
  });

  it('estabiliza contacto, tope y fricción por conjunto activo', () => {
    const model = (link: NonNullable<ProjectModel['nodeLinks']>[number], force: number) => {
      const project = base();
      project.nodes = [{ id: 'A', x: 0, y: 0, support: { type: 'fixed' } }, { id: 'B', x: 1, y: 0, support: { type: 'none' } }];
      project.members = [{ id: 'AB', i: 'A', j: 'B', type: 'frame', E: 1_000, A: 1, I: 1 }];
      project.nodalLoads = [{ id: 'F', nodeId: 'B', caseId: 'LC1', fx: force, fy: 0, mz: 0 }];
      project.nodeLinks = [link];
      return analyzeProjectWithActiveSet(project);
    };
    const contact = model({ id: 'contact', nodeI: 'B', behavior: 'compression-only', stiffness: 1_000, angleDeg: 0 }, -100);
    expect(contact.success).toBe(true);
    expect(contact.activeSet?.activeLinkIds).toContain('contact');
    close(contact.nodeResults[1].ux, -0.05);
    const stop = model({ id: 'stop', nodeI: 'B', behavior: 'stop', stiffness: 1_000, clearance: 0.02, angleDeg: 0 }, 100);
    expect(stop.success).toBe(true);
    expect(stop.activeSet?.activeLinkIds).toContain('stop');
    close(stop.nodeResults[1].ux, 0.06);
    const friction = model({ id: 'friction', nodeI: 'B', behavior: 'friction', stiffness: 1_000, slipForce: 20, angleDeg: 0 }, 200);
    expect(friction.success).toBe(true);
    expect(friction.nodeResults[1].ux).toBeGreaterThan(0.17);
    expect(friction.nodeResults[1].ux).toBeLessThan(0.19);
  });

  it('aplica una ecuación multipunto y admite liberaciones locales completas', () => {
    const project = base();
    project.nodes = [
      { id: 'A', x: 0, y: 0, support: { type: 'fixed' } }, { id: 'B', x: 0, y: 2, support: { type: 'none' } },
      { id: 'C', x: 3, y: 0, support: { type: 'fixed' } }, { id: 'D', x: 3, y: 2, support: { type: 'none' } },
    ];
    project.members = [
      { id: 'AB', i: 'A', j: 'B', type: 'frame', E: 200e6, A: 0.02, I: 8e-5 },
      { id: 'CD', i: 'C', j: 'D', type: 'frame', E: 200e6, A: 0.02, I: 8e-5 },
    ];
    project.nodalLoads = [{ id: 'F', nodeId: 'B', caseId: 'LC1', fx: 20, fy: 0, mz: 0 }];
    project.multiPointConstraints = [{ id: 'MPC', terms: [{ nodeId: 'B', component: 'ux', coefficient: 1 }, { nodeId: 'D', component: 'ux', coefficient: -1 }], value: 0 }];
    const result = analyzeProject(project);
    expect(result.success).toBe(true);
    close(result.nodeResults.find((node) => node.nodeId === 'B')!.ux, result.nodeResults.find((node) => node.nodeId === 'D')!.ux);
    const member = { id: 'R', i: 'A', j: 'B', type: 'frame' as const, E: 200e6, A: 0.02, I: 8e-5, releases: { iAxial: true, iShear: true, iMoment: true } };
    expect(condenseConnections(frameLocalStiffness(member, 2), Array(6).fill(0), member, true, false).released).toEqual([0, 1, 2]);
  });

  it('integra masa nodal adicional y conserva una carga móvil reutilizable', () => {
    const project = base();
    project.nodes = [{ id: 'A', x: 0, y: 0, support: { type: 'fixed' } }, { id: 'B', x: 3, y: 0, support: { type: 'none' } }];
    project.members = [{ id: 'AB', i: 'A', j: 'B', type: 'frame', E: 200e6, A: 0.02, I: 8e-5 }];
    project.nodalMasses = [{ id: 'NM1', nodeId: 'B', mass: 1_000, rotationalInertia: 1_000 }];
    const modal = analyzeModal(project, { modes: 1 });
    expect(modal.success).toBe(true);
    close(modal.totalMass, 1);
    const train = axleTrainFromMovingLoadCase({ id: 'MOV1', name: 'Camión', memberIds: ['AB'], targetMemberId: 'AB', targetPosition: 0.5, quantity: 'M', impactFactor: 1.2, axles: [{ id: 'E1', P: 80, offset: 0 }] });
    expect(train).toEqual({ impactFactor: 1.2, axles: [{ id: 'E1', P: 80, offset: 0 }] });
  });
});
