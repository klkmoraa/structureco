import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  ChevronDown,
  CloudOff,
  Download,
  FileArchive,
  FileText,
  FilePlus2,
  FolderOpen,
  LoaderCircle,
  Moon,
  MoreHorizontal,
  Play,
  Redo2,
  Save,
  Sun,
  Undo2,
} from 'lucide-react';
import { createBlankProject, exampleProjects } from '../data/defaultProject';
import { useI18n } from '../i18n/useI18n';
import { useProject } from '../store/ProjectContext';
import { exportProjectJson } from '../utils/export';
import { BrandMark } from './BrandMark';

const PortableImportCenter = lazy(() => import('./PortableImportCenter').then((module) => ({ default: module.PortableImportCenter })));

export const TopBar = ({ onOpenHome }: { onOpenHome?: () => void }) => {
  const {
    project,
    analysis,
    theme,
    canUndo,
    canRedo,
    selectedCombinationId,
    isAnalyzing,
    storageIssue,
    storageMessage,
    renameProject,
    updateProjectView,
    replaceProject,
    setTheme,
    undo,
    redo,
    analyze,
    setSelectedCombinationId,
  } = useProject();
  const { language, t } = useI18n();
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [importCenterOpen, setImportCenterOpen] = useState(false);
  const [portableExport, setPortableExport] = useState<'pdf' | 'bundle' | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [projectNameDraft, setProjectNameDraft] = useState(project.name);
  const topbarRef = useRef<HTMLElement>(null);
  const projectNameRef = useRef<HTMLInputElement>(null);
  const projectMenuButtonRef = useRef<HTMLButtonElement>(null);
  const exportMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const menuOpen = showProjectMenu || showExportMenu || showMobileMenu;

  const closeMenus = () => {
    setShowProjectMenu(false);
    setShowExportMenu(false);
    setShowMobileMenu(false);
  };

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target?.closest('.project-menu, .project-menu-toggle, .export-wrap, .mobile-actions-wrap')) closeMenus();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const trigger = showProjectMenu ? projectMenuButtonRef.current : showExportMenu ? exportMenuButtonRef.current : mobileMenuButtonRef.current;
      closeMenus();
      window.requestAnimationFrame(() => trigger?.focus());
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen, showExportMenu, showMobileMenu, showProjectMenu]);

  useEffect(() => {
    const selector = showProjectMenu ? '.project-menu button:not(:disabled)' : showExportMenu ? '.export-menu button:not(:disabled)' : showMobileMenu ? '.mobile-actions-menu button:not(:disabled)' : null;
    if (!selector) return undefined;
    const handle = window.requestAnimationFrame(() => topbarRef.current?.querySelector<HTMLButtonElement>(selector)?.focus());
    return () => window.cancelAnimationFrame(handle);
  }, [showExportMenu, showMobileMenu, showProjectMenu]);

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
    setShowProjectMenu((open) => !open);
    setShowExportMenu(false);
    setShowMobileMenu(false);
  };
  const toggleExportMenu = () => {
    setShowExportMenu((open) => !open);
    setShowProjectMenu(false);
    setShowMobileMenu(false);
  };
  const toggleMobileMenu = () => {
    setShowMobileMenu((open) => !open);
    setShowProjectMenu(false);
    setShowExportMenu(false);
  };

  useLayoutEffect(() => setProjectNameDraft(project.name), [project.id, project.name]);

  const commitProjectName = () => {
    const next = projectNameDraft.trim() || project.name;
    setProjectNameDraft(next);
    renameProject(next);
  };
  const selectedCombination = project.combinations.find((item) => item.id === selectedCombinationId);
  const scenarioName = selectedCombination?.name
    ?? (project.loadCases.filter((item) => item.active).map((item) => item.name).join(' + ') || 'Casos activos');
  const scenarioFactors = selectedCombination?.factors ?? Object.fromEntries(
    project.loadCases.filter((loadCase) => loadCase.active).map((loadCase) => [loadCase.id, 1]),
  );
  const portableExportLabel = (kind: 'pdf' | 'bundle'): string => {
    if (portableExport !== kind) return kind === 'pdf' ? 'PDF completo reimportable' : 'Expediente .structureco';
    if (!analysis) return kind === 'pdf' ? 'Analizando y generando PDF…' : 'Analizando y preparando paquete…';
    return kind === 'pdf' ? 'Generando PDF…' : 'Preparando paquete…';
  };

  const exportPortable = async (kind: 'pdf' | 'bundle') => {
    setPortableExport(kind);
    setExportError(null);
    try {
      let exportAnalysis = analysis;
      if (!exportAnalysis) {
        const { analyzeProject } = await import('../engine/solver');
        exportAnalysis = analyzeProject(project, selectedCombination ?? null);
      }
      const portable = await import('../utils/portable');
      const options = { appVersion: '0.7.0', scenarioName, scenarioFactors, includeEducationTrace: true };
      if (kind === 'pdf') {
        const report = await portable.createCalculationReport(project, exportAnalysis, options);
        await portable.shareOrDownloadPortableBytes(report.bytes, report.filename, 'application/pdf', `${project.name} - memoria de cálculo`);
      } else {
        const bundle = await portable.createPortableBundle(project, exportAnalysis, options);
        await portable.shareOrDownloadPortableBytes(bundle.bytes, bundle.filename, portable.STRUCTURECO_BUNDLE_MIME, `${project.name} - expediente structureCo`);
      }
      setShowExportMenu(false);
      setShowMobileMenu(false);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'No se pudo generar el expediente.');
    } finally {
      setPortableExport(null);
    }
  };

  return (
    <header ref={topbarRef} className="topbar">
      <div className="brand-block">
        <button className="brand-mark brand-home-button" type="button" aria-label="Ir al inicio" onClick={onOpenHome}>
          <BrandMark size={34} />
        </button>
        <div className="top-divider" />
        <div className="project-name">
          <span className="brand-name">structureCo</span>
          <span className="project-separator">/</span>
          <input
            ref={projectNameRef}
            aria-label={t('project.name')}
            value={projectNameDraft}
            onChange={(event) => setProjectNameDraft(event.target.value)}
            onBlur={commitProjectName}
            onKeyDown={(event) => {
              if (event.key === 'Enter') projectNameRef.current?.blur();
              if (event.key === 'Escape') {
                setProjectNameDraft(project.name);
                projectNameRef.current?.blur();
              }
            }}
          />
          <button
            ref={projectMenuButtonRef}
            className="project-menu-toggle"
            type="button"
            aria-label={t('project.openExamples')}
            aria-expanded={showProjectMenu}
            aria-haspopup="menu"
            onClick={toggleProjectMenu}
          >
            <ChevronDown size={15} />
          </button>
        </div>
        {showProjectMenu ? (
          <div className="popover project-menu" role="menu" aria-label={t('project.openExamples')} onKeyDown={onMenuKeyDown}>
            <button role="menuitem" onClick={() => { replaceProject(createBlankProject()); setShowProjectMenu(false); }}>
              <FilePlus2 size={17} /> {t('project.new')}
            </button>
            {exampleProjects.map((example) => (
              <button role="menuitem" key={example.name} onClick={() => { replaceProject(example.build()); setShowProjectMenu(false); }}>
                <span className="menu-copy"><strong>{example.name}</strong><small>{example.description}</small></span>
              </button>
            ))}
            <button role="menuitem" onClick={() => { setImportCenterOpen(true); setShowProjectMenu(false); }}><FolderOpen size={17} /> {t('project.importJson')}</button>
          </div>
        ) : null}
      </div>

      <div className="history-controls" aria-label={t('history.label')}>
        <button className="icon-button" onClick={undo} disabled={!canUndo} title={t('history.undo')}><Undo2 size={19} /></button>
        <button className="icon-button" onClick={redo} disabled={!canRedo} title={t('history.redo')}><Redo2 size={19} /></button>
        <span
          className="autosave-state"
          role="status"
          aria-live="polite"
          title={storageIssue ? (storageMessage ?? t(storageIssue === 'recovered' ? 'storage.recovered' : 'storage.failed')) : t('storage.local')}
        ><CloudOff size={14} /> {storageIssue ? '⚠' : t('storage.local')}</span>
      </div>

      <div className="top-actions">
        <select
          className="compact-select combination-select"
          aria-label={t('analysis.caseOrCombination')}
          value={selectedCombinationId}
          onChange={(event) => setSelectedCombinationId(event.target.value)}
        >
          <option value="">{t('analysis.activeCases')}</option>
          {project.combinations.map((combination) => <option key={combination.id} value={combination.id}>{combination.name}</option>)}
        </select>
        <select
          className="compact-select mode-select"
          aria-label={t('analysis.mode')}
          value={project.settings.calculationMode ?? 'complete'}
          onChange={(event) => updateProjectView((draft) => ({ ...draft, settings: { ...draft.settings, calculationMode: event.target.value as 'complete' | 'classroom' } }))}
        >
          <option value="classroom">{t('analysis.modeClassroom')}</option>
          <option value="complete">{t('analysis.modeComplete')}</option>
        </select>
        <select
          className="compact-select"
          aria-label={t('units.label')}
          value={project.settings.units}
          onChange={(event) => updateProjectView((draft) => ({
            ...draft,
            settings: { ...draft.settings, units: event.target.value as typeof draft.settings.units },
          }))}
        >
          <option value="kN-m">kN · m</option>
          <option value="N-mm">N · mm</option>
          <option value="kgf-m">kgf · m</option>
          <option value="kip-ft">kip · ft</option>
        </select>
        <select
          className="compact-select language-select"
          aria-label={t('language.label')}
          value={language}
          onChange={(event) => updateProjectView((draft) => ({
            ...draft,
            settings: { ...draft.settings, language: event.target.value as 'es' | 'en' },
          }))}
        >
          <option value="es">ES</option>
          <option value="en">EN</option>
        </select>
        <button className="theme-switch" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label={t('theme.change')}>
          <Sun size={16} />
          <span className={theme === 'dark' ? 'switch-track active' : 'switch-track'}><span /></span>
          <Moon size={16} />
        </button>
        <div className="export-wrap">
          <button ref={exportMenuButtonRef} className="icon-button" title={t('export.label')} aria-label={t('export.label')} aria-expanded={showExportMenu} aria-haspopup="menu" onClick={toggleExportMenu}><Download size={19} /></button>
          {showExportMenu ? (
            <div className="popover export-menu" role="menu" aria-label={t('export.label')} onKeyDown={onMenuKeyDown}>
              <button role="menuitem" onClick={() => { exportProjectJson(project); setShowExportMenu(false); }}><Save size={16} /> {t('export.projectJson')}</button>
              <button role="menuitem" disabled={isAnalyzing || portableExport !== null} onClick={() => void exportPortable('pdf')}><FileText size={16} /> {portableExportLabel('pdf')}</button>
              <button role="menuitem" disabled={isAnalyzing || portableExport !== null} onClick={() => void exportPortable('bundle')}><FileArchive size={16} /> {portableExportLabel('bundle')}</button>
              <button role="menuitem" onClick={() => { window.dispatchEvent(new CustomEvent('structureco:export-svg')); setShowExportMenu(false); }}>{t('export.imageSvg')}</button>
              <button role="menuitem" onClick={() => { window.dispatchEvent(new CustomEvent('structureco:export-png')); setShowExportMenu(false); }}>{t('export.imagePng')}</button>
              <button role="menuitem" onClick={() => { window.print(); setShowExportMenu(false); }}>{t('export.print')}</button>
            </div>
          ) : null}
        </div>
        <div className="mobile-actions-wrap">
          <button ref={mobileMenuButtonRef} className="icon-button mobile-more-button" aria-label={t('actions.more')} aria-expanded={showMobileMenu} aria-haspopup="dialog" onClick={toggleMobileMenu}><MoreHorizontal size={20} /></button>
          {showMobileMenu ? (
            <div className="popover mobile-actions-menu" role="dialog" aria-label={t('actions.more')}>
              <div className="mobile-history-actions" role="group" aria-label={t('history.label')}>
                <button onClick={undo} disabled={!canUndo}><Undo2 size={17} /> {t('history.undo')}</button>
                <button onClick={redo} disabled={!canRedo}><Redo2 size={17} /> {t('history.redo')}</button>
              </div>
              <label className="mobile-menu-field"><span>{t('analysis.caseOrCombination')}</span><select value={selectedCombinationId} onChange={(event) => setSelectedCombinationId(event.target.value)}><option value="">{t('analysis.activeCases')}</option>{project.combinations.map((combination) => <option key={combination.id} value={combination.id}>{combination.name}</option>)}</select></label>
              <label className="mobile-menu-field"><span>{t('analysis.mode')}</span><select value={project.settings.calculationMode ?? 'complete'} onChange={(event) => updateProjectView((draft) => ({ ...draft, settings: { ...draft.settings, calculationMode: event.target.value as 'complete' | 'classroom' } }))}><option value="classroom">{t('analysis.modeClassroom')}</option><option value="complete">{t('analysis.modeComplete')}</option></select></label>
              <label className="mobile-menu-field"><span>{t('units.label')}</span><select value={project.settings.units} onChange={(event) => updateProjectView((draft) => ({ ...draft, settings: { ...draft.settings, units: event.target.value as typeof draft.settings.units } }))}><option value="kN-m">kN · m</option><option value="N-mm">N · mm</option><option value="kgf-m">kgf · m</option><option value="kip-ft">kip · ft</option></select></label>
              <label className="mobile-menu-field"><span>{t('language.label')}</span><select value={language} onChange={(event) => updateProjectView((draft) => ({ ...draft, settings: { ...draft.settings, language: event.target.value as 'es' | 'en' } }))}><option value="es">{t('language.es')}</option><option value="en">{t('language.en')}</option></select></label>
              <button onClick={() => { setTheme(theme === 'light' ? 'dark' : 'light'); setShowMobileMenu(false); }}>{theme === 'light' ? <Moon size={17} /> : <Sun size={17} />} {theme === 'light' ? t('theme.dark') : t('theme.light')}</button>
              <button onClick={() => { exportProjectJson(project); setShowMobileMenu(false); }}><Save size={16} /> {t('export.json')}</button>
              <button disabled={isAnalyzing || portableExport !== null} onClick={() => void exportPortable('pdf')}><FileText size={16} /> {portableExportLabel('pdf')}</button>
              <button disabled={isAnalyzing || portableExport !== null} onClick={() => void exportPortable('bundle')}><FileArchive size={16} /> {portableExportLabel('bundle')}</button>
              <button onClick={() => { window.dispatchEvent(new CustomEvent('structureco:export-svg')); setShowMobileMenu(false); }}><Download size={16} /> {t('export.svg')}</button>
              <button onClick={() => { window.dispatchEvent(new CustomEvent('structureco:export-png')); setShowMobileMenu(false); }}><Download size={16} /> {t('export.png')}</button>
              <button onClick={() => { window.print(); setShowMobileMenu(false); }}>{t('export.print')}</button>
              <div className={`mobile-storage-state ${storageIssue ? 'error' : ''}`} role="status"><CloudOff size={14} /><span>{storageIssue ? (storageMessage ?? t('storage.failed')) : t('storage.local')}</span></div>
              {exportError ? <div className="portable-export-error" role="alert">{exportError}</div> : null}
            </div>
          ) : null}
        </div>
        <button className={`analyze-button${isAnalyzing ? ' analyzing' : ''}`} onClick={analyze} disabled={isAnalyzing} aria-busy={isAnalyzing} aria-label={isAnalyzing ? t('analysis.runningLabel') : t('analysis.run')}>
          {isAnalyzing ? <LoaderCircle className="spin" size={17} /> : <Play size={17} fill="currentColor" />} <span>{isAnalyzing ? t('analysis.running') : t('analysis.run')}</span>
        </button>
      </div>
      {exportError && showExportMenu ? <div className="portable-export-error desktop" role="alert">{exportError}</div> : null}
      {importCenterOpen ? <Suspense fallback={null}><PortableImportCenter
        open
        currentProjectName={project.name}
        onClose={() => setImportCenterOpen(false)}
        onSaveCurrent={() => exportProjectJson(project)}
        onImported={(outcome) => {
          replaceProject(outcome.project, outcome.restoredAnalysis);
          setImportCenterOpen(false);
        }}
      /></Suspense> : null}
    </header>
  );
};
