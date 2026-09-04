// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react';
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
    expect(container.querySelectorAll('.diagram-stack-panel-surface')).toHaveLength(0);
    expect(container.querySelectorAll('.diagram-stack-panel-rule')).toHaveLength(2);
    expect(container.querySelector('[data-canvas-layer="diagram-stack"]')?.getAttribute('data-stack-layout')).toBe('rows');
    expect(container.querySelectorAll('[data-stack-reading]')).toHaveLength(0);
    expect(container.querySelector('[data-stack-panel="moment"] .diagram-stack-panel-unit')?.textContent).toBe('kN·m');
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

  const replicaStarts = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('[data-stack-member="AB"] .diagram-stack-replica-member'))
      .map((line) => Number(line.getAttribute('x1')));

  it('apila las tres lecturas en columna cuando el área útil no es apaisada', () => {
    const { container } = render(<svg><CanvasDiagramStack
      project={project}
      results={members.map((member) => result(member.id))}
      quantities={['axial', 'shear', 'moment']}
      nodeMap={new Map(nodes.map((node) => [node.id, node]))}
      size={{ width: 1280, height: 900 }}
      t={((key: string) => key) as never}
    /></svg>);

    // 1280×900 deja un área útil de 1178×776: no llega al umbral apaisado, así
    // que cada lectura ocupa el ancho completo y comparten abscisa de arranque.
    const starts = replicaStarts(container);
    expect(starts).toHaveLength(3);
    expect(new Set(starts.map((value) => Math.round(value))).size).toBe(1);
  });

  it('conserva el ancho completo de cada lectura incluso en un área apaisada', () => {
    const { container } = render(<svg><CanvasDiagramStack
      project={project}
      results={members.map((member) => result(member.id))}
      quantities={['axial', 'shear', 'moment']}
      nodeMap={new Map(nodes.map((node) => [node.id, node]))}
      size={{ width: 1680, height: 760 }}
      t={((key: string) => key) as never}
    /></svg>);

    const starts = replicaStarts(container);
    expect(starts).toHaveLength(3);
    expect(new Set(starts.map((value) => Math.round(value))).size).toBe(1);
  });

  it('links the same member station across N, V, and M while probing the sheet', () => {
    const projectNmm = { ...project, settings: { ...project.settings, units: 'N-mm' } } as ProjectModel;
    const { container } = render(<svg viewBox="0 0 640 520"><CanvasDiagramStack
      project={projectNmm}
      results={members.map((member) => result(member.id))}
      quantities={['axial', 'shear', 'moment']}
      nodeMap={new Map(nodes.map((node) => [node.id, node]))}
      size={{ width: 640, height: 520 }}
      t={((key: string) => key) as never}
    /></svg>);
    const svg = container.querySelector('svg') as SVGSVGElement;
    Object.defineProperty(svg, 'getBoundingClientRect', { value: () => ({
      x: 0, y: 0, left: 0, top: 0, right: 640, bottom: 520, width: 640, height: 520, toJSON: () => ({}),
    }) });
    const hit = container.querySelector('[data-stack-panel="axial"] [data-stack-probe-hit="BC"]') as SVGLineElement;
    const x = (Number(hit.getAttribute('x1')) + Number(hit.getAttribute('x2'))) / 2;
    const y = (Number(hit.getAttribute('y1')) + Number(hit.getAttribute('y2'))) / 2;

    fireEvent.pointerMove(hit, { clientX: x, clientY: y, pointerType: 'mouse' });

    expect(container.querySelectorAll('[data-stack-probe="BC:axial"], [data-stack-probe="BC:shear"], [data-stack-probe="BC:moment"]')).toHaveLength(3);
    expect(container.querySelector('.diagram-stack-probe-summary')?.textContent).toContain('BC · x 2500.00 mm');
    expect(container.querySelector('[data-stack-probe="BC:moment"] .diagram-stack-probe-value')?.textContent).toBe('7.5e+6 N·mm');
  });
});
