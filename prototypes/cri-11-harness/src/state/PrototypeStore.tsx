/**
 * Estado del prototipo.
 *
 * El reparto sigue el mapa de ownership de CRI-9 §6 y las flechas que NO
 * existen importan tanto como las que sí:
 *
 *   · Los ejes del harness (viewport, tema, idioma, modo, input, estado) NO
 *     pueden tocar el modelo. Cambiar de viewport no muta nada del dominio.
 *   · La composición es una SALIDA del resolutor, nunca una entrada. Nadie
 *     escribe `composition: 'M1'`.
 *   · `stale` no se escribe: se deriva de haber destruido el resultado.
 *   · El broker decide qué le pasa a lo que ya estaba abierto; las superficies
 *     no piden su propia presentación.
 *
 * Fase B añade el «modelo» de verdad: `ModelEdits` + `deriveModel` (crear,
 * mover, borrar, cambiar apoyo), undo/redo sobre esas ediciones, selección
 * MÚLTIPLE (homogénea y heterogénea), cámara de lienzo (pan/zoom) y los
 * hallazgos de Model Doctor derivados del modelo efectivo.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import {
  buildFixtureAnalysis,
  canPaintEvidence,
  deriveAnalysisPhase,
  initialAnalysisState,
  type AnalysisPhase,
  type AnalysisState,
  type Evidence,
  type HarnessStateId,
  type ReliabilityLevel,
} from '../core/analysis';
import {
  closeSurface,
  degradeToPeek,
  initialBrokerState,
  migrateForComposition,
  openSurface,
  restoreFromPeek,
  type BrokerState,
} from '../core/broker';
import { deriveFindings, type Finding, type FindingSeverity } from '../core/doctor';
import { orientationOf, useDeviceCapabilities, useObservedSize, useWindowSize } from '../core/environment';
import { loadFixture, type Fixture, type FixtureLoad, type FixtureMember, type FixtureNode, type ScenarioId, type SupportKind } from '../core/fixtures';
import { translatorFor, VOICE_COPY, type Locale, type Translate, type VoiceId } from '../core/i18n';
import { deriveModel, emptyEdits, modelEditsStamp, type EffectiveModel, type ModelEdits } from '../core/model';
import { resolveWithHysteresis, safeRect, VIEWPORT_PRESETS, type CompositionId, type Verdict, type Viewport } from '../core/resolver';
import type { SurfaceId } from '../core/surfaces';
import { observeLongTasks, record, setTelemetryContext } from '../core/telemetry';
import type { CommandContext } from '../core/commands';

export type InputAxis = 'mouse' | 'touch' | 'mixed';
export type ThemeAxis = 'light' | 'dark';
export type ModeAxis = 'essential' | 'complete';
export type MotionAxis = 'normal' | 'reduced';
export type ToolId = 'select' | 'node' | 'member' | 'support' | 'load';
export type EntityTab = 'node' | 'member' | 'load';
export type SelectionFilter = 'all' | 'node' | 'member';

export interface HarnessAxes {
  scenario: ScenarioId;
  viewportPreset: string;
  /** `true` invierte ancho y alto del preset. */
  landscape: boolean;
  /** El marco desaparece y el prototipo ocupa la ventana real. */
  realWindow: boolean;
  input: InputAxis;
  theme: ThemeAxis;
  locale: Locale;
  mode: ModeAxis;
  motion: MotionAxis;
  voice: VoiceId;
  state: HarnessStateId;
  /** U-13: el parámetro del experimento de histéresis, no una constante. */
  hysteresisPx: number;
}

export interface SelectionRef {
  kind: 'member' | 'node';
  id: string;
}

/** Un solo mecanismo de preview→commit/cancel para sección y apoyo, individual o en bloque. */
export interface DraftState {
  kind: 'section' | 'support';
  targetIds: string[];
  value: string;
  /** Valor original por objeto — para mostrar «mixto» cuando la selección difiere. */
  original: Record<string, string>;
}

export interface CameraState {
  /** 1 = ajuste base. El pan se aplica FUERA del zoom: arrastrar N px siempre mueve N px. */
  zoom: number;
  panX: number;
  panY: number;
}

