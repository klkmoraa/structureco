import type { CustomUnitSystem } from '../types';
import { registerCustomUnitSystems } from './units';

/**
 * Puente idempotente entre `settings.customUnitSystems` y el registro de
 * presentación de `engine/units`.
 *
 * Compara antes de escribir para que llamarlo en cada render cueste una
 * comparación superficial y no reconstruya definiciones ni invalide nada.
 */
let applied: readonly CustomUnitSystem[] = [];

const equivalent = (a: readonly CustomUnitSystem[], b: readonly CustomUnitSystem[]): boolean =>
  a.length === b.length && a.every((system, index) => {
    const other = b[index];
    return system === other || (
      system.id === other.id
      && system.name === other.name
      && system.force === other.force
      && system.length === other.length
      && system.sectionLength === other.sectionLength
      && system.sectionDimension === other.sectionDimension
      && system.modulus === other.modulus
      && system.density === other.density
    );
  });

export const syncCustomUnitSystems = (systems: readonly CustomUnitSystem[] | undefined): void => {
  const next = systems ?? [];
  if (equivalent(applied, next)) return;
  applied = next.map((system) => ({ ...system }));
  registerCustomUnitSystems(applied);
};
