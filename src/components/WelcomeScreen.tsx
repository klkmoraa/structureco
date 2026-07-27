import { lazy, Suspense, useState } from 'react';
import {
  ArrowRight,
  FilePlus2,
  FolderOpen,
  GitCommitHorizontal,
  Play,
  Triangle,
  Upload,
} from 'lucide-react';
import { createBlankProject, exampleProjects } from '../data/defaultProject';
import { useProject } from '../store/ProjectContext';
import { exportProjectJson } from '../utils/export';
import { useI18n } from '../i18n/useI18n';
import { NewExerciseDialog } from './NewExerciseDialog';
import { BrandMark } from './BrandMark';
import { presentExample } from './examplePresentation';

const PortableImportCenter = lazy(() => import('./PortableImportCenter').then((module) => ({ default: module.PortableImportCenter })));

interface WelcomeScreenProps {
  onOpenWorkspace: () => void;
  onPreloadWorkspace?: () => void;
}

const quickExampleNames = ['Pórtico de ejemplo', 'Viga simplemente apoyada', 'Armadura triangular'];

const quickExampleIcon = (name: string) => {
  if (name === 'Armadura triangular') return Triangle;
  return GitCommitHorizontal;
};

export const WelcomeScreen = ({ onOpenWorkspace, onPreloadWorkspace }: WelcomeScreenProps) => {
  const { project, replaceProject } = useProject();
  const { language, t } = useI18n();
  const [exerciseDialogOpen, setExerciseDialogOpen] = useState(false);
  const [importCenterOpen, setImportCenterOpen] = useState(false);
  const quickExamples = quickExampleNames
    .map((name) => exampleProjects.find((example) => example.name === name))
    .filter((example): example is NonNullable<typeof example> => Boolean(example));

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

  return (
    <main className="welcome-screen" data-testid="welcome-screen">
      <div className="welcome-base" inert={exerciseDialogOpen || importCenterOpen} aria-hidden={exerciseDialogOpen || importCenterOpen || undefined}>
      <header className="welcome-header">
        <div className="welcome-brand" aria-label="structureCo"><BrandMark size={36} /><strong><span>structure</span>Co</strong></div>
        <button className="welcome-continue-link" onClick={onOpenWorkspace}>
          {t('welcome.continue')} <ArrowRight size={16} />
        </button>
      </header>

      <div className="welcome-content">
        <section className="welcome-hero" aria-labelledby="welcome-title">
          <h1 id="welcome-title">{t('welcome.title')}</h1>
          <p>{t('welcome.subtitle')}</p>

          <div className="welcome-primary-actions" onPointerEnter={onPreloadWorkspace} onFocusCapture={onPreloadWorkspace} onTouchStart={onPreloadWorkspace}>
            <button className="welcome-primary-button full-project-button" onClick={openBlankProject}>
              <FilePlus2 size={22} /> {t('welcome.fullProject')}
            </button>
            <button className="welcome-primary-button classroom-primary" onClick={() => setExerciseDialogOpen(true)}>
              <Play size={22} fill="currentColor" /> {t('welcome.newExercise')}
            </button>
            <button className="welcome-secondary-button" onClick={onOpenWorkspace}>
              <FolderOpen size={22} />
              <span><small>{t('welcome.continueProject')}</small><strong>{project.name}</strong></span>
            </button>
          </div>
        </section>

        <section className="welcome-options" aria-labelledby="welcome-options-title">
          <div className="welcome-options-heading">
            <h2 id="welcome-options-title">{t('welcome.otherWays')}</h2>
          </div>
          <button className="welcome-option" onClick={() => setImportCenterOpen(true)}>
            <span className="welcome-option-icon"><Upload size={20} /></span>
            <span><strong>{t('welcome.import')}</strong><small>{t('welcome.importDescription')}</small></span>
            <ArrowRight size={18} />
          </button>
          <div className="welcome-example-rail">
            {quickExamples.map((example) => {
              const Icon = quickExampleIcon(example.name);
              const copy = presentExample(example.name, example.description, t);
              return (
                <button key={example.name} className="welcome-option welcome-example-card" onClick={() => openExample(example.build)}>
                  <span className="welcome-option-icon"><Icon size={20} /></span>
                  <span><strong>{copy.name}</strong><small>{copy.description}</small></span>
                  <ArrowRight size={18} />
                </button>
              );
            })}
          </div>
        </section>

        <section className="welcome-steps" aria-labelledby="welcome-steps-title">
          <h2 id="welcome-steps-title">{t('welcome.stepsTitle')}</h2>
          <ol>
            <li><span>1</span><strong>{t('welcome.model')}</strong><small>{t('welcome.modelDescription')}</small></li>
            <li><span>2</span><strong>{t('welcome.load')}</strong><small>{t('welcome.loadDescription')}</small></li>
            <li><span>3</span><strong>{t('welcome.analyze')}</strong><small>{t('welcome.analyzeDescription')}</small></li>
          </ol>
        </section>
      </div>

      <footer className="welcome-footer"><Play size={13} fill="currentColor" /> {t('welcome.footer')}</footer>
      </div>

      {importCenterOpen ? <Suspense fallback={null}><PortableImportCenter
        open
        currentProjectName={project.name}
        onClose={() => setImportCenterOpen(false)}
        onSaveCurrent={() => exportProjectJson(project)}
        onImported={(outcome) => {
          replaceProject({ ...outcome.project, settings: { ...outcome.project.settings, language } }, outcome.restoredAnalysis);
          setImportCenterOpen(false);
          onOpenWorkspace();
        }}
      /></Suspense> : null}
      <NewExerciseDialog open={exerciseDialogOpen} onClose={() => setExerciseDialogOpen(false)} onCreate={(next) => { replaceProject({ ...next, settings: { ...next.settings, language } }); setExerciseDialogOpen(false); onOpenWorkspace(); }} />
    </main>
  );
};
