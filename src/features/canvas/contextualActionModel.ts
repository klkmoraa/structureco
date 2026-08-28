import type { Selection } from '../../types';

const CONTEXTUAL_ACTION_IDS = [
  'copy',
  'paste',
  'duplicate',
  'repeat',
  'delete',
  'datasheet',
  'structuralEdit',
] as const;

export type ContextualActionId = (typeof CONTEXTUAL_ACTION_IDS)[number];

export interface ContextualActionAvailability {
  copy: boolean;
  paste: boolean;
  duplicate: boolean;
  repeat: boolean;
  datasheet: boolean;
  structuralEdit: boolean;
}

interface ContextualAction {
  id: ContextualActionId;
  shortcut?: string;
}

interface ContextualActionModel {
  primary: ContextualAction;
  visible: readonly [ContextualAction, ContextualAction];
  overflow: readonly ContextualAction[];
}

const ACTIONS: Record<ContextualActionId, ContextualAction> = {
  copy: { id: 'copy', shortcut: 'Ctrl/Cmd+C' },
  paste: { id: 'paste', shortcut: 'Ctrl/Cmd+V' },
  duplicate: { id: 'duplicate', shortcut: 'Ctrl/Cmd+D' },
  repeat: { id: 'repeat', shortcut: 'R' },
  delete: { id: 'delete', shortcut: 'Delete' },
  datasheet: { id: 'datasheet' },
  structuralEdit: { id: 'structuralEdit' },
};

const actionAvailable = (
  action: ContextualActionId,
  availability: ContextualActionAvailability,
): boolean => action === 'delete' || availability[action];

const preferredPrimary = (selection: Exclude<Selection, null>): readonly ContextualActionId[] => {
  if (selection.kind === 'node' || selection.kind === 'member' || selection.kind === 'multi') {
    return ['structuralEdit', 'duplicate', 'copy', 'datasheet'];
  }
  return ['repeat', 'copy', 'datasheet'];
};

/** Projects the current selection into the Compact contextual-action floor. */
export const resolveContextualActionModel = (
  selection: Selection,
  availability: ContextualActionAvailability,
): ContextualActionModel | null => {
  if (!selection) return null;
  const primaryId = preferredPrimary(selection).find((action) => actionAvailable(action, availability));
  if (!primaryId) return null;
  const primary = ACTIONS[primaryId];
  const overflow = CONTEXTUAL_ACTION_IDS
    .filter((id) => id !== primaryId && id !== 'delete' && actionAvailable(id, availability))
    .map((id) => ACTIONS[id]);
  return { primary, visible: [primary, ACTIONS.delete], overflow };
};
