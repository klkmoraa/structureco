// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { findStandardMaterial } from '../../data/standardMaterials';
import { findStandardSection } from '../../data/standardSections';
import type { AnalysisResult, MemberModel, MemberResult, ProjectModel } from '../../types';

const material = findStandardMaterial('steel-a992')!;
const section = findStandardSection('w12x26')!;

const member: MemberModel = {
  id: 'M1',
  i: 'N1',
  j: 'N2',
  type: 'frame',
  materialId: material.id,
  materialOrigin: 'catalog',
  sectionId: section.id,
  sectionOrigin: 'catalog',
  E: material.elasticModulus,
  A: section.area,
  I: section.inertiaX,
};

const memberResult = (axial = -100, moment = 50): MemberResult => ({
  memberId: 'M1',
  length: 4.0,
  localDisplacements: [],
  localEndForces: [],
  diagramSegments: [],
  diagramJumps: [],
  criticalPoints: [],
  diagram: [],
  deformation: [],
  deformationSegments: [],
  deformationCriticalPoints: [],
  maxAxial: 0,
  minAxial: axial,
  maxShear: 30,
  minShear: -30,
  maxMoment: moment,
  minMoment: -moment / 2,
} as unknown as MemberResult);

const analysis = (axial = -100, moment = 50): AnalysisResult => ({
  success: true,
  issues: [],
  nodeResults: [],
  memberResults: [memberResult(axial, moment)],
  displacements: [],
  residualNorm: 0,
  conditionEstimate: 1,
  equilibrium: { sumFx: 0, sumFy: 0, sumM: 0, normalizedComponents: { fx: 0, fy: 0, mz: 0 }, normalizedResidual: 0 },
  explanation: [],
  reliability: { completed: true, usable: true, level: 'reliable', checks: [], reasons: [] },
} as AnalysisResult);

const project: ProjectModel = {
  id: 'P1',
  name: 'Steel Frame AISC Test',
  nodes: [],
  members: [member],
  loadCases: [],
  combinations: [{ id: 'COMB-1', name: 'AISC LRFD 1.2D+1.6L', factors: {} }],
  nodalLoads: [],
  memberLoads: [],
  prescribedDisplacements: [],
  memberInitialEffects: [],
  settings: { units: 'kN-m', language: 'es' },
} as unknown as ProjectModel;

const setSelectionMock = vi.fn();
const updateProjectMock = vi.fn();

const context = {
  project,
  analysis: analysis(),
  selectedCombinationId: 'COMB-1',
  selection: null as { kind: string; id: string } | null,
  setSelection: setSelectionMock,
  updateProject: updateProjectMock,
};

vi.mock('../../store/ProjectContext', () => ({ useProject: () => context }));

afterEach(() => {
  cleanup();
  context.project = { ...project, members: [{ ...member }] } as unknown as ProjectModel;
  context.analysis = analysis();
  context.selectedCombinationId = 'COMB-1';
  context.selection = null;
  setSelectionMock.mockClear();
  updateProjectMock.mockClear();
  (context.project.settings as { language: 'es' | 'en' }).language = 'es';
});

const renderCard = async () => {
  const { AiscSteelDesignCard } = await import('./AiscSteelDesignCard');
  return render(<AiscSteelDesignCard />);
};

