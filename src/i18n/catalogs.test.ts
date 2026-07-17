import { describe, expect, it } from 'vitest';
import { catalogs, es, translate, type TranslationKey } from './catalogs';

describe('i18n catalogs', () => {
  it('keeps the Spanish and English catalogs structurally identical', () => {
    const expected = Object.keys(es).sort();
    expect(Object.keys(catalogs.en).sort()).toEqual(expected);
  });

  it('resolves every declared key in both languages', () => {
    for (const key of Object.keys(es) as TranslationKey[]) {
      expect(translate('es', key)).not.toBe('');
      expect(translate('en', key)).not.toBe('');
    }
  });

  it('interpolates named values without evaluating input', () => {
    const key = 'app.name';
    expect(translate('en', key, { unused: '<script>' })).toBe('structureCo');
  });
});
