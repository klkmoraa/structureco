/**
 * Detalle del objeto · `dock` en X2, `inset` en M1, `sheet` en K0.
 *
 * Una superficie, tres presentaciones, un solo contenido (D-12). Lo que cambia
 * entre clases es dónde vive y si recompone el lienzo; lo que NO cambia es qué
 * se puede leer ni qué se puede escribir.
 *
 * Aquí viven además dos cosas que CRI-9 sacó del panel de Results (D-03):
 * el resultado DEL OBJETO y la PROCEDENCIA de ese número. Se leen junto a las
 * propiedades del mismo objeto, no en otra pantalla.
 *
 * Esencial / Completa es un eje de disclosure, no de capacidad: los dos modos
 * ven el mismo objeto, el mismo resultado y los mismos comandos. Completa
 * muestra de golpe lo que Esencial deja tras un `Mostrar todas las propiedades`.
 */

import { SECTIONS, sectionById, materialById } from '../core/fixtures';
import { useActions, usePrototype } from '../state/PrototypeStore';

const format = (value: number, digits = 2) =>
  value.toLocaleString('es-MX', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const DetailSurface = () => {
  const { state, derived } = usePrototype();
  const { dispatch, invoke, closeSurface } = useActions();
  const { t, composition, phase } = derived;
  const essential = state.axes.mode === 'essential';
  const spanish = state.axes.locale === 'es-MX';

  if (!state.selection) {
    return (
      <section className="pt-detail" data-composition={composition} aria-label={t('detail.title')}>
        <p className="pt-detail__empty">{t('detail.empty')}</p>
      </section>
    );
  }

  const member = derived.fixture.members.find((item) => item.id === state.selection?.id);
  const node = derived.fixture.nodes.find((item) => item.id === state.selection?.id);
  const result = state.analysis.result;
  const memberResult = member && result ? result.members[member.id] : undefined;
  const showAll = !essential || state.showAllProperties;

  const activeSectionId = member ? state.draft?.sectionId ?? state.sectionOverrides[member.id] ?? member.sectionId : null;
  const committedSectionId = member ? state.sectionOverrides[member.id] ?? member.sectionId : null;
  const section = activeSectionId ? sectionById(activeSectionId) : null;
  const nodeI = member ? derived.fixture.nodes.find((item) => item.id === member.i) : undefined;
  const nodeJ = member ? derived.fixture.nodes.find((item) => item.id === member.j) : undefined;
  const length = nodeI && nodeJ ? Math.hypot(nodeJ.x - nodeI.x, nodeJ.y - nodeI.y) : 0;

  return (
    <section className="pt-detail" data-composition={composition} aria-label={t('detail.title')}>
      <header className="pt-detail__head">
        <div>
          <p className="pt-detail__kicker">{t('detail.identity')}</p>
          <h2 className="pt-detail__title">
            {state.selection.id}
            {member?.label ? <span className="pt-detail__label">{member.label}</span> : null}
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
                    dispatch({ type: 'draft/open', memberId: member.id, sectionId });
                  } else {
                    dispatch({ type: 'draft/preview', sectionId });
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
              <p className="pt-detail__empty">
                {phase === 'stale' ? t('state.stale.detail') : t('detail.noResult')}
              </p>
            )}
          </div>
        </>
      ) : null}

      {node ? (
        <div className="pt-group">
          <h3 className="pt-group__title">{t('detail.geometry')}</h3>
          <dl className="pt-props">
            <div>
              <dt>x</dt>
              <dd>{format(node.x)} m</dd>
            </div>
            <div>
              <dt>y</dt>
              <dd>{format(node.y)} m</dd>
            </div>
            <div>
              <dt>{spanish ? 'Apoyo' : 'Support'}</dt>
              <dd>{node.support}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </section>
  );
};
