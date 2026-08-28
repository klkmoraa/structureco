import type { ShellClass } from './shellComposition';

export const SURFACE_PRESENTATIONS = [
  'band',
  'dock',
  'inset',
  'sheet',
  'drawer',
  'fullscreen',
  'overlay',
  'floating',
] as const;

export type SurfacePresentation = (typeof SURFACE_PRESENTATIONS)[number];

export const BROKER_SURFACE_IDS = [
  'detail',
  'analysisSetup',
  'view',
  'results',
  'generator',
  /**
   * `dense` es la superficie invocada de los datos densos de Results
   * —reacciones, influencia y «Entender» (CRI-101)—. No es residente en
   * ninguna clase: se abre a petición y se cierra devolviendo el foco, por eso
   * su presentación es siempre modal (`drawer` en X2/M1, `fullscreen` en K0) y
   * admite `peek`.
   */
  'dense',
  'datasheet',
  /** Read-only geometric quantity takeoff, invoked from Export or Palette. */
  'bom',
  /** Explicit immutable revision baseline compared against the live project. */
  'comparison',
  'doctor',
  'palette',
  'candidatePicker',
] as const;

export type SurfaceId = (typeof BROKER_SURFACE_IDS)[number];
export type SurfaceExtent = 'default' | 'peek';
export type SurfaceStatus = 'closed' | 'active' | 'suspended';

export const SURFACE_PRESENTATION_TABLE: Readonly<Record<ShellClass, Readonly<Record<SurfaceId, SurfacePresentation>>>> = {
  X2: {
    detail: 'dock',
    analysisSetup: 'dock',
    view: 'dock',
    results: 'dock',
    generator: 'floating',
    dense: 'drawer',
    datasheet: 'drawer',
    bom: 'drawer',
    comparison: 'drawer',
    doctor: 'drawer',
    palette: 'overlay',
    candidatePicker: 'floating',
  },
  M1: {
    detail: 'inset',
    analysisSetup: 'inset',
    view: 'inset',
    results: 'inset',
    generator: 'inset',
    dense: 'drawer',
    datasheet: 'drawer',
    bom: 'drawer',
    comparison: 'drawer',
    doctor: 'drawer',
    palette: 'overlay',
    candidatePicker: 'floating',
  },
  K0: {
    detail: 'sheet',
    analysisSetup: 'sheet',
    view: 'sheet',
    results: 'sheet',
    generator: 'sheet',
    dense: 'fullscreen',
    datasheet: 'fullscreen',
    bom: 'fullscreen',
    comparison: 'fullscreen',
    doctor: 'fullscreen',
    palette: 'sheet',
    candidatePicker: 'sheet',
  },
};

/**
 * Clase de actividad por **rol** de superficie (CRI-108).
 *
 * La tabla de arriba dice *dónde* aparece una superficie; ésta dice *cómo
 * compite por estar activa*. Son dos preguntas distintas y hasta ahora sólo
 * estaba contestada la primera: en Compact ganaba siempre la última
 * activación, tratando a las diez superficies como competidoras equivalentes.
 *
 * * `tool` — herramienta invocada que el usuario conduce (`drawer`/`fullscreen`).
 * * `layer` — capa contextual que ocupa la ranura Compact (`sheet`, `overlay`,
 *   `floating`, o los carriles residentes de X2/M1).
 * `tool` y `layer` siguen resolviéndose entre sí por última activación —abrir
 * el Picker o una hoja encima de una herramienta es un acto del usuario y debe
 * ganar—. Lo único que cambia es que una apertura *derivada* ya no puede
 * desbancar a lo que el usuario está usando.
 */
export const SURFACE_ACTIVITY_CLASSES = ['tool', 'layer'] as const;

export type SurfaceActivityClass = (typeof SURFACE_ACTIVITY_CLASSES)[number];

export const SURFACE_ACTIVITY_CLASS: Readonly<Record<SurfaceId, SurfaceActivityClass>> = {
  detail: 'layer',
  analysisSetup: 'layer',
  view: 'layer',
  results: 'layer',
  generator: 'tool',
  dense: 'tool',
  datasheet: 'tool',
  bom: 'tool',
  comparison: 'tool',
  doctor: 'tool',
  palette: 'layer',
  candidatePicker: 'layer',
};

export const surfaceActivityClass = (surface: SurfaceId): SurfaceActivityClass => SURFACE_ACTIVITY_CLASS[surface];

export interface SurfaceIntent {
  open: boolean;
  extent: SurfaceExtent;
  activation: number;
  requestVersion: number;
}

export interface SurfaceBrokerState {
  sequence: number;
  surfaces: Record<SurfaceId, SurfaceIntent>;
}

export interface SurfaceActivity extends SurfaceIntent {
  presentation: SurfacePresentation;
  status: SurfaceStatus;
}

export type SurfaceActivityMap = Record<SurfaceId, SurfaceActivity>;

const emptyIntent = (): SurfaceIntent => ({
  open: false,
  extent: 'default',
  activation: 0,
  requestVersion: 0,
});

