/**
 * Vista del lienzo · dueño único de la visibilidad (D-10) y de la elección de
 * evidencia (D-03).
 *
 * La decisión que este archivo materializa: **elegir Momento no es abrir
 * Results, es encender una capa.** Por eso N/V/M/deformada viven aquí, junto a
 * la retícula y las etiquetas, y no en un panel de resultados residente — que,
 * según el presupuesto de CRI-9 §12, ninguna clase puede pagar.
 *
 * Cuando no hay resultado vivo, la evidencia no se ofrece en gris «por si
 * acaso»: se explica por qué no está disponible. Es la regla fail-closed vista
 * desde el lado del usuario.
 */

import type { Evidence } from '../core/analysis';
import { canPaintEvidence } from '../core/analysis';
import type { TranslationKey } from '../core/i18n';
import { useActions, usePrototype } from '../state/PrototypeStore';

const EVIDENCES: { id: Evidence; labelKey: TranslationKey }[] = [
  { id: 'none', labelKey: 'evidence.none' },
  { id: 'N', labelKey: 'evidence.N' },
  { id: 'V', labelKey: 'evidence.V' },
  { id: 'M', labelKey: 'evidence.M' },
  { id: 'deformed', labelKey: 'evidence.deformed' },
];

const LAYERS: { id: 'grid' | 'loads' | 'supports' | 'labels'; labelKey: TranslationKey }[] = [
  { id: 'grid', labelKey: 'view.layer.grid' },
  { id: 'loads', labelKey: 'view.layer.loads' },
  { id: 'supports', labelKey: 'view.layer.supports' },
  { id: 'labels', labelKey: 'view.layer.labels' },
];

export const ViewSurface = () => {
  const { state, derived } = usePrototype();
  const { dispatch, invoke, closeSurface } = useActions();
  const { t, composition, phase, model } = derived;
  const evidenceAvailable = canPaintEvidence(phase);
  const labelsSuppressed = model.members.length > 200;

  return (
    <section className="pt-view" data-composition={composition} aria-label={t('view.title')}>
      <header className="pt-detail__head">
        <h2 className="pt-detail__title">{t('view.title')}</h2>
        <button type="button" className="sc-icon-button sc-icon-button--ghost sc-icon-button--sm" aria-label={t('surface.close')} onClick={() => closeSurface('view')}>
          ✕
        </button>
      </header>

      <div className="pt-group">
        <h3 className="pt-group__title">{t('view.evidence')}</h3>
        {!evidenceAvailable ? <p className="pt-note">{t('view.evidenceLocked')}</p> : null}
        <div className="pt-segmented" role="group" aria-label={t('view.evidence')}>
          {EVIDENCES.map((evidence) => (
            <button
              key={evidence.id}
              type="button"
              className="pt-segmented__option"
              data-active={state.evidence === evidence.id || undefined}
              aria-pressed={state.evidence === evidence.id}
              disabled={evidence.id !== 'none' && !evidenceAvailable}
              onClick={() => {
                invoke(`view.evidence.${evidence.id}`, 'visible');
                dispatch({ type: 'evidence/set', evidence: evidence.id });
              }}
            >
              {t(evidence.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-group">
        <h3 className="pt-group__title">{t('view.layers')}</h3>
        <div className="pt-chips">
          {LAYERS.map((layer) => (
            <button
              key={layer.id}
              type="button"
              className="pt-chip pt-chip--toggle"
              data-active={state.layers[layer.id] || undefined}
              aria-pressed={state.layers[layer.id]}
              onClick={() => dispatch({ type: 'layer/toggle', layer: layer.id })}
            >
              {t(layer.labelKey)}
            </button>
          ))}
        </div>
        {labelsSuppressed ? (
          <p className="pt-note">
            {state.axes.locale === 'es-MX'
              ? 'Las etiquetas se degradan por encima de 200 miembros. Degradación declarada, no silenciosa (CB-3).'
              : 'Labels degrade above 200 members. A declared degradation, not a silent one (CB-3).'}
          </p>
        ) : null}
      </div>

      <div className="pt-group">
        <h3 className="pt-group__title">{t('view.filter')}</h3>
        <div className="pt-segmented" role="group" aria-label={t('view.filter')}>
          {(['all', 'node', 'member'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              className="pt-segmented__option"
              data-active={state.selectionFilter === filter || undefined}
              aria-pressed={state.selectionFilter === filter}
              onClick={() => dispatch({ type: 'selectionFilter/set', filter })}
            >
              {filter === 'all' ? t('view.filterAll') : filter === 'node' ? t('toolrail.node') : t('toolrail.member')}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
