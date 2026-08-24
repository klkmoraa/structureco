// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnalysisResult, ProjectModel } from '../../types';
import { captureRevisionSnapshot, type RevisionSnapshot } from './revisionComparison';
import { onWorkspaceCommand } from '../workspace/workspaceCommands';

const setSelection = vi.fn();
const onBaselineChange = vi.fn();
const context: {
  project: ProjectModel;
  analysis: AnalysisResult | null;
  selectedCombinationId: string;
} = {
  project: null as unknown as ProjectModel,
  analysis: null,
  selectedCombinationId: 'C1',
};

vi.mock('../../store/ProjectContext', () => ({
  useProjectModel: () => ({ project: context.project }),
  useProjectAnalysis: () => ({ analysis: context.analysis, selectedCombinationId: context.selectedCombinationId }),
}));
vi.mock('../../store/WorkspaceUIContext', () => ({ useWorkspaceUI: () => ({ setSelection }) }));
vi.mock('../../i18n/useI18n', async () => {
  const { translate } = await import('../../i18n/catalogs');
  return { useI18n: () => ({ language: 'es', t: (key: Parameters<typeof translate>[1], params?: Record<string, string | number>) => translate('es', key, params) }) };
});

const project = (x = 0): ProjectModel => ({
  schemaVersion: 6,
  id: 'P-COMPARE',
  name: 'Modelo comparado',
  nodes: [
    { id: 'N1', x, y: 0, support: { type: 'pin' } },
    { id: 'N2', x: 4, y: 0, support: { type: 'roller' } },
  ],
  members: [{ id: 'M1', i: 'N1', j: 'N2', type: 'frame', E: 200_000_000, A: 0.01, I: 0.0001 }],
  loadCases: [{ id: 'LC1', name: 'Servicio', category: 'variable', active: true }],
  combinations: [{ id: 'C1', name: 'Combinación', factors: { LC1: 1 } }],
  nodalLoads: [], prescribedDisplacements: [], memberLoads: [], memberInitialEffects: [],
  settings: {
    units: 'kN-m', language: 'es', gridSize: 1, snap: true,
    showGrid: true, showNodeLabels: true, showMemberLabels: true, showLocalAxes: false,
    showLoads: true, showDimensions: true, showResultValues: true,
    diagramScale: 1, deformedScale: 1, diagramSide: 'positive',
  },
});

const analysis = (moment: number): AnalysisResult => ({
  success: true, issues: [],
  nodeResults: [
    { nodeId: 'N1', ux: 0, uy: 0, rz: 0, rx: 0, ry: 10, rm: 0 },
    { nodeId: 'N2', ux: 0.001, uy: -0.002, rz: 0, rx: 0, ry: 0, rm: 0 },
  ],
  memberResults: [{
    memberId: 'M1', length: 4, localDisplacements: [], localEndForces: [], diagramSegments: [], diagramJumps: [],
    criticalPoints: [], diagram: [], deformation: [], deformationSegments: [], deformationCriticalPoints: [],
    maxAxial: 0, minAxial: 0, maxShear: 10, minShear: -10, maxMoment: moment, minMoment: -moment,
  }],
  displacements: [], residualNorm: 1e-12, conditionEstimate: 10,
  equilibrium: { sumFx: 0, sumFy: 0, sumM: 0, normalizedComponents: { fx: 0, fy: 0, mz: 0 }, normalizedResidual: 0 },
  reliability: { completed: true, usable: true, level: 'reliable', checks: [], reasons: [] }, explanation: [],
});

