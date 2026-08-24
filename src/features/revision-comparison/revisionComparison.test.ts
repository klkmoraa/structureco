import { describe, expect, it } from 'vitest';
import { analysisSignature } from '../../engine/projectSignature';
import type { AnalysisResult, ProjectModel } from '../../types';
import {
  buildRevisionComparison,
  captureRevisionSnapshot,
  revisionAnalysisState,
  type RevisionSnapshot,
} from './revisionComparison';

const project = (): ProjectModel => ({
  schemaVersion: 6,
  id: 'P-COMPARE',
  name: 'Revisión estructural',
  nodes: [
    { id: 'N1', x: 0, y: 0, support: { type: 'pin' } },
    { id: 'N2', x: 4, y: 0, support: { type: 'roller' } },
  ],
  members: [{
    id: 'M1', i: 'N1', j: 'N2', type: 'frame', E: 200_000_000, A: 0.00538, I: 0.0000836,
    density: 7850, materialId: 'steel-a992', materialOrigin: 'catalog', sectionId: 'ipe-300', sectionOrigin: 'catalog',
  }],
  loadCases: [{ id: 'LC1', name: 'Servicio', category: 'variable', active: true }],
  combinations: [{ id: 'C1', name: 'Combinación 1', factors: { LC1: 1 } }],
  nodalLoads: [{ id: 'L1', nodeId: 'N2', caseId: 'LC1', fx: 0, fy: -10, mz: 0 }],
  prescribedDisplacements: [],
  memberLoads: [],
  memberInitialEffects: [],
  settings: {
    units: 'kN-m', language: 'es', gridSize: 1, snap: true,
    showGrid: true, showNodeLabels: true, showMemberLabels: true,
    showLocalAxes: false, showLoads: true, showDimensions: true,
    showResultValues: true, diagramScale: 1, deformedScale: 1, diagramSide: 'positive',
    calculationMode: 'complete', analysisMode: 'first-order',
  },
});

const analysis = (ux: number, moment: number): AnalysisResult => ({
  success: true,
  issues: [],
  nodeResults: [
    { nodeId: 'N1', ux: 0, uy: 0, rz: 0, rx: 0, ry: 10, rm: 0 },
    { nodeId: 'N2', ux, uy: -0.002, rz: 0.001, rx: 0, ry: 0, rm: 0 },
  ],
  memberResults: [{
    memberId: 'M1', length: 4, localDisplacements: [], localEndForces: [], diagramSegments: [], diagramJumps: [],
    criticalPoints: [], diagram: [], deformation: [], deformationSegments: [], deformationCriticalPoints: [],
    maxAxial: 1, minAxial: -1, maxShear: 10, minShear: -10, maxMoment: moment, minMoment: -moment,
  }],
  displacements: [], residualNorm: 1e-12, conditionEstimate: 100,
  equilibrium: { sumFx: 0, sumFy: 0, sumM: 0, normalizedComponents: { fx: 0, fy: 0, mz: 0 }, normalizedResidual: 1e-12 },
  reliability: { completed: true, usable: true, level: 'reliable', checks: [], reasons: [] },
  explanation: [],
});

const snapshot = (source: ProjectModel, result: AnalysisResult | null, scenarioId = 'C1'): RevisionSnapshot => ({
  schemaVersion: 1,
  kind: 'structureco-revision-snapshot',
  revisionId: `test:${source.name}`,
  capturedAt: '2026-08-24T00:00:00.000Z',
  project: structuredClone(source),
  analysis: result ? {
    result: structuredClone(result),
    projectSignature: analysisSignature(source),
    resultDigest: 'test-result',
    scenarioId,
  } : null,
});

