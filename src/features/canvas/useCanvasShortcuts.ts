import { useEffect, type MutableRefObject, type RefObject } from 'react';
import type { Selection, Tool } from '../../types';
import { toolFromShortcut } from './toolRegistry';
import { emitWorkspaceCommand } from '../workspace/workspaceCommands';

export interface UseCanvasShortcutsOptions {
  hostRef: RefObject<HTMLDivElement | null>;
  spacePressedRef: MutableRefObject<boolean>;
  setSpacePressed: (pressed: boolean) => void;
  supportPlacement: unknown;
  cancelSupportPlacement: () => void;
  candidatePicker: unknown;
  closeCandidatePicker: () => void;
  structuralEditDraft: unknown;
  cancelStructuralEdit: () => void;
  selection: Selection | null;
  editCapabilities: { structural: boolean };
  repeatCandidate: unknown;
  activateRepeat: () => void;
  compactCanvasChrome: boolean;
  copyStructuralSelection: () => void | Promise<void>;
  pasteStructuralSelection: () => void | Promise<void>;
  startDuplicate: () => void;
  duplicateDraft: unknown;
  setDuplicateDraft: (draft: null) => void;
  setActiveTool: (tool: Tool) => void;
  cancelActiveInteraction: () => void;
  setMemberStart: (id: string | null) => void;
  setQuickEntry: (pair: { first: string; second: string }) => void;
  setQuickEntryError: (err: string) => void;
  setRepeatRecipe: (recipe: null) => void;
  setSelection: (selection: Selection | null) => void;
  setCut: (cut: null) => void;
  deleteSelection: () => void;
}

export const useCanvasShortcuts = ({
  hostRef,
  spacePressedRef,
  setSpacePressed,
  supportPlacement,
  cancelSupportPlacement,
  candidatePicker,
  closeCandidatePicker,
  structuralEditDraft,
  cancelStructuralEdit,
  selection,
  editCapabilities,
  repeatCandidate,
  activateRepeat,
  compactCanvasChrome,
  copyStructuralSelection,
  pasteStructuralSelection,
  startDuplicate,
  duplicateDraft,
  setDuplicateDraft,
  setActiveTool,
  cancelActiveInteraction,
  setMemberStart,
  setQuickEntry,
  setQuickEntryError,
  setRepeatRecipe,
  setSelection,
  setCut,
  deleteSelection,
}: UseCanvasShortcutsOptions) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const modalOpen = document.querySelector<HTMLElement>('[aria-modal="true"]');
      const interactive = target?.closest('input, select, textarea, button, [contenteditable="true"], [role="dialog"], [role="menu"], [role="listbox"], [role="tablist"]');
      if (event.key === 'Escape' && supportPlacement) {
        event.preventDefault();
        event.stopImmediatePropagation();
        cancelSupportPlacement();
        return;
      }
      if (event.key === 'Escape' && candidatePicker) {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeCandidatePicker();
        return;
      }
      if ((modalOpen && !target?.closest('[aria-modal="true"]')) || interactive) return;
      if (event.code === 'Space') {
        event.preventDefault();
        if (!spacePressedRef.current) {
          spacePressedRef.current = true;
          setSpacePressed(true);
        }
        return;
      }
      const command = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (event.key === 'Escape' && structuralEditDraft) {
        event.preventDefault();
        cancelStructuralEdit();
        return;
      }
      if (structuralEditDraft) return;
      // Letter-only shortcuts (no modifier) are scoped to the canvas element
      // itself (CRI-103): anywhere else — including plain document/body focus,
      // which is where a screen reader's quick-nav browse mode intercepts
      // single letters — they must not fire, or they hijack that navigation.
      const canvasHasFocus = document.activeElement instanceof Node && Boolean(hostRef.current?.contains(document.activeElement));
      // WCAG 2.2 2.5.7: moving geometry cannot depend on a drag. F2 is an
      // intentional keyboard entry from a focused canvas object to the same
      // numeric, reversible structural editor offered by the visual control.
      if (event.key === 'F2' && canvasHasFocus && selection && editCapabilities.structural) {
        event.preventDefault();
        emitWorkspaceCommand('open-structural-edit');
        return;
      }
      if (key === 'r' && !command && !event.altKey && canvasHasFocus && !compactCanvasChrome) {
        if (!repeatCandidate) return;
        event.preventDefault();
        activateRepeat();
        return;
      }
      if (command && key === 'c') {
        event.preventDefault();
        void copyStructuralSelection();
        return;
      }
      if (command && key === 'v') {
        event.preventDefault();
        void pasteStructuralSelection();
        return;
      }
      if (command && key === 'd') {
        event.preventDefault();
        startDuplicate();
        return;
      }
      const shortcutTool = toolFromShortcut(key);
      if (shortcutTool && !command && !event.altKey && canvasHasFocus) {
        event.preventDefault();
        setActiveTool(shortcutTool);
      }
      if (event.key === 'Escape') {
        if (duplicateDraft) {
          setDuplicateDraft(null);
          return;
        }
        cancelActiveInteraction();
        setMemberStart(null);
        setQuickEntry({ first: '', second: '' });
        setQuickEntryError('');
        setRepeatRecipe(null);
        setSelection(null);
        setCut(null);
        setActiveTool('select');
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        deleteSelection();
      }
    };
    const releaseSpace = (event?: KeyboardEvent) => {
      if (event && event.code !== 'Space') return;
      spacePressedRef.current = false;
      setSpacePressed(false);
    };
    const onVisibility = () => { if (document.visibilityState === 'hidden') cancelActiveInteraction(); };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', releaseSpace);
    window.addEventListener('blur', cancelActiveInteraction);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', releaseSpace);
      window.removeEventListener('blur', cancelActiveInteraction);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [activateRepeat, cancelActiveInteraction, cancelStructuralEdit, cancelSupportPlacement, candidatePicker, closeCandidatePicker, compactCanvasChrome, copyStructuralSelection, deleteSelection, duplicateDraft, editCapabilities.structural, hostRef, pasteStructuralSelection, repeatCandidate, selection, setActiveTool, setCut, setDuplicateDraft, setMemberStart, setQuickEntry, setQuickEntryError, setRepeatRecipe, setSelection, setSpacePressed, spacePressedRef, startDuplicate, structuralEditDraft, supportPlacement]);
};
