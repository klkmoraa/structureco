// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBlankProject } from '../../data/defaultProject';
import type { MemberLoad, MemberModel, NodeModel } from '../../types';
import { CanvasGeometryLayer } from './CanvasGeometryLayer';
import { createEditorLayerState } from './editorLayers';
import { buildCanvasSelectionVisualState } from './selectionVisuals';

afterEach(cleanup);

const node = (id: string, x: number): NodeModel => ({
  id,
  x,
  y: 0,
  support: { type: 'none' },
});

const member: MemberModel = {
  id: 'M1',
  i: 'N1',
  j: 'N2',
  type: 'frame',
  materialId: 'MAT1',
  sectionId: 'SEC1',
  E: 200e6,
  A: 0.005,
  I: 8.333e-6,
};

const distributed: MemberLoad = {
  id: 'Q', memberId: 'M1', caseId: 'LC1', type: 'distributed', coordinateSystem: 'global', lengthBasis: 'real',
  start: 0, end: 1, qxStart: 0, qxEnd: 0, qyStart: -8, qyEnd: -8,
};

const point: MemberLoad = {
  id: 'P', memberId: 'M1', caseId: 'LC1', type: 'point', coordinateSystem: 'global', lengthBasis: 'real',
  start: 0, end: 1, position: 0.5, px: 0, py: -12,
};

const moment: MemberLoad = {
  id: 'MA', memberId: 'M1', caseId: 'LC1', type: 'moment', coordinateSystem: 'local', lengthBasis: 'real',
  start: 0, end: 1, position: 0.5, moment: 7,
};

describe('CanvasGeometryLayer load presentation', () => {
  it('renders applied-load families in semantic paint order with separate color markers', () => {
    const project = createBlankProject();
    project.nodes = [node('N1', 0), node('N2', 4)];
    project.members = [member];
    project.memberLoads = [moment, point, distributed];
    const nodeMap = new Map(project.nodes.map((item) => [item.id, item]));
    const memberMap = new Map(project.members.map((item) => [item.id, item]));

    const { container } = render(<svg><CanvasGeometryLayer
      slot="objects"
      project={project}
      nodeMap={nodeMap}
      memberMap={memberMap}
      toScreen={(x, y) => ({ x: x * 100 + 40, y: 180 - y * 100 })}
      camera={{ scale: 100 }}
      selectionVisualState={buildCanvasSelectionVisualState(null)}
      candidatePreview={null}
      learningFocus={null}
      memberStartId={null}
      layers={createEditorLayerState()}
      loadsLayerVisible
      heatmapRatios={new Map()}
      demandMapActive={false}
      resultTab="summary"
      units={project.settings.units}
      forceLabel="kN"
      momentLabel="kN·m"
      distributedLabel="kN/m"
      t={(key) => key}
      onObjectPointerDown={vi.fn()}
      onObjectKeyDown={vi.fn()}
      onShowCut={vi.fn()}
      onCutLeave={vi.fn()}
    /></svg>);

    const loads = [...container.querySelectorAll('[data-structure-kind="memberLoad"]')];
    expect(loads.map((item) => item.getAttribute('data-structure-id'))).toEqual(['Q', 'P', 'MA']);

    const distributedGroup = container.querySelector('[data-structure-id="Q"]');
    const pointGroup = container.querySelector('[data-structure-id="P"]');
    const momentGroup = container.querySelector('[data-structure-id="MA"]');
    expect(distributedGroup?.classList.contains('load-symbol--distributed')).toBe(true);
    expect(pointGroup?.getAttribute('data-load-lane')).toBe('point-outer');
    expect(pointGroup?.classList.contains('load-symbol--point')).toBe(true);
    expect(momentGroup?.getAttribute('data-load-lane')).toBe('moment-outer');
    expect(momentGroup?.classList.contains('load-symbol--moment')).toBe(true);
    expect(pointGroup?.querySelector('[marker-end]')?.getAttribute('marker-end')).toBe('url(#arrow-load-point)');
    expect(momentGroup?.querySelector('[marker-end]')?.getAttribute('marker-end')).toBe('url(#arrow-load-moment)');
    expect(distributedGroup?.querySelector('[marker-end]')?.getAttribute('marker-end')).toBe('url(#arrow-load-distributed)');
  });
});
