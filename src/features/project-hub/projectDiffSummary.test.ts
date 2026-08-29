import { describe, expect, it } from 'vitest';
import type { DiffChange, ProjectDiff } from '../../data/projectDiff';
import { diffCounts, formatDiffValue, groupChangesByKind, limitChanges } from './projectDiffSummary';

const change = (kind: DiffChange['kind'], id: string): DiffChange => ({ kind, id, change: 'modified', fields: [] });
const diff = (changes: DiffChange[]): ProjectDiff => ({ changes, summary: { added: 0, removed: 0, modified: changes.length }, identical: !changes.length });
const labels = { absent: 'ausente', yes: 'sí', no: 'no' };

describe('project diff summary', () => {
  it('groups entities in model reading order and stabilizes ids', () => {
    const groups = groupChangesByKind(diff([change('combination', 'C1'), change('node', 'N10'), change('node', 'N2'), change('member', 'M1')]));
    expect(groups.map((group) => group.kind)).toEqual(['node', 'member', 'combination']);
    expect(groups[0]?.changes.map((item) => item.id)).toEqual(['N10', 'N2']);
  });

  it('keeps the count order fixed and omits zeroes', () => {
    expect(diffCounts({ changes: [], summary: { added: 2, removed: 0, modified: 1 }, identical: false }))
      .toEqual([{ change: 'added', count: 2 }, { change: 'modified', count: 1 }]);
  });

  it('formats values for reading without changing their meaning', () => {
    expect(formatDiffValue(undefined, labels)).toBe('ausente');
    expect(formatDiffValue(true, labels)).toBe('sí');
    expect(formatDiffValue(0.3, labels)).toBe('0.3');
    expect(formatDiffValue(Number.POSITIVE_INFINITY, labels)).toBe('∞');
  });

  it('reports changes hidden by the rendering limit', () => {
    expect(limitChanges([1, 2, 3], 2)).toEqual({ shown: [1, 2], hidden: 1 });
  });
});
