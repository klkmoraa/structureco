// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHibbelerStyleDiagramPractice } from '../data/defaultProject';
import { PROJECT_STORAGE_KEY } from '../data/projectStorage';
import { createSimpleBeamExercise } from '../education/exerciseTemplates';
import { ClassroomSessionProvider, useClassroomSession } from '../store/ClassroomSessionContext';
import { ProjectProvider, useProject } from '../store/ProjectContext';
import type { ProjectModel } from '../types';
import { ResultsPanel } from './ResultsPanel';

const RESULTS_MODE_STORAGE_KEY = 'structureCo.results.mode.v1';

const mockMatchMedia = (mobile = false) => vi.fn().mockImplementation((query: string) => ({
  matches: mobile && query === '(max-width: 1023px)',
  media: query,
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

const ResultsHarness = () => {
  const { project, analysis, resultTab, selection, resultCursor } = useProject();
  const selectionLabel = selection?.kind === 'member' || selection?.kind === 'node'
    ? `${selection.kind}:${selection.id}`
    : selection?.kind ?? 'none';
  return <ClassroomSessionProvider projectId={project.id} analysisAvailable={analysis?.success === true}>
    <output aria-label="Pestaña activa">{resultTab}</output>
    <output aria-label="Selección actual">{selectionLabel}</output>
    <output aria-label="Cursor de resultados">{resultCursor ? `${resultCursor.memberId}:${resultCursor.x}:${resultCursor.pinned}` : 'none'}</output>
    <ClassroomDiagnostics />
    <ResultsPanel />
  </ClassroomSessionProvider>;
};

const ClassroomDiagnostics = () => {
  const session = useClassroomSession();
  const { project, analysis, updateProjectView } = useProject();
  return <div data-testid="classroom-diagnostics">
    <output aria-label="Predicciones base">{JSON.stringify(session.predictions)}</output>
    <output aria-label="Estado del modelo">{`${project.nodes.length}:${project.members.length}:${project.memberLoads.length + project.nodalLoads.length}:${analysis?.success === true}`}</output>
    <button onClick={() => updateProjectView((draft) => ({ ...draft, settings: { ...draft.settings, units: 'N-mm' } }))}>Unidades N-mm</button>
    <button onClick={() => updateProjectView((draft) => ({ ...draft, settings: { ...draft.settings, calculationMode: 'complete' } }))}>Modo completo test</button>
    <button onClick={() => updateProjectView((draft) => ({ ...draft, settings: { ...draft.settings, calculationMode: 'classroom' } }))}>Modo aula test</button>
  </div>;
};

const renderResults = (project: ProjectModel = createHibbelerStyleDiagramPractice()) => {
  localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
  return render(<ProjectProvider><ResultsHarness /></ProjectProvider>);
};

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: mockMatchMedia(),
  });
  window.requestAnimationFrame = (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 0);
  window.cancelAnimationFrame = (handle: number) => window.clearTimeout(handle);
});

