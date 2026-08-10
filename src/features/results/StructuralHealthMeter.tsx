import { useMemo } from 'react';
import { Activity, AlertTriangle, CheckCircle2, LocateFixed, ShieldAlert } from 'lucide-react';
import { toDisplay, unitLabel } from '../../engine/units';
import { useI18n } from '../../i18n/useI18n';
import { useProject } from '../../store/ProjectContext';
import { formatFixed } from '../../utils/numberFormat';
import { formatInspectorValue } from '../inspector/numericFormatting';
import { emitWorkspaceCommand } from '../workspace/workspaceCommands';
import { DEMAND_WARNING_RATIO, demandTone, structuralDemandSummary } from './elasticDemand';

/**
 * Utilización elástica estimada de toda la estructura.
 *
 * Recorre las barras, se queda con la más exigida y responde de un vistazo las
 * dos preguntas que siguen a un análisis resuelto: cuánto margen elástico queda
 * y dónde se agota primero. No es una verificación normativa — el módulo
 * elástico y el límite del material son supuestos declarados en `elasticDemand`
 * y repetidos al pie de la tarjeta.
 */
export const StructuralHealthMeter = () => {
  const { project, analysis, setSelection } = useProject();
  const { t } = useI18n();
  const summary = useMemo(() => structuralDemandSummary(project, analysis), [analysis, project]);
  if (!summary) return null;

  const { critical, maxRatio, anyEstimatedYield } = summary;
  const percent = maxRatio * 100;
  const tone = demandTone(maxRatio);
  const ToneIcon = tone === 'overstressed' ? ShieldAlert : tone === 'warning' ? AlertTriangle : CheckCircle2;
  const axialPercent = Math.round(critical.axialShare * 100);
  // σ comparte dimensión con el módulo elástico: se muestra con esa cantidad.
  const units = project.settings.units;

  const locateCritical = () => {
    setSelection({ kind: 'member', id: critical.memberId });
    emitWorkspaceCommand('focus-object', { kind: 'member', id: critical.memberId });
  };

  return <section className={`structural-health tone-${tone}`} aria-label={t('results.healthTitle')} data-testid="structural-health-meter">
    <header className="structural-health-header">
      <div className="structural-health-title">
        <Activity size={16} aria-hidden="true" />
        <strong>{t('results.healthTitle')}</strong>
      </div>
      <span className={`structural-health-badge tone-${tone}`}>
        <ToneIcon size={13} aria-hidden="true" />
        {t(
          tone === 'overstressed' ? 'results.healthOverstressed'
            : tone === 'warning' ? 'results.healthElevated'
              : 'results.healthSafe',
          { percent: formatFixed(percent, 0, 'inspector') },
        )}
      </span>
    </header>

    <div
      className="structural-health-track"
      role="meter"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={t('results.healthMeterAria')}
    >
      <span className={`structural-health-fill tone-${tone}`} style={{ width: `${Math.min(percent, 100)}%` }} />
      <span className="structural-health-mark" style={{ left: `${DEMAND_WARNING_RATIO * 100}%` }} title={t('results.healthWarningMark')} />
      <span className="structural-health-mark is-yield" style={{ left: '100%' }} title={t('results.healthYieldMark')} />
    </div>

    <dl className="structural-health-grid">
      <div>
        <dt>{t('results.healthCriticalMember')}</dt>
        <dd>
          <button type="button" className="structural-health-locate" onClick={locateCritical} title={t('results.healthLocate')}>
            <strong>{critical.memberId}</strong><LocateFixed size={13} aria-hidden="true" />
          </button>
        </dd>
      </div>
      <div>
        <dt>σ<sub>max</sub></dt>
        <dd>{formatInspectorValue(toDisplay(critical.sigmaTotal, units, 'elasticModulus'), unitLabel(units, 'elasticModulus'))}</dd>
      </div>
      <div>
        {/* η y su porcentaje, no 1/η: un "factor" invita a leerlo como el
            coeficiente de seguridad de una norma, y esto es una estimación
            elástica. La magnitud que manda es la utilización. */}
        <dt>{t('results.healthUtilization')}</dt>
        <dd data-testid="structural-health-ratio">η {formatFixed(maxRatio, 2, 'inspector')} · {formatFixed(percent, 0, 'inspector')}%</dd>
      </div>
      <div>
        <dt>{t('results.healthContribution')}</dt>
        <dd>
          <span className="structural-health-split" title={t('results.healthContributionAria', { axial: axialPercent, bending: 100 - axialPercent })}>
            <i className="is-axial" style={{ width: `${axialPercent}%` }} />
            <i className="is-bending" style={{ width: `${100 - axialPercent}%` }} />
          </span>
        </dd>
      </div>
    </dl>

    <small className="structural-health-basis">{t(
      anyEstimatedYield ? 'results.healthBasisEstimated' : 'results.healthBasis',
      {
        member: critical.memberId,
        axial: formatFixed(toDisplay(critical.maxAxial, units, 'force'), 2, 'inspector'),
        forceUnit: unitLabel(units, 'force'),
        moment: formatFixed(toDisplay(critical.maxMoment, units, 'moment'), 2, 'inspector'),
        momentUnit: unitLabel(units, 'moment'),
      },
    )}</small>
  </section>;
};
