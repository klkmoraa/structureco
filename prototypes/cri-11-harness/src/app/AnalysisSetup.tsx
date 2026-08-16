/**
 * Contexto de análisis · casos de carga + orden (SHL-07/09, INS-05).
 *
 * Viaja junto a la acción que gobierna (D-09): se invoca desde la TopBar, no
 * vive dentro de la ficha del objeto seleccionado, del que no depende — el
 * error que CRI-8 documentó en el Inspector actual.
 *
 * Los casos y su categoría son datos reales del fixture (`fixture.cases`);
 * activarlos/desactivarlos aquí es sólo UI — no hay un solver que combine
 * casos detrás.
 */

import { useState } from 'react';
import { useActions, usePrototype } from '../state/PrototypeStore';

export const AnalysisSetup = () => {
  const { derived } = usePrototype();
  const { closeSurface } = useActions();
  const { t, composition, fixture } = derived;
  const [active, setActive] = useState<Record<string, boolean>>(() => Object.fromEntries(fixture.cases.map((item) => [item.id, true])));
  const [order, setOrder] = useState<'first' | 'pdelta'>('first');

  return (
    <section className="pt-analysis-setup" data-composition={composition} aria-label={t('surface.analysisSetup')}>
      <header className="pt-detail__head">
        <h2 className="pt-detail__title">{t('surface.analysisSetup')}</h2>
        <button type="button" className="sc-icon-button sc-icon-button--ghost sc-icon-button--sm" aria-label={t('surface.close')} onClick={() => closeSurface('analysis-setup')}>
          ✕
        </button>
      </header>

      <div className="pt-group">
        <h3 className="pt-group__title">{t('analysisSetup.cases')}</h3>
        <ul className="pt-cases">
          {fixture.cases.map((item) => (
            <li key={item.id}>
              <label className="pt-case">
                <input type="checkbox" checked={active[item.id] ?? true} onChange={() => setActive((prev) => ({ ...prev, [item.id]: !prev[item.id] }))} />
                <span>{item.name}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className="pt-group">
        <h3 className="pt-group__title">{t('analysisSetup.order')}</h3>
        <div className="pt-segmented" role="group" aria-label={t('analysisSetup.order')}>
          <button type="button" data-active={order === 'first' || undefined} aria-pressed={order === 'first'} onClick={() => setOrder('first')}>
            {t('analysisSetup.orderFirst')}
          </button>
          <button type="button" data-active={order === 'pdelta' || undefined} aria-pressed={order === 'pdelta'} onClick={() => setOrder('pdelta')}>
            {t('analysisSetup.orderPDelta')}
          </button>
        </div>
      </div>
    </section>
  );
};
