/**
 * Comprobaciones independientes de aritmética para un análisis lineal de
 * primer orden. No evalúan el modelo ni sustituyen una revisión profesional:
 * vuelven a resolverlo para contrastar equilibrio, proporcionalidad,
 * reciprocidad y sensibilidad a la discretización.
 */
import type { LoadCombination, ProjectModel } from '../types';
import { splitMemberAt } from '../data/modelOperations';
import { analyzeProject } from './solver';

export type CertificateCheckId = 'global-equilibrium' | 'linearity' | 'maxwell-betti' | 'h-refinement';
export type CertificateStatus = 'passed' | 'observed' | 'not-applicable' | 'failed';

export interface CertificateCheck {
  id: CertificateCheckId;
  label: string;
  status: CertificateStatus;
  /** Magnitud relativa y adimensional cuando la comprobación lo permite. */
  value?: number;
  tolerance?: number;
  message: string;
}

export interface NumericCertificate {
  checks: CertificateCheck[];
  verdict: 'verified' | 'observations' | 'not-verifiable';
  summary: string;
  /** Resoluciones adicionales, sin contar la solución de referencia. */
  extraSolves: number;
}

export interface CertificateOptions {
  skip?: readonly CertificateCheckId[];
  /** Deriva relativa que merece atención al refinar; por defecto, 5 %. */
  refinementObservationThreshold?: number;
}

const EQUILIBRIUM_TOLERANCE = 1e-8;
const LINEARITY_TOLERANCE = 1e-10;
const RECIPROCITY_TOLERANCE = 1e-8;

const clone = (project: ProjectModel): ProjectModel => JSON.parse(JSON.stringify(project)) as ProjectModel;

/** Conserva rigidez y restricciones, retirando todas las acciones exteriores. */
const bareStructure = (project: ProjectModel): ProjectModel => {
  const bare = clone(project);
  bare.nodalLoads = [];
  bare.memberLoads = [];
  bare.memberInitialEffects = [];
  bare.prescribedDisplacements = [];
  bare.combinations = [];
  bare.loadCases = [{ id: 'BETTI', name: 'Betti', category: 'other', active: true }];
  bare.nodes = bare.nodes.map((node) => ({ ...node, support: { ...node.support, prescribed: undefined } }));
  return bare;
};

type Component = 'ux' | 'uy';

const unitResponse = (
  bare: ProjectModel,
  loadAt: { nodeId: string; component: Component },
  readAt: { nodeId: string; component: Component },
): number | undefined => {
  const project = clone(bare);
  project.nodalLoads = [{
    id: 'UNIT', nodeId: loadAt.nodeId, caseId: 'BETTI',
    fx: loadAt.component === 'ux' ? 1 : 0,
    fy: loadAt.component === 'uy' ? 1 : 0,
    mz: 0,
  }];
  const result = analyzeProject(project, null, { includeEducationTrace: false });
  if (!result.success) return undefined;
  const node = result.nodeResults.find((candidate) => candidate.nodeId === readAt.nodeId);
  return node?.[readAt.component];
};

/** Escala cada acción lineal que hoy entiende el solver, sin mutar el modelo. */
const scaleActions = (project: ProjectModel, scale: number): ProjectModel => {
  const doubled = clone(project);
  doubled.nodalLoads = doubled.nodalLoads.map((load) => ({ ...load, fx: load.fx * scale, fy: load.fy * scale, mz: load.mz * scale }));
  doubled.memberLoads = doubled.memberLoads.map((load) => ({
    ...load,
    qxStart: load.qxStart === undefined ? undefined : load.qxStart * scale,
    qxEnd: load.qxEnd === undefined ? undefined : load.qxEnd * scale,
    qyStart: load.qyStart === undefined ? undefined : load.qyStart * scale,
    qyEnd: load.qyEnd === undefined ? undefined : load.qyEnd * scale,
    px: load.px === undefined ? undefined : load.px * scale,
    py: load.py === undefined ? undefined : load.py * scale,
    moment: load.moment === undefined ? undefined : load.moment * scale,
  }));
  doubled.loadCases = doubled.loadCases.map((loadCase) => ({
    ...loadCase,
    selfWeightFactor: loadCase.selfWeightFactor === undefined ? undefined : loadCase.selfWeightFactor * scale,
  }));
  doubled.prescribedDisplacements = (doubled.prescribedDisplacements ?? []).map((displacement) => ({
    ...displacement, value: displacement.value * scale,
  }));
  doubled.memberInitialEffects = (doubled.memberInitialEffects ?? []).map((effect) => ({
    ...effect,
    deltaT: effect.deltaT === undefined ? undefined : effect.deltaT * scale,
    gradient: effect.gradient === undefined ? undefined : effect.gradient * scale,
    axialStrain: effect.axialStrain === undefined ? undefined : effect.axialStrain * scale,
    curvature: effect.curvature === undefined ? undefined : effect.curvature * scale,
  }));
  doubled.nodes = doubled.nodes.map((node) => ({
    ...node,
    support: node.support.prescribed
      ? { ...node.support, prescribed: Object.fromEntries(Object.entries(node.support.prescribed).map(([key, value]) => [key, value === undefined ? undefined : value * scale])) }
      : node.support,
  }));
  return doubled;
};

