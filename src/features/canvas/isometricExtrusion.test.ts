import { describe, it, expect } from 'vitest';
import { computeExtrudedStructure } from './isometricExtrusion';
import { createBlankProject } from '../../data/defaultProject';
import type { CanvasCamera as Camera } from './canvasInteraction';

describe('isometricExtrusion', () => {
  const camera: Camera = {
    x: 0,
    y: 0,
    scale: 40, // 40 px/m
  };

  const toScreen = (x: number, y: number) => ({
    x: x * camera.scale,
    y: 600 - y * camera.scale,
  });

  const createTestProject = () => {
    const base = createBlankProject();
    return {
      ...base,
      nodes: [
        { id: 'n1', x: 0, y: 0, support: { type: 'fixed' as const } },
        { id: 'n2', x: 0, y: 3, support: { type: 'none' as const } },
        { id: 'n3', x: 4, y: 3, support: { type: 'roller' as const } },
      ],
      members: [
        // Columna rectangular
        {
          id: 'm1',
          i: 'n1',
          j: 'n2',
          type: 'frame' as const,
          E: 200e6,
          A: 0.04,
          I: 0.000133,
        },
        // Viga I-Shape (IPE 300)
        {
          id: 'm2',
          i: 'n2',
          j: 'n3',
          type: 'frame' as const,
          sectionId: 'ipe-300',
          sectionOrigin: 'catalog' as const,
          E: 210e6,
          A: 0.00538,
          I: 0.0000836,
        },
      ],
    };
  };

  it('computes extruded faces and ghost axes for frame members', () => {
    const project = createTestProject();
    const result = computeExtrudedStructure(
      project,
      toScreen,
      camera,
      [],
      [],
      null,
      new Map(),
    );

    expect(result.faces.length).toBeGreaterThan(0);
    expect(result.ghostAxes).toHaveLength(2);

    // Eje fantasma de m1
    const m1Axis = result.ghostAxes.find((g) => g.memberId === 'm1');
    expect(m1Axis).toBeDefined();
    expect(m1Axis?.start).toEqual({ x: 0, y: 600 });
    expect(m1Axis?.end).toEqual({ x: 0, y: 480 });
  });

  it('generates distinct I-profile faces with flanges, shelves, and web for catalog I-sections', () => {
    const project = createTestProject();
    const result = computeExtrudedStructure(
      project,
      toScreen,
      camera,
      [],
      [],
      null,
      new Map(),
    );

    const m2Faces = result.faces.filter((f) => f.memberId === 'm2');
    expect(m2Faces.length).toBeGreaterThan(4);

    const parts = new Set(m2Faces.map((f) => f.part));
    expect(parts.has('top')).toBe(true);
    expect(parts.has('flange-top')).toBe(true);
    expect(parts.has('flange-shelf')).toBe(true);
    expect(parts.has('web')).toBe(true);
    expect(parts.has('bottom')).toBe(true);
    expect(parts.has('cap')).toBe(true);
  });

  it('applies Lambertian directional shading strictly bounded between 0 and 1', () => {
    const project = createTestProject();
    const result = computeExtrudedStructure(
      project,
      toScreen,
      camera,
      [],
      [],
      null,
      new Map(),
    );

    for (const face of result.faces) {
      expect(face.shade).toBeGreaterThanOrEqual(0);
      expect(face.shade).toBeLessThanOrEqual(1);
    }
  });

  it('sorts all faces by depth in ascending order for painter algorithm rendering', () => {
    const project = createTestProject();
    const result = computeExtrudedStructure(
      project,
      toScreen,
      camera,
      [],
      [],
      null,
      new Map(),
    );

    for (let i = 1; i < result.faces.length; i += 1) {
      expect(result.faces[i]!.depth).toBeGreaterThanOrEqual(result.faces[i - 1]!.depth);
    }
  });

  it('reflects member selection in face colors and stroke highlights', () => {
    const project = createTestProject();
    const normal = computeExtrudedStructure(
      project,
      toScreen,
      camera,
      [],
      [],
      null,
      new Map(),
    );
    const selected = computeExtrudedStructure(
      project,
      toScreen,
      camera,
      ['m2'],
      [],
      null,
      new Map(),
    );

    const normalM2 = normal.faces.find((f) => f.memberId === 'm2' && f.part === 'top');
    const selectedM2 = selected.faces.find((f) => f.memberId === 'm2' && f.part === 'top');

    expect(selectedM2?.isSelected).toBe(true);
    expect(selectedM2?.fillColor).toContain('hsl(38'); // Amber selection hue
    expect(selectedM2?.strokeColor).toContain('245, 158, 11');
    expect(normalM2?.isSelected).toBe(false);
  });

  it('modulates face color with elastic demand when demand ratios are provided', () => {
    const project = createTestProject();
    const heatmap = new Map<string, number>([['m1', 0.85]]);

    const result = computeExtrudedStructure(
      project,
      toScreen,
      camera,
      [],
      [],
      null,
      heatmap,
    );

    const m1Front = result.faces.find((f) => f.memberId === 'm1' && f.part === 'front');
    expect(m1Front?.fillColor).toContain('color-mix');
  });

  it('generates 3D joint connection blocks at connected nodes by default', () => {
    const project = createTestProject();
    const result = computeExtrudedStructure(
      project,
      toScreen,
      camera,
      [],
      [],
      null,
      new Map(),
      { showJoints: true },
    );

    const jointFaces = result.faces.filter((f) => f.nodeId === 'n2');
    expect(jointFaces.length).toBeGreaterThanOrEqual(3);

    const parts = new Set(jointFaces.map((f) => f.part));
    expect(parts.has('joint-top')).toBe(true);
    expect(parts.has('joint-front')).toBe(true);
    expect(parts.has('joint-side')).toBe(true);
  });
});
