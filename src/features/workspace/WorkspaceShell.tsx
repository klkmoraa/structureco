import { lazy, Suspense, useCallback, useEffect, useReducer, useRef, useState } from 'react';
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
import { createPersistedEditorLayerState, editorLayerReducer, persistEditorLayerState } from '../canvas/editorLayers';
import { AppShellLayout } from './AppShellLayout';
import { normalizeInspectorDetent, useWorkspaceLayoutPreferences } from './useWorkspaceLayoutPreferences';
import '../../design-system/components/ui.css';
import './phase1.css';
import { emitWorkspaceCommand, onWorkspaceCommand } from './workspaceCommands';

/** La paleta sólo pesa cuando se abre: nadie paga su código por arrancar el editor. */
const LazyCommandPalette = lazy(() => import('./CommandPalette').then((module) => ({ default: module.CommandPalette })));
/** Model Doctor y su adaptador de diagnósticos no entran al bundle inicial del editor. */
const LazyModelDoctor = lazy(() => import('../model-doctor/ModelDoctor').then((module) => ({ default: module.ModelDoctor })));

export const WorkspaceShell = ({ onOpenHome, onOpenSpace3D, projectId }: { onOpenHome: () => void; onOpenSpace3D: () => void; projectId: string }) => {
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [modelDoctorOpen, setModelDoctorOpen] = useState(false);
  const [modelDoctorAcknowledgedIds, setModelDoctorAcknowledgedIds] = useState<Set<string>>(() => new Set());
  const [editorLayers, dispatchEditorLayers] = useReducer(editorLayerReducer, undefined, createPersistedEditorLayerState);
  const inspectorToggleRef = useRef<HTMLButtonElement>(null);
  const inspectorReturnFocusRef = useRef<HTMLElement | null>(null);
  const doctorReturnFocusRef = useRef<HTMLElement | null>(null);
  const modelDoctorToastRef = useRef<{ projectId: string; signature: string }>({ projectId, signature: '' });
  const shellRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();
  const { project, analysis, setActiveTool, analyze } = useProject();
  const { preferences: layout, setPreference, togglePreference } = useWorkspaceLayoutPreferences();

  useEffect(() => persistEditorLayerState(editorLayers), [editorLayers]);

  const closeMobileInspector = useCallback(() => {
    setMobileInspectorOpen(false);
    window.requestAnimationFrame(() => {
      const remembered = inspectorReturnFocusRef.current;
      const returnTarget = remembered?.isConnected ? remembered : inspectorToggleRef.current;
      returnTarget?.focus({ preventScroll: true });
    });
  }, []);

  const openMobileInspector = useCallback(() => {
    const activeElement = document.activeElement;
    inspectorReturnFocusRef.current = activeElement instanceof HTMLElement
      && activeElement !== document.body
      && activeElement !== document.documentElement
      ? activeElement
      : inspectorToggleRef.current;
    emitWorkspaceCommand('collapse-mobile-results');
    setMobileInspectorOpen(true);
  }, []);

  useEffect(() => {
    const desktop = window.matchMedia?.('(min-width: 1024px)');
    if (!desktop) return undefined;
    const syncBreakpoint = () => {
      if (desktop.matches) setMobileInspectorOpen(false);
    };
    desktop.addEventListener?.('change', syncBreakpoint);
    return () => desktop.removeEventListener?.('change', syncBreakpoint);
  }, []);

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
    return onWorkspaceCommand('expand-mobile-results', () => setMobileInspectorOpen(false));
  }, []);

  useEffect(() => onWorkspaceCommand('open-command-palette', () => setPaletteOpen(true)), []);

  const setDoctorBackgroundState = useCallback((modal: boolean) => {
    const shell = shellRef.current;
    if (shell) {
      shell.inert = modal;
      if (modal) shell.setAttribute('aria-hidden', 'true');
      else shell.removeAttribute('aria-hidden');
    }
  }, []);

  useEffect(() => {
    setModelDoctorAcknowledgedIds(new Set());
    setDoctorBackgroundState(false);
    setModelDoctorOpen(false);
  }, [projectId, setDoctorBackgroundState]);

  const setDoctorOpen = useCallback((open: boolean) => {
    // El chunk puede tardar en su primera apertura: la mesa sigue operable
    // hasta que el Drawer portado confirme que ya existe una superficie modal.
    if (!open) setDoctorBackgroundState(false);
    if (open) {
      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLElement && activeElement !== document.body && activeElement !== document.documentElement) {
        doctorReturnFocusRef.current = activeElement;
      }
      setMobileInspectorOpen(false);
      setPaletteOpen(false);
      if (window.matchMedia?.('(max-width: 1023px)').matches) {
        emitWorkspaceCommand('collapse-mobile-results');
      }
    }
    setModelDoctorOpen(open);
  }, [setDoctorBackgroundState]);

  const doctorSurfaceReady = useCallback(() => {
    if (!modelDoctorOpen) return;
    setDoctorBackgroundState(true);
  }, [modelDoctorOpen, setDoctorBackgroundState]);

  useEffect(() => onWorkspaceCommand('open-model-doctor', () => setDoctorOpen(true)), [setDoctorOpen]);

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

  useEffect(() => () => {
    setDoctorBackgroundState(false);
  }, [setDoctorBackgroundState]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'k' || !(event.ctrlKey || event.metaKey) || event.altKey) return;
      event.preventDefault();
      if (modelDoctorOpen) return;
      setPaletteOpen((open) => !open);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modelDoctorOpen]);

  useEffect(() => {
    if (!mobileInspectorOpen) return undefined;
    const background = shellRef.current?.querySelectorAll<HTMLElement>('.topbar, .toolbar, .center-stage');
    background?.forEach((element) => {
      element.inert = true;
      element.setAttribute('aria-hidden', 'true');
    });
    return () => background?.forEach((element) => {
      element.inert = false;
      element.removeAttribute('aria-hidden');
    });
  }, [mobileInspectorOpen]);

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
  }, []);

  return <AppShellLayout
    ref={shellRef}
    projectId={projectId}
    skipLabel={t('shell.skipToCanvas')}
    inspectorCollapsed={layout.inspectorCollapsed}
    inspectorWidth={layout.inspectorWidth}
    fullCanvas={layout.fullCanvas}
    toolRailCompact={layout.toolRailCompact}
    topBar={<TopBar
      onOpenHome={onOpenHome}
      onOpenSpace3D={onOpenSpace3D}
      layoutActions={{
        inspectorCollapsed: layout.inspectorCollapsed,
        fullCanvas: layout.fullCanvas,
        toolRailCompact: layout.toolRailCompact,
        onToggleInspector: () => {
          setMobileInspectorOpen(false);
          if (layout.fullCanvas) {
            setPreference('fullCanvas', false);
            setPreference('inspectorCollapsed', false);
            return;
          }
          togglePreference('inspectorCollapsed');
        },
        onToggleFullCanvas: () => {
          setMobileInspectorOpen(false);
          togglePreference('fullCanvas');
        },
        onToggleToolRail: () => togglePreference('toolRailCompact'),
      }}
    />}
    toolRail={<ToolRail compact={layout.toolRailCompact} />}
    workspace={<>
        {project.settings.calculationMode === 'classroom' ? <ClassroomGuide className="classroom-workspace-journey" project={project} analysis={analysis} onChooseTool={setActiveTool} onAnalyze={analyze} /> : null}
        <StructuralCanvas layers={editorLayers} dispatchLayers={dispatchEditorLayers} onRequestInspector={() => {
          if (window.matchMedia('(max-width: 1023px)').matches) openMobileInspector();
        }} />
        <ResultsPanel />
        <ToastNotification />
        {paletteOpen ? <Suspense fallback={null}><LazyCommandPalette
          open
          onClose={() => setPaletteOpen(false)}
          dispatchLayers={dispatchEditorLayers}
        /></Suspense> : null}
        {modelDoctorOpen ? <Suspense fallback={<span className="sr-only" role="status">{t('modelDoctor.loading')}</span>}><LazyModelDoctor
          open
          onOpenChange={setDoctorOpen}
          onSurfaceReady={doctorSurfaceReady}
          acknowledgedIds={modelDoctorAcknowledgedIds}
          onAcknowledgedIdsChange={setModelDoctorAcknowledgedIds}
          returnFocusTo={doctorReturnFocusRef.current}
        /></Suspense> : null}
      </>}
    backdrop={mobileInspectorOpen ? <button className="mobile-inspector-backdrop" aria-hidden="true" tabIndex={-1} onClick={closeMobileInspector} /> : null}
    inspector={<Inspector
      className={mobileInspectorOpen ? 'mobile-open' : ''}
      desktopWidth={layout.inspectorWidth}
      modal={mobileInspectorOpen}
      onClose={closeMobileInspector}
      onDesktopWidthChange={(width) => setPreference('inspectorWidth', width)}
      mobileDetent={layout.inspectorDetent}
      onMobileDetentChange={(detent) => setPreference('inspectorDetent', detent)}
    />}
    floatingActions={!mobileInspectorOpen ? <button
        ref={inspectorToggleRef}
        className="mobile-inspector-toggle"
        onClick={openMobileInspector}
        aria-label={t('inspector.open')}
        aria-expanded={mobileInspectorOpen}
        aria-controls="workspace-inspector"
      >
        <SlidersHorizontal size={20} />
      </button> : null}
    footer={<div className="professional-note">{t('app.professionalNote')}</div>}
  />;
};

export default WorkspaceShell;
