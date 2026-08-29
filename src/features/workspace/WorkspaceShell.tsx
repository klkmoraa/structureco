import { lazy, Suspense, useCallback, useEffect, useMemo, useReducer, useRef, useState, type RefObject } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Inspector } from '../inspector/Inspector';
import { ResultsPanel } from '../results/ResultsPanel';
import { StructuralCanvas } from '../canvas/StructuralCanvas';
import { ToolRail } from '../canvas/ToolRail';
import { TopBar } from '../topbar/TopBar';
import { ClassroomGuide } from '../classroom/ClassroomGuide';
import { ToastNotification } from './ToastNotification';
import { useI18n } from '../../i18n/useI18n';
import { useProject } from '../../store/ProjectContext';
import { useWorkspaceUI } from '../../store/WorkspaceUIContext';
import { createPersistedEditorLayerState, editorLayerReducer, persistEditorLayerState } from '../canvas/editorLayers';
import { AppShellLayout } from './AppShellLayout';
import { ShellCompositionProvider } from './ShellCompositionProvider';
import { SurfacePresentationProvider } from './SurfacePresentationProvider';
import { useShellComposition } from './useShellComposition';
import { useSurfacePresentation } from './useSurfacePresentation';
import { nextAvailableInspectorDetent, normalizeInspectorDetent, useWorkspaceLayoutPreferences } from './useWorkspaceLayoutPreferences';
import { preloadDenseResultsSurface, type DenseResultView } from '../results/denseResults';
import type { SurfaceId } from './surfacePresentation';
import '../../design-system/components/ui.css';
import './phase1.css';
import { emitWorkspaceCommand, onWorkspaceCommand } from './workspaceCommands';
import { isOwnHistoryScope } from './commandRegistry';
import type { AnalysisResult } from '../../types';
import type { RevisionSnapshot } from '../revision-comparison/revisionComparison';
import { DataSurfaceRetainedStateProvider } from './DataSurfaceRetainedState';

const LazyCommandPalette = lazy(() => import('./CommandPalette').then((module) => ({ default: module.CommandPalette })));
const LazyModelDoctor = lazy(() => import('../model-doctor/ModelDoctor').then((module) => ({ default: module.ModelDoctor })));
const LazyDatasheet = lazy(() => import('../datasheet/DatasheetPanel').then((module) => ({ default: module.DatasheetPanel })));
const LazyStructuralBom = lazy(() => import('../bom/StructuralBomPanel').then((module) => ({ default: module.StructuralBomPanel })));
const LazyRevisionComparison = lazy(() => import('../revision-comparison/RevisionComparisonPanel').then((module) => ({ default: module.RevisionComparisonPanel })));
const LazyDenseResults = lazy(() => preloadDenseResultsSurface());

/**
 * Respaldo de foco para el cierre de una superficie: enfoca el primer lanzador
 * visible de `selector` **sólo** si nadie reclamó el foco.
 *
 * `SurfacePresentationProvider` ya devuelve el foco al disparador que abrió la
 * superficie cuando ese disparador sigue montado, y lo hace en su propio
 * `requestAnimationFrame`. Un respaldo incondicional se ejecuta después y le
 * roba el foco a ese disparador: en K0 eso mandaba el foco a Utilidades aunque
 * Resultados se hubiera abierto —y cerrado— desde su botón persistente de la
 * barra. Encolar este cuadro después del bróker y comprobar `activeElement`
 * conserva el respaldo para el caso que lo justifica —un item de menú que se
 * desmonta con la hoja— sin pisar la restauración correcta.
 */
const focusStableLauncherIfUnclaimed = (selector: string): void => {
  window.requestAnimationFrame(() => {
    const active = document.activeElement;
    if (active && active !== document.body) return;
    const launcher = [...document.querySelectorAll<HTMLElement>(selector)]
      .find((candidate) => candidate.isConnected && candidate.getClientRects().length > 0);
    launcher?.focus({ preventScroll: true });
  });
};

