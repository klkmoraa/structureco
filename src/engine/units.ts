import type { CustomUnitSystem, UnitSystemId } from '../types';
import {
  composeUnitDefinition,
  compositionMenuLabel,
  describeComposition,
  PRESET_UNIT_SYSTEM_IDS,
  UNIT_SYSTEM_PRESETS,
  type PresetUnitSystemId,
  type UnitDefinition,
  type UnitQuantity,
  type UnitSystemComposition,
} from './unitSystems';

export type { UnitQuantity } from './unitSystems';
export type { PresetUnitSystemId, UnitSystemComposition } from './unitSystems';

/**
 * Internal base units are kN, m, kN·m, kN/m, kN/m², m² and m⁴.
 *
 * Cada definición se deriva de su combinación en `unitSystems`, de modo que
 * momento, carga distribuida y rigideces son siempre productos y cocientes
 * consistentes de la fuerza y la longitud elegidas.
 */
const presetDefinitions = Object.fromEntries(
  PRESET_UNIT_SYSTEM_IDS.map((id) => [id, composeUnitDefinition(UNIT_SYSTEM_PRESETS[id])]),
) as Record<PresetUnitSystemId, UnitDefinition>;

/**
 * Sistemas definidos por la persona usuaria, resueltos a definiciones.
 *
 * Es un registro de módulo porque `unitLabel`/`toDisplay` se llaman desde
 * decenas de superficies de presentación que sólo conocen el identificador del
 * sistema, nunca el proyecto. Es estado *de presentación*: el solver, los
 * workers y la persistencia siguen trabajando en unidades base y jamás lo leen,
 * así que un registro vacío no cambia ningún resultado, sólo las etiquetas.
 * `ProjectUnitSystemsSync` lo mantiene alineado con `settings.customUnitSystems`.
 */
let customDefinitions: ReadonlyMap<string, UnitDefinition> = new Map();
let customCompositions: ReadonlyMap<string, CustomUnitSystem> = new Map();

export const registerCustomUnitSystems = (systems: readonly CustomUnitSystem[]): void => {
  customDefinitions = new Map(systems.map((system) => [system.id, composeUnitDefinition(system)]));
  customCompositions = new Map(systems.map((system) => [system.id, system]));
};

export const isPresetUnitSystemId = (value: unknown): value is PresetUnitSystemId =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(UNIT_SYSTEM_PRESETS, value);

/** Un identificador personalizado es `custom:` más un sufijo estable y sin espacios. */
export const isCustomUnitSystemId = (value: unknown): value is `custom:${string}` =>
  typeof value === 'string' && /^custom:[A-Za-z0-9_-]{1,64}$/.test(value);

export const isUnitSystemId = (value: unknown): value is UnitSystemId =>
  isPresetUnitSystemId(value) || isCustomUnitSystemId(value);

/**
 * Definición vigente de un sistema. Un identificador personalizado que ya no
 * está registrado (un proyecto abierto en otra sesión, un favorito guardado con
 * un sistema borrado) cae en kN·m en vez de romper la presentación.
 */
const definitionOf = (system: UnitSystemId): UnitDefinition => (
  isPresetUnitSystemId(system)
    ? presetDefinitions[system]
    : customDefinitions.get(system) ?? presetDefinitions['kN-m']
);

export const unitSystemComposition = (system: UnitSystemId): UnitSystemComposition => (
  isPresetUnitSystemId(system)
    ? UNIT_SYSTEM_PRESETS[system]
    : customCompositions.get(system) ?? UNIT_SYSTEM_PRESETS['kN-m']
);

/** Nombre corto para menús: el que dio la persona usuaria, o «fuerza · longitud». */
export const unitSystemLabel = (system: UnitSystemId): string => (
  isPresetUnitSystemId(system)
    ? compositionMenuLabel(UNIT_SYSTEM_PRESETS[system])
    : customCompositions.get(system)?.name ?? compositionMenuLabel(unitSystemComposition(system))
);

export const unitSystemSummary = (system: UnitSystemId): string => describeComposition(unitSystemComposition(system));

export const registeredCustomUnitSystems = (): readonly CustomUnitSystem[] => [...customCompositions.values()];

export const unitLabel = (system: UnitSystemId, quantity: UnitQuantity): string => definitionOf(system).labels[quantity];
export const toDisplay = (value: number, system: UnitSystemId, quantity: UnitQuantity): number => value * definitionOf(system).factors[quantity];
export const fromDisplay = (value: number, system: UnitSystemId, quantity: UnitQuantity): number => value / definitionOf(system).factors[quantity];

export const formatDisplay = (
  value: number,
  system: UnitSystemId,
  quantity: UnitQuantity,
  digits = 3,
): string => {
  const converted = toDisplay(value, system, quantity);
  const magnitude = Math.abs(converted);
  if ((magnitude > 0 && magnitude < 10 ** (-digits)) || magnitude >= 1e7) return `${converted.toExponential(digits)} ${unitLabel(system, quantity)}`;
  return `${converted.toFixed(digits)} ${unitLabel(system, quantity)}`;
};
