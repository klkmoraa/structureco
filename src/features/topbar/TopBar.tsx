import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import {
  Check,
  Box,
  ChartNoAxesColumnIncreasing,
  ChevronDown,
  CloudOff,
  Copy,
  Download,
  Eye,
  FileArchive,
  FilePlus2,
  FolderOpen,
  HardDriveDownload,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  PanelBottom,
  PanelRightClose,
  PanelRightOpen,
  PanelLeft,
  Play,
  Redo2,
  Save,
  Share2,
  Sheet,
  SlidersHorizontal,
  Sparkles,
  Layers3,
  Undo2,
  Wrench,
} from 'lucide-react';
import { createBlankProject, exampleProjects } from '../../data/defaultProject';
import { useI18n } from '../../i18n/useI18n';
import { usePhase2I18n } from '../../i18n/usePhase2I18n';
import { useProjectAnalysis, useProjectModel } from '../../store/ProjectContext';
import { useWorkspaceUI } from '../../store/WorkspaceUIContext';
import { exportProjectJson, safeProjectFilename } from '../../utils/export';
import { normalizeProject } from '../../data/migrate';
import { saveBytes, type SaveOutcome } from '../../platform/fileSystem';
import { buildShareLink } from '../../utils/shareLink';
import { AnalysisStatus } from './AnalysisStatus';
import { BrandMark } from './BrandMark';
import { Button, IconButton } from '../../design-system/components/controls';
import { useClassroomSession } from '../../store/ClassroomSessionContext';
import { presentExample } from '../welcome/examplePresentation';
import { APP_VERSION } from '../../appVersion';
import { emitWorkspaceCommand } from '../workspace/workspaceCommands';
import { resolveTopBarCommand, type TopBarCommandContext } from '../workspace/commandRegistry';
import { PDeltaAdvancedConfig, TopBarHistoryControls } from './TopBarControlGroups';
import type { ToolDockPosition } from '../workspace/useWorkspaceLayoutPreferences';
import type { PdfPreviewArtifact } from '../pdf-preview/PdfPreviewDialog';
import {
  CALCULATION_PDF_EXPORT_DEFAULTS,
  type CalculationReportOptions,
} from '../../utils/pdf/reportContext';
import './topbar.css';

const PortableImportCenter = lazy(() => import('../import-export/PortableImportCenter').then((module) => ({ default: module.PortableImportCenter })));
const LocalCommandAssistant = lazy(() => import('../ai/LocalCommandAssistant').then((module) => ({ default: module.LocalCommandAssistant })));
const PdfPreviewDialog = lazy(() => import('../pdf-preview/PdfPreviewDialog').then((module) => ({ default: module.PdfPreviewDialog })));

/**
 * La compacidad del riel salió de aquí en CRI-89: la decide la clase de
 * composición, no el usuario, así que su conmutador dejó de tener un estado que
 * conmutar. El resto de acciones de vista —inspector y lienzo completo— siguen
 * siendo intenciones del usuario y no cambian.
 */
export interface TopBarLayoutActions {
  inspectorCollapsed: boolean;
  fullCanvas: boolean;
  toolDockPosition: ToolDockPosition;
  onToggleInspector: (trigger?: HTMLElement | null) => void;
  onToggleFullCanvas: () => void;
  onToolDockPositionChange: (position: ToolDockPosition) => void;
  onOpenAnalysisSetup: () => void;
  onOpenViewSettings: () => void;
}

