import { describe, expect, it } from 'vitest';
import type { MemberModel, ProjectModel } from '../types';
import { analyzeProjectWithActiveSet, conditionalMembers } from './activeSet';
import { analyzeProjectAuto } from './pDelta';
import { analyzeProject } from './solver';

const frame = (behavior?: MemberModel['axialBehavior']): ProjectModel => ({
  schemaVersion: 1, id: 'conditional', name: 'conditional',
  nodes: [
    { id: 'A', x: 0, y: 0, support: { type: 'pin' } }, { id: 'B', x: 4, y: 0, support: { type: 'pin' } },
    { id: 'C', x: 0, y: 3, support: { type: 'none' } }, { id: 'D', x: 4, y: 3, support: { type: 'none' } },
  ],
  members: [
    { id: 'AC', i: 'A', j: 'C', type: 'frame', E: 2e8, A: 0.001, I: 1e-4 },
    { id: 'BD', i: 'B', j: 'D', type: 'frame', E: 2e8, A: 0.001, I: 1e-4 },
    { id: 'CD', i: 'C', j: 'D', type: 'frame', E: 2e8, A: 0.001, I: 1e-4 },
    { id: 'AD', i: 'A', j: 'D', type: 'truss', E: 2e8, A: 0.001, I: 0, axialBehavior: behavior },
    { id: 'BC', i: 'B', j: 'C', type: 'truss', E: 2e8, A: 0.001, I: 0, axialBehavior: behavior },
  ],
  loadCases: [{ id: 'LC1', name: 'LC1', category: 'variable', active: true }], combinations: [],
  nodalLoads: [{ id: 'H', nodeId: 'C', caseId: 'LC1', fx: 50, fy: 0, mz: 0 }], memberLoads: [],
  settings: { units: 'kN-m', language: 'es', gridSize: 1, snap: true, showGrid: true, showNodeLabels: true, showMemberLabels: false, showLocalAxes: false, showLoads: true, showDimensions: true, showResultValues: true, diagramScale: 1, deformedScale: 50, diagramSide: 'positive' },
});

const axial = (result: ReturnType<typeof analyzeProjectWithActiveSet>, id: string) => {
  const member = result.memberResults.find((candidate) => candidate.memberId === id);
  return member ? (-member.localEndForces[0] + member.localEndForces[3]) / 2 : undefined;
};

describe('barras de signo restringido', () => {
  it('no altera un modelo sin barras condicionales', () => {
    const project = frame();
    expect(analyzeProjectWithActiveSet(project).displacements).toEqual(analyzeProject(project).displacements);
    expect(conditionalMembers(project)).toEqual([]);
  });

  it('descuelga la diagonal comprimida de un arriostramiento de sólo tracción', () => {
    const result = analyzeProjectWithActiveSet(frame('tension-only'));
    expect(result.success, result.activeSet?.reason).toBe(true);
    expect(result.activeSet).toMatchObject({ converged: true, inactiveMemberIds: expect.any(Array) });
    expect(result.activeSet!.inactiveMemberIds).toHaveLength(1);
    expect(axial(result, result.activeSet!.activeMemberIds[0])!).toBeGreaterThan(0);
    expect(axial(result, result.activeSet!.inactiveMemberIds[0])).toBeUndefined();
  });

  it('informa explícitamente la combinación aún no compuesta con P-Delta', () => {
    const project = frame('tension-only');
    project.settings.analysisMode = 'p-delta';
    const result = analyzeProjectAuto(project);
    expect(result.issues.some((issue) => issue.id === 'pdelta-ignores-axial-behavior')).toBe(true);
  });
});
