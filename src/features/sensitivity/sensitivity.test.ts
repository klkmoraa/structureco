import { describe, expect, it } from 'vitest';
import { createHibbelerTributaryBeam, createHibbelerStyleTrussPractice } from '../../data/defaultProject';
import { runSensitivityStudy } from './sensitivity';

describe('runSensitivityStudy', () => {
  it('does not mutate the project and returns the impact of ±10% in the chosen property', () => {
    const source = createHibbelerTributaryBeam();
    const before = structuredClone(source);

    const study = runSensitivityStudy(source, null, 'AB', 'I');

    expect(source).toEqual(before);
    expect(study.baseline.inputValue).toBeCloseTo(source.members[0].I);
    expect(study.lower.inputValue).toBeCloseTo(source.members[0].I * 0.9);
    expect(study.upper.inputValue).toBeCloseTo(source.members[0].I * 1.1);
    expect(study.baseline.success).toBe(true);
    expect(study.lower.maxMoment).not.toBeNull();
  }, 10_000);

  it('rejects I for a truss with zero inertia', () => {
    expect(() => runSensitivityStudy(createHibbelerStyleTrussPractice(), null, 'AB', 'I')).toThrow(/inercia/i);
  });
});
