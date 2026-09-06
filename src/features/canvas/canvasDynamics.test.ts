import { describe, expect, it } from 'vitest';
import { computeForceFlows, harmonicFactor } from './canvasDynamics';
import type { ProjectModel } from '../../types';

describe('canvasDynamics', () => {
  it('computes harmonic factor oscillating around 0', () => {
    expect(harmonicFactor(0)).toBeCloseTo(0);
    // At t = 250ms with 1Hz, omega*t = 2*pi * 0.25 = pi/2 -> sin(pi/2) = 1
    expect(harmonicFactor(250, 1.0, 1.0)).toBeCloseTo(1.0);
    // At t = 750ms with 1Hz, omega*t = 3*pi/2 -> sin(3*pi/2) = -1
    expect(harmonicFactor(750, 1.0, 1.0)).toBeCloseTo(-1.0);
    // Respects amplitude
    expect(harmonicFactor(250, 1.0, 2.5)).toBeCloseTo(2.5);
  });

  it('computes force flows correctly identifying tension and compression', () => {
    const project = {
      nodes: [
        { id: 'N1', x: 0, y: 0 },
        { id: 'N2', x: 4, y: 0 },
        { id: 'N3', x: 2, y: 3 },
      ],
      members: [
        { id: 'M1', i: 'N1', j: 'N2', type: 'frame' },
        { id: 'M2', i: 'N1', j: 'N3', type: 'frame' },
      ],
    } as unknown as ProjectModel;

    const results = [
      { memberId: 'M1', maxAxial: 50, minAxial: 50 }, // tension
      { memberId: 'M2', maxAxial: -100, minAxial: -100 }, // compression
    ];

    const flows = computeForceFlows(project, results);
    expect(flows.size).toBe(2);

    const m1 = flows.get('M1')!;
    expect(m1.kind).toBe('tension');
    expect(m1.flowDirection).toBe(1);
    expect(m1.intensity).toBeCloseTo(0.5);

    const m2 = flows.get('M2')!;
    expect(m2.kind).toBe('compression');
    expect(m2.flowDirection).toBe(-1);
    expect(m2.intensity).toBeCloseTo(1.0);
  });
});
