import { describe, expect, it } from 'vitest';
import { createDatasheetProject } from './datasheetFixtures';
import {
  MEMBER_COLUMNS,
  NODE_COLUMNS,
  applyDatasheetPipeline,
  datasheetFacets,
  datasheetRowSearchText,
  filterDatasheetRows,
  projectDatasheetRows,
  searchDatasheetRows,
  sortDatasheetRows,
  type DatasheetRow,
} from './datasheetModel';

const project = createDatasheetProject();
const nodeRows = projectDatasheetRows(project, 'nodes');
const memberRows = projectDatasheetRows(project, 'members');

const identity = (row: DatasheetRow) => row.id.toLowerCase();
const ids = (rows: readonly DatasheetRow[]) => rows.map((row) => row.id);

describe('datasheet projection', () => {
  it('projects one row per entity, in model order', () => {
    expect(ids(nodeRows)).toEqual(['N1', 'N2', 'N3']);
    expect(ids(memberRows)).toEqual(['M1', 'M2']);
  });

  it('keeps magnitudes in internal base units so sorting never depends on the unit system', () => {
    const member = memberRows[0].values.length;
    expect(member).toEqual({ kind: 'number', value: 4, quantity: 'length' });
    expect(nodeRows[2].values.x).toEqual({ kind: 'number', value: 6, quantity: 'length' });
  });

  it('names a catalog identity and refuses to invent one for custom properties', () => {
    expect(memberRows[0].values.material).toEqual({ kind: 'text', text: expect.stringContaining('A992') });
    expect(memberRows[0].values.section).toEqual({ kind: 'text', text: 'W12x26' });
    expect(memberRows[1].values.material).toMatchObject({ kind: 'token', token: 'custom' });
    expect(memberRows[1].values.section).toMatchObject({ kind: 'token', token: 'custom' });
  });

  it('summarises restraints in the language the solver uses', () => {
    expect(nodeRows[0].values.restraints).toEqual({ kind: 'text', text: 'X Y Rz' });
    expect(nodeRows[1].values.restraints).toEqual({ kind: 'text', text: '—' });
    expect(nodeRows[2].values.restraints).toEqual({ kind: 'text', text: 'n 90°' });
  });

  it('counts the loads that reach each object', () => {
    expect(nodeRows[2].values.loads).toEqual({ kind: 'number', value: 1 });
    expect(nodeRows[0].values.loads).toEqual({ kind: 'number', value: 0 });
    expect(memberRows[1].values.loads).toEqual({ kind: 'number', value: 1 });
  });

  it('shows a member with a missing end as having no length instead of NaN', () => {
    const broken = createDatasheetProject({
      members: [{ id: 'M9', i: 'N1', j: 'MISSING', type: 'frame', E: 1, A: 1, I: 1 }],
    });
    const rows = projectDatasheetRows(broken, 'members');
    expect(rows[0].values.length).toEqual({ kind: 'number', value: null, quantity: 'length' });
  });

  it('declares why every column is read-only', () => {
    expect(NODE_COLUMNS.find((column) => column.id === 'id')?.editability).toBe('identity');
    expect(NODE_COLUMNS.find((column) => column.id === 'x')?.editability).toBe('pending');
    expect(NODE_COLUMNS.find((column) => column.id === 'restraints')?.editability).toBe('derived');
    // Las referencias estructurales de una barra nunca se editan desde la tabla.
    expect(MEMBER_COLUMNS.find((column) => column.id === 'i')?.editability).toBe('identity');
    expect(MEMBER_COLUMNS.find((column) => column.id === 'j')?.editability).toBe('identity');
    expect(MEMBER_COLUMNS.find((column) => column.id === 'length')?.editability).toBe('derived');
  });
});

describe('datasheet search', () => {
  const haystack = (row: DatasheetRow) => datasheetRowSearchText(
    row,
    (key) => String(key),
    (value) => String(value),
  );

  it('returns every row for an empty query', () => {
    expect(ids(searchDatasheetRows(nodeRows, '   ', identity))).toEqual(['N1', 'N2', 'N3']);
  });

  it('matches by identifier', () => {
    expect(ids(searchDatasheetRows(nodeRows, 'n2', identity))).toEqual(['N2']);
  });

  it('ignores accents so a technical search does not require them', () => {
    const rows: DatasheetRow[] = [{ id: 'X1', kind: 'node', values: { id: { kind: 'text', text: 'Sección' } } }];
    expect(ids(searchDatasheetRows(rows, 'seccion', haystack))).toEqual(['X1']);
  });

  it('searches the presented text, including translated tokens', () => {
    const matches = searchDatasheetRows(nodeRows, 'datasheet.support.fixed', haystack);
    expect(ids(matches)).toEqual(['N1']);
  });
});

