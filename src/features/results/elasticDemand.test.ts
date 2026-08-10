import { describe, expect, it } from 'vitest';
import { standardMaterials } from '../../data/standardMaterials';
import { standardSections } from '../../data/standardSections';
import type { MemberModel, MemberResult } from '../../types';
import {
  DEMAND_WARNING_RATIO,
  DEMAND_YIELD_RATIO,
  FALLBACK_YIELD_STRENGTH,
  demandColorVariable,
  demandTone,
  demandToneColorVariable,
  memberElasticDemand,
  memberSectionModulus,
  memberYieldStrength,
  structuralDemandSummary,
} from './elasticDemand';

const ipe300 = standardSections.find((section) => section.id === 'ipe-300')!;
const a36 = standardMaterials.find((material) => material.id === 'steel-a36')!;

const member = (overrides: Partial<MemberModel> = {}): MemberModel => ({
  id: 'B1', i: 'N1', j: 'N2', type: 'frame',
  E: a36.elasticModulus, A: ipe300.area, I: ipe300.inertiaX,
  ...overrides,
});

const result = (overrides: Partial<MemberResult> = {}): MemberResult => ({
  memberId: 'B1', length: 4,
  localDisplacements: [], localEndForces: [], diagramSegments: [], diagramJumps: [],
  criticalPoints: [], diagram: [], deformation: [], deformationSegments: [], deformationCriticalPoints: [],
  maxAxial: 0, minAxial: 0, maxShear: 0, minShear: 0, maxMoment: 0, minMoment: 0,
  ...overrides,
} as MemberResult);

describe('elastic demand estimation', () => {
  it('uses the catalogue section modulus when A and I identify a commercial profile', () => {
    expect(memberSectionModulus(member())).toEqual({
      modulus: ipe300.sectionModulusX,
      sectionName: ipe300.name,
    });
  });

  it('falls back to the equivalent rectangle when the section is not in the catalogue', () => {
    // h = sqrt(12·I/A) = 0.6 m para A = 0.01 m², I = 3e-4 m⁴ ⇒ W = I/(h/2) = 1e-3 m³.
    const { modulus, sectionName } = memberSectionModulus(member({ A: 0.01, I: 3e-4 }));
    expect(sectionName).toBeNull();
    expect(modulus).toBeCloseTo(1e-3, 9);
  });

  it('takes the yield strength from the material catalogue, and declares it when it cannot', () => {
    expect(memberYieldStrength(member())).toEqual({ yieldStrength: a36.yieldStrength, estimated: false });
    expect(memberYieldStrength(member({ E: 12345 }))).toEqual({
      yieldStrength: FALLBACK_YIELD_STRENGTH,
      estimated: true,
    });
  });

  it('combines axial and bending stress with the most conservative envelope', () => {
    const demand = memberElasticDemand(
      member(),
      result({ maxAxial: 100, minAxial: -40, maxMoment: 20, minMoment: -55 }),
    )!;
    expect(demand.maxAxial).toBe(100);
    expect(demand.maxMoment).toBe(55);
    expect(demand.sigmaAxial).toBeCloseTo(100 / ipe300.area, 6);
    expect(demand.sigmaBending).toBeCloseTo(55 / ipe300.sectionModulusX, 6);
    expect(demand.sigmaTotal).toBeCloseTo(demand.sigmaAxial + demand.sigmaBending, 6);
    expect(demand.ratio).toBeCloseTo(demand.sigmaTotal / a36.yieldStrength, 9);
    expect(demand.axialShare).toBeCloseTo(demand.sigmaAxial / demand.sigmaTotal, 9);
  });

  it('declines to estimate members with no usable section', () => {
    expect(memberElasticDemand(member({ type: 'rigid' }), result())).toBeNull();
    expect(memberElasticDemand(member({ A: 0 }), result())).toBeNull();
  });

  it('reads the regime against the documented thresholds, closed from below', () => {
    // Los dos cortes son `>=`. El valor exacto del umbral pertenece al tramo
    // que empieza, no al que termina: con `>` estricto, η = 0,85 se leía como
    // holgado y η = 1,00 como aviso, justo los dos casos que más se miran.
    expect(demandTone(0.5)).toBe('safe');
    expect(demandTone(DEMAND_WARNING_RATIO - 1e-9)).toBe('safe');
    expect(demandTone(DEMAND_WARNING_RATIO)).toBe('warning');
    expect(demandTone(0.9)).toBe('warning');
    expect(demandTone(DEMAND_YIELD_RATIO - 1e-9)).toBe('warning');
    expect(demandTone(DEMAND_YIELD_RATIO)).toBe('overstressed');
    expect(demandTone(1.4)).toBe('overstressed');
  });

  it('paints the canvas with the same three tones the panels name', () => {
    // El mapa de calor tenía su propia rampa de cinco escalones: η = 1,00 salía
    // crítico en el lienzo y aviso en los paneles. Ahora el color se deriva del
    // tono, así que discrepar es imposible por construcción.
    for (const ratio of [0, 0.29, 0.3, 0.59, 0.6, 0.84999, DEMAND_WARNING_RATIO, 0.99, DEMAND_YIELD_RATIO, 2.5]) {
      expect(demandColorVariable(ratio), `η = ${ratio}`).toBe(demandToneColorVariable[demandTone(ratio)]);
    }
    expect(demandColorVariable(DEMAND_YIELD_RATIO)).toBe(demandToneColorVariable.overstressed);
    expect(demandColorVariable(DEMAND_WARNING_RATIO)).toBe(demandToneColorVariable.warning);
  });

  it('publishes utilisation instead of a factor that reads as a code check', () => {
    const summary = structuralDemandSummary(
      {
        nodes: [], members: [member()], nodalLoads: [], memberLoads: [],
        id: 'p', name: 'p', settings: {} as never,
      } as never,
      {
        success: true,
        memberResults: [result({ maxMoment: 60 })],
        nodeResults: [],
      } as never,
    )!;
    expect(summary.maxRatio).toBeCloseTo(summary.critical.ratio, 12);
    expect(summary).not.toHaveProperty('safetyFactor');
  });
});