const sameRef = (a: SelectionRef, b: SelectionRef) => a.kind === b.kind && a.id === b.id;
const withoutRef = (list: SelectionRef[], ref: SelectionRef) => list.filter((item) => !sameRef(item, ref));

export interface PrototypeState {
  axes: HarnessAxes;
  screen: 'welcome' | 'workspace';
  selection: SelectionRef[];
  selectionFilter: SelectionFilter;
  broker: BrokerState;
  evidence: Evidence;
  layers: { grid: boolean; loads: boolean; supports: boolean; labels: boolean };
  draft: DraftState | null;
  /** El «modelo» del prototipo: fixture base + parche inmutable. */
  edits: ModelEdits;
  history: { past: ModelEdits[]; future: ModelEdits[] };
  analysis: AnalysisState;
  dense: { query: string; onlySelection: boolean; entity: EntityTab; sortKey: string | null; sortDir: 'asc' | 'desc'; tab: 'model' | 'summary' };
  lastComposition: CompositionId | null;
  showAllProperties: boolean;
  activeTool: ToolId;
  /** Primer nudo elegido al crear un miembro (flujo de dos clics). */
  pendingMemberStart: string | null;
  camera: CameraState;
  doctorAcknowledged: Record<string, true>;
  doctorFilter: FindingSeverity | 'all';
  /**
   * Contexto de análisis (D-09) — vivía como `useState` local dentro de
   * `AnalysisSetup.tsx`. Al cruzar Compact (K0) el árbol de slots monta la
   * puerta en un padre distinto (`pt-sheet` en vez de `pt-inset`) y React la
   * remonta: el estado local se perdía en la propia frontera que Fase C tiene
   * que probar que no pierde nada. Vive aquí para sobrevivir a eso, y de paso
   * es lo que permite que la TopBar la resuma sin abrirla.
   */
  analysisSetup: { activeCases: Record<string, boolean>; order: 'first' | 'pdelta' };
}

const initialAxes: HarnessAxes = {
  scenario: 'portal-basic',
  viewportPreset: '1440x900',
  landscape: false,
  realWindow: false,
  input: 'mouse',
  theme: 'light',
  locale: 'es-MX',
  mode: 'complete',
  motion: 'normal',
  voice: 'A',
  state: 'current',
  hysteresisPx: 24,
};

const initialCamera: CameraState = { zoom: 1, panX: 0, panY: 0 };

const initialState: PrototypeState = {
  axes: initialAxes,
  screen: 'welcome',
  selection: [],
  selectionFilter: 'all',
  broker: initialBrokerState,
  evidence: 'none',
  layers: { grid: true, loads: true, supports: true, labels: true },
  draft: null,
  edits: emptyEdits(),
  history: { past: [], future: [] },
  analysis: initialAnalysisState,
  dense: { query: '', onlySelection: false, entity: 'member', sortKey: null, sortDir: 'asc', tab: 'model' },
  lastComposition: null,
  showAllProperties: false,
  activeTool: 'select',
  pendingMemberStart: null,
  camera: initialCamera,
  doctorAcknowledged: {},
  doctorFilter: 'all',
  analysisSetup: { activeCases: {}, order: 'first' },
};

