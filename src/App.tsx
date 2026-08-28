import { lazy, Suspense, useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { BrandMark } from './features/topbar/BrandMark';
import { WelcomeScreen, type HomeView } from './features/welcome/WelcomeScreen';
import { ProjectProvider } from './store/ProjectContext';
import { useProject } from './store/ProjectContext';
import { ClassroomSessionProvider } from './store/ClassroomSessionContext';
import { useI18n } from './i18n/useI18n';
import { Space3DEntryDialog, type Space3DEntryOrigin } from './features/space3d/Space3DEntryDialog';
import './styles.css';
import './design-system/material.css';

const loadWorkspaceShell = () => import('./features/workspace/WorkspaceShell');
const WorkspaceShell = lazy(loadWorkspaceShell);
// Space 3D es la única superficie 3D del producto: su dominio, su worker y
// Three.js sólo entran en el grafo cuando el usuario abre la pantalla.
const loadSpace3DWorkspace = () => import('./features/space3d/Space3DWorkspace');
const Space3DWorkspace = lazy(loadSpace3DWorkspace);
const PwaUpdateNotice = lazy(() => import('./platform/PwaUpdateNotice').then((module) => ({ default: module.PwaUpdateNotice })));

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
  const { project, analysis } = useProject();
  const { t } = useI18n();

  useEffect(() => {
    document.documentElement.lang = project.settings.language;
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

  if (screen === 'welcome') {
    return <><ClassroomSessionProvider projectId={project.id} analysisAvailable={analysis?.success === true}><WelcomeScreen
      onOpenWorkspace={() => navigate('workspace')}
      onOpenSpace3D={() => requestSpace3D('standalone')}
      onPreloadWorkspace={() => { void loadWorkspaceShell(); }}
      initialView={welcomeInitialView}
    /></ClassroomSessionProvider>{space3DEntry}</>;
  }

  if (screen === 'space3d') {
    // Space 3D no se envuelve en ClassroomSessionProvider: su modelo no es el
    // proyecto 2D y el Modo Aula no lo evalúa.
    return (
      <Suspense fallback={<div className="workspace-loading" role="status" aria-label={t('space3d.loading')}><BrandMark size={42} /><LoaderCircle className="spin" size={22} /></div>}>
        <Space3DWorkspace
          language={project.settings.language}
          sourceProject={space3dOrigin === 'workspace' ? project : undefined}
          onOpenHome={() => navigate('welcome')}
          onOpen2D={() => navigate('workspace')}
        />
      </Suspense>
    );
  }

  return <ClassroomSessionProvider projectId={project.id} analysisAvailable={analysis?.success === true}>
    <Suspense fallback={<div className="workspace-loading" role="status" aria-label={t('workspace.loading')}><BrandMark size={42} /><LoaderCircle className="spin" size={22} /></div>}>
      <WorkspaceShell projectId={project.id} onOpenHome={() => navigate('welcome')} onOpenSpace3D={() => requestSpace3D('workspace')} />
    </Suspense>{space3DEntry}
  </ClassroomSessionProvider>;
};

export default function App() {
  return <ProjectProvider><AppShell /><Suspense fallback={null}><PwaUpdateNotice /></Suspense></ProjectProvider>;
}
