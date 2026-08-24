// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createBlankProject } from '../../data/defaultProject';
import { buildCommands, isOwnHistoryScope } from './commandRegistry';
import { onWorkspaceCommand } from './workspaceCommands';

/**
 * CRI-103 / G-01: the global Ctrl+Z / Ctrl+Y binding must stay silent inside
 * any surface with its own editing history — a text field, the Datasheet
 * grid, or a modal surface — so it never undoes a model operation while the
 * user meant to undo a cell edit.
 */
describe('isOwnHistoryScope', () => {
  it('is true for a text input', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    expect(isOwnHistoryScope(input)).toBe(true);
  });

  it('is true for a textarea', () => {
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    expect(isOwnHistoryScope(textarea)).toBe(true);
  });

  it('is true inside the Datasheet grid, demonstrating Ctrl+Z there does not reach global undo', () => {
    const grid = document.createElement('table');
    grid.setAttribute('role', 'grid');
    const cell = document.createElement('td');
    grid.appendChild(cell);
    document.body.appendChild(grid);

    expect(isOwnHistoryScope(cell)).toBe(true);
    expect(isOwnHistoryScope(grid)).toBe(true);
  });

  it('is true inside a modal surface with its own history', () => {
    const modal = document.createElement('div');
    modal.setAttribute('aria-modal', 'true');
    const button = document.createElement('button');
    modal.appendChild(button);
    document.body.appendChild(modal);

    expect(isOwnHistoryScope(button)).toBe(true);
  });

  it('is false for the canvas element and other plain workspace targets', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    document.body.appendChild(svg as unknown as Node);
    expect(isOwnHistoryScope(svg)).toBe(false);
    expect(isOwnHistoryScope(document.body)).toBe(false);
    expect(isOwnHistoryScope(null)).toBe(false);
  });
});

describe('revision comparison command', () => {
  it('projects one deferred Palette command onto the typed workspace bus', () => {
    const opened = vi.fn();
    const unsubscribe = onWorkspaceCommand('open-revision-comparison', opened);
    const commands = buildCommands({
      t: (key) => key,
      project: createBlankProject(),
      hasAnalysis: false,
      isAnalyzing: false,
      canUndo: false,
      canRedo: false,
      classroomMode: false,
      theme: 'light',
      setActiveTool: vi.fn(),
      setSelection: vi.fn(),
      setResultTab: vi.fn(),
      setTheme: vi.fn(),
      updateProjectView: vi.fn(),
      dispatchLayers: vi.fn(),
      analyze: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
    });
    const command = commands.find((item) => item.id === 'analysis:compare-revisions');

    expect(command).toMatchObject({ category: 'analysis', label: 'revision.title', disabled: false, deferredOpen: true });
    command?.run();
    expect(opened).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});
