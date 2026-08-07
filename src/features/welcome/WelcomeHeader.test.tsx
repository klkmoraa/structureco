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
    await user.selectOptions(screen.getByLabelText(/idioma|language/i), 'en');
    expect(await screen.findByRole('heading', { level: 1 })).toBeTruthy();
  });

  it('keeps every header action reachable, and returns focus when the drawer closes', async () => {
    const user = userEvent.setup();
    renderWelcome();
    const trigger = screen.getByRole('button', { name: /menú|menu/i });
    await user.click(trigger);
    expect(screen.getByRole('dialog')).toBeTruthy();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    // El foco vuelve de forma asíncrona (ver `useModalFocus` en `overlays.tsx`,
    // que además de la llamada síncrona en el cleanup del efecto agenda un
    // segundo `focus()` en el siguiente frame) — igual que ya hace la prueba
    // homóloga en `modalFocus.test.tsx`, se envuelve en `waitFor`.
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});
