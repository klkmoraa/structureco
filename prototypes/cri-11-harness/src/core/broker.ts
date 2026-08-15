/**
 * Broker de superficies (capa 5 de CRI-9).
 *
 * Responde a la otra mitad de la pregunta: el resolutor dice **qué cabe**; el
 * broker dice **qué le pasa a lo que ya había**. Ocupación, `peek`, suspensión,
 * retorno de foco y anuncios.
 *
 * Se escribe como funciones puras sobre un estado plano para que el reductor lo
 * use sin efectos y para que Fase B pueda probarlo sin navegador.
 *
 * Invariantes que implementa (CRI-9 §8 y §11):
 *   T-INV-2 · una superficie no se cierra en una transición: MIGRA. Cerrar
 *             exige un acto explícito o un conflicto irresoluble, y se anuncia.
 *   T-INV-3 · el foco sigue a su superficie; si no puede mostrarse, vuelve al
 *             invocador y se anuncia.
 *   T-INV-8 · un borrador sin aplicar bloquea la sustitución: el origen se
 *             SUSPENDE con su estado, no se destruye.
 *   R-1 · una sola capa contextual a la vez en Compact, salvo `status` y
 *         `transient`.
 *   R-3 · ninguna superficie pide su propia presentación.
 *   R-4 · `peek` es un estado de `drawer`/`fullscreen`, no una presentación.
 */

import type { CompositionId } from './resolver';
import { surfaceById, type SurfaceId } from './surfaces';

export type SuspendReason = 'exclusive-layer' | 'composition';

export interface SuspendedSurface {
  id: SurfaceId;
  reason: SuspendReason;
  /** Ancla de desplazamiento, nunca un offset en píxeles (T-INV-6). */
  anchor: string | null;
}

export interface BrokerState {
  /** Superficies contextuales invocadas; la última es la activa. */
  open: SurfaceId[];
  /** Superficie viva y reducida a una banda, con su estado intacto (R-4). */
  peek: SurfaceId | null;
  suspended: SuspendedSurface[];
  /** Elemento al que devolver el foco por superficie (T-INV-3). */
  focusReturn: Partial<Record<SurfaceId, string>>;
  /** Último anuncio para el canal `status`. Nada se degrada en silencio. */
  announcement: { key: string; surface: SurfaceId } | null;
}

export const initialBrokerState: BrokerState = {
  open: [],
  peek: null,
  suspended: [],
  focusReturn: {},
  announcement: null,
};

const withoutSurface = (list: SurfaceId[], id: SurfaceId) => list.filter((item) => item !== id);

/** ¿Esta superficie ocupa la única capa contextual de Compact? (R-1) */
export const isExclusiveLayer = (id: SurfaceId) => surfaceById(id).exclusiveInCompact;

export interface OpenOptions {
  composition: CompositionId;
  /** Hay un borrador sin aplicar en la superficie que sería desplazada. */
  dirtyDraftIn?: SurfaceId | null;
  /** Elemento al que devolver el foco al cerrar (T-INV-3). */
  invoker?: string;
}

export const openSurface = (state: BrokerState, id: SurfaceId, options: OpenOptions): BrokerState => {
  if (state.open.includes(id)) return { ...state, peek: state.peek === id ? null : state.peek };

  const focusReturn = options.invoker ? { ...state.focusReturn, [id]: options.invoker } : state.focusReturn;

  // Fuera de Compact pueden coexistir; sólo Compact impone la capa única.
  if (options.composition !== 'K0' || !isExclusiveLayer(id)) {
    return { ...state, open: [...state.open, id], peek: state.peek === id ? null : state.peek, focusReturn, announcement: null };
  }

  const displaced = state.open.filter(isExclusiveLayer);
  if (displaced.length === 0) {
    return { ...state, open: [...state.open, id], focusReturn, announcement: null };
  }

  // R-1 con T-INV-8: lo desplazado se suspende CON su estado, nunca se destruye.
  const suspended: SuspendedSurface[] = displaced.map((surface) => ({
    id: surface,
    reason: 'exclusive-layer',
    anchor: options.dirtyDraftIn === surface ? 'draft' : null,
  }));

  return {
    ...state,
    open: [...state.open.filter((surface) => !isExclusiveLayer(surface)), id],
    suspended: [...state.suspended.filter((item) => !displaced.includes(item.id)), ...suspended],
    focusReturn,
    announcement: { key: 'surface.suspended', surface: displaced[displaced.length - 1] },
  };
};

export const closeSurface = (state: BrokerState, id: SurfaceId): BrokerState => {
  const stillSuspended = state.suspended.filter((item) => item.id !== id);
  const restored = state.suspended.find((item) => item.reason === 'exclusive-layer' && item.id !== id);

  return {
    ...state,
    open: restored ? [...withoutSurface(state.open, id), restored.id] : withoutSurface(state.open, id),
    peek: state.peek === id ? null : state.peek,
    suspended: restored ? stillSuspended.filter((item) => item.id !== restored.id) : stillSuspended,
    announcement: restored ? { key: 'surface.restored', surface: restored.id } : null,
  };
};

/**
 * D-11 y contrato de navegación profunda: localizar NUNCA destruye el origen.
 * Lo degrada a `peek` —viva y reducida, con su desplazamiento y su borrador— y
 * lo recuerda para la vuelta.
 */
export const degradeToPeek = (state: BrokerState, id: SurfaceId): BrokerState => ({
  ...state,
  open: withoutSurface(state.open, id),
  peek: id,
  announcement: { key: 'surface.peek', surface: id },
});

export const restoreFromPeek = (state: BrokerState, options: OpenOptions): BrokerState => {
  if (!state.peek) return state;
  const restored = openSurface({ ...state, peek: null }, state.peek, options);
  return { ...restored, announcement: { key: 'surface.restored', surface: state.peek } };
};

/**
 * T-INV-2 al cruzar una frontera de composición: nadie se cierra. Fuera de
 * Compact todo lo suspendido por capa única vuelve; al entrar en Compact, sólo
 * sobrevive la capa contextual más reciente y el resto se suspende con anuncio.
 */
export const migrateForComposition = (state: BrokerState, composition: CompositionId): BrokerState => {
  if (composition !== 'K0') {
    const returning = state.suspended.filter((item) => item.reason === 'exclusive-layer');
    if (returning.length === 0) return { ...state, announcement: null };
    return {
      ...state,
      open: [...returning.map((item) => item.id).filter((id) => !state.open.includes(id)), ...state.open],
      suspended: state.suspended.filter((item) => item.reason !== 'exclusive-layer'),
      announcement: { key: 'surface.restored', surface: returning[returning.length - 1].id },
    };
  }

  const exclusive = state.open.filter(isExclusiveLayer);
  if (exclusive.length <= 1) return { ...state, announcement: null };
  const keep = exclusive[exclusive.length - 1];
  const displaced = exclusive.filter((id) => id !== keep);
  return {
    ...state,
    open: state.open.filter((id) => !displaced.includes(id)),
    suspended: [...state.suspended, ...displaced.map((id) => ({ id, reason: 'composition' as const, anchor: null }))],
    announcement: { key: 'surface.suspended', surface: displaced[displaced.length - 1] },
  };
};

/** La superficie contextual activa: la última invocada. */
export const activeSurface = (state: BrokerState): SurfaceId | null =>
  state.open.length > 0 ? state.open[state.open.length - 1] : null;

/** `Escape` cierra la superficie más reciente, con alcance acotado (D-06). */
export const escapeTarget = (state: BrokerState): SurfaceId | null => activeSurface(state);
