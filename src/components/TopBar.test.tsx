// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultProject } from '../data/defaultProject';
import { PROJECT_STORAGE_KEY } from '../data/projectStorage';
import { ProjectProvider } from '../store/ProjectContext';
import { TopBar } from './TopBar';

const portableMocks = vi.hoisted(() => ({
  createCalculationReport: vi.fn(),
  createPortableBundle: vi.fn(),
  shareOrDownloadPortableBytes: vi.fn(),
}));

vi.mock('../utils/portable', () => ({
  ...portableMocks,
  STRUCTURECO_BUNDLE_MIME: 'application/vnd.structureco.bundle+zip',
}));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(createDefaultProject()));
  portableMocks.createCalculationReport.mockResolvedValue({
    bytes: new Uint8Array([1, 2, 3]),
    filename: 'memoria-structureco.pdf',
    payload: {},
  });
  portableMocks.shareOrDownloadPortableBytes.mockResolvedValue('downloaded');
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  });
  window.requestAnimationFrame = (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 0);
  window.cancelAnimationFrame = (handle: number) => window.clearTimeout(handle);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('TopBar portable export', () => {
  it('keeps the PDF option enabled before the user runs Analysis', async () => {
    const user = userEvent.setup();
    render(<ProjectProvider><TopBar /></ProjectProvider>);

    await user.click(screen.getByRole('button', { name: 'Más acciones' }));
    const pdfButton = screen.getByRole('button', { name: 'PDF completo reimportable' }) as HTMLButtonElement;

    expect(pdfButton.disabled).toBe(false);
  });

  it('analyzes the current project and generates the PDF from one click', async () => {
    const user = userEvent.setup();
    render(<ProjectProvider><TopBar /></ProjectProvider>);

    await user.click(screen.getByRole('button', { name: 'Más acciones' }));
    await user.click(screen.getByRole('button', { name: 'PDF completo reimportable' }));

    await waitFor(() => expect(portableMocks.createCalculationReport).toHaveBeenCalledOnce());
    const [, generatedAnalysis] = portableMocks.createCalculationReport.mock.calls[0];
    expect(generatedAnalysis.success).toBe(true);
    expect(portableMocks.shareOrDownloadPortableBytes).toHaveBeenCalledWith(
      new Uint8Array([1, 2, 3]),
      'memoria-structureco.pdf',
      'application/pdf',
      expect.stringContaining('memoria de cálculo'),
    );
  });
});

describe('TopBar information architecture', () => {
  it('groups document, context, and actions without losing secondary controls', async () => {
    const user = userEvent.setup();
    const { container } = render(<ProjectProvider><TopBar /></ProjectProvider>);

    expect(container.querySelector('[data-topbar-zone="document"]')).not.toBeNull();
    expect(container.querySelector('[data-topbar-zone="context"]')).not.toBeNull();
    expect(container.querySelector('[data-topbar-zone="actions"]')).not.toBeNull();

    const projectName = screen.getByRole('textbox', { name: 'Nombre del proyecto' });
    expect(projectName.getAttribute('title')).toBe(projectName.getAttribute('value'));

    const moreButton = screen.getByRole('button', { name: 'Más acciones' });
    await user.click(moreButton);

    const dialog = screen.getByRole('dialog', { name: 'Más acciones' });
    expect(within(dialog).getByRole('combobox', { name: 'Unidades' })).toBeTruthy();
    expect(within(dialog).getByRole('combobox', { name: 'Idioma' })).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'Tema oscuro' })).toBeTruthy();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(document.activeElement).toBe(moreButton));
    expect(moreButton.getAttribute('aria-expanded')).toBe('false');
  });

  it('keeps visual layout commands inside the grouped secondary menu', async () => {
    const user = userEvent.setup();
    const onToggleInspector = vi.fn();
    const onToggleFullCanvas = vi.fn();
    const onToggleToolRail = vi.fn();
    render(<ProjectProvider><TopBar layoutActions={{
      inspectorCollapsed: false,
      fullCanvas: false,
      toolRailCompact: false,
      onToggleInspector,
      onToggleFullCanvas,
      onToggleToolRail,
    }} /></ProjectProvider>);

    await user.click(screen.getByRole('button', { name: 'Más acciones' }));
    await user.click(screen.getByRole('button', { name: 'Ocultar inspector' }));
    expect(onToggleInspector).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: 'Más acciones' }));
    await user.click(screen.getByRole('button', { name: 'Mesa de trabajo completa' }));
    expect(onToggleFullCanvas).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: 'Más acciones' }));
    await user.click(screen.getByRole('button', { name: 'Contraer herramientas' }));
    expect(onToggleToolRail).toHaveBeenCalledOnce();
  });
});
