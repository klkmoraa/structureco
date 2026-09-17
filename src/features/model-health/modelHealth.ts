import { resolveReliability, type ReliabilityLevel } from '../../engine/reliability';
import type { AnalysisResult, ProjectModel } from '../../types';
import type { TranslationKey } from '../../i18n/catalogs';
import { buildModelDoctorReport } from '../model-doctor/modelDoctorDiagnostics';

export type ModelHealthStatus = 'ready' | 'attention' | 'blocked';

export interface ModelHealthSnapshot {
  status: ModelHealthStatus;
  critical: number;
  warnings: number;
  suggestions: number;
  total: number;
  analysisLevel: ReliabilityLevel | null;
  messageKey: Extract<TranslationKey, `canvas.health${string}`>;
}

/**
 * One small, presentation-safe signal for the canvas chrome. It deliberately
 * reuses the Model Doctor and reliability contracts rather than inventing a
 * second validator or interpreting any solver number itself.
 */
export const buildModelHealth = (project: ProjectModel, analysis: AnalysisResult | null): ModelHealthSnapshot => {
  const report = buildModelDoctorReport(project);
  const reliability = analysis ? resolveReliability(analysis) : null;
  const blocked = report.counts.critical > 0
    || analysis?.success === false
    || reliability?.level === 'failed'
    || reliability?.level === 'unreliable';
  const attention = report.counts.warning > 0 || reliability?.level === 'limited';
  const status: ModelHealthStatus = blocked ? 'blocked' : attention ? 'attention' : 'ready';
  return {
    status,
    critical: report.counts.critical,
    warnings: report.counts.warning,
    suggestions: report.counts.suggestion,
    total: report.total,
    analysisLevel: reliability?.level ?? null,
    messageKey: status === 'blocked' ? 'canvas.healthBlocked' : status === 'attention' ? 'canvas.healthAttention' : 'canvas.healthReady',
  };
};
