export const LOCAL_METRICS_STORAGE_KEY = 'structureCo.local-product-metrics.v1';

export type LocalMetricName =
  | 'start_blank' | 'start_template' | 'start_aula' | 'canvas_ready'
  | 'doctor_opened' | 'doctor_issue_actioned' | 'doctor_action_started' | 'doctor_action_completed'
  | 'analysis_started' | 'results_drawer_expanded' | 'first_result_understood' | 'result_view_opened' | 'value_located' | 'diagram_label_mode'
  | 'conflict_detected' | 'recovery_opened' | 'recovery_decision' | 'recovery_abandoned'
  | 'command_search_empty' | 'inspector_layout_changed' | 'bridge_2d_3d_blocker_seen' | 'bridge_2d_3d_blocker_completed';

export type LocalMetricRoute = 'blank' | 'template' | 'aula';

export interface LocalMetricEvent {
  version: 1;
  name: LocalMetricName;
  at: string;
  route?: LocalMetricRoute;
  /** Enumerated product or diagnostic code only; never user/model text. */
  code?: string;
  /** Aggregate only; enables recovery discrepancy diagnostics without model data. */
  entityDelta?: number;
  /** Rounded age of a recovery when the user made a decision. */
  recoveryAgeMinutes?: number;
}

export interface LocalMetricsStore {
  version: 1;
  optIn: boolean;
  events: LocalMetricEvent[];
}

export interface MetricsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const EMPTY: LocalMetricsStore = { version: 1, optIn: false, events: [] };
const MAX_EVENTS = 500;

const isName = (value: unknown): value is LocalMetricName => typeof value === 'string' && [
  'start_blank', 'start_template', 'start_aula', 'canvas_ready',
  'doctor_opened', 'doctor_issue_actioned', 'doctor_action_started', 'doctor_action_completed',
  'analysis_started', 'results_drawer_expanded', 'first_result_understood', 'result_view_opened', 'value_located', 'diagram_label_mode',
  'conflict_detected', 'recovery_opened', 'recovery_decision', 'recovery_abandoned',
  'command_search_empty', 'inspector_layout_changed', 'bridge_2d_3d_blocker_seen', 'bridge_2d_3d_blocker_completed',
].includes(value);

const read = (storage: MetricsStorage): LocalMetricsStore => {
  try {
    const parsed = JSON.parse(storage.getItem(LOCAL_METRICS_STORAGE_KEY) ?? '') as Partial<LocalMetricsStore>;
    if (parsed.version !== 1 || typeof parsed.optIn !== 'boolean' || !Array.isArray(parsed.events)) return { ...EMPTY };
    const events = parsed.events.filter((event): event is LocalMetricEvent => Boolean(event) && event.version === 1 && isName(event.name) && typeof event.at === 'string' && (event.route === undefined || ['blank', 'template', 'aula'].includes(event.route)) && (event.code === undefined || typeof event.code === 'string') && (event.entityDelta === undefined || Number.isFinite(event.entityDelta)) && (event.recoveryAgeMinutes === undefined || Number.isFinite(event.recoveryAgeMinutes)));
    return { version: 1, optIn: parsed.optIn, events: events.slice(-MAX_EVENTS) };
  } catch { return { ...EMPTY }; }
};

const write = (storage: MetricsStorage, store: LocalMetricsStore) => storage.setItem(LOCAL_METRICS_STORAGE_KEY, JSON.stringify(store));

export const getLocalMetrics = (storage: MetricsStorage): LocalMetricsStore => read(storage);

export const setLocalMetricsOptIn = (storage: MetricsStorage, optIn: boolean): LocalMetricsStore => {
  const next = { ...read(storage), optIn };
  write(storage, next);
  return next;
};

export const recordLocalMetric = (storage: MetricsStorage, event: Omit<LocalMetricEvent, 'version' | 'at'>, at = new Date().toISOString()): LocalMetricsStore => {
  const current = read(storage);
  if (!current.optIn || !isName(event.name)) return current;
  const recorded: LocalMetricEvent = {
    version: 1,
    name: event.name,
    at,
    ...(event.route ? { route: event.route } : {}),
    ...(event.code ? { code: event.code } : {}),
    ...(Number.isFinite(event.entityDelta) ? { entityDelta: event.entityDelta } : {}),
    ...(Number.isFinite(event.recoveryAgeMinutes) ? { recoveryAgeMinutes: event.recoveryAgeMinutes } : {}),
  };
  const next: LocalMetricsStore = { ...current, events: [...current.events, recorded].slice(-MAX_EVENTS) };
  write(storage, next);
  return next;
};

export const clearLocalMetrics = (storage: MetricsStorage): LocalMetricsStore => {
  const next = { ...read(storage), events: [] };
  write(storage, next);
  return next;
};

export const localMetricsSummary = (events: readonly LocalMetricEvent[]) => ({
  total: events.length,
  activation: events.filter((event) => event.name === 'analysis_started').length,
  understood: events.filter((event) => event.name === 'first_result_understood').length,
  doctorActions: events.filter((event) => event.name === 'doctor_action_completed').length,
  recoveryDecisions: events.filter((event) => event.name === 'recovery_decision').length,
});

/** Local-only aggregates for the CRI-140 recovery health diagnostic. */
export const localRecoveryMetrics = (events: readonly LocalMetricEvent[]) => {
  const opened = events.filter((event) => event.name === 'recovery_opened').length;
  const decisions = events.filter((event) => event.name === 'recovery_decision');
  const abandoned = events.filter((event) => event.name === 'recovery_abandoned').length;
  const deltas = decisions.map((event) => event.entityDelta).filter((value): value is number => typeof value === 'number');
  const ages = decisions.map((event) => event.recoveryAgeMinutes).filter((value): value is number => typeof value === 'number');
  return {
    opened,
    decisions: decisions.length,
    abandoned,
    decisionRate: opened === 0 ? null : decisions.length / opened,
    averageEntityDelta: deltas.length ? deltas.reduce((total, value) => total + value, 0) / deltas.length : null,
    averageDecisionMinutes: ages.length ? ages.reduce((total, value) => total + value, 0) / ages.length : null,
  };
};

/** A user-controlled diagnostic export; callers decide how (or whether) to download it. */
export const exportLocalMetrics = (storage: MetricsStorage): string => JSON.stringify({
  exportedAt: new Date().toISOString(),
  scope: 'local-only',
  ...read(storage),
}, null, 2);
