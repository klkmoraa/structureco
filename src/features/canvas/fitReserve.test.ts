import { describe, expect, it } from 'vitest';
import type { MemberLoad, MemberModel, NodalLoad, NodeModel } from '../../types';
import { canvasFitReserve, insetsWithFitReserve } from './fitReserve';

const node = (id: string, x: number, y: number, support: NodeModel['support'] = { type: 'none' }): NodeModel =>
  ({ id, x, y, support });

const beam: MemberModel = {
  id: 'M1', i: 'N1', j: 'N2', type: 'frame',
  materialOrigin: 'custom', sectionOrigin: 'custom', E: 200e6, A: 0.005, I: 8.333e-6, density: 7850,
} as MemberModel;

const column: MemberModel = { ...beam, id: 'M2', i: 'N1', j: 'N3' };

const project = {
  nodes: [node('N1', 0, 4), node('N2', 8, 4), node('N3', 0, 0, { type: 'pin' })],
  members: [beam, column],
  nodalLoads: [] as NodalLoad[],
  memberLoads: [] as MemberLoad[],
};

const options = { loadsVisible: true, diagramVisible: false, reactionsVisible: false, diagramScale: 1 };
const quiet = { loadsVisible: false, diagramVisible: false, reactionsVisible: false, diagramScale: 1 };

describe('content-aware fit reserve', () => {
  it('reserves nothing for a bare model beyond its support symbols', () => {
    expect(canvasFitReserve({ ...project, nodes: [node('N1', 0, 0)] }, quiet))
      .toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
    expect(canvasFitReserve(project, quiet).bottom).toBe(32);
  });

  it('reserves upwards for gravity and never sideways', () => {
    const gravity: NodalLoad = { id: 'F1', nodeId: 'N1', caseId: 'c', fx: 0, fy: -20, mz: 0 };
    const reserve = canvasFitReserve({ ...project, nodalLoads: [gravity] }, options);
    expect(reserve.top).toBe(78);
    expect(reserve.left).toBe(32);
    expect(reserve.right).toBe(32);
  });

  it('follows the direction of a horizontal load instead of padding every side', () => {
    const wind: NodalLoad = { id: 'F1', nodeId: 'N1', caseId: 'c', fx: 30, fy: 0, mz: 0 };
    const reserve = canvasFitReserve({ ...project, nodalLoads: [wind] }, options);
    expect(reserve.left).toBe(78);
    expect(reserve.right).toBe(32);
    expect(reserve.top).toBe(32);
  });

  it('reserves the diagram ordinate normal to each member, both signs', () => {
    // La viga es horizontal (normal vertical) y la columna vertical (normal
    // horizontal): entre las dos piden las cuatro direcciones, una barra sola no.
    const beamOnly = canvasFitReserve({ ...project, members: [beam] }, { ...quiet, diagramVisible: true });
    expect(beamOnly.top).toBe(104);
    expect(beamOnly.bottom).toBe(104);
    expect(beamOnly.left).toBe(32);

    const both = canvasFitReserve(project, { ...quiet, diagramVisible: true });
    expect(both.left).toBe(104);
    expect(both.right).toBe(104);
  });

  it('grows the diagram reserve with the drawing scale the user chose', () => {
    const doubled = canvasFitReserve({ ...project, members: [beam] }, { ...quiet, diagramVisible: true, diagramScale: 2 });
    expect(doubled.top).toBe(172);
  });

  it('caps the reserve so a small model can never collapse the fit', () => {
    const insets = { top: 116, right: 68, bottom: 62, left: 68 };
    const capped = insetsWithFitReserve(insets, { top: 900, right: 900, bottom: 900, left: 900 }, { width: 1000, height: 600 });
    expect(capped.top).toBe(116 + (600 - 178) / 3);
    expect(capped.left).toBe(68 + (1000 - 136) / 3);
  });

  it('ignores a non-finite reserve rather than producing a NaN camera', () => {
    const insets = { top: 10, right: 10, bottom: 10, left: 10 };
    expect(insetsWithFitReserve(insets, { top: Number.NaN, right: -5, bottom: 20, left: 0 }, { width: 900, height: 900 }))
      .toEqual({ top: 10, right: 10, bottom: 30, left: 10 });
  });
});