describe('datasheet facets', () => {
  it('offers only the facets that actually discriminate', () => {
    const facets = datasheetFacets(nodeRows, 'nodes');
    expect(facets).toHaveLength(1);
    expect(facets[0].columnId).toBe('support');
    expect(facets[0].options.map((option) => option.token)).toEqual(['none', 'roller', 'fixed']);
    expect(facets[0].options.every((option) => option.count === 1)).toBe(true);
  });

  it('hides a facet whose value is the same in every row', () => {
    const uniform = projectDatasheetRows(
      createDatasheetProject({
        nodes: [
          { id: 'A', x: 0, y: 0, support: { type: 'pin' } },
          { id: 'B', x: 1, y: 0, support: { type: 'pin' } },
        ],
        members: [],
      }),
      'nodes',
    );
    expect(datasheetFacets(uniform, 'nodes')).toEqual([]);
  });

  it('does not filter when a facet has no active token', () => {
    expect(ids(filterDatasheetRows(nodeRows, { support: new Set() }))).toEqual(['N1', 'N2', 'N3']);
  });

  it('keeps only the rows whose token is active', () => {
    expect(ids(filterDatasheetRows(nodeRows, { support: new Set(['fixed', 'roller']) }))).toEqual(['N1', 'N3']);
  });
});

describe('datasheet sorting', () => {
  it('leaves the model order when nothing is sorted', () => {
    expect(ids(sortDatasheetRows(nodeRows, null))).toEqual(['N1', 'N2', 'N3']);
  });

  it('compares numbers as numbers, not as text', () => {
    const rows = projectDatasheetRows(
      createDatasheetProject({
        nodes: [
          { id: 'A', x: 10, y: 0, support: { type: 'none' } },
          { id: 'B', x: 9, y: 0, support: { type: 'none' } },
          { id: 'C', x: 100, y: 0, support: { type: 'none' } },
        ],
        members: [],
      }),
      'nodes',
    );
    expect(ids(sortDatasheetRows(rows, { columnId: 'x', direction: 'asc' }))).toEqual(['B', 'A', 'C']);
    expect(ids(sortDatasheetRows(rows, { columnId: 'x', direction: 'desc' }))).toEqual(['C', 'A', 'B']);
  });

  it('keeps a missing value at the end in both directions', () => {
    const rows: DatasheetRow[] = [
      { id: 'A', kind: 'member', values: { length: { kind: 'number', value: 5 } } },
      { id: 'B', kind: 'member', values: { length: { kind: 'number', value: null } } },
      { id: 'C', kind: 'member', values: { length: { kind: 'number', value: 1 } } },
    ];
    expect(ids(sortDatasheetRows(rows, { columnId: 'length', direction: 'asc' }))).toEqual(['C', 'A', 'B']);
    expect(ids(sortDatasheetRows(rows, { columnId: 'length', direction: 'desc' }))).toEqual(['A', 'C', 'B']);
  });

  it('sorts tokens by their stable key, never by the active translation', () => {
    const rows = sortDatasheetRows(nodeRows, { columnId: 'support', direction: 'asc' });
    expect(ids(rows)).toEqual(['N1', 'N2', 'N3']);
  });

  it('is stable: equal values keep the model order', () => {
    const rows: DatasheetRow[] = ['A', 'B', 'C'].map((id) => ({
      id,
      kind: 'node' as const,
      values: { support: { kind: 'token' as const, token: 'pin', labelKey: 'datasheet.support.pin' as const } },
    }));
    expect(ids(sortDatasheetRows(rows, { columnId: 'support', direction: 'desc' }))).toEqual(['A', 'B', 'C']);
  });
});

describe('datasheet pipeline', () => {
  it('searches, then filters, then sorts', () => {
    const result = applyDatasheetPipeline({
      rows: nodeRows,
      query: 'n',
      filters: { support: new Set(['fixed', 'roller']) },
      sort: { columnId: 'x', direction: 'desc' },
      haystack: identity,
    });
    expect(ids(result)).toEqual(['N3', 'N1']);
  });

  it('never mutates the rows it receives', () => {
    const before = ids(nodeRows);
    applyDatasheetPipeline({
      rows: nodeRows,
      query: '',
      filters: {},
      sort: { columnId: 'x', direction: 'desc' },
      haystack: identity,
    });
    expect(ids(nodeRows)).toEqual(before);
  });
});
