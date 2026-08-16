/**
 * Datos densos · `drawer` en X2/M1, `fullscreen` en K0.
 *
 * Fase A ya resolvía dos contratos: `peek` en vez de cerrar al localizar
 * (D-11), y fila↔objeto compartiendo la misma selección del lienzo. Fase B
 * añade lo que CRI-11 §7/§9 pide y CRI-8 nombra como DAT-03/DAT-09: cambiar de
 * entidad (nudos/miembros/cargas), ordenar por columna, y una pestaña de
 * Resumen con reacciones (RES-01/02) — sacada de Results por D-03, invocada
 * aquí, nunca residente.
 *
 * La casilla de cada fila es también la ruta de selección múltiple para
 * quien usa táctil: el lienzo no ofrece marco de selección en táctil en esta
 * fase (ver informe), así que ésta es la puerta real a INS-04/bulk edit desde
 * un dedo.
 *
 * Sin virtualización: se mide primero. El fixture grande (2 084 entidades) es
 * la carga de trabajo que decide si hace falta, no una moda.
 */

import { useMemo } from 'react';
import type { FixtureAnalysis } from '../core/analysis';
import { sectionById, materialById, type FixtureLoad, type FixtureMember, type FixtureNode } from '../core/fixtures';
import { SUPPORT_LABEL_KEY, type Translate } from '../core/i18n';
import type { EffectiveModel } from '../core/model';
import { measureInteraction } from '../core/telemetry';
import type { EntityTab, SelectionRef } from '../state/PrototypeStore';
import { useActions, usePrototype } from '../state/PrototypeStore';

const format = (value: number, digits = 2) =>
  value.toLocaleString('es-MX', { minimumFractionDigits: digits, maximumFractionDigits: digits });

const ENTITY_TABS: EntityTab[] = ['member', 'node', 'load'];
const ENTITY_KEY = { member: 'dense.entity.member', node: 'dense.entity.node', load: 'dense.entity.load' } as const;

