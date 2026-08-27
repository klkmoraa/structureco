/**
 * Detalle del objeto · `dock` en X2, `inset` en M1, `sheet` en K0.
 *
 * Una superficie, DOS cardinalidades, tres presentaciones (D-12). Lo que
 * cambia entre clases es dónde vive y si recompone el lienzo; lo que NO
 * cambia es qué se puede leer ni qué se puede escribir — ni entre clases ni
 * entre individual y bloque.
 *
 * Fase B añade lo que CRI-11 §5 pide y Fase A dejó fuera: apoyo editable
 * (MOD-04), posición con alternativa de campo al arrastre (CNV-08, WCAG 2.2
 * Dragging Movements), eliminar (MOD-09), y el estado MIXED de verdad cuando
 * la selección es heterogénea o los valores difieren (INS-04).
 *
 * Esencial / Completa sigue siendo disclosure, no capacidad: los dos modos
 * ven el mismo objeto, el mismo resultado y los mismos comandos.
 */

import { useEffect, useState } from 'react';
import { SECTIONS, sectionById, materialById } from '../core/fixtures';
import type { SupportKind } from '../core/fixtures';
import { SUPPORT_LABEL_KEY } from '../core/i18n';
import { useActions, usePrototype } from '../state/PrototypeStore';

const format = (value: number, digits = 2) =>
  value.toLocaleString('es-MX', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const DetailSurface = () => {
  const { state, derived } = usePrototype();
  const { dispatch, invoke, closeSurface, deleteSelected } = useActions();
  const { t, composition, phase, model } = derived;
  const essential = state.axes.mode === 'essential';
  const spanish = state.axes.locale === 'es-MX';

  const bulk = state.selection.length > 1;
  const primary = state.selection[state.selection.length - 1];
  const member = !bulk && primary?.kind === 'member' ? model.members.find((item) => item.id === primary.id) : undefined;
  const node = !bulk && primary?.kind === 'node' ? model.nodes.find((item) => item.id === primary.id) : undefined;

  const [posX, setPosX] = useState('');
  const [posY, setPosY] = useState('');
  useEffect(() => {
    if (node) {
      setPosX(node.x.toFixed(2));
      setPosY(node.y.toFixed(2));
    }
  }, [node?.id, node?.x, node?.y]);

  if (!primary) {
    return (
      <section className="pt-detail" data-composition={composition} aria-label={t('detail.title')}>
        <p className="pt-detail__empty">{t('detail.empty')}</p>
      </section>
    );
  }

  const result = state.analysis.result;
  const memberResult = member && result ? result.members[member.id] : undefined;
  const showAll = !essential || state.showAllProperties;

  const memberRefs = state.selection.filter((ref) => ref.kind === 'member');
  const nodeRefs = state.selection.filter((ref) => ref.kind === 'node');

  const activeSectionId = member ? state.draft?.value ?? state.edits.sectionOverrides[member.id] ?? member.sectionId : null;
  const committedSectionId = member ? state.edits.sectionOverrides[member.id] ?? member.sectionId : null;
  const section = activeSectionId ? sectionById(activeSectionId) : null;
  const nodeI = member ? model.nodes.find((item) => item.id === member.i) : undefined;
  const nodeJ = member ? model.nodes.find((item) => item.id === member.j) : undefined;
  const length = nodeI && nodeJ ? Math.hypot(nodeJ.x - nodeI.x, nodeJ.y - nodeI.y) : 0;
  const activeSupport = node ? ((state.draft?.value as SupportKind | undefined) ?? node.support) : null;

  const openSectionDraft = (targetIds: string[], value: string) => {
    const original: Record<string, string> = {};
    for (const id of targetIds) {
      const target = model.members.find((item) => item.id === id);
      if (target) original[id] = state.edits.sectionOverrides[id] ?? target.sectionId;
    }
    dispatch({ type: 'draft/open', draft: { kind: 'section', targetIds, value, original } });
  };

  const commitPosition = () => {
    if (!node) return;
    const x = Number.parseFloat(posX);
    const y = Number.parseFloat(posY);
    if (Number.isNaN(x) || Number.isNaN(y)) return;
    if (x === node.x && y === node.y) return;
    dispatch({ type: 'model/moveNode', id: node.id, x, y });
    invoke('node.move', 'visible');
  };

  return (
    <section className="pt-detail" data-composition={composition} aria-label={t('detail.title')}>
      <header className="pt-detail__head">
        <div>
          <p className="pt-detail__kicker">{t('detail.identity')}</p>
          <h2 className="pt-detail__title">
            {bulk ? (
              <>
                {state.selection.length} {t('detail.bulkTitle')}
              </>
            ) : (
              <>
                {primary.id}
                {member?.label ? <span className="pt-detail__label">{member.label}</span> : null}
              </>
            )}
          </h2>
        </div>
        {composition !== 'X2' ? (
          <button type="button" className="sc-icon-button sc-icon-button--ghost sc-icon-button--sm" aria-label={t('surface.close')} onClick={() => closeSurface('detail')}>
            ✕
          </button>
        ) : null}
      </header>

      {state.draft ? (
        <div className="pt-preview" role="status">
          <p className="pt-preview__title">{t('detail.preview')}</p>
          <p className="pt-preview__hint">{t('detail.previewHint')}</p>
          <div className="pt-preview__actions">
            <button
              type="button"
              className="sc-button sc-button--primary sc-button--sm"
              onClick={() => {
                invoke('draft.commit', 'visible');
                dispatch({ type: 'draft/commit' });
              }}
            >
              <span className="sc-button__label">{t('command.commit')}</span>
            </button>
            <button
              type="button"
              className="sc-button sc-button--ghost sc-button--sm"
              onClick={() => {
                invoke('draft.cancel', 'visible');
                dispatch({ type: 'draft/cancel' });
              }}
            >
              <span className="sc-button__label">{t('command.cancel')}</span>
            </button>
          </div>
        </div>
      ) : null}

      {bulk ? (
        <div className="pt-group">
          <h3 className="pt-group__title">{t('detail.properties')}</h3>
          {memberRefs.length > 0 ? (
            <label className="pt-field">
              <span className="pt-field__label">
                {t('detail.section')}
                {nodeRefs.length > 0 ? <span className="pt-field__hint pt-field__hint--inline"> · {t('detail.bulkMixed')}</span> : null}
              </span>
              <select
                className="pt-field__control"
                value={state.draft?.kind === 'section' ? state.draft.value : ''}
                onChange={(event) => {
                  const value = event.target.value;
                  if (!state.draft) {
                    invoke('member.changeSection', 'visible');
                    openSectionDraft(memberRefs.map((ref) => ref.id), value);
                  } else {
                    dispatch({ type: 'draft/preview', value });
                  }
                }}
              >
                <option value="" disabled>
                  {t('detail.bulkMixed')}
                </option>
                {SECTIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="pt-note">{t('detail.bulkMixed')}</p>
          )}
        </div>
      ) : null}

      {member ? (
        <>
          <div className="pt-group">
            <h3 className="pt-group__title">{t('detail.properties')}</h3>
            <label className="pt-field">
              <span className="pt-field__label">{t('detail.section')}</span>
              <select
                className="pt-field__control"
                value={activeSectionId ?? ''}
                onChange={(event) => {
                  const sectionId = event.target.value;
                  if (!state.draft) {
                    invoke('member.changeSection', 'visible');
                    openSectionDraft([member.id], sectionId);
                  } else {
                    dispatch({ type: 'draft/preview', value: sectionId });
                  }
                }}
              >
                {SECTIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            {state.draft && committedSectionId !== activeSectionId ? (
              <p className="pt-field__hint">
                {spanish ? 'Actual' : 'Current'}: {sectionById(committedSectionId ?? '').name}
              </p>
            ) : null}

            {showAll ? (
              <dl className="pt-props">
                <div>
                  <dt>{t('detail.material')}</dt>
                  <dd>{materialById(member.materialId).name}</dd>
                </div>
                <div>
                  <dt>{t('detail.type')}</dt>
                  <dd>{member.type}</dd>
                </div>
                <div>
                  <dt>{t('detail.nodes')}</dt>
                  <dd>
                    {member.i} → {member.j}
                  </dd>
                </div>
                <div>
                  <dt>{t('detail.length')}</dt>
                  <dd>{format(length)} m</dd>
                </div>
                {section ? (
                  <div>
                    <dt>I</dt>
                    <dd>{section.I.toExponential(2)} m⁴</dd>
                  </div>
                ) : null}
              </dl>
            ) : null}

            {essential ? (
              <button type="button" className="pt-disclosure" onClick={() => dispatch({ type: 'properties/toggle' })}>
                {state.showAllProperties ? t('detail.showLess') : t('detail.showAll')}
              </button>
            ) : null}
          </div>

          <div className="pt-group">
            <h3 className="pt-group__title">
              {t('detail.results')}
              <span className="pt-tag pt-tag--fixture" data-fixture="true">
                {t('canvas.fixture')}
              </span>
            </h3>
            {memberResult ? (
              <>
                <ul className="pt-results">
                  <li>
                    <span className="pt-results__label">{t('detail.momentMax')}</span>
                    <span className="pt-results__value" data-fixture="true">
                      {format(memberResult.moment.max)} kN·m
                    </span>
                    <span className="pt-results__where">
                      {t('detail.at')} {format(memberResult.moment.maxAt)} m
                    </span>
                  </li>
                  <li>
                    <span className="pt-results__label">{t('detail.shearMax')}</span>
                    <span className="pt-results__value" data-fixture="true">
                      {format(memberResult.shear.max)} kN
                    </span>
                    <span className="pt-results__where">
                      {t('detail.at')} {format(memberResult.shear.maxAt)} m
                    </span>
                  </li>
                  {showAll ? (
                    <>
                      <li>
                        <span className="pt-results__label">{t('detail.axial')}</span>
                        <span className="pt-results__value" data-fixture="true">
                          {format(memberResult.axial.i)} kN
                        </span>
                        <span className="pt-results__where">{t('detail.end.i')}</span>
                      </li>
                      <li>
                        <span className="pt-results__label">{t('detail.deflectionMax')}</span>
                        <span className="pt-results__value" data-fixture="true">
                          {format(memberResult.deflection.max, 1)} mm
                        </span>
                        <span className="pt-results__where">
                          {t('detail.at')} {format(memberResult.deflection.maxAt)} m
                        </span>
                      </li>
                    </>
                  ) : null}
                </ul>
                <p className="pt-provenance">
                  <span className="pt-provenance__label">{t('detail.provenance')}</span>
                  <span className="pt-provenance__value">
                    {spanish ? 'fixture determinista' : 'deterministic fixture'} · {derived.stamp.slice(0, 34)}…
                  </span>
                </p>
                <p className="pt-note pt-note--reliability">{t('state.notSafety')}</p>
              </>
            ) : (
              <p className="pt-detail__empty">{phase === 'stale' ? t('state.stale.detail') : t('detail.noResult')}</p>
            )}
          </div>
        </>
      ) : null}

      {node ? (
        <div className="pt-group">
          <h3 className="pt-group__title">{t('detail.geometry')}</h3>
          <div className="pt-position">
            <label className="pt-field pt-field--compact">
              <span className="pt-field__label">x</span>
              <input
                className="pt-field__control"
                type="number"
                step="0.1"
                inputMode="decimal"
                value={posX}
                onChange={(event) => setPosX(event.target.value)}
                onBlur={commitPosition}
                onKeyDown={(event) => event.key === 'Enter' && commitPosition()}
              />
            </label>
            <label className="pt-field pt-field--compact">
              <span className="pt-field__label">y</span>
              <input
                className="pt-field__control"
                type="number"
                step="0.1"
                inputMode="decimal"
                value={posY}
                onChange={(event) => setPosY(event.target.value)}
                onBlur={commitPosition}
                onKeyDown={(event) => event.key === 'Enter' && commitPosition()}
              />
            </label>
          </div>
          <p className="pt-field__hint">{t('detail.positionHint')}</p>

          <label className="pt-field">
            <span className="pt-field__label">{t('detail.support')}</span>
            <select
              className="pt-field__control"
              value={activeSupport ?? 'none'}
              onChange={(event) => {
                const value = event.target.value;
                if (!state.draft) {
                  invoke('node.setSupport', 'visible');
                  dispatch({ type: 'draft/open', draft: { kind: 'support', targetIds: [node.id], value, original: { [node.id]: node.support } } });
                } else {
                  dispatch({ type: 'draft/preview', value });
                }
              }}
            >
              {(['none', 'pin', 'roller', 'fixed'] as SupportKind[]).map((kind) => (
                <option key={kind} value={kind}>
                  {t(SUPPORT_LABEL_KEY[kind])}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      <div className="pt-group pt-group--danger">
        <button type="button" className="sc-button sc-button--danger sc-button--sm" onClick={deleteSelected}>
          <span className="sc-button__label">{t('command.delete')}</span>
        </button>
      </div>
    </section>
  );
};
