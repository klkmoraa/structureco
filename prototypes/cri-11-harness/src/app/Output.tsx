/**
 * Salida · exportación e impresión (SHL-22).
 *
 * La puerta existe y es alcanzable — Fase A la había dejado fuera del todo.
 * Las acciones están rotuladas como no-funcionales: exportar de verdad
 * exigiría rasterizar el lienzo SVG, que está fuera del alcance de CRI-11 y
 * no aporta nada a la decisión de UX que este prototipo existe para apoyar.
 */

import { useActions, usePrototype } from '../state/PrototypeStore';

export const Output = () => {
  const { derived } = usePrototype();
  const { closeSurface, invoke } = useActions();
  const { t, composition } = derived;

  const stub = (commandId: string) => () => invoke(commandId, 'visible');

  return (
    <section className="pt-output" data-composition={composition} aria-label={t('surface.output')}>
      <header className="pt-detail__head">
        <h2 className="pt-detail__title">{t('surface.output')}</h2>
        <button type="button" className="sc-icon-button sc-icon-button--ghost sc-icon-button--sm" aria-label={t('surface.close')} onClick={() => closeSurface('output')}>
          ✕
        </button>
      </header>

      <div className="pt-group">
        <button type="button" className="sc-button sc-button--secondary sc-button--sm pt-output__action" onClick={stub('output.png')}>
          <span className="sc-button__label">{t('output.png')}</span>
        </button>
        <button type="button" className="sc-button sc-button--secondary sc-button--sm pt-output__action" onClick={stub('output.pdf')}>
          <span className="sc-button__label">{t('output.pdf')}</span>
        </button>
        <button type="button" className="sc-button sc-button--secondary sc-button--sm pt-output__action" onClick={stub('output.print')}>
          <span className="sc-button__label">{t('output.print')}</span>
        </button>
        <p className="pt-note">{t('output.disabledNote')}</p>
      </div>
    </section>
  );
};
