import { memo, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { ChevronRight, CircleHelp, GripHorizontal, MoveDown, Pencil, Plus, RotateCcw, Sigma, X } from 'lucide-react';
import { fromDisplay, toDisplay, unitLabel, type UnitQuantity } from '../../engine/units';
import { useI18n } from '../../i18n/useI18n';
import type { TranslationKey } from '../../i18n/catalogs';
import { useProjectAnalysis } from '../../store/ProjectAnalysisContext';
import { useProjectModel } from '../../store/ProjectModelContext';
import { useWorkspaceUI } from '../../store/WorkspaceUIContext';
import type { GeneratedLoadSource, LoadCase, MovingLoadCase, Selection, Tool } from '../../types';
import { NTC_CDMX_2023_GROUP_B, createProjectCombinationFromNormativeDraft, generateNormativeCombinationDrafts } from '../../data/loadCombinationStandards';
import { InspectorNumericField } from './InspectorNumericField';
import { InspectorProperties } from './InspectorProperties';
import { readCanvasViewSettings, withCanvasViewSettings } from '../view/canvasViewSettings';
import { MAX_INSPECTOR_WIDTH, MIN_INSPECTOR_WIDTH, clampInspectorWidth, type InspectorDetent } from '../workspace/useWorkspaceLayoutPreferences';
import type { SurfacePresentation, SurfaceStatus } from '../workspace/surfacePresentation';
import { ViewFavoritesPanel } from '../library/ViewFavoritesPanel';
import './inspector.css';

const NumberField = ({
  label,
  value,
  unit,
  step = 'any',
  resetKey = label,
  hint,
  onChange,
}: {
  label: string;
  value: number;
  unit?: string;
  step?: string;
  resetKey?: string;
  hint?: string;
  onChange: (value: number) => void;
}) => {
  const { language } = useI18n();
  return (
    <InspectorNumericField
      label={label}
      value={value}
      unit={unit}
      step={step}
      resetKey={resetKey}
      hint={hint}
      language={language}
      onCommit={onChange}
    />
  );
};

const Segmented = ({ value, options, onChange }: { value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) => (
  <div className="segmented-control" role="group">
    {options.map((option) => <button type="button" key={option.value} aria-pressed={value === option.value} className={value === option.value ? 'active' : ''} onClick={() => onChange(option.value)}>{option.label}</button>)}
  </div>
);

const loadCaseCategoryKey: Record<LoadCase['category'], TranslationKey> = {
  permanent: 'inspector.loadCaseCategoryPermanent',
  variable: 'inspector.loadCaseCategoryVariable',
  accidental: 'inspector.loadCaseCategoryAccidental',
  other: 'inspector.loadCaseCategoryOther',
};

type InspectorProps = {
  className?: string;
  desktopWidth?: number;
  presentation?: Extract<SurfacePresentation, 'dock' | 'inset' | 'sheet'>;
  status?: SurfaceStatus;
  onClose?: () => void;
  /** Renders selection context without the dense editor, preserving the same selection authority. */
  compact?: boolean;
  onExpand?: () => void;
  onDesktopWidthChange?: (width: number) => void;
  mobileDetent?: InspectorDetent;
  onMobileDetentChange?: (detent: InspectorDetent) => void;
  /** Lets the workspace skip a detent unavailable in the current viewport. */
  onMobileDetentCycle?: (direction: 1 | -1) => void;
  /** In Workspace this makes the panel one independently brokered owner. */
  surface?: 'detail' | 'analysisSetup' | 'view';
  /** Injected by Workspace for a selection-independent analysis surface. */
  activeTool?: Tool;
  onActiveToolChange?: (tool: Tool) => void;
};

type InspectorContentProps = InspectorProps & {
  selection: Selection;
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
};

const InspectorContent = ({
  className = '',
  desktopWidth = 320,
  presentation = 'dock',
  status = 'active',
  onClose,
  compact = false,
  onExpand,
  onDesktopWidthChange,
  mobileDetent = 'medium',
  onMobileDetentChange,
  onMobileDetentCycle,
  surface,
  selection,
  activeTool,
  setActiveTool,
}: InspectorContentProps) => {
  const { selectedCombinationId, setSelectedCombinationId } = useProjectAnalysis();
  const { t } = useI18n();
  const [tab, setTab] = useState<'inspector' | 'loads' | 'display'>('inspector');
  const panelRef = useRef<HTMLElement>(null);
  const sheet = presentation === 'sheet';
  const [resizeOrigin, setResizeOrigin] = useState<{ clientX: number; width: number } | null>(null);

  const forcedTab = surface === 'detail' ? 'inspector' : surface === 'analysisSetup' ? 'loads' : surface === 'view' ? 'display' : undefined;
  const activeTab = forcedTab ?? tab;
  useEffect(() => {
    if (!forcedTab && selection) setTab('inspector');
  }, [forcedTab, selection]);

  useEffect(() => {
    if (!sheet || status !== 'active') return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.key !== 'Escape') return;
      event.preventDefault();
      onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, sheet, status]);

  const chooseLoadTool = (tool: Extract<Tool, 'pointLoad' | 'distributedLoad' | 'moment'>) => {
    setActiveTool(tool);
    onClose?.();
  };

  const resizeFromPointer = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!resizeOrigin || !onDesktopWidthChange) return;
    onDesktopWidthChange(clampInspectorWidth(resizeOrigin.width + resizeOrigin.clientX - event.clientX));
  };

  const resizeFromKeyboard = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!onDesktopWidthChange) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      onDesktopWidthChange(clampInspectorWidth(desktopWidth + (event.shiftKey ? 48 : 16)));
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      onDesktopWidthChange(clampInspectorWidth(desktopWidth - (event.shiftKey ? 48 : 16)));
    } else if (event.key === 'Home') {
      event.preventDefault();
      onDesktopWidthChange(MIN_INSPECTOR_WIDTH);
    } else if (event.key === 'End') {
      event.preventDefault();
      onDesktopWidthChange(MAX_INSPECTOR_WIDTH);
    }
  };

  const inspectorTabs = ['inspector', 'loads', 'display'] as const;
  const inspectorDetents: readonly InspectorDetent[] = ['compact', 'medium', 'large'];
  const detentLabel = (detent: InspectorDetent) => detent === 'compact'
    ? t('inspector.detentCompact')
    : detent === 'medium'
      ? t('inspector.detentMedium')
      : t('inspector.detentLarge');
  const moveDetent = (direction: 1 | -1) => {
    if (onMobileDetentCycle) {
      onMobileDetentCycle(direction);
      return;
    }
    if (!onMobileDetentChange) return;
    const currentIndex = inspectorDetents.indexOf(mobileDetent);
    const nextIndex = (currentIndex + direction + inspectorDetents.length) % inspectorDetents.length;
    onMobileDetentChange(inspectorDetents[nextIndex]);
  };
  const onDetentHandleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'PageUp') {
      event.preventDefault();
      moveDetent(1);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown' || event.key === 'PageDown') {
      event.preventDefault();
      moveDetent(-1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      onMobileDetentChange?.('compact');
    } else if (event.key === 'End') {
      event.preventDefault();
      onMobileDetentChange?.('large');
    }
  };
  const onTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + inspectorTabs.length) % inspectorTabs.length;
    else if (event.key === 'ArrowRight') nextIndex = (index + 1) % inspectorTabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = inspectorTabs.length - 1;
    else return;
    event.preventDefault();
    const next = inspectorTabs[nextIndex];
    setTab(next);
    panelRef.current?.querySelector<HTMLButtonElement>(`#inspector-tab-${next}`)?.focus();
  };

  return (
    <aside
      ref={panelRef}
      id={surface ? `workspace-${surface}` : 'workspace-inspector'}
      className={`inspector-panel ${className}`.trim()}
      role={sheet ? 'dialog' : 'complementary'}
      aria-label={surface === 'analysisSetup' ? t('inspector.loadsTab') : surface === 'view' ? t('inspector.viewTab') : t('inspector.tab')}
      tabIndex={sheet ? -1 : undefined}
      data-workspace-surface={surface ?? 'detail'}
      data-surface-presentation={presentation}
      data-surface-status={status}
      data-inspector-compact={compact || undefined}
      hidden={status !== 'active'}
      data-mobile-detent={sheet ? mobileDetent : undefined}
    >
      {presentation === 'dock' && onDesktopWidthChange ? <button
        type="button"
        className="inspector-resize-handle"
        role="separator"
        aria-label={t('inspector.resize')}
        aria-orientation="vertical"
        aria-valuemin={MIN_INSPECTOR_WIDTH}
        aria-valuemax={MAX_INSPECTOR_WIDTH}
        aria-valuenow={desktopWidth}
        onKeyDown={resizeFromKeyboard}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          setResizeOrigin({ clientX: event.clientX, width: desktopWidth });
        }}
        onPointerMove={resizeFromPointer}
        onPointerUp={() => setResizeOrigin(null)}
        onPointerCancel={() => setResizeOrigin(null)}
      /> : null}
      {sheet && (onMobileDetentChange || onMobileDetentCycle || onClose) ? <div className="inspector-sheet-controls">
        {onMobileDetentChange || onMobileDetentCycle ? <button
            type="button"
            className="inspector-sheet-handle"
            aria-label={`${t('inspector.detentGroup')}: ${detentLabel(mobileDetent)}`}
            onClick={() => moveDetent(1)}
            onKeyDown={onDetentHandleKeyDown}
          >
            <GripHorizontal size={22} aria-hidden="true" />
            <span className="sr-only">{detentLabel(mobileDetent)}</span>
          </button> : <span aria-hidden="true" />}
        {onClose ? <button type="button" className="mobile-inspector-close" aria-label={t('inspector.close')} onClick={onClose}><X size={18} /></button> : null}
      </div> : null}
      {surface === 'detail' && !sheet ? <div className="inspector-context-controls">
        <span>{t('inspector.tab')}</span>
        <div>
          {compact && onExpand ? <button type="button" className="inspector-context-expand" onClick={onExpand}>
            <Pencil size={15} aria-hidden="true" />
            <span>{t('inspector.editAll')}</span>
          </button> : null}
          {onClose ? <button type="button" className="inspector-context-close" aria-label={t('inspector.close')} onClick={onClose}><X size={18} aria-hidden="true" /></button> : null}
        </div>
      </div> : null}
      {!surface ? <div className="inspector-tabs" role="tablist" aria-label={t('inspector.tab')}>
        <button id="inspector-tab-inspector" type="button" role="tab" aria-controls="inspector-tabpanel" aria-selected={tab === 'inspector'} tabIndex={tab === 'inspector' ? 0 : -1} className={tab === 'inspector' ? 'active' : ''} onClick={() => setTab('inspector')} onKeyDown={(event) => onTabKeyDown(event, 0)}>{t('inspector.tab')}</button>
        <button id="inspector-tab-loads" type="button" role="tab" aria-controls="inspector-tabpanel" aria-selected={tab === 'loads'} tabIndex={tab === 'loads' ? 0 : -1} className={tab === 'loads' ? 'active' : ''} onClick={() => setTab('loads')} onKeyDown={(event) => onTabKeyDown(event, 1)}>{t('inspector.loadsTab')}</button>
        <button id="inspector-tab-display" type="button" role="tab" aria-controls="inspector-tabpanel" aria-selected={tab === 'display'} tabIndex={tab === 'display' ? 0 : -1} className={tab === 'display' ? 'active' : ''} onClick={() => setTab('display')} onKeyDown={(event) => onTabKeyDown(event, 2)}>{t('inspector.viewTab')}</button>
        {!sheet && onClose ? <button type="button" className="mobile-inspector-close" aria-label={t('inspector.close')} onClick={onClose}><X size={18} /></button> : null}
      </div> : null}

      <div id={surface ? `${surface}-tabpanel` : 'inspector-tabpanel'} className="inspector-scroll" role={surface ? undefined : 'tabpanel'} aria-labelledby={surface ? undefined : `inspector-tab-${activeTab}`}>
        {activeTab === 'inspector' ? <InspectorProperties /> : null}
        {activeTab === 'loads' ? <AnalysisSetupPanel activeTool={activeTool} onChooseTool={chooseLoadTool} selectedCombinationId={selectedCombinationId} setSelectedCombinationId={setSelectedCombinationId} /> : null}
        {activeTab === 'display' ? <DisplayPanel includeCalculationMode={false} /> : null}
      </div>
    </aside>
  );
};

