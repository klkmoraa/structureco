import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Box, Folder, GraduationCap, Home, Image as ImageIcon, LayoutTemplate, LibraryBig, Menu, Moon, Play, Settings, Sun, Upload, X } from 'lucide-react';
import { m, useReducedMotion } from 'motion/react';
import { createBlankProject, exampleProjects } from '../../data/defaultProject';
import { useProject, useWorkspaceUI } from '../../store/ProjectContext';
import { exportProjectJson } from '../../utils/export';
import { useI18n } from '../../i18n/useI18n';
import type { TranslationKey } from '../../i18n/catalogs';
import { NewExerciseDialog } from './NewExerciseDialog';
import { BrandMark } from '../topbar/BrandMark';
import { presentExample } from './examplePresentation';
import { shouldResumeDirectly, useWelcomeEntry } from './welcomeEntry';
import { STRUCTURAL_ASSET_IDS, ThreeStructuralImage } from '../structural-assets';
import type { PortalAssetId } from '../structural-assets/threePortalAssets';
import type { ThreeStructuralAssetId } from '../structural-assets/threeStructuralRender';
import { resolveSessionHeroId } from './homeSession';
import { IllustrationStudio } from '../structural-assets/studio/IllustrationStudio';
import type { ClassroomExerciseTemplateId } from '../../education/exerciseTemplates';
import { PersonalLibraryView } from '../library/PersonalLibraryView';
import { readCanvasViewSettings } from '../view/canvasViewSettings';
import { useModalFocus } from '../../design-system/components/modalFocus';
import { clearLocalMetrics, exportLocalMetrics, getLocalMetrics, setLocalMetricsOptIn, type LocalMetricsStore } from '../../analytics/localMetrics';
import './totalHome.css';

const PortableImportCenter = lazy(() => import('../import-export/PortableImportCenter').then((module) => ({ default: module.PortableImportCenter })));
const Phase2ProjectHub = lazy(() => import('./Phase2ProjectHub').then((module) => ({ default: module.Phase2ProjectHub })));
const Phase2DxfAction = lazy(() => import('./Phase2DxfAction').then((module) => ({ default: module.Phase2DxfAction })));

interface WelcomeScreenProps {
  onOpenWorkspace: () => void;
  onOpenSpace3D?: () => void;
  onPreloadWorkspace?: () => void;
  allowDirectResume?: boolean;
  onDirectResume?: () => void;
  initialView?: HomeView;
}

export type HomeView = 'home' | 'projects' | 'templates' | 'library' | 'classroom' | 'import' | 'space3d';
type NavigationDestination = HomeView | 'studio';

