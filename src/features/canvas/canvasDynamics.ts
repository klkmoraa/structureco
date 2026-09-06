import type { ProjectModel } from '../../types';

export interface MemberForceFlow {
  memberId: string;
  axial: number;
  shear: number;
  kind: 'tension' | 'compression' | 'neutral';
  intensity: number; // 0 to 1
  flowDirection: 1 | -1;
}

/**
 * Computes the harmonic oscillation factor for dynamic deformation.
 * Yields a smooth sinusoidal value between -amplitude and +amplitude.
 */
export const harmonicFactor = (
  timeMs: number,
  frequencyHz = 1.0,
  amplitude = 1.0,
): number => {
  if (!Number.isFinite(timeMs)) return 0;
  const omega = 2 * Math.PI * Math.max(0.1, frequencyHz);
  return Math.sin((timeMs / 1000) * omega) * Math.max(0, amplitude);
};

export interface MemberResultLike {
  memberId: string;
  maxAxial?: number;
  minAxial?: number;
  localEndForces?: ReadonlyArray<number>;
  criticalPoints?: ReadonlyArray<{ quantity: string; value: number }>;
}

/**
 * Computes force flow paths across members to visualize the load transmission.
 */
export const computeForceFlows = (
  project: ProjectModel,
  memberResults: ReadonlyArray<MemberResultLike>,
): Map<string, MemberForceFlow> => {
  const map = new Map<string, MemberForceFlow>();
  if (!memberResults.length) return map;

  const resultByMember = new Map(memberResults.map((r) => [r.memberId, r]));

  let globalMaxAxial = 0;
  const rawAxials = new Map<string, { axial: number; shear: number }>();

  for (const member of project.members) {
    const result = resultByMember.get(member.id);
    if (!result) continue;

    let axial = 0;
    let shear = 0;

    if (result.localEndForces && result.localEndForces.length >= 2) {
      axial = -result.localEndForces[0];
      shear = result.localEndForces[1];
    } else if (result.criticalPoints) {
      for (const cp of result.criticalPoints) {
        if (cp.quantity === 'axial' && Math.abs(cp.value) > Math.abs(axial)) {
          axial = cp.value;
        }
        if (cp.quantity === 'shear' && Math.abs(cp.value) > Math.abs(shear)) {
          shear = cp.value;
        }
      }
    } else {
      const maxA = Math.abs(result.maxAxial ?? 0);
      const minA = Math.abs(result.minAxial ?? 0);
      axial = maxA >= minA ? (result.maxAxial ?? 0) : (result.minAxial ?? 0);
    }

    rawAxials.set(member.id, { axial, shear });
    globalMaxAxial = Math.max(globalMaxAxial, Math.abs(axial));
  }

  const denominator = globalMaxAxial > 1e-6 ? globalMaxAxial : 1;

  for (const member of project.members) {
    const raw = rawAxials.get(member.id);
    if (!raw) continue;

    const absA = Math.abs(raw.axial);
    const normalized = Math.min(1, absA / denominator);

    let kind: MemberForceFlow['kind'] = 'neutral';
    let flowDirection: 1 | -1 = 1;

    if (absA > 1e-4) {
      if (raw.axial > 0) {
        kind = 'tension';
        flowDirection = 1;
      } else {
        kind = 'compression';
        flowDirection = -1;
      }
    }

    map.set(member.id, {
      memberId: member.id,
      axial: raw.axial,
      shear: raw.shear,
      kind,
      intensity: Math.max(0.12, normalized),
      flowDirection,
    });
  }

  return map;
};
