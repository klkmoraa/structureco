/**
 * Catálogo de superficies (capa 6 de CRI-9) y ledger de capacidad de Fase A.
 *
 * Las dieciocho superficies y su dueño no se renegocian aquí: vienen del
 * catálogo cerrado de CRI-9 §5 y `data/surfaces.mjs`. Lo que este archivo añade
 * es una columna que CRI-9 no podía tener: **qué está construido en este
 * prototipo y qué no**. Es el `capability ledger` que pide CRI-11, escrito en
 * código para que no pueda desincronizarse de la demo.
 */

export type SurfaceId =
  | 'canvas'
  | 'topbar'
  | 'toolrail'
  | 'contextual-actions'
  | 'detail'
  | 'analysis-setup'
  | 'view'
  | 'dense'
  | 'doctor'
  | 'palette'
  | 'preferences'
  | 'output'
  | 'recovery'
  | 'transient'
  | 'status'
  | 'welcome'
  | 'classroom'
  | 'space3d';

export type Presentation = 'band' | 'dock' | 'inset' | 'sheet' | 'drawer' | 'fullscreen' | 'overlay' | 'floating' | 'layer' | 'none';

/**
 * `VERIFIED_EXISTING` — existe en `main` y aquí se prototipa su presentación.
 * `PROPOSED_INTERACTION` — interacción propuesta por CRI-9/10, sin implementar en producción.
 * `FUTURE_CANDIDATE` — declarada por el catálogo, fuera del alcance de Fase A.
 * `NOT_IN_SCOPE` — explícitamente excluida por el encargo.
 */
export type CapabilityStatus = 'VERIFIED_EXISTING' | 'PROPOSED_INTERACTION' | 'FUTURE_CANDIDATE' | 'NOT_IN_SCOPE';

export type BuildPhase = 'A' | 'B' | 'C' | 'out';

export interface SurfaceSpec {
  id: SurfaceId;
  name: { es: string; en: string };
  /** Dueño del estado, según el mapa de ownership de CRI-9 §6. */
  owner: string;
  presentation: { X2: Presentation; M1: Presentation; K0: Presentation };
  capability: CapabilityStatus;
  /** En qué fase de CRI-11 se construye. `A` = navegable en este entregable. */
  phase: BuildPhase;
  /** Si es exclusiva, ocupa la única capa contextual de Compact (R-1). */
  exclusiveInCompact: boolean;
  note: { es: string; en: string };
}