const AnalysisModePanel = () => {
  const { project, updateProjectView } = useProjectModel();
  const { t } = useI18n();
  const setCalculationMode = (value: string) => updateProjectView((draft) => ({ ...draft, settings: { ...draft.settings, calculationMode: value as 'classroom' | 'complete' } }));
  return <section className="inspector-section calculation-mode-section">
    <h3>{t('inspector.calculationExperience')}</h3>
    <Segmented value={project.settings.calculationMode ?? 'complete'} options={[{ value: 'classroom', label: t('analysis.modeClassroom') }, { value: 'complete', label: t('analysis.modeComplete') }]} onChange={setCalculationMode} />
    {project.settings.calculationMode === 'classroom'
      ? <div className="classroom-mode-card"><strong>{t('inspector.classroomEssentials')}</strong><span>{t('inspector.classroomEssentialsBody')}</span><small>{t('inspector.classroomRigidityWarning')}</small></div>
      : <div className="inspector-note"><CircleHelp size={17} /> {t('inspector.completeModeDescription')}</div>}
  </section>;
};

const ConnectedInspector = (props: InspectorProps) => {
  const { selection, activeTool, setActiveTool } = useWorkspaceUI();
  return <InspectorContent {...props} selection={selection} activeTool={activeTool} setActiveTool={setActiveTool} />;
};