export const createSurfaceBrokerState = (initialOpen: readonly SurfaceId[] = []): SurfaceBrokerState => {
  const surfaces = Object.fromEntries(BROKER_SURFACE_IDS.map((surface) => [surface, emptyIntent()])) as Record<SurfaceId, SurfaceIntent>;
  initialOpen.forEach((surface, index) => {
    surfaces[surface] = { ...surfaces[surface], open: true, activation: index + 1 };
  });
  return { sequence: initialOpen.length, surfaces };
};

export const openSurfaceIntent = (state: SurfaceBrokerState, surface: SurfaceId): SurfaceBrokerState => {
  const sequence = state.sequence + 1;
  const current = state.surfaces[surface];
  return {
    sequence,
    surfaces: {
      ...state.surfaces,
      [surface]: {
        ...current,
        open: true,
        activation: sequence,
        requestVersion: current.requestVersion + 1,
      },
    },
  };
};

export const activateSurfaceIntent = (state: SurfaceBrokerState, surface: SurfaceId): SurfaceBrokerState => {
  if (!state.surfaces[surface].open) return state;
  const sequence = state.sequence + 1;
  return {
    sequence,
    surfaces: {
      ...state.surfaces,
      [surface]: {
        ...state.surfaces[surface],
        activation: sequence,
      },
    },
  };
};

export const closeSurfaceIntent = (state: SurfaceBrokerState, surface: SurfaceId): SurfaceBrokerState => ({
  ...state,
  surfaces: {
    ...state.surfaces,
    [surface]: {
      ...state.surfaces[surface],
      open: false,
      extent: 'default',
    },
  },
});

export const resolveSurfacePresentation = (
  shellClass: ShellClass,
  surface: SurfaceId,
): SurfacePresentation => SURFACE_PRESENTATION_TABLE[shellClass][surface];

export const isModalPresentation = (presentation: SurfacePresentation): boolean => (
  presentation === 'drawer' || presentation === 'fullscreen'
);

const latest = (surfaces: readonly SurfaceId[], state: SurfaceBrokerState): SurfaceId | undefined => (
  [...surfaces].sort((left, right) => state.surfaces[left].activation - state.surfaces[right].activation).at(-1)
);

/**
 * Resolución de actividad (CRI-108).
 *
 * En Compact hay **una** ranura contextual (R-1) y las superficies `tool` y
 * `layer` la disputan por última activación. X2 y M1 no tienen esa ranura
 * única: las superficies abiertas conviven salvo la excepción del generador.
 */
export const resolveSurfaceActivity = (
  shellClass: ShellClass,
  state: SurfaceBrokerState,
): SurfaceActivityMap => {
  const open = BROKER_SURFACE_IDS.filter((surface) => state.surfaces[surface].open);
  const compactWinner = shellClass === 'K0'
    ? latest(open, state)
    : undefined;
  const mediumGeneratorActive = shellClass === 'M1' && state.surfaces.generator.open;
  const modalWinner = latest(open.filter((surface) => (
    isModalPresentation(resolveSurfacePresentation(shellClass, surface))
  )), state);

  return Object.fromEntries(BROKER_SURFACE_IDS.map((surface) => {
    const intent = state.surfaces[surface];
    const presentation = resolveSurfacePresentation(shellClass, surface);
    let status: SurfaceStatus = 'active';
    if (!intent.open) status = 'closed';
    else if (mediumGeneratorActive
      && surface !== 'generator'
      && ['detail', 'analysisSetup', 'view', 'results'].includes(surface)) status = 'suspended';
    else if (compactWinner && compactWinner !== surface) status = 'suspended';
    else if (isModalPresentation(presentation) && modalWinner !== surface) status = 'suspended';
    return [surface, { ...intent, presentation, status }];
  })) as SurfaceActivityMap;
};

export const setSurfaceExtent = (
  state: SurfaceBrokerState,
  shellClass: ShellClass,
  surface: SurfaceId,
  extent: SurfaceExtent,
): SurfaceBrokerState => {
  const presentation = resolveSurfacePresentation(shellClass, surface);
  if (extent === 'peek' && !isModalPresentation(presentation)) {
    throw new Error('peek sólo es válido para una superficie drawer o fullscreen.');
  }
  return {
    ...state,
    surfaces: {
      ...state.surfaces,
      [surface]: { ...state.surfaces[surface], extent },
    },
  };
};

export const validateSurfaceCombination = (
  shellClass: ShellClass,
  activity: SurfaceActivityMap,
): string[] => {
  const errors: string[] = [];
  const active = BROKER_SURFACE_IDS.filter((surface) => activity[surface].status === 'active');
  if (shellClass === 'K0' && active.length > 1) errors.push('Compact admite una sola capa contextual activa.');
  const modal = active.filter((surface) => isModalPresentation(activity[surface].presentation));
  if (modal.length > 1) errors.push('drawer y fullscreen son mutuamente exclusivos.');
  for (const surface of BROKER_SURFACE_IDS) {
    const current = activity[surface];
    if (current.extent === 'peek' && !isModalPresentation(current.presentation)) {
      errors.push(`${surface}: peek requiere drawer o fullscreen.`);
    }
  }
  return errors;
};
