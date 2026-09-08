// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCanvasShortcuts, type UseCanvasShortcutsOptions } from './useCanvasShortcuts';

describe('useCanvasShortcuts', () => {
  const createDefaultOptions = (overrides?: Partial<UseCanvasShortcutsOptions>): UseCanvasShortcutsOptions => {
    const hostEl = document.createElement('div');
    document.body.appendChild(hostEl);
    return {
      hostRef: { current: hostEl },
      spacePressedRef: { current: false },
      setSpacePressed: vi.fn(),
      supportPlacement: null,
      cancelSupportPlacement: vi.fn(),
      candidatePicker: null,
      closeCandidatePicker: vi.fn(),
      structuralEditDraft: null,
      cancelStructuralEdit: vi.fn(),
      selection: null,
      editCapabilities: { structural: true },
      repeatCandidate: null,
      activateRepeat: vi.fn(),
      compactCanvasChrome: false,
      copyStructuralSelection: vi.fn(),
      pasteStructuralSelection: vi.fn(),
      startDuplicate: vi.fn(),
      duplicateDraft: null,
      setDuplicateDraft: vi.fn(),
      setActiveTool: vi.fn(),
      cancelActiveInteraction: vi.fn(),
      setMemberStart: vi.fn(),
      setQuickEntry: vi.fn(),
      setQuickEntryError: vi.fn(),
      setRepeatRecipe: vi.fn(),
      setSelection: vi.fn(),
      setCut: vi.fn(),
      deleteSelection: vi.fn(),
      ...overrides,
    };
  };

  it('handles Space keydown and keyup for canvas panning', () => {
    const opts = createDefaultOptions();
    renderHook(() => useCanvasShortcuts(opts));

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    expect(opts.setSpacePressed).toHaveBeenCalledWith(true);

    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
    expect(opts.setSpacePressed).toHaveBeenCalledWith(false);
  });

  it('triggers deleteSelection on Delete key', () => {
    const opts = createDefaultOptions();
    renderHook(() => useCanvasShortcuts(opts));

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
    expect(opts.deleteSelection).toHaveBeenCalled();
  });

  it('cancels active interactions on Escape', () => {
    const opts = createDefaultOptions();
    renderHook(() => useCanvasShortcuts(opts));

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(opts.cancelActiveInteraction).toHaveBeenCalled();
    expect(opts.setActiveTool).toHaveBeenCalledWith('select');
  });

  it('closes candidatePicker when Escape is pressed while picker is open', () => {
    const opts = createDefaultOptions({ candidatePicker: {} });
    renderHook(() => useCanvasShortcuts(opts));

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(opts.closeCandidatePicker).toHaveBeenCalled();
    expect(opts.cancelActiveInteraction).not.toHaveBeenCalled();
  });
});
