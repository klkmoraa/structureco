import { useEffect, useState } from 'react';
import { Grid3X3, Stethoscope, TriangleAlert } from 'lucide-react';
import { toDisplay, unitLabel } from '../../engine/units';
import { useI18n } from '../../i18n/useI18n';
import { useProjectAnalysis } from '../../store/ProjectAnalysisContext';
import { useProjectModel } from '../../store/ProjectModelContext';
import { emitWorkspaceCommand } from '../workspace/workspaceCommands';
import { buildModelOverview } from './modelOverview';

/**
 * Keep Model Doctor out of the resident inspector chunk: the overview only
 * needs its total, and the full surface already loads its diagnostics lazily.
 */
const useModelDoctorTotal = (): number | null => {
  const { project } = useProjectModel();
  const [total, setTotal] = useState<number | null>(null);
  useEffect(() => {
    let current = true;
    void import('../model-doctor/modelDoctorDiagnostics').then(({ buildModelDoctorReport }) => {
      if (current) setTotal(buildModelDoctorReport(project).total);
    });
    return () => { current = false; };
  }, [project]);
  return total;
};

export const ModelOverviewPanel = () => {
  const { project } = useProjectModel();
  const { selectedCombinationId } = useProjectAnalysis();
  const { language, t } = useI18n();
  const overview = buildModelOverview(project, selectedCombinationId);
  const doctorTotal = useModelDoctorTotal();
  const units = project.settings.units;
  const number = (value: number) => new Intl.NumberFormat(language === 'es' ? 'es-MX' : 'en-US', { maximumFractionDigits: 2 })
    .format(toDisplay(value, units, 'length'));

  if (overview.empty) return <section className="model-overview model-overview--empty" aria-label={t('overview.region')}>
    <Grid3X3 size={20} aria-hidden="true" />
    <h3>{t('overview.emptyTitle')}</h3><p>{t('overview.emptyBody')}</p>
    <button type="button" className="model-overview__action" onClick={() => emitWorkspaceCommand('open-structure-generator')}>
      {t('generator.launcher')}
    </button>
  </section>;

  return <section className="model-overview" aria-label={t('overview.region')}>
    <header><h3>{t('overview.title')}</h3><p>{t('overview.body')}</p></header>
    <dl className="model-overview__census">
      <div><dt>{t('inspector.nodes')}</dt><dd>{overview.nodes}</dd></div>
      <div><dt>{t('inspector.members')}</dt><dd>{overview.members}</dd></div>
      <div><dt>{t('overview.supports')}</dt><dd>{overview.supports}</dd></div>
      <div><dt>{t('inspector.loadsTab')}</dt><dd>{overview.loads}</dd></div>
    </dl>
    <dl className="model-overview__facts">
      {overview.extent ? <div><dt>{t('overview.extent')}</dt><dd>{number(overview.extent.width)} × {number(overview.extent.height)} {unitLabel(units, 'length')}</dd></div> : null}
      <div><dt>{t('overview.loadCases')}</dt><dd>{t('overview.loadCasesValue', { active: overview.activeLoadCases, total: overview.totalLoadCases })}</dd></div>
      <div><dt>{t('overview.combination')}</dt><dd>{overview.combinationName ?? t('analysis.activeCases')}</dd></div>
    </dl>
    {doctorTotal !== null && doctorTotal > 0 ? <button
      type="button"
      className="model-overview__action model-overview__action--warning"
      onClick={() => emitWorkspaceCommand('open-model-doctor')}
    >
      <TriangleAlert size={17} aria-hidden="true" />
      <span><strong>{t('overview.doctorFindings', { count: doctorTotal })}</strong><small>{t('overview.doctorHint')}</small></span>
    </button> : null}
    {doctorTotal === 0 ? <p className="model-overview__clean"><Stethoscope size={16} aria-hidden="true" /> {t('overview.doctorClean')}</p> : null}
  </section>;
};