export const DenseSurface = () => {
  const { state, derived } = usePrototype();
  const { dispatch, selectOne, toggleSelect, peekSurface, closeSurface, invoke } = useActions();
  const { t, composition, model } = derived;
  const essential = state.axes.mode === 'essential';
  const spanish = state.axes.locale === 'es-MX';
  const result = state.analysis.result;
  const { entity, sortKey, sortDir, tab } = state.dense;

  const toggleSort = (key: string) => {
    if (sortKey === key) dispatch({ type: 'dense/filter', patch: { sortDir: sortDir === 'asc' ? 'desc' : 'asc' } });
    else dispatch({ type: 'dense/filter', patch: { sortKey: key, sortDir: 'asc' } });
  };

  const sortArrow = (key: string) => (sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '');

  const memberRows = useMemo(() => {
    const query = state.dense.query.trim().toUpperCase();
    let rows = model.members.filter((member) => {
      if (state.dense.onlySelection && !state.selection.some((ref) => ref.kind === 'member' && ref.id === member.id)) return false;
      if (!query) return true;
      return member.id.toUpperCase().includes(query) || (member.label ?? '').toUpperCase().includes(query);
    });
    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        const va = sortValue(a, sortKey, model, result);
        const vb = sortValue(b, sortKey, model, result);
        const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return rows;
  }, [model, state.dense, state.selection, sortKey, sortDir, result]);

  const nodeRows = useMemo(() => {
    const query = state.dense.query.trim().toUpperCase();
    let rows = model.nodes.filter((node) => {
      if (state.dense.onlySelection && !state.selection.some((ref) => ref.kind === 'node' && ref.id === node.id)) return false;
      if (!query) return true;
      return node.id.toUpperCase().includes(query);
    });
    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        const va = sortKey === 'x' ? a.x : sortKey === 'y' ? a.y : sortKey === 'support' ? a.support : a.id;
        const vb = sortKey === 'x' ? b.x : sortKey === 'y' ? b.y : sortKey === 'support' ? b.support : b.id;
        const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return rows;
  }, [model, state.dense, state.selection, sortKey, sortDir]);

  const loadRows = useMemo(() => {
    const query = state.dense.query.trim().toUpperCase();
    return model.loads.filter((load) => !query || load.id.toUpperCase().includes(query) || load.target.toUpperCase().includes(query));
  }, [model, state.dense.query]);

  const rowCount = entity === 'member' ? memberRows.length : entity === 'node' ? nodeRows.length : loadRows.length;

  return (
    <section className="pt-dense" data-composition={composition} aria-label={t('dense.title')}>
      <header className="pt-dense__head">
        <div className="pt-dense__title">
          <h2 className="pt-detail__title">{t('dense.title')}</h2>
          <div className="pt-segmented pt-segmented--tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'model'} data-active={tab === 'model' || undefined} onClick={() => dispatch({ type: 'dense/filter', patch: { tab: 'model' } })}>
              {t('dense.tab.model')}
            </button>
            <button type="button" role="tab" aria-selected={tab === 'summary'} data-active={tab === 'summary' || undefined} onClick={() => dispatch({ type: 'dense/filter', patch: { tab: 'summary' } })}>
              {t('dense.tab.summary')}
            </button>
          </div>
          <span className="pt-tag pt-tag--fixture" data-fixture="true">
            {t('canvas.fixture')}
          </span>
        </div>
        <button type="button" className="sc-icon-button sc-icon-button--ghost sc-icon-button--sm" aria-label={t('surface.close')} onClick={() => closeSurface('dense')}>
          ✕
        </button>
      </header>

      {tab === 'model' ? (
        <>
          <div className="pt-dense__tools">
            <div className="pt-segmented" role="group" aria-label={t('dense.tab.model')}>
              {ENTITY_TABS.map((id) => (
                <button
                  key={id}
                  type="button"
                  data-active={entity === id || undefined}
                  aria-pressed={entity === id}
                  onClick={() => dispatch({ type: 'dense/filter', patch: { entity: id, sortKey: null } })}
                >
                  {t(ENTITY_KEY[id])}
                </button>
              ))}
            </div>
            <span className="pt-dense__count">
              {rowCount.toLocaleString('es-MX')} {t('dense.rows')}
            </span>
            <label className="pt-field pt-field--inline">
              <span className="pt-field__label">{t('dense.search')}</span>
              <input
                className="pt-field__control"
                type="search"
                placeholder={t('dense.searchPlaceholder')}
                value={state.dense.query}
                onChange={(event) => {
                  const query = event.target.value;
                  measureInteraction('dense.search', () => dispatch({ type: 'dense/filter', patch: { query } }));
                }}
              />
            </label>
            {entity !== 'load' ? (
              <button
                type="button"
                className="pt-chip pt-chip--toggle"
                data-active={state.dense.onlySelection || undefined}
                aria-pressed={state.dense.onlySelection}
                onClick={() => dispatch({ type: 'dense/filter', patch: { onlySelection: !state.dense.onlySelection } })}
              >
                {t('dense.onlySelection')}
              </button>
            ) : null}
          </div>

          <p className="pt-note">{t('dense.locateHint')}</p>

          <div className="pt-dense__scroll">
            {entity === 'member' ? (
              <MemberTable
                rows={memberRows}
                model={model}
                essential={essential}
                result={result}
                selection={state.selection}
                onSort={toggleSort}
                sortArrow={sortArrow}
                onRowClick={(id, shift) => (shift ? toggleSelect({ kind: 'member', id }) : selectOne({ kind: 'member', id }))}
                onLocate={(id) => {
                  invoke('selection.locate', 'row');
                  measureInteraction('dense.locate', () => {
                    selectOne({ kind: 'member', id });
                    peekSurface('dense');
                  });
                }}
                t={t}
              />
            ) : entity === 'node' ? (
              <NodeTable
                rows={nodeRows}
                selection={state.selection}
                onSort={toggleSort}
                sortArrow={sortArrow}
                onRowClick={(id, shift) => (shift ? toggleSelect({ kind: 'node', id }) : selectOne({ kind: 'node', id }))}
                onLocate={(id) => {
                  invoke('selection.locate', 'row');
                  measureInteraction('dense.locate', () => {
                    selectOne({ kind: 'node', id });
                    peekSurface('dense');
                  });
                }}
                t={t}
              />
            ) : (
              <LoadTable rows={loadRows} t={t} spanish={spanish} />
            )}
          </div>
        </>
      ) : (
        <ReactionsSummary result={result} t={t} essential={essential} />
      )}
    </section>
  );
};

// ---------------------------------------------------------------------------

const memberLength = (member: FixtureMember, model: EffectiveModel): number => {
  const i = model.nodes.find((node) => node.id === member.i);
  const j = model.nodes.find((node) => node.id === member.j);
  return i && j ? Math.hypot(j.x - i.x, j.y - i.y) : 0;
};

