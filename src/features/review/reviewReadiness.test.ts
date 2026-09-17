import { describe, expect, it } from 'vitest';
import type { NumericCertificate } from '../../engine/certificate';
import type { AnalysisScenario } from '../../engine/envelope';
import type { AnalysisResult } from '../../types';
import type { ModelHealthSnapshot } from '../model-health/modelHealth';
import { buildReviewReadiness } from './reviewReadiness';

const health: ModelHealthSnapshot = { status: 'ready', critical: 0, warnings: 0, suggestions: 0, total: 0, analysisLevel: 'reliable', messageKey: 'canvas.healthReady' };
const analysis = { success: true, reliability: { completed: true, usable: true, level: 'reliable', checks: [], reasons: [] } } as unknown as AnalysisResult;
const certificate = (verdict: NumericCertificate['verdict']): NumericCertificate => ({ checks: [], verdict, summary: '', extraSolves: 0 });
const scenario = { id: 'case:LC1', name: 'Servicio', kind: 'case', status: 'reliable', usable: true, result: analysis } as AnalysisScenario;

describe('buildReviewReadiness', () => {
  it('does not call an analysis ready without compared scenarios or a verifiable certificate', () => {
    const snapshot = buildReviewReadiness({} as never, health, analysis, null, certificate('not-verifiable'));

    expect(snapshot.status).toBe('attention');
    expect(snapshot.rows.find((row) => row.id === 'coverage')?.status).toBe('pending');
    expect(snapshot.rows.find((row) => row.id === 'certificate')?.status).toBe('attention');
  });

  it('becomes ready only when every evidence row is ready', () => {
    const snapshot = buildReviewReadiness({} as never, health, analysis, [scenario], certificate('verified'));

    expect(snapshot).toMatchObject({ status: 'ready', readyCount: 4, totalCount: 4 });
    expect(snapshot.rows.every((row) => row.status === 'ready')).toBe(true);
  });
});
