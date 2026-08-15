/**
 * ToolRail · 164 px con etiquetas → 76 px sólo iconos → dock flotante.
 *
 * La transición X2→M1 de este rail es, literalmente, el tier que hoy es código
 * muerto en producción (F-01): existe en `styles.css` para 1024–1439 px y nunca
 * llega a activarse. Aquí se activa porque la anchura la decide el resolutor.
 *
 * Crear y navegar NO pueden ser contextuales a la selección: cuando se crea, no
 * hay nada seleccionado. Es el límite duro del principio Shapr3D (CRI-9 §5).
 *
 * En Fase A las herramientas se seleccionan y se anuncian, pero no editan el
 * modelo: la edición estructural es Fase B, y fingirla sería inventar una
 * capacidad.
 */

import { useState } from 'react';
import { usePrototype } from '../state/PrototypeStore';
import type { TranslationKey } from '../core/i18n';

interface Tool {
  id: string;
  labelKey: TranslationKey;
  glyph: string;
  phaseB?: boolean;
}

const TOOLS: Tool[] = [
  { id: 'select', labelKey: 'toolrail.select', glyph: '⌖' },
  { id: 'node', labelKey: 'toolrail.node', glyph: '●', phaseB: true },
  { id: 'member', labelKey: 'toolrail.member', glyph: '╱', phaseB: true },
  { id: 'support', labelKey: 'toolrail.support', glyph: '▲', phaseB: true },
  { id: 'load', labelKey: 'toolrail.load', glyph: '↓', phaseB: true },
];

export const ToolRail = () => {
  const { derived } = usePrototype();
  const { t, composition, verdict } = derived;
  const [active, setActive] = useState('select');
  const labelled = composition === 'X2';
  const floating = composition === 'K0';

  return (
    <nav
      className="pt-toolrail"
      data-composition={composition}
      data-floating={floating || undefined}
      style={floating ? undefined : { width: verdict.railWidth }}
      aria-label={t('toolrail.select')}
    >
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          type="button"
          className="pt-tool"
          data-active={active === tool.id || undefined}
          aria-pressed={active === tool.id}
          aria-label={t(tool.labelKey)}
          title={tool.phaseB ? t('toolrail.phaseB') : t(tool.labelKey)}
          onClick={() => setActive(tool.id)}
        >
          <span className="pt-tool__glyph" aria-hidden="true">
            {tool.glyph}
          </span>
          {labelled ? <span className="pt-tool__label">{t(tool.labelKey)}</span> : null}
          {tool.phaseB ? <span className="pt-tool__phase" aria-hidden="true">B</span> : null}
        </button>
      ))}
    </nav>
  );
};
