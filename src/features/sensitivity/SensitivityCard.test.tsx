// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultProject, createHibbelerTributaryBeam } from '../../data/defaultProject';
import { saveProjectToStorage } from '../../data/projectStorage';
import { ProjectProvider } from '../../store/ProjectContext';
import { SensitivityCard } from './SensitivityCard';

beforeEach(() => {
  localStorage.clear();
  saveProjectToStorage(localStorage, createHibbelerTributaryBeam());
  vi.stubGlobal('Worker', undefined);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('SensitivityCard', () => {
  it('shows three variants and declares that the model does not change', async () => {
    const user = userEvent.setup();
    render(<ProjectProvider><SensitivityCard /></ProjectProvider>);

    await user.click(screen.getByRole('button', { name: /calcular sensibilidad/i }));

    await waitFor(() => expect(screen.getByText(/−10 %/i)).toBeTruthy(), { timeout: 10_000 });
    expect(screen.getByText(/no cambia el modelo/i)).toBeTruthy();
    expect(screen.getByText(/base/i)).toBeTruthy();
  }, 15_000);

  it('marks every unsolved variant as unavailable instead of showing empty metrics', async () => {
    const project = createHibbelerTributaryBeam();
    project.nodes = project.nodes.map((node) => ({ ...node, support: { type: 'none' } }));
    saveProjectToStorage(localStorage, project);
    const user = userEvent.setup();

    render(<ProjectProvider><SensitivityCard /></ProjectProvider>);
    await user.click(screen.getByRole('button', { name: /calcular sensibilidad/i }));

    await waitFor(() => expect(screen.getAllByText('No disponible')).toHaveLength(3), { timeout: 10_000 });
    expect(screen.getAllByText(/Agrega apoyos para impedir los movimientos rígidos/i)).toHaveLength(3);
  }, 15_000);

  it('clears a completed study when the selected property changes', async () => {
    saveProjectToStorage(localStorage, createDefaultProject());
    const user = userEvent.setup();

    render(<ProjectProvider><SensitivityCard /></ProjectProvider>);
    await user.click(screen.getByRole('button', { name: /calcular sensibilidad/i }));
    await waitFor(() => expect(screen.getByTestId('sensitivity-card').querySelector('.sensitivity-points')).not.toBeNull(), { timeout: 10_000 });

    await user.selectOptions(screen.getAllByRole('combobox')[1], 'E');

    expect(screen.getByTestId('sensitivity-card').querySelector('.sensitivity-points')).toBeNull();
  }, 15_000);
});
