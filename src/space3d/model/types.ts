/**
 * Space 3D · Contratos inmutables del dominio espacial (S3D-1).
 *
 * Este módulo es la única fuente de verdad de los tipos 3D y no comparte
 * estructuras con el dominio 2D: `src/types.ts` sólo aporta `UnitSystemId`
 * para que ambos productos hablen del mismo sistema de unidades.
 *
 * Convenciones fijas de S3D-1 — no reinterpretarlas fuera de este archivo:
 *
 *   · Ejes globales: X y Z horizontales, **Y vertical hacia arriba**. Es la
 *     misma convención que el editor 2D (plano XY con Y arriba), de modo que
 *     un modelo plano es un caso particular de uno espacial con z = 0.
 *   · Orden de GDL nodales: `[ux, uy, uz, rx, ry, rz]`.
 *   · Orden de GDL del elemento: los seis del nudo `i` y luego los seis de `j`.
 *   · Unidades internas: `m`, `kN`, `kN·m`, `kN/m²`, `m²`, `m⁴`, `rad`.
 *   · Ejes locales: `x` del nudo `i` al `j`; `y` es la referencia global
 *     proyectada perpendicular a `x` y girada por `rollRadians`; `z = x × y`.
 *   · Inercias: `Iz` gobierna la flexión en el plano `x–y` (desplazamiento
 *     local `v`, giro `rz`) y `Iy` la del plano `x–z` (`w`, `ry`).
 *   · Gravedad: `-Y` global. El peso propio de una barra es
 *     `density · A · g` repartido como carga uniforme en esa dirección.
 *   · Acciones internas de una estación: `N` positivo en tracción y el resto
 *     medidos sobre la cara positiva del corte (normal saliente `+x`).
 */
import type { UnitSystemId } from '../../types';

export const SPACE3D_SCHEMA_VERSION = 2 as const;
/**
 * Versiones que el lector portable acepta. La 1 (S3D-1) se migra al abrirse:
 * un archivo antiguo nunca se rechaza por ser antiguo, se completa con los
 * neutros del esquema actual.
 */
export const SPACE3D_READABLE_SCHEMA_VERSIONS = Object.freeze([1, 2] as const);
export const SPACE3D_ANALYSIS_SPACE = 'space-3d' as const;

/** Aceleración de la gravedad, m/s². Fija: el peso propio no es un ajuste de usuario. */
export const SPACE3D_GRAVITY = 9.80665;

/** Estaciones equiespaciadas por barra en los diagramas de acciones internas. */
export const SPACE3D_DIAGRAM_STATIONS = 25;

/**
 * Límites duros aplicados antes de reservar cualquier matriz. Un modelo de 150
 * nudos son 900 GDL, es decir una densa de 900×900: el techo existe para que un
 * archivo corrupto no intente asignar gigabytes.
 */
export const SPACE3D_LIMITS = Object.freeze({
  maxNodes: 150,
  maxMembers: 300,
  maxCoordinateMagnitude: 1e9,
  minMemberLength: 1e-9,
  minReferenceNorm: 1e-12,
  minPerpendicularRatio: 1e-8,
});

export type Space3DVector = readonly [number, number, number];

export interface Space3DRestraints {
  readonly ux: boolean;
  readonly uy: boolean;
  readonly uz: boolean;
  readonly rx: boolean;
  readonly ry: boolean;
  readonly rz: boolean;
}

export const SPACE3D_DOF_KEYS = Object.freeze(['ux', 'uy', 'uz', 'rx', 'ry', 'rz'] as const);
export type Space3DDofKey = (typeof SPACE3D_DOF_KEYS)[number];

/**
 * Rigideces elásticas del apoyo: kN/m en traslación y kN·m/rad en giro.
 * Cero significa «sin muelle». Un muelle sobre un GDL ya restringido es
 * inerte: la restricción rígida manda y el muelle no se ensambla.
 */
export interface Space3DSpringStiffness {
  readonly ux: number;
  readonly uy: number;
  readonly uz: number;
  readonly rx: number;
  readonly ry: number;
  readonly rz: number;
}

export interface Space3DNode {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly restraints: Space3DRestraints;
  readonly springs: Space3DSpringStiffness;
}

