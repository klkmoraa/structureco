/**
 * Preferencias · puerta que Fase A dejó fuera del producto (CRI-9 §5,
 * superficie `preferences`).
 *
 * En Fase A, Tema/Idioma/Modo/Movimiento sólo se cambiaban desde el panel del
 * laboratorio — una comodidad de investigación, no una puerta del producto.
 * Aquí despachan las MISMAS acciones (`axis/set`), así que ambas rutas
 * comparten un solo estado: no hay dos fuentes de verdad para el tema.
 */

import { useActions, usePrototype } from '../state/PrototypeStore';

export const Preferences = () => {
  const { state, derived, dispatch } = usePrototype();
  const { closeSurface, invoke } = useActions();
  const { t, composition } = derived;

  return (
    <section className="pt-preferences" data-composition={composition} aria-label={t('surface.preferences')}>
      <header className="pt-detail__head">
        <h2 className="pt-detail__title">{t('surface.preferences')}</h2>
        <button type="button" className="sc-icon-button sc-icon-button--ghost sc-icon-button--sm" aria-label={t('surface.close')} onClick={() => closeSurface('preferences')}>
          ✕
        </button>
      </header>

      <div className="pt-group">
        <h3 className="pt-group__title">{t('preferences.theme')}</h3>
        <div className="pt-segmented" role="group" aria-label={t('preferences.theme')}>
          {(['light', 'dark'] as const).map((theme) => (
            <button
              key={theme}
              type="button"
              data-active={state.axes.theme === theme || undefined}
              aria-pressed={state.axes.theme === theme}
              onClick={() => {
                invoke('theme.toggle', 'visible');
                dispatch({ type: 'axis/set', patch: { theme } });
              }}
            >
              {t(theme === 'light' ? 'preferences.themeLight' : 'preferences.themeDark')}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-group">
        <h3 className="pt-group__title">{t('preferences.locale')}</h3>
        <div className="pt-segmented" role="group" aria-label={t('preferences.locale')}>
          {(['es-MX', 'en-US'] as const).map((locale) => (
            <button
              key={locale}
              type="button"
              data-active={state.axes.locale === locale || undefined}
              aria-pressed={state.axes.locale === locale}
              onClick={() => {
                invoke('locale.toggle', 'visible');
                dispatch({ type: 'axis/set', patch: { locale } });
              }}
            >
              {t(locale === 'es-MX' ? 'preferences.localeEs' : 'preferences.localeEn')}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-group">
        <h3 className="pt-group__title">{t('preferences.mode')}</h3>
        <div className="pt-segmented" role="group" aria-label={t('preferences.mode')}>
          {(['essential', 'complete'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              data-active={state.axes.mode === mode || undefined}
              aria-pressed={state.axes.mode === mode}
              onClick={() => {
                invoke('mode.toggle', 'visible');
                dispatch({ type: 'axis/set', patch: { mode } });
              }}
            >
              {t(mode === 'essential' ? 'mode.essential' : 'mode.complete')}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-group">
        <h3 className="pt-group__title">{t('preferences.motion')}</h3>
        <div className="pt-segmented" role="group" aria-label={t('preferences.motion')}>
          {(['normal', 'reduced'] as const).map((motion) => (
            <button
              key={motion}
              type="button"
              data-active={state.axes.motion === motion || undefined}
              aria-pressed={state.axes.motion === motion}
              onClick={() => dispatch({ type: 'axis/set', patch: { motion } })}
            >
              {t(motion === 'normal' ? 'preferences.motionNormal' : 'preferences.motionReduced')}
            </button>
          ))}
        </div>
      </div>

      <p className="pt-note">{t('preferences.note')}</p>
    </section>
  );
};
