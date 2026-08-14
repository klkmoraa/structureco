import { useMemo } from 'react';
import { CircleSlash, Gauge, Info, LocateFixed } from 'lucide-react';
import { toDisplay, unitLabel } from '../../engine/units';
import { useI18n } from '../../i18n/useI18n';
import type { TranslationKey } from '../../i18n/catalogs';
import { useProject } from '../../store/ProjectContext';
import { formatFixed } from '../../utils/numberFormat';
import { formatInspectorNumber, formatInspectorValue } from '../inspector/numericFormatting';
import { emitWorkspaceCommand } from '../workspace/workspaceCommands';
import {
  ELASTIC_REFERENCE_RATIO,
  elasticDemandView,
  elasticIndexBand,
  type ElasticIndexBand,
  type ElasticIndexGap,
} from './elasticDemand';

/**
 * Índice elástico estimado de la estructura.
 *
 * Responde dos preguntas después de un análisis: cuánta demanda elástica hay
 * respecto del Fy declarado y dónde es mayor. **No responde si la estructura es
 * segura** — eso exige una comprobación por norma que este producto todavía no
 * hace. La tarjeta publica η sólo cuando cada dato que lo forma es verificable
 * (Fy y W por identidad de catálogo, análisis confiable) y, cuando no lo es,
 * dice qué falta en lugar de rellenarlo.
 *
 * El view-model vive en `elasticDemand`: el Inspector y el lienzo consumen el
 * mismo, así que las tres superficies no pueden contradecirse.
 */

const bandLabel: Record<ElasticIndexBand, TranslationKey> = {
  low: 'elastic.bandLow',
  moderate: 'elastic.bandModerate',
  high: 'elastic.bandHigh',
  'at-reference': 'elastic.bandAtReference',
};

const gapLabel: Record<ElasticIndexGap, TranslationKey> = {
  'yield-strength': 'elastic.missingYield',
  'section-modulus': 'elastic.missingModulus',
  'section-geometry': 'elastic.missingGeometry',
};

