/** Barras de signo restringido: cables/tirantes y puntales/contactos. */
import type { AnalysisResult, LoadCombination, MemberModel, NodeLink, ProjectModel } from '../types';
import { analyzeProject, linearizeNodeLink, linkRelativeDisplacement, type AnalyzeProjectOptions, type LinkLinearization } from './solver';

export interface ActiveSetOptions extends AnalyzeProjectOptions { maxIterations?: number }

const DEFAULT_MAX_ITERATIONS = 40;

export const conditionalMembers = (project: ProjectModel): MemberModel[] =>
  project.members.filter((member) => member.axialBehavior === 'tension-only' || member.axialBehavior === 'compression-only');

export const hasConditionalMembers = (project: ProjectModel): boolean => conditionalMembers(project).length > 0;

export const conditionalNodeLinks = (project: ProjectModel): NodeLink[] =>
  (project.nodeLinks ?? []).filter((link) => link.behavior !== 'linear');

export const hasConditionalNodeLinks = (project: ProjectModel): boolean => conditionalNodeLinks(project).length > 0;

/** Fuerza axial media, con tracción positiva según el convenio del solver. */
const axialForceOf = (result: AnalysisResult, memberId: string): number => {
  const member = result.memberResults.find((candidate) => candidate.memberId === memberId);
  return member ? (-member.localEndForces[0] + member.localEndForces[3]) / 2 : 0;
};

/** Alargamiento que tendría un miembro descolgado bajo el desplazamiento actual. */
const elongationOf = (result: AnalysisResult, project: ProjectModel, member: MemberModel): number => {
  const i = project.nodes.find((node) => node.id === member.i);
  const j = project.nodes.find((node) => node.id === member.j);
  const resultI = result.nodeResults.find((node) => node.nodeId === member.i);
  const resultJ = result.nodeResults.find((node) => node.nodeId === member.j);
  if (!i || !j || !resultI || !resultJ) return 0;
  const length = Math.hypot(j.x - i.x, j.y - i.y);
  if (!(length > 0)) return 0;
  return ((resultJ.ux - resultI.ux) * (j.x - i.x) + (resultJ.uy - resultI.uy) * (j.y - i.y)) / length;
};

const admits = (member: MemberModel, value: number, tolerance: number): boolean =>
  member.axialBehavior === 'tension-only' ? value >= -tolerance : value <= tolerance;

const withoutInactive = (project: ProjectModel, inactive: ReadonlySet<string>): ProjectModel =>
  inactive.size ? { ...project, members: project.members.filter((member) => !inactive.has(member.id)) } : project;

const initialLinkLinearization = (link: NodeLink): LinkLinearization => {
  // Contacts that begin exactly closed need an initial tangent; otherwise a
  // structure resting on its only contact would be declared a mechanism before
  // the active set gets a displacement from which to decide its state.
  if ((link.behavior === 'compression-only' || link.behavior === 'tension-only') && (link.clearance ?? 0) === 0) {
    return { tangentStiffness: link.stiffness, constantForce: 0, active: true };
  }
  return linearizeNodeLink(link);
};

const signatureForLinkStates = (states: ReadonlyMap<string, LinkLinearization>): string => [...states.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([id, state]) => `${id}:${state.active ? 1 : 0}:${state.tangentStiffness.toPrecision(12)}:${state.constantForce.toPrecision(12)}`)
  .join('|');

/**
 * Encuentra las barras que pueden trabajar sin sustituir una barra floja por
 * una rigidez arbitrariamente pequeña. Sin miembros condicionales delega en el
 * solver y conserva exactamente el resultado de primer orden existente.
 */
