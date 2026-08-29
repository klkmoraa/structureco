// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { MemberResult, ProjectModel } from '../../types';
import { buildDiagramStack, DIAGRAM_STACK_STORAGE_KEY, parseStackQuantities, persistStackQuantities, readStoredStackQuantities, resolveStackMemberId, snapStation, stackMetricsFor, stationFromScreenX, stationReadings, toggleStackQuantity } from './diagramStack';

const beam = (memberId: string, length = 8): MemberResult => ({
  memberId, length, localDisplacements: [], localEndForces: [],
  diagramSegments: [{ x0: 0, x1: length, axial: [0, 0, 0], shear: [40, -10, 0], moment: [0, 40, -5, 0], distributedAxial: [0, 0], distributedTransverse: [0, -10] }],
  diagramJumps: [], criticalPoints: [{ x: 0, quantity: 'shear', value: 40, kind: 'end' }, { x: length, quantity: 'shear', value: -40, kind: 'end' }, { x: length / 2, quantity: 'moment', value: 80, kind: 'maximum' }],
  diagram: [], deformation: [], deformationSegments: [], deformationCriticalPoints: [], maxAxial: 0, minAxial: 0, maxShear: 40, minShear: -40, maxMoment: 80, minMoment: 0,
});

describe('canvas diagram stack', () => {
  it('uses each selected result lane at its own scale', () => {
    const lanes = buildDiagramStack(beam('M1'), ['axial', 'shear', 'moment'], { x: 100, y: 200, width: 400, laneHeight: 80, laneGap: 8 });
    expect(lanes.map((lane) => lane.quantity)).toEqual(['axial', 'shear', 'moment']);
    expect(lanes.map((lane) => lane.right)).toEqual([500, 500, 500]);
    expect(lanes[1].pixelsPerValue).toBeGreaterThan(lanes[2].pixelsPerValue);
    expect(lanes.every((lane) => lane.linePath.startsWith('M ') && lane.fillPath.endsWith('Z'))).toBe(true);
  });

  it('keeps selection priority and falls back to the longest solved member', () => {
    const resultMap = new Map([['M1', beam('M1', 4)], ['M2', beam('M2', 9)]]);
    const project = { members: [{ id: 'M1' }, { id: 'M2' }] } as unknown as ProjectModel;
    expect(resolveStackMemberId(project, { kind: 'member', id: 'M1' }, resultMap)).toBe('M1');
    expect(resolveStackMemberId(project, null, resultMap)).toBe('M2');
  });

  it('reads all three actions at one snapped station', () => {
    const result = beam('M1');
    const lane = buildDiagramStack(result, ['axial', 'shear', 'moment'], { x: 100, y: 200, width: 400, laneHeight: 80, laneGap: 8 })[0];
    expect(stationFromScreenX(lane, result.length, 300)).toBe(4);
    expect(snapStation(result, 4.04)).toBe(4);
    expect(stationReadings(result, 4).map((item) => item.quantity)).toEqual(['axial', 'shear', 'moment']);
    expect(stationReadings(result, 4).find((item) => item.quantity === 'moment')?.value).toBeCloseTo(80);
  });

  it('keeps both lateral values when a result diagram has a real jump', () => {
    const result: MemberResult = {
      ...beam('M1'),
      diagramSegments: [
        { x0: 0, x1: 4, axial: [0, 0, 0], shear: [40, 0, 0], moment: [0, 40, 0, 0], distributedAxial: [0, 0], distributedTransverse: [0, 0] },
        { x0: 4, x1: 8, axial: [0, 0, 0], shear: [-40, 0, 0], moment: [160, -40, 0, 0], distributedAxial: [0, 0], distributedTransverse: [0, 0] },
      ],
      diagramJumps: [{ x: 4, axialDelta: 0, shearDelta: -80, momentDelta: 0 }],
    };
    expect(stationReadings(result, 4).find((item) => item.quantity === 'shear')?.jump).toEqual({ left: 40, right: -40 });
  });

  it('keeps the chosen lane order, storage preference, and at least one visible lane', () => {
    expect(toggleStackQuantity(['moment'], 'moment')).toEqual(['moment']);
    expect(toggleStackQuantity(['moment'], 'axial')).toEqual(['axial', 'moment']);
    expect(buildDiagramStack(beam('M1'), ['moment', 'axial'], { x: 0, y: 0, width: 200, laneHeight: 60, laneGap: 8 }).map((lane) => lane.quantity)).toEqual(['axial', 'moment']);
    persistStackQuantities(['shear', 'moment']);
    expect(localStorage.getItem(DIAGRAM_STACK_STORAGE_KEY)).toBe('["shear","moment"]');
    expect(readStoredStackQuantities()).toEqual(['shear', 'moment']);
    expect(parseStackQuantities('[]')).toEqual(['axial', 'shear', 'moment']);
    localStorage.clear();
  });

  it('reserves only the height of the lanes that are actually visible', () => {
    expect(stackMetricsFor(558, 1).total).toBeLessThan(stackMetricsFor(558, 3).total);
  });
});