describe('AiscSteelDesignCard (Fluid Multi-Tab Architecture)', () => {
  it('renders overview tab with utilization dial gauge and SVG cross-section', async () => {
    await renderCard();
    const card = screen.getByTestId('aisc-steel-design-card');
    expect(card.dataset.resultKind).toBe('design');
    expect(card.dataset.status).toBe('pass');

    // Header & badge
    expect(within(card).getByText('Diseño de acero estructural')).toBeTruthy();
    expect(within(card).getByText('Aprobado (LRFD)')).toBeTruthy();

    // Utilization gauge
    expect(within(card).getByText(/Seguro \(≤ 0\.90\)/)).toBeTruthy();
    expect(within(card).getByText(/Excedido \(> 1\.00\)/)).toBeTruthy();

    // Cross-section diagram
    expect(card.querySelector('.aisc-section-diagram__svg')).toBeTruthy();

    // Section properties table
    expect(within(card).getByText('W12x26')).toBeTruthy();
  });

  it('navigates seamlessly between tabs (limits, sheet, sizer)', async () => {
    await renderCard();
    const card = screen.getByTestId('aisc-steel-design-card');

    // 1. Switch to Limit States Tab
    fireEvent.click(within(card).getByText('Estados Límite'));
    expect(card.querySelector('.aisc-limit-states-grid')).toBeTruthy();
    expect(within(card).getByText('Flexión (Cap. F)')).toBeTruthy();
    expect(within(card).getByText('Cortante (Cap. G)')).toBeTruthy();
    expect(within(card).getByText('Compresión (Cap. E)')).toBeTruthy();

    // 2. Switch to Calculation Sheet Tab
    fireEvent.click(within(card).getByText('Memoria de Cálculo'));
    expect(card.querySelector('.aisc-calc-sheet')).toBeTruthy();
    expect(within(card).getAllByText(/Capítulo/i).length).toBeGreaterThan(0);

    // 3. Switch to Section Sizer Tab
    fireEvent.click(within(card).getByText('Optimizador (Smart Sizer)'));
    expect(card.querySelector('.aisc-sizer-table')).toBeTruthy();
    expect(within(card).getByText(/Sección actual: W12x26/)).toBeTruthy();
  });

  it('triggers canvas selection when clicking focus button', async () => {
    await renderCard();
    const card = screen.getByTestId('aisc-steel-design-card');
    const focusBtn = within(card).getByText('Enfocar en canvas');
    fireEvent.click(focusBtn);
    expect(setSelectionMock).toHaveBeenCalledWith({ kind: 'member', id: 'M1' });
  });

  it('allows adopting an alternative section from the Smart Sizer', async () => {
    await renderCard();
    const card = screen.getByTestId('aisc-steel-design-card');

    // Open Sizer tab
    fireEvent.click(within(card).getByText('Optimizador (Smart Sizer)'));
    const adoptButtons = within(card).getAllByRole('button', { name: /Adoptar/i });
    expect(adoptButtons.length).toBeGreaterThan(0);

    fireEvent.click(adoptButtons[0]);
    expect(updateProjectMock).toHaveBeenCalled();
  });

  it('synchronizes automatically when canvas selection changes', async () => {
    const member2: MemberModel = { ...member, id: 'M2' };
    context.project = { ...project, members: [member, member2] } as unknown as ProjectModel;
    context.analysis = {
      ...analysis(),
      memberResults: [memberResult(-100, 50), { ...memberResult(-150, 70), memberId: 'M2' }],
    } as AnalysisResult;
    context.selection = { kind: 'member', id: 'M2' };

    await renderCard();
    const card = screen.getByTestId('aisc-steel-design-card');
    const select = screen.getByLabelText(/Miembro:/i) as HTMLSelectElement;
    expect(select.value).toBe('M2');
    expect(card).toBeTruthy();
  });

  it('reflects warning state when ratio is near capacity (>0.90)', async () => {
    context.analysis = analysis(-100, 115);
    await renderCard();
    const card = screen.getByTestId('aisc-steel-design-card');
    expect(card.dataset.status).toBe('warning');
    expect(within(card).getByText('Atención (>90%)')).toBeTruthy();
  });

  it('reflects fail state when ratio exceeds capacity (>1.00)', async () => {
    context.analysis = analysis(-100, 300);
    await renderCard();
    const card = screen.getByTestId('aisc-steel-design-card');
    expect(card.dataset.status).toBe('fail');
    expect(within(card).getByText('No satisface')).toBeTruthy();
  });

  it('supports English language across all tabs and labels', async () => {
    (context.project.settings as { language: 'es' | 'en' }).language = 'en';
    await renderCard();
    const card = screen.getByTestId('aisc-steel-design-card');
    expect(within(card).getByText('Structural steel design')).toBeTruthy();
    expect(within(card).getByText('Pass (LRFD)')).toBeTruthy();
    expect(within(card).getByText('Overview')).toBeTruthy();
    expect(within(card).getByText('Limit States')).toBeTruthy();
    expect(within(card).getByText('Calculation Sheet')).toBeTruthy();
    expect(within(card).getByText('Section Sizer')).toBeTruthy();
    expect(within(card).getByText('Focus canvas')).toBeTruthy();
  });
});
