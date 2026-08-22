// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBlankProject, exampleProjects } from '../../data/defaultProject';
import { PROJECT_STORAGE_KEY } from '../../data/projectStorage';
import { ProjectProvider } from '../../store/ProjectContext';
import { ClassroomSessionProvider } from '../../store/ClassroomSessionContext';
import { WelcomeScreen } from './WelcomeScreen';

beforeAll(() => {
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 0);
    window.cancelAnimationFrame = (handle: number) => window.clearTimeout(handle);
  }
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  });
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => cleanup());

const renderWelcome = (language: 'es' | 'en' = 'es', base = createBlankProject()) => {
  const project = structuredClone(base);
  project.settings = { ...project.settings, language };
  localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
  const onOpenWorkspace = vi.fn();
  const onOpenSpace3D = vi.fn();
  const result = render(
    <ProjectProvider>
      <ClassroomSessionProvider projectId="welcome-test">
        <WelcomeScreen onOpenWorkspace={onOpenWorkspace} onOpenSpace3D={onOpenSpace3D} />
      </ClassroomSessionProvider>
    </ProjectProvider>,
  );
  return { ...result, onOpenWorkspace, onOpenSpace3D };
};

const primaryNavigation = () => screen.getByRole('navigation', { name: /Navegación principal|Primary navigation/i });

describe('WelcomeScreen · plantillas estructurales', () => {
  it('muestra todos los ejemplos con una ilustración editable del registro', async () => {
    const user = userEvent.setup();
    const { container } = renderWelcome();
    await user.click(within(primaryNavigation()).getByRole('button', { name: 'Plantillas' }));

    const cards = [...container.querySelectorAll('.sc-home-template-grid > button')];
    expect(cards).toHaveLength(exampleProjects.length);
    cards.forEach((card) => expect(card.querySelector('[data-structural-asset-id]')).not.toBeNull());
  });

  it('abre la Mesa con la plantilla elegida', async () => {
    const user = userEvent.setup();
    const { container, onOpenWorkspace } = renderWelcome();
    await user.click(within(primaryNavigation()).getByRole('button', { name: 'Plantillas' }));
    await user.click(container.querySelector('.sc-home-template-grid > button') as HTMLElement);
    expect(onOpenWorkspace).toHaveBeenCalledOnce();
  });
});

describe('WelcomeScreen · Space 3D', () => {
  it('abre primero su sección y sólo entra al entorno con la acción explícita', async () => {
    const user = userEvent.setup();
    const { onOpenSpace3D, onOpenWorkspace } = renderWelcome();

    await user.click(within(primaryNavigation()).getByRole('button', { name: 'Space 3D' }));
    expect(onOpenSpace3D).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Construye en tres dimensiones' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Abrir Space 3D' }));
    expect(onOpenSpace3D).toHaveBeenCalledOnce();
    expect(onOpenWorkspace).not.toHaveBeenCalled();
  });

  it('localiza la sección completa al inglés', async () => {
    const user = userEvent.setup();
    renderWelcome('en');
    await user.click(within(primaryNavigation()).getByRole('button', { name: 'Space 3D' }));
    expect(screen.getByRole('heading', { name: 'Build in three dimensions' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open Space 3D' })).toBeTruthy();
  });
});

describe('WelcomeScreen · proyecto actual', () => {
  it('usa el nombre real del proyecto y acciones primarias separadas', () => {
    const example = exampleProjects[0].build();
    renderWelcome('es', example);
    expect(screen.getByRole('heading', { name: example.name })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continuar proyecto' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Nuevo proyecto' })).toBeTruthy();
  });

  it('mantiene la ilustración hero estable durante la sesión', () => {
    const { container, rerender } = renderWelcome();
    const first = container.querySelector('.sc-home-hero-asset [data-structural-asset-id]')?.getAttribute('data-structural-asset-id');
    rerender(<ProjectProvider><ClassroomSessionProvider projectId="welcome-test"><WelcomeScreen onOpenWorkspace={vi.fn()} /></ClassroomSessionProvider></ProjectProvider>);
    expect(container.querySelector('.sc-home-hero-asset [data-structural-asset-id]')?.getAttribute('data-structural-asset-id')).toBe(first);
  });
});
