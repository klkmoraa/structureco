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
 *
 * Fase B: la selección es un ARRAY. Con un solo miembro, la barra ofrece
 * Cambiar sección directo (ruta rápida); con selección múltiple u
 * homogénea/heterogénea, ofrece las acciones que sí tienen sentido en bloque
 * — Eliminar siempre las tiene.
 */

import { useActions, usePrototype } from '../state/PrototypeStore';

export const ContextualActions = () => {
  const { state, derived } = usePrototype();
  const { selectOne, openSurface, invoke, dispatch, deleteSelected } = useActions();
  const { t, composition, model } = derived;
  if (state.selection.length === 0) return null;

  const compact = composition === 'K0';
  const memberRefs = state.selection.filter((ref) => ref.kind === 'member');
  const singleMember = state.selection.length === 1 && memberRefs.length === 1
    ? model.members.find((item) => item.id === memberRefs[0].id)
    : undefined;
  const primary = state.selection[state.selection.length - 1];

  const openSectionDraft = (targetIds: string[]) => {
    invoke('member.changeSection', 'contextual');
    const original: Record<string, string> = {};
    for (const id of targetIds) {
      const member = model.members.find((item) => item.id === id);
      if (member) original[id] = state.edits.sectionOverrides[id] ?? member.sectionId;
    }
    const value = Object.values(original)[0] ?? '';
    dispatch({ type: 'draft/open', draft: { kind: 'section', targetIds, value, original } });
    openSurface('detail', 'contextual-actions');
  };

  return (
    <div
      className="pt-contextual"
      data-composition={composition}
      role="toolbar"
      aria-label={`${t('contextual.title')} ${primary.id}`}
    >
      <span className="pt-contextual__subject">
        {state.selection.length === 1 ? (
          <>
            <strong>{primary.id}</strong>
            {singleMember?.label ? <span className="pt-contextual__meta">{singleMember.label}</span> : null}
          </>
        ) : (
          <strong>
            {state.selection.length} {t('contextual.selectedCount')}
          </strong>
        )}
      </span>

      {singleMember ? (
        <button type="button" className="pt-contextual__action" onClick={() => openSectionDraft([singleMember.id])}>
          {t('command.changeSection')}
        </button>
      ) : memberRefs.length > 1 ? (
        <button type="button" className="pt-contextual__action" onClick={() => openSectionDraft(memberRefs.map((ref) => ref.id))}>
          {t('command.changeSection')}
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
        className="pt-contextual__action pt-contextual__action--danger"
        onClick={() => {
          invoke('selection.delete', 'contextual');
          deleteSelected();
        }}
      >
        {t('command.delete')}
      </button>

      <button
        type="button"
        className="pt-contextual__action pt-contextual__action--quiet"
        onClick={() => {
          invoke('selection.clear', 'contextual');
          selectOne(null);
        }}
      >
        {t('command.clearSelection')}
      </button>
    </div>
  );
};
