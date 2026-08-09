import { lazy, Suspense, useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { BrandMark } from './features/topbar/BrandMark';
import { WelcomeScreen } from './features/welcome/WelcomeScreen';
import { ProjectProvider } from './store/ProjectContext';
import { useProject } from './store/ProjectContext';
import { ClassroomSessionProvider } from './store/ClassroomSessionContext';
import { useI18n } from './i18n/useI18n';
import './styles.css';
import './design-system/material.css';

const loadWorkspaceShell = () => import('./features/workspace/WorkspaceShell');
const WorkspaceShell = lazy(loadWorkspaceShell);
const loadExperimental3DView = () => import('./features/experimental3d/Experimental3DView');
const Experimental3DView = lazy(loadExperimental3DView);
const PwaUpdateNotice = lazy(() => import('./platform/PwaUpdateNotice').then((module) => ({ default: module.PwaUpdateNotice })));

export type AppScreen = 'welcome' | 'workspace' | 'experimental3d';

const AppShell = () => {
  const [screen, setScreen] = useState<AppScreen>('welcome');
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

  const navigate = (next: AppScreen) => {
    setScreen(next);
  };

  if (screen === 'welcome') {
    return <ClassroomSessionProvider projectId={project.id} analysisAvailable={analysis?.success === true}><WelcomeScreen
      onOpenWorkspace={() => navigate('workspace')}
      onOpenExperimental3D={() => navigate('experimental3d')}
      onPreloadWorkspace={() => { void loadWorkspaceShell(); }}
    /></ClassroomSessionProvider>;
  }

  if (screen === 'experimental3d') {
    return <ClassroomSessionProvider projectId={project.id} analysisAvailable={analysis?.success === true}>
      <Suspense fallback={<div className="workspace-loading" role="status" aria-label={t('experimental3d.loading')}><BrandMark size={42} /><LoaderCircle className="spin" size={22} /></div>}>
        <Experimental3DView project={project} onOpenWorkspace={() => navigate('workspace')} onOpenHome={() => navigate('welcome')} />
      </Suspense>
    </ClassroomSessionProvider>;
  }

  return <ClassroomSessionProvider projectId={project.id} analysisAvailable={analysis?.success === true}>
    <Suspense fallback={<div className="workspace-loading" role="status" aria-label={t('workspace.loading')}><BrandMark size={42} /><LoaderCircle className="spin" size={22} /></div>}>
      <WorkspaceShell projectId={project.id} onOpenHome={() => navigate('welcome')} onOpenExperimental3D={() => navigate('experimental3d')} />
    </Suspense>
  </ClassroomSessionProvider>;
};

export default function App() {
  return <ProjectProvider><AppShell /><Suspense fallback={null}><PwaUpdateNotice /></Suspense></ProjectProvider>;
}