const SelectionIndependentInspector = memo(({
  activeTool = 'select',
  onActiveToolChange = () => undefined,
  ...props
}: InspectorProps) => <InspectorContent
  {...props}
  selection={null}
  activeTool={activeTool}
  setActiveTool={onActiveToolChange}
/>);

/**
 * Detail subscribes to selection authority. Analysis setup and View deliberately
 * do not: Workspace injects only the tool state analysis needs, allowing a
 * selection change to leave their retained surface and drafts untouched.
 */
export const Inspector = (props: InspectorProps) => (
  props.surface === 'analysisSetup' || props.surface === 'view'
    ? <SelectionIndependentInspector {...props} />
    : <ConnectedInspector {...props} />
);

const NtcCombinationDraftPanel = ({ setSelectedCombinationId }: Pick<{
  setSelectedCombinationId: (id: string) => void;
}, 'setSelectedCombinationId'>) => {
  const { project, updateProject } = useProjectModel();
  const { t } = useI18n();
  const permanentCases = project.loadCases.filter((loadCase) => loadCase.category === 'permanent');
  const variableCases = project.loadCases.filter((loadCase) => loadCase.category === 'variable');
  const [permanentCaseId, setPermanentCaseId] = useState('');
  const [variableCaseId, setVariableCaseId] = useState('');
  const selectedPermanentCaseId = permanentCases.some((loadCase) => loadCase.id === permanentCaseId) ? permanentCaseId : (permanentCases[0]?.id ?? '');
  const selectedVariableCaseId = variableCases.some((loadCase) => loadCase.id === variableCaseId) ? variableCaseId : (variableCases[0]?.id ?? '');
  const drafts = useMemo(() => (
    selectedPermanentCaseId && selectedVariableCaseId
      ? generateNormativeCombinationDrafts(NTC_CDMX_2023_GROUP_B, project.loadCases, { permanentCaseId: selectedPermanentCaseId, variableCaseId: selectedVariableCaseId })
      : []
  ), [project.loadCases, selectedPermanentCaseId, selectedVariableCaseId]);

  return <section className="inspector-section normative-drafts">
    <h3>{t('inspector.normativeDrafts')}</h3>
    <p className="section-description">{t('inspector.normativeDraftsDescription')}</p>
    <div className="normative-drafts__scope">
      <strong>{NTC_CDMX_2023_GROUP_B.title}</strong>
      <span>{t('inspector.normativeDraftsScope')}</span>
    </div>
    {permanentCases.length && variableCases.length ? <>
      <label className="select-field"><span>{t('inspector.normativePermanentCase')}</span><select value={selectedPermanentCaseId} onChange={(event) => setPermanentCaseId(event.target.value)}>{permanentCases.map((loadCase) => <option value={loadCase.id} key={loadCase.id}>{loadCase.name}</option>)}</select></label>
      <label className="select-field"><span>{t('inspector.normativeVariableCase')}</span><select value={selectedVariableCaseId} onChange={(event) => setVariableCaseId(event.target.value)}>{variableCases.map((loadCase) => <option value={loadCase.id} key={loadCase.id}>{loadCase.name}</option>)}</select></label>
      <div className="normative-drafts__list">
        {drafts.map((draft) => {
          const alreadyAdded = project.combinations.some((combination) => combination.name === draft.name && combination.sourceUrl === draft.provenance.sourceUrl);
          return <article className="normative-drafts__item" key={draft.draftId}>
            <div><strong>{draft.name}</strong><small>{draft.stateLimit === 'ultimate' ? t('inspector.normativeUltimate') : t('inspector.normativeService')}</small></div>
            <span>{Object.entries(draft.factors).map(([caseId, factor]) => `${caseId} × ${factor}`).join(' + ')}</span>
            <small>{t('inspector.normativeSections', { sections: draft.provenance.sourceSections.join(', ') })}</small>
            <button type="button" className="mini-button normative-drafts__add" aria-label={t('inspector.addNormativeDraft', { name: draft.name })} disabled={alreadyAdded} onClick={() => {
              let combinationId = '';
              updateProject((projectDraft) => {
                const combination = createProjectCombinationFromNormativeDraft(draft, projectDraft.combinations);
                combinationId = combination.id;
                projectDraft.combinations.push(combination);
                return projectDraft;
              });
              if (combinationId) setSelectedCombinationId(combinationId);
            }}>{alreadyAdded ? t('inspector.normativeAlreadyAdded') : t('inspector.addNormativeDraftAction')}</button>
          </article>;
        })}
      </div>
    </> : <div className="inspector-note"><CircleHelp size={17} /> {t('inspector.normativeMissingCases')}</div>}
    <details className="normative-drafts__exclusions"><summary>{t('inspector.normativeExclusions')}</summary><ul>{NTC_CDMX_2023_GROUP_B.exclusions.map((exclusion) => <li key={exclusion}>{exclusion}</li>)}</ul></details>
  </section>;
};