describe('revision comparison contract', () => {
  it('produces a deterministic, path-backed input diff for added, removed, and modified entities', () => {
    const before = project();
    const after = structuredClone(before);
    after.nodes = [
      { ...after.nodes[0], x: 1.25 },
      { id: 'N3', x: 8, y: 0, support: { type: 'none' } },
    ];
    after.members[0] = { ...after.members[0], E: 190_000_000 };
    after.nodalLoads[0] = { ...after.nodalLoads[0], fy: -15 };
    after.combinations.push({ id: 'C2', name: 'Combinación 2', factors: { LC1: 1.4 } });
    after.settings.units = 'kip-ft';

    const first = buildRevisionComparison(snapshot(before, null), snapshot(after, null));
    const second = buildRevisionComparison(snapshot(before, null), snapshot(after, null));

    expect(first).toEqual(second);
    expect(first.changes.map((change) => [change.domain, change.category, change.entityKind, change.entityId, change.changeType, change.field])).toEqual([
      ['input', 'geometry', 'node', 'N1', 'modified', 'x'],
      ['input', 'geometry', 'node', 'N2', 'removed', '*'],
      ['input', 'geometry', 'node', 'N3', 'added', '*'],
      ['input', 'properties', 'member', 'M1', 'modified', 'E'],
      ['input', 'loads', 'combination', 'C2', 'added', '*'],
      ['input', 'loads', 'nodalLoad', 'L1', 'modified', 'fy'],
      ['input', 'configuration', 'settings', 'project', 'modified', 'units'],
    ]);
    expect(first.changes[0]).toMatchObject({ beforePath: 'project.nodes[N1].x', afterPath: 'project.nodes[N1].x', before: 0, after: 1.25 });
    expect(first.summary.input).toEqual({ added: 2, removed: 1, modified: 4, total: 7 });
    expect(first.warnings.map((warning) => warning.code)).toContain('display-units-changed');
  });

  it('never fuzzy-matches an ID change and warns that identity continuity is unproven', () => {
    const before = project();
    const after = structuredClone(before);
    after.members = [{ ...after.members[0], id: 'M9' }];

    const comparison = buildRevisionComparison(snapshot(before, null), snapshot(after, null));
    expect(comparison.changes.filter((change) => change.entityKind === 'member').map((change) => [change.entityId, change.changeType])).toEqual([
      ['M1', 'removed'],
      ['M9', 'added'],
    ]);
    expect(comparison.warnings.map((warning) => warning.code)).toContain('identity-churn-unmatched');
  });

  it('compares fresh usable results by explicit entity ID and reports deltas as correlation, not causality', () => {
    const before = project();
    const after = structuredClone(before);
    after.nodalLoads[0] = { ...after.nodalLoads[0], fy: -20 };

    const comparison = buildRevisionComparison(snapshot(before, analysis(0.001, 10)), snapshot(after, analysis(0.002, 15)));
    expect(comparison.resultComparability).toBe('comparable');
    expect(comparison.warnings.map((warning) => warning.code)).toContain('correlation-not-causality');
    expect(comparison.changes).toContainEqual(expect.objectContaining({
      domain: 'result', entityKind: 'nodeResult', entityId: 'N2', field: 'ux', before: 0.001, after: 0.002,
      delta: 0.001, percentDelta: 100, unit: 'm',
    }));
    expect(comparison.changes).toContainEqual(expect.objectContaining({
      domain: 'result', entityKind: 'memberResult', entityId: 'M1', field: 'maxMoment', before: 10, after: 15,
      delta: 5, percentDelta: 50, unit: 'kN·m',
    }));
  });

  it('blocks historical numbers when a snapshot is stale, belongs to another project, or names another scenario', () => {
    const before = project();
    const after = structuredClone(before);
    const stale = snapshot(before, analysis(0.001, 10));
    stale.analysis!.projectSignature = 'stale-signature';
    expect(revisionAnalysisState(stale)).toBe('stale');
    expect(buildRevisionComparison(stale, snapshot(after, analysis(0.002, 15))).resultComparability).toBe('blocked');
    expect(buildRevisionComparison(stale, snapshot(after, analysis(0.002, 15))).warnings.map((item) => item.code)).toContain('base-analysis-stale');

    const otherProject = structuredClone(after);
    otherProject.id = 'P-OTHER';
    const different = buildRevisionComparison(snapshot(before, analysis(0.001, 10)), snapshot(otherProject, analysis(0.002, 15)));
    expect(different.resultComparability).toBe('blocked');
    expect(different.warnings.map((item) => item.code)).toContain('different-project-identity-unverified');

    const scenario = buildRevisionComparison(snapshot(before, analysis(0.001, 10), 'C1'), snapshot(after, analysis(0.002, 15), 'LC1'));
    expect(scenario.resultComparability).toBe('blocked');
    expect(scenario.warnings.map((item) => item.code)).toContain('analysis-scenario-mismatch');
  });

  it('captures immutable content-addressed snapshots without altering model or analysis', async () => {
    const source = project();
    const result = analysis(0.001, 10);
    const sourceBefore = JSON.stringify(source);
    const resultBefore = JSON.stringify(result);
    const first = await captureRevisionSnapshot(source, result, 'C1', '2026-08-24T01:00:00.000Z');
    const second = await captureRevisionSnapshot(structuredClone(source), structuredClone(result), 'C1', '2026-08-24T02:00:00.000Z');

    expect(first.revisionId).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(first.revisionId).toBe(second.revisionId);
    expect(first.analysis?.resultDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(JSON.stringify(source)).toBe(sourceBefore);
    expect(JSON.stringify(result)).toBe(resultBefore);

    source.nodes[0].x = 99;
    result.nodeResults[0].ux = 99;
    expect(first.project.nodes[0].x).toBe(0);
    expect(first.analysis?.result.nodeResults[0].ux).toBe(0);
  });
});
