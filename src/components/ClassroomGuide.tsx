import type { CSSProperties } from 'react';
import { deriveClassroomProgress, type ClassroomProgress, type ClassroomProgressStep } from '../education/classroomProgress';
import type { AnalysisResult, ProjectModel, Tool } from '../types';

export interface ClassroomGuideProps {
  project: ProjectModel;
  analysis?: AnalysisResult | null;
  progress?: ClassroomProgress;
  compact?: boolean;
  className?: string;
  onChooseTool?: (tool: Tool) => void;
  onAnalyze?: () => void;
}

const styles: Record<string, CSSProperties> = {
  root: {
    display: 'grid',
    gap: 12,
    padding: 14,
    border: '1px solid color-mix(in srgb, var(--accent) 24%, var(--border))',
    borderRadius: 14,
    background: 'var(--surface, #fff)',
    color: 'var(--text, #18202a)',
  },
  heading: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },
  eyebrow: { margin: 0, color: 'var(--accent)', fontSize: 11, fontWeight: 750, letterSpacing: '.04em', textTransform: 'uppercase' },
  title: { margin: '3px 0 0', fontSize: 16, lineHeight: 1.2 },
  count: { color: 'var(--muted, #667085)', fontSize: 11, whiteSpace: 'nowrap' },
  progress: { width: '100%', height: 5, accentColor: 'var(--accent)' },
  list: { display: 'grid', gap: 7, margin: 0, padding: 0, listStyle: 'none' },
  step: { display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr)', gap: 9, alignItems: 'start', padding: 9, borderRadius: 10 },
  marker: { width: 26, height: 26, display: 'grid', placeItems: 'center', borderRadius: 13, fontSize: 11, fontWeight: 800 },
  stepTitle: { display: 'block', fontSize: 12, lineHeight: 1.25 },
  description: { display: 'block', marginTop: 3, color: 'var(--muted, #667085)', fontSize: 10, lineHeight: 1.45 },
  action: { minHeight: 38, justifySelf: 'start', marginTop: 8, padding: '0 13px', border: 0, borderRadius: 9, background: 'var(--accent)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' },
};

const stepBackground = (step: ClassroomProgressStep): CSSProperties => ({
  ...styles.step,
  background: step.state === 'current'
    ? 'color-mix(in srgb, var(--accent) 8%, transparent)'
    : step.state === 'attention'
      ? 'color-mix(in srgb, var(--warning, #f79009) 10%, transparent)'
      : 'transparent',
});

const markerStyle = (step: ClassroomProgressStep): CSSProperties => ({
  ...styles.marker,
  color: step.complete ? '#fff' : step.state === 'attention' ? 'var(--warning, #b54708)' : 'var(--muted, #667085)',
  background: step.complete
    ? 'var(--success, #16865b)'
    : step.state === 'current'
      ? 'color-mix(in srgb, var(--accent) 16%, var(--surface))'
      : step.state === 'attention'
        ? 'color-mix(in srgb, var(--warning, #f79009) 18%, var(--surface, #fff))'
        : 'var(--surface-2, #f2f4f7)',
});

export const ClassroomGuide = ({
  project,
  analysis = null,
  progress: suppliedProgress,
  compact = false,
  className = '',
  onChooseTool,
  onAnalyze,
}: ClassroomGuideProps) => {
  const progress = suppliedProgress ?? deriveClassroomProgress(project, analysis);
  const visibleSteps = compact ? [progress.currentStep] : progress.steps;
  const runAction = (step: ClassroomProgressStep) => {
    if (step.action.kind === 'tool') onChooseTool?.(step.action.tool);
    else onAnalyze?.();
  };

  return (
    <section className={className} style={styles.root} aria-labelledby="classroom-guide-title">
      <div style={styles.heading}>
        <div>
          <p style={styles.eyebrow}>Modo Aula</p>
          <h2 id="classroom-guide-title" style={styles.title}>Construye y comprueba</h2>
        </div>
        <span style={styles.count}>{progress.completedSteps} de {progress.steps.length}</span>
      </div>
      <progress
        style={styles.progress}
        value={progress.completedSteps}
        max={progress.steps.length}
        aria-label="Progreso del ejercicio"
      />
      <ol style={styles.list} aria-label="Pasos del ejercicio">
        {visibleSteps.map((step) => {
          const actionAvailable = step.action.kind === 'tool' ? Boolean(onChooseTool) : Boolean(onAnalyze);
          return (
            <li
              key={step.id}
              data-classroom-step={step.id}
              data-state={step.state}
              style={stepBackground(step)}
              aria-current={step.state === 'current' || step.state === 'attention' ? 'step' : undefined}
            >
              <span style={markerStyle(step)} aria-hidden="true">{step.complete ? '✓' : progress.steps.findIndex((candidate) => candidate.id === step.id) + 1}</span>
              <div>
                <strong style={styles.stepTitle}>{step.title}</strong>
                <span style={styles.description}>{step.description}</span>
                {!step.complete && actionAvailable ? (
                  <button type="button" style={styles.action} onClick={() => runAction(step)}>{step.action.label}</button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
};
