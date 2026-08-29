import type { ProjectModel } from '../types';

export type DiffEntityKind = 'node' | 'member' | 'nodalLoad' | 'memberLoad' | 'prescribedDisplacement' | 'memberInitialEffect' | 'loadCase' | 'combination' | 'settings';
export type DiffChangeKind = 'added' | 'removed' | 'modified';
export interface DiffFieldChange { field: string; before: unknown; after: unknown; }
export interface DiffChange { kind: DiffEntityKind; id: string; change: DiffChangeKind; fields: DiffFieldChange[]; }
export interface ProjectDiff { changes: DiffChange[]; summary: Record<DiffChangeKind, number>; identical: boolean; }
/** Por defecto el diff es exacto; una tolerancia sólo se usa cuando el llamador la declara. */
export interface DiffOptions { numericTolerance?: number; }

const COLLECTIONS = [
  ['node', 'nodes'], ['member', 'members'], ['nodalLoad', 'nodalLoads'], ['memberLoad', 'memberLoads'],
  ['prescribedDisplacement', 'prescribedDisplacements'], ['memberInitialEffect', 'memberInitialEffects'],
  ['loadCase', 'loadCases'], ['combination', 'combinations'],
] as const;
type Identified = { id: string };

const sameNumber = (before: number, after: number, tolerance: number): boolean => {
  if (Object.is(before, after)) return true;
  if (!Number.isFinite(before) || !Number.isFinite(after)) return false;
  return tolerance <= 0 ? before === after : Math.abs(before - after) <= tolerance * Math.max(Math.abs(before), Math.abs(after), 1);
};

const sameValue = (before: unknown, after: unknown, tolerance: number): boolean => {
  if (before === after) return true;
  if (before === undefined || after === undefined) return before === undefined && after === undefined;
  if (typeof before === 'number' && typeof after === 'number') return sameNumber(before, after, tolerance);
  if (Array.isArray(before) && Array.isArray(after)) return before.length === after.length && before.every((value, index) => sameValue(value, after[index], tolerance));
  if (typeof before === 'object' && before !== null && typeof after === 'object' && after !== null) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    return [...keys].every((key) => sameValue((before as Record<string, unknown>)[key], (after as Record<string, unknown>)[key], tolerance));
  }
  return false;
};

const changedFields = (before: object, after: object, tolerance: number): DiffFieldChange[] =>
  [...new Set([...Object.keys(before), ...Object.keys(after)])].sort().flatMap((field) => {
    if (field === 'id') return [];
    const previous = (before as Record<string, unknown>)[field];
    const next = (after as Record<string, unknown>)[field];
    return sameValue(previous, next, tolerance) ? [] : [{ field, before: previous, after: next }];
  });

/** Diferencia determinista de modelos normalizados, sin inferir unidades ni significado físico. */
export const diffProjects = (before: ProjectModel, after: ProjectModel, options: DiffOptions = {}): ProjectDiff => {
  const tolerance = options.numericTolerance ?? 0;
  const changes: DiffChange[] = [];
  for (const [kind, collection] of COLLECTIONS) {
    const previous = (before[collection] ?? []) as readonly Identified[];
    const next = (after[collection] ?? []) as readonly Identified[];
    const previousById = new Map(previous.map((item) => [item.id, item]));
    const nextById = new Map(next.map((item) => [item.id, item]));
    for (const item of next) {
      const old = previousById.get(item.id);
      if (!old) { changes.push({ kind, id: item.id, change: 'added', fields: [] }); continue; }
      const fields = changedFields(old, item, tolerance);
      if (fields.length) changes.push({ kind, id: item.id, change: 'modified', fields });
    }
    for (const item of previous) if (!nextById.has(item.id)) changes.push({ kind, id: item.id, change: 'removed', fields: [] });
  }
  const settings = changedFields(before.settings, after.settings, tolerance);
  if (settings.length) changes.push({ kind: 'settings', id: 'settings', change: 'modified', fields: settings });
  const summary: Record<DiffChangeKind, number> = { added: 0, removed: 0, modified: 0 };
  changes.forEach((change) => { summary[change.change] += 1; });
  return { changes, summary, identical: changes.length === 0 };
};
