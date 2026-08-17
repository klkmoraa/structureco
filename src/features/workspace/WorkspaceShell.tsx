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
import { isToolRailCompact } from './shellComposition';
import { ShellCompositionProvider } from './ShellCompositionProvider';
import { SurfacePresentationProvider } from './SurfacePresentationProvider';
import { useShellComposition } from './useShellComposition';
import { useSurfacePresentation } from './useSurfacePresentation';
import { normalizeInspectorDetent, useWorkspaceLayoutPreferences } from './useWorkspaceLayoutPreferences';
import type { SurfaceId } from './surfacePresentation';
import '../../design-system/components/ui.css';
import './phase1.css';
import { emitWorkspaceCommand, onWorkspaceCommand } from './workspaceCommands';

const LazyCommandPalette = lazy(() => import('./CommandPalette').then((module) => ({ default: module.CommandPalette })));
const LazyModelDoctor = lazy(() => import('../model-doctor/ModelDoctor').then((module) => ({ default: module.ModelDoctor })));
const LazyDatasheet = lazy(() => import('../datasheet/DatasheetPanel').then((module) => ({ default: module.DatasheetPanel })));

type WorkspaceShellProps = { onOpenHome: () => void; onOpenSpace3D: () => void; projectId: string };
type LayoutController = ReturnType<typeof useWorkspaceLayoutPreferences>;

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
  const [editorLayers, dispatchEditorLayers] = useReducer(editorLayerReducer, undefined, createPersistedEditorLayerState);
  const modelDoctorToastRef = useRef<{ projectId: string; signature: string }>({ projectId, signature: '' });
  const { t } = useI18n();
  const { project, analysis, setActiveTool, analyze } = useProject();
  const { activeTool } = useWorkspaceUI();
  const { preferences: layout, setPreference, togglePreference } = layoutController;
  const { shellClass } = useShellComposition();
  const broker = useSurfacePresentation();
  const { openSurface, closeSurface, toggleSurface, markSurfaceReady } = broker;
  const detail = broker.stateFor('detail');
  const analysisSetup = broker.stateFor('analysisSetup');
  const view = broker.stateFor('view');
  const results = broker.stateFor('results');
  const datasheet = broker.stateFor('datasheet');
  const doctor = broker.stateFor('doctor');
  const palette = broker.stateFor('palette');

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

  useEffect(() => {
    const subscriptions = [
      onWorkspaceCommand('open-command-palette', () => openSurface('palette')),
      onWorkspaceCommand('open-model-doctor', () => openSurface('doctor')),
      onWorkspaceCommand('open-datasheet', () => openSurface('datasheet')),
      onWorkspaceCommand('open-results', () => openSurface('results')),
    ];
    return () => subscriptions.forEach((unsubscribe) => unsubscribe());
  }, [openSurface]);

  useEffect(() => {
    setModelDoctorAcknowledgedIds(new Set());
    (['datasheet', 'doctor', 'palette'] as const).forEach((surface) => closeSurface(surface));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    let current = true;
    void import('../model-doctor/modelDoctorDiagnostics').then(({ buildModelDoctorReport }) => {
      if (!current) return;
      const report = buildModelDoctorReport(project);
      const signature = JSON.stringify(report.findings
        .map((finding) => ({
          id: finding.id,
          severity: finding.severity,
          affected: finding.affectedObjects.map((object) => `${object.kind}:${object.id}`).sort(),
        }))
        .sort((first, second) => first.id.localeCompare(second.id)));
      const previous = modelDoctorToastRef.current.projectId === project.id
        ? modelDoctorToastRef.current.signature
        : '';
      modelDoctorToastRef.current = { projectId: project.id, signature };
      if (report.total === 0 || signature === previous) return;
      emitWorkspaceCommand('show-toast', {
        message: t('modelDoctor.toastTitle'),
        description: t('modelDoctor.toastDescription'),
        tone: 'warning',
      });
    });
    return () => { current = false; };
  }, [project, t]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'k' || !(event.ctrlKey || event.metaKey) || event.altKey) return;
      if (datasheet.status === 'active' || doctor.status === 'active') return;
      event.preventDefault();
      toggleSurface('palette', document.activeElement instanceof HTMLElement ? document.activeElement : null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [datasheet.status, doctor.status, toggleSurface]);

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
    else closeSurface('results');
  }, [closeSurface, openSurface]);
  const setDatasheetOpen = useCallback((open: boolean) => {
    if (open) openSurface('datasheet');
    else closeSurface('datasheet');
  }, [closeSurface, openSurface]);
  const setDoctorOpen = useCallback((open: boolean) => {
    if (open) openSurface('doctor');
    else closeSurface('doctor');
  }, [closeSurface, openSurface]);
  const markDatasheetReady = useCallback((ready: boolean) => markSurfaceReady('datasheet', ready), [markSurfaceReady]);
  const markDoctorReady = useCallback((ready: boolean) => markSurfaceReady('doctor', ready), [markSurfaceReady]);

  return <AppShellLayout
    ref={shellRef}
    projectId={projectId}
    skipLabel={t('shell.skipToCanvas')}
    shellClass={shellClass}
    inspectorCollapsed={!detail.open}
    inspectorWidth={layout.inspectorWidth}
    fullCanvas={layout.fullCanvas}
    topBar={<TopBar
      onOpenHome={onOpenHome}
      onOpenSpace3D={onOpenSpace3D}
      layoutActions={{
        inspectorCollapsed: !detail.open,
        fullCanvas: layout.fullCanvas,
        onToggleInspector: () => {
          if (layout.fullCanvas) setPreference('fullCanvas', false);
          if (detail.open) {
            closeSurface('detail');
            setPreference('inspectorCollapsed', true);
          } else {
            openSurface('detail');
            setPreference('inspectorCollapsed', false);
          }
        },
        onToggleFullCanvas: () => {
          if (!layout.fullCanvas) {
            closeSurface('detail');
            closeSurface('analysisSetup');
            closeSurface('view');
            closeSurface('results');
          } else {
            openSurface('results');
            if (!layout.inspectorCollapsed) openSurface('detail');
          }
          togglePreference('fullCanvas');
        },
      }}
    />}
    toolRail={<ToolRail compact={isToolRailCompact(shellClass)} />}
    workspace={<>
      {project.settings.calculationMode === 'classroom' ? <ClassroomGuide className="classroom-workspace-journey" project={project} analysis={analysis} onChooseTool={setActiveTool} onAnalyze={analyze} /> : null}
      <StructuralCanvas layers={editorLayers} dispatchLayers={dispatchEditorLayers} onRequestInspector={() => openSurface('detail')} />
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
      {broker.isRetained('datasheet') ? <Suspense fallback={null}><LazyDatasheet
        open={datasheet.status === 'active'}
        onOpenChange={setDatasheetOpen}
        presentation={datasheet.presentation as 'drawer' | 'fullscreen'}
        onSurfaceReady={markDatasheetReady}
      /></Suspense> : null}
      {broker.isRetained('doctor') ? <Suspense fallback={<span className="sr-only" role="status">{t('modelDoctor.loading')}</span>}><LazyModelDoctor
        open={doctor.status === 'active'}
        onOpenChange={setDoctorOpen}
        onSurfaceReady={markDoctorReady}
        presentation={doctor.presentation as 'drawer' | 'fullscreen'}
        acknowledgedIds={modelDoctorAcknowledgedIds}
        onAcknowledgedIdsChange={setModelDoctorAcknowledgedIds}
      /></Suspense> : null}
    </>}
    inspector={<div className="workspace-surfaces">
      {broker.isRetained('detail') ? <Inspector surface="detail" className={detail.presentation === 'sheet' && detail.status === 'active' ? 'mobile-open' : ''} desktopWidth={layout.inspectorWidth} presentation={detail.presentation as 'dock' | 'inset' | 'sheet'} status={detail.status} onClose={() => closeSurface('detail')} onDesktopWidthChange={(width) => setPreference('inspectorWidth', width)} mobileDetent={layout.inspectorDetent} onMobileDetentChange={(detent) => setPreference('inspectorDetent', detent)} /> : null}
      {broker.isRetained('analysisSetup') ? <Inspector surface="analysisSetup" className={analysisSetup.presentation === 'sheet' && analysisSetup.status === 'active' ? 'mobile-open' : ''} presentation={analysisSetup.presentation as 'dock' | 'inset' | 'sheet'} status={analysisSetup.status} onClose={() => closeSurface('analysisSetup')} mobileDetent={layout.inspectorDetent} onMobileDetentChange={(detent) => setPreference('inspectorDetent', detent)} activeTool={activeTool} onActiveToolChange={setActiveTool} /> : null}
      {broker.isRetained('view') ? <Inspector surface="view" className={view.presentation === 'sheet' && view.status === 'active' ? 'mobile-open' : ''} presentation={view.presentation as 'dock' | 'inset' | 'sheet'} status={view.status} onClose={() => closeSurface('view')} mobileDetent={layout.inspectorDetent} onMobileDetentChange={(detent) => setPreference('inspectorDetent', detent)} /> : null}
    </div>}
    floatingActions={<div className="workspace-surface-launcher">
      <button className="mobile-inspector-toggle" onClick={(event) => openSurface('detail', event.currentTarget)} aria-label={t('inspector.open')} aria-expanded={detail.status === 'active'} aria-controls="workspace-detail"><SlidersHorizontal size={20} /></button>
      <button type="button" onClick={(event) => openSurface('analysisSetup', event.currentTarget)} aria-label={t('inspector.loadsTab')}>{t('inspector.loadsTab')}</button>
      <button type="button" onClick={(event) => openSurface('view', event.currentTarget)} aria-label={t('inspector.viewTab')}>{t('inspector.viewTab')}</button>
    </div>}
    footer={<div className="professional-note">{t('app.professionalNote')}</div>}
  />;
};

const WorkspaceSurface = (props: WorkspaceShellProps) => {
  const shellRef = useRef<HTMLDivElement>(null);
  const layoutController = useWorkspaceLayoutPreferences();
  const { shellClass } = useShellComposition();
  const initialOpen = useMemo<SurfaceId[]>(() => {
    if (layoutController.preferences.fullCanvas) return [];
    const surfaces: SurfaceId[] = ['results'];
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