export const TopBar = ({ onOpenHome, onOpenSpace3D, layoutActions, resultsOpen = false }: { onOpenHome?: () => void; onOpenSpace3D?: () => void; layoutActions?: TopBarLayoutActions; resultsOpen?: boolean }) => {
  // Split across the three focused contexts (CRI-100): `project`/`analysis` come
  // from the model/analysis contexts, and only `theme` is read off the UI context
  // here — `resultTab` and the diagram cursor live in that same context too but
  // are never destructured. `AnalysisStatus` below is additionally memoized with
  // stable props, so even the pointer-driven changes this component *does* still
  // receive (selection, the diagram cursor) never reach its state/reliability
  // subtree.
  const {
    project,
    canUndo,
    canRedo,
    storageIssue,
    storageMessage,
    renameProject,
    updateProjectView,
    updateProjectAnalysisSettings,
    replaceProject,
    undo,
    redo,
  } = useProjectModel();
  const {
    analysis,
    isAnalyzing,
    selectedCombinationId,
    setSelectedCombinationId,
    analyze,
    ensureEducationTrace,
  } = useProjectAnalysis();
  const { theme, setTheme } = useWorkspaceUI();
  const { language, t } = useI18n();
  const { t: phase2T } = usePhase2I18n(language);
  const classroomSession = useClassroomSession();
  const reducedMotion = useReducedMotion();
  const popoverMotionProps = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.01 } }
    : {
      initial: { opacity: 0, y: -10, scale: 0.95 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, scale: 0.95, transition: { duration: 0.1 } },
      transition: { type: 'spring' as const, stiffness: 400, damping: 30 },
    };
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [showProjectExamples, setShowProjectExamples] = useState(false);
  const [showAnalysisMenu, setShowAnalysisMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [importCenterOpen, setImportCenterOpen] = useState(false);
  const [localAssistantOpen, setLocalAssistantOpen] = useState(false);
  const [portableExport, setPortableExport] = useState<'bundle' | 'pdf-preview' | null>(null);
  const [pdfPreview, setPdfPreview] = useState<PdfPreviewArtifact | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [saveHandle, setSaveHandle] = useState<unknown>(null);
  const [projectNameDraft, setProjectNameDraft] = useState(project.name);
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine !== false);
  const topbarRef = useRef<HTMLElement>(null);
  const projectNameRef = useRef<HTMLInputElement>(null);
  const projectMenuButtonRef = useRef<HTMLButtonElement>(null);
  const analysisMenuButtonRef = useRef<HTMLButtonElement>(null);
  const exportMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const localAssistantButtonRef = useRef<HTMLButtonElement>(null);
  const menuOpen = showProjectMenu || showAnalysisMenu || showExportMenu || showMobileMenu;

  useEffect(() => {
    const syncConnectivity = () => setOnline(navigator.onLine !== false);
    window.addEventListener('online', syncConnectivity);
    window.addEventListener('offline', syncConnectivity);
    return () => {
      window.removeEventListener('online', syncConnectivity);
      window.removeEventListener('offline', syncConnectivity);
    };
  }, []);

  const closeMenus = () => {
    setShowProjectMenu(false);
    setShowProjectExamples(false);
    setShowAnalysisMenu(false);
    setShowExportMenu(false);
    setShowMobileMenu(false);
  };

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target?.closest('.topbar-project-panel, .topbar-project-trigger, .topbar-analysis-panel, .topbar-analysis-trigger, .export-wrap, .mobile-actions-wrap')) closeMenus();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const trigger = showProjectMenu
        ? projectMenuButtonRef.current
        : showAnalysisMenu
          ? analysisMenuButtonRef.current
          : showExportMenu
            ? exportMenuButtonRef.current
            : mobileMenuButtonRef.current;
      closeMenus();
      window.requestAnimationFrame(() => trigger?.focus());
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen, showAnalysisMenu, showExportMenu, showMobileMenu, showProjectMenu]);

  useEffect(() => {
    const selector = showProjectMenu
      ? '.topbar-project-panel input:not(:disabled)'
      : showAnalysisMenu
        ? '.topbar-analysis-panel select:not(:disabled)'
        : showExportMenu
          ? '.export-menu button:not(:disabled)'
          : showMobileMenu
            ? '.mobile-actions-menu button:not(:disabled)'
            : null;
    if (!selector) return undefined;
    const handle = window.requestAnimationFrame(() => topbarRef.current?.querySelector<HTMLButtonElement>(selector)?.focus());
    return () => window.cancelAnimationFrame(handle);
  }, [showAnalysisMenu, showExportMenu, showMobileMenu, showProjectMenu]);

  const onMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]:not(:disabled)'));
    if (!items.length) return;
    event.preventDefault();
    const current = Math.max(0, items.indexOf(document.activeElement as HTMLButtonElement));
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : event.key === 'ArrowDown' ? (current + 1) % items.length : (current - 1 + items.length) % items.length;
    items[next]?.focus();
  };

  const toggleProjectMenu = () => {
    const nextOpen = !showProjectMenu;
    setShowProjectMenu(nextOpen);
    if (!nextOpen) setShowProjectExamples(false);
    setShowAnalysisMenu(false);
    setShowExportMenu(false);
    setShowMobileMenu(false);
  };
  const toggleAnalysisMenu = () => {
    setShowAnalysisMenu((open) => !open);
    setShowProjectMenu(false);
    setShowExportMenu(false);
    setShowMobileMenu(false);
  };
  const toggleExportMenu = () => {
    setShowExportMenu((open) => !open);
    setShowProjectMenu(false);
    setShowAnalysisMenu(false);
    setShowMobileMenu(false);
  };
  const toggleMobileMenu = () => {
    setShowMobileMenu((open) => !open);
    setShowProjectMenu(false);
    setShowAnalysisMenu(false);
    setShowExportMenu(false);
  };

  // Stable reference so the memoized `AnalysisStatus` below doesn't re-render
  // just because the TopBar itself re-rendered for an unrelated reason. Its
  // body is the same `emitWorkspaceCommand('open-model-doctor')` the registry's
  // `analysis:model-doctor` command runs — kept as its own `useCallback` (rather
  // than `modelDoctorCommand.run`, a fresh closure every render) only because
  // `AnalysisStatus` is itself a protected, re-render-sensitive component
  // (CRI-100); the visible "Model Doctor" buttons below read straight off
  // `modelDoctorCommand` instead.
  const openModelDoctor = useCallback(() => {
    emitWorkspaceCommand('open-model-doctor');
  }, []);
  const closeImportCenter = () => {
    setImportCenterOpen(false);
    window.requestAnimationFrame(() => projectMenuButtonRef.current?.focus());
  };

  useLayoutEffect(() => setProjectNameDraft(project.name), [project.id, project.name]);
  // Un manejador pertenece al archivo de un proyecto concreto. Renombrarlo no
  // debe perder la ruta; cambiar de proyecto sí evita escribir sobre otro.
  useEffect(() => setSaveHandle(null), [project.id]);

  const commitProjectName = () => {
    const next = projectNameDraft.trim() || project.name;
    setProjectNameDraft(next);
    renameProject(next);
  };
  const selectedCombination = project.combinations.find((item) => item.id === selectedCombinationId);
  const scenarioName = selectedCombination?.name
    ?? (project.loadCases.filter((item) => item.active).map((item) => item.name).join(' + ') || t('analysis.activeCases'));
  const scenarioFactors = selectedCombination?.factors ?? Object.fromEntries(
    project.loadCases.filter((loadCase) => loadCase.active).map((loadCase) => [loadCase.id, 1]),
  );
  const storageState = storageIssue === 'load-failed'
    ? 'load-error'
    : storageIssue === 'save-failed'
      ? 'save-error'
      : storageIssue === 'conflict'
        ? 'conflict'
        : storageIssue === 'repository-degraded'
          ? 'repository-error'
      : !online
        ? 'offline'
        : storageIssue === 'recovered'
          ? 'recovered'
          : 'local';
  const storageHasError = ['load-error', 'save-error', 'repository-error', 'conflict'].includes(storageState);
  const storageLabel = storageState === 'load-error'
    ? t('storage.loadFailedShort')
    : storageState === 'save-error'
      ? t('storage.failedShort')
    : storageState === 'conflict'
      ? phase2T('storage.conflictShort')
    : storageState === 'repository-error'
      ? phase2T('storage.repositoryShort')
    : storageState === 'recovered'
      ? t('storage.recoveredShort')
      : storageState === 'offline'
        ? t('storage.offline')
        : t('storage.local');
  const storageDescription = storageState === 'load-error'
    ? t('storage.loadFailed')
    : storageState === 'save-error'
      ? t('storage.failed')
    : storageState === 'conflict'
      ? (storageMessage ?? phase2T('storage.conflict'))
    : storageState === 'repository-error'
      ? (storageMessage ?? phase2T('storage.repository'))
    : storageState === 'recovered'
      ? t('storage.recovered')
      : storageState === 'offline'
        ? t('storage.offlineDescription')
        : t('storage.localDescription');
  const portableExportLabel = (): string => {
    if (portableExport !== 'bundle') return t('portable.bundleLabel');
    if (!analysis) return t('portable.analyzingBundle');
    return t('portable.preparingBundle');
  };
  const pdfPreviewLabel = portableExport === 'pdf-preview' ? t('portable.generatingPreview') : t('portable.previewLabel');
  const requestAnalysis = () => {
    if (project.settings.calculationMode === 'classroom') {
      classroomSession.markAnalysisRequested();
    }
    analyze();
  };

  // Single source for undo/redo, datasheet, Model Doctor, analyze, theme and
  // the plain-export controls (CRI-103): the button below reads label/disabled/run
  // straight off `commandRegistry` instead of recomputing them, so it can never
  // drift from the same command's Palette entry. `analyze` here is
  // `requestAnalysis` (this button's own classroom-session bookkeeping), not the
  // raw `analyze` — the registry only fixes *which* command runs and how its
  // enabled state is computed, not which concrete callback a surface supplies.
  const topBarCommandContext: TopBarCommandContext = { t, project, isAnalyzing, canUndo, canRedo, theme, setTheme, analyze: requestAnalysis, undo, redo };
  const command = (id: Parameters<typeof resolveTopBarCommand>[0]) => resolveTopBarCommand(id, topBarCommandContext);

  const exportPortable = async () => {
    setPortableExport('bundle');
    setExportError(null);
    try {
      let exportAnalysis = analysis;
      if (!exportAnalysis) {
        const { analyzeForPortableExport } = await import('./portableExportAnalysis');
        exportAnalysis = analyzeForPortableExport(project, selectedCombination ?? null);
      } else if (!exportAnalysis.educationTrace) {
        // The interactive analysis run skips the matrix trace for speed
        // (AG-013); the report annex needs it, so fetch it here on demand.
        exportAnalysis = await ensureEducationTrace() ?? exportAnalysis;
      }
      const portable = await import('../../utils/portable');
      const options = { appVersion: APP_VERSION, scenarioName, scenarioFactors, includeEducationTrace: true };
      const bundle = await portable.createPortableBundle(project, exportAnalysis, options);
      await portable.shareOrDownloadPortableBytes(bundle.bytes, bundle.filename, portable.STRUCTURECO_BUNDLE_MIME, t('portable.bundleShareTitle', { name: project.name }));
      emitWorkspaceCommand('show-toast', { message: t('export.completed'), description: project.name, tone: 'success' });
      setShowExportMenu(false);
      setShowMobileMenu(false);
    } catch (error) {
      setExportError(language === 'es' && error instanceof Error ? error.message : t('portable.exportFailed'));
    } finally {
      setPortableExport(null);
    }
  };

  const buildPdfPreviewArtifact = async (
    selection: CalculationReportOptions = CALCULATION_PDF_EXPORT_DEFAULTS,
  ): Promise<PdfPreviewArtifact> => {
    let exportAnalysis = analysis;
    if (!exportAnalysis) {
      const { analyzeForPortableExport } = await import('./portableExportAnalysis');
      exportAnalysis = analyzeForPortableExport(project, selectedCombination ?? null);
    } else if (!exportAnalysis.educationTrace) {
      exportAnalysis = await ensureEducationTrace() ?? exportAnalysis;
    }
    const portable = await import('../../utils/portable');
    const options: CalculationReportOptions = {
      appVersion: APP_VERSION,
      scenarioName,
      scenarioFactors,
      ...CALCULATION_PDF_EXPORT_DEFAULTS,
      ...selection,
    };
    const report = await portable.createCalculationReport(project, exportAnalysis, options);
    return {
      bytes: report.bytes,
      filename: report.filename,
      renderEngine: 'browser',
      solutionMethod: report.solutionMethod,
      methodAvailability: report.methodAvailability,
    };
  };

  const openPdfPreview = async () => {
    setPortableExport('pdf-preview');
    setExportError(null);
    try {
      setPdfPreview(await buildPdfPreviewArtifact());
      setShowExportMenu(false);
      setShowMobileMenu(false);
    } catch (error) {
      setExportError(language === 'es' && error instanceof Error ? error.message : t('portable.exportFailed'));
    } finally {
      setPortableExport(null);
    }
  };

  const downloadPdfPreview = async (artifact: PdfPreviewArtifact) => {
    try {
      const portable = await import('../../utils/portable');
      await portable.shareOrDownloadPortableBytes(artifact.bytes, artifact.filename, 'application/pdf', t('portable.reportShareTitle', { name: project.name }));
      emitWorkspaceCommand('show-toast', { message: t('export.completed'), description: project.name, tone: 'success' });
    } catch (error) {
      setExportError(language === 'es' && error instanceof Error ? error.message : t('portable.exportFailed'));
    }
  };

  const handleCopyJson = async () => {
    const payload = JSON.stringify(normalizeProject(project), null, 2);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(payload);
        emitWorkspaceCommand('show-toast', { message: t('export.copySuccessful'), description: project.name, tone: 'success' });
      } else {
        exportProjectJson(project);
        emitWorkspaceCommand('show-toast', { message: t('export.copyFallbackDownloaded'), description: project.name, tone: 'info' });
      }
    } catch {
      exportProjectJson(project);
      emitWorkspaceCommand('show-toast', { message: t('export.copyFallbackDownloaded'), description: project.name, tone: 'info' });
    }
    setShowExportMenu(false);
    setShowMobileMenu(false);
  };

  const handleSaveToDisk = async () => {
    const normalized = normalizeProject(project);
    const filename = `${safeProjectFilename(normalized.name)}.structureco.json`;
    const outcome: SaveOutcome = await saveBytes({
      bytes: new TextEncoder().encode(JSON.stringify(normalized, null, 2)),
      filename,
      mimeType: 'application/json',
      extension: '.json',
      description: t('export.saveToDisk'),
      handle: saveHandle,
    });
    if (outcome.status === 'cancelled') return;
    if (outcome.status === 'written') {
      setSaveHandle(outcome.handle);
      emitWorkspaceCommand('show-toast', { message: t('export.savedToFile', { filename: outcome.filename }), description: project.name, tone: 'success' });
    } else {
      emitWorkspaceCommand('show-toast', { message: t('export.savedDownload', { filename: outcome.filename }), description: project.name, tone: 'info' });
    }
    setShowExportMenu(false);
    setShowMobileMenu(false);
  };

  const handleShare = async () => {
    const result = buildShareLink(project, window.location.href);
    if (!result.ok) {
      setExportError(t('export.shareTooLarge', { characters: result.characters, limit: result.limit }));
      return;
    }
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('clipboard-unavailable');
      await navigator.clipboard.writeText(result.url);
      emitWorkspaceCommand('show-toast', { message: t('export.shareLinkCopied'), description: project.name, tone: 'success' });
      setExportError(null);
      setShowExportMenu(false);
      setShowMobileMenu(false);
    } catch { setExportError(t('export.shareFailed')); }
  };

  const analyzeCommand = command('analysis:run');
  const undoCommand = command('analysis:undo');
  const redoCommand = command('analysis:redo');
  const datasheetCommand = command('tool:datasheet');
  const modelDoctorCommand = command('analysis:model-doctor');
  const themeCommand = command('view:theme');
  const ThemeIcon = themeCommand.icon;
  const exportJsonCommand = command('export:json');
  const structuralBomCommand = command('export:bom');
  const StructuralBomIcon = structuralBomCommand.icon;
  const exportSvgCommand = command('export:svg');
  const exportPngCommand = command('export:png');
  const exportPrintCommand = command('export:print');
  const analysisOrderLabel = t(project.settings.analysisMode === 'p-delta' ? 'analysis.orderPDelta' : 'analysis.orderFirst');
  const analysisModeLabel = t(project.settings.calculationMode === 'classroom' ? 'analysis.modeClassroom' : 'analysis.modeComplete');
  return (
    <header ref={topbarRef} className="topbar topbar--atelier" data-topbar-layout="command-island">
      <div className="topbar-zone topbar-document-zone topbar-project-zone" data-topbar-zone="document" data-topbar-role="project">
        <button className="brand-mark brand-home-button" type="button" aria-label={t('navigation.home')} onClick={onOpenHome}>
          <BrandMark size={46} />
        </button>
        <button
          ref={projectMenuButtonRef}
          className="topbar-project-trigger"
          type="button"
          aria-label={t('topbar.currentProject')}
          aria-expanded={showProjectMenu}
          aria-haspopup="dialog"
          onClick={toggleProjectMenu}
        >
          <strong title={project.name}>{project.name}</strong>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
        <AnimatePresence>
          {showProjectMenu ? (
            <m.div {...popoverMotionProps} className="popover topbar-project-panel" role="dialog" aria-label={t('topbar.currentProject')} data-project-hub="true">
              <header className="topbar-project-hub-heading">
                <span>{t('topbar.projectHubEyebrow')}</span>
                <strong>{t('topbar.projectHubTitle')}</strong>
                <small>{t('topbar.projectHubDescription')}</small>
              </header>
              <label className="topbar-panel-field topbar-project-name-field">
                <span>{t('project.name')}</span>
                <input
                  ref={projectNameRef}
                  aria-label={t('project.name')}
                  title={projectNameDraft}
                  value={projectNameDraft}
                  onChange={(event) => setProjectNameDraft(event.target.value)}
                  onBlur={commitProjectName}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') projectNameRef.current?.blur();
                    if (event.key === 'Escape') {
                      setProjectNameDraft(project.name);
                      closeMenus();
                      window.requestAnimationFrame(() => projectMenuButtonRef.current?.focus());
                    }
                  }}
                />
              </label>
              <div className="topbar-panel-actions">
              <button aria-label={t('project.new')} onClick={() => { const next = createBlankProject(); replaceProject({ ...next, settings: { ...next.settings, language } }); setShowProjectMenu(false); }}>
                <FilePlus2 size={19} />
                <span className="menu-copy"><strong>{t('project.new')}</strong><small>{t('topbar.projectHubNewDescription')}</small></span>
              </button>
              <button aria-label={t('project.importJson')} onClick={() => { setImportCenterOpen(true); setShowProjectMenu(false); }}>
                <FolderOpen size={19} />
                <span className="menu-copy"><strong>{t('project.importJson')}</strong><small>{t('topbar.projectHubImportDescription')}</small></span>
              </button>
              <button ref={localAssistantButtonRef} aria-label={phase2T('proposal.menuLabel')} onClick={() => { setLocalAssistantOpen(true); setShowProjectMenu(false); }}>
                <Sparkles size={19} />
                <span className="menu-copy"><strong>{phase2T('proposal.menuLabel')}</strong><small>{phase2T('proposal.menuDescription')}</small></span>
              </button>
              <button
                className="topbar-project-examples-trigger"
                aria-expanded={showProjectExamples}
                onClick={() => setShowProjectExamples((open) => !open)}
              ><ChevronDown size={17} aria-hidden="true" /> {t('topbar.projectExamples')}</button>
              </div>
              {showProjectExamples ? <div className="topbar-project-examples">
              {exampleProjects.map((example) => {
                const copy = presentExample(example.name, example.description, t);
                return <button key={example.name} onClick={() => { const next = example.build(); replaceProject({ ...next, settings: { ...next.settings, language } }); setShowProjectExamples(false); setShowProjectMenu(false); }}>
                  <span className="menu-copy"><strong>{copy.name}</strong><small>{copy.description}</small></span>
                </button>;
              })}
              </div> : null}
              <div className="topbar-project-compact-utilities" aria-label={t('topbar.utilities')}>
                <span>{t('topbar.utilities')}</span>
                <div>
                  <button onClick={() => { datasheetCommand.run(); setShowProjectMenu(false); }}><Sheet size={16} /> {datasheetCommand.label}</button>
                  {onOpenSpace3D ? <button onClick={() => { onOpenSpace3D(); setShowProjectMenu(false); }}><Box size={16} /> {t('space3d.open')}</button> : null}
                  <button onClick={() => { modelDoctorCommand.run(); setShowProjectMenu(false); }}><Wrench size={16} /> {modelDoctorCommand.label}</button>
                  <button onClick={() => { themeCommand.run(); setShowProjectMenu(false); }}><ThemeIcon size={16} /> {themeCommand.label}</button>
                </div>
              </div>
            </m.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="topbar-zone topbar-actions-zone" data-topbar-zone="actions">
        <div className="topbar-analysis-wrap" data-topbar-role="analysis">
          <button
            ref={analysisMenuButtonRef}
            className="topbar-analysis-trigger"
            type="button"
            aria-label={t('topbar.analysisSettings')}
            aria-expanded={showAnalysisMenu}
            aria-haspopup="dialog"
            onClick={toggleAnalysisMenu}
          >
            <SlidersHorizontal size={17} aria-hidden="true" />
            <span><strong>{scenarioName}</strong><small>{analysisModeLabel} · {analysisOrderLabel} · {project.settings.units}</small></span>
            <ChevronDown size={15} aria-hidden="true" />
          </button>
          <AnimatePresence>
            {showAnalysisMenu ? <m.div {...popoverMotionProps} className="popover topbar-analysis-panel" role="dialog" aria-label={t('topbar.analysisSettings')}>
              <p>{t('topbar.analysisSummary')}</p>
              <label className="topbar-panel-field">
                <span>{t('analysis.caseOrCombination')}</span>
                <select
                  aria-label={t('analysis.caseOrCombination')}
                  value={selectedCombinationId}
                  onChange={(event) => setSelectedCombinationId(event.target.value)}
                >
                  <option value="">{t('analysis.activeCases')}</option>
                  {project.combinations.map((combination) => <option key={combination.id} value={combination.id}>{combination.name}</option>)}
                </select>
              </label>
              <label className="topbar-panel-field">
                <span>{t('analysis.mode')}</span>
                <select
                  aria-label={t('analysis.mode')}
                  value={project.settings.calculationMode ?? 'complete'}
                  onChange={(event) => updateProjectView((draft) => ({ ...draft, settings: { ...draft.settings, calculationMode: event.target.value as 'complete' | 'classroom' } }))}
                >
                  <option value="classroom">{t('analysis.modeClassroom')}</option>
                  <option value="complete">{t('analysis.modeComplete')}</option>
                </select>
              </label>
              <label className="topbar-panel-field">
                <span>{t('analysis.order')}</span>
                <select
                  aria-label={t('analysis.order')}
                  value={project.settings.analysisMode ?? 'first-order'}
                  onChange={(event) => updateProjectAnalysisSettings((settings) => ({ ...settings, analysisMode: event.target.value as 'first-order' | 'p-delta' }))}
                >
                  <option value="first-order">{t('analysis.orderFirst')}</option>
                  <option value="p-delta">{t('analysis.orderPDelta')}</option>
                </select>
              </label>
              <label className="topbar-panel-field">
                <span>{t('units.label')}</span>
                <select
                  aria-label={t('units.label')}
                  value={project.settings.units}
                  onChange={(event) => updateProjectView((draft) => ({ ...draft, settings: { ...draft.settings, units: event.target.value as typeof draft.settings.units } }))}
                >
                  <option value="kN-m">kN · m</option>
                  <option value="N-mm">N · mm</option>
                  <option value="kgf-m">kgf · m</option>
                  <option value="kip-ft">kip · ft</option>
                </select>
              </label>
              {(project.settings.analysisMode ?? 'first-order') === 'p-delta' ? <PDeltaAdvancedConfig /> : null}
            </m.div> : null}
          </AnimatePresence>
        </div>
        <button
          type="button"
          className={`topbar-command-button results-launcher results-launcher--near-case${resultsOpen ? ' is-active' : ''}`}
          onClick={(event) => emitWorkspaceCommand('toggle-results', { trigger: event.currentTarget })}
          aria-label={t('results.outputs')}
          aria-pressed={resultsOpen}
          title={t('results.outputs')}
        >
          <ChartNoAxesColumnIncreasing size={17} aria-hidden="true" />
          <span>{t('results.outputs')}</span>
        </button>
        <div className="topbar-primary-actions" data-topbar-role="primary">
          <TopBarHistoryControls label={t('history.label')} undoCommand={undoCommand} redoCommand={redoCommand} />
          <IconButton
            variant="secondary"
            className="icon-button datasheet-launcher"
            label={datasheetCommand.label}
            title={datasheetCommand.hint}
            onClick={datasheetCommand.run}
          ><Sheet size={19} /></IconButton>
          {onOpenSpace3D ? <IconButton
            variant="secondary"
            className="icon-button space3d-open-button"
            label={t('space3d.open')}
            title={t('space3d.open')}
            onClick={onOpenSpace3D}
          ><Box size={19} /></IconButton> : null}
          <div className="export-wrap">
            <IconButton variant="secondary" ref={exportMenuButtonRef} className="icon-button topbar-export-trigger" label={t('export.label')} title={t('export.label')} aria-expanded={showExportMenu} aria-haspopup="menu" onClick={toggleExportMenu}><Download size={19} /></IconButton>
            <AnimatePresence>
              {showExportMenu ? (
                <m.div {...popoverMotionProps} className="popover export-menu" role="menu" aria-label={t('export.label')} onKeyDown={onMenuKeyDown}>
                  <button role="menuitem" onClick={() => { structuralBomCommand.run(); setShowExportMenu(false); }}><StructuralBomIcon size={16} aria-hidden="true" /> {structuralBomCommand.label}</button>
                <button role="menuitem" onClick={() => { exportJsonCommand.run(); setShowExportMenu(false); }}><Save size={16} /> {exportJsonCommand.label}</button>
                <button role="menuitem" onClick={() => void handleSaveToDisk()}><HardDriveDownload size={16} /> {t('export.saveToDisk')}</button>
                  <button role="menuitem" onClick={() => void handleCopyJson()}><Copy size={16} /> {t('export.copyData')}</button>
                  <button role="menuitem" onClick={() => void handleShare()}><Share2 size={16} /> {t('export.share')}</button>
                  <button role="menuitem" disabled={isAnalyzing || portableExport !== null} onClick={() => void openPdfPreview()}><Eye size={16} /> {pdfPreviewLabel}</button>
                  <button role="menuitem" disabled={isAnalyzing || portableExport !== null} onClick={() => void exportPortable()}><FileArchive size={16} /> {portableExportLabel()}</button>
                  <button role="menuitem" onClick={() => { exportSvgCommand.run(); setShowExportMenu(false); }}>{exportSvgCommand.label}</button>
                  <button role="menuitem" onClick={() => { exportPngCommand.run(); setShowExportMenu(false); }}>{exportPngCommand.label}</button>
                  <button role="menuitem" onClick={() => { exportPrintCommand.run(); setShowExportMenu(false); }}>{exportPrintCommand.label}</button>
                </m.div>
              ) : null}
            </AnimatePresence>
          </div>
          <div className="mobile-actions-wrap topbar-utilities-wrap" data-topbar-role="utilities">
            <IconButton variant="secondary" ref={mobileMenuButtonRef} className="icon-button mobile-more-button utility-more-button" label={t('topbar.utilities')} aria-expanded={showMobileMenu} aria-haspopup="dialog" onClick={toggleMobileMenu}><MoreHorizontal size={20} /></IconButton>
            <AnimatePresence>
              {showMobileMenu ? (
                <m.div {...popoverMotionProps} className="popover mobile-actions-menu topbar-utilities-panel" role="dialog" aria-label={t('topbar.utilities')}>
                  <button
                    className="topbar-utility-project-launcher"
                    onClick={() => {
                      setShowMobileMenu(false);
                      setShowProjectMenu(true);
                    }}
                  ><FolderOpen size={17} /> {t('topbar.currentProject')}</button>
                  <div className="mobile-history-actions overflow-history" role="group" aria-label={t('history.label')}>
                    <button onClick={undoCommand.run} disabled={undoCommand.disabled}><Undo2 size={17} /> {undoCommand.label}</button>
                    <button onClick={redoCommand.run} disabled={redoCommand.disabled}><Redo2 size={17} /> {redoCommand.label}</button>
                  </div>
                  <div className="menu-section">
                    <div className="menu-section-title">{t('menu.sectionAnalysis')}</div>
                    <button onClick={() => { mobileMenuButtonRef.current?.focus({ preventScroll: true }); setShowMobileMenu(false); modelDoctorCommand.run(); }}><Wrench size={17} /> {modelDoctorCommand.label}</button>
                    <button onClick={(event) => {
                      // El elemento del menú se desmonta al cerrar Utilidades. El
                      // Utilidades permanece montado mientras el menú se desmonta;
                      // Safari necesita ese disparador estable para devolver el
                      // foco al cerrar la hoja abierta desde este menú.
                      const trigger = mobileMenuButtonRef.current ?? event.currentTarget;
                      emitWorkspaceCommand('toggle-results', { trigger });
                      setShowMobileMenu(false);
                      window.requestAnimationFrame(() => trigger.focus({ preventScroll: true }));
                    }}><ChartNoAxesColumnIncreasing size={17} /> {t('results.outputs')}</button>
                    <button className="overflow-datasheet" onClick={() => { datasheetCommand.run(); setShowMobileMenu(false); }}><Sheet size={17} /> {datasheetCommand.label}</button>
                  </div>
                  <div className="menu-section topbar-workspace-section">
                    <div className="menu-section-title">{t('menu.sectionWorkspace')}</div>
                    <button onClick={() => { layoutActions?.onOpenAnalysisSetup(); setShowMobileMenu(false); }}><SlidersHorizontal size={17} /> {t('inspector.analysisSetupLauncher')}</button>
                    <button onClick={() => { layoutActions?.onOpenViewSettings(); setShowMobileMenu(false); }}><Layers3 size={17} /> {t('inspector.viewTab')}</button>
                    {layoutActions ? <div className="topbar-dock-preference" role="group" aria-label={t('toolbar.dockPosition')}>
                      <span>{t('toolbar.dockPosition')}</span>
                      <small>{t('toolbar.dockPositionDescription')}</small>
                      <div>
                        <button type="button" aria-pressed={layoutActions.toolDockPosition === 'bottom'} onClick={() => layoutActions.onToolDockPositionChange('bottom')}><PanelBottom size={16} /> {t('toolbar.dockBottom')}</button>
                        <button type="button" aria-pressed={layoutActions.toolDockPosition === 'left'} onClick={() => layoutActions.onToolDockPositionChange('left')}><PanelLeft size={16} /> {t('toolbar.dockLeft')}</button>
                      </div>
                    </div> : null}
                  </div>
                  <div className="menu-section">
                    <div className="menu-section-title">{t('menu.sectionPreferences')}</div>
                    <label className="mobile-menu-field"><span>{t('language.label')}</span><select value={language} onChange={(event) => updateProjectView((draft) => ({ ...draft, settings: { ...draft.settings, language: event.target.value as 'es' | 'en' } }))}><option value="es">{t('language.es')}</option><option value="en">{t('language.en')}</option></select></label>
                    <button onClick={() => { themeCommand.run(); setShowMobileMenu(false); }}><ThemeIcon size={17} /> {themeCommand.label}</button>
                  </div>
                  {layoutActions ? <div className="menu-section overflow-layout-actions" role="group" aria-label={t('shell.viewLayout')}>
                    <div className="menu-section-title">{t('menu.sectionViews')}</div>
                    <button onClick={() => { layoutActions.onToggleInspector(mobileMenuButtonRef.current); setShowMobileMenu(false); }}>
                      {layoutActions.inspectorCollapsed || layoutActions.fullCanvas ? <PanelRightOpen size={17} /> : <PanelRightClose size={17} />}
                      {layoutActions.inspectorCollapsed || layoutActions.fullCanvas ? t('shell.showInspector') : t('shell.hideInspector')}
                    </button>
                    <button onClick={() => { layoutActions.onToggleFullCanvas(); setShowMobileMenu(false); }}>
                      {layoutActions.fullCanvas ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
                      {layoutActions.fullCanvas ? t('shell.exitFullCanvas') : t('shell.fullCanvas')}
                    </button>
                  </div> : null}
                  <div className="menu-section">
                    <div className="menu-section-title">{t('menu.sectionExport')}</div>
                    <button onClick={() => { structuralBomCommand.run(); setShowMobileMenu(false); }}><StructuralBomIcon size={16} aria-hidden="true" /> {structuralBomCommand.label}</button>
                  <button onClick={() => { exportJsonCommand.run(); setShowMobileMenu(false); }}><Save size={16} /> {exportJsonCommand.label}</button>
                  <button onClick={() => void handleSaveToDisk()}><HardDriveDownload size={16} /> {t('export.saveToDisk')}</button>
                  <button onClick={() => void handleCopyJson()}><Copy size={16} /> {t('export.copyData')}</button>
                    <button onClick={() => void handleShare()}><Share2 size={16} /> {t('export.share')}</button>
                    <button disabled={isAnalyzing || portableExport !== null} onClick={() => void openPdfPreview()}><Eye size={16} /> {pdfPreviewLabel}</button>
                    <button disabled={isAnalyzing || portableExport !== null} onClick={() => void exportPortable()}><FileArchive size={16} /> {portableExportLabel()}</button>
                    <button onClick={() => { exportSvgCommand.run(); setShowMobileMenu(false); }}><Download size={16} /> {exportSvgCommand.label}</button>
                    <button onClick={() => { exportPngCommand.run(); setShowMobileMenu(false); }}><Download size={16} /> {exportPngCommand.label}</button>
                    <button onClick={() => { exportPrintCommand.run(); setShowMobileMenu(false); }}>{exportPrintCommand.label}</button>
                  </div>
                  <div className={`mobile-storage-state ${storageHasError || storageState === 'offline' ? 'error' : ''}`} data-storage-state={storageState}>{storageHasError || storageState === 'offline' ? <CloudOff size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}<span><strong>{storageLabel}</strong><small>{storageDescription}</small></span>{storageState === 'conflict' && onOpenHome ? <button type="button" onClick={() => { onOpenHome(); setShowMobileMenu(false); }}>{phase2T('storage.resolveConflict')}</button> : null}</div>
                  {exportError ? <div className="portable-export-error" role="alert">{exportError}</div> : null}
                </m.div>
              ) : null}
            </AnimatePresence>
          </div>
          <Button
            className={`analyze-button analyze-button--clay-primary${isAnalyzing ? ' analyzing' : ''}`}
            data-label-tone="on-brand"
            variant="primary"
            size="touch"
            onClick={analyzeCommand.run}
            loading={isAnalyzing}
            loadingLabel={t('analysis.runningLabel')}
            leadingIcon={<Play size={17} fill="currentColor" />}
            aria-label={isAnalyzing ? t('analysis.runningLabel') : analyzeCommand.label}
          >{isAnalyzing ? t('analysis.running') : analyzeCommand.label}</Button>
        </div>
      </div>

      <div className="topbar-zone topbar-status-zone topbar-health-zone" data-topbar-zone="status" data-topbar-role="health">
        <button
          type="button"
          className="topbar-command-button model-doctor-launcher"
          onClick={modelDoctorCommand.run}
          aria-label={modelDoctorCommand.label}
          title={t('modelDoctor.description')}
        >
          <Wrench size={17} aria-hidden="true" />
          <span>{modelDoctorCommand.label}</span>
        </button>
        <AnalysisStatus
          projectId={project.id}
          analysis={analysis}
          isAnalyzing={isAnalyzing}
          onOpenModelDoctor={openModelDoctor}
        />
        <div
          className={`autosave-state${storageHasError || storageState === 'offline' ? ' has-issue' : ''} topbar-persistence`}
          data-storage-state={storageState}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {storageHasError || storageState === 'offline' ? <CloudOff size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
          <span className="autosave-state__label">{storageLabel}</span>
          <span className="sr-only">{storageDescription}</span>
        </div>
        {storageState === 'conflict' && onOpenHome ? <button type="button" className="topbar-conflict-resolver" onClick={onOpenHome}>{phase2T('storage.resolveConflict')}</button> : null}
      </div>
      {exportError && showExportMenu ? <div className="portable-export-error desktop" role="alert">{exportError}</div> : null}
      {importCenterOpen ? <Suspense fallback={null}><PortableImportCenter
        open
        currentProjectName={project.name}
        onClose={closeImportCenter}
        onSaveCurrent={() => exportProjectJson(project)}
        onImported={(outcome) => {
          replaceProject({ ...outcome.project, settings: { ...outcome.project.settings, language } }, outcome.restoredAnalysis);
          closeImportCenter();
        }}
      /></Suspense> : null}
      {localAssistantOpen ? <Suspense fallback={null}><LocalCommandAssistant open onClose={() => {
        setLocalAssistantOpen(false);
        window.requestAnimationFrame(() => localAssistantButtonRef.current?.focus());
      }} /></Suspense> : null}
      {pdfPreview ? <Suspense fallback={null}><PdfPreviewDialog artifact={pdfPreview} onClose={() => setPdfPreview(null)} onDownload={downloadPdfPreview} onRebuild={buildPdfPreviewArtifact} /></Suspense> : null}
    </header>
  );
};
