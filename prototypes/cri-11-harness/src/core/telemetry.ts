/**
 * TelemetrySink local.
 *
 * Ni Segment, ni Amplitude, ni red. Un array en memoria que se puede descargar
 * como JSON. Es todo lo que CRI-11 necesita para comparar recorridos, y es el
 * único nivel de recolección que un laboratorio puede permitirse.
 *
 * NO SE REGISTRA NUNCA: nombres reales de proyecto, geometría del usuario,
 * cálculos reales, PII, contenido de modelo ni credenciales. Aquí no hay nada
 * de eso porque todo el contenido es fixture — y aun así la regla se declara,
 * porque el vocabulario de eventos es lo que sobrevivirá a este prototipo.
 */

export type TelemetryEventName =
  | 'task_started'
  | 'task_completed'
  | 'selection_committed'
  | 'selection_cleared'
  | 'command_invoked'
  | 'surface_opened'
  | 'surface_closed'
  | 'surface_peeked'
  | 'surface_suspended'
  | 'mode_changed'
  | 'layout_class_changed'
  | 'theme_changed'
  | 'locale_changed'
  | 'analysis_state_changed'
  | 'draft_opened'
  | 'draft_committed'
  | 'draft_cancelled'
  | 'perf_interaction'
  | 'long_task_observed';

export interface TelemetryEvent {
  event: TelemetryEventName;
  at: number;
  /** Ejes del harness en el momento del evento: sin esto un número no compara. */
  context: Record<string, string | number | boolean | null>;
  payload?: Record<string, string | number | boolean | null>;
}

const MAX_EVENTS = 2000;

let events: TelemetryEvent[] = [];
let listeners: (() => void)[] = [];
let contextProvider: () => Record<string, string | number | boolean | null> = () => ({});

const notify = () => {
  for (const listener of listeners) listener();
};

export const setTelemetryContext = (provider: () => Record<string, string | number | boolean | null>) => {
  contextProvider = provider;
};

export const record = (
  event: TelemetryEventName,
  payload?: Record<string, string | number | boolean | null>,
): void => {
  events = [...events.slice(-(MAX_EVENTS - 1)), { event, at: Math.round(performance.now()), context: contextProvider(), payload }];
  notify();
};

export const subscribe = (listener: () => void): (() => void) => {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((item) => item !== listener);
  };
};

export const snapshot = (): TelemetryEvent[] => events;

export const reset = (): void => {
  events = [];
  notify();
};

export const exportJson = (): string =>
  JSON.stringify(
    {
      harness: 'structureco-cri-11-fase-a',
      note: 'Eventos locales de un prototipo con datos de fixture. No contienen modelo ni datos de usuario.',
      exportedAt: new Date().toISOString(),
      events,
    },
    null,
    2,
  );

export const download = (): void => {
  const blob = new Blob([exportJson()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `cri-11-telemetry-${Date.now()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
};

/**
 * Coste de una interacción concreta, medido de verdad. `INP` mide lo que el
 * navegador ve; esto mide lo que nosotros pedimos: desde el gesto hasta que el
 * siguiente frame se pintó.
 */
export const measureInteraction = (label: string, work: () => void): void => {
  const started = performance.now();
  work();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      record('perf_interaction', { label, durationMs: Math.round((performance.now() - started) * 100) / 100 });
    });
  });
};

/** Tareas largas: cualquier cosa >50 ms durante una interacción crítica se investiga. */
export const observeLongTasks = (): (() => void) => {
  if (typeof PerformanceObserver === 'undefined') return () => {};
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        record('long_task_observed', { durationMs: Math.round(entry.duration), startTime: Math.round(entry.startTime) });
      }
    });
    observer.observe({ entryTypes: ['longtask'] });
    return () => observer.disconnect();
  } catch {
    // Firefox y WebKit no exponen `longtask`. La ausencia de datos es un dato:
    // se declara en el reporte en vez de fingir cobertura.
    return () => {};
  }
};