type Action =
  | { type: 'axis/set'; patch: Partial<HarnessAxes> }
  | { type: 'screen/continue' }
  | { type: 'screen/welcome' }
  | { type: 'selection/set'; refs: SelectionRef[] }
  | { type: 'selection/toggle'; ref: SelectionRef }
  | { type: 'selection/merge'; refs: SelectionRef[] }
  | { type: 'selectionFilter/set'; filter: SelectionFilter }
  | { type: 'surface/open'; surface: SurfaceId; composition: CompositionId; invoker?: string }
  | { type: 'surface/close'; surface: SurfaceId }
  | { type: 'surface/peek'; surface: SurfaceId }
  | { type: 'surface/restore'; composition: CompositionId }
  | { type: 'evidence/set'; evidence: Evidence }
  | { type: 'layer/toggle'; layer: keyof PrototypeState['layers'] }
  | { type: 'draft/open'; draft: DraftState }
  | { type: 'draft/preview'; value: string }
  | { type: 'draft/commit' }
  | { type: 'draft/cancel' }
  | { type: 'analysis/start' }
  | { type: 'analysis/finish'; level: ReliabilityLevel }
  | { type: 'composition/changed'; composition: CompositionId }
  | { type: 'dense/filter'; patch: Partial<PrototypeState['dense']> }
  | { type: 'properties/toggle' }
  | { type: 'harnessState/apply'; state: HarnessStateId }
  | { type: 'tool/set'; tool: ToolId }
  | { type: 'model/pendingMemberStart'; nodeId: string | null }
  | { type: 'model/addNode'; node: FixtureNode }
  | { type: 'model/addMember'; member: FixtureMember }
  | { type: 'model/addLoad'; load: FixtureLoad }
  | { type: 'model/moveNode'; id: string; x: number; y: number }
  | { type: 'model/deleteSelected' }
  | { type: 'history/undo' }
  | { type: 'history/redo' }
  | { type: 'camera/set'; patch: Partial<CameraState> }
  | { type: 'camera/zoomBy'; factor: number; anchor?: { x: number; y: number } }
  | { type: 'camera/reset' }
  | { type: 'doctor/acknowledge'; id: string }
  | { type: 'doctor/filter'; severity: FindingSeverity | 'all' }
  | { type: 'analysisSetup/toggleCase'; caseId: string }
  | { type: 'analysisSetup/setOrder'; order: 'first' | 'pdelta' };

/**
 * Fail-closed: invalidar NO marca el resultado, lo destruye. `stale` se deriva.
 * Es la propiedad estructural que CRI-9 pide proteger explícitamente (U-06).
 */
const invalidate = (analysis: AnalysisState): AnalysisState => ({
  ...analysis,
  result: null,
  hadAnalysis: analysis.hadAnalysis || analysis.result !== null,
  isAnalyzing: false,
});

const HISTORY_LIMIT = 50;

/** Cualquier mutación del modelo pasa por aquí: empuja undo, invalida el resultado, limpia redo. */
const applyEdits = (state: PrototypeState, edits: ModelEdits): PrototypeState => ({
  ...state,
  edits,
  history: { past: [...state.history.past.slice(-(HISTORY_LIMIT - 1)), state.edits], future: [] },
  analysis: invalidate(state.analysis),
  evidence: 'none',
  axes: { ...state.axes, state: state.analysis.hadAnalysis || state.analysis.result ? 'stale' : state.axes.state },
});

const applyHarnessState = (state: PrototypeState, id: HarnessStateId): PrototypeState => {
  const fixture = loadFixture(state.axes.scenario);
  const model = deriveModel(fixture, state.edits);
  const stamp = modelEditsStamp(fixture.id, state.edits);
  const build = (level: ReliabilityLevel) => buildFixtureAnalysis(model, stamp, { level });

  switch (id) {
    case 'current':
      return { ...state, analysis: { ...state.analysis, result: build('reliable'), hadAnalysis: true, isAnalyzing: false, connectivity: 'online', persistence: 'saved' } };
    case 'stale':
      return { ...state, analysis: { ...invalidate({ ...state.analysis, hadAnalysis: true }), connectivity: 'online', persistence: 'saved' }, evidence: 'none' };
    case 'limited':
      return { ...state, analysis: { ...state.analysis, result: build('limited'), hadAnalysis: true, isAnalyzing: false, connectivity: 'online', persistence: 'saved' } };
    case 'unreliable':
      return { ...state, analysis: { ...state.analysis, result: build('unreliable'), hadAnalysis: true, isAnalyzing: false, connectivity: 'online', persistence: 'saved' } };
    case 'failed':
      return { ...state, analysis: { ...state.analysis, result: build('failed'), hadAnalysis: true, isAnalyzing: false, connectivity: 'online', persistence: 'saved' }, evidence: 'none' };
    case 'offline':
      return { ...state, analysis: { ...state.analysis, connectivity: 'offline' } };
    case 'recovery':
      return { ...state, analysis: { ...state.analysis, persistence: 'conflict' } };
    default:
      return state;
  }
};

