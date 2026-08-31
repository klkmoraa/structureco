import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  FilePlus2,
  FolderOpen,
  Layers3,
  LoaderCircle,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  Play,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { createBlankProject, exampleProjects } from '../../data/defaultProject';
import { useI18n } from '../../i18n/useI18n';
import { useProjectAnalysis } from '../../store/ProjectAnalysisContext';
import { useProjectModel } from '../../store/ProjectModelContext';
import { useWorkspaceUI } from '../../store/WorkspaceUIContext';
import { useClassroomSession } from '../../store/ClassroomSessionContext';
import { ToolRail } from '../canvas/ToolRail';
import { presentExample } from '../welcome/examplePresentation';
import { BrandMark } from '../topbar/BrandMark';
import { emitWorkspaceCommand } from './workspaceCommands';
import { resolveTopBarCommand, type TopBarCommandContext } from './commandRegistry';
import { exportProjectJson } from '../../utils/export';
import './console.css';

const PortableImportCenter = lazy(() => import('../import-export/PortableImportCenter').then((module) => ({ default: module.PortableImportCenter })));

export interface ConsoleLayoutActions {
  inspectorCollapsed: boolean;
  fullCanvas: boolean;
  onToggleInspector: (trigger?: HTMLElement | null) => void;
  onToggleFullCanvas: () => void;
  onOpenAnalysisSetup: () => void;
  onOpenViewSettings: () => void;
}

export interface ConsoleProps {
  onOpenHome?: () => void;
  onOpenSpace3D?: () => void;
  layoutActions?: ConsoleLayoutActions;
  resultsOpen?: boolean;
}

/**
 * The workspace's one permanent chrome surface. Labels are deliberately in
 * the DOM for accessibility, but the collapsed rail shows them only on hover
 * or keyboard focus so the canvas keeps the visual priority.
 */