const copy = {
  es: {
    navigation: 'Navegación principal', home: 'Inicio', projects: 'Proyectos', templates: 'Plantillas', library: 'Biblioteca', classroom: 'Aula', import: 'Importar', space3d: 'Space 3D',
    settings: 'Ajustes', settingsTitle: 'Ajustes', settingsBody: 'Personaliza cómo se presenta StructureCo en este dispositivo.', language: 'Idioma', theme: 'Tema', light: 'Claro', dark: 'Oscuro', closeSettings: 'Cerrar ajustes', studio: 'Estudio de ilustraciones', menu: 'Abrir navegación', closeMenu: 'Cerrar navegación', current: 'Proyecto abierto', continue: 'Continuar proyecto', create: 'Nuevo proyecto', localMetrics: 'Diagnóstico local', localMetricsBody: 'Opcional. Guarda sólo eventos agregados en este dispositivo; nunca envía geometría, cargas, resultados ni datos personales.', localMetricsOptIn: 'Guardar mediciones locales para mejorar el flujo', localMetricsCount: '{count} observaciones locales', exportDiagnostics: 'Exportar diagnóstico', clearDiagnostics: 'Borrar observaciones',
    recent: 'Proyectos recientes', viewAll: 'Ver todos', templatesTitle: 'Elige una estructura de partida', templatesBody: 'Abre un modelo preparado y adáptalo a tu caso.',
    projectsTitle: 'Tus proyectos', projectsBody: 'Abre, renombra o duplica el trabajo guardado en este dispositivo.',
    classroomTitle: 'Aprende resolviendo una estructura', classroomBody: 'Elige un caso, ajusta sus datos y avanza con una guía que no te quita el control del modelo.', classroomAction: 'Crear desde cero', classroomCases: 'O empieza con un caso preparado',
    importTitle: 'Trae un modelo', importBody: 'Revisa el archivo antes de modificar el proyecto abierto.',
    spaceTitle: 'Construye en tres dimensiones', spaceBody: 'Trabaja con pórticos espaciales, niveles y cargas en un entorno separado de tu modelo 2D.', spaceAction: 'Abrir Space 3D', spaceExperimental: 'Experimental', spaceNotice: 'Este acceso abre un modelo espacial independiente. Antes de entrar verás qué se mantiene separado y cómo volver al editor 2D.', spaceContinue2D: 'Continuar en editor 2D',
    spacePreview: 'Pórtico espacial de varios vanos', spaceCoordinates: 'Ejes X, Y y Z', spaceModel: 'Geometría espacial', spaceLoads: 'Cargas y apoyos 3D',
    secondary: 'Accesos rápidos', local: 'Guardado local en este dispositivo',
  },
  en: {
    navigation: 'Primary navigation', home: 'Home', projects: 'Projects', templates: 'Templates', library: 'Library', classroom: 'Classroom', import: 'Import', space3d: 'Space 3D',
    settings: 'Settings', settingsTitle: 'Settings', settingsBody: 'Personalize how StructureCo is presented on this device.', language: 'Language', theme: 'Theme', light: 'Light', dark: 'Dark', closeSettings: 'Close settings', studio: 'Illustration Studio', menu: 'Open navigation', closeMenu: 'Close navigation', current: 'Open project', continue: 'Continue project', create: 'New project', localMetrics: 'Local diagnostics', localMetricsBody: 'Optional. Stores aggregate events on this device only; it never sends geometry, loads, results, or personal data.', localMetricsOptIn: 'Store local measurements to improve the flow', localMetricsCount: '{count} local observations', exportDiagnostics: 'Export diagnostics', clearDiagnostics: 'Erase observations',
    recent: 'Recent projects', viewAll: 'View all', templatesTitle: 'Choose a starting structure', templatesBody: 'Open a prepared model and adapt it to your case.',
    projectsTitle: 'Your projects', projectsBody: 'Open, rename, or duplicate work saved on this device.',
    classroomTitle: 'Learn by solving a structure', classroomBody: 'Choose a case, adjust its data, and move forward with guidance that keeps you in control of the model.', classroomAction: 'Start from scratch', classroomCases: 'Or begin with a prepared case',
    importTitle: 'Bring in a model', importBody: 'Review the file before changing the open project.',
    spaceTitle: 'Build in three dimensions', spaceBody: 'Work with spatial frames, levels, and loads in an environment separate from your 2D model.', spaceAction: 'Open Space 3D', spaceExperimental: 'Experimental', spaceNotice: 'This entry opens an independent spatial model. Before entering, you will see what remains separate and how to return to the 2D editor.', spaceContinue2D: 'Continue in 2D editor',
    spacePreview: 'Multi-bay spatial frame', spaceCoordinates: 'X, Y, and Z axes', spaceModel: 'Spatial geometry', spaceLoads: '3D loads and supports',
    secondary: 'Quick access', local: 'Saved locally on this device',
  },
} as const;

const NAV_ITEMS: ReadonlyArray<{ id: NavigationDestination; icon: typeof Home }> = [
  { id: 'home', icon: Home }, { id: 'projects', icon: Folder }, { id: 'templates', icon: LayoutTemplate },
  { id: 'library', icon: LibraryBig }, { id: 'studio', icon: ImageIcon }, { id: 'classroom', icon: GraduationCap }, { id: 'import', icon: Upload }, { id: 'space3d', icon: Box },
];

const HOME_HERO_IDS = STRUCTURAL_ASSET_IDS.filter((assetId) => assetId.startsWith('portal:'));

