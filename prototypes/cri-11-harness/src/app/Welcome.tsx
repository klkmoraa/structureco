/**
 * Welcome · primer viewport.
 *
 * Jerarquía que se está poniendo a prueba (CRI-11 §2):
 *   1. Continuar proyecto — la acción del usuario recurrente, que es el caso
 *      normal. Un CTA, no tres.
 *   2. Nuevo proyecto / Abrir o importar — pares, secundarios y visibles.
 *   3. Recientes — la lista, no una cuadrícula de tarjetas iguales.
 *   4. Aula, Space3D y preferencias — descubrimiento secundario, abajo, con la
 *      etiqueta experimental de Space3D visible desde el principio.
 *
 * El hero es una hipótesis de voz, no una decisión: el eje `voice` del harness
 * cambia entre las tres direcciones propuestas y la línea vigente que el
 * encargo pide retirar, para poder juzgarlas en el mismo layout.
 */

import { useActions, usePrototype } from '../state/PrototypeStore';

const RECENT = [
  { id: 'portal-basic', nameEs: 'Pórtico nave 6 m', nameEn: 'Portal frame 6 m', whenEs: 'hace 2 horas', whenEn: '2 hours ago' },
  { id: 'viga-continua', nameEs: 'Viga continua 3 vanos', nameEn: 'Continuous beam, 3 spans', whenEs: 'ayer', whenEn: 'yesterday' },
  { id: 'armadura', nameEs: 'Armadura 12 m', nameEn: 'Truss 12 m', whenEs: 'el lunes', whenEn: 'on Monday' },
];

export const Welcome = () => {
  const { derived, state } = usePrototype();
  const { dispatch, invoke } = useActions();
  const { t, voice } = derived;
  const spanish = state.axes.locale === 'es-MX';

  const enter = (commandId: string) => {
    invoke(commandId, 'visible');
    dispatch({ type: 'screen/continue' });
  };

  return (
    <div className="pt-welcome" data-composition={derived.composition}>
      <div className="pt-welcome__inner">
        <header className="pt-welcome__head">
          <p className="pt-welcome__eyebrow">{t('welcome.eyebrow')}</p>
          <h1 className="pt-welcome__hero">{voice.hero}</h1>
          <p className="pt-welcome__sub">{voice.sub}</p>
          <p className="pt-fixture-note" data-fixture="true">
            {spanish
              ? 'Prototipo CRI-11 · proyectos, modelos y resultados de fixture'
              : 'CRI-11 prototype · fixture projects, models and results'}
          </p>
        </header>

        <div className="pt-welcome__actions">
          <button type="button" className="sc-button sc-button--primary sc-button--md pt-welcome__cta" onClick={() => enter('project.continue')}>
            <span className="sc-button__label">{t('welcome.continue')}</span>
          </button>
          <div className="pt-welcome__pair">
            <button type="button" className="sc-button sc-button--secondary sc-button--md" onClick={() => enter('project.new')}>
              <span className="sc-button__label">{t('welcome.new')}</span>
            </button>
            <button type="button" className="sc-button sc-button--secondary sc-button--md" onClick={() => enter('project.import')}>
              <span className="sc-button__label">{t('welcome.import')}</span>
            </button>
          </div>
        </div>

        <section className="pt-welcome__recent" aria-label={t('welcome.recent')}>
          <h2 className="pt-section-title">{t('welcome.recent')}</h2>
          <ul className="pt-recent-list">
            {RECENT.map((project, index) => (
              <li key={project.id}>
                <button type="button" className="pt-recent" onClick={() => enter('project.continue')}>
                  <span className="pt-recent__name">{spanish ? project.nameEs : project.nameEn}</span>
                  <span className="pt-recent__meta">
                    {t('welcome.lastOpened')} · {spanish ? project.whenEs : project.whenEn}
                  </span>
                  {index === 0 ? <span className="pt-recent__badge">{t('welcome.continue')}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="pt-welcome__secondary" aria-label={t('welcome.secondary')}>
          <h2 className="pt-section-title pt-section-title--quiet">{t('welcome.secondary')}</h2>
          <div className="pt-welcome__links">
            <button type="button" className="sc-button sc-button--ghost sc-button--sm" disabled>
              <span className="sc-button__label">{t('welcome.aula')}</span>
            </button>
            <button type="button" className="sc-button sc-button--ghost sc-button--sm" disabled>
              <span className="sc-button__label">{t('welcome.space3d')}</span>
              <span className="pt-tag pt-tag--experimental">{t('welcome.space3dTag')}</span>
            </button>
          </div>
          <p className="pt-hint">
            {spanish
              ? 'Aula y Space3D quedan fuera del alcance de este prototipo: Aula no se rediseña y Space3D sigue experimental y separado.'
              : 'Classroom and Space3D are out of scope here: Classroom is not redesigned and Space3D stays experimental and separate.'}
          </p>
        </section>
      </div>
    </div>
  );
};