export const SURFACES: SurfaceSpec[] = [
  {
    id: 'canvas',
    name: { es: 'Lienzo estructural', en: 'Structural canvas' },
    owner: 'selección + dominio (lectura) · layout (safe-rect)',
    presentation: { X2: 'layer', M1: 'layer', K0: 'layer' },
    capability: 'VERIFIED_EXISTING',
    phase: 'A',
    exclusiveInCompact: false,
    note: { es: 'Es el presupuesto: CB-1..CB-6 se miden sobre él.', en: 'It is the budget: CB-1..CB-6 are measured on it.' },
  },
  {
    id: 'topbar',
    name: { es: 'TopBar · identidad, acción global y estado', en: 'TopBar · identity, global action, status' },
    owner: 'dominio (nombre) · análisis (estado) · layout',
    presentation: { X2: 'band', M1: 'band', K0: 'band' },
    capability: 'VERIFIED_EXISTING',
    phase: 'A',
    exclusiveInCompact: false,
    note: { es: 'Tres naturalezas de las siete actuales. Nada más entra.', en: 'Three of today’s seven natures. Nothing else fits.' },
  },
  {
    id: 'toolrail',
    name: { es: 'ToolRail · creación y navegación', en: 'ToolRail · creation and navigation' },
    owner: 'workflow (herramienta activa) · layout',
    presentation: { X2: 'dock', M1: 'dock', K0: 'floating' },
    capability: 'VERIFIED_EXISTING',
    phase: 'A',
    exclusiveInCompact: false,
    note: { es: '164 px con etiquetas → 76 px sólo iconos → dock flotante.', en: '164 px labelled → 76 px icon-only → floating dock.' },
  },
  {
    id: 'contextual-actions',
    name: { es: 'Acciones contextuales de selección', en: 'Selection contextual actions' },
    owner: 'selección',
    presentation: { X2: 'inset', M1: 'inset', K0: 'inset' },
    capability: 'PROPOSED_INTERACTION',
    phase: 'A',
    exclusiveInCompact: false,
    note: { es: 'Aparece con la selección y desaparece con ella (D-07).', en: 'Appears with the selection and leaves with it (D-07).' },
  },
  {
    id: 'detail',
    name: { es: 'Detalle del objeto', en: 'Object detail' },
    owner: 'selección (presencia) · dominio (escritura) · análisis (lectura)',
    presentation: { X2: 'dock', M1: 'inset', K0: 'sheet' },
    capability: 'VERIFIED_EXISTING',
    phase: 'A',
    exclusiveInCompact: true,
    note: { es: 'Una superficie, dos cardinalidades, tres presentaciones (D-12).', en: 'One surface, two cardinalities, three presentations (D-12).' },
  },
  {
    id: 'view',
    name: { es: 'Vista del lienzo · capas y evidencia', en: 'Canvas view · layers and evidence' },
    owner: 'layout (estado de vista, fuera de ProjectModel)',
    presentation: { X2: 'inset', M1: 'inset', K0: 'sheet' },
    capability: 'PROPOSED_INTERACTION',
    phase: 'A',
    exclusiveInCompact: true,
    note: { es: 'Elegir evidencia es elegir capa, no abrir Results (D-03/D-10).', en: 'Choosing evidence is choosing a layer, not opening Results (D-03/D-10).' },
  },
  {
    id: 'dense',
    name: { es: 'Datos densos · datasheet y tablas de resultado', en: 'Dense data · datasheet and result tables' },
    owner: 'dominio (proyección) · análisis · selección',
    presentation: { X2: 'drawer', M1: 'drawer', K0: 'fullscreen' },
    capability: 'VERIFIED_EXISTING',
    phase: 'A',
    exclusiveInCompact: true,
    note: { es: 'Localizar la degrada a `peek`; nunca la destruye (D-11).', en: 'Locating degrades it to `peek`; never destroys it (D-11).' },
  },
  {
    id: 'status',
    name: { es: 'Estado transitorio · anuncios', en: 'Transient status · announcements' },
    owner: 'workflow',
    presentation: { X2: 'overlay', M1: 'overlay', K0: 'overlay' },
    capability: 'VERIFIED_EXISTING',
    phase: 'A',
    exclusiveInCompact: false,
    note: { es: 'Excepción a R-1: nada se pierde en silencio.', en: 'Exception to R-1: nothing is lost silently.' },
  },
  {
    id: 'welcome',
    name: { es: 'Entrada · Welcome', en: 'Entry · Welcome' },
    owner: 'dominio',
    presentation: { X2: 'fullscreen', M1: 'fullscreen', K0: 'fullscreen' },
    capability: 'VERIFIED_EXISTING',
    phase: 'A',
    exclusiveInCompact: false,
    note: { es: 'Pantalla propia, fuera del shell. No compite por lienzo.', en: 'Its own screen, outside the shell. No canvas competition.' },
  },
  {
    id: 'analysis-setup',
    name: { es: 'Contexto de análisis', en: 'Analysis context' },
    owner: 'dominio (casos) · análisis (orden, P-Delta)',
    presentation: { X2: 'inset', M1: 'inset', K0: 'sheet' },
    capability: 'PROPOSED_INTERACTION',
    phase: 'B',
    exclusiveInCompact: true,
    note: { es: 'Viaja junto a la acción que gobierna (D-09).', en: 'Travels with the action it governs (D-09).' },
  },
  {
    id: 'transient',
    name: { es: 'Efímeras · picker de precisión, entrada rápida', en: 'Ephemeral · precision picker, quick entry' },
    owner: 'workflow',
    presentation: { X2: 'overlay', M1: 'overlay', K0: 'overlay' },
    capability: 'PROPOSED_INTERACTION',
    phase: 'B',
    exclusiveInCompact: false,
    note: { es: 'Contrato de selección precisa de cinco fases (D-06).', en: 'Five-phase precision-selection contract (D-06).' },
  },
  {
    id: 'doctor',
    name: { es: 'Model Doctor', en: 'Model Doctor' },
    owner: 'dominio (lectura) · workflow (reparación preparada)',
    presentation: { X2: 'drawer', M1: 'drawer', K0: 'sheet' },
    capability: 'VERIFIED_EXISTING',
    phase: 'B',
    exclusiveInCompact: true,
    note: { es: 'finding → localizar → entender → actuar, con `peek`.', en: 'finding → locate → understand → act, with `peek`.' },
  },
  {
    id: 'palette',
    name: { es: 'Command Palette', en: 'Command Palette' },
    owner: 'workflow',
    presentation: { X2: 'overlay', M1: 'overlay', K0: 'sheet' },
    capability: 'VERIFIED_EXISTING',
    phase: 'B',
    exclusiveInCompact: true,
    note: { es: 'Aceleración, nunca la única puerta de una capacidad.', en: 'Acceleration, never a capability’s only door.' },
  },
  {
    id: 'recovery',
    name: { es: 'Recuperación y conflicto de revisión', en: 'Recovery and revision conflict' },
    owner: 'dominio (persistencia)',
    presentation: { X2: 'drawer', M1: 'drawer', K0: 'sheet' },
    capability: 'PROPOSED_INTERACTION',
    phase: 'B',
    exclusiveInCompact: true,
    note: { es: 'Fase A muestra el estado; la superficie llega en Fase B (D-08).', en: 'Phase A shows the state; the surface lands in Phase B (D-08).' },
  },
  {
    id: 'preferences',
    name: { es: 'Preferencias', en: 'Preferences' },
    owner: 'dominio (unidades, idioma) · layout (tema)',
    presentation: { X2: 'drawer', M1: 'drawer', K0: 'sheet' },
    capability: 'VERIFIED_EXISTING',
    phase: 'B',
    exclusiveInCompact: true,
    note: { es: 'En Fase A sus ejes viven en el panel del harness, no en el producto.', en: 'In Phase A its axes live in the harness panel, not in the product.' },
  },
  {
    id: 'output',
    name: { es: 'Salida · exportación e impresión', en: 'Output · export and print' },
    owner: 'dominio (lectura) · análisis (lectura)',
    presentation: { X2: 'drawer', M1: 'drawer', K0: 'sheet' },
    capability: 'VERIFIED_EXISTING',
    phase: 'C',
    exclusiveInCompact: true,
    note: { es: 'Fuera del recorrido mínimo.', en: 'Outside the minimal walkthrough.' },
  },
  {
    id: 'classroom',
    name: { es: 'Guía de Aula', en: 'Classroom guide' },
    owner: 'dominio (modo) · análisis (progreso)',
    presentation: { X2: 'inset', M1: 'inset', K0: 'inset' },
    capability: 'NOT_IN_SCOPE',
    phase: 'out',
    exclusiveInCompact: false,
    note: { es: 'Aula no se rediseña. Prohibido diseñar Aula vNext.', en: 'Classroom is not redesigned. Designing Classroom vNext is forbidden.' },
  },
  {
    id: 'space3d',
    name: { es: 'Space 3D (experimental)', en: 'Space 3D (experimental)' },
    owner: 'dominio propio, fuera de este contrato',
    presentation: { X2: 'fullscreen', M1: 'fullscreen', K0: 'fullscreen' },
    capability: 'NOT_IN_SCOPE',
    phase: 'out',
    exclusiveInCompact: false,
    note: { es: 'Sigue experimental y separado (D-15).', en: 'Remains experimental and separate (D-15).' },
  },
];

export const surfaceById = (id: SurfaceId): SurfaceSpec =>
  SURFACES.find((surface) => surface.id === id) ?? SURFACES[0];

export const surfacesInPhase = (phase: BuildPhase): SurfaceSpec[] =>
  SURFACES.filter((surface) => surface.phase === phase);
