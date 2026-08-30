// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { MemberModel, MemberResult, NodeModel, ProjectModel } from '../../types';
import { CanvasDiagramStack } from './CanvasDiagramStack';

const nodes = [
  { id: 'A', x: 0, y: 0 }, { id: 'B', x: 0, y: 3 },
  { id: 'C', x: 5, y: 3 }, { id: 'D', x: 5, y: 0 },
].map((node) => ({ ...node, support: { type: 'none' } } as NodeModel));

const members = [
  ['AB', 'A', 'B'], ['BC', 'B', 'C'], ['CD', 'C', 'D'],
].map(([id, i, j]) => ({ id, i, j, type: 'frame', E: 2e8, A: 0.02, I: 8e-5 } as MemberModel));

const result = (memberId: string): MemberResult => ({
  memberId, length: memberId === 'BC' ? 5 : 3, startOffset: 0,
  localDisplacements: [], localEndForces: [], diagramJumps: [], criticalPoints: [],
  diagramSegments: [{ x0: 0, x1: memberId === 'BC' ? 5 : 3, axial: [4, 0, 0], shear: [8, -2, 0], moment: [0, 8, -2, 0], distributedAxial: [0, 0], distributedTransverse: [0, 0] }],
  diagram: [], deformation: [], deformationSegments: [], deformationCriticalPoints: [],
  maxAxial: 4, minAxial: -4, maxShear: 8, minShear: -3, maxMoment: 10, minMoment: -6,
} as unknown as MemberResult);

const project = { id: 'portal', name: 'Pórtico', nodes, members, settings: { units: 'kN-m' } } as unknown as ProjectModel;

describe('CanvasDiagramStack', () => {
  it('renders one exterior full-structure replica per selected ACM response', () => {
    const { container } = render(<svg><CanvasDiagramStack
      project={project}
      results={members.map((member) => result(member.id))}
      quantities={['axial', 'shear', 'moment']}
      nodeMap={new Map(nodes.map((node) => [node.id, node]))}
      size={{ width: 640, height: 520 }}
      t={((key: string) => key) as never}
    /></svg>);

    expect(container.querySelector('[data-canvas-layer="diagram-stack"]')?.getAttribute('aria-label')).toBe('canvas.evidenceStackStructure');
    expect(container.querySelectorAll('[data-stack-member="AB"][data-stack-lane]').length).toBe(3);
    expect(container.querySelectorAll('[data-stack-member="BC"][data-stack-lane]').length).toBe(3);
    expect(container.querySelectorAll('[data-stack-member="CD"][data-stack-lane]').length).toBe(3);
    expect(container.querySelectorAll('[data-stack-panel]').length).toBe(3);
    expect(container.querySelectorAll('.diagram-stack-replica-member').length).toBe(9);
    expect(container.querySelectorAll('.diagram-stack-panel-frame')).toHaveLength(0);
    expect(container.querySelectorAll('[data-stack-reading]')).toHaveLength(0);
  });

  it('keeps a single selected response in one exterior replica rather than over the editable member', () => {
    const { container } = render(<svg><CanvasDiagramStack
      project={project}
      results={members.map((member) => result(member.id))}
      quantities={['moment']}
      nodeMap={new Map(nodes.map((node) => [node.id, node]))}
      size={{ width: 640, height: 520 }}
      t={((key: string) => key) as never}
    /></svg>);

    expect(container.querySelectorAll('[data-stack-panel="moment"]').length).toBe(1);
    expect(container.querySelectorAll('[data-stack-member][data-stack-lane="moment"] .diagram-stack-replica-member').length).toBe(3);
  });

  it('keeps all three full portal diagrams inside the same desktop canvas without overlap', () => {
    const { container } = render(<svg><CanvasDiagramStack
      project={project}
      results={members.map((member) => result(member.id))}
      quantities={['axial', 'shear', 'moment']}
      nodeMap={new Map(nodes.map((node) => [node.id, node]))}
      size={{ width: 1280, height: 900 }}
      t={((key: string) => key) as never}
    /></svg>);

    const panels = Array.from(container.querySelectorAll('[data-stack-panel]'));
    expect(panels).toHaveLength(3);
    const starts = Array.from(container.querySelectorAll('[data-stack-member="AB"] .diagram-stack-replica-member'));
    expect(starts).toHaveLength(3);
    const positions = starts.map((line) => `${Math.round(Number(line.getAttribute('x1')))}:${Math.round(Number(line.getAttribute('y1')))}`);
    expect(new Set(positions).size).toBe(3);
  });
});
