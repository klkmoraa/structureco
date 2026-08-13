import { describe, expect, it } from 'vitest';
import { bulkPropertyDescriptors } from './bulkEditProperties';
import {
  bulkEditCatalogs,
  bulkEditEs,
  translateBulkEdit,
  type BulkEditCopyKey,
} from './bulkEditCopy';

const keys = Object.keys(bulkEditEs) as BulkEditCopyKey[];

describe('bulk edit copy', () => {
  it('keeps both catalogs structurally identical', () => {
    expect(Object.keys(bulkEditCatalogs.en).sort()).toEqual([...keys].sort());
  });

  it('resolves every key in both languages', () => {
    for (const key of keys) {
      expect(translateBulkEdit('es', key), key).not.toBe('');
      expect(translateBulkEdit('en', key), key).not.toBe('');
    }
  });

  it('keeps interpolation placeholders identical between languages', () => {
    const placeholders = (value: string) => [...value.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)]
      .map((match) => match[1])
      .sort();
    for (const key of keys) {
      expect(placeholders(bulkEditCatalogs.en[key]), key).toEqual(placeholders(bulkEditEs[key]));
    }
  });

  it('interpolates without evaluating the input', () => {
    expect(translateBulkEdit('en', 'summary.members', { count: '<script>' })).toBe('<script> members selected');
    expect(translateBulkEdit('es', 'summary.members', { unused: 1 })).toBe('{count} miembros seleccionados');
  });

  it('labels every declared property and every enum option', () => {
    for (const descriptor of bulkPropertyDescriptors) {
      expect(keys, descriptor.id).toContain(`property.${descriptor.id}`);
      for (const option of descriptor.options ?? []) {
        expect(keys, `${descriptor.id}/${option}`).toContain(`option.${descriptor.id}.${option}`);
      }
    }
  });
});
