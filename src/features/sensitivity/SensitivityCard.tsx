import { useEffect, useMemo, useState } from 'react';
import { useProjectAnalysis, useProjectModel } from '../../store/ProjectContext';
import { toDisplay, unitLabel, type UnitQuantity } from '../../engine/units';
import { useI18n } from '../../i18n/useI18n';
import type { TranslationKey } from '../../i18n/catalogs';
import { formatFixed } from '../../utils/numberFormat';
import { formatResultNumber } from '../results/resultFormatting';
import { useSensitivityStudy } from './useSensitivityStudy';
import type { SensitivityMetric, SensitivityParameter, SensitivityPoint } from './sensitivity';
import './sensitivity.css';

const parameters: readonly SensitivityParameter[] = ['E', 'A', 'I'];
const parameterKeys: Record<SensitivityParameter, TranslationKey> = {
  E: 'results.sensitivityParameterE',
  A: 'results.sensitivityParameterA',
  I: 'results.sensitivityParameterI',
};
const parameterQuantities: Record<SensitivityParameter, UnitQuantity> = { E: 'elasticModulus', A: 'area', I: 'inertia' };
const metricKeys: Record<SensitivityMetric, TranslationKey> = {
  maxAxial: 'results.sensitivityMetricAxial',
  maxShear: 'results.sensitivityMetricShear',
  maxMoment: 'results.sensitivityMetricMoment',
  maxDeflection: 'results.sensitivityMetricDeflection',
};

const pointLabel = (point: SensitivityPoint, t: (key: TranslationKey) => string): string => (
  point.label === 'baseline' ? t('results.sensitivityBaseline') : point.label === 'lower' ? '−10 %' : '+10 %'
);

export const SensitivityCard = () => {
  const { project } = useProjectModel();
  const { analysis, selectedCombinationId } = useProjectAnalysis();
  const { language, t } = useI18n();
  const defaultMemberId = analysis?.memberResults[0]?.memberId ?? project.members[0]?.id ?? '';
  const [memberId, setMemberId] = useState(defaultMemberId);
  const [parameter, setParameter] = useState<SensitivityParameter>('I');
  const study = useSensitivityStudy(project, selectedCombinationId);
  const member = project.members.find((candidate) => candidate.id === memberId) ?? null;
  const availableParameters = useMemo(() => parameters.filter((candidate) => {
    const value = member?.[candidate];
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
  }), [member]);
  useEffect(() => {
    if (member && availableParameters.includes(parameter)) return;
    const nextMember = project.members.find((candidate) => parameters.some((candidateParameter) => {
      const value = candidate[candidateParameter];
      return typeof value === 'number' && Number.isFinite(value) && value > 0;
    }));
    setMemberId(nextMember?.id ?? '');
    setParameter(nextMember && nextMember.I > 0 ? 'I' : nextMember && nextMember.E > 0 ? 'E' : 'A');
  }, [availableParameters, member, parameter, project.members]);
  // A completed study belongs to both controls that produced it. Keep the
  // result hidden as soon as either control changes, even before the reset
  // effect or a new worker request gets a chance to run.
  const matchingStudy = study.result?.memberId === memberId && study.result.parameter === parameter ? study.result : null;
  const points = matchingStudy ? [matchingStudy.lower, matchingStudy.baseline, matchingStudy.upper] : [];
  const inputUnit = member && parameter ? parameterQuantities[parameter] : 'area';
  const formatInput = (point: SensitivityPoint) => `${formatResultNumber(toDisplay(point.inputValue, project.settings.units, inputUnit))} ${unitLabel(project.settings.units, inputUnit)}`;
  const formatMetric = (point: SensitivityPoint, metric: SensitivityMetric) => {
    const value = point[metric];
    if (value === null) return '—';
    const unitQuantity = metric === 'maxMoment' ? 'moment' as const : metric === 'maxDeflection' ? 'length' as const : 'force' as const;
    return `${formatResultNumber(toDisplay(value, project.settings.units, unitQuantity))} ${unitLabel(project.settings.units, unitQuantity)}`;
  };
  const formatChange = (point: SensitivityPoint, metric: SensitivityMetric) => {
    const change = point.relativeChange[metric];
    return change === null ? '—' : `${change >= 0 ? '+' : ''}${formatFixed(change, 1)} %`;
  };
  return <section className="sensitivity-card" data-testid="sensitivity-card" aria-label={t('results.sensitivityTitle')}>
    <header className="sensitivity-card-heading">
      <div><span>{t('results.sensitivityEyebrow')}</span><h3>{t('results.sensitivityTitle')}</h3><p>{t('results.sensitivityHint')}</p></div>
      <button type="button" onClick={() => memberId && study.run(memberId, parameter)} disabled={!memberId || !availableParameters.includes(parameter) || study.busy}>
        {study.busy ? t('results.sensitivityRunning') : t('results.sensitivityRun')}
      </button>
    </header>
    <div className="sensitivity-card-controls">
      <label>{t('results.sensitivityMember')}<select value={memberId} onChange={(event) => { study.reset(); setMemberId(event.target.value); }}>
        {project.members.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.id}</option>)}
      </select></label>
      <label>{t('results.sensitivityParameter')}<select value={parameter} onChange={(event) => { study.reset(); setParameter(event.target.value as SensitivityParameter); }}>
        {parameters.map((candidate) => <option key={candidate} value={candidate} disabled={!availableParameters.includes(candidate)}>{t(parameterKeys[candidate])}</option>)}
      </select></label>
    </div>
    {study.error ? <p className="sensitivity-card-error" role="alert">{language === 'es' ? study.error : t('results.sensitivityFailed')}</p> : null}
    {points.length ? <div className="sensitivity-points">
      {points.map((point) => <article key={point.label} className={`sensitivity-point is-${point.label}`} data-sensitivity-variant={point.label}>
        <header><strong>{pointLabel(point, t)}</strong><span>{formatInput(point)}</span></header>
        {point.success ? (['maxAxial', 'maxShear', 'maxMoment', 'maxDeflection'] as const).map((metric) => <div key={metric} className="sensitivity-metric"><span>{t(metricKeys[metric])}</span><strong>{formatMetric(point, metric)}</strong>{point.label !== 'baseline' ? <small>{formatChange(point, metric)}</small> : null}</div>) : <div className="sensitivity-point-error"><strong>{t('results.sensitivityUnavailable')}</strong><p>{language === 'es' ? point.error ?? t('results.sensitivityVariantFailed') : t('results.sensitivityVariantFailed')}</p></div>}
      </article>)}
    </div> : null}
    <p className="sensitivity-card-note">{t('results.sensitivityNoMutation')}</p>
    <p className="sensitivity-card-limit">{t('results.sensitivityLimit')}</p>
  </section>;
};
