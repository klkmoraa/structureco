import { describe, expect, it } from 'vitest';
import type { AnalysisScenario } from '../../engine/envelope';
import type { AnalysisResult } from '../../types';
import { buildScenarioNavigatorRows } from './scenarioNavigatorRows';

const solvedResult: AnalysisResult = {
  success: true,
  issues: [],
  nodeResults: [],
  memberResults: [{
    memberId: 'M1', length: 4, localDisplacements: [], localEndForces: [],
    diagramSegments: [
      { x0: 0, x1: 4, axial: [4, 0, 0, 0], shear: [-2, 0, 0, 0], moment: [0, 1, 0, 0] },
    ],
    diagramJumps: [], criticalPoints: [], diagram: [], deformation: [], deformationSegments: [], deformationCriticalPoints: [],
    maxAxial: 4, minAxial: 4, maxShear: -2, minShear: -2, maxMoment: 4, minMoment: 0,
  }],
  displacements: [0], residualNorm: 0, conditionEstimate: 1,
  equilibrium: { sumFx: 0, sumFy: 0, sumM: 0, normalizedComponents: { fx: 0, fy: 0, mz: 0 }, normalizedResidual: 0 },
  explanation: [],
} as unknown as AnalysisResult;

const scenario = (overrides: Partial<AnalysisScenario> = {}): AnalysisScenario => ({
  id: 'combination:C1', name: 'Servicio', kind: 'combination', result: solvedResult,
  status: 'reliable', usable: true, ...overrides,
});

describe('buildScenarioNavigatorRows', () => {
  it('keeps failures visible and calculates N/V/M extremes for solved scenarios', () => {
    const rows = buildScenarioNavigatorRows([
      scenario(),
      scenario({ id: 'combination:C2', name: 'Última', status: 'failed', usable: false, result: { ...solvedResult, success: false }, failureReason: 'No se pudo resolver' }),
    ], 'C1');

    expect(rows[0]).toMatchObject({ isCurrent: true, kind: 'combination', usable: true });
    expect(rows[0].values).toEqual({ axial: 4, shear: -2, moment: 4 });
    expect(rows[1]).toMatchObject({ status: 'failed', usable: false, reason: 'No se pudo resolver', isCurrent: false });
    expect(rows[1].values).toEqual({ axial: null, shear: null, moment: null });
  });

  it('marks only the selected combination as current, never a case with the same id', () => {
    const rows = buildScenarioNavigatorRows([
      scenario({ id: 'case:C1', kind: 'case', name: 'Caso C1' }),
      scenario({ id: 'combination:C1' }),
    ], 'C1');

    expect(rows.map((row) => row.isCurrent)).toEqual([false, true]);
  });
});
