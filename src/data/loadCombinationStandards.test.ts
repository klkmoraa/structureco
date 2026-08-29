import { describe, expect, it } from 'vitest';
import type { LoadCase } from '../types';
import {
  NTC_CDMX_2023_GROUP_B,
  evaluateNormativeDraft,
  createProjectCombinationFromNormativeDraft,
  generateNormativeCombinationDrafts,
} from './loadCombinationStandards';

const cases: LoadCase[] = [
  { id: 'DL', name: 'Carga muerta', category: 'permanent', active: true },
  { id: 'LL', name: 'Carga viva máxima', category: 'variable', active: true },
];

describe('versioned load-combination standards', () => {
  it('publishes an immutable, source-bound NTC CDMX 2023 Group B dataset', () => {
    expect(NTC_CDMX_2023_GROUP_B).toMatchObject({
      schemaVersion: 1,
      id: 'ntc-cdmx-2023-criteria-actions-group-b-pv',
      revision: '2026-08-24.1',
      jurisdiction: 'Ciudad de México',
      edition: '2023',
      publicationDate: '2023-11-06',
      units: 'dimensionless-factors',
      source: {
        sha256: '293f22316a59ec2ec64d1f64f0749f49ba8849ded15b289cd88cc171c55ae62a',
      },
      scope: {
        buildingGroup: 'B',
        permanentCaseCount: 1,
        variableCaseCount: 1,
        variableIntensity: 'maximum',
      },
    });
    expect(NTC_CDMX_2023_GROUP_B.recipes.map((recipe) => ({
      id: recipe.id,
      stateLimit: recipe.stateLimit,
      factors: recipe.factors,
      sections: recipe.sourceSections,
    }))).toEqual([
      {
        id: 'ultimate-permanent-variable',
        stateLimit: 'ultimate',
        factors: { permanent: 1.3, variable: 1.5 },
        sections: ['2.3.1(a)', '3.4.1(a)'],
      },
      {
        id: 'service-permanent-variable',
        stateLimit: 'service',
        factors: { permanent: 1, variable: 1 },
        sections: ['2.3.1(a)', '3.3.2', '3.4.1(d)'],
      },
    ]);
    expect(Object.isFrozen(NTC_CDMX_2023_GROUP_B)).toBe(true);
    expect(Object.isFrozen(NTC_CDMX_2023_GROUP_B.recipes)).toBe(true);
    expect(Object.isFrozen(NTC_CDMX_2023_GROUP_B.recipes[0].factors)).toBe(true);
  });

  it('generates inspectable drafts without pretending they are applied or certified', () => {
    const drafts = generateNormativeCombinationDrafts(NTC_CDMX_2023_GROUP_B, cases, {
      permanentCaseId: 'DL',
      variableCaseId: 'LL',
    });

    expect(drafts).toHaveLength(2);
    expect(drafts[0]).toMatchObject({
      kind: 'normative-combination-draft',
      draftId: 'ntc-cdmx-2023-criteria-actions-group-b-pv/2026-08-24.1/ultimate-permanent-variable/DL/LL',
      datasetId: NTC_CDMX_2023_GROUP_B.id,
      datasetRevision: NTC_CDMX_2023_GROUP_B.revision,
      recipeId: 'ultimate-permanent-variable',
      stateLimit: 'ultimate',
      factors: { DL: 1.3, LL: 1.5 },
      requiresProfessionalReview: true,
      appliedToProject: false,
      safetyCertification: false,
      provenance: {
        jurisdiction: 'Ciudad de México',
        edition: '2023',
        sourceSections: ['2.3.1(a)', '3.4.1(a)'],
      },
    });
    expect(drafts[1]).toMatchObject({
      recipeId: 'service-permanent-variable',
      stateLimit: 'service',
      factors: { DL: 1, LL: 1 },
    });
    expect(Object.isFrozen(drafts[0])).toBe(true);
    expect(cases).toEqual([
      { id: 'DL', name: 'Carga muerta', category: 'permanent', active: true },
      { id: 'LL', name: 'Carga viva máxima', category: 'variable', active: true },
    ]);
  });

  it('reproduces independently calculated Group B permanent-variable effects', () => {
    const drafts = generateNormativeCombinationDrafts(NTC_CDMX_2023_GROUP_B, cases, {
      permanentCaseId: 'DL',
      variableCaseId: 'LL',
    });
    const effects = { DL: 100, LL: 40 };

    expect(evaluateNormativeDraft(drafts[0], effects)).toBeCloseTo(190, 12);
    expect(evaluateNormativeDraft(drafts[1], effects)).toBeCloseTo(140, 12);
    expect(effects).toEqual({ DL: 100, LL: 40 });
  });

  it('rejects ambiguous, missing, or misclassified mappings', () => {
    expect(() => generateNormativeCombinationDrafts(NTC_CDMX_2023_GROUP_B, cases, {
      permanentCaseId: 'DL', variableCaseId: 'DL',
    })).toThrow(/distintos/i);
    expect(() => generateNormativeCombinationDrafts(NTC_CDMX_2023_GROUP_B, cases, {
      permanentCaseId: 'missing', variableCaseId: 'LL',
    })).toThrow(/no existe/i);
    expect(() => generateNormativeCombinationDrafts(NTC_CDMX_2023_GROUP_B, cases, {
      permanentCaseId: 'LL', variableCaseId: 'DL',
    })).toThrow(/permanente/i);
  });

  it('requires every referenced case effect and finite arithmetic', () => {
    const [draft] = generateNormativeCombinationDrafts(NTC_CDMX_2023_GROUP_B, cases, {
      permanentCaseId: 'DL', variableCaseId: 'LL',
    });

    expect(() => evaluateNormativeDraft(draft, { DL: 100 })).toThrow(/LL/);
    expect(() => evaluateNormativeDraft(draft, { DL: 100, LL: Number.NaN })).toThrow(/finito/i);
  });

  it('creates an editable project combination while retaining its standards provenance', () => {
    const [draft] = generateNormativeCombinationDrafts(NTC_CDMX_2023_GROUP_B, cases, {
      permanentCaseId: 'DL', variableCaseId: 'LL',
    });
    const combination = createProjectCombinationFromNormativeDraft(draft, [{ id: 'COMB1', name: 'Existente', factors: {} }]);

    expect(combination).toMatchObject({
      id: 'COMB2',
      name: draft.name,
      factors: { DL: 1.3, LL: 1.5 },
      jurisdiction: 'Ciudad de México',
      edition: '2023',
      stateLimit: 'ultimate',
      sourceUrl: NTC_CDMX_2023_GROUP_B.source.url,
      reviewedAt: NTC_CDMX_2023_GROUP_B.reviewedAt,
    });
    expect(combination.source).toContain('2.3.1(a)');
    expect(combination.source).toContain(NTC_CDMX_2023_GROUP_B.source.sha256);
    expect(draft.appliedToProject).toBe(false);
  });
});
