import { AlertTriangle, CheckCircle2, Clock3, LoaderCircle, RefreshCw, ShieldAlert } from 'lucide-react';
import { useResultsFeatureI18n, type ResultsFeatureTranslationKey } from '../results/resultsFeatureI18n';
import type { ReviewReadinessAction, ReviewReadinessRowId, ReviewReadinessSnapshot, ReviewReadinessStatus } from './reviewReadiness';
import './reviewReadiness.css';

const statusKey: Record<ReviewReadinessStatus, ResultsFeatureTranslationKey> = {
  ready: 'results.reviewStatusReady',
  attention: 'results.reviewStatusAttention',
  blocked: 'results.reviewStatusBlocked',
  pending: 'results.reviewStatusPending',
};

type ReviewStepState = ReviewReadinessStatus | 'running';

const stepStatusKey: Record<ReviewStepState, ResultsFeatureTranslationKey> = {
  ...statusKey,
  running: 'results.reviewStatusRunning',
};

const statusIcon = {
  ready: CheckCircle2,
  attention: AlertTriangle,
  blocked: ShieldAlert,
  pending: Clock3,
} as const;

export const ReviewReadinessCard = ({ snapshot, onOpenDoctor, onCompare, onRunReview, isReviewRunning = false, analysisBusy = false, comparisonBusy = false, certificateBusy = false }: {
  snapshot: ReviewReadinessSnapshot;
  onOpenDoctor: () => void;
  onCompare: () => void;
  onRunReview?: () => void;
  isReviewRunning?: boolean;
  analysisBusy?: boolean;
  comparisonBusy?: boolean;
  certificateBusy?: boolean;
}) => {
  const { t } = useResultsFeatureI18n();
  const actionLabel: Record<Exclude<ReviewReadinessAction, null>, ResultsFeatureTranslationKey> = {
    doctor: 'results.reviewOpenDoctor',
    compare: 'results.reviewCompare',
  };
  const actionHandler: Record<Exclude<ReviewReadinessAction, null>, () => void> = {
    doctor: onOpenDoctor,
    compare: onCompare,
  };
  const busyByStep: Partial<Record<ReviewReadinessRowId, boolean>> = {
    analysis: analysisBusy,
    coverage: comparisonBusy,
    certificate: certificateBusy,
  };
  const modelBlocked = snapshot.rows.some((row) => row.id === 'model' && row.status === 'blocked');
  return <section
    className="review-readiness-card"
    data-level="raised"
    data-testid="review-readiness-card"
    data-status={snapshot.status}
    aria-busy={isReviewRunning}
    aria-label={t('results.reviewTitle')}
  >
    <header className="review-readiness-heading">
      <div>
        <span>{t('results.reviewEyebrow')}</span>
        <h3>{t('results.reviewTitle')}</h3>
        <p>{t('results.reviewHint')}</p>
      </div>
      <strong aria-label={t('results.reviewReadyCount', { ready: snapshot.readyCount, total: snapshot.totalCount })}>
        {snapshot.readyCount}/{snapshot.totalCount}
      </strong>
    </header>
    {onRunReview ? <div className="review-readiness-runbar">
      <div className="review-readiness-run-copy">
        <p role="status" aria-live="polite">{isReviewRunning ? t('results.reviewRunning') : t('results.reviewRunHint')}</p>
        <div className="review-readiness-run-steps" aria-label={t('results.reviewRunSteps')}>
          {snapshot.rows.map((reviewRow) => {
            const state: ReviewStepState = busyByStep[reviewRow.id] ? 'running' : reviewRow.status;
            const Icon = state === 'running' ? LoaderCircle : statusIcon[state];
            return <span key={reviewRow.id} data-review-step={reviewRow.id} data-state={state} aria-label={`${t(reviewRow.labelKey)}: ${t(stepStatusKey[state])}`}>
              <Icon className={state === 'running' ? 'spin' : undefined} size={12} aria-hidden="true" />
              {t(reviewRow.labelKey)}
            </span>;
          })}
        </div>
      </div>
      <button type="button" className={`review-readiness-run-button${modelBlocked ? ' is-blocked' : ''}`} onClick={onRunReview} disabled={isReviewRunning || modelBlocked}>
        {isReviewRunning ? <LoaderCircle className="spin" size={14} aria-hidden="true" /> : <RefreshCw size={14} aria-hidden="true" />}
        {isReviewRunning ? t('results.reviewRunning') : t('results.reviewRun')}
      </button>
    </div> : null}
    <ul className="review-readiness-list">
      {snapshot.rows.map((reviewRow) => {
        const Icon = statusIcon[reviewRow.status];
        return <li key={reviewRow.id} data-status={reviewRow.status}>
          <Icon size={16} aria-hidden="true" />
          <div className="review-readiness-row-copy">
            <div className="review-readiness-row-title">
              <strong>{t(reviewRow.labelKey)}</strong>
              <span>{t(statusKey[reviewRow.status])}</span>
            </div>
            <p>{t(reviewRow.detailKey)}</p>
          </div>
          {reviewRow.action ? <button type="button" onClick={actionHandler[reviewRow.action]}>{t(actionLabel[reviewRow.action])}</button> : null}
        </li>;
      })}
    </ul>
    <p className="review-readiness-disclaimer">{t('results.reviewDisclaimer')}</p>
  </section>;
};
