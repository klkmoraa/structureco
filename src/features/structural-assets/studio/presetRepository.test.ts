// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  FACTORY_STUDIO_PRESETS,
  STUDIO_PRESET_STORAGE_KEY,
  createPersonalPreset,
  deletePersonalPreset,
  duplicatePersonalPreset,
  normalizeStudioParameters,
  readPersonalPresetLibrary,
  renamePersonalPreset,
  restorePersonalPreset,
  updatePersonalPreset,
  writePersonalPresetLibrary,
} from './presetRepository';

beforeEach(() => localStorage.clear());

describe('Illustration Studio preset boundary', () => {
  it('keeps forty deeply immutable factory presets separate from personal edits', () => {
    expect(FACTORY_STUDIO_PRESETS).toHaveLength(40);
    expect(Object.isFrozen(FACTORY_STUDIO_PRESETS)).toBe(true);
    expect(Object.isFrozen(FACTORY_STUDIO_PRESETS[0])).toBe(true);
    expect(Object.isFrozen(FACTORY_STUDIO_PRESETS[0].parameters)).toBe(true);
    const before = structuredClone(FACTORY_STUDIO_PRESETS[0]);
    const personal = createPersonalPreset([], FACTORY_STUDIO_PRESETS[0].assetId, '  Mi pórtico  ', 'personal-1');
    const edited = updatePersonalPreset(personal, 'personal-1', { widthScale: 1.4, camera: 'front' });
    expect(edited[0].name).toBe('Mi pórtico');
    expect(edited[0].parameters.widthScale).toBe(1.4);
    expect(FACTORY_STUDIO_PRESETS[0]).toEqual(before);
  });

  it('normalizes exact scales and enforces trimmed case-insensitively unique names', () => {
    expect(normalizeStudioParameters({
      assetId: 'beam:two-span', widthScale: 0.72, heightScale: 1.43, depthScale: 1.13,
      material: 'steel', camera: 'side', detail: 'compact', previewTheme: 'dark',
    })).toEqual({
      assetId: 'beam:two-span', widthScale: 0.75, heightScale: 1.4, depthScale: 1.15,
      material: 'steel', camera: 'side', detail: 'compact', previewTheme: 'dark',
    });
    const library = createPersonalPreset([], 'portal:single-bay', 'Modelo A', 'personal-1');
    expect(() => createPersonalPreset(library, 'beam:two-span', ' modelo a ', 'personal-2')).toThrow(/único/i);
    expect(() => renamePersonalPreset(library, 'personal-1', '   ')).toThrow(/nombre/i);
  });

  it('supports rename, duplicate, delete and restore while preserving the personal name', () => {
    let library = createPersonalPreset([], 'truss:warren', 'Original', 'personal-1');
    library = updatePersonalPreset(library, 'personal-1', { assetId: 'slab:waffle', depthScale: 1.35, material: 'timber' });
    library = renamePersonalPreset(library, 'personal-1', '  Favorito  ');
    library = duplicatePersonalPreset(library, 'personal-1', 'Copia', 'personal-2');
    expect(library.map((preset) => preset.name)).toEqual(['Favorito', 'Copia']);
    library = restorePersonalPreset(library, 'personal-1');
    expect(library[0].name).toBe('Favorito');
    expect(library[0].parameters).toMatchObject({ assetId: 'truss:warren', widthScale: 1, heightScale: 1, depthScale: 1, material: 'factory' });
    expect(deletePersonalPreset(library, 'personal-2').map((preset) => preset.id)).toEqual(['personal-1']);
  });

  it('migrates an unversioned library and safely empties corrupt or future payloads without touching structureCo.project', () => {
    const project = '{"protected":"project"}';
    localStorage.setItem('structureCo.project', project);
    localStorage.setItem(STUDIO_PRESET_STORAGE_KEY, JSON.stringify({ presets: [{
      id: 'legacy-1', name: ' Legacy ', factoryAssetId: 'beam:two-span',
      parameters: { assetId: 'beam:two-span', widthScale: 1, heightScale: 1, depthScale: 1, material: 'factory', camera: 'isometric', detail: 'hero', previewTheme: 'light' },
    }] }));
    expect(readPersonalPresetLibrary(localStorage)[0].name).toBe('Legacy');
    expect(localStorage.getItem('structureCo.project')).toBe(project);
    localStorage.setItem(STUDIO_PRESET_STORAGE_KEY, '{corrupt');
    expect(readPersonalPresetLibrary(localStorage)).toEqual([]);
    localStorage.setItem(STUDIO_PRESET_STORAGE_KEY, JSON.stringify({ schemaVersion: 2, presets: [] }));
    expect(readPersonalPresetLibrary(localStorage)).toEqual([]);
    writePersonalPresetLibrary(localStorage, []);
    expect(JSON.parse(localStorage.getItem(STUDIO_PRESET_STORAGE_KEY)!)).toEqual({ schemaVersion: 1, presets: [] });
    expect(localStorage.getItem('structureCo.project')).toBe(project);
  });
});
