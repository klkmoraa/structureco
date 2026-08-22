// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultProject } from '../../data/defaultProject';
import { ProjectProvider, useProject } from '../../store/ProjectContext';
import type { Selection } from '../../types';
import { createEditorLayerState } from './editorLayers';
import { StructuralCanvas } from './StructuralCanvas';
import { emitWorkspaceCommand } from '../workspace/workspaceCommands';

class ResizeObserverMock {
  observe() {}
  disconnect() {}
  unobserve() {}
}

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  if (!document.elementsFromPoint) Object.defineProperty(document, 'elementsFromPoint', { configurable: true, value: () => [] });
});

beforeEach(() => {
  localStorage.clear();
  const project = createDefaultProject();
  const member = project.members.find((candidate) => candidate.id === 'M1');
  if (!member) throw new Error('The default fixture must contain M1.');
  member.materialId = 'steel-a36';
  member.materialOrigin = 'catalog';
  member.sectionId = 'w310x39';
  member.sectionOrigin = 'catalog';
  localStorage.setItem('structureCo.project', JSON.stringify(project));
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  });
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const Harness = () => {
  const { project, setSelection } = useProject();
  const select = (selection: Selection) => setSelection(selection);
  return <>
    <output aria-label="project-model">{JSON.stringify(project)}</output>
    <button onClick={() => select({ kind: 'member', id: 'M1' })}>select-M1</button>
    <button onClick={() => select(null)}>clear-selection</button>
    <StructuralCanvas layers={createEditorLayerState()} dispatchLayers={() => undefined} />
  </>;
};

const renderCanvas = () => render(<ProjectProvider><Harness /></ProjectProvider>);
const model = () => JSON.parse(screen.getByLabelText('project-model').textContent ?? '{}') as ReturnType<typeof createDefaultProject>;

describe('StructuralCanvas selection actions', () => {
  it('does not add a floating action toolbar over the canvas', async () => {
    const user = userEvent.setup();
    renderCanvas();
    expect(screen.queryByRole('toolbar', { name: 'Acciones de la selección' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'select-M1' }));
    expect(model().members).toHaveLength(3);
    expect(document.querySelector('[data-structural-edit-launcher]')).toBeNull();
    expect(screen.queryByRole('toolbar', { name: 'Acciones de la selección' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'clear-selection' }));
    expect(screen.queryByRole('toolbar', { name: 'Acciones de la selección' })).toBeNull();
  });

  it('keeps the structural edit command route available without the floating toolbar', async () => {
    const user = userEvent.setup();
    renderCanvas();
    await user.click(screen.getByRole('button', { name: 'select-M1' }));
    await waitFor(() => {
      emitWorkspaceCommand('open-structural-edit');
      expect(screen.getByRole('region', { name: /edición estructural/i })).toBeTruthy();
    });
    expect(screen.queryByRole('toolbar', { name: 'Acciones de la selección' })).toBeNull();
  });
});
