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
    <button onClick={() => setPreference('inspectorWidth', MAX_INSPECTOR_WIDTH + 100)}>Ancho {preferences.inspectorWidth}</button>
    <button onClick={() => setPreference('inspectorDetent', 'large')}>Altura {preferences.inspectorDetent}</button>
  </>;
};

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('useWorkspaceLayoutPreferences', () => {
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

  it('normalizes an unavailable height after a phone orientation change', () => {
    expect(normalizeInspectorDetent('large', { width: 390, height: 844 })).toBe('large');
    expect(normalizeInspectorDetent('large', { width: 844, height: 390 })).toBe('medium');
    expect(normalizeInspectorDetent('medium', { width: 320, height: 300 })).toBe('compact');
  });
});
