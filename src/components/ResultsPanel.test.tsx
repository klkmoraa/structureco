// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHibbelerStyleDiagramPractice } from '../data/defaultProject';
import { PROJECT_STORAGE_KEY } from '../data/projectStorage';
import { ClassroomSessionProvider } from '../store/ClassroomSessionContext';
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
  const { project, resultTab, selection, resultCursor } = useProject();
  const selectionLabel = selection?.kind === 'member' || selection?.kind === 'node'
    ? `${selection.kind}:${selection.id}`
    : selection?.kind ?? 'none';
  return <ClassroomSessionProvider projectId={project.id}>
    <output aria-label="Pestaña activa">{resultTab}</output>
    <output aria-label="Selección actual">{selectionLabel}</output>
    <output aria-label="Cursor de resultados">{resultCursor ? `${resultCursor.memberId}:${resultCursor.x}:${resultCursor.pinned}` : 'none'}</output>
    <ResultsPanel />
  </ClassroomSessionProvider>;
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
});