export const Console = ({ onOpenHome, onOpenSpace3D, layoutActions, resultsOpen = false }: ConsoleProps) => {
  const { project, canUndo, canRedo, renameProject, replaceProject, updateProjectView, undo, redo } = useProjectModel();
  const { isAnalyzing, analyze } = useProjectAnalysis();
  const { theme, setTheme } = useWorkspaceUI();
  const classroomSession = useClassroomSession();
  const { language, t } = useI18n();
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [importCenterOpen, setImportCenterOpen] = useState(false);
  const [projectNameDraft, setProjectNameDraft] = useState(project.name);
  const projectButtonRef = useRef<HTMLButtonElement>(null);
  const projectNameRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => setProjectNameDraft(project.name), [project.id, project.name]);

  useEffect(() => {
    if (!projectMenuOpen) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target?.closest('.console-project-menu, .console-project-trigger')) setProjectMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setProjectMenuOpen(false);
      window.requestAnimationFrame(() => projectButtonRef.current?.focus());
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    const handle = window.requestAnimationFrame(() => projectNameRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(handle);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [projectMenuOpen]);

  const requestAnalysis = useCallback(() => {
    if (project.settings.calculationMode === 'classroom') classroomSession.markAnalysisRequested();
    analyze();
  }, [analyze, classroomSession, project.settings.calculationMode]);

  const commandContext: TopBarCommandContext = {
    t,
    project,
    isAnalyzing,
    canUndo,
    canRedo,
    theme,
    setTheme,
    analyze: requestAnalysis,
    undo,
    redo,
  };
  const analyzeCommand = resolveTopBarCommand('analysis:run', commandContext);
  const themeCommand = resolveTopBarCommand('view:theme', commandContext);
  const ThemeIcon = themeCommand.icon;

  const commitProjectName = () => {
    const next = projectNameDraft.trim() || project.name;
    setProjectNameDraft(next);
    renameProject(next);
  };
  const createProject = () => {
    const next = createBlankProject();
    replaceProject({ ...next, settings: { ...next.settings, language } });
    setProjectMenuOpen(false);
  };
  const closeImportCenter = () => {
    setImportCenterOpen(false);
    window.requestAnimationFrame(() => projectButtonRef.current?.focus());
  };
  const openResults = (event: React.MouseEvent<HTMLButtonElement>) => {
    emitWorkspaceCommand('toggle-results', { trigger: event.currentTarget });
  };

  return <aside
    className={`workspace-console console${projectMenuOpen ? ' is-project-open' : ''}`}
    aria-label={t('toolbar.primary')}
    data-console="true"
  >
    <div className="console-head" data-topbar-zone="document" data-topbar-role="project">
      <button className="brand-mark brand-home-button console-home-button" type="button" aria-label={t('navigation.home')} onClick={onOpenHome}>
        <BrandMark size={28} />
      </button>
      <div className="console-project-menu">
        <button
          ref={projectButtonRef}
          className="console-project-trigger topbar-project-trigger"
          type="button"
          aria-label={t('topbar.currentProject')}
          aria-expanded={projectMenuOpen}
          aria-haspopup="dialog"
          onClick={() => setProjectMenuOpen((open) => !open)}
        >
          <strong title={project.name}>{project.name}</strong>
          <ChevronDown size={14} aria-hidden="true" />
        </button>
        {projectMenuOpen ? <div className="console-project-popover" role="dialog" aria-label={t('topbar.currentProject')}>
          <div className="console-popover-heading">
            <span>{t('topbar.projectHubEyebrow')}</span>
            <strong>{t('topbar.projectHubTitle')}</strong>
          </div>
          <label className="console-project-name-field">
            <span>{t('project.name')}</span>
            <input aria-label={t('project.name')} ref={projectNameRef} value={projectNameDraft} onChange={(event) => setProjectNameDraft(event.target.value)} onBlur={commitProjectName} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); commitProjectName(); } }} />
          </label>
          <label className="console-project-language-field">
            <span>{t('language.label')}</span>
            <select aria-label={t('language.label')} value={language} onChange={(event) => updateProjectView((draft) => ({ ...draft, settings: { ...draft.settings, language: event.target.value as 'es' | 'en' } }))}>
              <option value="es">{t('language.es')}</option>
              <option value="en">{t('language.en')}</option>
            </select>
          </label>
          <div className="console-project-actions">
            <button type="button" onClick={createProject}><FilePlus2 size={16} />{t('project.new')}</button>
            <button type="button" onClick={() => { setImportCenterOpen(true); setProjectMenuOpen(false); }}><FolderOpen size={16} />{t('project.importJson')}</button>
            {onOpenSpace3D ? <button type="button" onClick={() => { onOpenSpace3D(); setProjectMenuOpen(false); }}><Layers3 size={16} />{t('space3d.open')}</button> : null}
          </div>
          <button type="button" className="console-examples-toggle" aria-expanded={examplesOpen} onClick={() => setExamplesOpen((open) => !open)}>
            <span>{t('topbar.projectExamples')}</span><ChevronDown size={14} aria-hidden="true" />
          </button>
          {examplesOpen ? <div className="console-examples-list">
            {exampleProjects.map((example) => {
              const copy = presentExample(example.name, example.description, t);
              return <button type="button" key={example.name} onClick={() => { const next = example.build(); replaceProject({ ...next, settings: { ...next.settings, language } }); setProjectMenuOpen(false); setExamplesOpen(false); }}>
                <strong>{copy.name}</strong><small>{copy.description}</small>
              </button>;
            })}
          </div> : null}
        </div> : null}
      </div>
      <button className="console-palette-button" type="button" aria-label={t('palette.open')} onClick={() => emitWorkspaceCommand('open-command-palette')}>
        <Search size={18} aria-hidden="true" /><kbd>⌘K</kbd>
      </button>
    </div>

    <div className="console-body">
      <div className="console-surface-actions" role="group" aria-label={t('shell.viewLayout')}>
        {layoutActions ? <>
          <button type="button" className="console-action" onClick={layoutActions.onOpenAnalysisSetup} aria-label={t('inspector.analysisSetupLauncher')}>
            <SlidersHorizontal size={17} aria-hidden="true" /><span>{t('inspector.analysisSetupLauncher')}</span>
          </button>
          <button type="button" className="console-action" onClick={layoutActions.onOpenViewSettings} aria-label={t('inspector.viewTab')}>
            <Layers3 size={17} aria-hidden="true" /><span>{t('inspector.viewTab')}</span>
          </button>
        </> : null}
        <button type="button" className={`console-action results-launcher${resultsOpen ? ' is-active' : ''}`} onClick={openResults} aria-label={t('results.outputs')} aria-pressed={resultsOpen}>
          <Layers3 size={17} aria-hidden="true" /><span>{t('results.outputs')}</span>
        </button>
      </div>
      <div className="console-tools"><ToolRail hideDesktopCommandPalette /></div>
    </div>

    <div className="console-foot" data-console-zone="actions">
      {layoutActions ? <button
        type="button"
        className="console-action console-inspector-action"
        aria-label={layoutActions.inspectorCollapsed || layoutActions.fullCanvas ? t('shell.showInspector') : t('shell.hideInspector')}
        onClick={(event) => layoutActions.onToggleInspector(event.currentTarget)}
      >
        {layoutActions.inspectorCollapsed || layoutActions.fullCanvas ? <PanelRightOpen size={17} aria-hidden="true" /> : <PanelRightClose size={17} aria-hidden="true" />}
        <span>{layoutActions.inspectorCollapsed || layoutActions.fullCanvas ? t('shell.showInspector') : t('shell.hideInspector')}</span>
      </button> : null}
      <button
        className={`console-analyze-button${isAnalyzing ? ' is-loading' : ''}`}
        type="button"
        disabled={analyzeCommand.disabled}
        aria-label={isAnalyzing ? t('analysis.runningLabel') : analyzeCommand.label}
        onClick={analyzeCommand.run}
      >
        {isAnalyzing ? <LoaderCircle className="spin" size={17} aria-hidden="true" /> : <Play size={17} fill="currentColor" aria-hidden="true" />}
        <span>{isAnalyzing ? t('analysis.running') : analyzeCommand.label}</span>
      </button>
      <button className="console-theme-button" type="button" aria-label={themeCommand.label} onClick={themeCommand.run}>
        <ThemeIcon size={17} aria-hidden="true" /><span>{themeCommand.label}</span>
      </button>
      {layoutActions?.fullCanvas ? <button type="button" className="console-full-canvas-state" aria-label={t('shell.exitFullCanvas')} onClick={layoutActions.onToggleFullCanvas}><Minimize2 size={15} aria-hidden="true" /><span>{t('shell.exitFullCanvas')}</span></button> : null}
      {!layoutActions?.fullCanvas && layoutActions ? <button type="button" className="console-full-canvas-state" aria-label={t('shell.fullCanvas')} onClick={layoutActions.onToggleFullCanvas}><Maximize2 size={15} aria-hidden="true" /><span>{t('shell.fullCanvas')}</span></button> : null}
    </div>

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
  </aside>;
};

export default Console;
