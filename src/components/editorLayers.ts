export type EditorLayerId =
  | 'model'
  | 'loads'
  | 'dimensions'
  | 'ids'
  | 'results'
  | 'labels'
  | 'help'
  | 'diagnostics';

export type EditorLayerState = Record<EditorLayerId, boolean>;

export type EditorLayerAction =
  | { type: 'toggle'; layer: EditorLayerId }
  | { type: 'set'; layer: EditorLayerId; visible: boolean }
  | { type: 'reset' };

export const DEFAULT_EDITOR_LAYERS: Readonly<EditorLayerState> = Object.freeze({
  model: true,
  loads: true,
  dimensions: true,
  ids: true,
  results: true,
  labels: true,
  help: true,
  diagnostics: true,
});

export const editorLayerReducer = (
  state: EditorLayerState,
  action: EditorLayerAction,
): EditorLayerState => {
  if (action.type === 'reset') return { ...DEFAULT_EDITOR_LAYERS };
  if (action.layer === 'model') return state;
  const visible = action.type === 'toggle' ? !state[action.layer] : action.visible;
  if (state[action.layer] === visible) return state;
  return { ...state, [action.layer]: visible, model: true };
};

export const createEditorLayerState = (): EditorLayerState => ({ ...DEFAULT_EDITOR_LAYERS });