export interface Space3DMemberOrientation {
  /** Vector global que define el plano `x–y` local antes de aplicar el roll. */
  readonly localYReferenceGlobal: Space3DVector;
  /** Giro de la triada alrededor del eje local `x`, en radianes. */
  readonly rollRadians: number;
}

export interface Space3DFrameMember {
  readonly id: string;
  readonly i: string;
  readonly j: string;
  /** Módulo de elasticidad, kN/m². */
  readonly E: number;
  /** Módulo de corte, kN/m². */
  readonly G: number;
  /** Área, m². */
  readonly A: number;
  /** Inercia respecto al eje local y, m⁴ (flexión en el plano x–z). */
  readonly Iy: number;
  /** Inercia respecto al eje local z, m⁴ (flexión en el plano x–y). */
  readonly Iz: number;
  /** Constante torsional de St. Venant, m⁴. */
  readonly J: number;
  /**
   * Área efectiva a cortante en la dirección local `y`, m². Cero desactiva la
   * deformación por cortante en el plano `x–y` (Euler–Bernoulli).
   */
  readonly shearAreaY: number;
  /** Área efectiva a cortante en la dirección local `z`, m². Cero, Euler–Bernoulli. */
  readonly shearAreaZ: number;
  /** Densidad del material, kg/m³. Cero desactiva el peso propio de la barra. */
  readonly density: number;
  readonly releases: Space3DMemberReleases;
  readonly orientation: Space3DMemberOrientation;
}

/**
 * Liberaciones de extremo en ejes locales. `true` anula la transmisión de esa
 * acción en ese extremo. Las claves siguen el orden de GDL del elemento: `N`
 * axil, `Vy`/`Vz` cortantes, `T` torsor y `My`/`Mz` flectores.
 */
export interface Space3DMemberReleases {
  readonly iN: boolean;
  readonly iVy: boolean;
  readonly iVz: boolean;
  readonly iT: boolean;
  readonly iMy: boolean;
  readonly iMz: boolean;
  readonly jN: boolean;
  readonly jVy: boolean;
  readonly jVz: boolean;
  readonly jT: boolean;
  readonly jMy: boolean;
  readonly jMz: boolean;
}

export const SPACE3D_RELEASE_KEYS = Object.freeze([
  'iN', 'iVy', 'iVz', 'iT', 'iMy', 'iMz',
  'jN', 'jVy', 'jVz', 'jT', 'jMy', 'jMz',
] as const);
export type Space3DReleaseKey = (typeof SPACE3D_RELEASE_KEYS)[number];

export interface Space3DNodalLoad {
  readonly id: string;
  readonly caseId: string;
  readonly nodeId: string;
  /** Fuerzas globales, kN. */
  readonly fx: number;
  readonly fy: number;
  readonly fz: number;
  /** Momentos globales, kN·m. */
  readonly mx: number;
  readonly my: number;
  readonly mz: number;
}

/**
 * Carga aplicada sobre una barra.
 *
 *   · `distributed` reparte una intensidad lineal entre `start` y `end`
 *     (posiciones normalizadas 0..1). `startValue`/`endValue` son kN/m por eje
 *     y varían linealmente: iguales dan una carga uniforme, distintas una
 *     trapecial. La intensidad se mide **por metro de barra**, no de proyección.
 *   · `force` aplica una fuerza puntual (kN) en `start`; `end` se ignora.
 *   · `moment` aplica un momento puntual (kN·m) en `start`; `end` se ignora.
 *
 * `axes` decide si el vector se lee en ejes globales o en los locales de la
 * barra.
 */
export type Space3DMemberLoadKind = 'distributed' | 'force' | 'moment';
export type Space3DLoadAxes = 'global' | 'local';

export interface Space3DMemberLoad {
  readonly id: string;
  readonly caseId: string;
  readonly memberId: string;
  readonly kind: Space3DMemberLoadKind;
  readonly axes: Space3DLoadAxes;
  /** Posición normalizada 0..1 del inicio del tramo o del punto de aplicación. */
  readonly start: number;
  /** Posición normalizada 0..1 del final del tramo; ≥ `start`. */
  readonly end: number;
  readonly startValue: Space3DVector;
  readonly endValue: Space3DVector;
}

