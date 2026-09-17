import { describe, expect, it } from 'vitest';
import { createDefaultProject } from '../../data/defaultProject';
import type { AnalysisResult } from '../../types';
import { buildModelHealth } from './modelHealth';

const result = (level: 'reliable' | 'limited' | 'unreliable' | 'failed' = 'reliable'): AnalysisResult => ({
  success: level !== 'failed',
  issues: [],
  nodeResults: [{ nodeId: 'N1', ux: 0, uy: 0, rz: 0, rx: 0, ry: 0, rm: 0 }],
  memberResults: [],
  displacements: [0],
  residualNorm: 0,
  conditionEstimate: 1,
  equilibrium: { sumFx: 0, sumFy: 0, sumM: 0, normalizedComponents: { fx: 0, fy: 0, mz: 0 }, normalizedResidual: 0 },
  explanation: [],
  reliability: { completed: level !== 'failed', usable: level !== 'failed', level, checks: [], reasons: level === 'reliable' ? [] : ['control de prueba'] },
} as AnalysisResult);

describe('buildModelHealth', () => {
  it('publishes a ready beacon for a valid model and reliable result', () => {
    const health = buildModelHealth(createDefaultProject(), result());

    expect(health).toMatchObject({ status: 'ready', critical: 0, warnings: 0, analysisLevel: 'reliable' });
    expect(health.total).toBe(0);
  });

  it('blocks before analysis when the model doctor finds a critical issue', () => {
    const project = createDefaultProject();
    project.members[0].E = 0;

    const health = buildModelHealth(project, null);

    expect(health.status).toBe('blocked');
    expect(health.critical).toBeGreaterThan(0);
    expect(health.messageKey).toBe('canvas.healthBlocked');
  });

  it('raises attention for a numerically limited result without hiding the model counts', () => {
    const health = buildModelHealth(createDefaultProject(), result('limited'));

    expect(health).toMatchObject({ status: 'attention', critical: 0, warnings: 0, analysisLevel: 'limited' });
    expect(health.messageKey).toBe('canvas.healthAttention');
  });
});
