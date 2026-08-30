export type EditorLayerId =
  | 'model'
  | 'loads'
  | 'dimensions'
  | 'ids'
  | 'results'
  | 'labels'
  | 'help'
  | 'diagnostics'
  | 'heatmap';

export type EditorLayerState = Record<EditorLayerId, boolean>;

export const EDITOR_LAYER_STORAGE_KEY = 'structureco:editor-layers:v1';

const EDITOR_LAYER_IDS: readonly EditorLayerId[] = [
  'model',
  'loads',
  'dimensions',
  'ids',
  'results',
  'labels',
  'help',
  'diagnostics',
  'heatmap',
];

/**
 * Vistas de tarea. Un preset no es una capa más: es la respuesta a "¿qué estoy
 * haciendo ahora?" — modelar, cargar, leer resultados o capturar — y por eso
 * fija el estado completo en vez de conmutar una entrada.
 */
export type EditorLayerPresetId = 'all' | 'model' | 'loads' | 'results' | 'clean';

export type EditorLayerAction =
  | { type: 'toggle'; layer: EditorLayerId }
  | { type: 'set'; layer: EditorLayerId; visible: boolean }
  | { type: 'preset'; preset: EditorLayerPresetId }
  | { type: 'reset' };

export const DEFAULT_EDITOR_LAYERS: Readonly<EditorLayerState> = Object.freeze({
  model: true,
  loads: true,
  // El lienzo abre para modelar: las cargas permanecen verificables, pero las
  // cotas, IDs y resultados se piden cuando hacen falta.
  dimensions: false,
  ids: false,
  results: false,
  labels: true,
  help: false,
  diagnostics: true,
  // El mapa de calor reinterpreta el color de las barras: se pide, no se hereda.
  heatmap: false,
});

const ALL_EDITOR_LAYERS: Readonly<EditorLayerState> = Object.freeze({
  model: true,
  loads: true,
  dimensions: true,
  ids: true,
  results: true,
  labels: true,
  help: true,
  diagnostics: true,
  heatmap: true,
});

export const EDITOR_LAYER_PRESETS: Readonly<Record<EditorLayerPresetId, Readonly<EditorLayerState>>> = Object.freeze({
  all: ALL_EDITOR_LAYERS,
  model: Object.freeze({
    model: true, loads: false, dimensions: true, ids: true,
    results: false, labels: false, help: true, diagnostics: true, heatmap: false,
  }),
  loads: Object.freeze({
    model: true, loads: true, dimensions: true, ids: true,
    results: false, labels: true, help: true, diagnostics: true, heatmap: false,
  }),
  results: Object.freeze({
    model: true, loads: false, dimensions: false, ids: true,
    // Resultados y mapa son lecturas independientes: el mapa sólo se enciende
    // desde su control explícito en Capas.
    results: true, labels: true, help: false, diagnostics: true, heatmap: false,
  }),
  clean: Object.freeze({
    model: true, loads: false, dimensions: true, ids: false,
    results: false, labels: false, help: false, diagnostics: false, heatmap: false,
  }),
});

export const editorLayerReducer = (
  state: EditorLayerState,
  action: EditorLayerAction,
): EditorLayerState => {
  if (action.type === 'reset') return { ...DEFAULT_EDITOR_LAYERS };
  if (action.type === 'preset') return { ...EDITOR_LAYER_PRESETS[action.preset] };
  if (action.layer === 'model') return state;
  const visible = action.type === 'toggle' ? !state[action.layer] : action.visible;
  if (state[action.layer] === visible) return state;
  return { ...state, [action.layer]: visible, model: true };
};

/** Preset cuyo estado coincide exactamente con el actual, o `null` si el usuario ya se salió de la vista. */
export const activeEditorLayerPreset = (state: EditorLayerState): EditorLayerPresetId | null => {
  for (const [id, preset] of Object.entries(EDITOR_LAYER_PRESETS) as Array<[EditorLayerPresetId, EditorLayerState]>) {
    if (EDITOR_LAYER_IDS.every((layer) => preset[layer] === state[layer])) return id;
  }
  return null;
};

export const createEditorLayerState = (): EditorLayerState => ({ ...DEFAULT_EDITOR_LAYERS });

export const parseEditorLayerState = (serialized: string | null): EditorLayerState => {
  if (!serialized) return createEditorLayerState();
  try {
    const parsed = JSON.parse(serialized) as (Partial<EditorLayerState> & { heatmapExplicit?: boolean }) | null;
    if (!parsed || typeof parsed !== 'object') return createEditorLayerState();
    return Object.fromEntries(EDITOR_LAYER_IDS.map((id) => [
      id,
      id === 'model'
        ? true
        : id === 'heatmap'
          // Los estados v1 podían quedar encendidos por el preset Resultados.
          // Sólo restauramos el mapa cuando una versión nueva registró que
          // hubo una activación explícita.
          ? parsed.heatmap === true && parsed.heatmapExplicit === true
          : typeof parsed[id] === 'boolean' ? parsed[id] : DEFAULT_EDITOR_LAYERS[id],
    ])) as EditorLayerState;
  } catch {
    return createEditorLayerState();
  }
};

export const createPersistedEditorLayerState = (): EditorLayerState => {
  if (typeof window === 'undefined') return createEditorLayerState();
  try {
    return parseEditorLayerState(window.localStorage.getItem(EDITOR_LAYER_STORAGE_KEY));
  } catch {
    return createEditorLayerState();
  }
};

export const persistEditorLayerState = (state: EditorLayerState): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(EDITOR_LAYER_STORAGE_KEY, JSON.stringify({
      ...state,
      model: true,
      heatmapExplicit: state.heatmap,
    }));
  } catch {
    // Layer choices are optional presentation state and never block editing.
  }
};