type WorkspaceShellProps = { onOpenHome: () => void; onOpenSpace3D: () => void; projectId: string };
type LayoutController = ReturnType<typeof useWorkspaceLayoutPreferences>;
type PendingModelDoctorNotification = {
  id: number;
  projectId: string;
  analysisAtRequest: AnalysisResult | null;
  hasStarted: boolean;
};

const WorkspaceBrokerContent = ({
  onOpenHome,
  onOpenSpace3D,
  projectId,
  shellRef,
  layoutController,
}: WorkspaceShellProps & {
  shellRef: RefObject<HTMLDivElement | null>;
  layoutController: LayoutController;
}) => {
  const [modelDoctorAcknowledgedIds, setModelDoctorAcknowledgedIds] = useState<Set<string>>(() => new Set());
  const [dataSurfaceStateEpoch, setDataSurfaceStateEpoch] = useState(0);
  const [revisionBaseline, setRevisionBaseline] = useState<RevisionSnapshot | null>(null);
  const [editorLayers, dispatchEditorLayers] = useReducer(editorLayerReducer, undefined, createPersistedEditorLayerState);
  const { t } = useI18n();
  const { project, analysis, isAnalyzing, setActiveTool, setResultTab, analyze, undo, redo, canUndo, canRedo } = useProject();
  const [pendingModelDoctorNotification, setPendingModelDoctorNotification] = useState<PendingModelDoctorNotification | null>(null);
  const modelDoctorNotificationIdRef = useRef(0);
  const pendingModelDoctorNotificationIdRef = useRef<number | null>(null);
  const reportedAnalysisRef = useRef<AnalysisResult | null>(null);
  const { activeTool } = useWorkspaceUI();
  const { preferences: layout, setPreference, togglePreference } = layoutController;
  const { shellClass } = useShellComposition();
  const broker = useSurfacePresentation();
  const { openSurface, closeSurface, toggleSurface, markSurfaceReady, setSurfaceExtent } = broker;
  const detail = broker.stateFor('detail');
  const analysisSetup = broker.stateFor('analysisSetup');
  const view = broker.stateFor('view');
  const results = broker.stateFor('results');
  const dense = broker.stateFor('dense');
  const [denseView, setDenseView] = useState<DenseResultView>('reactions');
  const datasheet = broker.stateFor('datasheet');
  const bom = broker.stateFor('bom');
  const comparison = broker.stateFor('comparison');
  const doctor = broker.stateFor('doctor');
  const palette = broker.stateFor('palette');
  const inspectorOpen = detail.open || analysisSetup.open || view.open;
  const resultsWereOpenRef = useRef(results.open);

  useEffect(() => persistEditorLayerState(editorLayers), [editorLayers]);

  useEffect(() => {
    const normalizeDetent = () => {
      const next = normalizeInspectorDetent(layout.inspectorDetent, {
        width: window.innerWidth,
        height: window.visualViewport?.height ?? window.innerHeight,
      });
      if (next !== layout.inspectorDetent) setPreference('inspectorDetent', next);
    };
    normalizeDetent();
    window.addEventListener('resize', normalizeDetent);
    window.addEventListener('orientationchange', normalizeDetent);
    window.visualViewport?.addEventListener('resize', normalizeDetent);
    return () => {
      window.removeEventListener('resize', normalizeDetent);
      window.removeEventListener('orientationchange', normalizeDetent);
      window.visualViewport?.removeEventListener('resize', normalizeDetent);
    };
  }, [layout.inspectorDetent, setPreference]);

  const cycleInspectorDetent = useCallback((direction: 1 | -1) => {
    const next = nextAvailableInspectorDetent(layout.inspectorDetent, direction, {
      width: window.innerWidth,
      height: window.visualViewport?.height ?? window.innerHeight,
    });
    if (next !== layout.inspectorDetent) setPreference('inspectorDetent', next);
  }, [layout.inspectorDetent, setPreference]);

  useEffect(() => {
    const canOpenPalette = datasheet.status !== 'active' && bom.status !== 'active' && comparison.status !== 'active' && doctor.status !== 'active';
    const subscriptions = [
      onWorkspaceCommand('open-command-palette', () => {
        // Ctrl/Cmd+K ya respeta esta exclusión; el lanzador visible debe pasar
        // por la misma autoridad para no montar una segunda capa sobre Doctor
        // o Datasheet.
        if (canOpenPalette) openSurface('palette');
      }),
      onWorkspaceCommand('open-model-doctor', () => openSurface('doctor')),
      onWorkspaceCommand('open-datasheet', () => openSurface('datasheet')),
      onWorkspaceCommand('open-structural-bom', () => openSurface('bom')),
      onWorkspaceCommand('open-revision-comparison', () => openSurface('comparison')),
      onWorkspaceCommand('open-results', (payload) => openSurface('results', payload?.trigger)),
      onWorkspaceCommand('toggle-results', (payload) => {
        if (results.open) closeSurface('results');
        else openSurface('results', payload?.trigger);
      }),
      onWorkspaceCommand('analysis-requested', () => {
        const id = modelDoctorNotificationIdRef.current + 1;
        modelDoctorNotificationIdRef.current = id;
        pendingModelDoctorNotificationIdRef.current = id;
        setPendingModelDoctorNotification({ id, projectId: project.id, analysisAtRequest: analysis, hasStarted: false });
      }),
      onWorkspaceCommand('open-analysis-setup', () => openSurface('analysisSetup')),
      onWorkspaceCommand('open-view-settings', () => openSurface('view')),
      /* `dense` es invocada: el lanzador viaja en el propio comando para que el
         broker sepa a dónde devolver el foco al cerrar.
         `influence` es además el único de los tres cuya lectura vive también
         en el lienzo (CanvasResultLayer gatea el overlay de influencia con
         `resultTab === 'influence'`, el mismo campo que `analyze()` ya mueve
         a 'issues'/'summary'). CRI-101 dejó esa lectura sin quien la ponga:
         el resto de superficies densas no tienen lectura en el lienzo, así
         que no necesitan tocar `resultTab`. */
      onWorkspaceCommand('open-dense-results', ({ view: requestedView, trigger }) => {
        setDenseView(requestedView);
        if (requestedView === 'influence') setResultTab('influence');
        openSurface('dense', trigger);
      }),
    ];
    return () => subscriptions.forEach((unsubscribe) => unsubscribe());
  }, [analysis, bom.status, closeSurface, comparison.status, datasheet.status, doctor.status, openSurface, project.id, results.open, setResultTab]);

  useEffect(() => {
    setModelDoctorAcknowledgedIds(new Set());
    pendingModelDoctorNotificationIdRef.current = null;
    setPendingModelDoctorNotification(null);
    (['generator', 'dense', 'datasheet', 'bom', 'comparison', 'doctor', 'palette'] as const).forEach((surface) => closeSurface(surface));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Al terminar una corrida válida, Resultados aparece en su modo cerrado:
  // cabe junto al lienzo pero ya responde resultado, caso, actualidad y valor
  // gobernante. No mueve el foco ni despliega el inspector; abrir el detalle
  // sigue siendo una elección explícita de la persona.
  useEffect(() => {
    if (analysis?.success && analysis !== reportedAnalysisRef.current) {
      setResultTab('summary');
      openSurface('results');
    }
    reportedAnalysisRef.current = analysis;
  }, [analysis, openSurface, setResultTab]);

  // Abrir Resultados no debe dejar al lado una ficha de edición completa.
  // La transición se produce una vez por apertura: si después la persona
  // elige editar, esa decisión explícita no se vuelve a sobrescribir.
  useEffect(() => {
    if (results.open && !resultsWereOpenRef.current && detail.open) {
      setPreference('inspectorCompact', true);
    }
    resultsWereOpenRef.current = results.open;
  }, [detail.open, results.open, setPreference]);

  useEffect(() => {
    const request = pendingModelDoctorNotification;
    if (!request) return undefined;
    if (request.projectId !== project.id) {
      if (pendingModelDoctorNotificationIdRef.current === request.id) {
        pendingModelDoctorNotificationIdRef.current = null;
        setPendingModelDoctorNotification(null);
      }
      return undefined;
    }
    if (isAnalyzing) {
      if (!request.hasStarted) {
        setPendingModelDoctorNotification((current) => current?.id === request.id
          ? { ...current, hasStarted: true }
          : current);
      }
      return undefined;
    }
    if (!request.hasStarted || analysis === request.analysisAtRequest) return undefined;

    let current = true;
    void import('../model-doctor/modelDoctorDiagnostics').then(({ buildModelDoctorReport }) => {
      if (!current || pendingModelDoctorNotificationIdRef.current !== request.id) return;
      const report = buildModelDoctorReport(project);
      if (report.total > 0) {
        emitWorkspaceCommand('show-toast', {
          message: t('modelDoctor.toastTitle'),
          description: t('modelDoctor.toastDescription'),
          tone: 'warning',
        });
      }
      if (pendingModelDoctorNotificationIdRef.current === request.id) {
        pendingModelDoctorNotificationIdRef.current = null;
        setPendingModelDoctorNotification(null);
      }
    });
    return () => { current = false; };
  }, [analysis, isAnalyzing, pendingModelDoctorNotification, project, t]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'k' || !(event.ctrlKey || event.metaKey) || event.altKey) return;
      if (datasheet.status === 'active' || bom.status === 'active' || comparison.status === 'active' || doctor.status === 'active') return;
      event.preventDefault();
      toggleSurface('palette', document.activeElement instanceof HTMLElement ? document.activeElement : null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [bom.status, comparison.status, datasheet.status, doctor.status, toggleSurface]);

  // Ctrl/Cmd+Z and Ctrl/Cmd+Y drive the same undo/redo the history buttons use
  // (G-01 · CRI-103) — but never with focus in a text field, the Datasheet
  // grid, or any modal surface with its own editing history: the worst case is
  // silently undoing a model operation while the user meant to undo a cell.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
      const key = event.key.toLowerCase();
      const isUndo = key === 'z';
      const isRedo = key === 'y';
      if (!isUndo && !isRedo) return;
      if (isOwnHistoryScope(event.target)) return;
      if (isUndo) {
        if (!canUndo) return;
        event.preventDefault();
        undo();
      } else {
        if (!canRedo) return;
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canRedo, canUndo, redo, undo]);

  useEffect(() => {
    const viewport = window.visualViewport;
    const shell = shellRef.current;
    if (!viewport || !shell) return undefined;
    const syncViewport = () => {
      const bottom = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      shell.style.setProperty('--sc-visual-viewport-height', `${viewport.height}px`);
      shell.style.setProperty('--sc-visual-viewport-top', `${viewport.offsetTop}px`);
      shell.style.setProperty('--sc-visual-viewport-bottom', `${bottom}px`);
    };
    syncViewport();
    viewport.addEventListener('resize', syncViewport);
    viewport.addEventListener('scroll', syncViewport);
    return () => {
      viewport.removeEventListener('resize', syncViewport);
      viewport.removeEventListener('scroll', syncViewport);
    };
  }, [shellRef]);

  const setResultsOpen = useCallback((open: boolean, trigger?: HTMLElement | null) => {
    if (open) openSurface('results', trigger);
    else {
      closeSurface('results');
      setDataSurfaceStateEpoch((epoch) => epoch + 1);
      // En K0 Utilidades sigue siendo un lanzador persistente mientras la hoja
      // se cierra. Es el respaldo correcto cuando el cierre viene del propio
      // panel y el disparador original ya no está montado — nunca cuando el
      // bróker sí pudo devolver el foco al botón que abrió Resultados.
      focusStableLauncherIfUnclaimed('.utility-more-button');
    }
  }, [closeSurface, openSurface]);
  const openDetail = useCallback((trigger?: HTMLElement | null) => {
    setPreference('inspectorCollapsed', false);
    setPreference('inspectorCompact', false);
    openSurface('detail', trigger);
  }, [openSurface, setPreference]);
  const closeDetail = useCallback(() => {
    closeSurface('detail');
    setPreference('inspectorCollapsed', true);
    setPreference('inspectorCompact', false);
  }, [closeSurface, setPreference]);
  const setDatasheetOpen = useCallback((open: boolean) => {
    if (open) openSurface('datasheet');
    else { closeSurface('datasheet'); setDataSurfaceStateEpoch((epoch) => epoch + 1); }
  }, [closeSurface, openSurface]);
  const setDoctorOpen = useCallback((open: boolean) => {
    if (open) openSurface('doctor');
    else { closeSurface('doctor'); setDataSurfaceStateEpoch((epoch) => epoch + 1); }
  }, [closeSurface, openSurface]);
  const setBomOpen = useCallback((open: boolean) => {
    if (open) openSurface('bom');
    else {
      closeSurface('bom');
      setDataSurfaceStateEpoch((epoch) => epoch + 1);
      // Los items de Exportar/Utilidades se desmontan al abrir la superficie:
      // ahí el bróker no tiene a dónde devolver el foco y este lanzador
      // persistente es el respaldo de la composición vigente.
      focusStableLauncherIfUnclaimed('.topbar-export-trigger, .utility-more-button');
    }
  }, [closeSurface, openSurface]);
  const setComparisonOpen = useCallback((open: boolean) => {
    if (open) openSurface('comparison');
    else closeSurface('comparison');
  }, [closeSurface, openSurface]);
  const setDenseOpen = useCallback((open: boolean) => {
    if (open) openSurface('dense');
    else { closeSurface('dense'); setDataSurfaceStateEpoch((epoch) => epoch + 1); }
  }, [closeSurface, openSurface]);
  const markDenseReady = useCallback((ready: boolean) => markSurfaceReady('dense', ready), [markSurfaceReady]);
  const markDatasheetReady = useCallback((ready: boolean) => markSurfaceReady('datasheet', ready), [markSurfaceReady]);
  const markBomReady = useCallback((ready: boolean) => markSurfaceReady('bom', ready), [markSurfaceReady]);
  const markComparisonReady = useCallback((ready = true) => markSurfaceReady('comparison', ready), [markSurfaceReady]);
  const markDoctorReady = useCallback((ready: boolean) => markSurfaceReady('doctor', ready), [markSurfaceReady]);
  // "Localizar" degrada a `peek`, nunca cierra (CRI-102 / D-11): mismo mecanismo
  // para Datasheet, BOM y Doctor, porque es el mismo hueco en las tres superficies.
  const peekDatasheet = useCallback(() => setSurfaceExtent('datasheet', 'peek'), [setSurfaceExtent]);
  const restoreDatasheet = useCallback(() => setSurfaceExtent('datasheet', 'default'), [setSurfaceExtent]);
  const peekBom = useCallback(() => setSurfaceExtent('bom', 'peek'), [setSurfaceExtent]);
  const restoreBom = useCallback(() => setSurfaceExtent('bom', 'default'), [setSurfaceExtent]);
  const peekComparison = useCallback(() => setSurfaceExtent('comparison', 'peek'), [setSurfaceExtent]);
  const restoreComparison = useCallback(() => setSurfaceExtent('comparison', 'default'), [setSurfaceExtent]);
  const peekDoctor = useCallback(() => setSurfaceExtent('doctor', 'peek'), [setSurfaceExtent]);
  const restoreDoctor = useCallback(() => setSurfaceExtent('doctor', 'default'), [setSurfaceExtent]);

  return <DataSurfaceRetainedStateProvider resetVersion={dataSurfaceStateEpoch}><AppShellLayout
    ref={shellRef}
    projectId={projectId}
    skipLabel={t('shell.skipToCanvas')}
    shellClass={shellClass}
    inspectorCollapsed={!inspectorOpen}
    inspectorCompact={detail.open && layout.inspectorCompact}
    inspectorWidth={layout.inspectorWidth}
    toolDockPosition={layout.toolDockPosition}
    fullCanvas={layout.fullCanvas}
    topBar={<TopBar
      onOpenHome={onOpenHome}
      onOpenSpace3D={onOpenSpace3D}
      resultsOpen={results.open}
      layoutActions={{
        inspectorCollapsed: !inspectorOpen,
        fullCanvas: layout.fullCanvas,
        toolDockPosition: layout.toolDockPosition,
        onToggleInspector: (trigger) => {
          if (layout.fullCanvas) setPreference('fullCanvas', false);
          if (detail.open) closeDetail();
          else if (analysisSetup.open) closeSurface('analysisSetup');
          else if (view.open) closeSurface('view');
          else openDetail(trigger);
        },
        onToggleFullCanvas: () => {
          if (!layout.fullCanvas) {
            closeSurface('detail');
            closeSurface('analysisSetup');
            closeSurface('view');
            closeSurface('results');
          } else if (!layout.inspectorCollapsed) {
            // Results stays non-resident even leaving full-canvas (CRI-100);
            // only the inspector, which the user had open, comes back.
            openDetail();
          }
          togglePreference('fullCanvas');
        },
        onToolDockPositionChange: (position) => setPreference('toolDockPosition', position),
        onOpenAnalysisSetup: () => openSurface('analysisSetup'),
        onOpenViewSettings: () => openSurface('view'),
      }}
    />}
    toolRail={<ToolRail />}
    workspace={<>
      {project.settings.calculationMode === 'classroom' ? <ClassroomGuide className="classroom-workspace-journey" project={project} analysis={analysis} onChooseTool={setActiveTool} onAnalyze={() => {
        emitWorkspaceCommand('analysis-requested');
        analyze();
      }} /> : null}
      <StructuralCanvas layers={editorLayers} dispatchLayers={dispatchEditorLayers} onRequestInspector={() => openDetail()} />
      {broker.isRetained('results') ? <ResultsPanel
        presentation={results.presentation as 'dock' | 'inset' | 'sheet'}
        status={results.status}
        onOpenChange={setResultsOpen}
      /> : null}
      <ToastNotification />
      {broker.isRetained('palette') ? <Suspense fallback={null}><LazyCommandPalette
        open={palette.status === 'active'}
        onClose={() => closeSurface('palette')}
        dispatchLayers={dispatchEditorLayers}
        presentation={palette.presentation as 'overlay' | 'sheet'}
      /></Suspense> : null}
      {/* Invocada, nunca residente: sólo existe en el árbol mientras el broker
          la retiene, y desaparece al cerrarse (CRI-101). */}
      {broker.isRetained('dense') ? <Suspense fallback={<span className="sr-only" role="status">{t('results.denseLoading')}</span>}><LazyDenseResults
        open={dense.status === 'active'}
        view={denseView}
        onViewChange={setDenseView}
        onOpenChange={setDenseOpen}
        presentation={dense.presentation as 'drawer' | 'fullscreen'}
        onSurfaceReady={markDenseReady}
      /></Suspense> : null}
      {broker.isRetained('datasheet') ? <Suspense fallback={null}><LazyDatasheet
        open={datasheet.status === 'active'}
        onOpenChange={setDatasheetOpen}
        presentation={datasheet.presentation as 'drawer' | 'fullscreen'}
        onSurfaceReady={markDatasheetReady}
        extent={datasheet.extent}
        onPeek={peekDatasheet}
        onRestore={restoreDatasheet}
      /></Suspense> : null}
      {broker.isRetained('bom') ? <Suspense fallback={null}><LazyStructuralBom
        open={bom.status === 'active'}
        onOpenChange={setBomOpen}
        presentation={bom.presentation as 'drawer' | 'fullscreen'}
        onSurfaceReady={markBomReady}
        extent={bom.extent}
        onPeek={peekBom}
        onRestore={restoreBom}
      /></Suspense> : null}
      {broker.isRetained('comparison') ? <Suspense fallback={null}><LazyRevisionComparison
        open={comparison.status === 'active'}
        onOpenChange={setComparisonOpen}
        presentation={comparison.presentation as 'drawer' | 'fullscreen'}
        onSurfaceReady={markComparisonReady}
        extent={comparison.extent}
        onPeek={peekComparison}
        onRestore={restoreComparison}
        baseline={revisionBaseline}
        onBaselineChange={setRevisionBaseline}
      /></Suspense> : null}
      {broker.isRetained('doctor') ? <Suspense fallback={<span className="sr-only" role="status">{t('modelDoctor.loading')}</span>}><LazyModelDoctor
        open={doctor.status === 'active'}
        onOpenChange={setDoctorOpen}
        onSurfaceReady={markDoctorReady}
        presentation={doctor.presentation as 'drawer' | 'fullscreen'}
        acknowledgedIds={modelDoctorAcknowledgedIds}
        onAcknowledgedIdsChange={setModelDoctorAcknowledgedIds}
        extent={doctor.extent}
        onPeek={peekDoctor}
        onRestore={restoreDoctor}
      /></Suspense> : null}
    </>}
    inspector={<div className="workspace-surfaces" data-workspace-right-slot>
      {broker.isRetained('detail') ? <Inspector surface="detail" className={detail.presentation === 'sheet' && detail.status === 'active' ? 'mobile-open' : ''} desktopWidth={layout.inspectorWidth} presentation={detail.presentation as 'dock' | 'inset' | 'sheet'} status={detail.status} onClose={closeDetail} compact={detail.presentation !== 'sheet' && layout.inspectorCompact} onExpand={() => setPreference('inspectorCompact', false)} onDesktopWidthChange={(width) => setPreference('inspectorWidth', width)} mobileDetent={layout.inspectorDetent} onMobileDetentChange={(detent) => setPreference('inspectorDetent', detent)} onMobileDetentCycle={cycleInspectorDetent} /> : null}
      {broker.isRetained('analysisSetup') ? <Inspector surface="analysisSetup" className={analysisSetup.presentation === 'sheet' && analysisSetup.status === 'active' ? 'mobile-open' : ''} presentation={analysisSetup.presentation as 'dock' | 'inset' | 'sheet'} status={analysisSetup.status} onClose={() => closeSurface('analysisSetup')} mobileDetent={layout.inspectorDetent} onMobileDetentChange={(detent) => setPreference('inspectorDetent', detent)} onMobileDetentCycle={cycleInspectorDetent} activeTool={activeTool} onActiveToolChange={setActiveTool} /> : null}
      {broker.isRetained('view') ? <Inspector surface="view" className={view.presentation === 'sheet' && view.status === 'active' ? 'mobile-open' : ''} presentation={view.presentation as 'dock' | 'inset' | 'sheet'} status={view.status} onClose={() => closeSurface('view')} mobileDetent={layout.inspectorDetent} onMobileDetentChange={(detent) => setPreference('inspectorDetent', detent)} onMobileDetentCycle={cycleInspectorDetent} /> : null}
    </div>}
    floatingActions={shellClass === 'K0' ? undefined : <div className="workspace-surface-launcher">
      <button className="mobile-inspector-toggle" onClick={(event) => openDetail(event.currentTarget)} aria-label={t('inspector.open')} aria-expanded={detail.status === 'active'} aria-controls="workspace-detail"><SlidersHorizontal size={20} /></button>
    </div>}
    footer={<div className="professional-note">{t('app.professionalNote')}</div>}
  /></DataSurfaceRetainedStateProvider>;
};

const WorkspaceSurface = (props: WorkspaceShellProps) => {
  const shellRef = useRef<HTMLDivElement>(null);
  const layoutController = useWorkspaceLayoutPreferences();
  const { shellClass } = useShellComposition();
  // Results is never resident, in any class (CRI-100): state and reliability
  // already live in the TopBar and evidence is a canvas layer, so the panel only
  // opens on request now — it no longer starts open by default.
  const initialOpen = useMemo<SurfaceId[]>(() => {
    if (layoutController.preferences.fullCanvas) return [];
    const surfaces: SurfaceId[] = [];
    if (!layoutController.preferences.inspectorCollapsed) surfaces.push('detail');
    return surfaces;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <SurfacePresentationProvider shellClass={shellClass} initialOpen={initialOpen} backgroundRef={shellRef}>
    <WorkspaceBrokerContent {...props} shellRef={shellRef} layoutController={layoutController} />
  </SurfacePresentationProvider>;
};

export const WorkspaceShell = (props: WorkspaceShellProps) => (
  <ShellCompositionProvider><WorkspaceSurface {...props} /></ShellCompositionProvider>
);

export default WorkspaceShell;
