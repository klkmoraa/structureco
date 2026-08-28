// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBlankProject } from '../../data/defaultProject';
import { PROJECT_STORAGE_KEY } from '../../data/projectStorage';
import { ProjectProvider } from '../../store/ProjectContext';
import { WelcomeScreen } from './WelcomeScreen';

const homeCss = readFileSync('src/features/welcome/totalHome.css', 'utf8');
const globalCss = readFileSync('src/styles.css', 'utf8');

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
  it('keeps retired welcome selectors out of the global stylesheet', () => {
    expect(globalCss).not.toMatch(/\.welcome-[a-z0-9_-]+/i);
    expect(homeCss).not.toMatch(/\.(?:welcome-screen|welcome-header|welcome-workflow)(?:[^a-z0-9_-]|$)/i);
  });

  it('keeps compact Home options in the vertical reading flow instead of hidden horizontal carousels', () => {
    const compactStart = homeCss.indexOf('@media (max-width: 760px)');
    const compactEnd = homeCss.indexOf('@media (max-width: 340px)');
    const compactCss = homeCss.slice(compactStart, compactEnd);

    expect(compactStart).toBeGreaterThanOrEqual(0);
    expect(compactEnd).toBeGreaterThan(compactStart);
    expect(compactCss).toMatch(/\.sc-home-quick-row\s*{[^}]*display:\s*grid;/s);
    expect(compactCss).toMatch(/\.sc-home \.sc-home-recents \.project-hub--recent \.project-hub__list\s*{[^}]*display:\s*grid;/s);
    expect(compactCss).toMatch(/\.sc-home-template-grid\s*{[^}]*display:\s*grid;/s);
    expect(compactCss).not.toMatch(/\.sc-home-(?:quick-row|template-grid)[^{]*{[^}]*overflow-x:\s*auto;/s);
    expect(compactCss).not.toMatch(/\.project-hub__list\s*{[^}]*overflow-x:\s*auto;/s);
  });

  it('exposes named Home destinations without a decorative step rail', () => {
    const { container } = renderHome();
    const navigation = screen.getByRole('navigation', { name: 'Navegación principal' });

    expect(navigation).toBeTruthy();
    for (const name of ['Inicio', 'Proyectos', 'Plantillas', 'Biblioteca', 'Estudio de ilustraciones', 'Aula', 'Importar', 'Space 3D']) {
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

  it('opens the personal library as its own Home destination', async () => {
    const user = userEvent.setup();
    renderHome();
    const navigation = screen.getByRole('navigation', { name: 'Navegación principal' });

    await user.click(within(navigation).getByRole('button', { name: 'Biblioteca' }));

    expect(screen.getByRole('heading', { name: 'Biblioteca personal' })).toBeTruthy();
    expect(screen.getByText(/No son un catálogo normativo/)).toBeTruthy();
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

  it('opens real preferences from desktop Settings and returns focus after Escape', async () => {
    const user = userEvent.setup();
    renderHome();
    const launcher = screen.getByRole('button', { name: 'Ajustes' });
    await user.click(launcher);
    expect(screen.getByRole('dialog', { name: 'Ajustes' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Idioma' })).toBeTruthy();
    expect((screen.getByRole('checkbox', { name: /Guardar mediciones locales/i }) as HTMLInputElement).checked).toBe(false);
    expect(screen.queryByRole('dialog', { name: 'Estudio de ilustraciones' })).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cerrar ajustes' })));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Ajustes' })).toBeNull();
    expect(document.activeElement).toBe(launcher);
  });

  it('includes real Settings in the existing mobile navigation menu', async () => {
    const user = userEvent.setup();
    const { container } = renderHome();
    await user.click(screen.getByRole('button', { name: 'Abrir navegación' }));
    const mobileNavigation = container.querySelector('.sc-home-nav--mobile') as HTMLElement;
    await user.click(within(mobileNavigation).getByRole('button', { name: 'Ajustes' }));
    expect(screen.getByRole('dialog', { name: 'Ajustes' })).toBeTruthy();
    expect(container.querySelector('.sc-home-nav--mobile')).toBeNull();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Ajustes' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Abrir navegación' }));
  });

  it('makes Home inert and aria-hidden while the Studio modal is open', async () => {
    const user = userEvent.setup();
    renderHome();
    await user.click(screen.getByRole('button', { name: 'Estudio de ilustraciones' }));
    const home = screen.getByTestId('welcome-screen');
    expect(home.inert).toBe(true);
    expect(home.getAttribute('aria-hidden')).toBe('true');
    await user.keyboard('{Escape}');
    expect(home.inert).toBeFalsy();
    expect(home.hasAttribute('aria-hidden')).toBe(false);
  });
});
