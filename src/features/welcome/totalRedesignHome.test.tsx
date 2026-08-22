// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBlankProject } from '../../data/defaultProject';
import { PROJECT_STORAGE_KEY } from '../../data/projectStorage';
import { ProjectProvider } from '../../store/ProjectContext';
import { WelcomeScreen } from './WelcomeScreen';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
});

beforeEach(() => {
  localStorage.clear();
  const project = createBlankProject();
  project.settings = { ...project.settings, language: 'es' };
  localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
});

afterEach(() => cleanup());

const renderHome = () => render(
  <ProjectProvider>
    <WelcomeScreen onOpenWorkspace={() => undefined} onOpenSpace3D={() => undefined} />
  </ProjectProvider>,
);

describe('Home total redesign contract', () => {
  it('exposes six real Home destinations without a decorative step rail', () => {
    const { container } = renderHome();
    const navigation = screen.getByRole('navigation', { name: 'Navegación principal' });

    expect(navigation).toBeTruthy();
    for (const name of ['Inicio', 'Proyectos', 'Plantillas', 'Aula', 'Importar', 'Space 3D']) {
      expect(within(navigation).getByRole('button', { name })).toBeTruthy();
    }
    expect(container.querySelector('.welcome-steps')).toBeNull();
  });

  it('replaces the fixed portal hero with a session-stable library illustration', () => {
    const { container, rerender } = renderHome();
    const first = container.querySelector('[data-structural-asset-id]')?.getAttribute('data-structural-asset-id');

    expect(first).toBeTruthy();
    expect(first).toMatch(/^portal:/);
    expect(container.querySelector('.portal-hero')).toBeNull();

    rerender(
      <ProjectProvider>
        <WelcomeScreen onOpenWorkspace={() => undefined} onOpenSpace3D={() => undefined} />
      </ProjectProvider>,
    );
    expect(container.querySelector('[data-structural-asset-id]')?.getAttribute('data-structural-asset-id')).toBe(first);
  });

  it('keeps primary work explicit and secondary actions compact', () => {
    const { container } = renderHome();

    expect(screen.getByRole('button', { name: /Continuar proyecto/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Nuevo proyecto$/i })).toBeTruthy();
    expect(container.querySelector('[data-testid="home-secondary-actions"]')).toBeTruthy();
    expect(screen.queryByText(/Empieza en tres pasos/i)).toBeNull();
    expect(screen.queryByText(/Mesa/i)).toBeNull();
  });
});
