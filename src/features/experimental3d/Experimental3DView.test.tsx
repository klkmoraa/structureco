// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultProject } from '../../data/defaultProject';
import { PROJECT_STORAGE_KEY } from '../../data/projectStorage';
import { ProjectProvider } from '../../store/ProjectContext';
import { Experimental3DView } from './Experimental3DView';

vi.mock('./Experimental3DCanvas', () => ({
  Experimental3DCanvas: ({ onAvailabilityChange }: { onAvailabilityChange?: (unavailable: boolean) => void }) => <>
    <canvas data-testid="experimental-3d-canvas" />
    <button type="button" onClick={() => onAvailabilityChange?.(true)}>Simular WebGL no disponible</button>
  </>,
}));

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Experimental3DView', () => {
  it('describes the non-authoritative projection and returns through explicit destinations', async () => {
    const project = createDefaultProject();
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
    const onOpenWorkspace = vi.fn();
    const onOpenHome = vi.fn();
    const before = JSON.stringify(project);
    const user = userEvent.setup();

    render(
      <ProjectProvider>
        <Experimental3DView project={project} onOpenWorkspace={onOpenWorkspace} onOpenHome={onOpenHome} />
      </ProjectProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Vista 3D experimental' })).toBeTruthy();
    expect(screen.getByText('Vista del modelo 2D sobre z = 0. No realiza análisis estructural 3D.')).toBeTruthy();
    expect(screen.getByTestId('experimental-3d-canvas')).toBeTruthy();
    const summary = screen.getByRole('region', { name: 'Resumen del modelo visible' });
    expect(summary.textContent).toContain(project.name);
    expect(summary.textContent).toContain(`${project.nodes.length}`);
    expect(summary.textContent).toContain(`${project.members.length}`);

    await user.click(screen.getByRole('button', { name: 'Editor 2D' }));
    await user.click(screen.getByRole('button', { name: 'Inicio' }));

    expect(onOpenWorkspace).toHaveBeenCalledOnce();
    expect(onOpenHome).toHaveBeenCalledOnce();
    expect(JSON.stringify(project)).toBe(before);
  });

  it('uses English copy when the current project language is English', () => {
    const project = createDefaultProject();
    project.settings = { ...project.settings, language: 'en' };
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(
      <ProjectProvider>
        <Experimental3DView project={project} onOpenWorkspace={vi.fn()} onOpenHome={vi.fn()} />
      </ProjectProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Experimental 3D view' })).toBeTruthy();
    expect(screen.getByText('View of the 2D model on z = 0. It does not perform 3D structural analysis.')).toBeTruthy();
    expect(screen.getByRole('button', { name: '2D editor' })).toBeTruthy();
  });

  it('does not layer the empty-project overlay above the WebGL fallback', async () => {
    const project = createDefaultProject();
    project.nodes = [];
    project.members = [];
    const user = userEvent.setup();

    render(
      <ProjectProvider>
        <Experimental3DView project={project} onOpenWorkspace={vi.fn()} onOpenHome={vi.fn()} />
      </ProjectProvider>,
    );

    expect(screen.getByText(/todav.a no tiene geometr.a visible/i)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Simular WebGL no disponible' }));
    expect(screen.queryByText(/todav.a no tiene geometr.a visible/i)).toBeNull();
  });

  it('starts the viewer at the top of the page', () => {
    const scrollTo = vi.mocked(window.scrollTo);

    render(
      <ProjectProvider>
        <Experimental3DView project={createDefaultProject()} onOpenWorkspace={vi.fn()} onOpenHome={vi.fn()} />
      </ProjectProvider>,
    );

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
  });
});
