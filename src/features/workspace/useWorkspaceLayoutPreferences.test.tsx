// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_INSPECTOR_WIDTH,
  MIN_INSPECTOR_WIDTH,
  normalizeInspectorDetent,
  useWorkspaceLayoutPreferences,
  WORKSPACE_LAYOUT_STORAGE_KEY,
} from './useWorkspaceLayoutPreferences';

const Harness = () => {
  const { preferences, setPreference, togglePreference } = useWorkspaceLayoutPreferences();
  return <>
    <button onClick={() => togglePreference('fullCanvas')}>{preferences.fullCanvas ? 'full' : 'standard'}</button>
    <button onClick={() => togglePreference('inspectorCollapsed')}>{preferences.inspectorCollapsed ? 'closed' : 'open'}</button>
    <button onClick={() => setPreference('inspectorWidth', MAX_INSPECTOR_WIDTH + 100)}>Ancho {preferences.inspectorWidth}</button>
    <button onClick={() => setPreference('inspectorDetent', 'large')}>Altura {preferences.inspectorDetent}</button>
    <button onClick={() => setPreference('toolDockPosition', 'left')}>Dock {preferences.toolDockPosition}</button>
  </>;
};

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('useWorkspaceLayoutPreferences', () => {
  it('starts the Inspector closed for a fresh workspace', () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: 'closed' })).toBeTruthy();
  });

  it('migrates the old always-open Inspector preference without discarding other layout choices', () => {
    localStorage.setItem('structureco:workspace-layout:v1', JSON.stringify({ inspectorCollapsed: false, fullCanvas: true }));
    render(<Harness />);
    expect(screen.getByRole('button', { name: 'closed' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'full' })).toBeTruthy();
  });

  it('honors an explicit closed/open choice saved in the current layout version', () => {
    localStorage.setItem(WORKSPACE_LAYOUT_STORAGE_KEY, JSON.stringify({ inspectorCollapsed: false }));
    render(<Harness />);
    expect(screen.getByRole('button', { name: 'open' })).toBeTruthy();
  });

  it('falls back safely when storage is invalid', () => {
    localStorage.setItem(WORKSPACE_LAYOUT_STORAGE_KEY, '{invalid');
    render(<Harness />);
    expect(screen.getByRole('button', { name: 'standard' })).toBeTruthy();
  });

  it('persists presentation preferences without project state', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'standard' }));
    expect(screen.getByRole('button', { name: 'full' })).toBeTruthy();
    await waitFor(() => expect(JSON.parse(localStorage.getItem(WORKSPACE_LAYOUT_STORAGE_KEY) ?? '{}')).toMatchObject({ fullCanvas: true }));
  });

  it('sanitizes persisted inspector width and keeps resizing presentation-only', async () => {
    localStorage.setItem(WORKSPACE_LAYOUT_STORAGE_KEY, JSON.stringify({ inspectorWidth: MIN_INSPECTOR_WIDTH - 100 }));
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByRole('button', { name: `Ancho ${MIN_INSPECTOR_WIDTH}` })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: `Ancho ${MIN_INSPECTOR_WIDTH}` }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem(WORKSPACE_LAYOUT_STORAGE_KEY) ?? '{}')).toMatchObject({ inspectorWidth: MAX_INSPECTOR_WIDTH }));
  });

  it('sanitizes and persists the phone inspector detent outside project state', async () => {
    localStorage.setItem(WORKSPACE_LAYOUT_STORAGE_KEY, JSON.stringify({ inspectorDetent: 'unknown' }));
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.getByRole('button', { name: 'Altura medium' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Altura medium' }));

    await waitFor(() => expect(JSON.parse(localStorage.getItem(WORKSPACE_LAYOUT_STORAGE_KEY) ?? '{}')).toMatchObject({ inspectorDetent: 'large' }));
  });

  it('ignores a stored toolRailCompact without deleting it or invalidating the rest', async () => {
    // Rollout de CRI-89: la compacidad del riel se deriva de la clase, pero la
    // clave no sube de versión y nada se borra — revertir el slice devuelve al
    // usuario su preferencia intacta.
    localStorage.setItem(WORKSPACE_LAYOUT_STORAGE_KEY, JSON.stringify({
      toolRailCompact: true,
      inspectorWidth: 400,
      inspectorDetent: 'large',
      fullCanvas: true,
    }));
    const user = userEvent.setup();
    render(<Harness />);

    // El resto de la preferencia se sigue honrando exactamente igual.
    expect(screen.getByRole('button', { name: 'full' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ancho 400' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Altura large' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'full' }));
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(WORKSPACE_LAYOUT_STORAGE_KEY) ?? '{}');
      expect(stored).toMatchObject({ fullCanvas: false, inspectorWidth: 400, inspectorDetent: 'large' });
      // Sobrevive a una escritura posterior: se ignora, no se borra.
      expect(stored.toolRailCompact).toBe(true);
    });
  });

  it('normalizes an unavailable height after a phone orientation change', () => {
    expect(normalizeInspectorDetent('large', { width: 390, height: 844 })).toBe('large');
    expect(normalizeInspectorDetent('large', { width: 844, height: 390 })).toBe('medium');
    expect(normalizeInspectorDetent('medium', { width: 320, height: 300 })).toBe('compact');
  });

  it('defaults the dock below and persists the explicit left position', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByRole('button', { name: 'Dock bottom' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Dock bottom' }));
    expect(screen.getByRole('button', { name: 'Dock left' })).toBeTruthy();
    await waitFor(() => expect(JSON.parse(localStorage.getItem(WORKSPACE_LAYOUT_STORAGE_KEY) ?? '{}')).toMatchObject({ toolDockPosition: 'left' }));
  });
});