export const ElasticDemandCard = () => {
  const { project, analysis, setSelection } = useProject();
  const { t } = useI18n();
  const view = useMemo(() => elasticDemandView(project, analysis), [analysis, project]);
  const units = project.settings.units;

  const locate = (memberId: string) => {
    setSelection({ kind: 'member', id: memberId });
    emitWorkspaceCommand('focus-object', { kind: 'member', id: memberId });
  };

  if (view.status === 'unavailable') {
    const blockedKey: TranslationKey = view.blocker === 'no-analysis'
      ? 'elastic.blockedNoAnalysis'
      : view.blocker === 'unreliable' ? 'elastic.blockedUnreliable' : 'elastic.blockedNoMember';
    const firstGap = view.gaps[0];
    return <section
      className="elastic-demand"
      data-status="unavailable"
      data-blocker={view.blocker}
      aria-label={t('elastic.unavailableTitle')}
      data-testid="elastic-demand-card"
    >
      <header className="elastic-demand-header">
        <div className="elastic-demand-title">
          <CircleSlash size={16} aria-hidden="true" />
          <strong>{t('elastic.unavailableTitle')}</strong>
        </div>
      </header>
      <p className="elastic-demand-blocked">{t(blockedKey)}</p>
      {view.missing.length ? <ul className="elastic-demand-missing">
        {view.missing.map((gap) => <li key={gap}>{t(gapLabel[gap])}</li>)}
      </ul> : null}
      {view.blocker === 'unreliable'
        ? <button
          type="button"
          className="elastic-demand-action"
          data-testid="elastic-index-action"
          onClick={() => emitWorkspaceCommand('open-model-doctor')}
        >{t('elastic.actionDoctor')}</button>
        : firstGap ? <button
          type="button"
          className="elastic-demand-action"
          data-testid="elastic-index-action"
          onClick={() => locate(firstGap.memberId)}
        ><LocateFixed size={13} aria-hidden="true" />{t('elastic.actionAssign', { member: firstGap.memberId })}</button>
          : null}
      <small className="elastic-demand-limit">{t('elastic.limitNote')}</small>
    </section>;
  }

  const governing = view.governing;
  const ratio = governing.ratio;
  const band = elasticIndexBand(ratio);
  const percent = ratio * 100;
  const ratioText = formatFixed(ratio, 2, 'inspector');
  const percentText = formatFixed(percent, 0, 'inspector');
  const bandText = t(bandLabel[band]);
  const axialShare = Math.round(governing.axialShare * 100);
  const evaluated = view.readings.length;
  const total = evaluated + view.gaps.length;

  return <section
    className="elastic-demand"
    data-status="available"
    data-confidence={view.confidence}
    data-band={band}
    aria-label={t('elastic.title')}
    data-testid="elastic-demand-card"
  >
    <header className="elastic-demand-header">
      <div className="elastic-demand-title">
        <Gauge size={16} aria-hidden="true" />
        <strong>{t('elastic.title')}</strong>
      </div>
      {/* La banda va en texto, no sólo en el color de la rampa: quien no
          distingue el color lee lo mismo que quien sí. */}
      <span className="elastic-demand-band" data-band={band} data-testid="elastic-index-band">{bandText}</span>
    </header>

    <p className="elastic-index-value" data-testid="elastic-index-value">
      {t('elastic.value', { ratio: ratioText, percent: percentText })}
    </p>

    {/* Decorativa por contrato: η puede superar 1 y `role="meter"` obliga a
        aria-valuenow ≤ aria-valuemax. El valor y la banda ya están en texto
        justo encima, así que no hay nada que reponer por ARIA. */}
    <div className="elastic-index-scale" data-band={band} aria-hidden="true">
      <span className="elastic-index-fill" style={{ width: `${Math.min(percent, 100)}%` }} />
      <span className="elastic-index-reference" style={{ left: `${ELASTIC_REFERENCE_RATIO * 100}%` }} />
    </div>

    {view.confidence === 'limited'
      ? <p className="elastic-demand-limited" role="note">{t('elastic.limitedConfidence')}</p>
      : null}

    <dl className="elastic-demand-grid">
      <div>
        <dt>{t('elastic.governing')}</dt>
        <dd>
          <button
            type="button"
            className="elastic-demand-locate"
            data-testid="elastic-index-locate"
            title={t('elastic.locateHint', { member: governing.memberId })}
            onClick={() => locate(governing.memberId)}
          ><strong>{governing.memberId}</strong><LocateFixed size={13} aria-hidden="true" />{t('elastic.locate')}</button>
        </dd>
      </div>
      <div>
        <dt>{t('elastic.materialLabel')}</dt>
        <dd>
          {formatInspectorValue(toDisplay(governing.material.yieldStrength, units, 'elasticModulus'), unitLabel(units, 'elasticModulus'))}
          <small>{t('elastic.provenanceCatalog', { name: governing.material.name, id: governing.material.id })}</small>
        </dd>
      </div>
      <div>
        <dt>{t('elastic.sectionLabel')}</dt>
        <dd>
          {formatInspectorValue(toDisplay(governing.section.sectionModulus, units, 'sectionModulus'), unitLabel(units, 'sectionModulus'))}
          <small>{t('elastic.provenanceCatalog', { name: governing.section.name, id: governing.section.id })}</small>
        </dd>
      </div>
      <div>
        <dt>{t('elastic.forcesLabel')}</dt>
        <dd>
          N* {formatFixed(toDisplay(governing.maxAxial, units, 'force'), 2, 'inspector')} {unitLabel(units, 'force')}
          {' · '}
          M* {formatFixed(toDisplay(governing.maxMoment, units, 'moment'), 2, 'inspector')} {unitLabel(units, 'moment')}
          <small>{t('elastic.envelopeNote')}</small>
        </dd>
      </div>
    </dl>

    <details className="elastic-how">
      <summary>{t('elastic.howTitle')}</summary>
      <p className="elastic-how-chain">{t('elastic.howChain')}</p>
      <ol className="elastic-how-steps">
        <li>{t('elastic.howAxial', {
          axial: formatFixed(toDisplay(governing.maxAxial, units, 'force'), 2, 'inspector'),
          forceUnit: unitLabel(units, 'force'),
          area: formatInspectorNumber(toDisplay(governing.area, units, 'area')),
          areaUnit: unitLabel(units, 'area'),
          value: formatInspectorValue(toDisplay(governing.sigmaAxial, units, 'elasticModulus'), unitLabel(units, 'elasticModulus')),
        })}</li>
        <li>{t('elastic.howBending', {
          moment: formatFixed(toDisplay(governing.maxMoment, units, 'moment'), 2, 'inspector'),
          momentUnit: unitLabel(units, 'moment'),
          modulus: formatInspectorNumber(toDisplay(governing.section.sectionModulus, units, 'sectionModulus')),
          modulusUnit: unitLabel(units, 'sectionModulus'),
          value: formatInspectorValue(toDisplay(governing.sigmaBending, units, 'elasticModulus'), unitLabel(units, 'elasticModulus')),
        })}</li>
        <li>{t('elastic.howTotal', {
          value: formatInspectorValue(toDisplay(governing.sigmaTotal, units, 'elasticModulus'), unitLabel(units, 'elasticModulus')),
        })}</li>
        <li>{t('elastic.howRatio', {
          sigma: formatInspectorValue(toDisplay(governing.sigmaTotal, units, 'elasticModulus'), unitLabel(units, 'elasticModulus')),
          yield: formatInspectorValue(toDisplay(governing.material.yieldStrength, units, 'elasticModulus'), unitLabel(units, 'elasticModulus')),
          ratio: ratioText,
        })}</li>
      </ol>
      <p className="elastic-how-split">{`N* ${axialShare} % · M* ${100 - axialShare} % de σ*`}</p>
      <p className="elastic-how-reference"><Info size={13} aria-hidden="true" />{t('elastic.referenceNote')}</p>
    </details>

    {view.gaps.length ? <div className="elastic-demand-skipped">
      <p>{t('elastic.skipped', { count: view.gaps.length, total })}</p>
      <ul>
        {view.gaps.map((gap) => <li key={gap.memberId}>
          <button type="button" onClick={() => locate(gap.memberId)}>
            {t('elastic.skippedItem', { member: gap.memberId, reason: t(gapLabel[gap.gaps[0]]) })}
          </button>
        </li>)}
      </ul>
    </div> : null}

    <small className="elastic-demand-limit">{t('elastic.limitNote')}</small>
  </section>;
};
