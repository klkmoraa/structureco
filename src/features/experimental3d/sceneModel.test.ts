import { describe, expect, it } from 'vitest';
import { buildExperimental3DScene } from './sceneModel';

describe('buildExperimental3DScene', () => {
  it('projects finite 2D nodes and connected members onto the global XY plane', () => {
    const project = {
      nodes: [
        { id: 'N1', x: -2.5, y: 1.25 },
        { id: 'N2', x: 4, y: 7 },
      ],
      members: [{ id: 'M1', i: 'N1', j: 'N2' }],
    } as const;

    const scene = buildExperimental3DScene(project);

    expect(scene.nodes).toEqual([
      { id: 'N1', position: [-2.5, 1.25, 0] },
      { id: 'N2', position: [4, 7, 0] },
    ]);
    expect(scene.members).toEqual([{
      id: 'M1',
      nodeI: 'N1',
      nodeJ: 'N2',
      start: [-2.5, 1.25, 0],
      end: [4, 7, 0],
    }]);
    expect(scene.bounds).toEqual({
      min: [-2.5, 1.25, 0],
      max: [4, 7, 0],
      center: [0.75, 4.125, 0],
      span: 6.5,
    });
    expect(scene.diagnostics).toEqual([]);
  });

  it('reports invalid coordinates and unresolved member endpoints without mutating input', () => {
    const project = {
      nodes: [
        { id: 'N1', x: 0, y: 0 },
        { id: 'N-bad', x: Number.NaN, y: 3 },
      ],
      members: [
        { id: 'M-valid', i: 'N1', j: 'N1' },
        { id: 'M-missing', i: 'N1', j: 'N404' },
        { id: 'M-invalid', i: 'N1', j: 'N-bad' },
      ],
    };
    const before = {
      nodes: project.nodes.map((node) => ({ ...node })),
      members: project.members.map((member) => ({ ...member })),
    };

    const scene = buildExperimental3DScene(project);

    expect(scene.nodes).toEqual([{ id: 'N1', position: [0, 0, 0] }]);
    expect(scene.members.map((member) => member.id)).toEqual(['M-valid']);
    expect(scene.diagnostics).toEqual([
      { code: 'invalid-node-coordinate', nodeId: 'N-bad' },
      { code: 'unresolved-member-endpoint', memberId: 'M-missing', nodeIds: ['N404'] },
      { code: 'unresolved-member-endpoint', memberId: 'M-invalid', nodeIds: ['N-bad'] },
    ]);
    expect(project).toEqual(before);
  });

  it('provides safe camera bounds for empty and zero-span projects', () => {
    const empty = buildExperimental3DScene({ nodes: [], members: [] });
    const point = buildExperimental3DScene({
      nodes: [{ id: 'N1', x: 8, y: -3 }],
      members: [],
    });

    expect(empty.bounds).toEqual({
      min: [0, 0, 0],
      max: [0, 0, 0],
      center: [0, 0, 0],
      span: 10,
    });
    expect(point.bounds).toEqual({
      min: [8, -3, 0],
      max: [8, -3, 0],
      center: [8, -3, 0],
      span: 1,
    });
  });
});