const sortValue = (member: FixtureMember, key: string, model: EffectiveModel, result: FixtureAnalysis | null) => {
  if (key === 'id') return member.id;
  if (key === 'section') return sectionById(member.sectionId).name;
  if (key === 'material') return materialById(member.materialId).name;
  if (key === 'length') return memberLength(member, model);
  if (key === 'moment') return result?.members[member.id]?.moment.max ?? -1;
  if (key === 'deflection') return result?.members[member.id]?.deflection.max ?? -1;
  return member.id;
};

const MemberTable = ({
  rows,
  model,
  essential,
  result,
  selection,
  onSort,
  sortArrow,
  onRowClick,
  onLocate,
  t,
}: {
  rows: FixtureMember[];
  model: EffectiveModel;
  essential: boolean;
  result: FixtureAnalysis | null;
  selection: SelectionRef[];
  onSort: (key: string) => void;
  sortArrow: (key: string) => string;
  onRowClick: (id: string, shift: boolean) => void;
  onLocate: (id: string) => void;
  t: Translate;
}) => (
  <table className="pt-table">
    <thead>
      <tr>
        <th scope="col" className="pt-table__check" />
        <th scope="col"><button type="button" className="pt-sort" onClick={() => onSort('id')}>{t('dense.column.id')}{sortArrow('id')}</button></th>
        <th scope="col">{t('dense.column.nodes')}</th>
        <th scope="col"><button type="button" className="pt-sort" onClick={() => onSort('section')}>{t('dense.column.section')}{sortArrow('section')}</button></th>
        {!essential ? <th scope="col"><button type="button" className="pt-sort" onClick={() => onSort('material')}>{t('dense.column.material')}{sortArrow('material')}</button></th> : null}
        {!essential ? <th scope="col"><button type="button" className="pt-sort" onClick={() => onSort('length')}>{t('dense.column.length')}{sortArrow('length')}</button></th> : null}
        <th scope="col"><button type="button" className="pt-sort" onClick={() => onSort('moment')}>{t('dense.column.moment')}{sortArrow('moment')}</button></th>
        {!essential ? <th scope="col"><button type="button" className="pt-sort" onClick={() => onSort('deflection')}>{t('dense.column.deflection')}{sortArrow('deflection')}</button></th> : null}
        <th scope="col"><span className="pt-visually-hidden">{t('command.locate')}</span></th>
      </tr>
    </thead>
    <tbody>
      {rows.map((member) => {
        const memberResult = result?.members[member.id];
        const selected = selection.some((ref) => ref.kind === 'member' && ref.id === member.id);
        return (
          <tr key={member.id} data-selected={selected || undefined} onClick={(event) => onRowClick(member.id, event.shiftKey)}>
            <td className="pt-table__check" onClick={(event) => event.stopPropagation()}>
              <input type="checkbox" checked={selected} onChange={() => onRowClick(member.id, true)} aria-label={member.id} />
            </td>
            <th scope="row">{member.id}</th>
            <td>{member.i} → {member.j}</td>
            <td>{sectionById(member.sectionId).name}</td>
            {!essential ? <td>{materialById(member.materialId).name}</td> : null}
            {!essential ? <td className="pt-number">{format(memberLength(member, model))}</td> : null}
            <td className="pt-number" data-fixture="true">{memberResult ? format(memberResult.moment.max) : '—'}</td>
            {!essential ? <td className="pt-number" data-fixture="true">{memberResult ? format(memberResult.deflection.max, 1) : '—'}</td> : null}
            <td>
              <button type="button" className="pt-row-action" onClick={(event) => { event.stopPropagation(); onLocate(member.id); }}>
                {t('command.locate')}
              </button>
            </td>
          </tr>
        );
      })}
      {rows.length === 0 ? (
        <tr>
          <td colSpan={essential ? 6 : 9}>{t('dense.noResults')}</td>
        </tr>
      ) : null}
    </tbody>
  </table>
);

