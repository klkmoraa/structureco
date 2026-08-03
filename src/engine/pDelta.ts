import type {
  AnalysisResult,
  LoadCombination,
  PDeltaConfig,
  PDeltaDiagnostics,
  PDeltaStepIteration,
  ProjectModel,
} from '../types';
import { abortedAnalysis } from './analysisFailure';
import { analyzeProject, selectedFactors } from './solver';

export const DEFAULT_PDELTA_CONFIG: PDeltaConfig = {
  maxLoadSteps: 12,
  maxIterationsPerStep: 30,
  equilibriumTolerance: 1e-6,
  displacementTolerance: 1e-6,
  stepReductionFactor: 0.5,
  minimumStep: 1 / 64,
};

export const resolvePDeltaConfig = (project: ProjectModel): PDeltaConfig => ({
  ...DEFAULT_PDELTA_CONFIG,
  ...project.settings.pDeltaConfig,
});

/**
 * A combination scaled to `lambda` of its own intensity. Every quantity that
 * already flows through `factors` — nodal/member loads, self-weight, initial
 * effects, and case-linked prescribed displacements — scales proportionally;
 * an absolute `support.prescribed` settlement is a fixed boundary condition
 * and is untouched, exactly as it already is for an ordinary combination.
 */
const scaleCombination = (project: ProjectModel, combination: LoadCombination | null | undefined, lambda: number): LoadCombination => {
  const resolved = selectedFactors(project, combination);
  const factors: Record<string, number> = {};
  for (const id of Object.keys(resolved)) factors[id] = resolved[id] * lambda;
  return { id: combination?.id ?? 'p-delta-step', name: combination?.name ?? 'P-Delta', factors };
};

/**
 * Axial force per frame member (tension positive, this engine's convention),
 * averaged across the member's two ends. The classic geometric-stiffness
 * matrix assumes a constant axial force along the element; averaging is the
 * standard, documented simplification for a member that also carries a
 * distributed axial load (e.g. self-weight along an inclined member), where
 * the two ends would otherwise disagree.
 */
const extractAxialForces = (result: AnalysisResult, frameMemberIds: readonly string[]): Map<string, number> => {
  const forces = new Map<string, number>();
  for (const id of frameMemberIds) {
    const member = result.memberResults.find((candidate) => candidate.memberId === id);
    if (!member) { forces.set(id, 0); continue; }
    const nEnd = -member.localEndForces[0];
    const nOther = member.localEndForces[3];
    forces.set(id, (nEnd + nOther) / 2);
  }
  return forces;
};

const relativeVectorChange = (next: readonly number[], previous: readonly number[]): number => {
  let diffSquared = 0;
  let scaleSquared = 0;
  for (let i = 0; i < next.length; i += 1) {
    const diff = next[i] - (previous[i] ?? 0);
    diffSquared += diff * diff;
    scaleSquared += next[i] * next[i];
  }
  return Math.sqrt(diffSquared) / Math.max(1, Math.sqrt(scaleSquared));
};

/**
 * Past its critical (buckling) load, the geometric-stiffness-augmented
 * tangent system is no longer positive definite: the same applied load can
 * produce a displacement pointing *against* itself — e.g. a rightward push
 * settling into a leftward sway — which a plain convergence/residual check
 * cannot see, since that state is still a perfectly self-consistent fixed
 * point of the same iteration, just a physically meaningless one. A stable
 * equilibrium can never do negative work against its own applied load, so a
 * non-positive dot product against the (always-valid, N=0) first-order
 * response is a cheap, reliable tripwire for "wrong side of the buckling
 * threshold" that needs no eigenvalue extraction.
 */
const respondsAgainstFirstOrder = (displacements: readonly number[], firstOrderDisplacements: readonly number[]): boolean => {
  let dot = 0;
  for (let i = 0; i < displacements.length; i += 1) dot += displacements[i] * firstOrderDisplacements[i];
  return dot <= 0;
};

const relativeAxialChange = (next: Map<string, number>, previous: Map<string, number>): number => {
  let maxDiff = 0;
  let maxScale = 1;
  for (const [id, value] of next) {
    const before = previous.get(id) ?? 0;
    maxDiff = Math.max(maxDiff, Math.abs(value - before));
    maxScale = Math.max(maxScale, Math.abs(value));
  }
  return maxDiff / maxScale;
};

interface StepOutcome {
  converged: boolean;
  analysisResult: AnalysisResult;
  axialForces: Map<string, number>;
  iterations: number;
  history: PDeltaStepIteration[];
  reason: string;
}

