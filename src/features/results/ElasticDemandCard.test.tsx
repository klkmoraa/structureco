// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { standardMaterials } from '../../data/standardMaterials';
import { standardSections } from '../../data/standardSections';
import type {
  AnalysisResult,
  MemberModel,
  MemberResult,
  ProjectModel,
  ReliabilityLevel,
} from '../../types';

const ipe300 = standardSections.find((section) => section.id === 'ipe-300')!;
const a36 = standardMaterials.find((material) => material.id === 'steel-a36')!;

/**
 * Un miembro con identidad completa y A = 1 m² hace que σ dependa sólo de N,
 * así que η se puede fijar en un valor exacto en binario y comprobarse letra a
 * letra en las tres superficies.
 */
const memberOf = (overrides: Partial<MemberModel> = {}): MemberModel => ({
  id: 'B7', i: 'N1', j: 'N2', type: 'frame',
  E: a36.elasticModulus, A: 1, I: ipe300.inertiaX,
  materialId: a36.id, materialOrigin: 'catalog',
  sectionId: ipe300.id, sectionOrigin: 'catalog',
  ...overrides,
});

const resultFor = (axial: number): MemberResult => ({
  memberId: 'B7', length: 4,
  localDisplacements: [], localEndForces: [], diagramSegments: [], diagramJumps: [],
  criticalPoints: [], diagram: [], deformation: [], deformationSegments: [], deformationCriticalPoints: [],
  maxAxial: axial, minAxial: 0, maxShear: 0, minShear: 0, maxMoment: 0, minMoment: 0,
} as unknown as MemberResult);

const analysisFor = (axial: number, level: ReliabilityLevel = 'reliable'): AnalysisResult => ({
  success: level !== 'failed',
  memberResults: [resultFor(axial)],
  nodeResults: [],
  issues: [],
  displacements: [0],
  reliability: { completed: true, usable: level !== 'failed', level, checks: [], reasons: [] },
} as unknown as AnalysisResult);

const setSelection = vi.fn();
const context = {
  project: {
    id: 'p', name: 'p', nodes: [], members: [memberOf()], nodalLoads: [], memberLoads: [],
    settings: { units: 'kN-m', language: 'es' },
  } as unknown as ProjectModel,
  analysis: analysisFor(a36.yieldStrength / 2),
  setSelection,
};

vi.mock('../../store/ProjectContext', () => ({ useProject: () => context }));

const renderCard = async () => {
  const { ElasticDemandCard } = await import('./ElasticDemandCard');
  return render(<ElasticDemandCard />);
};

const setMembers = (...members: MemberModel[]) => {
  (context.project as unknown as { members: MemberModel[] }).members = members;
};

afterEach(() => {
  cleanup();
  setSelection.mockClear();
  setMembers(memberOf());
  (context.project.settings as { units: string }).units = 'kN-m';
  context.analysis = analysisFor(a36.yieldStrength / 2);
});

