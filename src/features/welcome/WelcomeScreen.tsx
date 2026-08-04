import { lazy, Suspense, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Cpu,
  FolderOpen,
  GitCommitHorizontal,
  GraduationCap,
  Layers,
  Play,
  Sparkles,
  Triangle,
  Upload,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { createBlankProject, exampleProjects } from '../../data/defaultProject';
import { useProject } from '../../store/ProjectContext';
import { exportProjectJson } from '../../utils/export';
import { useI18n } from '../../i18n/useI18n';
import { APP_VERSION } from '../../appVersion';
import { NewExerciseDialog } from './NewExerciseDialog';
import { BrandMark } from '../topbar/BrandMark';
import { presentExample } from './examplePresentation';
import type { TranslationKey } from '../../i18n/catalogs';

const PortableImportCenter = lazy(() => import('../import-export/PortableImportCenter').then((module) => ({ default: module.PortableImportCenter })));

interface WelcomeScreenProps {
  onOpenWorkspace: () => void;
  onPreloadWorkspace?: () => void;
}

/**
 * Explicit per-example presentation metadata, keyed by the exact name from
 * `data/defaultProject.ts` (which this feature must not modify — the protected
 * boundary covers all of `src/data/**`). Mirrors the lookup pattern already
 * used by `examplePresentation.ts` rather than guessing category from a
 * substring of the name.
 */
const EXAMPLE_META: Record<string, { categoryKey: TranslationKey; badgeClass: string; icon: typeof Layers }> = {
  'Hibbeler · carga tributaria Fig. 2–11': { categoryKey: 'welcome.categoryAcademic', badgeClass: 'welcome-badge--academic', icon: GitCommitHorizontal },
  'Práctica tipo Hibbeler · diagramas': { categoryKey: 'welcome.categoryAcademic', badgeClass: 'welcome-badge--academic', icon: GitCommitHorizontal },
  'Práctica tipo Hibbeler · armadura': { categoryKey: 'welcome.categoryAcademic', badgeClass: 'welcome-badge--academic', icon: Triangle },
  'Pórtico de ejemplo': { categoryKey: 'welcome.categoryFrame', badgeClass: 'welcome-badge--frame', icon: Layers },
  'Viga simplemente apoyada': { categoryKey: 'welcome.categoryBeam', badgeClass: 'welcome-badge--beam', icon: GitCommitHorizontal },
  'Armadura triangular': { categoryKey: 'welcome.categoryTruss', badgeClass: 'welcome-badge--truss', icon: Triangle },
};
const DEFAULT_EXAMPLE_META = { categoryKey: 'welcome.categoryFrame' as TranslationKey, badgeClass: 'welcome-badge--frame', icon: Layers };
const ACADEMIC_EXAMPLE_NAMES = new Set(['Hibbeler · carga tributaria Fig. 2–11', 'Práctica tipo Hibbeler · diagramas', 'Práctica tipo Hibbeler · armadura']);

type TemplateFilter = 'all' | 'academic' | 'models';

export const WelcomeScreen = ({ onOpenWorkspace, onPreloadWorkspace }: WelcomeScreenProps) => {
  const { project, replaceProject } = useProject();
  const { language, t } = useI18n();
  const reducedMotion = useReducedMotion();
  const [exerciseDialogOpen, setExerciseDialogOpen] = useState(false);
  const [importCenterOpen, setImportCenterOpen] = useState(false);
  const [templateFilter, setTemplateFilter] = useState<TemplateFilter>('all');

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

  const filteredExamples = exampleProjects.filter((example) => {
    if (templateFilter === 'academic') return ACADEMIC_EXAMPLE_NAMES.has(example.name);
    if (templateFilter === 'models') return !ACADEMIC_EXAMPLE_NAMES.has(example.name);
    return true;
  });

  const nodeCount = project.nodes.length;
  const memberCount = project.members.length;

  const fadeInUp = (delayMs: number) => reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.01 } }
    : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, delay: delayMs / 1000, ease: 'easeOut' as const } };
  const hoverLift = reducedMotion ? undefined : { scale: 1.015, y: -2 };
  const pressDown = reducedMotion ? undefined : { scale: 0.985 };
  const templateMotion = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.01 } }
    : { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.95 }, transition: { type: 'spring' as const, stiffness: 380, damping: 28 } };

  return (
    <main className="welcome-screen" data-testid="welcome-screen">
      <div className="welcome-base" inert={exerciseDialogOpen || importCenterOpen} aria-hidden={exerciseDialogOpen || importCenterOpen || undefined}>
        <header className="welcome-header">
          <div className="welcome-brand" aria-label="structureCo">
            <BrandMark size={38} />
            <strong><span>structure</span>Co</strong>
            <span className="welcome-version-tag">v{APP_VERSION}</span>
          </div>
          <button className="welcome-continue-link" onClick={onOpenWorkspace}>
            <span>{t('welcome.continue')}</span> <ArrowRight size={16} />
          </button>
        </header>

        <div className="welcome-content">
          <motion.section className="welcome-hero" aria-labelledby="welcome-title" {...fadeInUp(0)}>
            <div className="welcome-badge-pill">
              <Sparkles size={14} />
              <span>{t('welcome.badgePill')}</span>
            </div>

            <h1 id="welcome-title">{t('welcome.title')}</h1>
            <p className="welcome-hero-subtitle">{t('welcome.subtitle')}</p>

            <div className="welcome-features-highlights">
              <div className="welcome-highlight-item"><CheckCircle2 size={15} /><span>{t('welcome.highlightStiffnessMethod')}</span></div>
              <div className="welcome-highlight-item"><CheckCircle2 size={15} /><span>{t('welcome.highlightVerified')}</span></div>
              <div className="welcome-highlight-item"><CheckCircle2 size={15} /><span>{t('welcome.highlightPdfExport')}</span></div>
            </div>

            <div className="welcome-hero-launcher" onPointerEnter={onPreloadWorkspace} onFocusCapture={onPreloadWorkspace} onTouchStart={onPreloadWorkspace}>
              <motion.button whileHover={hoverLift} whileTap={pressDown} className="welcome-launcher-card welcome-launcher-card--primary" onClick={openBlankProject}>
                <div className="welcome-launcher-icon"><Compass size={24} /></div>
                <div className="welcome-launcher-info">
                  <div className="welcome-launcher-header">
                    <strong>{t('welcome.fullProject')}</strong>
                    <span className="welcome-pill-badge">{t('welcome.pillFreeCanvas')}</span>
                  </div>
                  <small>{t('welcome.launcherFreeCanvasDescription')}</small>
                </div>
                <ArrowRight size={18} className="welcome-launcher-arrow" />
              </motion.button>

              <motion.button whileHover={hoverLift} whileTap={pressDown} className="welcome-launcher-card welcome-launcher-card--classroom" onClick={() => setExerciseDialogOpen(true)}>
                <div className="welcome-launcher-icon"><GraduationCap size={24} /></div>
                <div className="welcome-launcher-info">
                  <div className="welcome-launcher-header">
                    <strong>{t('welcome.newExercise')}</strong>
                    <span className="welcome-pill-badge welcome-pill-badge--aula">{t('welcome.pillClassroomMode')}</span>
                  </div>
                  <small>{t('welcome.launcherClassroomDescription')}</small>
                </div>
                <ArrowRight size={18} className="welcome-launcher-arrow" />
              </motion.button>

              <motion.button whileHover={hoverLift} whileTap={pressDown} className="welcome-launcher-card welcome-launcher-card--recent" onClick={onOpenWorkspace}>
                <div className="welcome-launcher-icon"><FolderOpen size={24} /></div>
                <div className="welcome-launcher-info">
                  <div className="welcome-launcher-header">
                    <small>{t('welcome.continueProject')}</small>
                    <span className="welcome-project-stats">{t('welcome.projectStats', { nodes: nodeCount, members: memberCount })}</span>
                  </div>
                  <strong>{project.name}</strong>
                </div>
                <ArrowRight size={18} className="welcome-launcher-arrow" />
              </motion.button>
            </div>
          </motion.section>

          <motion.section className="welcome-showcase" aria-labelledby="welcome-showcase-title" {...fadeInUp(80)}>
            <div className="welcome-showcase-header">
              <div>
                <h2 id="welcome-showcase-title">{t('welcome.otherWays')}</h2>
                <p className="welcome-showcase-sub">{t('welcome.showcaseSubtitle')}</p>
              </div>
              <div className="welcome-filter-tabs" role="tablist">
                <button className={`welcome-filter-tab${templateFilter === 'all' ? ' active' : ''}`} onClick={() => setTemplateFilter('all')} role="tab" aria-selected={templateFilter === 'all'}>{t('welcome.filterAll')}</button>
                <button className={`welcome-filter-tab${templateFilter === 'academic' ? ' active' : ''}`} onClick={() => setTemplateFilter('academic')} role="tab" aria-selected={templateFilter === 'academic'}>{t('welcome.filterAcademic')}</button>
                <button className={`welcome-filter-tab${templateFilter === 'models' ? ' active' : ''}`} onClick={() => setTemplateFilter('models')} role="tab" aria-selected={templateFilter === 'models'}>{t('welcome.filterModels')}</button>
              </div>
            </div>

            <motion.button whileHover={reducedMotion ? undefined : { scale: 1.01, y: -1 }} whileTap={reducedMotion ? undefined : { scale: 0.99 }} className="welcome-import-card" onClick={() => setImportCenterOpen(true)}>
              <div className="welcome-import-icon"><Upload size={22} /></div>
              <div className="welcome-import-text">
                <strong>{t('welcome.import')}</strong>
                <small>{t('welcome.importDescription')}</small>
              </div>
            </motion.button>

            <div className="welcome-templates-grid">
              <AnimatePresence mode="popLayout">
                {filteredExamples.map((example) => {
                  const meta = EXAMPLE_META[example.name] ?? DEFAULT_EXAMPLE_META;
                  const Icon = meta.icon;
                  const copy = presentExample(example.name, example.description, t);
                  return (
                    <motion.button
                      key={example.name}
                      layout
                      {...templateMotion}
                      whileHover={reducedMotion ? undefined : { y: -2, scale: 1.015 }}
                      whileTap={pressDown}
                      className="welcome-template-card"
                      onClick={() => openExample(example.build)}
                    >
                      <div className="welcome-template-top">
                        <span className={`welcome-category-badge ${meta.badgeClass}`}>{t(meta.categoryKey)}</span>
                        <Icon size={18} className="welcome-template-icon" />
                      </div>
                      <div className="welcome-template-body">
                        <strong>{copy.name}</strong>
                        <small>{copy.description}</small>
                      </div>
                      <div className="welcome-template-footer">
                        <span>{t('welcome.loadModel')}</span>
                        <ArrowRight size={14} />
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.section>

          <section className="welcome-workflow" aria-labelledby="welcome-workflow-title">
            <div className="welcome-workflow-header">
              <Cpu size={18} />
              <h2 id="welcome-workflow-title">{t('welcome.stepsTitle')}</h2>
            </div>
            <div className="welcome-workflow-steps">
              <div className="welcome-workflow-step">
                <div className="welcome-step-num">1</div>
                <div className="welcome-step-content"><strong>{t('welcome.model')}</strong><p>{t('welcome.modelDescription')}</p></div>
              </div>
              <div className="welcome-workflow-step">
                <div className="welcome-step-num">2</div>
                <div className="welcome-step-content"><strong>{t('welcome.load')}</strong><p>{t('welcome.loadDescription')}</p></div>
              </div>
              <div className="welcome-workflow-step">
                <div className="welcome-step-num">3</div>
                <div className="welcome-step-content"><strong>{t('welcome.analyze')}</strong><p>{t('welcome.analyzeDescription')}</p></div>
              </div>
            </div>
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