/**
 * Asiento de apoyo: movimiento impuesto en ejes globales, m y rad. Sólo actúa
 * sobre los GDL restringidos del nudo; sobre un GDL libre no significa nada y
 * se ignora sin alterar el resultado.
 */
export interface Space3DSupportSettlement {
  readonly id: string;
  readonly caseId: string;
  readonly nodeId: string;
  readonly ux: number;
  readonly uy: number;
  readonly uz: number;
  readonly rx: number;
  readonly ry: number;
  readonly rz: number;
}

export interface Space3DLoadCase {
  readonly id: string;
  readonly name: string;
  /** Multiplicador del peso propio dentro del caso. Cero lo desactiva. */
  readonly selfWeightFactor: number;
}

export interface Space3DLoadCombinationTerm {
  readonly caseId: string;
  readonly factor: number;
}

export interface Space3DLoadCombination {
  readonly id: string;
  readonly name: string;
  readonly terms: readonly Space3DLoadCombinationTerm[];
}

export interface Space3DProject {
  readonly analysisSpace: typeof SPACE3D_ANALYSIS_SPACE;
  readonly schemaVersion: typeof SPACE3D_SCHEMA_VERSION;
  readonly id: string;
  readonly name: string;
  readonly units: UnitSystemId;
  readonly nodes: readonly Space3DNode[];
  readonly members: readonly Space3DFrameMember[];
  readonly nodalLoads: readonly Space3DNodalLoad[];
  readonly memberLoads: readonly Space3DMemberLoad[];
  readonly settlements: readonly Space3DSupportSettlement[];
  readonly loadCases: readonly Space3DLoadCase[];
  readonly loadCombinations: readonly Space3DLoadCombination[];
}

export type Space3DEntityKind = 'project' | 'node' | 'member' | 'load' | 'member-load' | 'settlement' | 'case' | 'combination';

export type Space3DValidationCode =
  | 'duplicate-id'
  | 'empty-id'
  | 'missing-reference'
  | 'self-referential-member'
  | 'invalid-coordinate'
  | 'invalid-property'
  | 'degenerate-length'
  | 'degenerate-orientation'
  | 'missing-case'
  | 'unknown-field'
  | 'invalid-release'
  | 'invalid-span'
  | 'limit-exceeded';

export interface Space3DValidationIssue {
  readonly code: Space3DValidationCode;
  readonly entityKind: Space3DEntityKind;
  readonly entityId: string;
  /** Campo concreto responsable, o cadena vacía cuando el problema es de entidad. */
  readonly field: string;
}

export type Space3DAnalysisIssueCode =
  | Space3DValidationCode
  | 'empty-model'
  | 'unknown-target'
  | 'no-free-dof'
  | 'mechanism'
  | 'non-finite-solution';

export interface Space3DAnalysisIssue {
  readonly code: Space3DAnalysisIssueCode;
  readonly entityKind: Space3DEntityKind;
  readonly entityId: string;
  readonly field: string;
}

export interface Space3DDofValues {
  readonly ux: number;
  readonly uy: number;
  readonly uz: number;
  readonly rx: number;
  readonly ry: number;
  readonly rz: number;
}

export interface Space3DNodeResult {
  readonly nodeId: string;
  /** Desplazamientos globales, m y rad. */
  readonly displacement: Space3DDofValues;
  /** Reacciones globales, kN y kN·m; cero en los GDL libres. */
  readonly reaction: Space3DDofValues;
}

/**
 * Acciones internas en un extremo, expresadas en ejes locales del miembro.
 * `N` es el axil, `T` el torsor, `Vy`/`Vz` los cortantes y `My`/`Mz` los
 * flectores alrededor de los ejes locales homónimos.
 */
export interface Space3DMemberEndForces {
  readonly N: number;
  readonly Vy: number;
  readonly Vz: number;
  readonly T: number;
  readonly My: number;
  readonly Mz: number;
}

export interface Space3DOrientationBasis {
  readonly x: Space3DVector;
  readonly y: Space3DVector;
  readonly z: Space3DVector;
}

