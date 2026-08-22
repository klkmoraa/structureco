// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('closes mobile navigation with Escape and returns focus to its menu button', async () => {
    const user = userEvent.setup();
    renderHome();
    const menuButton = screen.getByRole('button', { name: 'Abrir navegación' });

    await user.click(menuButton);
    expect(menuButton.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getAllByRole('navigation', { name: 'Navegación principal' })).toHaveLength(2);

    await user.keyboard('{Escape}');

    expect(menuButton.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getAllByRole('navigation', { name: 'Navegación principal' })).toHaveLength(1);
    expect(document.activeElement).toBe(menuButton);
  });

  it('toggles mobile navigation state and closes it after selecting a destination', async () => {
    const user = userEvent.setup();
    const { container } = renderHome();
    const menuButton = screen.getByRole('button', { name: 'Abrir navegación' });

    expect(menuButton.getAttribute('aria-expanded')).toBe('false');
    await user.click(menuButton);
    expect(menuButton.getAttribute('aria-expanded')).toBe('true');

    const mobileNavigation = container.querySelector('.sc-home-nav--mobile');
    expect(mobileNavigation).not.toBeNull();
    await user.click(within(mobileNavigation as HTMLElement).getByRole('button', { name: 'Plantillas' }));

    expect(menuButton.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('.sc-home-nav--mobile')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Elige una estructura de partida' })).toBeTruthy();
  });

  it('opens the full Illustration Studio from desktop Settings and returns focus after Escape', async () => {
    const user = userEvent.setup();
    renderHome();
    const launcher = screen.getByRole('button', { name: 'Ajustes' });
    await user.click(launcher);
    expect(screen.getByRole('dialog', { name: 'Estudio de ilustraciones' })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cerrar estudio' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Estudio de ilustraciones' })).toBeNull();
    expect(document.activeElement).toBe(launcher);
  });

  it('includes Settings in the existing mobile navigation menu', async () => {
    const user = userEvent.setup();
    const { container } = renderHome();
    await user.click(screen.getByRole('button', { name: 'Abrir navegación' }));
    const mobileNavigation = container.querySelector('.sc-home-nav--mobile') as HTMLElement;
    await user.click(within(mobileNavigation).getByRole('button', { name: 'Ajustes' }));
    expect(screen.getByRole('dialog', { name: 'Estudio de ilustraciones' })).toBeTruthy();
    expect(container.querySelector('.sc-home-nav--mobile')).toBeNull();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Estudio de ilustraciones' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Abrir navegación' }));
  });

  it('makes Home inert and aria-hidden while the Studio modal is open', async () => {
    const user = userEvent.setup();
    renderHome();
    await user.click(screen.getByRole('button', { name: 'Ajustes' }));
    const home = screen.getByTestId('welcome-screen');
    expect(home.inert).toBe(true);
    expect(home.getAttribute('aria-hidden')).toBe('true');
    await user.keyboard('{Escape}');
    expect(home.inert).toBeFalsy();
    expect(home.hasAttribute('aria-hidden')).toBe(false);
  });
});
