import { lazy, Suspense, useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { BrandMark } from './features/topbar/BrandMark';
import { WelcomeScreen, type HomeView } from './features/welcome/WelcomeScreen';
import { ProjectProvider } from './store/ProjectContext';
import { useProject } from './store/ProjectContext';
import { ClassroomSessionProvider } from './store/ClassroomSessionContext';
import { useI18n } from './i18n/useI18n';
import { rememberLanguage } from './i18n/languagePreference';
import { Space3DEntryDialog, type Space3DEntryOrigin } from './features/space3d/Space3DEntryDialog';
import { onLaunchedFile } from './platform/launchedFile';
import { safeProjectFilename } from './utils/export';
import { decodeProjectFragment } from './utils/shareLink';
import './styles.css';
import './design-system/material.css';

const loadWorkspaceShell = () => import('./features/workspace/WorkspaceShell');
const WorkspaceShell = lazy(loadWorkspaceShell);
// Space 3D es la única superficie 3D del producto: su dominio, su worker y
// Three.js sólo entran en el grafo cuando el usuario abre la pantalla.
const loadSpace3DWorkspace = () => import('./features/space3d/Space3DWorkspace');
const Space3DWorkspace = lazy(loadSpace3DWorkspace);
const PwaUpdateNotice = lazy(() => import('./platform/PwaUpdateNotice').then((module) => ({ default: module.PwaUpdateNotice })));
const PortableImportCenter = lazy(() => import('./features/import-export/PortableImportCenter').then((module) => ({ default: module.PortableImportCenter })));

type AppScreen = 'welcome' | 'workspace' | 'space3d';

/**
 * De dónde se abrió Space 3D. Desde la mesa 2D se abre el proyecto actual
 * convertido al dominio espacial; desde Inicio, un modelo espacial propio.
 */
type Space3DOrigin = Space3DEntryOrigin;

const AppShell = () => {
  const [screen, setScreen] = useState<AppScreen>('welcome');
  const [welcomeInitialView, setWelcomeInitialView] = useState<HomeView>('home');
  const [space3dOrigin, setSpace3DOrigin] = useState<Space3DOrigin>('standalone');
  const [space3DEntryOrigin, setSpace3DEntryOrigin] = useState<Space3DEntryOrigin | null>(null);
  const [launchedFile, setLaunchedFile] = useState<File | null>(null);
  // La reanudación directa se permite sólo al abrir la aplicación. Al volver a
  // Inicio en la misma sesión, el usuario debe poder ver de verdad las rutas
  // de recuperación, importación y ejemplos.
  const [directResumeAvailable, setDirectResumeAvailable] = useState(true);
  const { project, analysis, replaceProject } = useProject();
  const { t } = useI18n();

  useEffect(() => {
    document.documentElement.lang = project.settings.language;
    rememberLanguage(project.settings.language);
  }, [project.settings.language]);

  useEffect(() => {
    const preload = () => { void loadWorkspaceShell(); };
    const idleWindow = window as Window & { requestIdleCallback?: typeof window.requestIdleCallback };
    if (idleWindow.requestIdleCallback) {
      const handle = idleWindow.requestIdleCallback(preload, { timeout: 1800 });
      return () => window.cancelIdleCallback(handle);
    }
    const handle = window.setTimeout(preload, 700);
    return () => window.clearTimeout(handle);
  }, []);

  useEffect(() => onLaunchedFile(({ file }) => {
    setLaunchedFile(file);
    setScreen('workspace');
  }), []);

  useEffect(() => {
    const receiveSharedProject = () => {
      const decoded = decodeProjectFragment(window.location.hash);
      if (!decoded.ok) return;
      // El enlace no sustituye el proyecto: se convierte en un archivo temporal
      // y entra al mismo importador con revisión y confirmación explícita.
      const name = `${safeProjectFilename(decoded.project.name)}.structureco.json`;
      setLaunchedFile(new File([JSON.stringify(decoded.project)], name, { type: 'application/json' }));
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      setScreen('workspace');
    };
    receiveSharedProject();
    window.addEventListener('hashchange', receiveSharedProject);
    return () => window.removeEventListener('hashchange', receiveSharedProject);
  }, []);

  const navigate = (next: AppScreen, view: HomeView = 'home') => {
    if (next === 'welcome') setWelcomeInitialView(view);
    setScreen(next);
  };
  const requestSpace3D = (origin: Space3DEntryOrigin) => setSpace3DEntryOrigin(origin);
  const proceedToSpace3D = () => {
    if (!space3DEntryOrigin) return;
    setSpace3DOrigin(space3DEntryOrigin);
    setSpace3DEntryOrigin(null);
    navigate('space3d');
  };
  const space3DEntry = space3DEntryOrigin ? <Space3DEntryDialog
    language={project.settings.language}
    origin={space3DEntryOrigin}
    projectName={project.name}
    onCancel={() => setSpace3DEntryOrigin(null)}
    onProceed={proceedToSpace3D}
  /> : null;
  const launchedImport = launchedFile ? <Suspense fallback={null}><PortableImportCenter
    open
    initialFile={launchedFile}
    currentProjectName={project.name}
    onClose={() => setLaunchedFile(null)}
    onImported={(outcome) => {
      replaceProject({ ...outcome.project, settings: { ...outcome.project.settings, language: project.settings.language } }, outcome.restoredAnalysis);
      setLaunchedFile(null);
      setScreen('workspace');
    }}
  /></Suspense> : null;

  if (screen === 'welcome') {
    return <><ClassroomSessionProvider projectId={project.id} analysisAvailable={analysis?.success === true}><WelcomeScreen
      onOpenWorkspace={() => navigate('workspace')}
      onOpenSpace3D={() => requestSpace3D('standalone')}
      onPreloadWorkspace={() => { void loadWorkspaceShell(); }}
      allowDirectResume={directResumeAvailable}
      onDirectResume={() => setDirectResumeAvailable(false)}
      initialView={welcomeInitialView}
    /></ClassroomSessionProvider>{space3DEntry}{launchedImport}</>;
  }

  if (screen === 'space3d') {
    // Space 3D no se envuelve en ClassroomSessionProvider: su modelo no es el
    // proyecto 2D y el Modo Aula no lo evalúa.
    return <>
      <Suspense fallback={<div className="workspace-loading" role="status" aria-label={t('space3d.loading')}><BrandMark size={42} /><LoaderCircle className="spin" size={22} /></div>}>
        <Space3DWorkspace
          language={project.settings.language}
          sourceProject={space3dOrigin === 'workspace' ? project : undefined}
          onOpenHome={() => navigate('welcome')}
          onOpen2D={() => navigate('workspace')}
        />
      </Suspense>{launchedImport}
    </>;
  }

  return <ClassroomSessionProvider projectId={project.id} analysisAvailable={analysis?.success === true}>
    <Suspense fallback={<div className="workspace-loading" role="status" aria-label={t('workspace.loading')}><BrandMark size={42} /><LoaderCircle className="spin" size={22} /></div>}>
      <WorkspaceShell projectId={project.id} onOpenHome={() => navigate('welcome')} onOpenSpace3D={() => requestSpace3D('workspace')} />
    </Suspense>{space3DEntry}{launchedImport}
  </ClassroomSessionProvider>;
};

export default function App() {
  return <ProjectProvider><AppShell /><Suspense fallback={null}><PwaUpdateNotice /></Suspense></ProjectProvider>;
}
