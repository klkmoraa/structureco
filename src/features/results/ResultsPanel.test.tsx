// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { createBlankProject, createHibbelerStyleDiagramPractice } from '../../data/defaultProject';
import { PROJECT_STORAGE_KEY } from '../../data/projectStorage';
import { ProjectProvider } from '../../store/ProjectContext';
import type { ProjectModel } from '../../types';
import { workspaceCommandEventName } from '../workspace/workspaceCommands';
import { ResultsPanel } from './ResultsPanel';

const setViewport = (viewport: 'desktop' | 'phone' = 'desktop') => {
  const [width, height] = viewport === 'phone' ? [390, 844] : [1440, 900];
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: height });
};

const stubMatchMedia = () => vi.fn().mockImplementation((query: string) => ({
  matches: false, media: query, onchange: null,
  addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
}));

const ResultsHarness = () => {
  const [open, setOpen] = useState(true);
  const presentation = window.innerWidth < 1024 ? 'sheet' : 'dock';
  return <ResultsPanel presentation={presentation} status={open ? 'active' : 'closed'} onOpenChange={setOpen} defaultDesktopExpanded />;
};

const renderResults = (project: ProjectModel = createHibbelerStyleDiagramPractice()) => {
  localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
  return render(<ProjectProvider><ResultsHarness /></ProjectProvider>);
};

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: stubMatchMedia() });
  window.requestAnimationFrame = (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 0);
  window.cancelAnimationFrame = (handle: number) => window.clearTimeout(handle);
});
beforeEach(() => { localStorage.clear(); window.matchMedia = stubMatchMedia(); setViewport(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Results analytical center', () => {
  it('expands on open without creating another diagram page', () => {
    const project = createHibbelerStyleDiagramPractice();
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
    render(<ProjectProvider><ResultsPanel presentation="dock" status="active" /></ProjectProvider>);

    const panel = screen.getByRole('region', { name: 'Resultados del análisis' });
    expect(panel.classList.contains('desktop-collapsed')).toBe(false);
    expect(screen.getByRole('button', { name: 'Analizar estructura' })).toBeTruthy();
  });

  it('keeps results as a small summary while the diagram remains on the canvas', async () => {
    const user = userEvent.setup();
    renderResults();
    await user.click(screen.getByRole('button', { name: 'Analizar estructura' }));

    await screen.findByLabelText('Valores principales');
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.getByLabelText('Valores principales')).toBeTruthy();
    expect(screen.getAllByText(/máx\. absoluto/)).toHaveLength(3);
    expect(screen.getByText('El diagrama se muestra directamente en el lienzo.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Lámina de diagramas/i })).toBeNull();
  }, 10_000);

  it('uses one explicit overflow route for dense secondary result views', async () => {
    const user = userEvent.setup();
    const invocations: string[] = [];
    const listener = (event: Event) => invocations.push((event as CustomEvent<{ view: string }>).detail.view);
    window.addEventListener(workspaceCommandEventName('open-dense-results'), listener);
    renderResults();
    await user.click(screen.getByRole('button', { name: 'Analizar estructura' }));

    await user.click(await screen.findByRole('button', { name: 'Más resultados' }));
    const menu = screen.getByRole('menu', { name: 'Más resultados' });
    expect(within(menu).getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Reacciones', 'Influencia', 'Aprender']);
    await user.click(within(menu).getByRole('menuitem', { name: 'Reacciones' }));
    expect(invocations).toEqual(['reactions']);
    window.removeEventListener(workspaceCommandEventName('open-dense-results'), listener);
  }, 10_000);

  it('keeps the mobile result summary modeless without opening a second canvas', async () => {
    const user = userEvent.setup();
    setViewport('phone');
    renderResults();
    await user.click(screen.getByRole('button', { name: 'Analizar estructura' }));

    const panel = screen.getByRole('dialog', { name: 'Resultados del análisis' });
    expect(panel.getAttribute('aria-modal')).toBeNull();
    expect(screen.getByText('El diagrama se muestra directamente en el lienzo.')).toBeTruthy();
  }, 10_000);

  it('keeps the empty classroom next step localized', () => {
    const project = createBlankProject();
    project.settings = { ...project.settings, calculationMode: 'classroom', language: 'en' };
    renderResults(project);
    expect(screen.getByText('Next: Build')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue building' })).toBeTruthy();
  });
});
