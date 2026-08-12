// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDefaultProject } from '../data/defaultProject';
import { ProjectProvider, useProject } from './ProjectContext';
import type { ProjectCommand } from '../commands/projectCommand';

const TransactionHarness = () => {
  const {
    project,
    canUndo,
    beginProjectTransaction,
    updateProjectTransient,
    commitProjectTransaction,
    cancelProjectTransaction,
    undo,
  } = useProject();
  const move = () => updateProjectTransient((draft) => {
    draft.nodes[0].x += 1;
    return draft;
  });
  return <>
    <output aria-label="x-coordinate">{project.nodes[0].x}</output>
    <output aria-label="can-undo">{String(canUndo)}</output>
    <button onClick={() => beginProjectTransaction()}>begin</button>
    <button onClick={move}>move</button>
    <button onClick={commitProjectTransaction}>commit</button>
    <button onClick={cancelProjectTransaction}>cancel</button>
    <button onClick={undo}>undo</button>
  </>;
};

const AnalysisHarness = () => {
  const { project, analysis, analyze, updateProject, setSelectedCombinationId, canUndo, undo } = useProject();
  return <>
    <output aria-label="analysis-state">{analysis ? (analysis.success ? 'success' : 'failed') : 'none'}</output>
    <output aria-label="analysis-node-count">{project.nodes.length}</output>
    <output aria-label="analysis-member-count">{project.members.length}</output>
    <output aria-label="analysis-issues">{analysis?.issues.map((issue) => issue.id).join(',') ?? ''}</output>
    <output aria-label="analysis-can-undo">{String(canUndo)}</output>
    <button onClick={analyze}>analyze</button>
    <button onClick={() => updateProject((draft) => ({ ...draft, name: `${draft.name} editado` }))}>edit</button>
    <button onClick={() => setSelectedCombinationId(project.combinations[0]?.id ?? '')}>combination</button>
    <button onClick={undo}>undo-analysis</button>
  </>;
};

const DirectHistoryHarness = () => {
  const { project, canUndo, updateProject, undo } = useProject();
  return <><output aria-label="node-count">{project.nodes.length}</output><output aria-label="direct-can-undo">{String(canUndo)}</output><button onClick={() => updateProject((draft) => { draft.nodes.push({ id: `N${draft.nodes.length + 1}`, x: 9, y: 9, support: { type: 'none' } }); return draft; })}>add-direct</button><button onClick={undo}>undo-direct</button></>;
};

const AnalysisSettingsHarness = () => {
  const {
    project,
    analysis,
    isAnalyzing,
    canUndo,
    canRedo,
    analyze,
    updateProject,
    updateProjectAnalysisSettings,
    updateProjectView,
    undo,
    redo,
  } = useProject();
  return <>
    <output aria-label="settings-analysis-state">{analysis ? (analysis.success ? 'success' : 'failed') : 'none'}</output>
    <output aria-label="settings-is-analyzing">{String(isAnalyzing)}</output>
    <output aria-label="settings-analysis-mode">{project.settings.analysisMode ?? 'first-order'}</output>
    <output aria-label="settings-max-load-steps">{project.settings.pDeltaConfig?.maxLoadSteps ?? ''}</output>
    <output aria-label="settings-project-name">{project.name}</output>
    <output aria-label="settings-can-undo">{String(canUndo)}</output>
    <output aria-label="settings-can-redo">{String(canRedo)}</output>
    <button onClick={analyze}>settings-analyze</button>
    <button onClick={() => updateProjectAnalysisSettings((settings) => ({ ...settings, analysisMode: 'p-delta' }))}>settings-p-delta</button>
    <button onClick={() => updateProjectAnalysisSettings((settings) => ({
      ...settings,
      pDeltaConfig: { ...settings.pDeltaConfig, maxLoadSteps: 17 },
    }))}>settings-p-delta-steps</button>
    <button onClick={() => updateProjectView((draft) => ({
      ...draft,
      settings: { ...draft.settings, units: 'N-mm' },
    }))}>settings-view-preference</button>
    <button onClick={() => updateProject((draft) => ({ ...draft, name: 'Proyecto editado' }))}>settings-edit</button>
    <button onClick={undo}>settings-undo</button>
    <button onClick={redo}>settings-redo</button>
  </>;
};

const CommandHistoryHarness = () => {
  const { project, canUndo, canRedo, executeProjectCommand, undo, redo } = useProject();
  const createMember = async () => {
    const source = project.members[0];
    const command: ProjectCommand = {
      kind: 'member.create', description: 'Crear miembro command', nodes: [],
      member: { ...structuredClone(source), id: 'M-command', i: source.i, j: source.j },
    };
    await executeProjectCommand(command);
  };
  return <>
    <output aria-label="command-members">{project.members.length}</output>
    <output aria-label="command-undo">{String(canUndo)}</output>
    <output aria-label="command-redo">{String(canRedo)}</output>
    <button onClick={createMember}>command-create</button>
    <button onClick={undo}>command-undo-action</button>
    <button onClick={redo}>command-redo-action</button>
  </>;
};

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

