import { useCallback, useMemo } from 'react';
import { CheckCircle2, LocateFixed } from 'lucide-react';
import { summarizeAnalysisResults } from '../../engine/resultSummary';
import { toDisplay, unitLabel } from '../../engine/units';
import { resolveReliability } from '../../engine/reliability';
import { useProjectModel, useProjectAnalysis, useWorkspaceUI } from '../../store/ProjectContext';
import { useI18n } from '../../i18n/useI18n';
import { formatResultNumber } from './resultFormatting';
import { reliabilityLevelLabelKey } from './reliabilityCopy';

/**
 * La primera lectura de una corrida resuelta permanece visible mientras se
 * recorren diagramas, deformaciones o el resumen. Todos sus datos salen de la
 * misma respuesta que las tarjetas detalladas; esta capa sólo la prioriza.
 */
export const ResultDecisionStrip = () => {
  const { project } = useProjectModel();
  const { analysis, selectedCombinationId } = useProjectAnalysis();
  const { setSelection, setResultCursor, setResultTab } = useWorkspaceUI();
  const { t } = useI18n();
  const summary = useMemo(() => analysis?.success ? summarizeAnalysisResults(analysis) : null, [analysis]);
  const governing = (() => {
    if (!summary) return null;
    for (const quantity of ['moment', 'shear', 'axial'] as const) {
      const item = summary.diagrams[quantity]?.absolute;
      if (!item) continue;
      const unitQuantity = quantity === 'moment' ? 'moment' as const : 'force' as const;
      return {
        quantity,
        memberId: item.memberId,
        x: item.x,
        label: t('results.absoluteMaximum', { symbol: quantity === 'moment' ? 'M' : quantity === 'shear' ? 'V' : 'N' }),
        value: formatResultNumber(toDisplay(item.value, project.settings.units, unitQuantity)),
        unit: unitLabel(project.settings.units, unitQuantity),
      };
    }
    return null;
  })();
  const locate = useCallback(() => {
    if (!governing) return;
    setSelection({ kind: 'member', id: governing.memberId });
    setResultCursor({ memberId: governing.memberId, x: governing.x, pinned: true });
    setResultTab(governing.quantity);
  }, [governing, setResultCursor, setResultTab, setSelection]);
  if (!analysis?.success || !summary) return null;

  const targetLabel = project.combinations.find((item) => item.id === selectedCombinationId)?.name
    ?? project.loadCases.find((item) => item.id === selectedCombinationId)?.name
    ?? project.loadCases.find((item) => item.active)?.name
    ?? project.loadCases[0]?.name
    ?? '—';
  const reliability = resolveReliability(analysis).level;

  return <section className="result-decision-strip" data-testid="results-decision-strip" aria-label={t('results.decisionTitle')}>
    <div className="result-decision-strip__lead"><span className="result-decision-strip__icon" aria-hidden="true"><CheckCircle2 size={17} /></span><div><span>{t('results.decisionEyebrow')}</span><strong>{t('results.decisionTitle')}</strong><p>{t('results.decisionBody')}</p></div></div>
    <dl className="result-decision-strip__facts"><div><dt>{t('results.decisionScenario')}</dt><dd>{targetLabel}</dd></div><div><dt>{t('results.decisionReliability')}</dt><dd data-reliability={reliability}>{t(reliabilityLevelLabelKey[reliability])}</dd></div>{governing ? <div><dt>{t('results.decisionGoverning')}</dt><dd><b>{governing.label}</b><span>{governing.value} {governing.unit}</span></dd></div> : null}</dl>
    {governing ? <button type="button" onClick={locate}><LocateFixed size={15} aria-hidden="true" />{t('results.decisionLocate')}</button> : null}
  </section>;
};
