/**
 * Datos densos · `drawer` en X2/M1, `fullscreen` en K0.
 *
 * Dos contratos que esta superficie existe para probar:
 *
 *   · **Localizar no cierra la tabla: la degrada a `peek`** (D-11). Hoy tanto
 *     el datasheet como el Model Doctor se cierran antes de emitir
 *     `focus-object`, porque taparían el objeto centrado. `peek` resuelve el
 *     mismo problema sin destruir el contexto: la tabla sigue viva, con su
 *     desplazamiento y su fila, reducida a una banda con vuelta explícita.
 *
 *   · **La fila y el objeto son el mismo objeto.** Seleccionar en la tabla
 *     selecciona en el lienzo, y al revés. No hay dos selecciones.
 *
 * Sobre la virtualización: aquí NO hay ninguna. El fixture grande existe para
 * medir cuánto cuesta de verdad pintar ~1 000 filas antes de decidir si hace
 * falta — «medir primero, virtualizar sólo si el prototipo demuestra necesidad».
 */

import { useMemo } from 'react';
import { sectionById, materialById } from '../core/fixtures';
import { measureInteraction } from '../core/telemetry';
import { useActions, usePrototype } from '../state/PrototypeStore';

const format = (value: number, digits = 2) =>
  value.toLocaleString('es-MX', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const DenseSurface = () => {
  const { state, derived } = usePrototype();
  const { dispatch, select, peekSurface, closeSurface, invoke } = useActions();
  const { t, composition } = derived;
  const essential = state.axes.mode === 'essential';
  const result = state.analysis.result;

  const rows = useMemo(() => {
    const query = state.dense.query.trim().toUpperCase();
    return derived.fixture.members.filter((member) => {
      if (state.dense.onlySelection && state.selection?.id !== member.id) return false;
      if (!query) return true;
      return member.id.toUpperCase().includes(query) || (member.label ?? '').toUpperCase().includes(query);
    });
  }, [derived.fixture.members, state.dense, state.selection]);

  const nodeAt = (id: string) => derived.fixture.nodes.find((node) => node.id === id);

  return (
    <section className="pt-dense" data-composition={composition} aria-label={t('dense.title')}>
      <header className="pt-dense__head">
        <div className="pt-dense__title">
          <h2 className="pt-detail__title">{t('dense.title')}</h2>
          <span className="pt-dense__count">
            {rows.length.toLocaleString('es-MX')} {t('dense.rows')}
          </span>
          <span className="pt-tag pt-tag--fixture" data-fixture="true">
            {t('canvas.fixture')}
          </span>
        </div>
        <div className="pt-dense__tools">
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
          <button
            type="button"
            className="pt-chip pt-chip--toggle"
            data-active={state.dense.onlySelection || undefined}
            aria-pressed={state.dense.onlySelection}
            onClick={() => dispatch({ type: 'dense/filter', patch: { onlySelection: !state.dense.onlySelection } })}
          >
            {t('dense.onlySelection')}
          </button>
          <button type="button" className="sc-icon-button sc-icon-button--ghost sc-icon-button--sm" aria-label={t('surface.close')} onClick={() => closeSurface('dense')}>
            ✕
          </button>
        </div>
      </header>

      <p className="pt-note">{t('dense.locateHint')}</p>

      <div className="pt-dense__scroll">
        <table className="pt-table">
          <thead>
            <tr>
              <th scope="col">{t('dense.column.id')}</th>
              <th scope="col">{t('dense.column.nodes')}</th>
              <th scope="col">{t('dense.column.section')}</th>
              {!essential ? <th scope="col">{t('dense.column.material')}</th> : null}
              {!essential ? <th scope="col">{t('dense.column.length')}</th> : null}
              <th scope="col">{t('dense.column.moment')}</th>
              {!essential ? <th scope="col">{t('dense.column.deflection')}</th> : null}
              <th scope="col">
                <span className="pt-visually-hidden">{t('command.locate')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((member) => {
              const sectionId = state.sectionOverrides[member.id] ?? member.sectionId;
              const memberResult = result?.members[member.id];
              const selected = state.selection?.id === member.id;
              const i = nodeAt(member.i);
              const j = nodeAt(member.j);
              const length = i && j ? Math.hypot(j.x - i.x, j.y - i.y) : 0;
              return (
                <tr
                  key={member.id}
                  data-selected={selected || undefined}
                  onClick={() => select({ kind: 'member', id: member.id })}
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') select({ kind: 'member', id: member.id });
                  }}
                >
                  <th scope="row">{member.id}</th>
                  <td>
                    {member.i} → {member.j}
                  </td>
                  <td>{sectionById(sectionId).name}</td>
                  {!essential ? <td>{materialById(member.materialId).name}</td> : null}
                  {!essential ? <td className="pt-number">{format(length)}</td> : null}
                  <td className="pt-number" data-fixture="true">
                    {memberResult ? format(memberResult.moment.max) : '—'}
                  </td>
                  {!essential ? (
                    <td className="pt-number" data-fixture="true">
                      {memberResult ? format(memberResult.deflection.max, 1) : '—'}
                    </td>
                  ) : null}
                  <td>
                    <button
                      type="button"
                      className="pt-row-action"
                      onClick={(event) => {
                        event.stopPropagation();
                        invoke('member.locate', 'row');
                        measureInteraction('dense.locate', () => {
                          select({ kind: 'member', id: member.id });
                          peekSurface('dense');
                        });
                      }}
                    >
                      {t('command.locate')}
                    </button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={essential ? 4 : 7}>{t('dense.noResults')}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
};
