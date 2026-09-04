import { describe, expect, it } from 'vitest';
import { fromDisplay, registerCustomUnitSystems, toDisplay, unitLabel, unitSystemLabel, type UnitQuantity } from './units';
import { PRESET_UNIT_SYSTEM_IDS } from './unitSystems';
import type { CustomUnitSystem, UnitSystemId } from '../types';

const systems: UnitSystemId[] = [...PRESET_UNIT_SYSTEM_IDS];
const quantities: UnitQuantity[] = ['length', 'force', 'moment', 'distributedForce', 'elasticModulus', 'area', 'inertia', 'sectionModulus', 'translationalStiffness', 'rotationalStiffness', 'density'];

describe('unidades coherentes', () => {
  it('convierte ida y vuelta sin modificar el valor físico', () => {
    for (const system of systems) {
      for (const quantity of quantities) {
        const value = quantity === 'inertia' ? 8.333e-6 : 123.456;
        const recovered = fromDisplay(toDisplay(value, system, quantity), system, quantity);
        expect(Math.abs(recovered - value)).toBeLessThan(1e-12 * Math.max(1, Math.abs(value)));
        expect(unitLabel(system, quantity).length).toBeGreaterThan(0);
      }
    }
  });

  it('usa equivalencias físicas conocidas', () => {
    expect(toDisplay(1, 'N-mm', 'force')).toBeCloseTo(1000, 12);
    expect(toDisplay(1, 'N-mm', 'length')).toBeCloseTo(1000, 12);
    expect(toDisplay(1, 'N-mm', 'moment')).toBeCloseTo(1_000_000, 8);
    expect(toDisplay(1, 'kgf-m', 'force')).toBeCloseTo(101.9716213, 7);
    expect(toDisplay(1, 'kip-ft', 'force')).toBeCloseTo(0.224808944, 8);
  });

  it('presenta el módulo elástico de sección como un volumen, no como un m³ fijo', () => {
    // W entra en η como |M*|/W; sólo se convierte para leerlo. 1 m³ = 1e6 cm³ =
    // 1e9 mm³ = 61 023,74 in³.
    expect(toDisplay(1, 'kN-m', 'sectionModulus')).toBeCloseTo(1, 12);
    expect(toDisplay(1, 'N-mm', 'sectionModulus')).toBeCloseTo(1e9, 3);
    expect(toDisplay(1, 'kgf-m', 'sectionModulus')).toBeCloseTo(1e6, 6);
    expect(toDisplay(1, 'kip-ft', 'sectionModulus')).toBeCloseTo(61_023.7440947323, 6);
    expect(unitLabel('kip-ft', 'sectionModulus')).toBe('in³');
  });

  it('deriva cada preset de una combinación coherente de unidades elementales', () => {
    for (const system of PRESET_UNIT_SYSTEM_IDS) {
      const force = toDisplay(1, system, 'force');
      const length = toDisplay(1, system, 'length');
      // Momento = fuerza · longitud y carga distribuida = fuerza / longitud en
      // cualquier sistema: es la propiedad que la tabla escrita a mano no podía
      // garantizar y la composición sí.
      expect(toDisplay(1, system, 'moment')).toBeCloseTo(force * length, 12);
      expect(toDisplay(1, system, 'distributedForce')).toBeCloseTo(force / length, 12);
      expect(toDisplay(1, system, 'rotationalStiffness')).toBeCloseTo(force * length, 12);
      expect(toDisplay(1, system, 'translationalStiffness')).toBeCloseTo(force / length, 12);
      const sectionLength = Math.sqrt(toDisplay(1, system, 'area'));
      expect(toDisplay(1, system, 'inertia')).toBeCloseTo(sectionLength ** 4, 6);
      expect(toDisplay(1, system, 'sectionModulus')).toBeCloseTo(sectionLength ** 3, 6);
    }
  });

  it('incluye el preset tonelada-metro con las etiquetas de la práctica local', () => {
    // 1 kN = 0,1019716 Tn; 1 kN·m se lee en Tn·m y las secciones en cm.
    expect(toDisplay(1, 'tonf-m', 'force')).toBeCloseTo(0.1019716213, 9);
    expect(unitLabel('tonf-m', 'moment')).toBe('Tn·m');
    expect(unitLabel('tonf-m', 'distributedForce')).toBe('Tn/m');
    expect(unitLabel('tonf-m', 'inertia')).toBe('cm⁴');
    expect(unitSystemLabel('tonf-m')).toBe('Tn · m');
  });

  it('resuelve un sistema propio registrado y vuelve a kN·m cuando ya no existe', () => {
    const custom: CustomUnitSystem = {
      id: 'custom:u1', name: 'Tn · cm', force: 'tonf', length: 'cm',
      sectionLength: 'cm', sectionDimension: 'mm', modulus: 'tonf/m2', density: 't/m3',
    };
    registerCustomUnitSystems([custom]);
    expect(unitLabel('custom:u1', 'moment')).toBe('Tn·cm');
    expect(toDisplay(1, 'custom:u1', 'moment')).toBeCloseTo(0.1019716213 * 100, 9);
    expect(fromDisplay(toDisplay(7, 'custom:u1', 'inertia'), 'custom:u1', 'inertia')).toBeCloseTo(7, 12);
    registerCustomUnitSystems([]);
    expect(unitLabel('custom:u1', 'moment')).toBe(unitLabel('kN-m', 'moment'));
  });
});