/** Fixed-point (successive-approximation) P-Delta iteration at one fixed load fraction `lambda`. */
const solveLoadStep = (
  project: ProjectModel,
  combination: LoadCombination | null | undefined,
  lambda: number,
  step: number,
  startingAxialForces: Map<string, number>,
  frameMemberIds: readonly string[],
  config: PDeltaConfig,
  firstOrderDisplacements: readonly number[],
): StepOutcome => {
  const scaled = scaleCombination(project, combination, lambda);
  let axialForces = new Map(startingAxialForces);
  let previousDisplacements: number[] | null = null;
  let previousResidual = Number.POSITIVE_INFINITY;
  const history: PDeltaStepIteration[] = [];
  let lastResult: AnalysisResult | null = null;

  for (let iteration = 1; iteration <= config.maxIterationsPerStep; iteration += 1) {
    const result = analyzeProject(project, scaled, { pDeltaAxialForces: axialForces });
    lastResult = result;
    if (!result.success) {
      return {
        converged: false, analysisResult: result, axialForces, iterations: iteration, history,
        reason: 'El sistema resultó inestable durante la iteración P-Delta (posible pandeo o mecanismo).',
      };
    }
    if (respondsAgainstFirstOrder(result.displacements, firstOrderDisplacements)) {
      return {
        converged: false, analysisResult: result, axialForces, iterations: iteration, history,
        reason: 'La respuesta se invirtió respecto al primer orden: la estructura superó su carga crítica de pandeo y la solución encontrada no es físicamente válida.',
      };
    }
    const nextAxialForces = extractAxialForces(result, frameMemberIds);
    const residual = relativeAxialChange(nextAxialForces, axialForces);
    const displacementIncrement = previousDisplacements
      ? relativeVectorChange(result.displacements, previousDisplacements)
      : Number.POSITIVE_INFINITY;
    history.push({ step, iteration, lambda, residual, displacementIncrement, conditionEstimate: result.conditionEstimate });

    const converged = iteration > 1
      && residual <= config.equilibriumTolerance
      && displacementIncrement <= config.displacementTolerance;
    if (converged) {
      return { converged: true, analysisResult: result, axialForces: nextAxialForces, iterations: iteration, history, reason: 'Se cumplieron las tolerancias de equilibrio y de incremento de desplazamiento.' };
    }
    // Growth instead of shrinkage between successive iterations is the
    // signature of a fixed-point iteration diverging (e.g. near/above the
    // critical load) — fail fast instead of burning the full iteration budget.
    if (iteration > 2 && displacementIncrement > previousResidual * 1.5 && displacementIncrement > config.displacementTolerance) {
      return {
        converged: false, analysisResult: result, axialForces: nextAxialForces, iterations: iteration, history,
        reason: 'El incremento de desplazamiento crece entre iteraciones en vez de reducirse: la iteración diverge, posiblemente cerca de la carga crítica.',
      };
    }
    previousDisplacements = result.displacements;
    previousResidual = displacementIncrement;
    axialForces = nextAxialForces;
  }
  return {
    converged: false, analysisResult: lastResult!, axialForces, iterations: config.maxIterationsPerStep, history,
    reason: `Se agotaron ${config.maxIterationsPerStep} iteraciones sin cumplir la tolerancia.`,
  };
};

const globalDisplacementMeasure = (displacements: readonly number[]): number =>
  displacements.reduce((max, value) => Math.max(max, Math.abs(value)), 0);

/**
 * Second-order (P-Delta) elastic analysis: an outer load-stepping loop around
 * repeated calls to the existing `analyzeProject`, each rebuilding every frame
 * member's local stiffness as elastic + geometric(N) — the geometric term
 * uses the axial force the *previous* iteration converged to, so the loop is a
 * fixed-point ("successive approximation") iteration on N, not a from-scratch
 * solver. This reuses every existing piece of the linear machinery (KKT
 * constraints, equilibration, factorization, refinement, reliability
 * classification) unchanged; only the per-member local stiffness changes.
 *
 * Load-stepping is adaptive, not fixed: every attempt first tries to reach
 * the full combination (`lambda = 1`) in one step, and only subdivides when
 * that fails to converge — so a well-behaved model still does one load step.
 */