const clampZoom = (value: number) => Math.min(4, Math.max(0.4, value));

const reducer = (state: PrototypeState, action: Action): PrototypeState => {
  switch (action.type) {
    case 'axis/set': {
      const axes = { ...state.axes, ...action.patch };
      // Cambiar de escenario cambia de modelo: nada del anterior le corresponde.
      if (action.patch.scenario && action.patch.scenario !== state.axes.scenario) {
        return {
          ...initialState,
          axes,
          screen: state.screen,
          broker: initialBrokerState,
          lastComposition: state.lastComposition,
        };
      }
      if (action.patch.state && action.patch.state !== state.axes.state) {
        return applyHarnessState({ ...state, axes }, action.patch.state);
      }
      return { ...state, axes };
    }

    case 'screen/continue':
      return { ...state, screen: 'workspace' };

    case 'screen/welcome':
      return { ...state, screen: 'welcome' };

    case 'selection/set':
      return { ...state, selection: action.refs, draft: action.refs.length > 0 ? state.draft : null };

    case 'selection/toggle': {
      const exists = state.selection.some((item) => sameRef(item, action.ref));
      const selection = exists ? withoutRef(state.selection, action.ref) : [...state.selection, action.ref];
      return { ...state, selection, draft: selection.length > 0 ? state.draft : null };
    }

    case 'selection/merge': {
      const merged = [...state.selection];
      for (const ref of action.refs) if (!merged.some((item) => sameRef(item, ref))) merged.push(ref);
      return { ...state, selection: merged };
    }

    case 'selectionFilter/set':
      return { ...state, selectionFilter: action.filter };

    case 'surface/open':
      return {
        ...state,
        broker: openSurface(state.broker, action.surface, {
          composition: action.composition,
          dirtyDraftIn: state.draft ? 'detail' : null,
          invoker: action.invoker,
        }),
      };

    case 'surface/close':
      return { ...state, broker: closeSurface(state.broker, action.surface) };

    case 'surface/peek':
      return { ...state, broker: degradeToPeek(state.broker, action.surface) };

    case 'surface/restore':
      return { ...state, broker: restoreFromPeek(state.broker, { composition: action.composition }) };

    case 'evidence/set':
      return { ...state, evidence: action.evidence };

    case 'layer/toggle':
      return { ...state, layers: { ...state.layers, [action.layer]: !state.layers[action.layer] } };

    case 'draft/open':
      return { ...state, draft: action.draft };

    case 'draft/preview':
      return state.draft ? { ...state, draft: { ...state.draft, value: action.value } } : state;

    case 'draft/commit': {
      if (!state.draft) return state;
      const { kind, targetIds, value } = state.draft;
      const edits =
        kind === 'section'
          ? { ...state.edits, sectionOverrides: { ...state.edits.sectionOverrides, ...Object.fromEntries(targetIds.map((id) => [id, value])) } }
          : { ...state.edits, supportOverrides: { ...state.edits.supportOverrides, ...Object.fromEntries(targetIds.map((id) => [id, value as SupportKind])) } };
      return { ...applyEdits(state, edits), draft: null };
    }

    case 'draft/cancel':
      return { ...state, draft: null };

    case 'analysis/start':
      return { ...state, analysis: { ...state.analysis, isAnalyzing: true } };

    case 'analysis/finish': {
      const fixture = loadFixture(state.axes.scenario);
      const model = deriveModel(fixture, state.edits);
      const stamp = modelEditsStamp(fixture.id, state.edits);
      const result = buildFixtureAnalysis(model, stamp, { level: action.level });
      const harnessState: HarnessStateId =
        action.level === 'reliable' ? 'current' : action.level === 'failed' ? 'failed' : action.level;
      return {
        ...state,
        analysis: { ...state.analysis, result, hadAnalysis: true, isAnalyzing: false },
        axes: { ...state.axes, state: harnessState },
      };
    }

    case 'composition/changed':
      return {
        ...state,
        lastComposition: action.composition,
        broker: migrateForComposition(state.broker, action.composition),
      };

    case 'dense/filter':
      return { ...state, dense: { ...state.dense, ...action.patch } };

    case 'properties/toggle':
      return { ...state, showAllProperties: !state.showAllProperties };

    case 'harnessState/apply':
      return applyHarnessState(state, action.state);

    case 'tool/set':
      return { ...state, activeTool: action.tool, pendingMemberStart: null };

    case 'model/pendingMemberStart':
      return { ...state, pendingMemberStart: action.nodeId };

    case 'model/addNode':
      return applyEdits(state, { ...state.edits, addedNodes: [...state.edits.addedNodes, action.node] });

    case 'model/addMember':
      return { ...applyEdits(state, { ...state.edits, addedMembers: [...state.edits.addedMembers, action.member] }), pendingMemberStart: null };

    case 'model/addLoad':
      return applyEdits(state, { ...state.edits, addedLoads: [...state.edits.addedLoads, action.load] });

    case 'model/moveNode':
      return applyEdits(state, { ...state.edits, positionOverrides: { ...state.edits.positionOverrides, [action.id]: { x: action.x, y: action.y } } });

    case 'model/deleteSelected': {
      if (state.selection.length === 0) return state;
      const deletedIds = { ...state.edits.deletedIds };
      for (const ref of state.selection) deletedIds[ref.id] = true;
      return { ...applyEdits(state, { ...state.edits, deletedIds }), selection: [] };
    }

    case 'history/undo': {
      const last = state.history.past[state.history.past.length - 1];
      if (!last) return state;
      return {
        ...state,
        edits: last,
        history: { past: state.history.past.slice(0, -1), future: [state.edits, ...state.history.future] },
        analysis: invalidate(state.analysis),
        evidence: 'none',
      };
    }

    case 'history/redo': {
      const next = state.history.future[0];
      if (!next) return state;
      return {
        ...state,
        edits: next,
        history: { past: [...state.history.past, state.edits], future: state.history.future.slice(1) },
        analysis: invalidate(state.analysis),
        evidence: 'none',
      };
    }

    case 'camera/set':
      return { ...state, camera: { ...state.camera, ...action.patch } };

    case 'camera/zoomBy':
      return { ...state, camera: { ...state.camera, zoom: clampZoom(state.camera.zoom * action.factor) } };

    case 'camera/reset':
      return { ...state, camera: initialCamera };

    case 'doctor/acknowledge':
      return { ...state, doctorAcknowledged: { ...state.doctorAcknowledged, [action.id]: true } };

    case 'doctor/filter':
      return { ...state, doctorFilter: action.severity };

    case 'analysisSetup/toggleCase': {
      const wasActive = state.analysisSetup.activeCases[action.caseId] ?? true;
      return { ...state, analysisSetup: { ...state.analysisSetup, activeCases: { ...state.analysisSetup.activeCases, [action.caseId]: !wasActive } } };
    }

    case 'analysisSetup/setOrder':
      return { ...state, analysisSetup: { ...state.analysisSetup, order: action.order } };

    default:
      return state;
  }
};