describe('ProjectContext transactions', () => {
  it('records one reversible history entry for one command intention', async () => {
    const user = userEvent.setup();
    localStorage.setItem('structureCo.project', JSON.stringify(createDefaultProject()));
    render(<ProjectProvider><CommandHistoryHarness /></ProjectProvider>);
    const initial = Number(screen.getByLabelText('command-members').textContent);
    await user.click(screen.getByText('command-create'));
    expect(Number(screen.getByLabelText('command-members').textContent)).toBe(initial + 1);
    expect(screen.getByLabelText('command-undo').textContent).toBe('true');
    await user.click(screen.getByText('command-undo-action'));
    expect(Number(screen.getByLabelText('command-members').textContent)).toBe(initial);
    expect(screen.getByLabelText('command-redo').textContent).toBe('true');
    await user.click(screen.getByText('command-redo-action'));
    expect(Number(screen.getByLabelText('command-members').textContent)).toBe(initial + 1);
  });

  it('keeps direct edit history correct under React StrictMode', async () => {
    const user = userEvent.setup();
    localStorage.setItem('structureCo.project', JSON.stringify(createDefaultProject()));
    render(<StrictMode><ProjectProvider><DirectHistoryHarness /></ProjectProvider></StrictMode>);
    const initial = Number(screen.getByLabelText('node-count').textContent);
    await user.click(screen.getByText('add-direct'));
    expect(Number(screen.getByLabelText('node-count').textContent)).toBe(initial + 1);
    expect(screen.getByLabelText('direct-can-undo').textContent).toBe('true');
    await user.click(screen.getByText('undo-direct'));
    expect(Number(screen.getByLabelText('node-count').textContent)).toBe(initial);
  });

  it('groups all transient drag updates into one undo entry', async () => {
    const user = userEvent.setup();
    localStorage.setItem('structureCo.project', JSON.stringify(createDefaultProject()));
    render(<ProjectProvider><TransactionHarness /></ProjectProvider>);
    const initial = Number(screen.getByLabelText('x-coordinate').textContent);

    await user.click(screen.getByText('begin'));
    await user.click(screen.getByText('move'));
    await user.click(screen.getByText('move'));
    await user.click(screen.getByText('commit'));

    expect(Number(screen.getByLabelText('x-coordinate').textContent)).toBe(initial + 2);
    expect(screen.getByLabelText('can-undo').textContent).toBe('true');
    await user.click(screen.getByText('undo'));
    expect(Number(screen.getByLabelText('x-coordinate').textContent)).toBe(initial);
    expect(screen.getByLabelText('can-undo').textContent).toBe('false');
  });

  it('restores the transaction origin when a pointer gesture is cancelled', async () => {
    const user = userEvent.setup();
    localStorage.setItem('structureCo.project', JSON.stringify(createDefaultProject()));
    render(<ProjectProvider><TransactionHarness /></ProjectProvider>);
    const initial = Number(screen.getByLabelText('x-coordinate').textContent);
    await user.click(screen.getByText('begin'));
    await user.click(screen.getByText('move'));
    await user.click(screen.getByText('cancel'));
    expect(Number(screen.getByLabelText('x-coordinate').textContent)).toBe(initial);
    expect(screen.getByLabelText('can-undo').textContent).toBe('false');
  });
});

describe('ProjectContext analysis lifecycle', () => {
  it('discards pending results after an edit and clears results when the combination changes', async () => {
    const user = userEvent.setup();
    localStorage.setItem('structureCo.project', JSON.stringify(createDefaultProject()));
    render(<ProjectProvider><AnalysisHarness /></ProjectProvider>);

    await user.click(screen.getByText('analyze'));
    await user.click(screen.getByText('edit'));
    await new Promise((resolve) => window.setTimeout(resolve, 70));
    expect(screen.getByLabelText('analysis-state').textContent).toBe('none');

    await user.click(screen.getByText('analyze'));
    await waitFor(() => expect(screen.getByLabelText('analysis-state').textContent).toBe('success'));
    await user.click(screen.getByText('combination'));
    expect(screen.getByLabelText('analysis-state').textContent).toBe('none');
  });

  it('repairs legacy coincident nodes and interior supports as one undoable analysis step', async () => {
    const user = userEvent.setup();
    const project = createDefaultProject();
    project.nodes = [
      { id: 'N1', x: 0, y: 0, support: { type: 'pin' } },
      { id: 'N2', x: 8, y: 0, support: { type: 'none' } },
      { id: 'N3', x: 0, y: 0, support: { type: 'none' } },
      { id: 'N4', x: 6, y: 0, support: { type: 'roller', angleDeg: 90 } },
    ];
    project.members = [{ id: 'M1', i: 'N1', j: 'N2', type: 'frame', E: 200e6, A: 0.01, I: 8e-5, releases: { iMoment: true, jMoment: true } }];
    project.memberLoads = [{ id: 'P', memberId: 'M1', caseId: 'LC1', type: 'point', coordinateSystem: 'global', lengthBasis: 'real', start: 0, end: 1, px: 0, py: -40, position: 0.5 }];
    localStorage.setItem('structureCo.project', JSON.stringify(project));
    render(<ProjectProvider><AnalysisHarness /></ProjectProvider>);

    await user.click(screen.getByText('analyze'));
    await waitFor(() => expect(screen.getByLabelText('analysis-state').textContent).toBe('success'));
    expect(screen.getByLabelText('analysis-node-count').textContent).toBe('3');
    expect(screen.getByLabelText('analysis-member-count').textContent).toBe('2');
    expect(screen.getByLabelText('analysis-issues').textContent).toContain('topology-auto-repair');
    expect(screen.getByLabelText('analysis-can-undo').textContent).toBe('true');

    await user.click(screen.getByText('undo-analysis'));
    expect(screen.getByLabelText('analysis-node-count').textContent).toBe('4');
    expect(screen.getByLabelText('analysis-member-count').textContent).toBe('1');
    expect(screen.getByLabelText('analysis-state').textContent).toBe('none');
  });
});

