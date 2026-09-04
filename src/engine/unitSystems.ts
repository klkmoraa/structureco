/**
 * Catálogo atómico de unidades y composición de sistemas.
 *
 * Un sistema de unidades ya no es una tabla escrita a mano: es una combinación
 * de unidades elementales (fuerza, longitud, longitud de sección, dimensión de
 * perfil, tensión y densidad) de la que se derivan las doce magnitudes que el
 * producto presenta. Derivarlas garantiza que momento = fuerza · longitud y que
 * carga distribuida = fuerza / longitud en cualquier combinación, incluidas las
 * que define la persona usuaria; la tabla manual anterior podía —y de hecho
 * llegó a— quedar internamente inconsistente en el último dígito.
 *
 * Las unidades internas del motor siguen siendo kN, m, kN·m, kN/m, kN/m², m²,
 * m⁴, kg/m³. Aquí sólo viven factores de presentación.
 */

import type {
  DensityUnitId,
  ForceUnitId,
  LengthUnitId,
  PresetUnitSystemId,
  StressUnitId,
} from '../types';

/** Equivalencias exactas por definición (SI y sistema imperial). */
const KGF_IN_NEWTON = 9.80665;
const POUND_FORCE_IN_NEWTON = 4.4482216152605;
const KIP_IN_NEWTON = 1000 * POUND_FORCE_IN_NEWTON;
const FOOT_IN_METRE = 0.3048;
const INCH_IN_METRE = 0.0254;
const POUND_IN_KILOGRAM = 0.45359237;

export type {
  DensityUnitId,
  ForceUnitId,
  LengthUnitId,
  PresetUnitSystemId,
  StressUnitId,
} from '../types';

export interface AtomicUnit<Id extends string> {
  readonly id: Id;
  /** Etiqueta impresa junto al número. */
  readonly label: string;
  /** Cuántas unidades de éstas hay en una unidad base interna. */
  readonly factor: number;
}

/** Base interna: kN. */
export const FORCE_UNITS: ReadonlyArray<AtomicUnit<ForceUnitId>> = [
  { id: 'kN', label: 'kN', factor: 1 },
  { id: 'N', label: 'N', factor: 1000 },
  { id: 'MN', label: 'MN', factor: 1e-3 },
  { id: 'kgf', label: 'kgf', factor: 1000 / KGF_IN_NEWTON },
  { id: 'tonf', label: 'Tn', factor: 1 / KGF_IN_NEWTON },
  { id: 'kip', label: 'kip', factor: 1000 / KIP_IN_NEWTON },
  { id: 'lbf', label: 'lb', factor: 1000 / POUND_FORCE_IN_NEWTON },
];

/** Base interna: m. */
export const LENGTH_UNITS: ReadonlyArray<AtomicUnit<LengthUnitId>> = [
  { id: 'm', label: 'm', factor: 1 },
  { id: 'cm', label: 'cm', factor: 100 },
  { id: 'mm', label: 'mm', factor: 1000 },
  { id: 'ft', label: 'ft', factor: 1 / FOOT_IN_METRE },
  { id: 'in', label: 'in', factor: 1 / INCH_IN_METRE },
];

/** Base interna: kN/m². */
export const STRESS_UNITS: ReadonlyArray<AtomicUnit<StressUnitId>> = [
  { id: 'kPa', label: 'kPa', factor: 1 },
  { id: 'MPa', label: 'MPa', factor: 1e-3 },
  { id: 'GPa', label: 'GPa', factor: 1e-6 },
  { id: 'kgf/cm2', label: 'kgf/cm²', factor: (1000 / KGF_IN_NEWTON) / 1e4 },
  { id: 'tonf/m2', label: 'Tn/m²', factor: 1 / KGF_IN_NEWTON },
  // 1 kN/m² son 1000/(4448,22) kip repartidos entre 1/0,0254² in².
  { id: 'ksi', label: 'ksi', factor: (1000 / KIP_IN_NEWTON) * INCH_IN_METRE ** 2 },
  { id: 'psi', label: 'psi', factor: (1000 / POUND_FORCE_IN_NEWTON) * INCH_IN_METRE ** 2 },
];

/** Base interna: kg/m³ (densidad de masa; el peso propio aplica g = 9,80665 m/s²). */
export const DENSITY_UNITS: ReadonlyArray<AtomicUnit<DensityUnitId>> = [
  { id: 'kg/m3', label: 'kg/m³', factor: 1 },
  { id: 't/m3', label: 't/m³', factor: 1e-3 },
  { id: 'lb/ft3', label: 'lb/ft³', factor: FOOT_IN_METRE ** 3 / POUND_IN_KILOGRAM },
  { id: 'lb/in3', label: 'lb/in³', factor: INCH_IN_METRE ** 3 / POUND_IN_KILOGRAM },
];

/**
 * Las seis elecciones que definen un sistema completo.
 *
 * `sectionLength` y `sectionDimension` están separadas a propósito: kN·m
 * presenta A, I y W en metros pero el canto de un perfil en milímetros, que es
 * como los catálogos lo publican.
 */
export interface UnitSystemComposition {
  readonly force: ForceUnitId;
  readonly length: LengthUnitId;
  /** Longitud con la que se leen A, I y W. */
  readonly sectionLength: LengthUnitId;
  /** Longitud con la que se leen cantos, anchos y espesores. */
  readonly sectionDimension: LengthUnitId;
  readonly modulus: StressUnitId;
  readonly density: DensityUnitId;
}

const findUnit = <Id extends string>(units: ReadonlyArray<AtomicUnit<Id>>, id: Id, fallback: Id): AtomicUnit<Id> =>
  units.find((unit) => unit.id === id) ?? units.find((unit) => unit.id === fallback)!;

