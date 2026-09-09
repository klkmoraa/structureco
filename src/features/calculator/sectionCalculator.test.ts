import { describe, expect, it } from 'vitest';
import { calculateSectionProperties } from './sectionCalculator';

const assertInvariants = (area: number, inertiaX: number, inertiaY: number, radiusX: number, radiusY: number) => {
  expect(area).toBeGreaterThan(0);
  expect(inertiaX).toBeGreaterThan(0);
  expect(inertiaY).toBeGreaterThan(0);
  expect(radiusX ** 2).toBeCloseTo(inertiaX / area, 12);
  expect(radiusY ** 2).toBeCloseTo(inertiaY / area, 12);
};

describe('calculateSectionProperties', () => {
  it('calculates a solid rectangle around both centroidal axes', () => {
    const result = calculateSectionProperties('rectangle', { width: 0.3, height: 0.5 });

    expect(result.area).toBeCloseTo(0.15, 12);
    expect(result.inertiaX).toBeCloseTo(0.003125, 12);
    expect(result.inertiaY).toBeCloseTo(0.001125, 12);
    expect(result.sectionModulusX).toBeCloseTo(0.0125, 12);
    expect(result.sectionModulusY).toBeCloseTo(0.0075, 12);
    assertInvariants(result.area, result.inertiaX, result.inertiaY, result.radiusGyrationX, result.radiusGyrationY);
  });

  it('keeps a circle isotropic', () => {
    const result = calculateSectionProperties('circle', { diameter: 0.2 });

    expect(result.inertiaX).toBeCloseTo(result.inertiaY, 12);
    expect(result.sectionModulusX).toBeCloseTo(result.sectionModulusY, 12);
    expect(result.radiusGyrationX).toBeCloseTo(0.05, 12);
    assertInvariants(result.area, result.inertiaX, result.inertiaY, result.radiusGyrationX, result.radiusGyrationY);
  });

  it('subtracts the void from a rectangular tube', () => {
    const result = calculateSectionProperties('tube', { width: 0.3, height: 0.5, thickness: 0.01 });
    const expectedArea = 0.3 * 0.5 - 0.28 * 0.48;

    expect(result.area).toBeCloseTo(expectedArea, 12);
    expect(result.inertiaX).toBeGreaterThan(result.inertiaY);
    assertInvariants(result.area, result.inertiaX, result.inertiaY, result.radiusGyrationX, result.radiusGyrationY);
  });

  it('calculates an I section and rejects impossible proportions', () => {
    const result = calculateSectionProperties('i', { width: 0.2, height: 0.3, flangeThickness: 0.012, webThickness: 0.008 });

    expect(result.area).toBeCloseTo(0.007008, 12);
    expect(result.inertiaX).toBeGreaterThan(result.inertiaY);
    assertInvariants(result.area, result.inertiaX, result.inertiaY, result.radiusGyrationX, result.radiusGyrationY);
    expect(() => calculateSectionProperties('tube', { width: 0.1, height: 0.1, thickness: 0.05 })).toThrow(/hueco interior/);
    expect(() => calculateSectionProperties('i', { width: 0.2, height: 0.1, flangeThickness: 0.06, webThickness: 0.01 })).toThrow(/proporciones/);
  });

  it('requires every active dimension to be positive', () => {
    expect(() => calculateSectionProperties('rectangle', { width: 0, height: 0.5 })).toThrow(/dimensión positiva/);
    expect(() => calculateSectionProperties('circle', { diameter: Number.NaN })).toThrow(/dimensión positiva/);
  });
});
