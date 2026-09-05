import { findStandardSection, standardSections, type StandardSection } from '../data/standardSections';
import type { MemberModel, MemberResult, ProjectModel } from '../types';
import { evaluateAiscMember } from './aiscSteel360';
import type { AiscCheckStatus } from './aiscSteel360Types';

export interface SectionRecommendation {
  readonly section: StandardSection;
  readonly governingRatio: number;
  readonly status: AiscCheckStatus;
  readonly weightPerMeter: number;
  readonly weightDeltaPercent: number;
  readonly isPassing: boolean;
}

export interface SectionOptimizationResult {
  readonly currentSection: StandardSection;
  readonly currentRatio: number;
  readonly currentWeightPerMeter: number;
  readonly recommendedSection: SectionRecommendation | null;
  readonly allCandidates: readonly SectionRecommendation[];
}

/**
 * Recommends optimal standard AISC sections for a given member under its current analysis demand.
 * Evaluates all AISC I-shapes in the catalog and ranks them by linear weight (kN/m).
 */
export const recommendAiscSections = (params: {
  member: MemberModel;
  memberResult: MemberResult;
  project: ProjectModel;
}): SectionOptimizationResult | null => {
  const { member, memberResult, project } = params;

  if (!member.sectionId) return null;
  const currentSection = findStandardSection(member.sectionId);
  if (!currentSection || currentSection.standard !== 'AISC' || currentSection.shapeType !== 'I') {
    return null;
  }

  const currentDesign = evaluateAiscMember({ member, memberResult, project });
  const currentRatio = currentDesign.maxRatio;
  const currentWeight = currentSection.linearWeight;

  // Filter only standard AISC I-sections
  const aiscISections = standardSections.filter(
    (s): s is StandardSection => s.standard === 'AISC' && s.shapeType === 'I',
  );

  const candidates: SectionRecommendation[] = [];

  for (const candidate of aiscISections) {
    const candidateMember: MemberModel = {
      ...member,
      sectionId: candidate.id,
      A: candidate.area,
      I: candidate.inertiaX,
    };

    const design = evaluateAiscMember({ member: candidateMember, memberResult, project });
    if (!design.isEligible) continue;

    const weightDeltaPercent = currentWeight > 0
      ? ((candidate.linearWeight - currentWeight) / currentWeight) * 100
      : 0;

    candidates.push({
      section: candidate,
      governingRatio: design.maxRatio,
      status: design.status,
      weightPerMeter: candidate.linearWeight,
      weightDeltaPercent,
      isPassing: design.maxRatio <= 1.0,
    });
  }

  // Sort candidates by linear weight ascending (lightest first)
  candidates.sort((a, b) => a.weightPerMeter - b.weightPerMeter);

  // Recommended: lightest section that passes with margin (ratio <= 0.90),
  // or failing that, lightest section that passes (ratio <= 1.00).
  const preferredPassing = candidates.find((c) => c.governingRatio <= 0.90);
  const acceptablePassing = candidates.find((c) => c.governingRatio <= 1.00);
  const recommendedSection = preferredPassing ?? acceptablePassing ?? null;

  return {
    currentSection,
    currentRatio,
    currentWeightPerMeter: currentWeight,
    recommendedSection,
    allCandidates: candidates,
  };
};