describe('ProjectContext analysis settings lifecycle', () => {
  const renderSettingsHarness = () => {
    localStorage.setItem('structureCo.project', JSON.stringify(createDefaultProject()));
    render(<ProjectProvider><AnalysisSettingsHarness /></ProjectProvider>);
  };

  const analyzeSuccessfully = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByText('settings-analyze'));
    await waitFor(() => expect(screen.getByLabelText('settings-analysis-state').textContent).toBe('success'));
  };

  it('clears a successful result when analysis mode changes', async () => {
    const user = userEvent.setup();
    renderSettingsHarness();
    await analyzeSuccessfully(user);

    await user.click(screen.getByText('settings-p-delta'));

    expect(screen.getByLabelText('settings-analysis-mode').textContent).toBe('p-delta');
    expect(screen.getByLabelText('settings-analysis-state').textContent).toBe('none');
  });

  it('clears a successful result when a P-Delta parameter changes', async () => {
    const user = userEvent.setup();
    renderSettingsHarness();
    await analyzeSuccessfully(user);

    await user.click(screen.getByText('settings-p-delta-steps'));

    expect(screen.getByLabelText('settings-max-load-steps').textContent).toBe('17');
    expect(screen.getByLabelText('settings-analysis-state').textContent).toBe('none');
  });

  it('never publishes an in-flight result after analysis settings change', async () => {
    const user = userEvent.setup();
    const OriginalWorker = globalThis.Worker;
    class DelayedWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: (() => void) | null = null;
      postMessage(request: { requestId: number }) {
        window.setTimeout(() => this.onmessage?.({ data: {
          type: 'analysis-result',
          requestId: request.requestId,
          result: { success: false, issues: [] },
        } } as MessageEvent), 25);
      }
      terminate() {}
    }
    Object.defineProperty(globalThis, 'Worker', { configurable: true, value: DelayedWorker });
    try {
      renderSettingsHarness();
      await user.click(screen.getByText('settings-analyze'));
      expect(screen.getByLabelText('settings-is-analyzing').textContent).toBe('true');

      await user.click(screen.getByText('settings-p-delta'));
      await new Promise((resolve) => window.setTimeout(resolve, 60));

      expect(screen.getByLabelText('settings-analysis-state').textContent).toBe('none');
      expect(screen.getByLabelText('settings-is-analyzing').textContent).toBe('false');
    } finally {
      Object.defineProperty(globalThis, 'Worker', { configurable: true, value: OriginalWorker });
    }
  });

  it('keeps a valid result for a purely visual preference change', async () => {
    const user = userEvent.setup();
    renderSettingsHarness();
    await analyzeSuccessfully(user);

    await user.click(screen.getByText('settings-view-preference'));

    expect(screen.getByLabelText('settings-analysis-state').textContent).toBe('success');
  });

  it('keeps the existing undo and redo contract for analysis settings changes', async () => {
    const user = userEvent.setup();
    renderSettingsHarness();

    await user.click(screen.getByText('settings-edit'));
    await user.click(screen.getByText('settings-p-delta'));
    expect(screen.getByLabelText('settings-can-undo').textContent).toBe('true');

    await user.click(screen.getByText('settings-undo'));
    expect(screen.getByLabelText('settings-project-name').textContent).not.toBe('Proyecto editado');
    expect(screen.getByLabelText('settings-analysis-mode').textContent).toBe('first-order');
    expect(screen.getByLabelText('settings-can-redo').textContent).toBe('true');

    await user.click(screen.getByText('settings-redo'));
    expect(screen.getByLabelText('settings-project-name').textContent).toBe('Proyecto editado');
    expect(screen.getByLabelText('settings-analysis-mode').textContent).toBe('p-delta');
  });
});