export interface PrototypeDerived {
  fixture: Fixture;
  model: EffectiveModel;
  viewport: Viewport;
  verdict: Verdict;
  composition: CompositionId;
  safe: ReturnType<typeof safeRect>;
  phase: AnalysisPhase;
  paintsEvidence: boolean;
  detailPresent: boolean;
  primarySelection: SelectionRef | null;
  t: Translate;
  voice: { hero: string; sub: string };
  reducedMotion: boolean;
  pointerCoarse: boolean;
  orientation: 'portrait' | 'landscape';
  /** Sello del modelo actual; si el resultado no lo lleva, ya no le corresponde. */
  stamp: string;
  findings: Finding[];
  canUndo: boolean;
  canRedo: boolean;
  commandContext: CommandContext;
}

interface StoreValue {
  state: PrototypeState;
  derived: PrototypeDerived;
  dispatch: (action: Action) => void;
  setFrame: (element: HTMLElement | null) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export const presetViewport = (axes: HarnessAxes): Viewport => {
  const preset = VIEWPORT_PRESETS.find((item) => item.id === axes.viewportPreset) ?? VIEWPORT_PRESETS[8];
  return axes.landscape
    ? { width: Math.max(preset.width, preset.height), height: Math.min(preset.width, preset.height) }
    : { width: preset.width, height: preset.height };
};

export const PrototypeProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [frame, setFrame] = useState<HTMLElement | null>(null);
  const capabilities = useDeviceCapabilities();
  const windowSize = useWindowSize(state.axes.realWindow);
  const framed = useObservedSize(state.axes.realWindow ? null : frame, presetViewport(state.axes));
  const viewport = state.axes.realWindow ? windowSize : framed;
  const previousComposition = useRef<CompositionId | null>(null);

