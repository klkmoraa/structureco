import { describe, expect, it } from 'vitest';
import {
  activeEditorLayerPreset,
  createEditorLayerState,
  editorLayerReducer,
  parseEditorLayerState,
} from './editorLayers';

describe('editor layer state', () => {
  it('starts with a focused modelling view: model and simple loads only', () => {
    expect(createEditorLayerState()).toEqual({
      model: true,
      loads: true,
      dimensions: false,
      ids: false,
      results: false,
      labels: true,
      help: false,
      diagnostics: true,
      // El mapa de calor reinterpreta el color del dibujo técnico: se pide, no se hereda.
      heatmap: false,
    });
  });

  it('toggles presentation layers without allowing the model to disappear', () => {
    const initial = createEditorLayerState();
    const withoutLoads = editorLayerReducer(initial, { type: 'toggle', layer: 'loads' });
    expect(withoutLoads.loads).toBe(false);
    expect(withoutLoads.model).toBe(true);
    expect(editorLayerReducer(withoutLoads, { type: 'toggle', layer: 'model' })).toBe(withoutLoads);
    expect(editorLayerReducer(withoutLoads, { type: 'set', layer: 'model', visible: false })).toBe(withoutLoads);
  });

  it('resets all ephemeral choices to the documented defaults', () => {
    const changed = editorLayerReducer(
      editorLayerReducer(createEditorLayerState(), { type: 'toggle', layer: 'labels' }),
      { type: 'toggle', layer: 'results' },
    );
    expect(editorLayerReducer(changed, { type: 'reset' })).toEqual(createEditorLayerState());
  });

  it('applies a preset as a whole view instead of toggling one entry', () => {
    const results = editorLayerReducer(createEditorLayerState(), { type: 'preset', preset: 'results' });
    expect(results).toMatchObject({ model: true, results: true, heatmap: false, loads: false, help: false });

    const clean = editorLayerReducer(results, { type: 'preset', preset: 'clean' });
    expect(clean).toMatchObject({ model: true, ids: false, labels: false, diagnostics: false, heatmap: false });
  });

  it('does not restore a demand map that predates explicit opt-in persistence', () => {
    const restored = parseEditorLayerState(JSON.stringify({
      model: true,
      results: false,
      heatmap: true,
    }));

    expect(restored.heatmap).toBe(false);
    expect(parseEditorLayerState(JSON.stringify({
      model: true,
      results: false,
      heatmap: true,
      heatmapExplicit: true,
    })).heatmap).toBe(true);
  });

  it('reports the preset that matches the current view, and none once the user diverges', () => {
    const state = createEditorLayerState();
    // La vista de apertura es de trabajo, no un preset: desde que «Todo»
    // enciende de verdad todas las capas, ningún preset coincide con ella.
    expect(activeEditorLayerPreset(state)).toBeNull();
    expect(activeEditorLayerPreset(editorLayerReducer(state, { type: 'preset', preset: 'all' }))).toBe('all');
    expect(activeEditorLayerPreset(editorLayerReducer(state, { type: 'preset', preset: 'loads' }))).toBe('loads');
    const diverged = editorLayerReducer(
      editorLayerReducer(state, { type: 'preset', preset: 'loads' }),
      { type: 'toggle', layer: 'ids' },
    );
    expect(activeEditorLayerPreset(diverged)).toBeNull();
  });

  it('restores only validated presentation values and always protects the model', () => {
    expect(parseEditorLayerState('{invalid')).toEqual(createEditorLayerState());
    expect(parseEditorLayerState(JSON.stringify({ model: false, loads: false, labels: true }))).toMatchObject({
      model: true,
      loads: false,
      labels: true,
      results: false,
    });
  });
});
