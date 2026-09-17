import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useI18n } from '../../i18n/useI18n';
import { emitWorkspaceCommand } from '../workspace/workspaceCommands';
import type { ModelHealthSnapshot } from './modelHealth';

const statusIcon = {
  ready: CheckCircle2,
  attention: AlertTriangle,
  blocked: ShieldAlert,
} as const;

export const ModelHealthBeacon = ({ health }: { health: ModelHealthSnapshot }) => {
  const { t } = useI18n();
  const Icon = statusIcon[health.status];
  const critical = health.critical === 1
    ? t('canvas.healthCriticalOne')
    : health.critical > 1 ? t('canvas.healthCriticalMany', { count: health.critical }) : null;
  const warnings = health.warnings === 1
    ? t('canvas.healthWarningOne')
    : health.warnings > 1 ? t('canvas.healthWarningMany', { count: health.warnings }) : null;
  const suggestions = health.suggestions > 0 ? t('canvas.healthSuggestionMany', { count: health.suggestions }) : null;
  const accessibleCounts = [critical, warnings, suggestions].filter((value): value is string => Boolean(value));
  return <button
    type="button"
    className={`model-health-beacon is-${health.status}`}
    data-testid="model-health-beacon"
    data-status={health.status}
    data-health-status={health.status}
    aria-label={`${t('canvas.healthLabel')}: ${t(health.messageKey)}. ${accessibleCounts.join(', ') || t('canvas.healthNoFindings')}`}
    onClick={() => emitWorkspaceCommand('open-model-doctor')}
  >
    <Icon size={15} aria-hidden="true" />
    <span className="model-health-copy">
      <small>{t('canvas.healthLabel')}</small>
      <strong>{t(health.messageKey)}</strong>
    </span>
    <span className="model-health-counts">
      {critical ? <span>{critical}</span> : null}
      {warnings ? <span>{warnings}</span> : null}
      {suggestions ? <span>{suggestions}</span> : null}
      {!critical && !warnings && !suggestions ? <span>{t('canvas.healthNoFindings')}</span> : null}
    </span>
  </button>;
};
