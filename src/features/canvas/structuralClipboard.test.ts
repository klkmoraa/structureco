import { describe, expect, it, vi } from 'vitest';
import type { ModelClipboard } from '../../data/modelOperations';
import {
  decodeStructuralClipboard,
  encodeStructuralClipboard,
  readClipboardText,
  supportsClipboardReadText,
} from './structuralClipboard';

const memberClipboard: ModelClipboard = {
  kind: 'member',
  member: {
    id: 'M7', i: 'N7', j: 'N8', type: 'frame',
    materialId: 'steel-a36', materialOrigin: 'catalog',
    sectionId: 'w310x39', sectionOrigin: 'catalog',
    E: 200_000_000, A: 0.0049, I: 0.000_012, density: 7850,
  },
  nodes: [
    { id: 'N7', x: 1, y: 2, support: { type: 'none' } },
    { id: 'N8', x: 5, y: 2, support: { type: 'none' } },
  ],
  memberLoads: [],
  initialEffects: [],
};

describe('structural clipboard transport', () => {
  it('does not mistake navigator.clipboard alone for readText availability', () => {
    expect(supportsClipboardReadText({})).toBe(false);
    expect(supportsClipboardReadText({ readText: vi.fn() })).toBe(true);
  });

  it('reports unavailable and blocked reads without throwing a broken UI action', async () => {
    await expect(readClipboardText(undefined)).resolves.toEqual({ status: 'unavailable' });
    await expect(readClipboardText({ readText: vi.fn().mockRejectedValue(new DOMException('Denied', 'NotAllowedError')) }))
      .resolves.toEqual({ status: 'blocked' });
  });

  it('round-trips explicit member catalog identity and provenance without float matching', () => {
    const decoded = decodeStructuralClipboard(encodeStructuralClipboard(memberClipboard));

    expect(decoded).toMatchObject({
      kind: 'member',
      member: {
        materialId: 'steel-a36',
        materialOrigin: 'catalog',
        sectionId: 'w310x39',
        sectionOrigin: 'catalog',
      },
    });
  });

  it('does not interpret arbitrary clipboard text as a structural model', () => {
    expect(decodeStructuralClipboard('A\tB\n1\t2')).toBeNull();
  });
});