beforeEach(() => {
  localStorage.clear();
  window.matchMedia = mockMatchMedia();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Results analytical center', () => {
  it('organizes tabs by purpose and supports keyboard plus persistent panel modes', async () => {
    const user = userEvent.setup();
    renderResults();

    const panel = screen.getByRole('region', { name: 'Resultados del análisis' });
    expect(screen.getByText('Centro analítico')).toBeTruthy();
    for (const family of ['Estado', 'Esfuerzos', 'Forma', 'Avanzado', 'Comprender', 'Avisos']) {
      expect(screen.getAllByText(family).length).toBeGreaterThan(0);
    }
    const moment = screen.getByRole('tab', { name: 'Momento' });
    expect(moment.getAttribute('aria-selected')).toBe('true');
    expect(moment.getAttribute('aria-describedby')).toBe('result-family-forces');
    expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe('result-tab-moment');

    moment.focus();
    await user.keyboard('{ArrowRight}');
    const influence = screen.getByRole('tab', { name: 'Influencia' });
    await waitFor(() => expect(document.activeElement).toBe(influence));
    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'Resumen' }).getAttribute('aria-selected')).toBe('true');

    const focusButton = screen.getByRole('button', { name: 'Enfocar' });
    await user.click(focusButton);
    await waitFor(() => expect(panel.getAttribute('data-results-mode')).toBe('focused'));
    expect(document.activeElement).toBe(panel);
    expect(localStorage.getItem(RESULTS_MODE_STORAGE_KEY)).toBe('focused');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(panel.getAttribute('data-results-mode')).toBe('expanded'));
    expect(document.activeElement).toBe(focusButton);
  });

  it('moves from an empty state to exact summary traceability without recalculating in the UI', async () => {
    const user = userEvent.setup();
    renderResults();

    await user.click(screen.getByRole('button', { name: 'Analizar estructura' }));
    await screen.findByTestId('diagram-chart', {}, { timeout: 5000 });
    await user.click(screen.getByRole('tab', { name: 'Resumen' }));
    const summary = await screen.findByRole('region', { name: 'Resumen global de resultados' });
    expect(summary).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /M máx\. absoluto/i }));
    expect(screen.getByLabelText('Selección actual').textContent).toBe('member:AB');
    expect(screen.getByLabelText('Pestaña activa').textContent).toBe('moment');
    expect(screen.getByLabelText('Cursor de resultados').textContent).toBe('AB:3:true');
    expect(screen.getByText('Miembro AB')).toBeTruthy();
  }, 10_000);

  it('links reaction rows back to the selected model node', async () => {
    const user = userEvent.setup();
    renderResults();

    await user.click(screen.getByRole('button', { name: 'Analizar estructura' }));
    await screen.findByTestId('diagram-chart', {}, { timeout: 5000 });
    await user.click(screen.getByRole('tab', { name: 'Reacciones' }));
    const table = screen.getByRole('table', { name: /Reacciones y desplazamientos nodales/i });
    const node = table.querySelector<HTMLButtonElement>('button');
    expect(node).toBeTruthy();
    await user.click(node as HTMLButtonElement);

    const nodeId = node?.textContent?.split('·')[0]?.trim();
    expect(screen.getByLabelText('Selección actual').textContent).toBe(`node:${nodeId}`);
    expect(node?.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText(`Nodo ${nodeId}`)).toBeTruthy();
  }, 10_000);

  it('presents the analytical architecture in English without mixed Phase 9 labels', async () => {
    const user = userEvent.setup();
    const project = createHibbelerStyleDiagramPractice();
    project.settings.language = 'en';
    renderResults(project);

    expect(screen.getByText('Analysis center')).toBeTruthy();
    for (const family of ['State', 'Forces', 'Shape', 'Advanced', 'Understand', 'Issues']) {
      expect(screen.getAllByText(family).length).toBeGreaterThan(0);
    }
    expect(screen.getByRole('group', { name: 'Results panel size' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Compact' })).toBeTruthy();
    expect(screen.getByText('Ready to analyze').getAttribute('role')).toBe('status');
    await user.click(screen.getByRole('button', { name: 'Analyze structure' }));
    await screen.findByTestId('diagram-chart', {}, { timeout: 5000 });
    await user.click(screen.getByRole('tab', { name: 'Summary' }));
    expect(await screen.findByRole('region', { name: 'Global results summary' })).toBeTruthy();
  }, 10_000);

  it('uses a modal mobile sheet with focus trap, Escape return, and safe focused-mode normalization', async () => {
    const user = userEvent.setup();
    window.matchMedia = mockMatchMedia(true);
    localStorage.setItem(RESULTS_MODE_STORAGE_KEY, 'focused');
    renderResults();

    const toggle = screen.getByRole('button', { name: 'Resultados' });
    const panel = document.querySelector<HTMLElement>('.results-panel') as HTMLElement;
    expect(panel).toBeTruthy();
    await waitFor(() => expect(panel.getAttribute('data-results-mode')).toBe('expanded'));
    await user.click(toggle);
    const sheet = await screen.findByRole('dialog', { name: 'Resultados del análisis' });
    expect(sheet.getAttribute('aria-modal')).toBe('true');
    await waitFor(() => expect(document.activeElement).toBe(toggle));

    sheet.focus();
    await user.tab();
    expect(document.activeElement).toBe(toggle);
    sheet.focus();
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Analizar estructura' }));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Resultados del análisis' })).toBeNull());
    expect(document.activeElement).toBe(toggle);
  });

  it('keeps native learning summaries inside the mobile focus loop', async () => {
    const user = userEvent.setup();
    window.matchMedia = mockMatchMedia(true);
    renderResults();

    await user.click(screen.getByRole('button', { name: 'Resultados' }));
    await user.click(screen.getByRole('button', { name: 'Analizar estructura' }));
    await screen.findByTestId('diagram-chart', {}, { timeout: 5000 });
    await user.click(screen.getByRole('tab', { name: 'Aprender' }));
    const sheet = screen.getByRole('dialog', { name: 'Resultados del análisis' });
    const summaries = [...sheet.querySelectorAll<HTMLElement>('summary')];
    expect(summaries.length).toBeGreaterThan(0);
    summaries[summaries.length - 1].focus();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Aprender ·/ }));
  }, 10_000);

  it('requires a base-unit prediction, compares real results, and preserves the attempt across units and modes', async () => {
    const user = userEvent.setup();
    const project = createSimpleBeamExercise();
    renderResults(project);

    expect(screen.getByRole('heading', { name: 'Tu hipótesis antes del cálculo' })).toBeTruthy();
    const momentTab = screen.getByRole('tab', { name: 'M' });
    momentTab.focus();
    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'N' }));
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(momentTab);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Signo esperado' }), 'negative');
    const magnitude = screen.getByRole('spinbutton', { name: 'Magnitud estimada' });
    expect(document.getElementById(magnitude.getAttribute('aria-describedby') ?? '')?.textContent).toBe('kN·m');
    await user.type(magnitude, '12.5');
    expect(screen.getByLabelText('Predicciones base').textContent).toBe('{"M1":{"moment":12.5}}');

    await user.click(screen.getByRole('button', { name: 'Unidades N-mm' }));
    expect((screen.getByRole('spinbutton', { name: 'Magnitud estimada' }) as HTMLInputElement).value).toBe('12500000');
    expect(screen.getByLabelText('Predicciones base').textContent).toBe('{"M1":{"moment":12.5}}');

    await user.click(screen.getByRole('button', { name: /continuar al análisis/i }));
    const firstGateHeading = await screen.findByRole('heading', { name: /el análisis terminó/i }, { timeout: 5000 });
    await waitFor(() => expect(document.activeElement).toBe(firstGateHeading));
    await user.click(screen.getByRole('button', { name: 'Editar predicción' }));
    expect(await screen.findByRole('heading', { name: 'Tu hipótesis antes del cálculo' })).toBeTruthy();
    expect((screen.getByRole('spinbutton', { name: 'Magnitud estimada' }) as HTMLInputElement).value).toBe('12500000');
    await user.click(screen.getByRole('button', { name: /continuar al análisis/i }));
    expect(await screen.findByRole('heading', { name: /el análisis terminó/i }, { timeout: 5000 })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Revelar y comparar' }));
    const summary = await screen.findByRole('region', { name: 'Resumen global de resultados' });
    await waitFor(() => expect(document.activeElement).toBe(summary));
    expect(screen.getByText('Tu predicción frente al resultado')).toBeTruthy();
    expect(screen.getByText(/Signo esperado: Negativo/)).toBeTruthy();
    expect(screen.getByLabelText('Estado del modelo').textContent).toBe('2:1:1:true');

    await user.click(screen.getByRole('button', { name: 'Modo completo test' }));
    await user.click(screen.getByRole('button', { name: 'Modo aula test' }));
    expect(screen.getByLabelText('Estado del modelo').textContent).toBe('2:1:1:true');
    expect(screen.getByLabelText('Predicciones base').textContent).toBe('{"M1":{"moment":12.5}}');
    expect(screen.getByText('Tu predicción frente al resultado')).toBeTruthy();
  }, 10_000);

  it('keeps the complete classroom prediction and reveal flow in English', async () => {
    const user = userEvent.setup();
    const project = createSimpleBeamExercise();
    project.settings.language = 'en';
    renderResults(project);

    expect(screen.getByRole('heading', { name: 'Your hypothesis before solving' })).toBeTruthy();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Expected sign' }), 'positive');
    await user.click(screen.getByRole('button', { name: 'Continue to analysis' }));
    expect(await screen.findByRole('heading', { name: 'Analysis is complete. Decide when to view the solution.' }, { timeout: 5000 })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Reveal and compare' }));
    expect(await screen.findByText('Your prediction compared with the result')).toBeTruthy();
    expect(screen.getByText('Global summary')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Compare cases' })).toBeTruthy();
    expect(screen.queryByText('Resumen global')).toBeNull();
    expect(screen.getByRole('button', { name: 'Hide results' })).toBeTruthy();
  }, 10_000);

  it('opens prediction instead of blocking on a failed analysis inherited from Complete mode', async () => {
    const user = userEvent.setup();
    const project = createSimpleBeamExercise();
    project.settings.calculationMode = 'complete';
    project.nodes.push(
      { id: 'N3', x: 0, y: 3, support: { type: 'none' } },
      { id: 'N4', x: 3, y: 3, support: { type: 'none' } },
    );
    project.members.push({ ...project.members[0], id: 'M2', i: 'N3', j: 'N4' });
    renderResults(project);

    await user.click(screen.getByRole('button', { name: 'Analizar estructura' }));
    expect(await screen.findByText('Estructura inestable o mecanismo', {}, { timeout: 5000 })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Modo aula test' }));
    expect(await screen.findByRole('heading', { name: 'Tu hipótesis antes del cálculo' })).toBeTruthy();
    expect(screen.queryByText('Estructura inestable o mecanismo')).toBeNull();
  }, 10_000);
});
