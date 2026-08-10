import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { toDisplay, unitLabel } from '../../engine/units';
import { useI18n } from '../../i18n/useI18n';
import type { MemberModel, MemberResult, UnitSystemId } from '../../types';
import { formatFixed } from '../../utils/numberFormat';
import { formatInspectorNumber, formatInspectorValue } from './numericFormatting';
import { DEMAND_WARNING_RATIO, demandTone, memberElasticDemand } from '../results/elasticDemand';

export interface InspectorNarrativeCardProps {
  member: MemberModel;
  result: MemberResult;
  units: UnitSystemId;
}

/**
 * Diagnóstico en lenguaje natural de la barra seleccionada.
 *
 * Los números ya están arriba, en la lista de valores derivados. Lo que falta es
 * la frase que un calculista diría en voz alta al mirarlos: cómo trabaja la
 * barra (flexión, axil o combinado), cuánto margen elástico le queda y si eso
 * es cómodo o no. El régimen se declara siempre como *estimación* — depende del
 * módulo elástico supuesto y del límite del material, y ninguno de los dos es
 * una comprobación normativa.
 */
export const InspectorNarrativeCard = ({ member, result, units }: InspectorNarrativeCardProps) => {
  const { t } = useI18n();
  const demand = memberElasticDemand(member, result);
  if (!demand) return null;

  const axialPercent = Math.round(demand.axialShare * 100);
  const bendingPercent = 100 - axialPercent;
  const mode = axialPercent >= 70 ? 'axial' : bendingPercent >= 70 ? 'bending' : 'combined';
  const tone = demandTone(demand.ratio);
  const percent = demand.ratio * 100;
  const ToneIcon = tone === 'overstressed' ? ShieldAlert : tone === 'warning' ? AlertTriangle : CheckCircle2;

  return <section className={`inspector-narrative tone-${tone}`} aria-label={t('inspector.narrativeTitle')}>
    <header>
      <ToneIcon size={15} aria-hidden="true" />
      <strong>{t('inspector.narrativeTitle')}</strong>
    </header>

    <p className="inspector-narrative-body">{t(
      mode === 'axial' ? 'inspector.narrativeModeAxial'
        : mode === 'bending' ? 'inspector.narrativeModeBending'
          : 'inspector.narrativeModeCombined',
      { id: member.id, axial: axialPercent, bending: bendingPercent },
    )}</p>

    <dl className="inspector-narrative-values">
      <div>
        <dt>N</dt>
        <dd>{formatFixed(toDisplay(demand.maxAxial, units, 'force'), 2, 'inspector')} {unitLabel(units, 'force')}</dd>
      </div>
      <div>
        <dt>M</dt>
        <dd>{formatFixed(toDisplay(demand.maxMoment, units, 'moment'), 2, 'inspector')} {unitLabel(units, 'moment')}</dd>
      </div>
      <div>
        {/* σ comparte dimensión con el módulo elástico: se muestra con esa
            cantidad para no colar un MPa fijo en un proyecto imperial. */}
        <dt>σ</dt>
        <dd>{formatInspectorValue(toDisplay(demand.sigmaTotal, units, 'elasticModulus'), unitLabel(units, 'elasticModulus'))}</dd>
      </div>
    </dl>

    <div
      className="inspector-narrative-meter"
      role="meter"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={t('inspector.narrativeUtilization')}
    >
      <span className={`meter-fill tone-${tone}`} style={{ width: `${Math.min(percent, 100)}%` }} />
      <span className="meter-threshold" style={{ left: `${DEMAND_WARNING_RATIO * 100}%` }} aria-hidden="true" />
    </div>

    <p className="inspector-narrative-verdict">{t(
      tone === 'overstressed' ? 'inspector.narrativeOverstressed'
        : tone === 'warning' ? 'inspector.narrativeWarning'
          : 'inspector.narrativeSafe',
      { percent: formatFixed(percent, 0, 'inspector') },
    )}</p>

    <small className="inspector-narrative-basis">{t(
      demand.estimatedYield ? 'inspector.narrativeBasisEstimated' : 'inspector.narrativeBasis',
      {
        yield: formatInspectorNumber(toDisplay(demand.yieldStrength, units, 'elasticModulus')),
        yieldUnit: unitLabel(units, 'elasticModulus'),
        section: demand.sectionName ?? t('inspector.sectionEquivalent'),
      },
    )}</small>
  </section>;
};