describe('RevisionComparisonPanel', () => {
  afterEach(cleanup);

  beforeEach(() => {
    context.project = project();
    context.analysis = analysis(10);
    context.selectedCombinationId = 'C1';
    setSelection.mockClear();
    onBaselineChange.mockClear();
  });

  it('captures an immutable baseline with the current fresh analysis', async () => {
    const user = userEvent.setup();
    const { RevisionComparisonPanel } = await import('./RevisionComparisonPanel');
    render(<RevisionComparisonPanel open onOpenChange={vi.fn()} baseline={null} onBaselineChange={onBaselineChange} />);

    expect(screen.getByRole('heading', { name: 'Comparar revisiones' })).toBeTruthy();
    expect(screen.getByText(/captura explícita/)).toBeTruthy();
    const capture = screen.getByRole('button', { name: 'Capturar revisión base' });
    await waitFor(() => expect((capture as HTMLButtonElement).disabled).toBe(false));
    await user.click(capture);

    await waitFor(() => expect(onBaselineChange).toHaveBeenCalledTimes(1));
    const captured = onBaselineChange.mock.calls[0][0] as RevisionSnapshot;
    expect(captured.revisionId).toMatch(/^sha256:/);
    expect(captured.analysis?.scenarioId).toBe('C1');
    expect(captured.analysis?.result.memberResults[0].maxMoment).toBe(10);
  });

  it('shows deterministic input and result changes with explicit paths and no causal claim', async () => {
    const baseline = await captureRevisionSnapshot(project(), analysis(10), 'C1', '2026-08-24T01:00:00.000Z');
    context.project = project(1.5);
    context.analysis = analysis(15);
    const { RevisionComparisonPanel } = await import('./RevisionComparisonPanel');
    render(<RevisionComparisonPanel open onOpenChange={vi.fn()} baseline={baseline} onBaselineChange={onBaselineChange} />);

    await screen.findByText('Correlación, no causalidad');
    const panel = screen.getByTestId('revision-comparison');
    expect(panel.dataset.inputChanges).toBe('1');
    expect(panel.dataset.resultChanges).toBe('2');
    expect(within(panel).getByText('project.nodes[N1].x')).toBeTruthy();
    expect(within(panel).getByText('analysis.memberResults[M1].maxMoment')).toBeTruthy();
    expect(within(panel).getByText('+5 kN·m')).toBeTruthy();
  });

  it('filters by domain and locates a result through its original member ID', async () => {
    const user = userEvent.setup();
    const baseline = await captureRevisionSnapshot(project(), analysis(10), 'C1');
    context.project = project(1);
    context.analysis = analysis(12);
    const onPeek = vi.fn();
    const focused: string[] = [];
    const unsubscribe = onWorkspaceCommand('focus-object', (target) => focused.push(target.id));
    const { RevisionComparisonPanel } = await import('./RevisionComparisonPanel');
    render(<RevisionComparisonPanel open onOpenChange={vi.fn()} baseline={baseline} onBaselineChange={onBaselineChange} onPeek={onPeek} />);

    await screen.findByText('Correlación, no causalidad');
    await user.selectOptions(screen.getByLabelText('Dominio'), 'result');
    expect(screen.queryByText('project.nodes[N1].x')).toBeNull();
    const [locate] = screen.getAllByRole('button', { name: 'Localizar miembro M1' });
    await user.click(locate);
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
    expect(setSelection).toHaveBeenCalledWith({ kind: 'member', id: 'M1' });
    expect(onPeek).toHaveBeenCalledTimes(1);
    expect(focused).toContain('M1');
    unsubscribe();
  });

  it('blocks result deltas for a different project and explains the identity boundary', async () => {
    const baseline = await captureRevisionSnapshot(project(), analysis(10), 'C1');
    context.project = { ...project(1), id: 'P-OTHER' };
    context.analysis = analysis(20);
    const { RevisionComparisonPanel } = await import('./RevisionComparisonPanel');
    render(<RevisionComparisonPanel open onOpenChange={vi.fn()} baseline={baseline} onBaselineChange={onBaselineChange} />);

    expect(await screen.findByText('Resultados bloqueados')).toBeTruthy();
    expect(screen.getByText(/proyecto distinto/)).toBeTruthy();
    expect(screen.queryByText('+10 kN·m')).toBeNull();
  });
});
