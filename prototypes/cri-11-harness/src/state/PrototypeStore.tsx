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
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import {
  buildFixtureAnalysis,
  canPaintEvidence,
  deriveAnalysisPhase,
  initialAnalysisState,
  modelStamp,
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
import { orientationOf, useDeviceCapabilities, useObservedSize, useWindowSize } from '../core/environment';
import { loadFixture, type Fixture, type ScenarioId } from '../core/fixtures';
import { translatorFor, VOICE_COPY, type Locale, type Translate, type VoiceId } from '../core/i18n';
import { resolveWithHysteresis, safeRect, VIEWPORT_PRESETS, type CompositionId, type Verdict, type Viewport } from '../core/resolver';
import type { SurfaceId } from '../core/surfaces';
import { observeLongTasks, record, setTelemetryContext } from '../core/telemetry';

export type InputAxis = 'mouse' | 'touch' | 'mixed';
export type ThemeAxis = 'light' | 'dark';
export type ModeAxis = 'essential' | 'complete';
export type MotionAxis = 'normal' | 'reduced';

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

export interface DraftState {
  memberId: string;
  sectionId: string;
}

export interface PrototypeState {
  axes: HarnessAxes;
  screen: 'welcome' | 'workspace';
  selection: SelectionRef | null;
  broker: BrokerState;
  evidence: Evidence;
  layers: { grid: boolean; loads: boolean; supports: boolean; labels: boolean };
  draft: DraftState | null;
  /** Cambios aplicados sobre el fixture. Es el «modelo» del prototipo. */
  sectionOverrides: Record<string, string>;
  analysis: AnalysisState;
  dense: { query: string; onlySelection: boolean };
  lastComposition: CompositionId | null;
  showAllProperties: boolean;
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

const initialState: PrototypeState = {
  axes: initialAxes,
  screen: 'welcome',
  selection: null,
  broker: initialBrokerState,
  evidence: 'none',
  layers: { grid: true, loads: true, supports: true, labels: true },
  draft: null,
  sectionOverrides: {},
  analysis: initialAnalysisState,
  dense: { query: '', onlySelection: false },
  lastComposition: null,
  showAllProperties: false,
};

type Action =
  | { type: 'axis/set'; patch: Partial<HarnessAxes> }
  | { type: 'screen/continue' }
  | { type: 'screen/welcome' }
  | { type: 'selection/set'; selection: SelectionRef | null }
  | { type: 'surface/open'; surface: SurfaceId; composition: CompositionId; invoker?: string }
  | { type: 'surface/close'; surface: SurfaceId }
  | { type: 'surface/peek'; surface: SurfaceId }
  | { type: 'surface/restore'; composition: CompositionId }
  | { type: 'evidence/set'; evidence: Evidence }
  | { type: 'layer/toggle'; layer: keyof PrototypeState['layers'] }
  | { type: 'draft/open'; memberId: string; sectionId: string }
  | { type: 'draft/preview'; sectionId: string }
  | { type: 'draft/commit' }
  | { type: 'draft/cancel' }
  | { type: 'analysis/start' }
  | { type: 'analysis/finish'; level: ReliabilityLevel }
  | { type: 'composition/changed'; composition: CompositionId }
  | { type: 'dense/filter'; patch: Partial<PrototypeState['dense']> }
  | { type: 'properties/toggle' }
  | { type: 'harnessState/apply'; state: HarnessStateId };

/** Fixture + overrides = el «modelo» del prototipo. */
const stampOf = (state: PrototypeState) => modelStamp(loadFixture(state.axes.scenario), state.sectionOverrides);

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

const applyHarnessState = (state: PrototypeState, id: HarnessStateId): PrototypeState => {
  const fixture = loadFixture(state.axes.scenario);
  const build = (level: ReliabilityLevel) =>
    buildFixtureAnalysis(fixture, { level, sectionOverrides: state.sectionOverrides });

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

const reducer = (state: PrototypeState, action: Action): PrototypeState => {
  switch (action.type) {
    case 'axis/set': {
      const axes = { ...state.axes, ...action.patch };
      // Cambiar de escenario cambia de modelo: los resultados anteriores no le
      // corresponden. Se destruyen, no se conservan «por comodidad».
      if (action.patch.scenario && action.patch.scenario !== state.axes.scenario) {
        return {
          ...state,
          axes,
          selection: null,
          draft: null,
          sectionOverrides: {},
          evidence: 'none',
          analysis: { ...initialAnalysisState, connectivity: state.analysis.connectivity, persistence: state.analysis.persistence },
          dense: { query: '', onlySelection: false },
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
      return { ...state, selection: action.selection, draft: action.selection ? state.draft : null };

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
      return { ...state, draft: { memberId: action.memberId, sectionId: action.sectionId } };

    case 'draft/preview':
      return state.draft ? { ...state, draft: { ...state.draft, sectionId: action.sectionId } } : state;

    case 'draft/commit': {
      if (!state.draft) return state;
      const sectionOverrides = { ...state.sectionOverrides, [state.draft.memberId]: state.draft.sectionId };
      return {
        ...state,
        sectionOverrides,
        draft: null,
        // El modelo cambió → el resultado anterior deja de existir.
        analysis: invalidate(state.analysis),
        evidence: 'none',
        axes: { ...state.axes, state: state.analysis.hadAnalysis || state.analysis.result ? 'stale' : state.axes.state },
      };
    }

    case 'draft/cancel':
      return { ...state, draft: null };

    case 'analysis/start':
      return { ...state, analysis: { ...state.analysis, isAnalyzing: true } };

    case 'analysis/finish': {
      const fixture = loadFixture(state.axes.scenario);
      const result = buildFixtureAnalysis(fixture, { level: action.level, sectionOverrides: state.sectionOverrides });
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

    default:
      return state;
  }
};

export interface PrototypeDerived {
  fixture: Fixture;
  viewport: Viewport;
  verdict: Verdict;
  composition: CompositionId;
  safe: ReturnType<typeof safeRect>;
  phase: AnalysisPhase;
  paintsEvidence: boolean;
  detailPresent: boolean;
  t: Translate;
  voice: { hero: string; sub: string };
  reducedMotion: boolean;
  pointerCoarse: boolean;
  orientation: 'portrait' | 'landscape';
  /** Sello del modelo actual; si el resultado no lo lleva, ya no le corresponde. */
  stamp: string;
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

  const detailPresent = state.selection !== null && (state.broker.open.includes('detail') || verdict.composition !== 'K0');

  const derived = useMemo<PrototypeDerived>(() => {
    const fixture = loadFixture(state.axes.scenario);
    const phase = deriveAnalysisPhase(state.analysis);
    return {
      fixture,
      viewport,
      verdict,
      composition: verdict.composition,
      safe: safeRect(verdict, viewport, { detailPresent }),
      phase,
      paintsEvidence: canPaintEvidence(phase) && state.evidence !== 'none',
      detailPresent,
      t: translatorFor(state.axes.locale),
      voice: VOICE_COPY[state.axes.voice][state.axes.locale],
      reducedMotion: state.axes.motion === 'reduced' || capabilities.prefersReducedMotion,
      pointerCoarse: state.axes.input === 'touch' || (state.axes.input === 'mixed' && capabilities.pointer !== 'fine'),
      orientation: orientationOf(viewport),
      stamp: stampOf(state),
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
      selection: state.selection ? `${state.selection.kind}:${state.selection.id}` : null,
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

  const select = useCallback(
    (selection: SelectionRef | null) => {
      dispatch({ type: 'selection/set', selection });
      record(selection ? 'selection_committed' : 'selection_cleared', {
        entityType: selection?.kind ?? null,
        entityId: selection?.id ?? null,
      });
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

  const invoke = useCallback(
    (commandId: string, route: string) => {
      record('command_invoked', { commandId, route });
    },
    [],
  );

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

  return {
    dispatch,
    select,
    openSurface: openSurfaceAction,
    closeSurface: closeSurfaceAction,
    peekSurface,
    restoreSurface,
    invoke,
    solve,
    finishSolve,
    state,
    derived,
  };
};
