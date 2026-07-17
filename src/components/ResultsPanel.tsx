import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { AlertCircle, Check, ChevronDown, ChevronUp, CircleDotDashed, GripHorizontal } from 'lucide-react';
import { useProject, type ResultTab } from '../store/ProjectContext';
import { evaluateDeformationAt, evaluateDiagramAt, segmentBezierControls } from '../engine/diagram';
import { evaluateEducationalAssertions, type EducationalAssertionEvaluation } from '../engine/educationalAssertions';
import { buildDiagramEnvelope, evaluateEnvelopeAt } from '../engine/envelope';
import { useScenarioAnalysis } from '../engine/useScenarioAnalysis';
import type { DiagramQuantity, DiagramSegment, EducationalAssertionTarget, MatrixTrace, MemberResult } from '../types';
import { toDisplay, unitLabel } from '../engine/units';
import { useI18n } from '../i18n/useI18n';
import type { TranslationKey } from '../i18n/catalogs';
import { ResultSummary } from './ResultSummary';
import { useClassroomSession } from '../store/ClassroomSessionContext';
import { deriveClassroomProgress } from '../education/classroomProgress';
import { InfluenceLineView } from './InfluenceLineView';

const tabs: Array<{ id: ResultTab; labelKey: TranslationKey; color?: string }> = [
  { id: 'summary', labelKey: 'results.summary' },
  { id: 'reactions', labelKey: 'results.reactions' },
  { id: 'axial', labelKey: 'results.axial', color: 'axial' },
  { id: 'shear', labelKey: 'results.shear', color: 'shear' },
  { id: 'moment', labelKey: 'results.moment', color: 'moment' },
  { id: 'influence', labelKey: 'results.influence', color: 'influence' },
  { id: 'deformed', labelKey: 'results.deformed' },
  { id: 'learn', labelKey: 'results.learn' },
  { id: 'issues', labelKey: 'results.issues' },
];

const MOBILE_RESULTS_QUERY = '(max-width: 1023px)';
const isMobileResultsViewport = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.(MOBILE_RESULTS_QUERY).matches);

