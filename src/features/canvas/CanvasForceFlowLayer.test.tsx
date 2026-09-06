// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CanvasForceFlowLayer } from './CanvasForceFlowLayer';
import type { MemberModel, NodeModel, ProjectModel } from '../../types';
import type { MemberForceFlow } from './canvasDynamics';

afterEach(cleanup);

describe('CanvasForceFlowLayer', () => {
  const project = {
    nodes: [
      { id: 'N1', x: 0, y: 0 },
      { id: 'N2', x: 4, y: 0 },
    ],
    members: [
      { id: 'M1', i: 'N1', j: 'N2', type: 'frame' },
    ],
  } as unknown as ProjectModel;

  const nodeMap = new Map<string, NodeModel>(project.nodes.map((n) => [n.id, n]));
  const memberMap = new Map<string, MemberModel>(project.members.map((m) => [m.id, m]));
  const toScreen = (x: number, y: number) => ({ x: x * 100, y: y * 100 });

  it('renders nothing when visible is false', () => {
    const flows = new Map<string, MemberForceFlow>([
      ['M1', { memberId: 'M1', axial: 50, shear: 0, kind: 'tension', intensity: 0.8, flowDirection: 1 }],
    ]);

    const { container } = render(
      <svg>
        <CanvasForceFlowLayer
          project={project}
          nodeMap={nodeMap}
          memberMap={memberMap}
          flows={flows}
          toScreen={toScreen}
          visible={false}
        />
      </svg>,
    );

    expect(container.querySelector('.canvas-force-flow-layer')).toBeNull();
  });

  it('renders force flow streams when visible and flow is active', () => {
    const flows = new Map<string, MemberForceFlow>([
      ['M1', { memberId: 'M1', axial: 50, shear: 0, kind: 'tension', intensity: 0.8, flowDirection: 1 }],
    ]);

    const { container } = render(
      <svg>
        <CanvasForceFlowLayer
          project={project}
          nodeMap={nodeMap}
          memberMap={memberMap}
          flows={flows}
          toScreen={toScreen}
          visible={true}
        />
      </svg>,
    );

    const layer = container.querySelector('.canvas-force-flow-layer');
    expect(layer).not.toBeNull();

    const group = container.querySelector('[data-force-flow-member="M1"]');
    expect(group).not.toBeNull();
    expect(group?.getAttribute('data-flow-kind')).toBe('tension');
    expect(group?.querySelector('.force-flow-stream')).not.toBeNull();
  });
});
