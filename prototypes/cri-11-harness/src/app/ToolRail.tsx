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
 * Fase B recupera la puerta que Fase A dejó declarada y sin construir (MOD-02
 * /03/04/05): las cuatro herramientas de creación ahora mutan el modelo
 * efectivo — vía `StructuralCanvas`, que hace el `hitTest` y despacha la
 * acción. Aquí sólo se elige la herramienta y se explica qué hacer con ella.
 */

import type { ToolId } from '../state/PrototypeStore';
import { useActions, usePrototype } from '../state/PrototypeStore';
import type { TranslationKey } from '../core/i18n';

interface Tool {
  id: ToolId;
  labelKey: TranslationKey;
  hintKey: TranslationKey;
  glyph: string;
  /** Atajo auditado (CRI-9 G-01, `core/commands.ts`) — sólo activo con foco en el lienzo. */
  shortcut: string;
}

const TOOLS: Tool[] = [
  { id: 'select', labelKey: 'toolrail.select', hintKey: 'toolrail.hintSelect', glyph: '⌖', shortcut: 'V' },
  { id: 'node', labelKey: 'toolrail.node', hintKey: 'toolrail.hintNode', glyph: '●', shortcut: 'N' },
  { id: 'member', labelKey: 'toolrail.member', hintKey: 'toolrail.hintMemberStart', glyph: '╱', shortcut: 'M' },
  { id: 'support', labelKey: 'toolrail.support', hintKey: 'toolrail.hintSupport', glyph: '▲', shortcut: 'S' },
  { id: 'load', labelKey: 'toolrail.load', hintKey: 'toolrail.hintLoad', glyph: '↓', shortcut: 'L' },
];

export const ToolRail = () => {
  const { state, derived } = usePrototype();
  const { setTool } = useActions();
  const { t, composition, verdict } = derived;
  const labelled = composition === 'X2';
  const floating = composition === 'K0';
  const active = TOOLS.find((tool) => tool.id === state.activeTool) ?? TOOLS[0];
  const hint = active.id === 'member' && state.pendingMemberStart ? t('toolrail.hintMemberEnd') : t(active.hintKey);

  return (
    <>
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
            data-active={state.activeTool === tool.id || undefined}
            aria-pressed={state.activeTool === tool.id}
            aria-label={t(tool.labelKey)}
            aria-keyshortcuts={tool.shortcut}
            title={`${t(tool.labelKey)} (${tool.shortcut})`}
            onClick={() => setTool(tool.id)}
          >
            <span className="pt-tool__glyph" aria-hidden="true">
              {tool.glyph}
            </span>
            {labelled ? <span className="pt-tool__label">{t(tool.labelKey)}</span> : null}
          </button>
        ))}
      </nav>
      {active.id !== 'select' ? <p className="pt-tool-hint" data-composition={composition}>{hint}</p> : null}
    </>
  );
};
