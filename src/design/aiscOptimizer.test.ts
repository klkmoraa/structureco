import { describe, expect, it } from 'vitest';
import { findStandardMaterial } from '../data/standardMaterials';
import { findStandardSection } from '../data/standardSections';
import type { MemberModel, MemberResult, ProjectModel } from '../types';
import { recommendAiscSections } from './aiscOptimizer';

const material = findStandardMaterial('steel-a992')!;
const initialSection = findStandardSection('w8x31')!;

const member: MemberModel = {
  id: 'M1',
  i: 'N1',
  j: 'N2',
  type: 'frame',
  materialId: material.id,
  materialOrigin: 'catalog',
  sectionId: initialSection.id,
  sectionOrigin: 'catalog',
  E: material.elasticModulus,
  A: initialSection.area,
  I: initialSection.inertiaX,
};

const memberResult = (moment = 60, axial = -100): MemberResult => ({
  memberId: 'M1',
  length: 4.0,
  localDisplacements: [],
  localEndForces: [],
  diagramSegments: [],
  diagramJumps: [],
  criticalPoints: [],
  diagram: [],
  deformation: [],
  deformationSegments: [],
  deformationCriticalPoints: [],
  maxAxial: 0,
  minAxial: axial,
  maxShear: 20,
  minShear: -20,
  maxMoment: moment,
  minMoment: -moment / 2,
} as unknown as MemberResult);

const project: ProjectModel = {
  id: 'P1',
  name: 'AISC Optimizer Test',
  nodes: [],
  members: [member],
  loadCases: [],
  combinations: [],
  nodalLoads: [],
  memberLoads: [],
  prescribedDisplacements: [],
  memberInitialEffects: [],
  settings: { units: 'kN-m', language: 'es' },
} as unknown as ProjectModel;

describe('aiscOptimizer', () => {
  it('evaluates all standard AISC I-shapes and ranks them by weight', () => {
    const res = recommendAiscSections({ member, memberResult: memberResult(), project });
    expect(res).not.toBeNull();
    expect(res?.currentSection.id).toBe('w8x31');
    expect(res?.allCandidates.length).toBeGreaterThanOrEqual(10);

    // Candidates should be ordered by weight ascending
    for (let i = 1; i < res!.allCandidates.length; i++) {
      expect(res!.allCandidates[i].weightPerMeter).toBeGreaterThanOrEqual(res!.allCandidates[i - 1].weightPerMeter);
    }
  });

  it('suggests a heavier section when current section fails', () => {
    // Huge moment to make W8x31 fail
    const res = recommendAiscSections({
      member,
      memberResult: memberResult(200, -200),
      project,
    });
    expect(res).not.toBeNull();
    expect(res?.currentRatio).toBeGreaterThan(1.0);
    expect(res?.recommendedSection).not.toBeNull();
    expect(res?.recommendedSection?.isPassing).toBe(true);
    expect(res?.recommendedSection?.weightPerMeter).toBeGreaterThan(initialSection.linearWeight);
  });

  it('suggests a lighter section when current section is overdesigned', () => {
    // Very small forces
    const res = recommendAiscSections({
      member,
      memberResult: memberResult(5, -10),
      project,
    });
    expect(res).not.toBeNull();
    expect(res?.currentRatio).toBeLessThan(0.20);
    expect(res?.recommendedSection).not.toBeNull();
    expect(res?.recommendedSection?.weightPerMeter).toBeLessThan(initialSection.linearWeight);
    expect(res?.recommendedSection?.weightDeltaPercent).toBeLessThan(0);
  });

  it('returns null for non-AISC or non-I sections', () => {
    const nonAiscMember = { ...member, sectionId: 'concrete-rect-300x500' };
    const res = recommendAiscSections({ member: nonAiscMember, memberResult: memberResult(), project });
    expect(res).toBeNull();
  });
});
