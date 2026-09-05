// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBlankProject } from '../../data/defaultProject';
import { PROJECT_STORAGE_KEY } from '../../data/projectStorage';
import { ProjectProvider } from '../../store/ProjectContext';
import { WelcomeScreen } from './WelcomeScreen';

beforeEach(() => {
  localStorage.clear();
  const project = createBlankProject();
  project.settings.language = 'es';
  localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });
});
afterEach(cleanup);
const setup = () => { render(<ProjectProvider><WelcomeScreen onOpenWorkspace={vi.fn()} /></ProjectProvider>); return userEvent.setup(); };

describe('Studio Home workflows', () => {
  it('opens a destination from the global keyboard search', async () => {
    const user = setup();
    await user.keyboard('{Control>}k{/Control}');
    const dialog = screen.getByRole('dialog', { name: 'Buscar herramientas' });
    await user.type(within(dialog).getByRole('combobox'), 'plantillas');
    await user.keyboard('{Enter}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Elige una estructura de partida' })).toBeTruthy();
  });
  it('returns focus to the persistent search trigger after keyboard navigation replaces the current view', async () => {
    const user = setup();
    await user.click(within(screen.getByRole('navigation')).getByRole('button', { name: 'Plantillas' }));
    const templateSearch = screen.getByRole('textbox', { name: 'Buscar plantillas' });
    templateSearch.focus();
    await user.keyboard('{Control>}k{/Control}');
    await user.type(screen.getByRole('combobox', { name: 'Buscar herramientas' }), 'proyectos');
    await user.keyboard('{Enter}');
    expect(screen.getByRole('heading', { name: 'Tus proyectos' })).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: /Buscar herramientas/ })));
  });
  it('returns focus to the search trigger when Escape closes the dialog', async () => {
    const user = setup();
    await user.click(within(screen.getByRole('navigation')).getByRole('button', { name: 'Plantillas' }));
    screen.getByRole('textbox', { name: 'Buscar plantillas' }).focus();
    const trigger = screen.getByRole('button', { name: /Buscar herramientas/ });
    await user.keyboard('{Control>}k{/Control}');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
  it('combines family and text filters and recovers from no matches', async () => {
    const user = setup();
    await user.click(within(screen.getByRole('navigation')).getByRole('button', { name: 'Plantillas' }));
    await user.click(screen.getByRole('button', { name: 'Vigas' }));
    expect(document.querySelectorAll('.welcome-template-card')).toHaveLength(3);
    await user.type(screen.getByRole('textbox', { name: 'Buscar plantillas' }), 'imposible');
    expect(document.querySelectorAll('.welcome-template-card')).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Restablecer filtros' }));
    expect(document.querySelectorAll('.welcome-template-card')).toHaveLength(6);
    await user.click(screen.getByRole('button', { name: 'Pórticos' }));
    expect(document.querySelectorAll('.welcome-template-card')).toHaveLength(1);
  });
  it('does not layer search over preferences', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Ajustes' }));
    await user.keyboard('{Control>}k{/Control}');
    expect(screen.queryByRole('dialog', { name: 'Buscar herramientas' })).toBeNull();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });
});
