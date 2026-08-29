import { describe, expect, it, vi } from 'vitest';
import { en } from './catalogEn';
import { es, translate, type TranslationKey } from './catalogs';

describe('i18n catalogs', () => {
  it('keeps the Spanish and English catalogs structurally identical', () => {
    const expected = Object.keys(es).sort();
    expect(Object.keys(en).sort()).toEqual(expected);
  });

  it('resolves every declared key in both languages', () => {
    for (const key of Object.keys(es) as TranslationKey[]) {
      expect(translate('es', key)).not.toBe('');
      expect(translate('en', key)).not.toBe('');
    }
  });

  it('keeps interpolation placeholders identical between languages', () => {
    const placeholders = (value: string) => [...value.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)]
      .map((match) => match[1])
      .sort();
    for (const key of Object.keys(es) as TranslationKey[]) {
      expect(placeholders(en[key]), key).toEqual(placeholders(es[key]));
    }
  });

  it('preserves technical identifiers and magnitudes during interpolation', () => {
    const variables = { completed: 'N-07', total: '12.50 kN' };
    expect(translate('es', 'classroom.progressCount', variables)).toContain('N-07');
    expect(translate('es', 'classroom.progressCount', variables)).toContain('12.50 kN');
    expect(translate('en', 'classroom.progressCount', variables)).toContain('N-07');
    expect(translate('en', 'classroom.progressCount', variables)).toContain('12.50 kN');
  });

  it('interpolates named values without evaluating input', () => {
    // La fixture se deriva del propio catálogo en vez de fijar una clave del
    // producto: citarla aquí la haría parecer viva para `verify:i18n` aunque
    // ninguna superficie la use, que es como `app.name` sobrevivió hasta ahora.
    const key = (Object.keys(es) as TranslationKey[]).find((candidate) => !en[candidate].includes('{'));
    expect(key, 'el catálogo debe declarar al menos una clave sin interpolación').toBeDefined();
    expect(translate('en', key!, { unused: '<script>' })).toBe(en[key!]);
  });

  it('keeps Spanish synchronous while English arrives only when requested', async () => {
    vi.resetModules();
    const fresh = await import('./catalogs');

    expect(fresh.isCatalogReady('es')).toBe(true);
    expect(fresh.isCatalogReady('en')).toBe(false);
    expect(fresh.translate('en', 'app.professionalNote')).toBe(fresh.es['app.professionalNote']);

    await fresh.loadCatalog('en');

    expect(fresh.isCatalogReady('en')).toBe(true);
    expect(fresh.translate('en', 'app.professionalNote')).toContain('educational support tool');
  });
});
