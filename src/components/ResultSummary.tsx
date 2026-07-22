import { useMemo } from 'react';
import { Download, GitCompareArrows, LocateFixed, Printer, RefreshCw } from 'lucide-react';
import { useScenarioAnalysis } from '../engine/useScenarioAnalysis';
import { buildDeformationEnvelope, buildReactionEnvelope, summarizeAnalysisResults } from '../engine/resultSummary';
import { toDisplay, unitLabel } from '../engine/units';
import { useProject, type ResultTab } from '../store/ProjectContext';
import type { DiagramQuantity, ResponseQuantity } from '../types';
import { downloadResultsCsv } from '../utils/resultsExport';
import { useClassroomSession } from '../store/ClassroomSessionContext';
import { formatResultNumber, formatResultValue } from './results/resultFormatting';
import { useI18n } from '../i18n/useI18n';

const diagramTab: Record<DiagramQuantity, ResultTab> = { axial: 'axial', shear: 'shear', moment: 'moment' };
const diagramSymbol: Record<DiagramQuantity, string> = { axial: 'N', shear: 'V', moment: 'M' };

export const ResultSummary = () => {
  const { project, analysis, setSelection, setResultCursor, setResultTab } = useProject();
  const { t } = useI18n();
  const { scenarios, busy: comparisonBusy, error: comparisonError, run: compare } = useScenarioAnalysis(project);
  const { predictions } = useClassroomSession();
  const summary = useMemo(() => analysis?.success ? summarizeAnalysisResults(analysis) : null, [analysis]);
  const reactionEnvelope = useMemo(() => scenarios ? buildReactionEnvelope(scenarios) : null, [scenarios]);
  const selectedMemberId = summary?.diagrams.moment?.absolute.memberId ?? summary?.members[0]?.memberId ?? '';
  const classroom = project.settings.calculationMode === 'classroom';
  const deformationEnvelope = useMemo(() => !classroom && scenarios && selectedMemberId ? buildDeformationEnvelope(scenarios, selectedMemberId, 'v') : null, [classroom, scenarios, selectedMemberId]);
  if (!analysis?.success || !summary) return null;
  const units = project.settings.units;
  const locate = (quantity: DiagramQuantity | ResponseQuantity, memberId: string, x: number) => {
    setSelection({ kind: 'member', id: memberId });
    setResultCursor({ memberId, x, pinned: true });
    setResultTab(quantity === 'u' || quantity === 'v' || quantity === 'theta' ? 'deformed' : diagramTab[quantity]);
  };
  const displayDiagram = (quantity: DiagramQuantity, value: number) => {
    const unitQuantity = quantity === 'moment' ? 'moment' as const : 'force' as const;
    return formatResultValue(toDisplay(value, units, unitQuantity), unitLabel(units, unitQuantity));
  };
  return <section className="result-summary-workspace" aria-label={t('results.summaryWorkspace')}>
    <header className="result-summary-header">
      <div><strong>Resumen global</strong><span>Extremos exactos del modelo · selecciona un valor para localizarlo</span></div>
      <div className="result-summary-actions">
        <button onClick={() => downloadResultsCsv(project, analysis)}><Download size={15} /> CSV</button>
        <button onClick={() => window.print()}><Printer size={15} /> PDF / imprimir</button>
        <button disabled={comparisonBusy} onClick={compare}>{comparisonBusy ? <RefreshCw className="spin" size={15} /> : <GitCompareArrows size={15} />} {scenarios ? 'Actualizar' : 'Comparar casos'}</button>
      </div>
    </header>
    <div className="global-extrema-grid">
      {(['axial', 'shear', 'moment'] as const).map((quantity) => {
        const item = summary.diagrams[quantity]?.absolute;
        return item ? <button className={quantity} key={quantity} onClick={() => locate(quantity, item.memberId, item.x)}><span>{diagramSymbol[quantity]} máx. absoluto</span><strong>{displayDiagram(quantity, item.value)}</strong><small>{item.memberId} · x {formatResultNumber(toDisplay(item.x, units, 'length'))} {unitLabel(units, 'length')}</small><LocateFixed size={14} /></button> : null;
      })}
      {!classroom && summary.deformations.v?.absolute ? <button className="deformation" onClick={() => { const item = summary.deformations.v!.absolute; locate('v', item.memberId, item.x); }}><span>Desplazamiento v</span><strong>{formatResultValue(toDisplay(summary.deformations.v.absolute.value, units, 'length'), unitLabel(units, 'length'))}</strong><small>{summary.deformations.v.absolute.memberId} · máximo interior exacto</small><LocateFixed size={14} /></button> : null}
    </div>
    {Object.keys(predictions).length ? <section className="prediction-comparison"><div><strong>Tu predicción frente al resultado</strong><span>Los valores estimados se interpretan en las unidades visibles.</span></div><div>{Object.entries(predictions).flatMap(([memberId, values]) => (['axial', 'shear', 'moment'] as const).flatMap((quantity) => { const predicted = values[quantity]; const member = summary.members.find((item) => item.memberId === memberId); if (predicted === undefined || !member) return []; const actual = member.diagrams[quantity].absolute; const actualDisplay = quantity === 'moment' ? toDisplay(actual.value, units, 'moment') : toDisplay(actual.value, units, 'force'); return [<button key={`${memberId}-${quantity}`} onClick={() => locate(quantity, memberId, actual.x)}><b>{memberId} · {diagramSymbol[quantity]}</b><span>Estimaste {predicted.toPrecision(5)}</span><span>Resultado {actualDisplay.toPrecision(5)}</span><small>Error {Math.abs(predicted - actualDisplay).toPrecision(4)}</small></button>]; }))}</div></section> : null}
    <div className="summary-table-wrap"><table className="results-table result-extrema-table"><caption>Extremos absolutos por miembro</caption><thead><tr><th>Miembro</th><th>N</th><th>V</th><th>M</th>{classroom ? null : <th>v</th>}</tr></thead><tbody>{summary.members.map((member) => <tr key={member.memberId}><th scope="row">{member.memberId}</th>{(['axial', 'shear', 'moment'] as const).map((quantity) => { const item = member.diagrams[quantity].absolute; return <td key={quantity}><button onClick={() => locate(quantity, member.memberId, item.x)}>{displayDiagram(quantity, item.value)}<small>x {formatResultNumber(toDisplay(item.x, units, 'length'))}</small></button></td>; })}{classroom ? null : <td>{member.deformations.v?.absolute ? <button onClick={() => locate('v', member.memberId, member.deformations.v!.absolute.x)}>{formatResultValue(toDisplay(member.deformations.v.absolute.value, units, 'length'), unitLabel(units, 'length'))}<small>x {formatResultNumber(toDisplay(member.deformations.v.absolute.x, units, 'length'))}</small></button> : '—'}</td>}</tr>)}</tbody></table></div>
    {scenarios ? <section className="scenario-comparison" aria-live="polite"><div className="scenario-comparison-heading"><div><strong>Comparación de escenarios</strong><span>{scenarios.length} casos y combinaciones resueltos</span></div><small>Small multiples numéricos: evita superponer líneas difíciles de leer.</small></div><div className="scenario-cards">{scenarios.map((scenario) => { const item = summarizeAnalysisResults(scenario.result); return <article key={scenario.id}><strong>{scenario.name}</strong>{(['axial', 'shear', 'moment'] as const).map((quantity) => <span key={quantity}><b>{diagramSymbol[quantity]}</b>{item.diagrams[quantity] ? displayDiagram(quantity, item.diagrams[quantity]!.absolute.value) : '—'}</span>)}</article>; })}</div><div className="envelope-summary"><span><b>Envolvente de reacciones</b>{reactionEnvelope?.nodes.length ?? 0} nodos comparados</span>{classroom ? null : <span><b>Envolvente v · {selectedMemberId}</b>{deformationEnvelope ? `${toDisplay(deformationEnvelope.minimum.value, units, 'length').toExponential(2)} → ${toDisplay(deformationEnvelope.maximum.value, units, 'length').toExponential(2)} ${unitLabel(units, 'length')}` : 'No disponible'}</span>}</div></section> : null}
    {comparisonError ? <p className="scenario-error" role="alert">{comparisonError}</p> : null}
  </section>;
};
