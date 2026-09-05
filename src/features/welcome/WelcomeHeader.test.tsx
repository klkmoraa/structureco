// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectProvider } from '../../store/ProjectContext';
import { WelcomeScreen } from './WelcomeScreen';

// `WelcomeScreen` usa `useReducedMotion` de `motion/react` (vía `StructuralPortalHero`
// y las tarjetas animadas), que consulta `matchMedia` al montar. jsdom no lo implementa
// por defecto, así que sin este mock el montaje falla antes de llegar a la cabecera —
// el mismo motivo por el que `WelcomeScreen.test.tsx` lo trae en su `beforeAll`.
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

const renderWelcome = () =>
  render(<ProjectProvider><WelcomeScreen onOpenWorkspace={() => {}} /></ProjectProvider>);

describe('WelcomeScreen header', () => {
  it('toggles the theme from the welcome screen', async () => {
    const user = userEvent.setup();
    renderWelcome();
    const before = document.documentElement.getAttribute('data-theme');
    await user.click(screen.getByRole('button', { name: /tema|theme/i }));
    expect(document.documentElement.getAttribute('data-theme')).not.toBe(before);
  });

  it('changes the language from the welcome screen', async () => {
    const user = userEvent.setup();
    renderWelcome();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Idioma' }), 'en');

    expect(await screen.findByRole('navigation', { name: 'Primary navigation' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Projects' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Language' })).toBeTruthy();
  });

  it('keeps the wordmark on one line and gives Studio one clear page heading', () => {
    const { container } = renderWelcome();

    const wordmarks = [...container.querySelectorAll('.sc-home-wordmark strong')];
    expect(wordmarks).toHaveLength(2);
    for (const wordmark of wordmarks) {
      expect(wordmark.textContent?.trim()).toBe('structureCo');
      expect(wordmark.querySelectorAll('span')).toHaveLength(1);
      expect(wordmark.querySelector('br')).toBeNull();
    }
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Tu próximo modelo empieza aquí.');
    expect(container.querySelector('.welcome-brand-line')).toBeNull();
    expect(container.querySelector('.welcome-title-accent')).toBeNull();
    expect(container.querySelector('.welcome-hero-subtitle')).toBeNull();
  });

  it('exposes accessible mobile navigation and returns focus when Escape closes it', async () => {
    const user = userEvent.setup();
    renderWelcome();
    const trigger = screen.getByRole('button', { name: 'Abrir navegación' });

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    await user.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getAllByRole('navigation', { name: 'Navegación principal' })).toHaveLength(2);
    expect(screen.queryByRole('dialog')).toBeNull();

    await user.keyboard('{Escape}');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getAllByRole('navigation', { name: 'Navegación principal' })).toHaveLength(1);
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it('exposes exactly one accessible theme control and one language control while mobile navigation is open', async () => {
    const user = userEvent.setup();
    renderWelcome();

    await user.click(screen.getByRole('button', { name: 'Abrir navegación' }));
    expect(screen.getAllByRole('navigation', { name: 'Navegación principal' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /tema|theme/i })).toHaveLength(1);
    expect(screen.getAllByRole('combobox', { name: /idioma|language/i })).toHaveLength(1);
  });
});
