// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
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

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

const renderWelcome = (language: 'es' | 'en' = 'es') => {
  const project = createBlankProject();
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

const templateCards = (container: HTMLElement) => [...container.querySelectorAll('.welcome-template-card')];

/**
 * CRI-104 · la bienvenida es un recorrido de cuatro pasos y la vitrina de
 * ejemplos, la importación y Space 3D viven en la tercera etapa ("Por dónde").
 * Las pruebas que las miran navegan hasta allí igual que lo haría alguien con
 * el teclado: pulsando el paso en el carril.
 */
const openWhereStep = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /por dónde|where to start/i }));
};

describe('WelcomeScreen template showcase', () => {
  it('lists every built-in example with a category badge', async () => {
    const user = userEvent.setup();
    const { container } = renderWelcome();
    await openWhereStep(user);

    const cards = templateCards(container);
    expect(cards).toHaveLength(exampleProjects.length);
    for (const card of cards) {
      expect(card.querySelector('.welcome-category-badge')?.textContent?.trim()).toBeTruthy();
    }
  });

  it('filters templates by category and restores the full list', async () => {
    const user = userEvent.setup();
    const { container } = renderWelcome();
    await openWhereStep(user);
    const total = exampleProjects.length;

    await user.click(screen.getByRole('tab', { name: 'Académicos' }));
    await waitFor(() => expect(templateCards(container).length).toBeLessThan(total));
    const academic = templateCards(container);
    expect(academic.length).toBeGreaterThan(0);
    for (const card of academic) {
      expect(card.querySelector('.welcome-category-badge')?.textContent).toContain('Académico');
    }

    await user.click(screen.getByRole('tab', { name: 'Modelos' }));
    await waitFor(() => expect(templateCards(container).length).toBe(total - academic.length));
    for (const card of templateCards(container)) {
      expect(card.querySelector('.welcome-category-badge')?.textContent).not.toContain('Académico');
    }

    await user.click(screen.getByRole('tab', { name: 'Todos' }));
    await waitFor(() => expect(templateCards(container)).toHaveLength(total));
  });

  it('marks the active filter for assistive technology', async () => {
    const user = userEvent.setup();
    renderWelcome();
    await openWhereStep(user);

    expect(screen.getByRole('tab', { name: 'Todos' }).getAttribute('aria-selected')).toBe('true');
    await user.click(screen.getByRole('tab', { name: 'Académicos' }));
    expect(screen.getByRole('tab', { name: 'Académicos' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: 'Todos' }).getAttribute('aria-selected')).toBe('false');
  });

  it('opens the workspace with the chosen template loaded', async () => {
    const user = userEvent.setup();
    const { container, onOpenWorkspace } = renderWelcome();
    await openWhereStep(user);

    const [firstCard] = templateCards(container);
    await user.click(firstCard);

    expect(onOpenWorkspace).toHaveBeenCalledOnce();
  });
});

describe('WelcomeScreen launcher', () => {
  it('offers Space 3D as the only 3D surface on the start screen', async () => {
    const user = userEvent.setup();
    renderWelcome();
    await openWhereStep(user);
    expect(screen.queryByRole('button', { name: /experimental 3d/i })).toBeNull();
    expect(screen.getAllByRole('button', { name: /space 3d/i })).toHaveLength(1);
  });

  it('opens Space 3D as a surface of its own, without touching the 2D project', async () => {
    const user = userEvent.setup();
    const { onOpenSpace3D, onOpenWorkspace } = renderWelcome();
    await openWhereStep(user);

    const card = screen.getByRole('button', { name: /space 3d/i });
    expect(card.textContent).toMatch(/experimental/i);
    await user.click(card);

    expect(onOpenSpace3D).toHaveBeenCalledOnce();
    expect(onOpenWorkspace).not.toHaveBeenCalled();
  });

  it('describes Space 3D in English too', async () => {
    const user = userEvent.setup();
    renderWelcome('en');
    await openWhereStep(user);
    expect(screen.getByRole('button', { name: /space 3d/i }).textContent)
      .toMatch(/six degrees of freedom|space frame/i);
  });

  it('reports the current project size on the continue card', () => {
    const { container } = renderWelcome();
    const resume = container.querySelector('.welcome-resume-card');

    // A blank project starts empty; the card must state that rather than omit the counts.
    expect(resume?.querySelector('.welcome-project-stats')?.textContent).toBe('0 nudos · 0 barras');
  });

  it('localizes the launcher and filters in English', async () => {
    const user = userEvent.setup();
    const { container } = renderWelcome('en');

    expect(container.querySelector('.welcome-resume-card .welcome-project-stats')?.textContent)
      .toBe('0 nodes · 0 members');

    await openWhereStep(user);
    expect(screen.getByRole('tab', { name: 'All' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Academic' })).toBeTruthy();
    expect(within(container).queryByText('Académicos')).toBeNull();
  });
});
