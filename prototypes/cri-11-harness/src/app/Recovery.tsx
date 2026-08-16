/**
 * Recuperación y conflicto de revisión · cierra el hueco de acceso que CRI-8
 * §9.2 señaló como el más grave: hoy sólo se resuelve desde el Project Hub,
 * en otra pantalla. Aquí la puerta vive en la mesa (CRI-9 D-08).
 *
 * Precedencia declarada, no inventada: localStorage = sesión viva, IndexedDB
 * = biblioteca; un conflicto nunca se resuelve solo. Este flujo es
 * REPRESENTATIVO — no hay una segunda copia real detrás, así que «usar esta
 * copia» sólo cierra la conversación (vuelve `persistence` a `saved`).
 */

import { useActions, usePrototype } from '../state/PrototypeStore';

export const Recovery = () => {
  const { derived, dispatch } = usePrototype();
  const { closeSurface, invoke } = useActions();
  const { t, composition } = derived;

  const resolve = (choice: 'session' | 'current') => {
    invoke(`recovery.${choice}`, 'visible');
    dispatch({ type: 'axis/set', patch: { state: 'current' } });
    closeSurface('recovery');
  };

  return (
    <section className="pt-recovery" data-composition={composition} aria-label={t('surface.recovery')}>
      <header className="pt-detail__head">
        <h2 className="pt-detail__title">{t('surface.recovery')}</h2>
        <button type="button" className="sc-icon-button sc-icon-button--ghost sc-icon-button--sm" aria-label={t('surface.close')} onClick={() => closeSurface('recovery')}>
          ✕
        </button>
      </header>

      <p className="pt-note">{t('recovery.intro')}</p>

      <ul className="pt-recovery__list">
        <li className="pt-recovery__item">
          <div>
            <p className="pt-recovery__label">{t('recovery.sessionCopy')}</p>
          </div>
          <button type="button" className="sc-button sc-button--primary sc-button--sm" onClick={() => resolve('session')}>
            <span className="sc-button__label">{t('recovery.useThis')}</span>
          </button>
        </li>
        <li className="pt-recovery__item">
          <div>
            <p className="pt-recovery__label">{t('recovery.librarycopy')}</p>
          </div>
          <button type="button" className="sc-button sc-button--secondary sc-button--sm" onClick={() => resolve('current')}>
            <span className="sc-button__label">{t('recovery.keepCurrent')}</span>
          </button>
        </li>
      </ul>

      <p className="pt-note">{t('recovery.note')}</p>
    </section>
  );
};
