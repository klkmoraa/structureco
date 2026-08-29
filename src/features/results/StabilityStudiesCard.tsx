import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import type { ModelStudiesState } from '../../engine/useModelStudies';
import { useI18n } from '../../i18n/useI18n';
import { useProject } from '../../store/ProjectContext';
import { formatFixed, formatScientific } from '../../utils/numberFormat';

export const StabilityStudiesCard = ({ studies }: { studies: ModelStudiesState }) => {
  const { t } = useI18n();
  const { modeShapeState, setModeShapeState } = useProject();
  const buckling = studies.buckling;
  const modal = studies.modal;
  const [bucklingMode, setBucklingMode] = useState(0);
  const [modalMode, setModalMode] = useState(0);
  useEffect(() => { if (bucklingMode >= (buckling?.modes.length ?? 0)) setBucklingMode(0); }, [buckling?.modes.length, bucklingMode]);
  useEffect(() => { if (modalMode >= (modal?.modes.length ?? 0)) setModalMode(0); }, [modal?.modes.length, modalMode]);
  const selectedBuckling = buckling?.modes[bucklingMode];
  const selectedModal = modal?.modes[modalMode];
  const details = (items: Array<{ label: string; value: string | number }>) => <dl className="stability-study-details">{items.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>;
  const button = (kind: 'buckling' | 'modal', label: string, exists: boolean) => <button type="button" onClick={() => { setModeShapeState(null); studies.run(kind); }} disabled={studies.busy !== null}>
    {studies.busy === kind ? <><LoaderCircle className="spin" size={15} aria-hidden="true" /> {t('results.studyRunning')}</> : exists ? t('results.studyRecompute') : label}
  </button>;
  return <section className="stability-studies-card" data-level="raised" aria-label={t('results.stabilityStudies')}>
    <header><div><span>{t('results.stabilityStudies')}</span><h3>{t('results.stabilityStudiesHint')}</h3></div><div>{button('buckling', t('results.computeBuckling'), Boolean(buckling))}{button('modal', t('results.computeModal'), Boolean(modal))}</div></header>
    {studies.error ? <p role="alert" className="stability-study-limit">{studies.error.message}</p> : null}
    <div className="stability-study-grid">
      <article><strong>{t('results.buckling')}</strong>{buckling?.success && selectedBuckling ? <><label className="stability-study-mode"><span>{t('results.studyMode')}</span><select aria-label={t('results.studyMode')} value={bucklingMode} onChange={(event) => setBucklingMode(Number(event.target.value))}>{buckling.modes.map((_, index) => <option key={index} value={index}>{t('results.modeIndex', { index: index + 1 })}</option>)}</select></label><b>λcr {formatFixed(selectedBuckling.criticalLoadFactor, 3)}</b>{details([{ label: t('results.computedModes'), value: buckling.modes.length }, { label: t('results.studyResidual'), value: formatScientific(buckling.residual, 2) }, { label: t('results.studyFreeDof'), value: buckling.freeDegreesOfFreedom }])}<button type="button" aria-pressed={modeShapeState?.kind === 'buckling' && modeShapeState.index === bucklingMode} onClick={() => setModeShapeState(modeShapeState?.kind === 'buckling' && modeShapeState.index === bucklingMode ? null : { kind: 'buckling', index: bucklingMode, label: t('results.bucklingMode', { index: bucklingMode + 1 }), shape: selectedBuckling.shape })}>{modeShapeState?.kind === 'buckling' && modeShapeState.index === bucklingMode ? t('results.hideModeOnCanvas') : t('results.showModeOnCanvas')}</button>{buckling.issues.length ? <ul className="stability-study-issues">{buckling.issues.map((issue) => <li key={issue.id}>{issue.message}</li>)}</ul> : null}</> : <p>{buckling ? buckling.reason : t('results.studyIdle')}</p>}<small>{t('results.bucklingLimit')}</small></article>
      <article><strong>{t('results.modal')}</strong>{modal?.success && selectedModal ? <><label className="stability-study-mode"><span>{t('results.studyMode')}</span><select aria-label={t('results.studyMode')} value={modalMode} onChange={(event) => setModalMode(Number(event.target.value))}>{modal.modes.map((_, index) => <option key={index} value={index}>{t('results.modeIndex', { index: index + 1 })}</option>)}</select></label><b>{formatFixed(selectedModal.frequency, 3)} Hz</b>{details([{ label: t('results.period'), value: `${formatFixed(selectedModal.period, 3)} s` }, { label: t('results.angularFrequency'), value: `${formatFixed(selectedModal.angularFrequency, 3)} rad/s` }, { label: `${t('results.participatingMass')} X`, value: `${formatFixed(selectedModal.participatingMassRatioX * 100, 1)} %` }, { label: `${t('results.participatingMass')} Y`, value: `${formatFixed(selectedModal.participatingMassRatioY * 100, 1)} %` }, { label: `${t('results.cumulativeMass')} Y`, value: `${formatFixed(modal.cumulativeMassRatioY * 100, 1)} %` }, { label: t('results.totalMass'), value: `${formatFixed(modal.totalMass, 3)} Mg` }, { label: t('results.studyResidual'), value: formatScientific(modal.residual, 2) }, { label: t('results.studyFreeDof'), value: modal.freeDegreesOfFreedom }])}<button type="button" aria-pressed={modeShapeState?.kind === 'modal' && modeShapeState.index === modalMode} onClick={() => setModeShapeState(modeShapeState?.kind === 'modal' && modeShapeState.index === modalMode ? null : { kind: 'modal', index: modalMode, label: t('results.modalMode', { index: modalMode + 1 }), shape: selectedModal.shape })}>{modeShapeState?.kind === 'modal' && modeShapeState.index === modalMode ? t('results.hideModeOnCanvas') : t('results.showModeOnCanvas')}</button>{modal.issues.length ? <ul className="stability-study-issues">{modal.issues.map((issue) => <li key={issue.id}>{issue.message}</li>)}</ul> : null}</> : <p>{modal ? modal.reason : t('results.studyIdle')}</p>}<small>{t('results.modalLimit')}</small><small>{t('results.modalMassSource')}</small></article>
    </div>
  </section>;
};
