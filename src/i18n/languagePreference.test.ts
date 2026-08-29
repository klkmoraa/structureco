// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('language preference', () => {
  beforeEach(() => {
    vi.resetModules();
    window.localStorage.clear();
  });

  it('uses Spanish when there is no valid hint', async () => {
    window.localStorage.setItem('structureCo.languageHint', 'pt');
    const { preloadPreferredCatalog } = await import('./languagePreference');

    expect(preloadPreferredCatalog()).toBe('es');
  });

  it('remembers and preloads English as a non-authoritative hint', async () => {
    const catalog = await import('./catalogs');
    const { rememberLanguage, preloadPreferredCatalog } = await import('./languagePreference');

    rememberLanguage('en');
    expect(preloadPreferredCatalog()).toBe('en');
    await catalog.loadCatalog('en');

    expect(catalog.isCatalogReady('en')).toBe(true);
  });
});
