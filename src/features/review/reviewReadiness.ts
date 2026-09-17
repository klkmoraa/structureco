import type { NumericCertificate } from '../../engine/certificate';
import type { AnalysisScenario } from '../../engine/envelope';
import { resolveReliability } from '../../engine/reliability';
import type { AnalysisResult, ProjectModel } from '../../types';
import type { TranslationKey } from '../../i18n/catalogs';
import type { ModelHealthSnapshot } from '../model-health/modelHealth';

export type ReviewReadinessStatus = 'ready' | 'attention' | 'blocked' | 'pending';
export type ReviewReadinessRowId = 'model' | 'analysis' | 'coverage' | 'certificate';
export type ReviewReadinessAction = 'doctor' | 'compare' | null;

export interface ReviewReadinessRow {
  id: ReviewReadinessRowId;
  status: ReviewReadinessStatus;
  labelKey: TranslationKey;
  detailKey: TranslationKey;
  action: ReviewReadinessAction;
}

export interface ReviewReadinessSnapshot {
  status: Exclude<ReviewReadinessStatus, 'pending'>;
  readyCount: number;
  totalCount: number;
  rows: ReviewReadinessRow[];
}

const labelKeys: Record<ReviewReadinessRowId, TranslationKey> = {
  model: 'results.reviewModel',
  analysis: 'results.reviewAnalysis',
  coverage: 'results.reviewCoverage',
  certificate: 'results.reviewCertificate',
};

const detailKeys: Record<ReviewReadinessRowId, Record<ReviewReadinessStatus, TranslationKey>> = {
  model: {
    ready: 'results.reviewModelReady',
    attention: 'results.reviewModelAttention',
    blocked: 'results.reviewModelBlocked',
    pending: 'results.reviewModelPending',
  },
  analysis: {
    ready: 'results.reviewAnalysisReady',
    attention: 'results.reviewAnalysisAttention',
    blocked: 'results.reviewAnalysisBlocked',
    pending: 'results.reviewAnalysisPending',
  },
  coverage: {
    ready: 'results.reviewCoverageReady',
    attention: 'results.reviewCoverageAttention',
    blocked: 'results.reviewCoverageBlocked',
    pending: 'results.reviewCoveragePending',
  },
  certificate: {
    ready: 'results.reviewCertificateReady',
    attention: 'results.reviewCertificateAttention',
    blocked: 'results.reviewCertificateBlocked',
    pending: 'results.reviewCertificatePending',
  },
};

const row = (id: ReviewReadinessRowId, status: ReviewReadinessStatus, action: ReviewReadinessAction): ReviewReadinessRow => ({
  id,
  status,
  labelKey: labelKeys[id],
  detailKey: detailKeys[id][status],
  action,
});

const overallStatus = (rows: readonly ReviewReadinessRow[]): Exclude<ReviewReadinessStatus, 'pending'> => {
  if (rows.some((item) => item.status === 'blocked')) return 'blocked';
  if (rows.some((item) => item.status === 'attention' || item.status === 'pending')) return 'attention';
  return 'ready';
};

/**
 * Builds a review checklist from existing evidence. “Ready” means the four
 * product checks are present, never that the structure is safe or code-compliant.
 */
export const buildReviewReadiness = (
  project: ProjectModel,
  health: ModelHealthSnapshot,
  analysis: AnalysisResult | null,
  scenarios: readonly AnalysisScenario[] | null,
  certificate: NumericCertificate | null,
): ReviewReadinessSnapshot => {
  void project;
  const modelStatus: ReviewReadinessStatus = health.status;
  let analysisStatus: ReviewReadinessStatus = 'pending';
  if (analysis) {
    const reliability = resolveReliability(analysis);
    analysisStatus = !analysis.success || reliability.level === 'failed' || reliability.level === 'unreliable'
      ? 'blocked'
      : reliability.level === 'limited' ? 'attention' : 'ready';
  }
  let coverageStatus: ReviewReadinessStatus = 'pending';
  if (scenarios) {
    coverageStatus = scenarios.length === 0 || scenarios.some((scenario) => !scenario.usable || scenario.status === 'failed' || scenario.status === 'unreliable')
      ? 'attention'
      : scenarios.some((scenario) => scenario.status === 'limited') ? 'attention' : 'ready';
  }
  const certificateStatus: ReviewReadinessStatus = !certificate
    ? 'pending'
    : certificate.verdict === 'verified' ? 'ready' : 'attention';
  const rows = [
    row('model', modelStatus, modelStatus === 'ready' ? null : 'doctor'),
    row('analysis', analysisStatus, null),
    row('coverage', coverageStatus, coverageStatus === 'ready' ? null : 'compare'),
    row('certificate', certificateStatus, null),
  ];
  return { status: overallStatus(rows), readyCount: rows.filter((item) => item.status === 'ready').length, totalCount: rows.length, rows };
};