/**
 * Acciones internas en una estación del vano, en ejes locales.
 *
 * Se obtienen por estática desde el extremo `i`, así que valen igual con
 * liberaciones, cargas repartidas o cargas puntuales intermedias. `N` es
 * positivo en tracción; el resto se miden sobre la cara positiva del corte
 * (normal saliente `+x`). En una carga puntual la estación se duplica para que
 * el salto se vea como salto y no como rampa.
 */
export interface Space3DMemberStation {
  /** Posición normalizada 0..1 a lo largo de la barra. */
  readonly position: number;
  /** Distancia desde el extremo `i`, m. */
  readonly x: number;
  readonly N: number;
  readonly Vy: number;
  readonly Vz: number;
  readonly T: number;
  readonly My: number;
  readonly Mz: number;
}

/** Valor extremo de una acción interna y dónde ocurre. */
export interface Space3DMemberExtreme {
  readonly min: number;
  readonly max: number;
  readonly minPosition: number;
  readonly maxPosition: number;
}

export type Space3DActionKey = 'N' | 'Vy' | 'Vz' | 'T' | 'My' | 'Mz';

export const SPACE3D_ACTION_KEYS = Object.freeze(['N', 'Vy', 'Vz', 'T', 'My', 'Mz'] as const);

export interface Space3DMemberResult {
  readonly memberId: string;
  readonly length: number;
  readonly basis: Space3DOrientationBasis;
  readonly start: Space3DMemberEndForces;
  readonly end: Space3DMemberEndForces;
  /** Diagrama muestreado de acciones internas a lo largo del vano. */
  readonly stations: readonly Space3DMemberStation[];
  /** Extremos por acción, leídos del mismo muestreo. */
  readonly extremes: Readonly<Record<Space3DActionKey, Space3DMemberExtreme>>;
}

export interface Space3DEquilibriumAudit {
  /** Σ de fuerzas aplicadas y reacciones, kN. */
  readonly force: Space3DVector;
  /** Σ de momentos respecto al origen global, kN·m. */
  readonly moment: Space3DVector;
  /** Residual normalizado por la mayor acción presente y por 1. */
  readonly normalized: number;
}

export interface Space3DAnalysisDiagnostics {
  readonly dofCount: number;
  readonly freeDofCount: number;
  readonly restrainedDofCount: number;
  /** Residual relativo del sistema lineal reducido. */
  readonly relativeResidual: number;
  readonly conditionEstimate: number;
  readonly equilibrium: Space3DEquilibriumAudit;
}

export interface Space3DAnalysisResult {
  readonly success: boolean;
  readonly targetId: string;
  readonly targetKind: 'case' | 'combination' | 'unknown';
  readonly nodeResults: readonly Space3DNodeResult[];
  readonly memberResults: readonly Space3DMemberResult[];
  readonly issues: readonly Space3DAnalysisIssue[];
  readonly diagnostics: Space3DAnalysisDiagnostics;
}

/** Error de geometría degenerada; su `message` es el código estable. */
export class Space3DGeometryError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = 'Space3DGeometryError';
    this.code = code;
  }
}

export const fixedSpace3DRestraints = (): Space3DRestraints => ({
  ux: true, uy: true, uz: true, rx: true, ry: true, rz: true,
});

export const freeSpace3DRestraints = (): Space3DRestraints => ({
  ux: false, uy: false, uz: false, rx: false, ry: false, rz: false,
});

export const zeroSpace3DDofValues = (): Space3DDofValues => ({
  ux: 0, uy: 0, uz: 0, rx: 0, ry: 0, rz: 0,
});

export const noSpace3DSprings = (): Space3DSpringStiffness => ({
  ux: 0, uy: 0, uz: 0, rx: 0, ry: 0, rz: 0,
});

export const noSpace3DReleases = (): Space3DMemberReleases => ({
  iN: false, iVy: false, iVz: false, iT: false, iMy: false, iMz: false,
  jN: false, jVy: false, jVz: false, jT: false, jMy: false, jMz: false,
});

/** ¿Alguna liberación activa? Evita condensar una matriz que no cambia. */
export const hasSpace3DReleases = (releases: Space3DMemberReleases): boolean =>
  SPACE3D_RELEASE_KEYS.some((key) => releases[key]);