export const forceUnit = (id: ForceUnitId): AtomicUnit<ForceUnitId> => findUnit(FORCE_UNITS, id, 'kN');
export const lengthUnit = (id: LengthUnitId): AtomicUnit<LengthUnitId> => findUnit(LENGTH_UNITS, id, 'm');
export const stressUnit = (id: StressUnitId): AtomicUnit<StressUnitId> => findUnit(STRESS_UNITS, id, 'MPa');
export const densityUnit = (id: DensityUnitId): AtomicUnit<DensityUnitId> => findUnit(DENSITY_UNITS, id, 'kg/m3');

export type UnitQuantity =
  | 'length'
  | 'force'
  | 'moment'
  | 'distributedForce'
  | 'elasticModulus'
  | 'area'
  | 'inertia'
  /** Módulo elástico de sección W (un volumen). Sólo presentación: η usa la base. */
  | 'sectionModulus'
  /** Canto, ancho y espesores de perfiles, presentados en la unidad habitual del catálogo. */
  | 'sectionDimension'
  | 'translationalStiffness'
  | 'rotationalStiffness'
  | 'density';

export interface UnitDefinition {
  readonly labels: Readonly<Record<UnitQuantity, string>>;
  readonly factors: Readonly<Record<UnitQuantity, number>>;
}

/** Deriva las doce magnitudes de una combinación. Ésta es la única regla. */
export const composeUnitDefinition = (composition: UnitSystemComposition): UnitDefinition => {
  const force = forceUnit(composition.force);
  const length = lengthUnit(composition.length);
  const section = lengthUnit(composition.sectionLength);
  const dimension = lengthUnit(composition.sectionDimension);
  const modulus = stressUnit(composition.modulus);
  const density = densityUnit(composition.density);
  return {
    labels: {
      length: length.label,
      force: force.label,
      moment: `${force.label}·${length.label}`,
      distributedForce: `${force.label}/${length.label}`,
      elasticModulus: modulus.label,
      area: `${section.label}²`,
      inertia: `${section.label}⁴`,
      sectionModulus: `${section.label}³`,
      sectionDimension: dimension.label,
      translationalStiffness: `${force.label}/${length.label}`,
      rotationalStiffness: `${force.label}·${length.label}/rad`,
      density: density.label,
    },
    factors: {
      length: length.factor,
      force: force.factor,
      moment: force.factor * length.factor,
      distributedForce: force.factor / length.factor,
      elasticModulus: modulus.factor,
      area: section.factor ** 2,
      inertia: section.factor ** 4,
      sectionModulus: section.factor ** 3,
      sectionDimension: dimension.factor,
      translationalStiffness: force.factor / length.factor,
      rotationalStiffness: force.factor * length.factor,
      density: density.factor,
    },
  };
};

/**
 * Combinaciones incluidas de fábrica. Las cuatro primeras son las históricas y
 * su composición reproduce exactamente la tabla que sustituyen; las cuatro
 * siguientes cubren la práctica latinoamericana (Tn·m), el diseño de acero
 * estadounidense en pulgadas (kip·in), la obra civil de gran escala (MN·m) y el
 * detalle mecánico imperial (lb·in).
 */
export const UNIT_SYSTEM_PRESETS = {
  'kN-m': { force: 'kN', length: 'm', sectionLength: 'm', sectionDimension: 'mm', modulus: 'MPa', density: 'kg/m3' },
  'N-mm': { force: 'N', length: 'mm', sectionLength: 'mm', sectionDimension: 'mm', modulus: 'MPa', density: 'kg/m3' },
  'kgf-m': { force: 'kgf', length: 'm', sectionLength: 'cm', sectionDimension: 'cm', modulus: 'kgf/cm2', density: 'kg/m3' },
  'kip-ft': { force: 'kip', length: 'ft', sectionLength: 'in', sectionDimension: 'in', modulus: 'ksi', density: 'lb/ft3' },
  'tonf-m': { force: 'tonf', length: 'm', sectionLength: 'cm', sectionDimension: 'cm', modulus: 'kgf/cm2', density: 'kg/m3' },
  'kip-in': { force: 'kip', length: 'in', sectionLength: 'in', sectionDimension: 'in', modulus: 'ksi', density: 'lb/ft3' },
  'MN-m': { force: 'MN', length: 'm', sectionLength: 'm', sectionDimension: 'mm', modulus: 'GPa', density: 'kg/m3' },
  'lbf-in': { force: 'lbf', length: 'in', sectionLength: 'in', sectionDimension: 'in', modulus: 'psi', density: 'lb/in3' },
  // `satisfies` con la unión declarada en `types.ts` obliga a que ambas listas
  // coincidan exactamente: añadir un preset sin declararlo —o al revés— no
  // compila, así que la persistencia y el catálogo no pueden separarse.
} as const satisfies Record<PresetUnitSystemId, UnitSystemComposition>;

export const PRESET_UNIT_SYSTEM_IDS = Object.keys(UNIT_SYSTEM_PRESETS) as PresetUnitSystemId[];

/** Título corto de menú, «fuerza · longitud», derivado de la propia combinación. */
export const compositionMenuLabel = (composition: UnitSystemComposition): string =>
  `${forceUnit(composition.force).label} · ${lengthUnit(composition.length).label}`;

/** Resumen legible de las seis elecciones, para tooltips y revisión. */
export const describeComposition = (composition: UnitSystemComposition): string => {
  const definition = composeUnitDefinition(composition);
  return [
    definition.labels.force,
    definition.labels.length,
    definition.labels.moment,
    definition.labels.elasticModulus,
    definition.labels.inertia,
    definition.labels.density,
  ].join(' · ');
};