const CLASSROOM_FEATURES: ReadonlyArray<{ id: ClassroomExerciseTemplateId; assetId: ThreeStructuralAssetId; name: TranslationKey; description: TranslationKey }> = [
  { id: 'simple-beam', assetId: 'beam:simply-supported', name: 'newExercise.template.simpleBeamName', description: 'newExercise.template.simpleBeamDescription' },
  { id: 'triangular-truss', assetId: 'truss:pratt', name: 'newExercise.template.triangularTrussName', description: 'newExercise.template.triangularTrussDescription' },
  { id: 'portal-frame', assetId: 'portal:two-bay', name: 'newExercise.template.portalFrameName', description: 'newExercise.template.portalFrameDescription' },
];

const templateAssetId = (name: string): ThreeStructuralAssetId => {
  if (/armadura|truss/i.test(name)) return 'truss:warren';
  if (/viga|beam/i.test(name)) return 'beam:simply-supported';
  return 'portal:single-bay';
};

interface WelcomePreferencesProps {
  language: 'es' | 'en';
  theme: 'light' | 'dark';
  onLanguageChange: (language: 'es' | 'en') => void;
  onThemeChange: (theme: 'light' | 'dark') => void;
  onClose: () => void;
}

const WelcomePreferences = ({ language, theme, onLanguageChange, onThemeChange, onClose }: WelcomePreferencesProps) => {
  const text = copy[language];
  const [metrics, setMetrics] = useState<LocalMetricsStore>(() => getLocalMetrics(window.localStorage));
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useModalFocus({ open: true, containerRef: dialogRef, onEscape: onClose, initialFocus: () => closeRef.current, restoreFocus: false });

  const downloadDiagnostics = () => {
    const blob = new Blob([exportLocalMetrics(window.localStorage)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'structureco-local-diagnostics.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return <section ref={dialogRef} className="sc-home-settings-panel" role="dialog" aria-modal="true" aria-label={text.settingsTitle} tabIndex={-1}>
    <button ref={closeRef} type="button" aria-label={text.closeSettings} onClick={onClose}><X size={19} /></button>
    <h2>{text.settingsTitle}</h2>
    <p>{text.settingsBody}</p>
    <label className="sc-home-settings-field"><span>{text.language}</span><select aria-label={text.language} value={language} onChange={(event) => onLanguageChange(event.target.value as 'es' | 'en')}><option value="es">ES</option><option value="en">EN</option></select></label>
    <fieldset className="sc-home-settings-field"><legend>{text.theme}</legend><div><button type="button" aria-pressed={theme === 'light'} onClick={() => onThemeChange('light')}>{text.light}</button><button type="button" aria-pressed={theme === 'dark'} onClick={() => onThemeChange('dark')}>{text.dark}</button></div></fieldset>
    <section className="sc-home-settings-metrics" aria-labelledby="local-metrics-title">
      <h3 id="local-metrics-title">{text.localMetrics}</h3>
      <p>{text.localMetricsBody}</p>
      <label><input type="checkbox" checked={metrics.optIn} onChange={(event) => setMetrics(setLocalMetricsOptIn(window.localStorage, event.currentTarget.checked))} />{text.localMetricsOptIn}</label>
      <small>{text.localMetricsCount.replace('{count}', String(metrics.events.length))}</small>
      <div><button type="button" onClick={downloadDiagnostics}>{text.exportDiagnostics}</button><button type="button" onClick={() => setMetrics(clearLocalMetrics(window.localStorage))} disabled={metrics.events.length === 0}>{text.clearDiagnostics}</button></div>
    </section>
  </section>;
};

export const WelcomeScreen = ({ onOpenWorkspace, onOpenSpace3D, onPreloadWorkspace, allowDirectResume = false, onDirectResume, initialView = 'home' }: WelcomeScreenProps) => {
  const { project, replaceProject, updateProjectView } = useProject();
  const { language, t } = useI18n();
  const { theme, setTheme } = useWorkspaceUI();
  const reducedMotion = useReducedMotion();
  const text = copy[language];
  const [view, setView] = useState<HomeView>(initialView);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [exerciseDialogOpen, setExerciseDialogOpen] = useState(false);
  const [exerciseTemplateId, setExerciseTemplateId] = useState<ClassroomExerciseTemplateId>('blank');
  const [importCenterOpen, setImportCenterOpen] = useState(false);
  const [dxfImportOpen, setDxfImportOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const homeRef = useRef<HTMLElement>(null);
  const preferencesLauncherRef = useRef<HTMLButtonElement | null>(null);
  const studioLauncherRef = useRef<HTMLButtonElement | null>(null);
  const entry = useWelcomeEntry();
  const heroId = useMemo(() => resolveSessionHeroId(HOME_HERO_IDS, window.sessionStorage), []);

  useEffect(() => {
    if (!allowDirectResume || !shouldResumeDirectly(entry)) return;
    onDirectResume?.();
    onOpenWorkspace();
  }, [allowDirectResume, entry, onDirectResume, onOpenWorkspace]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const closeMobileNavigation = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setMobileNavOpen(false);
      mobileMenuButtonRef.current?.focus();
    };
    window.addEventListener('keydown', closeMobileNavigation);
    return () => window.removeEventListener('keydown', closeMobileNavigation);
  }, [mobileNavOpen]);

  useEffect(() => {
    if ((!preferencesOpen && !studioOpen) || !homeRef.current) return undefined;
    const home = homeRef.current;
    const previousInert = home.inert;
    const previousAriaHidden = home.getAttribute('aria-hidden');
    home.inert = true;
    home.setAttribute('aria-hidden', 'true');
    return () => {
      home.inert = previousInert;
      if (previousAriaHidden === null) home.removeAttribute('aria-hidden');
      else home.setAttribute('aria-hidden', previousAriaHidden);
    };
  }, [preferencesOpen, studioOpen]);

  const openBlankProject = () => {
    const next = createBlankProject();
    replaceProject({ ...next, settings: { ...next.settings, language } });
    onOpenWorkspace();
  };
  const openExample = (build: () => typeof project) => {
    const next = build();
    replaceProject({ ...next, settings: { ...next.settings, language } });
    onOpenWorkspace();
  };
  const navigate = (next: HomeView) => {
    setView(next);
    setMobileNavOpen(false);
  };
  const updateLanguage = (nextLanguage: 'es' | 'en') => updateProjectView((draft) => ({ ...draft, settings: { ...draft.settings, language: nextLanguage } }));
  const openPreferences = (launcher: HTMLButtonElement) => {
    preferencesLauncherRef.current = launcher.closest('.sc-home-nav--mobile') ? mobileMenuButtonRef.current : launcher;
    setMobileNavOpen(false);
    setPreferencesOpen(true);
  };
  const closePreferences = () => {
    setPreferencesOpen(false);
    window.setTimeout(() => preferencesLauncherRef.current?.focus(), 0);
  };
  const openStudio = (launcher: HTMLButtonElement) => {
    studioLauncherRef.current = launcher.closest('.sc-home-nav--mobile') ? mobileMenuButtonRef.current : launcher;
    setMobileNavOpen(false);
    setStudioOpen(true);
  };
  const closeStudio = () => {
    setStudioOpen(false);
    window.setTimeout(() => studioLauncherRef.current?.focus(), 0);
  };
  const openExercise = (templateId: ClassroomExerciseTemplateId = 'blank') => {
    setExerciseTemplateId(templateId);
    setExerciseDialogOpen(true);
  };
  const renderNavigation = (mobile = false) => <nav className={mobile ? 'sc-home-nav sc-home-nav--mobile' : 'sc-home-nav'} aria-label={text.navigation}>
    {NAV_ITEMS.map(({ id, icon: Icon }) => <button key={id} type="button" className={id !== 'studio' && view === id ? 'is-active' : undefined} aria-current={id !== 'studio' && view === id ? 'page' : undefined} onClick={(event) => id === 'studio' ? openStudio(event.currentTarget) : navigate(id)}><Icon size={19} /><span>{text[id]}</span></button>)}
    {mobile ? <button type="button" onClick={(event) => openPreferences(event.currentTarget)}><Settings size={19} /><span>{text.settings}</span></button> : null}
  </nav>;

  const dashboard = <>
    <section className="sc-home-hero" aria-labelledby="home-current-project">
      <div className="sc-home-primary-actions" onPointerEnter={onPreloadWorkspace} onFocusCapture={onPreloadWorkspace}>
        <p>{text.current}</p><h2 id="home-current-project">{project.name}</h2>
        <div className="sc-home-primary-buttons">
          <button type="button" className="sc-home-continue" onClick={onOpenWorkspace} aria-label={text.continue}><Play size={17} fill="currentColor" /><span>{text.continue}</span></button>
          <button type="button" className="sc-home-new" onClick={openBlankProject} aria-label={text.create}><span aria-hidden="true">＋</span>{text.create}</button>
        </div>
        <small>{text.local}</small>
      </div>
      <m.div className="sc-home-hero-asset" initial={reducedMotion ? false : { opacity: 0, y: -14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 220, damping: 24, mass: 0.8 }}>
        <ThreeStructuralImage assetId={heroId as PortalAssetId} theme={theme} eager />
      </m.div>
    </section>
    <section className="sc-home-quick" aria-labelledby="home-quick-title" data-testid="home-secondary-actions">
      <div className="sc-home-section-heading"><h2 id="home-quick-title">{text.secondary}</h2></div>
      <div className="sc-home-quick-row">
        <button type="button" onClick={() => setImportCenterOpen(true)}><Upload size={18} /><span>{text.import}</span></button>
        <button type="button" onClick={() => openExercise()}><GraduationCap size={18} /><span>{text.classroom}</span></button>
        <button type="button" onClick={onOpenSpace3D}><Box size={18} /><span>{text.space3d}</span></button>
      </div>
    </section>
    <section className="sc-home-recents" aria-labelledby="home-recents-title">
      <div className="sc-home-section-heading"><h2 id="home-recents-title">{text.recent}</h2><button type="button" onClick={() => setView('projects')}>{text.viewAll}<ArrowRight size={15} /></button></div>
      <Suspense fallback={<p role="status">{t('hub.loading')}</p>}><Phase2ProjectHub onOpenWorkspace={onOpenWorkspace} variant="recent" limit={3} /></Suspense>
    </section>
  </>;

  const templates = <section className="sc-home-view" aria-labelledby="home-templates-title">
    <header><p>{text.templates}</p><h2 id="home-templates-title">{text.templatesTitle}</h2><span>{text.templatesBody}</span></header>
    <div className="sc-home-template-grid">{exampleProjects.map((example) => {
      const presented = presentExample(example.name, example.description, t);
      return <button key={example.name} type="button" onClick={() => openExample(example.build)}><ThreeStructuralImage assetId={templateAssetId(example.name)} theme={theme} /><strong>{presented.name}</strong><span>{presented.description}</span></button>;
    })}</div>
  </section>;

  const classroomLanding = <section className="sc-home-classroom" aria-labelledby="home-classroom-title">
    <div className="sc-home-classroom-hero">
      <div>
        <p>{text.classroom}</p>
        <h2 id="home-classroom-title">{text.classroomTitle}</h2>
        <span>{text.classroomBody}</span>
        <button type="button" className="sc-home-continue" onClick={() => openExercise()}>{text.classroomAction}<ArrowRight size={16} /></button>
      </div>
      <ThreeStructuralImage assetId="portal:two-story" theme={theme} eager />
    </div>
    <div className="sc-home-classroom-cases">
      <h3>{text.classroomCases}</h3>
      <div>
        {CLASSROOM_FEATURES.map((item) => <button key={item.id} type="button" onClick={() => openExercise(item.id)}>
          <ThreeStructuralImage assetId={item.assetId} theme={theme} />
          <strong>{t(item.name)}</strong>
          <span>{t(item.description)}</span>
          <ArrowRight size={16} aria-hidden="true" />
        </button>)}
      </div>
    </div>
  </section>;

  const content = view === 'home' ? dashboard
    : view === 'projects' ? <section className="sc-home-view"><header><p>{text.projects}</p><h2>{text.projectsTitle}</h2><span>{text.projectsBody}</span></header><Suspense fallback={<p role="status">{t('hub.loading')}</p>}><Phase2ProjectHub onOpenWorkspace={onOpenWorkspace} /></Suspense></section>
      : view === 'templates' ? templates
        : view === 'library' ? <PersonalLibraryView language={language} units={project.settings.units} theme={theme} view={readCanvasViewSettings(project)} />
          : view === 'classroom' ? classroomLanding
          : view === 'import' ? <section className="sc-home-view"><header><p>{text.import}</p><h2>{text.importTitle}</h2><span>{text.importBody}</span></header><div className="sc-home-import-grid"><button type="button" className="welcome-import-card" onClick={() => setImportCenterOpen(true)}><Upload size={20} /><strong>{t('welcome.import')}</strong><span>{t('welcome.importDescription')}</span></button><Suspense fallback={null}><Phase2DxfAction open={dxfImportOpen} onOpenChange={setDxfImportOpen} onOpenWorkspace={onOpenWorkspace} /></Suspense></div></section>
            : <section className="sc-home-space" aria-labelledby="home-space-title">
              <div className="sc-home-space__copy">
                <p>{text.space3d}</p>
                <h2 id="home-space-title">{text.spaceTitle}</h2>
                <span>{text.spaceBody}</span>
                <aside className="sc-home-space__orientation" role="note"><strong>{text.spaceExperimental}</strong><span>{text.spaceNotice}</span></aside>
                <div className="sc-home-space__actions"><button type="button" className="sc-home-continue" onClick={onOpenSpace3D}>{text.spaceAction}<ArrowRight size={16} /></button><button type="button" className="sc-home-space__return" onClick={onOpenWorkspace}>{text.spaceContinue2D}</button></div>
                <div className="sc-home-space__capabilities" aria-label={text.space3d}>
                  <span><strong>XYZ</strong>{text.spaceCoordinates}</span>
                  <span><strong>3D</strong>{text.spaceModel}</span>
                  <span><strong>↧</strong>{text.spaceLoads}</span>
                </div>
              </div>
              <div className="sc-home-space__asset">
                <ThreeStructuralImage assetId="space-frame:multi-bay" theme={theme} alt={text.spacePreview} eager />
              </div>
            </section>;

  return <><main ref={homeRef} className="sc-home" data-testid="welcome-screen">
    <aside className="sc-home-sidebar"><div className="sc-home-wordmark"><BrandMark size={30} /><strong><span>structure</span>Co</strong></div>{renderNavigation()}<button type="button" className="sc-home-settings" onClick={(event) => openPreferences(event.currentTarget)}><Settings size={19} /><span>{text.settings}</span></button></aside>
    <header className="sc-home-mobile-header"><div className="sc-home-wordmark"><BrandMark size={27} /><strong><span>structure</span>Co</strong></div><button ref={mobileMenuButtonRef} type="button" aria-label={mobileNavOpen ? text.closeMenu : text.menu} aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen((open) => !open)}><Menu size={20} /></button></header>
    {mobileNavOpen ? renderNavigation(true) : null}
    <div className="sc-home-main"><header className="sc-home-topline"><span>{text[view]}</span><div><label><span className="sr-only">{t('language.label')}</span><select value={language} onChange={(event) => updateLanguage(event.target.value as 'es' | 'en')}><option value="es">ES</option><option value="en">EN</option></select></label><button type="button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label={theme === 'light' ? t('theme.dark') : t('theme.light')}>{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button></div></header><div className="sc-home-content">{content}</div></div>
    {importCenterOpen ? <Suspense fallback={null}><PortableImportCenter open currentProjectName={project.name} onClose={() => setImportCenterOpen(false)} onSaveCurrent={() => exportProjectJson(project)} onImported={(outcome) => { replaceProject({ ...outcome.project, settings: { ...outcome.project.settings, language } }, outcome.restoredAnalysis); setImportCenterOpen(false); onOpenWorkspace(); }} /></Suspense> : null}
    <NewExerciseDialog open={exerciseDialogOpen} initialTemplateId={exerciseTemplateId} onClose={() => setExerciseDialogOpen(false)} onCreate={(next) => { replaceProject({ ...next, settings: { ...next.settings, language } }); setExerciseDialogOpen(false); onOpenWorkspace(); }} />
  </main>{preferencesOpen ? <WelcomePreferences language={language} theme={theme} onLanguageChange={updateLanguage} onThemeChange={setTheme} onClose={closePreferences} /> : null}{studioOpen ? <IllustrationStudio language={language} initialTheme={theme} onClose={closeStudio} /> : null}</>;
};
