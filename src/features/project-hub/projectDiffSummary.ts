import type { DiffChange, DiffChangeKind, DiffEntityKind, ProjectDiff } from '../../data/projectDiff';
import { formatSignificant } from '../../utils/numberFormat';

/** Orden de lectura del modelo: geometría, barras, cargas y ajustes. */
export const DIFF_ENTITY_ORDER: readonly DiffEntityKind[] = [
  'node', 'member', 'nodalLoad', 'memberLoad', 'prescribedDisplacement',
  'memberInitialEffect', 'loadCase', 'combination', 'settings',
];

export const diffCounts = (diff: ProjectDiff): Array<{ change: DiffChangeKind; count: number }> =>
  (['added', 'modified', 'removed'] as const)
    .map((change) => ({ change, count: diff.summary[change] }))
    .filter((entry) => entry.count > 0);

export interface DiffGroup { kind: DiffEntityKind; changes: DiffChange[]; }

/** Agrupa sin recalcular el diff y estabiliza el orden visible por entidad e id. */
export const groupChangesByKind = (diff: ProjectDiff): DiffGroup[] => {
  const groups = new Map<DiffEntityKind, DiffChange[]>();
  diff.changes.forEach((change) => {
    const group = groups.get(change.kind);
    if (group) group.push(change); else groups.set(change.kind, [change]);
  });
  return DIFF_ENTITY_ORDER.filter((kind) => groups.has(kind)).map((kind) => ({
    kind, changes: [...groups.get(kind)!].sort((first, second) => first.id.localeCompare(second.id)),
  }));
};

export interface DiffValueLabels { absent: string; yes: string; no: string; }
const MAX_TEXT_LENGTH = 48;

/** Convierte valores sólo para lectura: no deduce magnitudes ni escribe al modelo. */
export const formatDiffValue = (value: unknown, labels: DiffValueLabels): string => {
  if (value === undefined || value === null) return labels.absent;
  if (typeof value === 'boolean') return value ? labels.yes : labels.no;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return Number.isNaN(value) ? 'NaN' : value > 0 ? '∞' : '−∞';
    return formatSignificant(value, 6);
  }
  const text = typeof value === 'string' ? value : JSON.stringify(value) ?? String(value);
  return text.length > MAX_TEXT_LENGTH ? `${text.slice(0, MAX_TEXT_LENGTH)}…` : text;
};

export const limitChanges = <T,>(changes: readonly T[], max: number): { shown: T[]; hidden: number } => {
  const limit = Math.max(0, max);
  return { shown: changes.slice(0, limit), hidden: Math.max(0, changes.length - limit) };
};