  const verdict = useMemo(
    () => resolveWithHysteresis(viewport, previousComposition.current, { bandPx: state.axes.hysteresisPx }),
    [viewport, state.axes.hysteresisPx],
  );

  const detailPresent = state.selection.length > 0 && (state.broker.open.includes('detail') || verdict.composition !== 'K0');

  const derived = useMemo<PrototypeDerived>(() => {
    const fixture = loadFixture(state.axes.scenario);
    const model = deriveModel(fixture, state.edits);
    const phase = deriveAnalysisPhase(state.analysis);
    const primarySelection = state.selection.length > 0 ? state.selection[state.selection.length - 1] : null;
    return {
      fixture,
      model,
      viewport,
      verdict,
      composition: verdict.composition,
      safe: safeRect(verdict, viewport, { detailPresent }),
      phase,
      paintsEvidence: canPaintEvidence(phase) && state.evidence !== 'none',
      detailPresent,
      primarySelection,
      t: translatorFor(state.axes.locale),
      voice: VOICE_COPY[state.axes.voice][state.axes.locale],
      reducedMotion: state.axes.motion === 'reduced' || capabilities.prefersReducedMotion,
      pointerCoarse: state.axes.input === 'touch' || (state.axes.input === 'mixed' && capabilities.pointer !== 'fine'),
      orientation: orientationOf(viewport),
      stamp: modelEditsStamp(fixture.id, state.edits),
      findings: deriveFindings(model),
      canUndo: state.history.past.length > 0,
      canRedo: state.history.future.length > 0,
      commandContext: {
        hasSelection: state.selection.length > 0,
        hasMemberSelection: state.selection.some((ref) => ref.kind === 'member'),
        hasLiveResult: state.analysis.result !== null,
      },
    };
  }, [state, viewport, verdict, detailPresent, capabilities]);

  // Telemetría: el contexto viaja con cada evento, o los números no comparan.
  useEffect(() => {
    setTelemetryContext(() => ({
      scenario: state.axes.scenario,
      composition: verdict.composition,
      viewport: `${viewport.width}×${viewport.height}`,
      input: state.axes.input,
      theme: state.axes.theme,
      locale: state.axes.locale,
      mode: state.axes.mode,
      motion: state.axes.motion,
      phase: derived.phase,
      selectionCount: state.selection.length,
    }));
  }, [state.axes, verdict.composition, viewport, derived.phase, state.selection]);

  useEffect(() => observeLongTasks(), []);

  // La composición cambió: se anota, se anuncia y el broker migra lo abierto.
  useEffect(() => {
    if (previousComposition.current === verdict.composition) return;
    const from = previousComposition.current;
    previousComposition.current = verdict.composition;
    if (from) {
      record('layout_class_changed', { from, to: verdict.composition, width: viewport.width, height: viewport.height });
    }
    dispatch({ type: 'composition/changed', composition: verdict.composition });
  }, [verdict.composition, viewport.width, viewport.height]);

