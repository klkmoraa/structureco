import { describe, expect, it } from 'vitest';
import { resolveSessionHeroId, type SessionStore } from './homeSession';

class MemorySession implements SessionStore {
  private readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe('resolveSessionHeroId', () => {
  it('chooses once and reuses the same valid illustration for the session', () => {
    const session = new MemorySession();
    const ids = ['portal:single', 'truss:warren', 'slab:waffle'] as const;

    expect(resolveSessionHeroId(ids, session, () => 0.7)).toBe('slab:waffle');
    expect(resolveSessionHeroId(ids, session, () => 0)).toBe('slab:waffle');
  });

  it('repairs a stored id that is no longer part of the registry', () => {
    const session = new MemorySession();
    session.setItem('structureco.home.hero', 'removed:asset');

    expect(resolveSessionHeroId(['portal:single', 'beam:simple'], session, () => 0)).toBe('portal:single');
  });

  it('rejects an empty registry rather than inventing an illustration', () => {
    expect(() => resolveSessionHeroId([], new MemorySession(), () => 0)).toThrow('No hay ilustraciones estructurales disponibles');
  });
});
