// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBlankProject } from '../../data/defaultProject';
import { PROJECT_STORAGE_KEY } from '../../data/projectStorage';
import { ProjectProvider } from '../../store/ProjectContext';
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

const renderWelcome = (language: 'es' | 'en') => {
  const project = createBlankProject();
  project.settings = { ...project.settings, language };
  localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
  return render(<ProjectProvider><WelcomeScreen onOpenWorkspace={vi.fn()} onOpenSpace3D={vi.fn()} /></ProjectProvider>);
};

describe.each([
  { language: 'es' as const, navigation: 'Navegación principal', settings: 'Ajustes', settingsDialog: 'Ajustes', studio: 'Estudio de ilustraciones', languageField: 'Idioma' },
  { language: 'en' as const, navigation: 'Primary navigation', settings: 'Settings', settingsDialog: 'Settings', studio: 'Illustration Studio', languageField: 'Language' },
])('WelcomeScreen navigation contract ($language)', ({ language, navigation, settings, settingsDialog, studio, languageField }) => {
  it('maps Settings to preferences and the named studio destination to Illustration Studio', async () => {
    const user = userEvent.setup();
    renderWelcome(language);
    const primaryNavigation = screen.getByRole('navigation', { name: navigation });
    const settingsLauncher = screen.getByRole('button', { name: settings });

    expect(within(primaryNavigation).getByRole('button', { name: studio })).toBeTruthy();
    await user.click(settingsLauncher);
    expect(screen.getByRole('dialog', { name: settingsDialog })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: languageField })).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: studio })).toBeNull();

    await user.keyboard('{Escape}');
    await user.click(within(primaryNavigation).getByRole('button', { name: studio }));
    expect(screen.getByRole('dialog', { name: studio })).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: settingsDialog })).toBeNull();
  });
});

describe('WelcomeScreen preferences', () => {
  it('keeps language and theme preferences functional from Settings', async () => {
    const user = userEvent.setup();
    renderWelcome('es');
    await user.click(screen.getByRole('button', { name: 'Ajustes' }));

    const beforeTheme = document.documentElement.getAttribute('data-theme');
    await user.click(screen.getByRole('button', { name: 'Oscuro' }));
    expect(document.documentElement.getAttribute('data-theme')).not.toBe(beforeTheme);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Idioma' }), 'en');

    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeTruthy();
    expect((screen.getByRole('combobox', { name: 'Language' }) as HTMLSelectElement).value).toBe('en');
    await user.click(screen.getByRole('button', { name: 'Close settings' }));
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeTruthy();
  });
});