export const ResultsPanel = () => {
  const { project, analysis, resultTab, setResultTab, analyze, selection, isAnalyzing, setInfluenceCanvasState } = useProject();
  const { t } = useI18n();
  const [height, setHeight] = useState(() => isMobileResultsViewport() ? Math.min(330, window.innerHeight * 0.4) : 285);
  const [drag, setDrag] = useState<{ y: number; height: number } | null>(null);
  const [isMobile, setIsMobile] = useState(isMobileResultsViewport);
  const [mobileExpanded, setMobileExpanded] = useState(() => !isMobileResultsViewport());
  const previousAnalysisRef = useRef(analysis);
  const resizeFrameRef = useRef<number | null>(null);
  const pendingHeightRef = useRef<number | null>(null);
  const selectedMemberId = selection?.kind === 'member' ? selection.id : selection?.kind === 'multi' ? selection.memberIds[0] : project.members.find((member) => member.type !== 'rigid')?.id;
  const memberResult = analysis?.memberResults.find((result) => result.memberId === selectedMemberId) ?? analysis?.memberResults[0];
  const classroomMode = project.settings.calculationMode === 'classroom';
  const { resultsVisible, hideResults } = useClassroomSession();
  const resultsAllowed = !classroomMode || resultsVisible;
  const availableTabs = classroomMode ? tabs.filter((tab) => tab.id !== 'deformed') : tabs;
  const activeTab = availableTabs.find((tab) => tab.id === resultTab) ?? availableTabs[0];
  const mobileResultLabel = analysis
    ? `${t(activeTab.labelKey)}${selectedMemberId ? ` · ${selectedMemberId}` : ''}`
    : 'Resultados';
  useEffect(() => {
    if (classroomMode && resultTab === 'deformed') setResultTab('moment');
  }, [classroomMode, resultTab, setResultTab]);
  useEffect(() => {
    const query = window.matchMedia?.(MOBILE_RESULTS_QUERY);
    if (!query) return undefined;
    const update = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
      if (event.matches) {
        setHeight(Math.min(330, window.innerHeight * 0.4));
        setMobileExpanded(false);
      } else setMobileExpanded(true);
    };
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (isMobile && analysis && analysis !== previousAnalysisRef.current) setMobileExpanded(true);
    previousAnalysisRef.current = analysis;
  }, [analysis, isMobile]);
  useEffect(() => {
    const collapse = () => setMobileExpanded(false);
    window.addEventListener('structureco:collapse-mobile-results', collapse);
    return () => window.removeEventListener('structureco:collapse-mobile-results', collapse);
  }, []);
  useEffect(() => () => {
    if (resizeFrameRef.current !== null) window.cancelAnimationFrame(resizeFrameRef.current);
  }, []);

  const scheduleHeight = (next: number) => {
    pendingHeightRef.current = next;
    if (resizeFrameRef.current !== null) return;
    resizeFrameRef.current = window.requestAnimationFrame(() => {
      resizeFrameRef.current = null;
      if (pendingHeightRef.current !== null) setHeight(pendingHeightRef.current);
    });
  };

  const onPointerMove = (event: ReactPointerEvent) => {
    if (!drag) return;
    scheduleHeight(Math.max(150, Math.min(window.innerHeight * 0.72, drag.height + drag.y - event.clientY)));
  };
  const resizeBy = (delta: number) => setHeight((current) => Math.max(150, Math.min(window.innerHeight * 0.72, current + delta)));

  return (
    <section className={`results-panel${isMobile && !mobileExpanded ? ' mobile-collapsed' : ''}`} aria-label={t('results.panel')} style={{ height: isMobile && !mobileExpanded ? 54 : height }} onPointerMove={onPointerMove} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)}>
      <button className="results-mobile-toggle" type="button" aria-expanded={mobileExpanded} aria-controls="results-content" onClick={() => setMobileExpanded((current) => !current)}>
        <i className={activeTab.color ?? ''} aria-hidden="true" />
        <strong>{mobileResultLabel}</strong>
        <ChevronUp className={`results-toggle-chevron${mobileExpanded ? ' expanded' : ''}`} size={19} />
      </button>
      <button
        className="resize-handle"
        role="separator"
        aria-label={t('results.resize')}
        aria-orientation="horizontal"
        aria-valuemin={150}
        aria-valuemax={Math.round(window.innerHeight * 0.72)}
        aria-valuenow={Math.round(height)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp') { event.preventDefault(); resizeBy(event.shiftKey ? 48 : 16); }
          if (event.key === 'ArrowDown') { event.preventDefault(); resizeBy(event.shiftKey ? -48 : -16); }
          if (event.key === 'Home') { event.preventDefault(); setHeight(150); }
          if (event.key === 'End') { event.preventDefault(); setHeight(window.innerHeight * 0.72); }
        }}
        onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDrag({ y: event.clientY, height }); }}
      ><GripHorizontal size={22} /></button>
      <nav className="result-tabs" role="tablist" aria-label={t('results.panel')}>
        {availableTabs.map((tab, index) => <button key={tab.id} data-result-tab={tab.id} role="tab" aria-selected={resultTab === tab.id} aria-controls="results-content" tabIndex={resultTab === tab.id ? 0 : -1} className={`${resultTab === tab.id ? 'active' : ''} ${tab.color ?? ''}`} onClick={() => setResultTab(tab.id)} onKeyDown={(event) => {
          let nextIndex = index;
          if (event.key === 'ArrowLeft') nextIndex = (index - 1 + availableTabs.length) % availableTabs.length;
          else if (event.key === 'ArrowRight') nextIndex = (index + 1) % availableTabs.length;
          else if (event.key === 'Home') nextIndex = 0;
          else if (event.key === 'End') nextIndex = availableTabs.length - 1;
          else return;
          event.preventDefault();
          const next = availableTabs[nextIndex];
          setResultTab(next.id);
          window.requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-result-tab="${next.id}"]`)?.focus());
        }}>{t(tab.labelKey)}{tab.id === 'issues' && analysis?.issues.length ? <span className="issue-count">{analysis.issues.length}</span> : null}</button>)}
      </nav>
      <div id="results-content" className="results-body" role="tabpanel" aria-live="polite" aria-busy={isAnalyzing}>
        {analysis?.success && classroomMode && resultsVisible ? <button className="hide-classroom-results" onClick={hideResults}>Ocultar resultados</button> : null}
        {!analysis ? <EmptyResults onAnalyze={analyze} /> : null}
        {analysis && !analysis.success && resultTab !== 'issues' ? <FailedResults onOpenIssues={() => setResultTab('issues')} /> : null}
        {analysis?.success && !resultsAllowed ? <ClassroomResultGate memberId={selectedMemberId ?? memberResult?.memberId ?? ''} /> : null}
        {analysis?.success && resultsAllowed && resultTab === 'reactions' ? <ReactionTable /> : null}
        {analysis?.success && resultsAllowed && resultTab === 'summary' ? <ResultSummary /> : null}
        {analysis?.success && resultsAllowed && ['axial', 'shear', 'moment'].includes(resultTab) ? <DiagramView type={resultTab as 'axial' | 'shear' | 'moment'} memberResult={memberResult} memberId={selectedMemberId ?? ''} /> : null}
        {analysis?.success && resultsAllowed && resultTab === 'influence' ? <InfluenceLineView project={project} selection={selection ?? undefined} onCanvasStateChange={setInfluenceCanvasState} /> : null}
        {analysis?.success && resultsAllowed && resultTab === 'deformed' ? <DeformationView memberResult={memberResult} memberId={selectedMemberId ?? ''} /> : null}
        {analysis?.success && resultsAllowed && resultTab === 'learn' ? <LearningSteps /> : null}
        {analysis && resultTab === 'issues' ? <IssuesView /> : null}
      </div>
    </section>
  );
};

const ClassroomResultGate = ({ memberId }: { memberId: string }) => {
  const { revealState, predictions, startPredicting, revealResults, setPrediction } = useClassroomSession();
  const { setResultTab } = useProject();
  const current = predictions[memberId] ?? {};
  return <section className="classroom-result-gate" aria-labelledby="classroom-result-gate-title">
    <div className="classroom-result-lock" aria-hidden="true">?</div>
    <div><span className="eyebrow">Práctica activa</span><h3 id="classroom-result-gate-title">El análisis terminó. Decide cuándo ver la solución.</h3><p>Primero puedes anticipar el signo y el máximo absoluto del miembro {memberId || 'seleccionado'}; después compara tu estimación con los diagramas exactos.</p></div>
    {revealState === 'predicting' ? <div className="prediction-inputs">{(['axial', 'shear', 'moment'] as const).map((quantity) => <label key={quantity}><span>{quantity === 'axial' ? 'N estimado' : quantity === 'shear' ? 'V estimado' : 'M estimado'}</span><input type="number" inputMode="decimal" value={current[quantity] ?? ''} placeholder="Incluye el signo" onChange={(event) => setPrediction(memberId, quantity, event.currentTarget.value === '' ? null : event.currentTarget.valueAsNumber)} /></label>)}</div> : null}
    <div className="classroom-result-gate-actions">{revealState !== 'predicting' ? <button className="secondary" onClick={startPredicting}>Hacer una predicción</button> : null}<button onClick={() => { revealResults(); setResultTab('summary'); }}>Revelar y comparar</button></div>
  </section>;
};

const EmptyResults = ({ onAnalyze }: { onAnalyze: () => void }) => {
  const { t } = useI18n();
  const { project, setActiveTool } = useProject();
  const classroom = project.settings.calculationMode === 'classroom';
  const current = classroom ? deriveClassroomProgress(project).currentStep : null;
  const run = () => {
    if (current?.action.kind === 'tool') setActiveTool(current.action.tool);
    else onAnalyze();
  };
  return <div className="empty-results"><CircleDotDashed size={28} /><div><strong>{current ? `Siguiente: ${current.title}` : t('results.readyTitle')}</strong><p>{current?.description ?? t('results.readyBody')}</p></div><button onClick={run}>{current?.action.label ?? t('results.analyzeStructure')}</button></div>;
};

const FailedResults = ({ onOpenIssues }: { onOpenIssues: () => void }) => { const { t } = useI18n(); return <div className="failed-results"><AlertCircle size={28} /><div><strong>{t('results.failedTitle')}</strong><p>{t('results.failedBody')}</p></div><button onClick={onOpenIssues}>{t('results.openIssues')}</button></div>; };

const ReactionTable = () => {
  const { analysis, project } = useProject();
  const { t } = useI18n();
  const units = project.settings.units;
  const lengthUnit = unitLabel(units, 'length');
  const forceUnit = unitLabel(units, 'force');
  const momentUnit = unitLabel(units, 'moment');
  const classroom = project.settings.calculationMode === 'classroom';
  return <div className="table-wrap">{classroom ? <div className="classroom-result-note"><strong>Modo Aula</strong><span>Se muestran reacciones y esfuerzos. Las propiedades automáticas solo afectan estructuras hiperestáticas.</span></div> : null}<table className="results-table"><thead><tr><th>{t('results.node')}</th>{classroom ? null : <><th>Ux ({lengthUnit})</th><th>Uy ({lengthUnit})</th><th>Rz (rad)</th></>}<th>Rx ({forceUnit})</th><th>Ry ({forceUnit})</th><th>Mz ({momentUnit})</th></tr></thead><tbody>{analysis?.nodeResults.map((result) => <tr key={result.nodeId}><td><strong>{result.nodeId}</strong></td>{classroom ? null : <><td>{toDisplay(result.ux, units, 'length').toExponential(3)}</td><td>{toDisplay(result.uy, units, 'length').toExponential(3)}</td><td>{result.rz.toExponential(3)}</td></>}<td>{toDisplay(result.rx, units, 'force').toFixed(3)}</td><td>{toDisplay(result.ry, units, 'force').toFixed(3)}</td><td>{toDisplay(result.rm, units, 'moment').toFixed(3)}</td></tr>)}</tbody></table></div>;
};

const DiagramView = ({ type, memberResult, memberId }: { type: DiagramQuantity; memberResult: MemberResult | undefined; memberId: string }) => {
  const { project, analysis, setSelection, resultCursor, setResultCursor } = useProject();
  const { t } = useI18n();
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [envelopeMode, setEnvelopeMode] = useState(false);
  const { scenarios: envelopeScenarios, busy: envelopeBusy, run: runEnvelopeAnalysis } = useScenarioAnalysis(project);
  useEffect(() => { setEnvelopeMode(false); }, [project]);
  const envelope = useMemo(() => envelopeScenarios ? buildDiagramEnvelope(envelopeScenarios, memberId, type) : null, [envelopeScenarios, memberId, type]);
  const units = project.settings.units;
  if (!memberResult?.diagramSegments.length) return <div className="empty-small">{t('results.selectMember')}</div>;
  const min = type === 'axial' ? memberResult.minAxial : type === 'shear' ? memberResult.minShear : memberResult.minMoment;
  const max = type === 'axial' ? memberResult.maxAxial : type === 'shear' ? memberResult.maxShear : memberResult.maxMoment;
  const maxAbs = Math.max(Math.abs(min), Math.abs(max), Math.abs(envelope?.minimum.value ?? 0), Math.abs(envelope?.maximum.value ?? 0), 1e-9);
  const L = memberResult.length;
  const pinnedX = resultCursor?.memberId === memberId && resultCursor.pinned ? Math.max(0, Math.min(L, resultCursor.x)) : null;
  const width = 820;
  const height = 190;
  const baseline = 98;
  const amplitude = 70;
  const sx = (x: number) => (x / L) * width;
  const sy = (value: number) => baseline - (value / maxAbs) * amplitude;
  const first = segmentBezierControls(memberResult.diagramSegments[0], type);
  const lineCommands = [`M ${sx(first.x0)} ${sy(first.y0)}`];
  const fillCommands = [`M 0 ${baseline}`, `L ${sx(first.x0)} ${sy(first.y0)}`];
  memberResult.diagramSegments.forEach((segment, index) => {
    const control = segmentBezierControls(segment, type);
    const command = `C ${sx(control.c1x)} ${sy(control.c1y)} ${sx(control.c2x)} ${sy(control.c2y)} ${sx(control.x1)} ${sy(control.y1)}`;
    lineCommands.push(command);
    fillCommands.push(command);
    const next = memberResult.diagramSegments[index + 1];
    if (next) {
      const nextControl = segmentBezierControls(next, type);
      if (Math.abs(nextControl.y0 - control.y1) > 1e-10) {
        const jumpCommand = `L ${sx(nextControl.x0)} ${sy(nextControl.y0)}`;
        lineCommands.push(jumpCommand);
        fillCommands.push(jumpCommand);
      }
    }
  });
  fillCommands.push(`L ${width} ${baseline}`, 'Z');
  const envelopePath = (branch: 'minimum' | 'maximum') => {
    if (!envelope) return '';
    const commands: string[] = [];
    envelope.segments.forEach((segment, index) => {
      const coefficients = segment[branch].coefficients;
      const synthetic: DiagramSegment = {
        x0: segment.x0,
        x1: segment.x1,
        axial: [coefficients[0], coefficients[1], coefficients[2]],
        shear: [coefficients[0], coefficients[1], coefficients[2]],
        moment: coefficients,
        distributedAxial: [0, 0],
        distributedTransverse: [0, 0],
      };
      const control = segmentBezierControls(synthetic, type);
      if (index === 0) commands.push(`M ${sx(control.x0)} ${sy(control.y0)}`);
      else commands.push(`L ${sx(control.x0)} ${sy(control.y0)}`);
      commands.push(`C ${sx(control.c1x)} ${sy(control.c1y)} ${sx(control.c2x)} ${sy(control.c2y)} ${sx(control.x1)} ${sy(control.y1)}`);
    });
    return commands.join(' ');
  };
  const label = type === 'axial' ? t('results.axialDiagram') : type === 'shear' ? t('results.shearDiagram') : t('results.momentDiagram');
  const unit = type === 'moment' ? unitLabel(units, 'moment') : unitLabel(units, 'force');
  const quantity = type === 'moment' ? 'moment' as const : 'force' as const;
  const displayValue = (value: number) => toDisplay(value, units, quantity);
  const colorClass = type;
  const displayCritical = memberResult.criticalPoints
    .filter((point) => point.quantity === type && ['maximum', 'minimum', 'jump', 'end', 'zero'].includes(point.kind))
    .filter((point, index, all) => all.findIndex((candidate) => Math.abs(candidate.x - point.x) < Math.max(L, 1) * 1e-7 && Math.abs(candidate.value - point.value) < Math.max(maxAbs, 1) * 1e-7 && candidate.side === point.side) === index)
    .slice(0, 14);
  const snapCandidates = Array.from(new Set([
    0,
    L,
    ...memberResult.diagramSegments.flatMap((segment) => [segment.x0, segment.x1]),
    ...memberResult.diagramJumps.map((jump) => jump.x),
    ...displayCritical.map((point) => point.x),
  ])).sort((a, b) => a - b);
  const snapCursor = (raw: number) => {
    const nearest = snapCandidates.reduce((best, candidate) => Math.abs(candidate - raw) < Math.abs(best - raw) ? candidate : best, snapCandidates[0] ?? raw);
    return Math.abs(nearest - raw) <= Math.max(L * 0.012, 1e-8) ? nearest : raw;
  };
  const cursorX = pinnedX ?? hoverX;
  const cursorLeft = cursorX === null ? null : evaluateDiagramAt(memberResult.diagramSegments, memberResult.diagramJumps, cursorX, 'left');
  const cursorRight = cursorX === null ? null : evaluateDiagramAt(memberResult.diagramSegments, memberResult.diagramJumps, cursorX, 'right');
  const cursorPoint = cursorRight ?? cursorLeft;
  const cursorJump = cursorX === null ? null : memberResult.diagramJumps.find((jump) => Math.abs(jump.x - cursorX) <= Math.max(L, 1) * 1e-8);
  const envelopeCursor = envelopeMode && envelope && cursorX !== null ? evaluateEnvelopeAt(envelope, cursorX) : null;
  const xTicks = [0, .25, .5, .75, 1].map((ratio) => ratio * L);
  const memberOptions = analysis?.memberResults ?? [];
  const pointerX = (event: ReactPointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return snapCursor(Math.max(0, Math.min(L, ((event.clientX - rect.left) / rect.width) * L)));
  };
  const pinAt = (x: number) => setResultCursor(pinnedX !== null && Math.abs(pinnedX - x) <= Math.max(L, 1) * 1e-8 ? null : { memberId, x, pinned: true });
  const movePinnedByKeyboard = (event: ReactKeyboardEvent<SVGSVGElement>) => {
    const current = pinnedX ?? 0;
    const step = event.shiftKey ? L / 20 : L / 100;
    let next: number | null = null;
    if (event.key === 'ArrowLeft') next = current - step;
    else if (event.key === 'ArrowRight') next = current + step;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = L;
    if (next === null) return;
    event.preventDefault();
    setResultCursor({ memberId, x: Math.max(0, Math.min(L, next)), pinned: true });
  };
  return <div className="diagram-result-layout">
    <div className="diagram-guidance"><div className={`step-badge ${colorClass}`}>1</div><div><strong>{label}</strong><p>{t('results.exactCurves')}</p></div><div className="step-badge muted">2</div><div><strong>{t('results.mainValues')}</strong><p>{t('results.maximum')} {displayValue(max).toFixed(3)} {unit}<br />{t('results.minimum')} {displayValue(min).toFixed(3)} {unit}</p></div><div className="step-badge muted">3</div><div><strong>{t('results.verification')}</strong><p>{t('results.derivativeCheck')}</p></div></div>
    <div className={`diagram-chart ${colorClass}`} data-testid="diagram-chart"><div className="diagram-chart-heading"><label><span>Miembro</span><select aria-label="Miembro para diagrama" value={memberId} onChange={(event) => { setSelection({ kind: 'member', id: event.target.value }); setResultCursor(null); }}>{memberOptions.map((member) => <option key={member.memberId} value={member.memberId}>{member.memberId}</option>)}</select></label><strong>{label}</strong><button className="envelope-toggle" aria-pressed={envelopeMode} disabled={envelopeBusy} title="Comparar todos los casos y combinaciones" onClick={() => { if (!envelopeScenarios) runEnvelopeAnalysis(); setEnvelopeMode((current) => !current); }}>{envelopeBusy ? '…' : 'Env.'}</button><small>{envelopeMode ? `${envelopeScenarios?.length ?? 0} escenarios` : pinnedX === null ? 'Mueve el cursor · toca para fijar' : 'Lectura fijada · toca para liberar'}</small></div><svg tabIndex={0} role="img" aria-label={`${label} del miembro ${memberId}`} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" onKeyDown={movePinnedByKeyboard} onPointerMove={(event) => setHoverX(pointerX(event))} onPointerDown={(event) => pinAt(pointerX(event))} onPointerLeave={() => setHoverX(null)}>
      <title>{label} del miembro {memberId}</title><desc>Usa las flechas para recorrer la estación; Inicio y Fin saltan a los extremos.</desc>
      <line className="chart-axis" x1="0" y1={baseline} x2={width} y2={baseline} />
      {xTicks.map((x) => <g className="chart-tick" key={`tick-${x}`}><line x1={sx(x)} y1={baseline - 4} x2={sx(x)} y2={baseline + 4} /><text x={sx(x)} y={height - 6} textAnchor={x === 0 ? 'start' : x === L ? 'end' : 'middle'}>{toDisplay(x, units, 'length').toFixed(2)}</text></g>)}
      {memberResult.diagramSegments.slice(1).map((segment) => <line key={segment.x0} className="chart-break" x1={sx(segment.x0)} y1="20" x2={sx(segment.x0)} y2={height - 20} />)}
      {memberResult.diagramJumps.map((jump) => {
        const left = evaluateDiagramAt(memberResult.diagramSegments, memberResult.diagramJumps, jump.x, 'left');
        const right = evaluateDiagramAt(memberResult.diagramSegments, memberResult.diagramJumps, jump.x, 'right');
        return left && right ? <line key={`jump-${jump.x}`} className="chart-jump" x1={sx(jump.x)} y1={sy(left[type])} x2={sx(jump.x)} y2={sy(right[type])} /> : null;
      })}
      <path className={`chart-fill ${envelopeMode ? 'muted' : ''}`} d={fillCommands.join(' ')} />
      <path className={`chart-line ${envelopeMode ? 'muted' : ''}`} d={lineCommands.join(' ')} fill="none" />
      {envelopeMode && envelope ? <><path className="envelope-line minimum" d={envelopePath('minimum')} fill="none" /><path className="envelope-line maximum" d={envelopePath('maximum')} fill="none" /></> : null}
      {displayCritical.map((point, index) => <g className={`chart-critical ${point.kind}`} key={`${point.kind}-${point.side}-${point.x}-${index}`}><circle cx={sx(point.x)} cy={sy(point.value)} r={point.kind === 'zero' ? 4 : 3.2} /><text x={sx(point.x)} y={sy(point.value) + (point.value >= 0 ? -8 : 14)} textAnchor={point.x < L * .08 ? 'start' : point.x > L * .92 ? 'end' : 'middle'}>{point.kind === 'zero' ? '0' : displayValue(point.value).toFixed(2)}</text></g>)}
      {cursorPoint ? <g className={`chart-hover ${pinnedX === null ? '' : 'pinned'}`}><line x1={sx(cursorPoint.x)} y1="16" x2={sx(cursorPoint.x)} y2={height - 18} /><circle cx={sx(cursorPoint.x)} cy={sy(cursorPoint[type])} r="4" /></g> : null}
    </svg>{cursorPoint ? <div className={`diagram-cursor-readout ${cursorJump ? 'at-jump' : ''}`}><span className="cursor-position"><b>x</b>{toDisplay(cursorPoint.x, units, 'length').toFixed(3)} {unitLabel(units, 'length')}</span>{envelopeCursor ? <><span className="envelope-min"><b>Mín.</b>{displayValue(envelopeCursor.minimum).toFixed(3)} {unit}</span><span className="envelope-max"><b>Máx.</b>{displayValue(envelopeCursor.maximum).toFixed(3)} {unit}</span><small>{envelopeCursor.minimumScenario} → {envelopeCursor.maximumScenario}</small></> : <><span className="axial-text"><b>N</b>{toDisplay(cursorPoint.axial, units, 'force').toFixed(3)} {unitLabel(units, 'force')}</span><span className="shear-text"><b>V</b>{toDisplay(cursorPoint.shear, units, 'force').toFixed(3)} {unitLabel(units, 'force')}</span><span className="moment-text"><b>M</b>{toDisplay(cursorPoint.moment, units, 'moment').toFixed(3)} {unitLabel(units, 'moment')}</span>{cursorJump && cursorLeft && cursorRight ? <small>Discontinuidad: izq. {displayValue(cursorLeft[type]).toFixed(3)} → der. {displayValue(cursorRight[type]).toFixed(3)} {unit}</small> : null}</>}</div> : <div className="diagram-cursor-placeholder">Cursor exacto N–V–M · activa Env. para comparar casos y combinaciones</div>}</div>
  </div>;
};

const DeformationView = ({ memberResult, memberId }: { memberResult: MemberResult | undefined; memberId: string }) => {
  const { project, analysis, setSelection, resultCursor, setResultCursor } = useProject();
  const [quantity, setQuantity] = useState<'u' | 'v' | 'theta'>('v');
  const [hoverX, setHoverX] = useState<number | null>(null);
  if (!memberResult?.deformationSegments.length) return <div className="empty-small">Selecciona un miembro de pórtico.</div>;
  const L = memberResult.length;
  const pinnedX = resultCursor?.memberId === memberId && resultCursor.pinned ? Math.max(0, Math.min(L, resultCursor.x)) : null;
  const units = project.settings.units;
  const unit = quantity === 'theta' ? 'rad' : unitLabel(units, 'length');
  const displayValue = (value: number) => quantity === 'theta' ? value : toDisplay(value, units, 'length');
  const critical = memberResult.deformationCriticalPoints.filter((point) => point.quantity === quantity);
  const candidates = critical.filter((point) => point.kind === 'maximum' || point.kind === 'minimum' || point.kind === 'end');
  const maximum = candidates.reduce((best, point) => point.value > best.value ? point : best, candidates[0]);
  const minimum = candidates.reduce((best, point) => point.value < best.value ? point : best, candidates[0]);
  const absolute = [maximum, minimum].filter(Boolean).reduce((best, point) => Math.abs(point.value) > Math.abs(best.value) ? point : best);
  const maxAbsValue = Math.max(1e-15, ...candidates.map((point) => Math.abs(point.value)), ...memberResult.deformation.map((point) => Math.abs(point[quantity])));
  const width = 820;
  const height = 190;
  const baseline = 98;
  const amplitude = 66;
  const sx = (x: number) => x / L * width;
  const sy = (value: number) => baseline - value / maxAbsValue * amplitude;
  const line = memberResult.deformation.map((point, index) => `${index ? 'L' : 'M'} ${sx(point.x)} ${sy(point[quantity])}`).join(' ');
  const cursorX = pinnedX ?? hoverX;
  const cursor = cursorX === null ? null : evaluateDeformationAt(memberResult.deformationSegments, cursorX);
  const memberOptions = analysis?.memberResults ?? [];
  const pointerX = (event: ReactPointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return Math.max(0, Math.min(L, (event.clientX - rect.left) / rect.width * L));
  };
  const pinAt = (x: number) => setResultCursor(pinnedX === null ? { memberId, x, pinned: true } : null);
  const movePinnedByKeyboard = (event: ReactKeyboardEvent<SVGSVGElement>) => {
    const current = pinnedX ?? 0;
    const step = event.shiftKey ? L / 20 : L / 100;
    const next = event.key === 'ArrowLeft' ? current - step : event.key === 'ArrowRight' ? current + step : event.key === 'Home' ? 0 : event.key === 'End' ? L : null;
    if (next === null) return;
    event.preventDefault();
    setResultCursor({ memberId, x: Math.max(0, Math.min(L, next)), pinned: true });
  };
  return <div className="deformation-result-layout">
    <div className="diagram-guidance deformation-guidance"><div className="step-badge deformed">1</div><div><strong>Respuesta exacta del miembro</strong><p>u(x), v(x) y θ(x) se integran por tramos desde N/EA y M/EI; Timoshenko agrega V/GAs.</p></div><div className="step-badge muted">2</div><div><strong>Máximo interior</strong><p>{absolute ? `${quantity} = ${displayValue(absolute.value).toExponential(4)} ${unit} en x = ${toDisplay(absolute.x, units, 'length').toFixed(3)} ${unitLabel(units, 'length')}` : '—'}</p></div></div>
    <div className="diagram-chart deformation" data-testid="deformation-chart"><div className="diagram-chart-heading"><label><span>Miembro</span><select aria-label="Miembro para deformación" value={memberId} onChange={(event) => { setSelection({ kind: 'member', id: event.target.value }); setResultCursor(null); }}>{memberOptions.map((member) => <option key={member.memberId} value={member.memberId}>{member.memberId}</option>)}</select></label><div className="response-selector" role="group" aria-label="Respuesta del miembro">{(['u', 'v', 'theta'] as const).map((item) => <button key={item} aria-pressed={quantity === item} className={quantity === item ? 'active' : ''} onClick={() => setQuantity(item)}>{item === 'theta' ? 'θ' : item}</button>)}</div><small>{pinnedX === null ? 'Mueve el cursor · toca para fijar' : 'Lectura fijada · toca para liberar'}</small></div>
      <svg tabIndex={0} role="img" aria-label={`Diagrama ${quantity} del miembro ${memberId}`} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" onKeyDown={movePinnedByKeyboard} onPointerMove={(event) => setHoverX(pointerX(event))} onPointerDown={(event) => pinAt(pointerX(event))} onPointerLeave={() => setHoverX(null)}>
        <title>Respuesta {quantity} del miembro {memberId}</title><desc>Usa las flechas para recorrer la estación; Inicio y Fin saltan a los extremos.</desc>
        <line className="chart-axis" x1="0" y1={baseline} x2={width} y2={baseline} />
        <path className="chart-line" d={line} fill="none" />
        {critical.filter((point) => point.kind === 'maximum' || point.kind === 'minimum' || point.kind === 'zero').slice(0, 16).map((point, index) => <g className={`chart-critical ${point.kind}`} key={`${point.kind}-${point.x}-${index}`}><circle cx={sx(point.x)} cy={sy(point.value)} r="3.2" /><text x={sx(point.x)} y={sy(point.value) + (point.value >= 0 ? -8 : 14)} textAnchor={point.x < L * .08 ? 'start' : point.x > L * .92 ? 'end' : 'middle'}>{point.kind === 'zero' ? '0' : displayValue(point.value).toExponential(2)}</text></g>)}
        {cursor ? <g className={`chart-hover ${pinnedX === null ? '' : 'pinned'}`}><line x1={sx(cursor.x)} y1="16" x2={sx(cursor.x)} y2={height - 18} /><circle cx={sx(cursor.x)} cy={sy(cursor[quantity])} r="4" /></g> : null}
      </svg>
      {cursor ? <div className="diagram-cursor-readout"><span className="cursor-position"><b>x</b>{toDisplay(cursor.x, units, 'length').toFixed(3)} {unitLabel(units, 'length')}</span><span><b>u</b>{toDisplay(cursor.u, units, 'length').toExponential(4)} {unitLabel(units, 'length')}</span><span><b>v</b>{toDisplay(cursor.v, units, 'length').toExponential(4)} {unitLabel(units, 'length')}</span><span><b>θ</b>{cursor.theta.toExponential(4)} rad</span></div> : <div className="diagram-cursor-placeholder">Cursor exacto u–v–θ · los máximos interiores se calculan con las raíces del polinomio</div>}
    </div>
  </div>;
};

const MatrixView = ({ title, trace }: { title: string; trace: MatrixTrace }) => {
  const rowLimit = Math.min(trace.rows, 12);
  const columnLimit = Math.min(trace.columns, 12);
  const values = new Map(trace.entries.map((entry) => [`${entry.row}:${entry.column}`, entry.value]));
  return <div className="matrix-view"><div className="matrix-view-heading"><strong>{title}</strong><span>{trace.rows} × {trace.columns}</span></div>{trace.rows > rowLimit || trace.columns > columnLimit ? <small>Vista parcial legible; el cálculo conserva la matriz completa.</small> : null}<div className="matrix-scroll"><table aria-label={title}><thead><tr><th>GDL</th>{trace.columnLabels.slice(0, columnLimit).map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{trace.rowLabels.slice(0, rowLimit).map((label, row) => <tr key={label}><th scope="row">{label}</th>{Array.from({ length: columnLimit }, (_, column) => { const value = values.get(`${row}:${column}`) ?? 0; return <td className={value === 0 ? 'zero' : ''} key={`${row}-${column}`}>{value === 0 ? '·' : value.toExponential(2)}</td>; })}</tr>)}</tbody></table></div></div>;
};

const EducationExplorer = () => {
  const { analysis, project, selection, setSelection, setLearningFocus } = useProject();
  const trace = analysis?.educationTrace;
  const [stage, setStage] = useState<'model' | 'dofs' | 'element' | 'assembly' | 'verify'>('model');
  const [elementId, setElementId] = useState(() => selection?.kind === 'member' ? selection.id : trace?.elements[0]?.memberId ?? '');
  const [elementMatrix, setElementMatrix] = useState<'local' | 'condensed' | 'transform' | 'global'>('local');
  useEffect(() => {
    if (stage === 'element' && elementId) setLearningFocus({ nodeIds: [], memberIds: [elementId] });
    else setLearningFocus(null);
    return () => setLearningFocus(null);
  }, [elementId, setLearningFocus, stage]);
  if (!trace) return null;
  const element = trace.elements.find((item) => item.memberId === elementId) ?? trace.elements[0];
  const stages = [
    { id: 'model' as const, label: 'Modelo' },
    { id: 'dofs' as const, label: 'GDL' },
    { id: 'element' as const, label: 'Elemento' },
    { id: 'assembly' as const, label: 'Ensamblaje' },
    { id: 'verify' as const, label: 'Verificación' },
  ];
  return <section className="education-explorer" aria-label="Explorador del método de rigidez"><div className="education-explorer-heading"><div><strong>Explorador del método de rigidez</strong><small>Datos reales del análisis actual · no es un cálculo paralelo</small></div><span>{trace.formulation === 'linear-static-mixed-beam' ? 'Euler–Bernoulli + Timoshenko' : 'Euler–Bernoulli'}</span></div><div className="education-stage-tabs" role="tablist" aria-label="Etapas del método">{stages.map((item) => <button role="tab" aria-selected={stage === item.id} className={stage === item.id ? 'active' : ''} key={item.id} onClick={() => setStage(item.id)}>{item.label}</button>)}</div>
    {stage === 'model' ? <div className="education-stage"><div className="education-kpis"><div><span>Nodos</span><strong>{project.nodes.length}</strong></div><div><span>Miembros</span><strong>{project.members.length}</strong></div><div><span>GDL</span><strong>{trace.dofs.length}</strong></div><div><span>Restricciones</span><strong>{trace.assembly.constraintMatrix.rows}</strong></div></div><div className="equation-block">[ K  Cᵀ ; C  0 ] [ U ; λ ] = [ F ; g ]</div><p>El método ensambla cada matriz local en K, impone apoyos y vínculos con C y resuelve desplazamientos U y multiplicadores λ. Los asentamientos aparecen en g.</p></div> : null}
    {stage === 'dofs' ? <div className="education-stage table-wrap"><table className="results-table dof-table"><thead><tr><th>GDL</th><th>Estado</th><th>U</th><th>F</th><th>R</th><th>Residuo</th></tr></thead><tbody>{trace.dofs.map((dof) => <tr key={dof.index} onClick={() => { setSelection({ kind: 'node', id: dof.nodeId }); setLearningFocus({ nodeIds: [dof.nodeId], memberIds: [] }); }}><td><strong>{dof.label}</strong></td><td>{dof.constrained ? dof.prescribedValue ? 'Prescrito' : 'Restringido' : 'Libre'}</td><td>{dof.displacement.toExponential(3)}</td><td>{dof.appliedLoad.toExponential(3)}</td><td>{dof.reaction.toExponential(3)}</td><td>{dof.residual.toExponential(2)}</td></tr>)}</tbody></table></div> : null}
    {stage === 'element' && element ? <div className="education-stage"><div className="education-element-controls"><label><span>Miembro</span><select value={element.memberId} onChange={(event) => { setElementId(event.target.value); setSelection({ kind: 'member', id: event.target.value }); }}>{trace.elements.map((item) => <option key={item.memberId} value={item.memberId}>{item.memberId}</option>)}</select></label><label><span>Matriz</span><select value={elementMatrix} onChange={(event) => setElementMatrix(event.target.value as typeof elementMatrix)}><option value="local">k local</option><option value="condensed">k con liberaciones</option><option value="transform">Transformación T</option><option value="global">Aporte global</option></select></label></div><div className="education-kpis"><div><span>L flexible</span><strong>{element.length.toPrecision(5)} m</strong></div><div><span>cos θ</span><strong>{element.c.toPrecision(4)}</strong></div><div><span>sen θ</span><strong>{element.s.toPrecision(4)}</strong></div><div><span>GDL liberados</span><strong>{element.releasedLocalDofs.length ? element.releasedLocalDofs.join(', ') : '—'}</strong></div></div><MatrixView title={elementMatrix === 'local' ? 'Rigidez local kˡ' : elementMatrix === 'condensed' ? 'Rigidez efectiva después de liberaciones' : elementMatrix === 'transform' ? 'Transformación local-global T' : 'Contribución global TᵀkT'} trace={elementMatrix === 'local' ? element.localStiffnessOriginal : elementMatrix === 'condensed' ? element.localStiffnessEffective : elementMatrix === 'transform' ? element.transformation : element.globalStiffnessContribution} /><div className="equation-block">qˡ = kˡ dˡ − fˡ₀</div></div> : null}
    {stage === 'assembly' ? <div className="education-stage"><div className="education-kpis"><div><span>Detalle</span><strong>{trace.assembly.matrixDetail === 'full' ? 'Completo' : 'Resumen'}</strong></div><div><span>Energía</span><strong>{trace.assembly.strainEnergy.toExponential(3)}</strong></div><div><span>‖F‖∞</span><strong>{Math.max(0, ...trace.assembly.load.map(Math.abs)).toExponential(3)}</strong></div></div><MatrixView title="Matriz global K" trace={trace.assembly.stiffness} /><MatrixView title="Restricciones C" trace={trace.assembly.constraintMatrix} /></div> : null}
    {stage === 'verify' ? <div className="education-stage verification-grid"><div className={(analysis?.residualNorm ?? 1) < 1e-8 ? 'passed' : 'warning'}><span>Equilibrio algebraico</span><strong>{analysis?.residualNorm.toExponential(3)}</strong><small>‖KU+Cᵀλ−F‖ normalizado</small></div><div className={(analysis?.constraintResidual ?? 1) < 1e-9 ? 'passed' : 'warning'}><span>Compatibilidad</span><strong>{analysis?.constraintResidual?.toExponential(3) ?? '—'}</strong><small>‖CU−g‖ normalizado</small></div><div className={(analysis?.linearResidual ?? 1) < 1e-12 ? 'passed' : 'warning'}><span>Solver lineal</span><strong>{analysis?.linearResidual?.toExponential(3) ?? '—'}</strong><small>{analysis?.refinementIterations ?? 0} refinamientos</small></div><div className={(analysis?.forwardErrorBound ?? 1) < 1e-6 ? 'passed' : 'warning'}><span>Cota de error</span><strong>{analysis?.forwardErrorBound?.toExponential(3) ?? '—'}</strong><small>≈ {analysis?.reliableDigits?.toFixed(1) ?? '0'} dígitos confiables</small></div></div> : null}
  </section>;
};

const LearningSteps = () => {
  const { analysis, project, setLearningFocus } = useProject();
  const { t } = useI18n();
  const educationalCase = project.educationalCase;
  const [focusedStepId, setFocusedStepId] = useState<string | null>(null);
  const [detailLevel, setDetailLevel] = useState<'summary' | 'steps' | 'full'>('steps');
  useEffect(() => () => setLearningFocus(null), [setLearningFocus]);
  return <div className="learning-steps">
    <EducationExplorer />
    <div className="learning-toolbar"><div><strong>Procedimiento vinculado al cálculo</strong><small>{analysis?.explanation.length ?? 0} pasos · abre uno para resaltarlo en el modelo</small></div><div className="learning-level" role="group" aria-label="Nivel de detalle"><button className={detailLevel === 'summary' ? 'active' : ''} onClick={() => setDetailLevel('summary')}>Resumen</button><button className={detailLevel === 'steps' ? 'active' : ''} onClick={() => setDetailLevel('steps')}>Paso a paso</button><button className={detailLevel === 'full' ? 'active' : ''} onClick={() => setDetailLevel('full')}>Completo</button></div></div>
    {educationalCase ? <section className="educational-source">
      <div><strong>{educationalCase.chapter}</strong><span>{educationalCase.kind === 'attributed-example' ? t('results.attributedExample') : t('results.originalPractice')}</span></div>
      <p>{educationalCase.note}</p>
      <ul>{educationalCase.expectedResults.map((result) => <li key={result}>{result}</li>)}</ul>
      {analysis && educationalCase.expectedAssertions?.length ? <AssertionResults evaluations={evaluateEducationalAssertions(educationalCase.expectedAssertions, analysis)} /> : null}
      {educationalCase.sourceUrl ? <a href={educationalCase.sourceUrl} target="_blank" rel="noreferrer">{t('results.source', { title: educationalCase.sourceTitle })}</a> : <small>{educationalCase.sourceTitle}</small>}
    </section> : null}
    {analysis?.explanation.map((step, index) => <details key={step.id} className={`learning-step detail-${detailLevel}`} onToggle={(event) => {
      if (event.currentTarget.open) {
        setFocusedStepId(step.id);
        setLearningFocus({ nodeIds: step.relatedNodeIds ?? [], memberIds: step.relatedMemberIds ?? [] });
      } else if (focusedStepId === step.id) {
        setFocusedStepId(null);
        setLearningFocus(null);
      }
    }}><summary><span className="learn-check">{index + 1}</span><div><strong>{step.title}</strong><small>{step.category} · {step.equations.length} ecuaciones</small></div><ChevronDown size={17} /></summary><div className="learning-content"><p>{step.summary}</p>{detailLevel === 'full' && step.inputs?.length ? <><small className="learning-value-heading">Datos de entrada</small><dl className="learning-values inputs">{step.inputs.map((input) => <div key={`${step.id}-input-${input.label}`}><dt>{input.label}</dt><dd>{Number.isFinite(input.value) ? input.value.toPrecision(6) : '—'} {input.unit}</dd></div>)}</dl></> : null}{detailLevel !== 'summary' ? step.equations.map((equation) => <div className="equation-block" key={equation}>{equation}</div>) : null}{detailLevel !== 'summary' && step.outputs?.length ? <><small className="learning-value-heading">Resultados</small><dl className="learning-values">{step.outputs.map((output) => <div key={`${step.id}-${output.label}`}><dt>{output.label}</dt><dd>{Number.isFinite(output.value) ? output.value.toPrecision(6) : '—'} {output.unit}</dd></div>)}</dl></> : null}{detailLevel === 'full' && (step.relatedMemberIds?.length || step.relatedNodeIds?.length) ? <small className="learning-related">Relacionado con {step.relatedMemberIds?.length ? `miembros ${step.relatedMemberIds.join(', ')}` : ''}{step.relatedMemberIds?.length && step.relatedNodeIds?.length ? ' y ' : ''}{step.relatedNodeIds?.length ? `nodos ${step.relatedNodeIds.join(', ')}` : ''}.</small> : null}</div></details>)}
  </div>;
};

const assertionQuantity = (target: EducationalAssertionTarget): 'length' | 'force' | 'moment' | 'rotation' => {
  if (target.kind === 'node-result') {
    if (target.component === 'ux' || target.component === 'uy') return 'length';
    if (target.component === 'rz') return 'rotation';
    if (target.component === 'rm') return 'moment';
    return 'force';
  }
  return target.quantity === 'moment' ? 'moment' : 'force';
};

const AssertionResults = ({ evaluations }: { evaluations: EducationalAssertionEvaluation[] }) => {
  const { project } = useProject();
  const { t } = useI18n();
  const units = project.settings.units;
  const passed = evaluations.filter((evaluation) => evaluation.passed).length;
  return <div className="assertion-results">
    <div className="assertion-summary"><strong>{t('results.autoCheck')}</strong><span>{t('results.passed', { passed, total: evaluations.length })}</span></div>
    {evaluations.map((evaluation) => {
      const quantity = assertionQuantity(evaluation.assertion.target);
      const convert = (value: number) => quantity === 'rotation' ? value : toDisplay(value, units, quantity);
      const unit = quantity === 'rotation' ? 'rad' : unitLabel(units, quantity);
      return <div className={`assertion-row ${evaluation.passed ? 'passed' : 'failed'}`} key={evaluation.assertion.id}>
        <span className="assertion-status">{evaluation.passed ? <Check size={13} /> : <AlertCircle size={13} />}</span>
        <div><strong>{evaluation.assertion.label}</strong>{evaluation.unavailableReason ? <small>{evaluation.unavailableReason}</small> : <small>{t('results.calculatedExpected', { actual: convert(evaluation.actual).toPrecision(6), expected: convert(evaluation.expected).toPrecision(6), unit })}</small>}</div>
        <div className="assertion-errors"><span>{t('results.absoluteError')} {Number.isFinite(evaluation.absoluteError) ? convert(evaluation.absoluteError).toExponential(2) : '—'} {unit}</span><span>{t('results.relativeError')} {Number.isFinite(evaluation.relativeError) ? `${(evaluation.relativeError * 100).toExponential(2)} %` : '—'}</span></div>
      </div>;
    })}
  </div>;
};

const IssuesView = () => {
  const { analysis, project, setSelection, setActiveTool } = useProject();
  const { t } = useI18n();
  if (!analysis?.issues.length) return <div className="all-clear"><Check size={26} /><strong>{t('results.clearTitle')}</strong><p>{t('results.clearBody')}</p></div>;
  const act = (issue: typeof analysis.issues[number]) => {
    if (issue.objectId) {
      const target = issue.objectKind
        ? { kind: issue.objectKind, id: issue.objectId }
        : project.nodes.some((node) => node.id === issue.objectId)
          ? { kind: 'node' as const, id: issue.objectId }
          : project.members.some((member) => member.id === issue.objectId)
            ? { kind: 'member' as const, id: issue.objectId }
            : project.nodalLoads.some((load) => load.id === issue.objectId)
              ? { kind: 'nodalLoad' as const, id: issue.objectId }
              : project.memberLoads.some((load) => load.id === issue.objectId)
                ? { kind: 'memberLoad' as const, id: issue.objectId }
                : null;
      if (target) {
        setSelection(target);
        window.dispatchEvent(new CustomEvent('structureco:focus-object', { detail: target }));
      }
      return;
    }
    if (issue.suggestedTool) { setActiveTool(issue.suggestedTool); return; }
    const text = `${issue.id} ${issue.title} ${issue.message}`.toLowerCase();
    if (text.includes('nodo') || text.includes('geometr')) setActiveTool('node');
    else if (text.includes('miembro') || text.includes('barra')) setActiveTool('member');
    else if (text.includes('apoyo') || text.includes('mecanismo') || text.includes('restric')) setActiveTool('support');
    else if (text.includes('carga')) setActiveTool('pointLoad');
    else setActiveTool('select');
  };
  return <div className="issues-list">{analysis.issues.map((issue) => <div className={`issue-card ${issue.severity}`} key={issue.id}><span className="issue-icon">{issue.severity === 'error' ? '!' : issue.severity === 'warning' ? '△' : 'i'}</span><div><strong>{issue.title}</strong><p>{issue.message}</p>{issue.objectId ? <small>{t('results.object', { id: issue.objectId })}</small> : null}{issue.suggestedFix ? <p className="issue-fix"><b>{t('results.fix')}</b> {issue.suggestedFix}</p> : null}<button className="issue-action" onClick={() => act(issue)}>{issue.objectId ? 'Mostrar en el lienzo' : 'Corregir en el modelo'}</button></div></div>)}</div>;
};
