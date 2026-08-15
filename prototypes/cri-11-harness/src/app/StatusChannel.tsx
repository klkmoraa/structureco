/**
 * Canal de estado · la excepción declarada a R-1.
 *
 * Un aviso que no puede aparecer porque hay una hoja abierta es un aviso
 * perdido, así que `status` coexiste con cualquier otra capa. Es también el
 * canal por el que el broker anuncia una degradación de composición: nada se
 * suspende, se reduce ni se restaura en silencio.
 */

import { surfaceById } from '../core/surfaces';
import { usePrototype } from '../state/PrototypeStore';
import type { TranslationKey } from '../core/i18n';

const KEY: Record<string, TranslationKey> = {
  'surface.suspended': 'surface.suspended',
  'surface.restored': 'surface.restored',
  'surface.peek': 'surface.peek',
};

export const StatusChannel = () => {
  const { state, derived } = usePrototype();
  const { t } = derived;
  const announcement = state.broker.announcement;
  const spanish = state.axes.locale === 'es-MX';
  const surface = announcement ? surfaceById(announcement.surface) : null;
  const text = announcement && surface ? `${spanish ? surface.name.es : surface.name.en} ${t(KEY[announcement.key])}` : '';

  return (
    <div className="pt-status" aria-live="polite" aria-label={t('a11y.announcements')}>
      {text ? <p className="pt-status__toast">{text}</p> : null}
    </div>
  );
};
