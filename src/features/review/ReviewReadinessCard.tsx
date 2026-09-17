import { AlertTriangle, CheckCircle2, Clock3, ShieldAlert } from 'lucide-react';
import { useResultsFeatureI18n, type ResultsFeatureTranslationKey } from '../results/resultsFeatureI18n';
import type { ReviewReadinessAction, ReviewReadinessSnapshot, ReviewReadinessStatus } from './reviewReadiness';
import './reviewReadiness.css';

const statusKey: Record<ReviewReadinessStatus, ResultsFeatureTranslationKey> = {
  ready: 'results.reviewStatusReady',
  attention: 'results.reviewStatusAttention',
  blocked: 'results.reviewStatusBlocked',
  pending: 'results.reviewStatusPending',
};

const statusIcon = {
  ready: CheckCircle2,
  attention: AlertTriangle,
  blocked: ShieldAlert,
  pending: Clock3,
} as const;

export const ReviewReadinessCard = ({ snapshot, onOpenDoctor, onCompare }: {
  snapshot: ReviewReadinessSnapshot;
  onOpenDoctor: () => void;
  onCompare: () => void;
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
  return <section
    className="review-readiness-card"
    data-level="raised"
    data-testid="review-readiness-card"
    data-status={snapshot.status}
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