export const analyzeProjectWithActiveSet = (
  project: ProjectModel,
  combination?: LoadCombination | null,
  options: ActiveSetOptions = {},
): AnalysisResult => {
  const conditional = conditionalMembers(project);
  const conditionalLinks = conditionalNodeLinks(project);
  if (!conditional.length && !conditionalLinks.length) return analyzeProject(project, combination, options);

  const maximum = Math.max(1, Math.trunc(options.maxIterations ?? DEFAULT_MAX_ITERATIONS));
  let inactive = new Set<string>();
  let linkStates = new Map((project.nodeLinks ?? []).map((link) => [link.id, initialLinkLinearization(link)]));
  const visited = new Set<string>();
  const signature = (set: ReadonlySet<string>, states: ReadonlyMap<string, LinkLinearization>) => `${[...set].sort().join('|')}#${signatureForLinkStates(states)}`;
  let result!: AnalysisResult;
  let iterations = 1;
  let cycled = false;
  let reason = '';

  for (; iterations <= maximum; iterations += 1) {
    result = analyzeProject(withoutInactive(project, inactive), combination, { ...options, nodeLinkLinearizations: linkStates });
    if (!result.success) {
      reason = inactive.size || conditionalLinks.length
        ? `Con ${inactive.size} barra(s) y ${[...linkStates.values()].filter((state) => !state.active).length} vínculo(s) condicional(es) abiertos, el modelo deja de ser estable.`
        : 'El análisis no es válido ni con todas las barras y vínculos trabajando.';
      return {
        ...result,
        activeSet: {
          converged: false, iterations, cycled, reason,
          activeMemberIds: conditional.filter((member) => !inactive.has(member.id)).map((member) => member.id),
          inactiveMemberIds: [...inactive],
          activeLinkIds: conditionalLinks.filter((link) => linkStates.get(link.id)?.active).map((link) => link.id),
          inactiveLinkIds: conditionalLinks.filter((link) => !linkStates.get(link.id)?.active).map((link) => link.id),
        },
      };
    }

    const tolerance = Math.max(...conditional.map((member) => Math.abs(axialForceOf(result, member.id))), 1e-9) * 1e-9;
    const next = new Set<string>();
    for (const member of conditional) {
      if (inactive.has(member.id)) {
        const elongation = elongationOf(result, project, member);
        const wouldWork = member.axialBehavior === 'tension-only' ? elongation > 0 : elongation < 0;
        if (!wouldWork) next.add(member.id);
      } else if (!admits(member, axialForceOf(result, member.id), tolerance)) {
        next.add(member.id);
      }
    }
    const nodeIndex = new Map(project.nodes.map((node, index) => [node.id, index]));
    const nextLinkStates = new Map((project.nodeLinks ?? []).map((link) => [
      link.id,
      linearizeNodeLink(link, linkRelativeDisplacement(link, result.displacements, nodeIndex)),
    ]));
    if (signature(next, nextLinkStates) === signature(inactive, linkStates)) {
      const openedLinks = conditionalLinks.filter((link) => !nextLinkStates.get(link.id)?.active).length;
      reason = inactive.size || openedLinks
        ? `Conjunto activo estable tras ${iterations} resolución(es); ${inactive.size} barra(s) y ${openedLinks} vínculo(s) condicional(es) quedan abiertos.`
        : 'Todas las barras y vínculos condicionales trabajan; el conjunto fue estable a la primera.';
      return {
        ...result,
        activeSet: {
          converged: true, iterations, cycled: false, reason,
          activeMemberIds: conditional.filter((member) => !inactive.has(member.id)).map((member) => member.id),
          inactiveMemberIds: [...inactive],
          activeLinkIds: conditionalLinks.filter((link) => nextLinkStates.get(link.id)?.active).map((link) => link.id),
          inactiveLinkIds: conditionalLinks.filter((link) => !nextLinkStates.get(link.id)?.active).map((link) => link.id),
        },
      };
    }
    if (visited.has(signature(next, nextLinkStates))) {
      cycled = true;
      reason = 'La iteración alterna entre conjuntos ya visitados: el modelo no tiene una configuración estable de barras y vínculos bajo esta carga.';
      break;
    }
    visited.add(signature(next, nextLinkStates));
    inactive = next;
    linkStates = nextLinkStates;
  }

  if (!cycled) reason = `Se agotaron las ${maximum} resoluciones sin que el conjunto de barras activas se estabilizara.`;
  return {
    ...result,
    issues: [...result.issues, {
      id: 'active-set-not-converged', severity: 'warning', title: 'Las barras de signo restringido no se estabilizaron',
      message: reason, suggestedFix: 'Revisa si alguna barra sobra o si la carga hace que el modelo dependa de una barra que se afloja y vuelve.',
    }],
    activeSet: {
      converged: false, iterations: Math.min(iterations, maximum), cycled, reason,
      activeMemberIds: conditional.filter((member) => !inactive.has(member.id)).map((member) => member.id),
      inactiveMemberIds: [...inactive],
      activeLinkIds: conditionalLinks.filter((link) => linkStates.get(link.id)?.active).map((link) => link.id),
      inactiveLinkIds: conditionalLinks.filter((link) => !linkStates.get(link.id)?.active).map((link) => link.id),
    },
  };
};
