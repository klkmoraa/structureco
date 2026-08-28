// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBlankProject, createDefaultProject } from '../../data/defaultProject';
import { PROJECT_STORAGE_KEY } from '../../data/projectStorage';
import { ProjectProvider } from '../../store/ProjectContext';
import { InMemoryProjectRepository } from '../../storage/projectRepository';
import { readWelcomeEntry, shouldResumeDirectly } from './welcomeEntry';
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

const renderWelcome = (language: 'es' | 'en' = 'es') => {
  const project = createBlankProject();
  project.settings = { ...project.settings, language };
  localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
  const onOpenWorkspace = vi.fn();
  const onOpenSpace3D = vi.fn();
  const result = render(<ProjectProvider><WelcomeScreen onOpenWorkspace={onOpenWorkspace} onOpenSpace3D={onOpenSpace3D} /></ProjectProvider>);
  return { ...result, onOpenWorkspace, onOpenSpace3D };
};

describe('WelcomeScreen · arquitectura nueva', () => {
  it('expone destinos claros y elimina el carril de onboarding', () => {
    const { container } = renderWelcome();
    const navigation = screen.getByRole('navigation', { name: 'Navegación principal' });
    ['Inicio', 'Proyectos', 'Plantillas', 'Biblioteca', 'Estudio de ilustraciones', 'Aula', 'Importar', 'Space 3D'].forEach((name) => {
      expect(within(navigation).getByRole('button', { name })).toBeTruthy();
    });
    expect(container.querySelector('.welcome-steps')).toBeNull();
    expect(screen.queryByText(/Empieza en tres pasos|Mesa/)).toBeNull();
  });

  it('mantiene continuar, nuevo proyecto y los tres accesos secundarios', () => {
    renderWelcome();
    expect(screen.getByRole('button', { name: 'Continuar proyecto' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Nuevo proyecto' })).toBeTruthy();
    const secondary = screen.getByTestId('home-secondary-actions');
    expect(within(secondary).getAllByRole('button')).toHaveLength(3);
  });

  it('mantiene importar archivo, DXF y Aula en superficies propias', async () => {
    const user = userEvent.setup();
    const navigation = () => screen.getByRole('navigation', { name: 'Navegación principal' });
    renderWelcome();

    await user.click(within(navigation()).getByRole('button', { name: 'Importar' }));
    expect(screen.getByRole('button', { name: /Importar archivo/ })).toBeTruthy();
    await waitFor(() => expect(screen.getByRole('button', { name: /DXF/ })).toBeTruthy());

    await user.click(within(navigation()).getByRole('button', { name: 'Aula' }));
    expect(screen.getByRole('button', { name: 'Crear desde cero' })).toBeTruthy();
  });

  it('presenta Space 3D con una vista estructural reconocible y una entrada directa', async () => {
    const user = userEvent.setup();
    const { container, onOpenSpace3D } = renderWelcome();
    const navigation = screen.getByRole('navigation', { name: 'Navegación principal' });

    await user.click(within(navigation).getByRole('button', { name: 'Space 3D' }));

    expect(container.querySelector('[data-structural-asset-id="space-frame:multi-bay"]')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Abrir Space 3D' }));
    expect(onOpenSpace3D).toHaveBeenCalledOnce();
  });

  it('continuar abre la Mesa sin sustituir el proyecto', async () => {
    const user = userEvent.setup();
    const { onOpenWorkspace } = renderWelcome();
    const heading = screen.getByRole('heading', { name: 'Proyecto sin título' }).textContent;
    await user.click(screen.getByRole('button', { name: 'Continuar proyecto' }));
    expect(onOpenWorkspace).toHaveBeenCalledOnce();
    expect(screen.getByRole('heading', { name: 'Proyecto sin título' }).textContent).toBe(heading);
  });
});

describe('welcomeEntry · quién está entrando', () => {
  it('un repositorio vacío es un usuario nuevo y no salta la portada', async () => {
    const entry = await readWelcomeEntry(new InMemoryProjectRepository());
    expect(entry).toEqual({ status: 'new', projects: 0, recoveries: 0 });
    expect(shouldResumeDirectly(entry)).toBe(false);
  });

  it('un repositorio con proyectos guardados es recurrente', async () => {
    const repository = new InMemoryProjectRepository();
    await repository.saveProject({ ...createDefaultProject(), name: 'Trabajo de ayer' });
    const entry = await readWelcomeEntry(repository);
    expect(entry.status).toBe('returning');
    expect(entry.projects).toBe(1);
    expect(shouldResumeDirectly(entry)).toBe(true);
  });

  it('una copia de recuperación pendiente impide el salto automático', async () => {
    const repository = new InMemoryProjectRepository();
    const project = { ...createDefaultProject(), name: 'Trabajo protegido' };
    await repository.saveProject(project);
    await repository.createRecovery(project, 'conflict');
    const entry = await readWelcomeEntry(repository);
    expect(entry.recoveries).toBe(1);
    expect(shouldResumeDirectly(entry)).toBe(false);
  });

  it('un repositorio que falla se trata como nuevo', async () => {
    const broken = {
      listProjects: () => Promise.reject(new Error('IndexedDB bloqueada')),
      listRecoveries: () => Promise.resolve([]),
    } as unknown as InMemoryProjectRepository;
    expect(await readWelcomeEntry(broken)).toEqual({ status: 'new', projects: 0, recoveries: 0 });
  });
});

describe('WelcomeScreen · salto directo', () => {
  it('no salta cuando el shell no lo permite', async () => {
    const onOpenWorkspace = vi.fn();
    render(<ProjectProvider><WelcomeScreen onOpenWorkspace={onOpenWorkspace} allowDirectResume={false} /></ProjectProvider>);
    await waitFor(() => expect(screen.getByTestId('welcome-screen')).toBeTruthy());
    expect(onOpenWorkspace).not.toHaveBeenCalled();
  });

  it('sin IndexedDB el usuario nuevo permanece en Home', async () => {
    const onOpenWorkspace = vi.fn();
    render(<ProjectProvider><WelcomeScreen onOpenWorkspace={onOpenWorkspace} allowDirectResume /></ProjectProvider>);
    await waitFor(() => expect(screen.getByTestId('welcome-screen')).toBeTruthy());
    expect(onOpenWorkspace).not.toHaveBeenCalled();
  });
});