const NodeTable = ({
  rows,
  selection,
  onSort,
  sortArrow,
  onRowClick,
  onLocate,
  t,
}: {
  rows: FixtureNode[];
  selection: SelectionRef[];
  onSort: (key: string) => void;
  sortArrow: (key: string) => string;
  onRowClick: (id: string, shift: boolean) => void;
  onLocate: (id: string) => void;
  t: Translate;
}) => (
  <table className="pt-table">
    <thead>
      <tr>
        <th scope="col" className="pt-table__check" />
        <th scope="col"><button type="button" className="pt-sort" onClick={() => onSort('id')}>{t('dense.column.id')}{sortArrow('id')}</button></th>
        <th scope="col"><button type="button" className="pt-sort" onClick={() => onSort('x')}>x{sortArrow('x')}</button></th>
        <th scope="col"><button type="button" className="pt-sort" onClick={() => onSort('y')}>y{sortArrow('y')}</button></th>
        <th scope="col"><button type="button" className="pt-sort" onClick={() => onSort('support')}>{t('detail.support')}{sortArrow('support')}</button></th>
        <th scope="col"><span className="pt-visually-hidden">{t('command.locate')}</span></th>
      </tr>
    </thead>
    <tbody>
      {rows.map((node) => {
        const selected = selection.some((ref) => ref.kind === 'node' && ref.id === node.id);
        return (
          <tr key={node.id} data-selected={selected || undefined} onClick={(event) => onRowClick(node.id, event.shiftKey)}>
            <td className="pt-table__check" onClick={(event) => event.stopPropagation()}>
              <input type="checkbox" checked={selected} onChange={() => onRowClick(node.id, true)} aria-label={node.id} />
            </td>
            <th scope="row">{node.id}</th>
            <td className="pt-number">{format(node.x)}</td>
            <td className="pt-number">{format(node.y)}</td>
            <td>{t(SUPPORT_LABEL_KEY[node.support])}</td>
            <td>
              <button type="button" className="pt-row-action" onClick={(event) => { event.stopPropagation(); onLocate(node.id); }}>
                {t('command.locate')}
              </button>
            </td>
          </tr>
        );
      })}
      {rows.length === 0 ? (
        <tr>
          <td colSpan={6}>{t('dense.noResults')}</td>
        </tr>
      ) : null}
    </tbody>
  </table>
);

const LoadTable = ({ rows, t, spanish }: { rows: FixtureLoad[]; t: Translate; spanish: boolean }) => (
  <table className="pt-table">
    <thead>
      <tr>
        <th scope="col">{t('dense.column.id')}</th>
        <th scope="col">{spanish ? 'Tipo' : 'Type'}</th>
        <th scope="col">{spanish ? 'Objetivo' : 'Target'}</th>
        <th scope="col">{spanish ? 'Magnitud' : 'Magnitude'}</th>
      </tr>
    </thead>
    <tbody>
      {rows.map((load) => (
        <tr key={load.id}>
          <th scope="row">{load.id}</th>
          <td>{load.kind === 'point' ? (spanish ? 'Puntual' : 'Point') : spanish ? 'Distribuida' : 'Distributed'}</td>
          <td>{load.target}</td>
          <td className="pt-number">{format(load.magnitude)} {load.kind === 'point' ? 'kN' : 'kN/m'}</td>
        </tr>
      ))}
      {rows.length === 0 ? (
        <tr>
          <td colSpan={4}>{t('dense.noResults')}</td>
        </tr>
      ) : null}
    </tbody>
  </table>
);

const ReactionsSummary = ({ result, t, essential }: { result: FixtureAnalysis | null; t: Translate; essential: boolean }) => (
  <div className="pt-dense__scroll">
    <h3 className="pt-group__title">
      {t('dense.reactions.title')}
      <span className="pt-tag pt-tag--fixture" data-fixture="true">
        {t('canvas.fixture')}
      </span>
    </h3>
    {!result ? (
      <p className="pt-detail__empty">{t('dense.reactions.empty')}</p>
    ) : (
      <table className="pt-table">
        <thead>
          <tr>
            <th scope="col">{t('dense.reactions.node')}</th>
            <th scope="col">Rx</th>
            <th scope="col">Ry</th>
            {!essential ? <th scope="col">Mz</th> : null}
          </tr>
        </thead>
        <tbody>
          {result.reactions.map((reaction) => (
            <tr key={reaction.nodeId}>
              <th scope="row">{reaction.nodeId}</th>
              <td className="pt-number" data-fixture="true">{format(reaction.rx)} kN</td>
              <td className="pt-number" data-fixture="true">{format(reaction.ry)} kN</td>
              {!essential ? <td className="pt-number" data-fixture="true">{format(reaction.mz)} kN·m</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);
