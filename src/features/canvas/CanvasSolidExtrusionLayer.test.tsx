// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { CanvasSolidExtrusionLayer } from './CanvasSolidExtrusionLayer';
import { createBlankProject } from '../../data/defaultProject';
import type { CanvasCamera as Camera } from './canvasInteraction';

describe('CanvasSolidExtrusionLayer', () => {
  const camera: Camera = {
    x: 0,
    y: 0,
    scale: 50,
  };

  const toScreen = (x: number, y: number) => ({
    x: x * camera.scale,
    y: 500 - y * camera.scale,
  });

  const baseProject = createBlankProject();
  const project = {
    ...baseProject,
    nodes: [
      { id: 'n1', x: 0, y: 0, support: { type: 'fixed' as const } },
      { id: 'n2', x: 0, y: 3, support: { type: 'none' as const } },
      { id: 'n3', x: 4, y: 3, support: { type: 'roller' as const } },
    ],
    members: [
      {
        id: 'm1',
        i: 'n1',
        j: 'n2',
        type: 'frame' as const,
        E: 200e6,
        A: 0.04,
        I: 0.000133,
      },
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

  it('renders solid extruded polygon faces and ghost axes inside SVG', () => {
    const { container } = render(
      <svg>
        <CanvasSolidExtrusionLayer
          project={project}
          toScreen={toScreen}
          camera={camera}
          selectedMemberIds={[]}
          selectedNodeIds={[]}
          heatmapRatios={new Map()}
          onObjectPointerDown={vi.fn()}
        />
      </svg>,
    );

    const layer = container.querySelector('.solid-extrusion-layer');
    expect(layer).not.toBeNull();

    const faces = container.querySelectorAll('.solid-face');
    expect(faces.length).toBeGreaterThan(0);

    const ghostAxes = container.querySelectorAll('.solid-ghost-axis');
    expect(ghostAxes).toHaveLength(2);
  });

  it('dispatches onObjectPointerDown when clicking a solid face', () => {
    const onPointerDown = vi.fn();
    const { container } = render(
      <svg>
        <CanvasSolidExtrusionLayer
          project={project}
          toScreen={toScreen}
          camera={camera}
          selectedMemberIds={[]}
          selectedNodeIds={[]}
          heatmapRatios={new Map()}
          onObjectPointerDown={onPointerDown}
        />
      </svg>,
    );

    const firstFace = container.querySelector('.solid-face[data-structure-id="m1"]') as SVGPolygonElement;
    expect(firstFace).not.toBeNull();

    fireEvent.pointerDown(firstFace);
    expect(onPointerDown).toHaveBeenCalledTimes(1);
    expect(onPointerDown).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ kind: 'member', id: 'm1' }),
    );
  });

  it('marks faces with is-selected class when member is selected', () => {
    const { container } = render(
      <svg>
        <CanvasSolidExtrusionLayer
          project={project}
          toScreen={toScreen}
          camera={camera}
          selectedMemberIds={['m2']}
          selectedNodeIds={[]}
          heatmapRatios={new Map()}
          onObjectPointerDown={vi.fn()}
        />
      </svg>,
    );

    const selectedFaces = container.querySelectorAll('.solid-face.is-selected');
    expect(selectedFaces.length).toBeGreaterThan(0);
    for (const sf of Array.from(selectedFaces)) {
      expect(sf.getAttribute('data-structure-id')).toBe('m2');
    }
  });
});
