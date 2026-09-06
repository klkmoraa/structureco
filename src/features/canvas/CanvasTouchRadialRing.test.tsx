// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';

afterEach(cleanup);
import { CanvasTouchRadialRing } from './CanvasTouchRadialRing';
import type { NodeModel, MemberModel, ProjectModel } from '../../types';
import { createDefaultProject } from '../../data/defaultProject';

describe('CanvasTouchRadialRing', () => {
  const dummyProject: ProjectModel = {
    ...createDefaultProject(),
    id: 'test-p',
    name: 'Test Project',
    nodes: [
      { id: 'N1', x: 0, y: 0, support: { type: 'pin' } },
      { id: 'N2', x: 4, y: 0, support: { type: 'none' } },
    ],
    members: [
      { id: 'M1', i: 'N1', j: 'N2', type: 'frame', E: 200e9, A: 0.01, I: 0.0001 },
    ],
  };

  const nodeMap = new Map<string, NodeModel>(dummyProject.nodes.map((n) => [n.id, n]));
  const memberMap = new Map<string, MemberModel>(dummyProject.members.map((m) => [m.id, m]));
  const toScreen = (x: number, y: number) => ({ x: 100 + x * 50, y: 200 - y * 50 });

  it('renders nothing when selection is null or invalid', () => {
    const { queryByTestId } = render(
      <CanvasTouchRadialRing
        selection={null}
        toScreen={toScreen}
        nodeMap={nodeMap}
        memberMap={memberMap}
        onCycleSupport={vi.fn()}
        onStartMember={vi.fn()}
        onAddLoad={vi.fn()}
        onCutMember={vi.fn()}
        onOpenSection={vi.fn()}
        onDelete={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );
    expect(queryByTestId('touch-radial-ring')).toBeNull();
  });

  it('renders node actions when a node is selected and triggers handlers', () => {
    const onCycleSupport = vi.fn();
    const onAddLoad = vi.fn();
    const onStartMember = vi.fn();
    const onDelete = vi.fn();
    const onDismiss = vi.fn();

    const { getByTestId } = render(
      <CanvasTouchRadialRing
        selection={{ kind: 'node', id: 'N1' }}
        toScreen={toScreen}
        nodeMap={nodeMap}
        memberMap={memberMap}
        onCycleSupport={onCycleSupport}
        onStartMember={onStartMember}
        onAddLoad={onAddLoad}
        onCutMember={vi.fn()}
        onOpenSection={vi.fn()}
        onDelete={onDelete}
        onDismiss={onDismiss}
      />,
    );

    expect(getByTestId('touch-radial-ring')).toBeTruthy();
    expect(getByTestId('radial-action-support')).toBeTruthy();
    expect(getByTestId('radial-action-node-load')).toBeTruthy();
    expect(getByTestId('radial-action-new-member')).toBeTruthy();
    expect(getByTestId('radial-action-delete')).toBeTruthy();

    fireEvent.click(getByTestId('radial-action-support'));
    expect(onCycleSupport).toHaveBeenCalledWith('N1');

    fireEvent.click(getByTestId('radial-action-node-load'));
    expect(onAddLoad).toHaveBeenCalledWith('node', 'N1');

    fireEvent.click(getByTestId('radial-action-new-member'));
    expect(onStartMember).toHaveBeenCalledWith('N1');

    fireEvent.click(getByTestId('radial-action-delete'));
    expect(onDelete).toHaveBeenCalled();

    fireEvent.click(getByTestId('radial-ring-dismiss'));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('renders member actions when a member is selected and triggers handlers', () => {
    const onOpenSection = vi.fn();
    const onAddLoad = vi.fn();
    const onCutMember = vi.fn();
    const onDelete = vi.fn();

    const { getByTestId } = render(
      <CanvasTouchRadialRing
        selection={{ kind: 'member', id: 'M1' }}
        toScreen={toScreen}
        nodeMap={nodeMap}
        memberMap={memberMap}
        onCycleSupport={vi.fn()}
        onStartMember={vi.fn()}
        onAddLoad={onAddLoad}
        onCutMember={onCutMember}
        onOpenSection={onOpenSection}
        onDelete={onDelete}
        onDismiss={vi.fn()}
      />,
    );

    expect(getByTestId('touch-radial-ring')).toBeTruthy();
    expect(getByTestId('radial-action-section')).toBeTruthy();
    expect(getByTestId('radial-action-member-load')).toBeTruthy();
    expect(getByTestId('radial-action-cut')).toBeTruthy();
    expect(getByTestId('radial-action-delete')).toBeTruthy();

    fireEvent.click(getByTestId('radial-action-section'));
    expect(onOpenSection).toHaveBeenCalledWith('M1');

    fireEvent.click(getByTestId('radial-action-member-load'));
    expect(onAddLoad).toHaveBeenCalledWith('member', 'M1');

    fireEvent.click(getByTestId('radial-action-cut'));
    expect(onCutMember).toHaveBeenCalledWith('M1');

    fireEvent.click(getByTestId('radial-action-delete'));
    expect(onDelete).toHaveBeenCalled();
  });
});