export const analyzeProjectPDelta = (
  project: ProjectModel,
  combination?: LoadCombination | null,
  configOverride?: Partial<PDeltaConfig>,
): AnalysisResult => {
  const config: PDeltaConfig = { ...resolvePDeltaConfig(project), ...configOverride };
  const frameMemberIds = project.members.filter((member) => member.type === 'frame').map((member) => member.id);

  const firstOrder = analyzeProject(project, combination);
  if (!firstOrder.success) {
    return {
      ...firstOrder,
      pDelta: {
        enabled: true, converged: false, loadStepsUsed: 0, totalIterations: 0,
        initialResidual: Number.NaN, finalResidual: Number.NaN, finalDisplacementIncrement: Number.NaN,
        convergenceReason: '',
        failureReason: 'El análisis de primer orden ya no es válido para este modelo; corrígelo antes de aplicar P-Delta.',
        history: [], memberAxialForces: {},
      },
    };
  }
  const firstOrderMeasure = globalDisplacementMeasure(firstOrder.displacements);

  let lambdaAchieved = 0;
  let stepSize = 1;
  let axialForces = new Map<string, number>(frameMemberIds.map((id) => [id, 0]));
  let lastConverged: StepOutcome | null = null;
  const history: PDeltaStepIteration[] = [];
  let totalIterations = 0;
  let loadStepsUsed = 0;
  let attempts = 0;

  while (lambdaAchieved < 1 - 1e-9) {
    if (attempts >= config.maxLoadSteps) {
      return buildFailureResult(firstOrder, config, history, totalIterations, loadStepsUsed,
        `Se alcanzó el máximo de ${config.maxLoadSteps} pasos de carga sin llegar a la combinación completa (fracción alcanzada: ${(lambdaAchieved * 100).toFixed(1)}%).`);
    }
    attempts += 1;
    const target = Math.min(1, lambdaAchieved + stepSize);
    const outcome = solveLoadStep(project, combination, target, loadStepsUsed + 1, axialForces, frameMemberIds, config, firstOrder.displacements);
    history.push(...outcome.history);
    totalIterations += outcome.iterations;
    if (outcome.converged) {
      lambdaAchieved = target;
      axialForces = outcome.axialForces;
      lastConverged = outcome;
      loadStepsUsed += 1;
      stepSize = 1 - lambdaAchieved || 1;
      continue;
    }
    stepSize *= config.stepReductionFactor;
    if (stepSize < config.minimumStep) {
      return buildFailureResult(firstOrder, config, history, totalIterations, loadStepsUsed, outcome.reason, outcome.analysisResult);
    }
  }

  if (!lastConverged) {
    // lambdaAchieved reached 1 without a successful step only when the total
    // load was already ~0; fall back to the (already successful) first-order run.
    lastConverged = { converged: true, analysisResult: firstOrder, axialForces, iterations: 0, history: [], reason: 'Sin carga axial: el resultado coincide con el de primer orden.' };
  }

  const finalResult = lastConverged.analysisResult;
  const finalMeasure = globalDisplacementMeasure(finalResult.displacements);
  const amplificationFactor = firstOrderMeasure > 1e-9 ? finalMeasure / firstOrderMeasure : undefined;
  const lastIteration = history.at(-1);
  const stabilityWarning = finalResult.conditionEstimate > 1e10
    ? `El sistema equilibrado tiene una condición κ₁ de ${finalResult.conditionEstimate.toExponential(2)} en el estado convergido: la estructura está cerca de una carga crítica de pandeo.`
    : undefined;

  const memberAxialForces: Record<string, number> = {};
  axialForces.forEach((value, id) => { memberAxialForces[id] = value; });

  const pDelta: PDeltaDiagnostics = {
    enabled: true,
    converged: true,
    loadStepsUsed,
    totalIterations,
    initialResidual: history[0]?.residual ?? 0,
    finalResidual: lastIteration?.residual ?? 0,
    finalDisplacementIncrement: lastIteration?.displacementIncrement ?? 0,
    convergenceReason: lastConverged.reason,
    stabilityWarning,
    amplificationFactor,
    history,
    memberAxialForces,
  };

  const issues = stabilityWarning
    ? [{ id: 'pdelta-near-critical', severity: 'warning' as const, title: 'Proximidad a la carga crítica', message: stabilityWarning }, ...finalResult.issues]
    : finalResult.issues;

  return { ...finalResult, issues, pDelta };
};

const buildFailureResult = (
  firstOrder: AnalysisResult,
  config: PDeltaConfig,
  history: PDeltaStepIteration[],
  totalIterations: number,
  loadStepsUsed: number,
  failureReason: string,
  lastAttempt?: AnalysisResult,
): AnalysisResult => {
  const lastIteration = history.at(-1);
  const pDelta: PDeltaDiagnostics = {
    enabled: true,
    converged: false,
    loadStepsUsed,
    totalIterations,
    initialResidual: history[0]?.residual ?? Number.NaN,
    finalResidual: lastIteration?.residual ?? Number.NaN,
    finalDisplacementIncrement: lastIteration?.displacementIncrement ?? Number.NaN,
    convergenceReason: '',
    failureReason,
    history,
    memberAxialForces: {},
  };
  return abortedAnalysis([
    ...firstOrder.issues,
    {
      id: 'pdelta-not-converged',
      severity: 'error',
      title: 'El análisis P-Delta no convergió',
      message: failureReason,
      suggestedFix: `Aumenta el número máximo de pasos/iteraciones en la configuración P-Delta, reduce la carga, o revisa si la estructura está cerca de una carga crítica de pandeo (paso mínimo configurado: ${(config.minimumStep * 100).toFixed(2)}% de la carga total).`,
    },
  ], { pDelta, mechanism: lastAttempt?.mechanism });
};

/** Dispatches to the mode the project is configured for; every other caller keeps calling `analyzeProject` directly. */
export const analyzeProjectAuto = (project: ProjectModel, combination?: LoadCombination | null): AnalysisResult =>
  project.settings.analysisMode === 'p-delta' ? analyzeProjectPDelta(project, combination) : analyzeProject(project, combination);