describe('ElasticDemandCard — available reading', () => {
  it('publishes η as an estimated elastic index against a reference Fy', async () => {
    const { container } = await renderCard();
    expect(screen.getByTestId('elastic-demand-card').dataset.status).toBe('available');
    expect(screen.getByTestId('elastic-index-value').textContent).toBe('η 0.50 · 50 % de Fy de referencia');
    expect(container.textContent).toContain('Índice elástico estimado');
  });

  it('never uses safety, approval or code-check vocabulary', async () => {
    const { container } = await renderCard();
    const copy = container.textContent ?? '';
    for (const forbidden of [/seguro/i, /salud/i, /\bfactor\b/i, /aprobado/i, /\bpasa\b/i, /cumple/i]) {
      expect(copy, forbidden.source).not.toMatch(forbidden);
    }
    // Y sí dice lo que es.
    expect(copy).toMatch(/no es una verificación normativa ni una declaración de seguridad/);
  });

  it('shows the provenance of every published input', async () => {
    const { container } = await renderCard();
    const copy = container.textContent ?? '';
    expect(copy).toContain(a36.name);
    expect(copy).toContain(a36.id);
    expect(copy).toContain(ipe300.name);
    expect(copy).toContain(ipe300.id);
    expect(copy).toMatch(/envolvente conservadora/i);
  });

  it('discloses the derivation chain without opening it by default', async () => {
    const { container } = await renderCard();
    const disclosure = container.querySelector('details.elastic-how');
    expect(disclosure).not.toBeNull();
    expect((disclosure as HTMLDetailsElement).open).toBe(false);
    expect(within(disclosure as HTMLElement).getByText('N* → A → M* → W → σ* → Fy → η')).toBeTruthy();
  });

  it('locates the governing member on the canvas', async () => {
    await renderCard();
    await userEvent.setup().click(screen.getByTestId('elastic-index-locate'));
    expect(setSelection).toHaveBeenCalledWith({ kind: 'member', id: 'B7' });
  });

  it('keeps the magnitude readable without colour and without lying to ARIA', async () => {
    // η puede superar 1, así que `role="meter"` con aria-valuemax = 100 publicaba
    // un contrato imposible. La barra es decorativa y el valor va en texto.
    context.analysis = analysisFor(a36.yieldStrength * 1.4);
    const { container } = await renderCard();
    expect(container.querySelector('[role="meter"]')).toBeNull();
    const scale = container.querySelector('.elastic-index-scale');
    expect(scale?.getAttribute('aria-hidden')).toBe('true');
    // Banda nombrada en texto: no depende del color.
    expect(screen.getByTestId('elastic-index-band').textContent).toBe('Alcanza el Fy de referencia');
    expect(screen.getByTestId('elastic-index-value').textContent).toBe('η 1.40 · 140 % de Fy de referencia');
  });

  it('has no 0.85 threshold mark left anywhere', async () => {
    const { container } = await renderCard();
    expect(container.innerHTML).not.toContain('85%');
    expect(container.querySelector('.structural-health-mark')).toBeNull();
  });

  it('reads η identically whatever unit system is displayed', async () => {
    const metric = await renderCard();
    const metricRatio = within(metric.container).getByTestId('elastic-index-value').textContent;
    cleanup();
    (context.project.settings as { units: string }).units = 'kip-ft';
    const imperial = await renderCard();
    expect(within(imperial.container).getByTestId('elastic-index-value').textContent).toBe(metricRatio);
  });
});

describe('ElasticDemandCard — unavailable reading', () => {
  it('says exactly which datum is missing instead of inventing Fy', async () => {
    setMembers(memberOf({ materialId: undefined, materialOrigin: 'legacy' }));
    const { container } = await renderCard();
    expect(screen.getByTestId('elastic-demand-card').dataset.status).toBe('unavailable');
    expect(container.textContent).toContain('Índice elástico — No disponible');
    expect(container.textContent).toMatch(/Falta Fy/);
    expect(container.querySelector('[data-testid="elastic-index-value"]')).toBeNull();
    // Y no aparece el 250 MPa de reserva por ninguna parte.
    expect(container.textContent).not.toMatch(/250/);
  });

  it('says exactly which datum is missing instead of deriving W from A and I', async () => {
    setMembers(memberOf({ sectionId: undefined, sectionOrigin: 'custom' }));
    const { container } = await renderCard();
    expect(container.textContent).toMatch(/Falta W/);
  });

  it('offers a contextual action that locates the affected member', async () => {
    setMembers(memberOf({ materialId: undefined, materialOrigin: 'legacy' }));
    await renderCard();
    await userEvent.setup().click(screen.getByTestId('elastic-index-action'));
    expect(setSelection).toHaveBeenCalledWith({ kind: 'member', id: 'B7' });
  });

  it('refuses to publish η for an unreliable analysis', async () => {
    context.analysis = analysisFor(a36.yieldStrength / 2, 'unreliable');
    const { container } = await renderCard();
    expect(screen.getByTestId('elastic-demand-card').dataset.status).toBe('unavailable');
    expect(container.textContent).toMatch(/no es confiable/);
    expect(container.querySelector('[data-testid="elastic-index-value"]')).toBeNull();
  });
});

describe('ElasticDemandCard — limited reliability', () => {
  it('publishes a limited analysis marked as limited, never as an ordinary result', async () => {
    context.analysis = analysisFor(a36.yieldStrength / 2, 'limited');
    const { container } = await renderCard();
    const card = screen.getByTestId('elastic-demand-card');
    expect(card.dataset.status).toBe('available');
    expect(card.dataset.confidence).toBe('limited');
    expect(container.textContent).toMatch(/Confiabilidad limitada/);
  });
});
