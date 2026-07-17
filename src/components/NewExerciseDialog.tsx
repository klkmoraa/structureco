import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  classroomExerciseTemplates,
  getClassroomExerciseTemplate,
  type ClassroomDifficulty,
  type ClassroomExerciseParameters,
  type ClassroomExerciseTemplateId,
} from '../education/exerciseTemplates';
import type { ProjectModel } from '../types';

export interface NewExerciseDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (project: ProjectModel) => void;
  initialTemplateId?: ClassroomExerciseTemplateId;
}

const difficultyLabels: Record<ClassroomDifficulty, string> = {
  basic: 'Básico',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
};

const styles: Record<string, CSSProperties> = {
  backdrop: { position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 'max(18px, env(safe-area-inset-top)) max(18px, env(safe-area-inset-right)) max(18px, env(safe-area-inset-bottom)) max(18px, env(safe-area-inset-left))', background: 'rgba(10, 16, 28, .48)', backdropFilter: 'blur(8px)' },
  dialog: { width: 'min(880px, 100%)', maxWidth: 'calc(100vw - max(18px, env(safe-area-inset-left)) - max(18px, env(safe-area-inset-right)))', maxHeight: 'min(760px, calc(100dvh - max(18px, env(safe-area-inset-top)) - max(18px, env(safe-area-inset-bottom))))', overflowX: 'hidden', overflowY: 'auto', overscrollBehavior: 'contain', scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', border: '1px solid var(--border, #d8dde5)', borderRadius: 20, background: 'var(--surface, #fff)', color: 'var(--text, #18202a)', boxShadow: '0 24px 80px rgba(0, 0, 0, .24)' },
  header: { position: 'sticky', top: 0, zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 16, padding: '20px 22px 16px', borderBottom: '1px solid var(--border, #d8dde5)', background: 'var(--surface, #fff)' },
  eyebrow: { margin: 0, color: 'var(--accent)', fontSize: 11, fontWeight: 750, letterSpacing: '.05em', textTransform: 'uppercase' },
  title: { margin: '4px 0 0', fontSize: 22, letterSpacing: '-.025em' },
  subtitle: { margin: '6px 0 0', color: 'var(--muted, #667085)', fontSize: 12, lineHeight: 1.45 },
  close: { width: 44, height: 44, minWidth: 44, minHeight: 44, flex: '0 0 auto', border: 0, borderRadius: 12, background: 'var(--surface-2, #f2f4f7)', color: 'inherit', fontSize: 22, cursor: 'pointer' },
  form: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: 20, padding: 22 },
  chooser: { display: 'grid', alignContent: 'start', gap: 9 },
  sectionTitle: { margin: '0 0 3px', fontSize: 12 },
  template: { width: '100%', minHeight: 70, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 12, alignItems: 'center', padding: '12px 13px', border: '1px solid var(--border, #d8dde5)', borderRadius: 12, background: 'var(--surface, #fff)', color: 'inherit', textAlign: 'left', cursor: 'pointer' },
  templateCopy: { display: 'grid', gap: 4 },
  templateName: { fontSize: 13 },
  templateDescription: { color: 'var(--muted, #667085)', fontSize: 10, lineHeight: 1.4 },
  badgeRow: { display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 3 },
  badge: { padding: '3px 6px', borderRadius: 999, background: 'var(--surface-2, #f2f4f7)', color: 'var(--muted, #667085)', fontSize: 9 },
  radio: { width: 18, height: 18, display: 'grid', placeItems: 'center', border: '1px solid var(--border, #aab2c0)', borderRadius: 9 },
  settings: { alignSelf: 'start', display: 'grid', gap: 14, padding: 16, border: '1px solid var(--border, #d8dde5)', borderRadius: 14, background: 'var(--surface-2, #f7f8fa)' },
  field: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(130px, .72fr)', alignItems: 'center', gap: 10, color: 'var(--muted, #667085)', fontSize: 11 },
  inputWrap: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', border: '1px solid var(--border, #cfd5df)', borderRadius: 9, background: 'var(--surface, #fff)', overflow: 'hidden' },
  input: { width: '100%', minWidth: 0, minHeight: 42, padding: '0 9px', border: 0, background: 'transparent', color: 'var(--text, #18202a)', font: 'inherit' },
  unit: { padding: '0 9px', color: 'var(--muted, #667085)', fontSize: 9 },
  note: { margin: 0, color: 'var(--muted, #667085)', fontSize: 10, lineHeight: 1.5 },
  submit: { minHeight: 46, marginTop: 2, border: 0, borderRadius: 11, background: 'var(--accent)', color: 'var(--accent-foreground, #fff)', fontSize: 12, fontWeight: 750, cursor: 'pointer' },
};

const selectedTemplateStyle: CSSProperties = {
  ...styles.template,
  border: '1px solid var(--accent)',
  background: 'color-mix(in srgb, var(--accent) 7%, var(--surface))',
};

const selectedRadioStyle: CSSProperties = {
  ...styles.radio,
  border: '5px solid var(--accent)',
};

const initialParameters = (templateId: ClassroomExerciseTemplateId) => ({
  ...getClassroomExerciseTemplate(templateId).defaults,
});

export const NewExerciseDialog = ({
  open,
  onClose,
  onCreate,
  initialTemplateId = 'blank',
}: NewExerciseDialogProps) => {
  const [templateId, setTemplateId] = useState<ClassroomExerciseTemplateId>(initialTemplateId);
  const [parameters, setParameters] = useState<Partial<ClassroomExerciseParameters>>(() => initialParameters(initialTemplateId));
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const template = getClassroomExerciseTemplate(templateId);

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    setTemplateId(initialTemplateId);
    setParameters(initialParameters(initialTemplateId));
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusHandle = window.requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLElement>('button, input')?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusHandle);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      if (previousFocus?.isConnected) window.requestAnimationFrame(() => previousFocus.focus());
    };
  }, [initialTemplateId, open]);

  if (!open) return null;

  const chooseTemplate = (id: ClassroomExerciseTemplateId) => {
    setTemplateId(id);
    setParameters(initialParameters(id));
  };

  const onTemplateKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index;
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') nextIndex = (index - 1 + classroomExerciseTemplates.length) % classroomExerciseTemplates.length;
    else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') nextIndex = (index + 1) % classroomExerciseTemplates.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = classroomExerciseTemplates.length - 1;
    else return;
    event.preventDefault();
    const next = classroomExerciseTemplates[nextIndex];
    chooseTemplate(next.id);
    window.requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLButtonElement>(`[data-template-id="${next.id}"]`)?.focus());
  };

  return (
    <div
      className="new-exercise-backdrop"
      style={styles.backdrop}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div ref={dialogRef} className="new-exercise-dialog" role="dialog" aria-modal="true" aria-labelledby="new-exercise-title" style={styles.dialog}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>Modo Aula</p>
            <h2 id="new-exercise-title" style={styles.title}>Nuevo ejercicio</h2>
            <p style={styles.subtitle}>Empieza desde cero o genera un modelo con geometría, apoyos y una carga editable.</p>
          </div>
          <button type="button" aria-label="Cerrar" style={styles.close} onClick={onClose}>×</button>
        </header>
        <form
          style={styles.form}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            onCreate(template.build(parameters));
          }}
        >
          <div style={styles.chooser} role="radiogroup" aria-label="Tipo de ejercicio">
            <h3 style={styles.sectionTitle}>Elige una base</h3>
            {classroomExerciseTemplates.map((candidate, index) => {
              const selected = candidate.id === templateId;
              return (
                <button
                  key={candidate.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  tabIndex={selected ? 0 : -1}
                  data-template-id={candidate.id}
                  className="new-exercise-template"
                  style={selected ? selectedTemplateStyle : styles.template}
                  onClick={() => chooseTemplate(candidate.id)}
                  onKeyDown={(event) => onTemplateKeyDown(event, index)}
                >
                  <span style={styles.templateCopy}>
                    <strong style={styles.templateName}>{candidate.name}</strong>
                    <span style={styles.templateDescription}>{candidate.description}</span>
                    <span style={styles.badgeRow}>
                      <span style={styles.badge}>{difficultyLabels[candidate.difficulty]}</span>
                      <span style={styles.badge}>{candidate.durationMinutes} min</span>
                      {candidate.topics.slice(0, 2).map((topic) => <span key={topic} style={styles.badge}>{topic}</span>)}
                    </span>
                  </span>
                  <span style={selected ? selectedRadioStyle : styles.radio} aria-hidden="true" />
                </button>
              );
            })}
          </div>
          <section style={styles.settings} aria-labelledby="exercise-parameters-title">
            <h3 id="exercise-parameters-title" style={styles.sectionTitle}>Datos esenciales</h3>
            {template.fields.length ? template.fields.map((field) => (
              <label key={field.key} style={styles.field}>
                <span>{field.label}</span>
                <span className="new-exercise-input-wrap" style={styles.inputWrap}>
                  <input
                    className="new-exercise-input"
                    style={styles.input}
                    aria-label={field.label}
                    type="number"
                    inputMode="decimal"
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    required
                    value={parameters[field.key] ?? ''}
                    onChange={(event) => {
                      const value = event.currentTarget.valueAsNumber;
                      setParameters((current) => {
                        const next = { ...current };
                        if (Number.isFinite(value)) next[field.key] = value;
                        else delete next[field.key];
                        return next;
                      });
                    }}
                  />
                  <small style={styles.unit}>{field.unit}</small>
                </span>
              </label>
            )) : <p style={styles.note}>El proyecto se abrirá vacío. La guía te indicará cuándo agregar nodos, miembros, apoyos y cargas.</p>}
            <p style={styles.note}>Las propiedades mecánicas se asignan internamente. Puedes concentrarte en equilibrio, reacciones y diagramas N–V–M.</p>
            <button className="new-exercise-submit" type="submit" style={styles.submit}>Crear ejercicio</button>
          </section>
        </form>
      </div>
    </div>
  );
};