const AdvancedLoadSourcesPanel = () => {
  const { project, updateProject } = useProjectModel();
  const frameIds = project.members.filter((member) => member.type === 'frame').map((member) => member.id);
  const defaultCaseId = project.loadCases[0]?.id ?? 'LC1';
  const updateSource = (id: string, patch: Record<string, unknown>) => updateProject((draft) => {
    const source = (draft.generatedLoadSources ?? []).find((item) => item.id === id);
    if (source) Object.assign(source as unknown as Record<string, unknown>, patch);
    return draft;
  });
  const addSource = (kind: GeneratedLoadSource['kind']) => updateProject((draft) => {
    if (!frameIds.length) return draft;
    draft.generatedLoadSources ??= [];
    let index = 1; while (draft.generatedLoadSources.some((item) => item.id === `GL${index}`)) index += 1;
    const base = { id: `GL${index}`, kind, caseId: defaultCaseId, memberIds: [...frameIds], label: `Fuente ${index}` };
    const source: GeneratedLoadSource = kind === 'tributary-surface'
      ? { ...base, kind, pressure: 1, tributaryWidth: 1, direction: 'global-y' }
      : kind === 'hydrostatic' || kind === 'soil-pressure'
        ? { ...base, kind, referenceY: 0, unitWeight: 9.81, direction: 'global-x', sign: 1 }
        : kind === 'elastic-foundation'
          ? { id: base.id, kind, memberIds: base.memberIds, stiffness: 10_000, direction: 'global-y', label: base.label }
        : kind === 'live-pattern' || kind === 'member-chain'
          ? { ...base, kind, qy: -1, coordinateSystem: 'global', lengthBasis: 'real', pattern: kind === 'live-pattern' ? 'all' : undefined }
          : { ...base, kind: 'prestress', force: -100, eccentricity: 0 };
    draft.generatedLoadSources.push(source);
    return draft;
  });
  const updateMembers = (id: string, value: string) => {
    const ids = value.split(',').map((item) => item.trim()).filter((item) => frameIds.includes(item));
    if (ids.length) updateSource(id, { memberIds: ids });
  };
  const addMoving = () => updateProject((draft) => {
    if (!frameIds.length) return draft;
    draft.movingLoadCases ??= [];
    let index = 1; while (draft.movingLoadCases.some((item) => item.id === `MOV${index}`)) index += 1;
    draft.movingLoadCases.push({ id: `MOV${index}`, name: `Carga móvil ${index}`, memberIds: [...frameIds], targetMemberId: frameIds[0], targetPosition: 0.5, quantity: 'M', impactFactor: 1, axles: [{ id: 'E1', P: 100, offset: 0 }] });
    return draft;
  });
  const updateMoving = (id: string, patch: Partial<MovingLoadCase>) => updateProject((draft) => {
    const item = (draft.movingLoadCases ?? []).find((candidate) => candidate.id === id);
    if (item) Object.assign(item, patch);
    return draft;
  });

  return <section className="inspector-section">
    <div className="section-heading"><h3>Fuentes de carga avanzadas</h3><span className="section-description">Se resuelven al analizar; no duplican cargas manuales.</span></div>
    <div className="load-tool-grid">
      <button type="button" disabled={!frameIds.length} onClick={() => addSource('tributary-surface')}>Superficie tributaria</button>
      <button type="button" disabled={!frameIds.length} onClick={() => addSource('hydrostatic')}>Hidrostática / terreno</button>
      <button type="button" disabled={!frameIds.length} onClick={() => addSource('elastic-foundation')}>Fundación elástica</button>
      <button type="button" disabled={!frameIds.length} onClick={() => addSource('live-pattern')}>Patrón vivo</button>
      <button type="button" disabled={!frameIds.length} onClick={() => addSource('member-chain')}>Cadena de vigas</button>
      <button type="button" disabled={!frameIds.length} onClick={() => addSource('prestress')}>Pretensado</button>
    </div>
    {(project.generatedLoadSources ?? []).map((source) => <details className="combination-card" key={source.id}>
      <summary>{source.label ?? source.id} · {source.kind}</summary>
      {source.kind !== 'elastic-foundation' ? <label className="select-field"><span>Caso</span><select value={source.caseId} onChange={(event) => updateSource(source.id, { caseId: event.currentTarget.value })}>{project.loadCases.map((loadCase) => <option value={loadCase.id} key={loadCase.id}>{loadCase.name}</option>)}</select></label> : null}
      <label className="select-field"><span>Miembros (IDs separados por coma)</span><input value={source.memberIds.join(', ')} onChange={(event) => updateMembers(source.id, event.currentTarget.value)} /></label>
      {source.kind === 'tributary-surface' ? <><NumberField label="Presión" value={source.pressure} unit="kN/m²" resetKey={`${source.id}:pressure`} onChange={(value) => updateSource(source.id, { pressure: value })} /><NumberField label="Ancho tributario" value={source.tributaryWidth} unit="m" resetKey={`${source.id}:width`} onChange={(value) => updateSource(source.id, { tributaryWidth: Math.max(0, value) })} /></> : null}
      {source.kind === 'hydrostatic' || source.kind === 'soil-pressure' ? <><NumberField label="Cota de referencia" value={source.referenceY} unit="m" resetKey={`${source.id}:level`} onChange={(value) => updateSource(source.id, { referenceY: value })} /><NumberField label="Peso unitario" value={source.unitWeight} unit="kN/m³" resetKey={`${source.id}:gamma`} onChange={(value) => updateSource(source.id, { unitWeight: value })} /></> : null}
      {source.kind === 'elastic-foundation' ? <NumberField label="Módulo Winkler" value={source.stiffness} unit="kN/m²" resetKey={`${source.id}:foundation`} onChange={(value) => updateSource(source.id, { stiffness: Math.max(value, 1e-9) })} /> : null}
      {source.kind === 'live-pattern' || source.kind === 'member-chain' ? <><NumberField label="qy" value={source.qy} unit="kN/m" resetKey={`${source.id}:qy`} onChange={(value) => updateSource(source.id, { qy: value })} />{source.kind === 'live-pattern' ? <label className="select-field"><span>Patrón</span><select value={source.pattern ?? 'all'} onChange={(event) => updateSource(source.id, { pattern: event.currentTarget.value })}><option value="all">Todos</option><option value="alternating-odd">Alternado impar</option><option value="alternating-even">Alternado par</option></select></label> : null}</> : null}
      {source.kind === 'prestress' ? <><NumberField label="Fuerza (compresión negativa)" value={source.force} unit="kN" resetKey={`${source.id}:force`} onChange={(value) => updateSource(source.id, { force: value })} /><NumberField label="Excentricidad local" value={source.eccentricity ?? 0} unit="m" resetKey={`${source.id}:eccentricity`} onChange={(value) => updateSource(source.id, { eccentricity: value })} /></> : null}
      <button type="button" className="icon-danger-button" onClick={() => updateProject((draft) => ({ ...draft, generatedLoadSources: (draft.generatedLoadSources ?? []).filter((item) => item.id !== source.id) }))}>Eliminar</button>
    </details>)}
    <div className="section-heading"><h3>Cargas móviles persistentes</h3><button type="button" className="mini-button" aria-label="Agregar carga móvil" disabled={!frameIds.length} onClick={addMoving}><Plus size={15} /></button></div>
    {(project.movingLoadCases ?? []).map((moving) => <details className="combination-card" key={moving.id}><summary>{moving.name}</summary>
      <label className="select-field"><span>Respuesta</span><select value={moving.quantity} onChange={(event) => updateMoving(moving.id, { quantity: event.currentTarget.value as MovingLoadCase['quantity'] })}><option value="N">N</option><option value="V">V</option><option value="M">M</option></select></label>
      <label className="select-field"><span>Miembro objetivo</span><select value={moving.targetMemberId} onChange={(event) => updateMoving(moving.id, { targetMemberId: event.currentTarget.value })}>{moving.memberIds.map((id) => <option value={id} key={id}>{id}</option>)}</select></label>
      <NumberField label="x/L objetivo" value={moving.targetPosition} resetKey={`${moving.id}:target`} onChange={(value) => updateMoving(moving.id, { targetPosition: Math.max(0, Math.min(1, value)) })} />
      <NumberField label="Carga del primer eje" value={moving.axles[0]?.P ?? 0} unit="kN" resetKey={`${moving.id}:axle`} onChange={(value) => updateMoving(moving.id, { axles: [{ ...(moving.axles[0] ?? { id: 'E1', offset: 0 }), P: Math.max(0, value) }, ...moving.axles.slice(1)] })} />
      <button type="button" className="icon-danger-button" onClick={() => updateProject((draft) => ({ ...draft, movingLoadCases: (draft.movingLoadCases ?? []).filter((item) => item.id !== moving.id) }))}>Eliminar</button>
    </details>)}
  </section>;
};