  const value = useMemo<StoreValue>(() => ({ state, derived, dispatch, setFrame }), [state, derived]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export const usePrototype = (): StoreValue => {
  const value = useContext(StoreContext);
  if (!value) throw new Error('usePrototype fuera del PrototypeProvider');
  return value;
};

/** Acciones con telemetría, para que ninguna vista tenga que acordarse. */
export const useActions = () => {
  const { dispatch, derived, state } = usePrototype();

  const selectOne = useCallback(
    (ref: SelectionRef | null) => {
      dispatch({ type: 'selection/set', refs: ref ? [ref] : [] });
      record(ref ? 'selection_committed' : 'selection_cleared', { entityType: ref?.kind ?? null, entityId: ref?.id ?? null });
    },
    [dispatch],
  );

  const toggleSelect = useCallback(
    (ref: SelectionRef) => {
      dispatch({ type: 'selection/toggle', ref });
      record('selection_committed', { entityType: ref.kind, entityId: ref.id, mode: 'toggle' });
    },
    [dispatch],
  );

  const selectMany = useCallback(
    (refs: SelectionRef[], merge: boolean) => {
      if (refs.length === 0 && !merge) {
        dispatch({ type: 'selection/set', refs: [] });
        return;
      }
      dispatch(merge ? { type: 'selection/merge', refs } : { type: 'selection/set', refs });
      record('selection_committed', { mode: merge ? 'marquee-merge' : 'marquee', count: refs.length });
    },
    [dispatch],
  );

  const openSurfaceAction = useCallback(
    (surface: SurfaceId, invoker?: string) => {
      dispatch({ type: 'surface/open', surface, composition: derived.composition, invoker });
      record('surface_opened', { surface });
    },
    [dispatch, derived.composition],
  );

  const closeSurfaceAction = useCallback(
    (surface: SurfaceId) => {
      dispatch({ type: 'surface/close', surface });
      record('surface_closed', { surface });
    },
    [dispatch],
  );

  const peekSurface = useCallback(
    (surface: SurfaceId) => {
      dispatch({ type: 'surface/peek', surface });
      record('surface_peeked', { surface });
    },
    [dispatch],
  );

  const restoreSurface = useCallback(() => {
    dispatch({ type: 'surface/restore', composition: derived.composition });
  }, [dispatch, derived.composition]);

  const invoke = useCallback((commandId: string, route: string) => {
    record('command_invoked', { commandId, route });
  }, []);

  const solve = useCallback(() => {
    record('command_invoked', { commandId: 'analysis.solve', route: 'visible' });
    record('analysis_state_changed', { to: 'calculating' });
    dispatch({ type: 'analysis/start' });
  }, [dispatch]);

  const finishSolve = useCallback(
    (level: ReliabilityLevel) => {
      dispatch({ type: 'analysis/finish', level });
      record('analysis_state_changed', { to: level === 'reliable' ? 'current' : level });
    },
    [dispatch],
  );

  /** Localizar: selecciona, resetea la cámara al encuadre base (visibilidad garantizada) y anuncia. */
  const locate = useCallback(
    (ref: SelectionRef) => {
      dispatch({ type: 'selection/set', refs: [ref] });
      dispatch({ type: 'camera/reset' });
      record('command_invoked', { commandId: 'selection.locate', route: 'row' });
    },
    [dispatch],
  );

  const undo = useCallback(() => {
    dispatch({ type: 'history/undo' });
    record('command_invoked', { commandId: 'history.undo', route: 'visible' });
  }, [dispatch]);

  const redo = useCallback(() => {
    dispatch({ type: 'history/redo' });
    record('command_invoked', { commandId: 'history.redo', route: 'visible' });
  }, [dispatch]);

  const deleteSelected = useCallback(() => {
    if (state.selection.length === 0) return;
    dispatch({ type: 'model/deleteSelected' });
    record('command_invoked', { commandId: 'selection.delete', route: 'visible', count: state.selection.length });
  }, [dispatch, state.selection.length]);

  const setTool = useCallback(
    (tool: ToolId, route: string = 'visible') => {
      dispatch({ type: 'tool/set', tool });
      record('command_invoked', { commandId: `tool.${tool}`, route });
    },
    [dispatch],
  );

  return {
    dispatch,
    selectOne,
    toggleSelect,
    selectMany,
    openSurface: openSurfaceAction,
    closeSurface: closeSurfaceAction,
    peekSurface,
    restoreSurface,
    invoke,
    solve,
    finishSolve,
    locate,
    undo,
    redo,
    deleteSelected,
    setTool,
    state,
    derived,
  };
};
