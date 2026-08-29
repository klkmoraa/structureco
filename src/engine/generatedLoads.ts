import type { GeneratedLoadSource, MemberInitialEffect, MemberLoad, MovingLoadCase, ProjectModel } from '../types';

/**
 * Resolves higher-level, persisted loading definitions into the two primitive
 * action families the matrix engine already audits: member loads and initial
 * strains/curvatures. The source definitions themselves remain untouched in
 * the project, so editing units or scenarios never bakes derived numbers into
 * the model.
 */
export interface ResolvedGeneratedLoads {
  memberLoads: MemberLoad[];
  memberInitialEffects: MemberInitialEffect[];
}

const distributed = (
  id: string,
  memberId: string,
  caseId: string,
  qx: number,
  qy: number,
  coordinateSystem: MemberLoad['coordinateSystem'] = 'global',
  lengthBasis: MemberLoad['lengthBasis'] = 'real',
): MemberLoad => ({
  id, memberId, caseId, type: 'distributed', coordinateSystem, lengthBasis,
  start: 0, end: 1, qxStart: qx, qxEnd: qx, qyStart: qy, qyEnd: qy,
});

const globalDirection = (direction: 'global-x' | 'global-y', magnitude: number): [number, number] =>
  direction === 'global-x' ? [magnitude, 0] : [0, magnitude];

const hydrostaticLoad = (source: Extract<GeneratedLoadSource, { kind: 'hydrostatic' | 'soil-pressure' }>, project: ProjectModel): MemberLoad[] => {
  const nodes = new Map(project.nodes.map((node) => [node.id, node]));
  const sign = source.sign ?? 1;
  return source.memberIds.flatMap((memberId) => {
    const member = project.members.find((candidate) => candidate.id === memberId);
    if (!member) return [];
    const i = nodes.get(member.i); const j = nodes.get(member.j);
    if (!i || !j) return [];
    // The project is planar; pressure is interpreted per metre normal to the
    // screen. A non-positive depth is dry/unloaded, while pressure at the
    // reference elevation can model surcharge or a water table offset.
    const pressure = (y: number) => Math.max(0, (source.pressureAtReference ?? 0) + source.unitWeight * Math.max(0, source.referenceY - y));
    const [qxI, qyI] = globalDirection(source.direction, sign * pressure(i.y));
    const [qxJ, qyJ] = globalDirection(source.direction, sign * pressure(j.y));
    return [{
      id: `generated:${source.id}:${memberId}`,
      memberId,
      caseId: source.caseId,
      type: 'distributed' as const,
      coordinateSystem: 'global' as const,
      lengthBasis: 'real' as const,
      start: 0,
      end: 1,
      qxStart: qxI,
      qxEnd: qxJ,
      qyStart: qyI,
      qyEnd: qyJ,
    }];
  });
};

const resolveSource = (source: GeneratedLoadSource, project: ProjectModel): ResolvedGeneratedLoads => {
  if (source.kind === 'elastic-foundation') return { memberLoads: [], memberInitialEffects: [] };
  if (source.kind === 'tributary-surface') {
    const [qx, qy] = globalDirection(source.direction, source.pressure * source.tributaryWidth);
    return { memberLoads: source.memberIds.map((memberId) => distributed(`generated:${source.id}:${memberId}`, memberId, source.caseId, qx, qy)), memberInitialEffects: [] };
  }
  if (source.kind === 'hydrostatic' || source.kind === 'soil-pressure') {
    return { memberLoads: hydrostaticLoad(source, project), memberInitialEffects: [] };
  }
  if (source.kind === 'live-pattern' || source.kind === 'member-chain') {
    const pattern = source.pattern ?? 'all';
    const selected = source.memberIds.filter((_, index) => pattern === 'all'
      || (pattern === 'alternating-odd' ? index % 2 === 0 : index % 2 === 1));
    return {
      memberLoads: selected.map((memberId) => distributed(
        `generated:${source.id}:${memberId}`,
        memberId,
        source.caseId,
        source.qx ?? 0,
        source.qy,
        source.coordinateSystem ?? 'global',
        source.lengthBasis ?? 'real',
      )),
      memberInitialEffects: [],
    };
  }
  if (source.kind !== 'prestress') return { memberLoads: [], memberInitialEffects: [] };
  const members = new Map(project.members.map((member) => [member.id, member]));
  return {
    memberLoads: [],
    memberInitialEffects: source.memberIds.flatMap((memberId) => {
      const member = members.get(memberId);
      if (!member || !(member.E > 0) || !(member.A > 0)) return [];
      const axialStrain = source.force / (member.E * member.A);
      const curvature = member.type === 'frame' && member.I > 0
        ? source.force * (source.eccentricity ?? 0) / (member.E * member.I)
        : 0;
      return [{
        id: `generated:${source.id}:${memberId}`,
        memberId,
        caseId: source.caseId,
        type: 'initial-strain' as const,
        axialStrain,
        curvature,
      }];
    }),
  };
};

export const resolveGeneratedLoads = (project: ProjectModel): ResolvedGeneratedLoads => {
  const memberLoads: MemberLoad[] = [];
  const memberInitialEffects: MemberInitialEffect[] = [];
  for (const source of project.generatedLoadSources ?? []) {
    const resolved = resolveSource(source, project);
    memberLoads.push(...resolved.memberLoads);
    memberInitialEffects.push(...resolved.memberInitialEffects);
  }
  return { memberLoads, memberInitialEffects };
};

/** Returns a solver-only projection; persisted source data is never rewritten. */
export const withResolvedGeneratedLoads = (project: ProjectModel): ProjectModel => {
  if (!(project.generatedLoadSources?.length)) return project;
  const resolved = resolveGeneratedLoads(project);
  return {
    ...project,
    memberLoads: [...project.memberLoads, ...resolved.memberLoads],
    memberInitialEffects: [...(project.memberInitialEffects ?? []), ...resolved.memberInitialEffects],
  };
};

/** Converts persisted case data to the existing influence-line axle contract. */
export const axleTrainFromMovingLoadCase = (loadCase: MovingLoadCase) => ({
  axles: loadCase.axles.map((axle) => ({ ...axle })),
  impactFactor: loadCase.impactFactor ?? 1,
});