const AnalysisSetupPanel = ({ activeTool, onChooseTool, selectedCombinationId, setSelectedCombinationId }: {
  activeTool: Tool;
  onChooseTool: (tool: Extract<Tool, 'pointLoad' | 'distributedLoad' | 'moment'>) => void;
  selectedCombinationId: string;
  setSelectedCombinationId: (id: string) => void;
}) => {
  const { project, updateProject } = useProjectModel();
  const { t } = useI18n();
  const loadToolOptions: Array<{ tool: Extract<Tool, 'pointLoad' | 'distributedLoad' | 'moment'>; label: string; detail: string; icon: typeof MoveDown }> = [
    { tool: 'pointLoad', label: t('inspector.point'), detail: t('toolbar.pointLoadDetail'), icon: MoveDown },
    { tool: 'distributedLoad', label: t('inspector.distributed'), detail: t('toolbar.distributedLoadDetail'), icon: Sigma },
    { tool: 'moment', label: t('results.moment'), detail: t('toolbar.momentDetail'), icon: RotateCcw },
  ];
  return <><AnalysisModePanel />
    <section className="inspector-section load-starter">
      <h3>{t('inspector.addLoadTitle')}</h3>
      <p>{t('inspector.addLoadDescription')}</p>
      <div className="load-tool-grid">
        {loadToolOptions.map(({ tool, label, detail, icon: Icon }) => <button type="button" key={tool} aria-pressed={activeTool === tool} className={`tool-${tool}${activeTool === tool ? ' active' : ''}`} onClick={() => onChooseTool(tool)}><Icon size={18} /><strong>{label}</strong><small>{detail}</small></button>)}
      </div>
    </section>
    <section className="inspector-section">
      <div className="section-heading"><h3>{t('inspector.loadCases')}</h3><button type="button" className="mini-button" aria-label={t('inspector.addLoadCase')} onClick={() => updateProject((draft) => {
        let index = 1;
        while (draft.loadCases.some((item) => item.id === `LC${index}`)) index += 1;
        const id = `LC${index}`;
        draft.loadCases.push({ id, name: t('inspector.defaultLoadCaseName', { index }), category: 'other', active: true });
        return draft;
      })}><Plus size={15} /></button></div>
      <div className="load-case-list">{project.loadCases.map((loadCase) => <div className="load-case-row" key={loadCase.id}>
        <input aria-label={t('inspector.activateLoadCase', { name: loadCase.name })} type="checkbox" checked={loadCase.active} onChange={(event) => updateProject((draft) => {
          const item = draft.loadCases.find((candidate) => candidate.id === loadCase.id);
          if (item) item.active = event.target.checked;
          return draft;
        })} />
        <div><input aria-label={t('inspector.loadCaseName', { id: loadCase.id })} value={loadCase.name} onChange={(event) => updateProject((draft) => {
          const item = draft.loadCases.find((candidate) => candidate.id === loadCase.id);
          if (item) item.name = event.target.value;
          return draft;
        })} /><label className="load-case-category"><span>{t('inspector.loadCaseCategory', { id: loadCase.id })}</span><select aria-label={t('inspector.loadCaseCategory', { id: loadCase.id })} value={loadCase.category} onChange={(event) => updateProject((draft) => {
          const item = draft.loadCases.find((candidate) => candidate.id === loadCase.id);
          if (item) item.category = event.target.value as LoadCase['category'];
          return draft;
        })}>{(Object.keys(loadCaseCategoryKey) as LoadCase['category'][]).map((category) => <option key={category} value={category}>{t(loadCaseCategoryKey[category])}</option>)}</select></label></div>
        <ChevronRight size={15} aria-hidden="true" />
      </div>)}</div>
    </section>
    <AdvancedLoadSourcesPanel />
    <NtcCombinationDraftPanel setSelectedCombinationId={setSelectedCombinationId} />
    <section className="inspector-section">
      <div className="section-heading"><h3>{t('inspector.combinations')}</h3><button type="button" className="mini-button" aria-label={t('inspector.addCombination')} onClick={() => updateProject((draft) => {
        let index = 1;
        while (draft.combinations.some((item) => item.id === `COMB${index}`)) index += 1;
        const id = `COMB${index}`;
        draft.combinations.push({ id, name: t('inspector.defaultCombinationName', { index }), factors: Object.fromEntries(draft.loadCases.map((item) => [item.id, 1])) });
        return draft;
      })}><Plus size={15} /></button></div>
      <label className="select-field"><span>{t('inspector.analyze')}</span><select value={selectedCombinationId} onChange={(event) => setSelectedCombinationId(event.target.value)}><option value="">{t('analysis.activeCases')}</option>{project.combinations.map((combination) => <option key={combination.id} value={combination.id}>{combination.name}</option>)}</select></label>
      {project.combinations.map((combination) => <details className="combination-card" key={combination.id} open={combination.id === selectedCombinationId}>
        <summary>{combination.name}</summary>
        {project.loadCases.map((loadCase) => <NumberField key={loadCase.id} resetKey={`${combination.id}:${loadCase.id}`} label={loadCase.name} value={combination.factors[loadCase.id] ?? 0} onChange={(value) => updateProject((draft) => {
          const item = draft.combinations.find((candidate) => candidate.id === combination.id);
          if (item) item.factors[loadCase.id] = value;
          return draft;
        })} />)}
        {combination.source ? <div className="norm-source"><strong>{combination.jurisdiction} · {combination.edition}</strong><span>{combination.source}</span>{combination.sourceUrl ? <a href={combination.sourceUrl} target="_blank" rel="noreferrer">{t('inspector.openOfficialSource')}</a> : null}<small>{t('inspector.editableTemplateNote')}</small></div> : null}
      </details>)}
    </section>
    <div className="inspector-note"><CircleHelp size={17} /> {t('inspector.fullEffectsNote')}</div>
  </>;
};