export const certifyResult = (
  project: ProjectModel,
  combination?: LoadCombination | null,
  options: CertificateOptions = {},
): NumericCertificate => {
  if (project.settings.analysisMode === 'p-delta') {
    return {
      checks: [],
      verdict: 'not-verifiable',
      summary: 'El certificado actual valida sólo análisis lineales de primer orden; P-Delta requiere comprobaciones específicas de segundo orden.',
      extraSolves: 0,
    };
  }

  const skip = new Set(options.skip ?? []);
  const refinementThreshold = options.refinementObservationThreshold ?? 0.05;
  const checks: CertificateCheck[] = [];
  let extraSolves = 0;
  const reference = analyzeProject(project, combination, { includeEducationTrace: false });
  if (!reference.success) {
    return {
      checks: [],
      verdict: 'not-verifiable',
      summary: 'El análisis de referencia no es válido, así que no hay resultado que certificar.',
      extraSolves: 0,
    };
  }

  if (!skip.has('global-equilibrium')) {
    const value = reference.equilibrium.normalizedResidual;
    checks.push({
      id: 'global-equilibrium', label: 'Equilibrio global',
      status: Number.isFinite(value) ? (value <= EQUILIBRIUM_TOLERANCE ? 'passed' : 'failed') : 'not-applicable',
      value, tolerance: EQUILIBRIUM_TOLERANCE,
      message: Number.isFinite(value)
        ? `La resultante de cargas y reacciones se anula con residuo relativo ${value.toExponential(2)}.`
        : 'El solver no reportó un residuo de equilibrio finito.',
    });
  }

  if (!skip.has('linearity')) {
    const scale = 2;
    const scaled = analyzeProject(scaleActions(project, scale), combination, { includeEducationTrace: false });
    extraSolves += 1;
    const magnitude = Math.max(...reference.displacements.map(Math.abs), 0);
    if (!scaled.success || !(magnitude > 0)) {
      checks.push({
        id: 'linearity', label: 'Linealidad de la respuesta', status: 'not-applicable',
        message: scaled.success
          ? 'El modelo no se mueve bajo esta combinación, así que escalar las acciones no aporta evidencia.'
          : 'El modelo con las acciones duplicadas deja de resolverse.',
      });
    } else {
      const drift = Math.max(...reference.displacements.map((value, index) =>
        Math.abs((scaled.displacements[index] ?? 0) - scale * value))) / (scale * magnitude);
      checks.push({
        id: 'linearity', label: 'Linealidad de la respuesta',
        status: drift <= LINEARITY_TOLERANCE ? 'passed' : 'failed',
        value: drift, tolerance: LINEARITY_TOLERANCE,
        message: `Duplicar las acciones duplica la respuesta con desviación relativa ${drift.toExponential(2)}.`,
      });
    }
  }

  if (!skip.has('maxwell-betti')) {
    const movers = reference.nodeResults
      .map((node) => ({
        nodeId: node.nodeId,
        component: (Math.abs(node.ux) >= Math.abs(node.uy) ? 'ux' : 'uy') as Component,
        magnitude: Math.max(Math.abs(node.ux), Math.abs(node.uy)),
      }))
      .filter((candidate) => candidate.magnitude > 0)
      .sort((a, b) => b.magnitude - a.magnitude);
    if (movers.length < 2) {
      checks.push({
        id: 'maxwell-betti', label: 'Reciprocidad de Maxwell-Betti', status: 'not-applicable',
        message: 'El modelo no tiene dos grados de libertad con movimiento apreciable que comparar.',
      });
    } else {
      const [first, second] = movers;
      const bare = bareStructure(project);
      const forward = unitResponse(bare, first, second);
      const backward = unitResponse(bare, second, first);
      extraSolves += 2;
      const scale = Math.max(Math.abs(forward ?? 0), Math.abs(backward ?? 0));
      if (forward === undefined || backward === undefined || !(scale > 0)) {
        checks.push({
          id: 'maxwell-betti', label: 'Reciprocidad de Maxwell-Betti', status: 'not-applicable',
          message: 'La estructura sin acciones no responde a una carga unidad en los grados de libertad elegidos.',
        });
      } else {
        const drift = Math.abs(forward - backward) / scale;
        checks.push({
          id: 'maxwell-betti', label: 'Reciprocidad de Maxwell-Betti',
          status: drift <= RECIPROCITY_TOLERANCE ? 'passed' : 'failed', value: drift, tolerance: RECIPROCITY_TOLERANCE,
          message: `El desplazamiento recíproco entre ${first.nodeId}.${first.component} y ${second.nodeId}.${second.component} tiene discrepancia relativa ${drift.toExponential(2)}.`,
        });
      }
    }
  }

  if (!skip.has('h-refinement')) {
    const refined = clone(project);
    let splits = 0;
    for (const memberId of project.members.map((member) => member.id)) {
      try {
        splitMemberAt(refined, memberId, 0.5);
        splits += 1;
      } catch {
        // Zonas rígidas o vínculos no subdivisibles no impiden medir el resto.
      }
    }
    if (!splits) {
      checks.push({
        id: 'h-refinement', label: 'Error de discretización (refinamiento h)', status: 'not-applicable',
        message: 'Ningún miembro admite subdivisión, así que no hay malla que refinar.',
      });
    } else {
      const fine = analyzeProject(refined, combination, { includeEducationTrace: false });
      extraSolves += 1;
      const peak = Math.max(...reference.nodeResults.map((node) => Math.hypot(node.ux, node.uy)), 0);
      if (!fine.success || !(peak > 0)) {
        checks.push({
          id: 'h-refinement', label: 'Error de discretización (refinamiento h)', status: 'not-applicable',
          message: fine.success
            ? 'El modelo no se mueve, así que refinar no cambia nada que medir.'
            : 'El modelo subdividido deja de resolverse.',
        });
      } else {
        const drift = Math.max(...reference.nodeResults.map((node) => {
          const refinedNode = fine.nodeResults.find((candidate) => candidate.nodeId === node.nodeId);
          return refinedNode ? Math.hypot(refinedNode.ux - node.ux, refinedNode.uy - node.uy) : 0;
        })) / peak;
        checks.push({
          id: 'h-refinement', label: 'Error de discretización (refinamiento h)',
          status: drift <= refinementThreshold ? 'passed' : 'observed', value: drift, tolerance: refinementThreshold,
          message: `Duplicar la malla mueve los desplazamientos un ${(drift * 100).toFixed(3)} %. Es la escala del error de discretización de este modelo, no un defecto del cálculo.`,
        });
      }
    }
  }

  const failed = checks.filter((check) => check.status === 'failed');
  const observed = checks.filter((check) => check.status === 'observed');
  const applicable = checks.filter((check) => check.status !== 'not-applicable').length;
  const verdict = applicable === 0 ? 'not-verifiable' : failed.length || observed.length ? 'observations' : 'verified';
  return {
    checks, verdict, extraSolves,
    summary: applicable === 0
      ? 'No hubo comprobaciones aplicables para emitir un certificado.'
      : failed.length
        ? `${failed.length} de ${applicable} comprobaciones independientes no se cumplen: ${failed.map((check) => check.label).join(', ')}.`
        : observed.length
          ? `Las ${applicable} comprobaciones se cumplen; ${observed.length} merecen atención: ${observed.map((check) => check.label).join(', ')}.`
          : `Las ${applicable} comprobaciones independientes se cumplen.`,
  };
};
