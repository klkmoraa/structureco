/**
 * Acciones contextuales de selección · superficie NUEVA de CRI-9 (D-07).
 *
 * Aparece con la selección y desaparece con ella. Es lo que descarga el
 * ToolRail y el cajón «Más», y es la ruta táctil de las acciones sobre el
 * objeto — hoy repartidas entre el rail, el teclado y una hoja.
 *
 * Presentación `inset` en las tres clases: anclada al borde del lienzo, sin
 * scrim y sin recomponerlo. Cuenta como chrome flotante (CB-3), y por eso no
 * existe en reposo: sin selección no ocupa nada.
 */

import { commandById } from '../core/commands';
import { useActions, usePrototype } from '../state/PrototypeStore';

export const ContextualActions = () => {
  const { state, derived } = usePrototype();
  const { select, openSurface, invoke, dispatch } = useActions();
  const { t, composition } = derived;
  if (!state.selection) return null;

  const member = state.selection.kind === 'member'
    ? derived.fixture.members.find((item) => item.id === state.selection?.id)
    : undefined;

  const compact = composition === 'K0';

  return (
    <div className="pt-contextual" data-composition={composition} role="toolbar" aria-label={`${t('contextual.title')} ${state.selection.id}`}>
      <span className="pt-contextual__subject">
        <strong>{state.selection.id}</strong>
        {member?.label ? <span className="pt-contextual__meta">{member.label}</span> : null}
      </span>

      {member ? (
        <button
          type="button"
          className="pt-contextual__action"
          onClick={() => {
            invoke('member.changeSection', 'contextual');
            dispatch({ type: 'draft/open', memberId: member.id, sectionId: state.sectionOverrides[member.id] ?? member.sectionId });
            openSurface('detail', 'contextual-actions');
          }}
        >
          {t(commandById('member.changeSection').labelKey)}
        </button>
      ) : null}

      {compact ? (
        <button
          type="button"
          className="pt-contextual__action"
          onClick={() => {
            invoke('surface.detail.toggle', 'contextual');
            openSurface('detail', 'contextual-actions');
          }}
        >
          {t('surface.detail')}
        </button>
      ) : null}

      <button
        type="button"
        className="pt-contextual__action"
        onClick={() => {
          invoke('surface.dense.toggle', 'contextual');
          openSurface('dense', 'contextual-actions');
        }}
      >
        {t('surface.dense')}
      </button>

      <button
        type="button"
        className="pt-contextual__action pt-contextual__action--quiet"
        onClick={() => {
          invoke('selection.clear', 'contextual');
          select(null);
        }}
      >
        {t('command.clearSelection')}
      </button>
    </div>
  );
};