const DisplayPanel = ({ includeCalculationMode = true }: { includeCalculationMode?: boolean }) => {
  const { project, updateProjectView } = useProjectModel();
  const { language, t } = useI18n();
  const { theme, setTheme } = useWorkspaceUI();
  const units = project.settings.units;
  const view = readCanvasViewSettings(project);
  const display = (value: number, quantity: UnitQuantity) => toDisplay(value, units, quantity);
  const base = (value: number, quantity: UnitQuantity) => fromDisplay(value, units, quantity);
  const setView = (patch: Partial<typeof view>) => updateProjectView((draft) => withCanvasViewSettings(draft, patch));
  return <>
    {includeCalculationMode ? <section className="inspector-section calculation-mode-section">
      <h3>{t('inspector.calculationExperience')}</h3>
      <Segmented value={project.settings.calculationMode ?? 'complete'} options={[{ value: 'classroom', label: t('analysis.modeClassroom') }, { value: 'complete', label: t('analysis.modeComplete') }]} onChange={(value) => updateProjectView((draft) => ({ ...draft, settings: { ...draft.settings, calculationMode: value as 'classroom' | 'complete' } }))} />
      {project.settings.calculationMode === 'classroom'
        ? <div className="classroom-mode-card"><strong>{t('inspector.classroomEssentials')}</strong><span>{t('inspector.classroomEssentialsBody')}</span><small>{t('inspector.classroomRigidityWarning')}</small></div>
        : <div className="inspector-note"><CircleHelp size={17} /> {t('inspector.completeModeDescription')}</div>}
    </section> : null}
    <ViewFavoritesPanel
      language={language}
      units={units}
      theme={theme}
      view={view}
      onApply={(favorite) => {
        setTheme(favorite.theme);
        updateProjectView((draft) => withCanvasViewSettings(draft, favorite.view));
      }}
    />
    <section className="inspector-section">
      <h3>{t('inspector.canvas')}</h3>
      <label className="toggle-row"><span>{t('inspector.grid')}</span><input type="checkbox" checked={view.showGrid} onChange={(event) => setView({ showGrid: event.target.checked })} /></label>
      <label className="toggle-row"><span>{t('inspector.snap')}</span><input type="checkbox" checked={view.snap} onChange={(event) => setView({ snap: event.target.checked })} /></label>
      <NumberField label={t('inspector.spacing')} value={display(view.gridSize, 'length')} unit={unitLabel(units, 'length')} resetKey={`grid-size:${units}`} onChange={(value) => setView({ gridSize: Math.max(1e-6, base(value, 'length')) })} />
      <label className="toggle-row"><span>{t('inspector.nodeLabels')}</span><input type="checkbox" checked={view.showNodeLabels} onChange={(event) => setView({ showNodeLabels: event.target.checked })} /></label>
      <label className="toggle-row"><span>{t('inspector.memberLabels')}</span><input type="checkbox" checked={view.showMemberLabels} onChange={(event) => setView({ showMemberLabels: event.target.checked })} /></label>
      <label className="toggle-row"><span>{t('inspector.localAxes')}</span><input type="checkbox" checked={view.showLocalAxes} onChange={(event) => setView({ showLocalAxes: event.target.checked })} /></label>
      <label className="toggle-row"><span>{t('inspector.dimensions')}</span><input type="checkbox" checked={view.showDimensions} onChange={(event) => setView({ showDimensions: event.target.checked })} /></label>
      <label className="toggle-row"><span>{t('inspector.loadsTab')}</span><input type="checkbox" checked={view.showLoads} onChange={(event) => setView({ showLoads: event.target.checked })} /></label>
      <label className="toggle-row"><span>{t('inspector.criticalValues')}</span><input type="checkbox" checked={view.showResultValues} onChange={(event) => setView({ showResultValues: event.target.checked })} /></label>
    </section>
    <section className="inspector-section">
      <h3>{t('inspector.cadPrecision')}</h3>
      <p className="section-description">{t('inspector.cadPrecisionDescription')}</p>
      <div className="compact-toggle-grid">
        <label><input type="checkbox" checked={view.snapTargets.grid} onChange={(event) => setView({ snapTargets: { ...view.snapTargets, grid: event.target.checked } })} /><span>{t('inspector.grid')}</span></label>
        <label><input type="checkbox" checked={view.snapTargets.nodes} onChange={(event) => setView({ snapTargets: { ...view.snapTargets, nodes: event.target.checked } })} /><span>{t('inspector.nodes')}</span></label>
        <label><input type="checkbox" checked={view.snapTargets.midpoints} onChange={(event) => setView({ snapTargets: { ...view.snapTargets, midpoints: event.target.checked } })} /><span>{t('inspector.midpoints')}</span></label>
        <label><input type="checkbox" checked={view.snapTargets.intersections} onChange={(event) => setView({ snapTargets: { ...view.snapTargets, intersections: event.target.checked } })} /><span>{t('inspector.intersections')}</span></label>
        <label><input type="checkbox" checked={view.snapTargets.perpendicular} onChange={(event) => setView({ snapTargets: { ...view.snapTargets, perpendicular: event.target.checked } })} /><span>{t('inspector.perpendicular')}</span></label>
      </div>
      <small className="field-help">{t('inspector.selectionDragHelp')}</small>
      <div className="filter-chip-row" role="group" aria-label={t('inspector.selectionFilters')}>
        <button type="button" aria-pressed={view.selectionFilter.nodes} onClick={() => setView({ selectionFilter: { ...view.selectionFilter, nodes: !view.selectionFilter.nodes } })}>{t('inspector.nodes')}</button>
        <button type="button" aria-pressed={view.selectionFilter.members} onClick={() => setView({ selectionFilter: { ...view.selectionFilter, members: !view.selectionFilter.members } })}>{t('inspector.members')}</button>
        <button type="button" aria-pressed={view.selectionFilter.loads} onClick={() => setView({ selectionFilter: { ...view.selectionFilter, loads: !view.selectionFilter.loads } })}>{t('inspector.loadsTab')}</button>
      </div>
    </section>
    <section className="inspector-section">
      <h3>{t('inspector.results')}</h3>
      <label className="toggle-row"><span>{t('inspector.resultOverlay')}</span><input type="checkbox" checked={view.showResultOverlay} onChange={(event) => setView({ showResultOverlay: event.target.checked })} /></label>
      <Segmented value={view.diagramScaleMode} options={[{ value: 'common', label: t('inspector.commonScale') }, { value: 'individual', label: t('inspector.perMemberScale') }]} onChange={(value) => setView({ diagramScaleMode: value as 'common' | 'individual' })} />
      <NumberField label={t('inspector.visualFactor')} value={view.diagramScale} resetKey="diagram-scale" onChange={(value) => setView({ diagramScale: Math.max(0.1, value) })} />
      <NumberField label={t('inspector.deformedScale')} value={view.deformedScale} resetKey="deformed-scale" onChange={(value) => setView({ deformedScale: Math.max(1, value) })} />
      <Segmented value={view.diagramSide} options={[{ value: 'positive', label: t('inspector.positiveLocalSide') }, { value: 'negative', label: t('inspector.negativeLocalSide') }]} onChange={(value) => setView({ diagramSide: value as 'positive' | 'negative' })} />
    </section>
    <section className="inspector-section"><h3>{t('inspector.semanticColors')}</h3><div className="legend-list"><span><i className="legend-dot axial" /> {t('inspector.axialForce')}</span><span><i className="legend-dot shear" /> {t('inspector.shearForce')}</span><span><i className="legend-dot moment" /> {t('inspector.bendingMoment')}</span><span><i className="legend-dot force" /> {t('inspector.loadsTab')}</span><span><i className="legend-dot dimension" /> {t('inspector.dimensions')}</span><span><i className="legend-dot axis" /> {t('inspector.axesCuts')}</span></div></section>
  </>;
};
