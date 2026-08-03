import type {
  AnalysisResult,
  LoadCombination,
  PDeltaConfig,
  PDeltaDiagnostics,
  PDeltaStepIteration,
  ProjectModel,
} from '../types';
import { abortedAnalysis } from './analysisFailure';
import { classifyAnalysisReliability } from './reliability';
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

/** Hard caps: a configuration past these cannot finish in interactive time, and
 *  an unbounded one (`Infinity`) would spin the iteration loop forever. */
const CONFIG_LIMITS = { maxLoadSteps: 200, maxIterationsPerStep: 500 } as const;

/**
 * Ceiling on the solved system's own algebraic residual for a converged
 * P-Delta state. Deliberately the same 1e-7 the first-order solver already
 * treats as its `residual` warning threshold, so the two orders of analysis
 * are held to one standard rather than two.
 */
const EQUILIBRIUM_RESIDUAL_LIMIT = 1e-7;

/**
 * Warn from this estimated critical load factor down. 1/0.8 = 1.25 means the
 * applied load has reached 80 % of the estimated elastic critical load, where
 * a one-element-per-member model already carries ~1 % discretisation error on
 * the deflection and the amplification starts running away.
 */
const CRITICAL_FACTOR_WARNING = 1.25;

/**
 * Validates the configuration inside the engine, not only at the UI inputs:
 * `analyzeProjectPDelta` is reachable from the worker, the fallback path and
 * imported projects, none of which pass through the TopBar number fields.
 * Returns the offending descriptions, empty when the configuration is usable.
 */
export const validatePDeltaConfig = (config: PDeltaConfig): string[] => {
  const problems: string[] = [];
  const positiveInteger = (value: number, label: string, max: number) => {
    if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1 || value > max) {
      problems.push(`${label} debe ser un entero entre 1 y ${max} (valor recibido: ${value}).`);
    }
  };
  const positiveFinite = (value: number, label: string) => {
    if (!Number.isFinite(value) || value <= 0) problems.push(`${label} debe ser un número positivo y finito (valor recibido: ${value}).`);
  };
  positiveInteger(config.maxLoadSteps, 'El máximo de pasos de carga', CONFIG_LIMITS.maxLoadSteps);
  positiveInteger(config.maxIterationsPerStep, 'El máximo de iteraciones por paso', CONFIG_LIMITS.maxIterationsPerStep);
  positiveFinite(config.equilibriumTolerance, 'La tolerancia de equilibrio');
  positiveFinite(config.displacementTolerance, 'La tolerancia de desplazamiento');
  if (!Number.isFinite(config.stepReductionFactor) || config.stepReductionFactor <= 0 || config.stepReductionFactor >= 1) {
    problems.push(`El factor de reducción de paso debe cumplir 0 < factor < 1 (valor recibido: ${config.stepReductionFactor}).`);
  }
  if (!Number.isFinite(config.minimumStep) || config.minimumStep <= 0 || config.minimumStep > 1) {
    problems.push(`El paso mínimo debe cumplir 0 < paso ≤ 1 (valor recibido: ${config.minimumStep}).`);
  }
  return problems;
};

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

/**
 * Relative change between two iterates, normalised by the model's own
 * displacement scale.
 *
 * The reference must come from the model, never from a fixed constant: an
 * absolute floor expressed in base units (`Math.max(1, ‖u‖)` with metres)
 * silently degrades this from a relative criterion to an absolute one for every
 * model whose displacements are below that floor. Measured: a stiff model with
 * ‖u‖ ≈ 1e-6 m reports 2.3e-8 for a *1 % real change*, passing a 1e-6
 * tolerance — a false convergence. Bathe (Finite Element Procedures, §8.4.4)
 * normalises by the accumulated solution of the current step for exactly this
 * reason. `reference` is that step's first-order response, which is always
 * available here and always has the model's own physical scale.
 */
const relativeVectorChange = (next: readonly number[], previous: readonly number[], reference: number): number => {
  let diffSquared = 0;
  let scaleSquared = 0;
  for (let i = 0; i < next.length; i += 1) {
    const diff = next[i] - (previous[i] ?? 0);
    diffSquared += diff * diff;
    scaleSquared += next[i] * next[i];
  }
  const scale = Math.max(Math.sqrt(scaleSquared), reference);
  // A model that genuinely does not move (fully restrained, unloaded) has no
  // scale to be relative to; reporting 0 is honest, inventing a floor is not.
  if (!(scale > 0)) return 0;
  return Math.sqrt(diffSquared) / scale;
};

/** Euclidean norm, used to derive the per-step displacement reference. */
const vectorNorm = (values: readonly number[]): number =>
  Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));

/**
 * Response projected onto the first-order response direction, normalised so
 * that a purely first-order answer gives exactly 1. `undefined` when the
 * reference carries no direction (fully restrained or unloaded model).
 */
const responseProjection = (displacements: readonly number[], firstOrderDisplacements: readonly number[]): number | undefined => {
  if (firstOrderDisplacements.length !== displacements.length) return undefined;
  let dot = 0;
  let referenceScale = 0;
  for (let i = 0; i < displacements.length; i += 1) {
    dot += displacements[i] * firstOrderDisplacements[i];
    referenceScale += firstOrderDisplacements[i] * firstOrderDisplacements[i];
  }
  if (referenceScale <= 1e-18) return undefined;
  return dot / referenceScale;
};

/** The member carrying the largest axial force, and whether it is in compression. */
const governingAxialForce = (axialForces: Map<string, number>): { magnitude: number; compressive: boolean } => {
  let magnitude = 0;
  let value = 0;
  for (const force of axialForces.values()) {
    if (Math.abs(force) > magnitude) { magnitude = Math.abs(force); value = force; }
  }
  return { magnitude, compressive: value < 0 };
};

/**
 * True when a converged state cannot be a stable equilibrium.
 *
 * A plain sign test on the whole displacement vector is not sufficient, and
 * this was measured: for a compressed cantilever at 3·Pcr the tip sway is
 * genuinely *reversed* (−6.6e-3 m against a first-order +1.3e-2 m), yet the
 * whole-vector dot product stays POSITIVE because the column's axial
 * shortening — a large DOF that takes no part in the buckling mode — swamps
 * the reversed bending DOF. The engine happily returned that state as a
 * success.
 *
 * The projection onto the first-order direction is the discriminating
 * quantity. Under a governing compression the geometric stiffness can only
 * soften, so the projection is ≥ 1 below the first critical load (measured:
 * 1.11 at 0.1·Pcr, 1.96 at 0.5, 8.62 at 0.9, 51.5 at 0.99) and drops below 1 —
 * through a pole — once it is passed (−362 at 1.01·Pcr, then 0.28 at 3·Pcr,
 * 0.69 at 5·Pcr). Under governing tension a projection below 1 is the correct
 * physical answer (0.68 at 0.5·Pcr tension), so the test only applies when
 * compression governs.
 */
const isPostCriticalState = (
  displacements: readonly number[],
  firstOrderDisplacements: readonly number[],
  axialForces: Map<string, number>,
): boolean => {
  const projection = responseProjection(displacements, firstOrderDisplacements);
  if (projection === undefined) return false;
  if (projection <= 0) return true;
  return governingAxialForce(axialForces).compressive && projection < 1 - 1e-6;
};

/**
 * Largest relative change in member axial force, normalised by the largest
 * axial force actually present. Same reasoning as `relativeVectorChange`: the
 * previous `Math.max(1, …)` floor was one kilonewton of absolute slack, which
 * is a different criterion for a footbridge tie than for a transfer column.
 */
const relativeAxialChange = (next: Map<string, number>, previous: Map<string, number>): number => {
  let maxDiff = 0;
  let maxScale = 0;
  for (const [id, value] of next) {
    const before = previous.get(id) ?? 0;
    maxDiff = Math.max(maxDiff, Math.abs(value - before));
    maxScale = Math.max(maxScale, Math.abs(value));
  }
  // No axial force anywhere means the geometric stiffness is identically zero:
  // there is nothing left to iterate on, so the criterion is trivially met.
  if (!(maxScale > 0)) return 0;
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
): StepOutcome => {
  const scaled = scaleCombination(project, combination, lambda);
  // The direction reference is this *step's own* first-order response, not a
  // single lambda=1 baseline: an absolute `support.prescribed` settlement
  // does not scale with lambda, so the first-order direction at a partial
  // load level is not simply a shrunk copy of the full-combination one.
  const stepFirstOrder = analyzeProject(project, scaled);
  const firstOrderDisplacements = stepFirstOrder.success ? stepFirstOrder.displacements : [];
  // Physical scale this step's convergence is measured against; see
  // `relativeVectorChange`.
  const displacementReference = vectorNorm(firstOrderDisplacements);
  let axialForces = new Map(startingAxialForces);
  let previousDisplacements: number[] | null = null;
  let previousIncrement = Number.POSITIVE_INFINITY;
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
    const nextAxialForces = extractAxialForces(result, frameMemberIds);
    if (isPostCriticalState(result.displacements, firstOrderDisplacements, nextAxialForces)) {
      return {
        converged: false, analysisResult: result, axialForces, iterations: iteration, history,
        reason: 'La respuesta dejó de amplificarse respecto al primer orden bajo compresión gobernante: la estructura superó una carga crítica de pandeo y la solución encontrada no es un equilibrio estable.',
      };
    }
    const axialChange = relativeAxialChange(nextAxialForces, axialForces);
    const displacementIncrement = previousDisplacements
      ? relativeVectorChange(result.displacements, previousDisplacements, displacementReference)
      : Number.POSITIVE_INFINITY;
    // Independent of both increment measures: the solved system's own
    // algebraic residual ‖K U + Cᵀλ − F‖ normalised by the acting forces.
    // Two increment criteria alone can agree while both are wrong (Bathe
    // §8.4.4 recommends never converging on a solution-increment norm alone),
    // so this is required as well.
    const equilibriumResidual = result.residualNorm;
    history.push({ step, iteration, lambda, residual: axialChange, displacementIncrement, equilibriumResidual, conditionEstimate: result.conditionEstimate });

    const converged = iteration > 1
      && axialChange <= config.equilibriumTolerance
      && displacementIncrement <= config.displacementTolerance
      && Number.isFinite(equilibriumResidual)
      && equilibriumResidual <= EQUILIBRIUM_RESIDUAL_LIMIT;
    if (converged) {
      return { converged: true, analysisResult: result, axialForces: nextAxialForces, iterations: iteration, history, reason: 'Se cumplieron las tolerancias de cambio axial y de incremento de desplazamiento, con el residuo de equilibrio dentro de su límite.' };
    }
    // Growth instead of shrinkage between successive iterations is the
    // signature of a fixed-point iteration diverging (e.g. near/above the
    // critical load) — fail fast instead of burning the full iteration budget.
    if (iteration > 2 && displacementIncrement > previousIncrement * 1.5 && displacementIncrement > config.displacementTolerance) {
      return {
        converged: false, analysisResult: result, axialForces: nextAxialForces, iterations: iteration, history,
        reason: 'El incremento de desplazamiento crece entre iteraciones en vez de reducirse: la iteración diverge, posiblemente cerca de la carga crítica.',
      };
    }
    previousDisplacements = result.displacements;
    previousIncrement = displacementIncrement;
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
 * Estimated elastic critical load factor for the *current load pattern*.
 *
 * The converged axial forces are scaled by a trial factor `s` and the tangent
 * `Ke + Kg(s·N)` re-solved; the smallest `s` at which the response stops
 * pointing with the applied load is the load multiple at which that tangent
 * stops being positive definite along the loading direction — i.e. `λ_cr`, the
 * quantity design codes express as `1/(1 − 1/λ_cr)` sway amplification.
 *
 * This is a computed bracket, not a full eigenvalue extraction: it finds the
 * critical point *visible to this load pattern* (a buckling mode orthogonal to
 * the loading would not be detected), and it inherits the model's
 * discretisation error — one element per member over-predicts a member's own
 * critical load by ~0.75 %, so `λ_cr` is optimistic by about the same margin.
 * Both limits are stated wherever the value is surfaced.
 *
 * Cost is bounded to `BISECTION_STEPS + 1` extra linear solves.
 */
const BISECTION_STEPS = 12;
const MAX_CRITICAL_FACTOR = 64;
const MIN_CRITICAL_FACTOR = 1 / 64;

const estimateCriticalLoadFactor = (
  project: ProjectModel,
  scaled: LoadCombination,
  axialForces: Map<string, number>,
  firstOrderDisplacements: readonly number[],
): number | undefined => {
  // Only a governing compression can produce a critical point through the
  // geometric stiffness; a tension-governed model has no buckling load to
  // quote and must not be given a fabricated one.
  if (!axialForces.size || !governingAxialForce(axialForces).compressive) return undefined;
  const scaledBy = (factor: number) => {
    const scaledForces = new Map<string, number>();
    axialForces.forEach((value, id) => scaledForces.set(id, value * factor));
    return scaledForces;
  };
  const stableAt = (factor: number): boolean => {
    const trial = analyzeProject(project, scaled, { pDeltaAxialForces: scaledBy(factor) });
    if (!trial.success) return false;
    return !isPostCriticalState(trial.displacements, firstOrderDisplacements, scaledBy(factor));
  };

  // Bracket the first critical point on whichever side of the current state it
  // lies: a load already past critical needs the search to go *down*, which a
  // one-sided upward scan would miss entirely.
  let low: number;
  let high: number;
  if (stableAt(1)) {
    let bracket = 0;
    for (let factor = 2; factor <= MAX_CRITICAL_FACTOR; factor *= 2) {
      if (!stableAt(factor)) { bracket = factor; break; }
    }
    // Stable everywhere in range: far from critical, no finite factor to quote.
    if (!bracket) return undefined;
    low = bracket === 2 ? 1 : bracket / 2;
    high = bracket;
  } else {
    let bracket = 0;
    for (let factor = 0.5; factor >= MIN_CRITICAL_FACTOR; factor /= 2) {
      if (stableAt(factor)) { bracket = factor; break; }
    }
    // Unstable even at the smallest probe: the model is far past critical and
    // the factor cannot be resolved, but it is certainly below the range.
    if (!bracket) return MIN_CRITICAL_FACTOR;
    low = bracket;
    high = bracket * 2;
  }

  for (let step = 0; step < BISECTION_STEPS; step += 1) {
    const middle = (low + high) / 2;
    if (stableAt(middle)) low = middle; else high = middle;
  }
  return (low + high) / 2;
};

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
  // Validated before any solving: an unbounded `maxIterationsPerStep` would
  // spin the inner loop forever, and a non-finite tolerance can never be met,
  // so both must be rejected with a message rather than hang the worker.
  const configProblems = validatePDeltaConfig(config);
  if (configProblems.length) {
    return abortedAnalysis([{
      id: 'pdelta-invalid-config',
      severity: 'error',
      title: 'Configuración P-Delta inválida',
      message: configProblems.join(' '),
      suggestedFix: 'Corrige los valores en la configuración avanzada P-Delta, o bórralos para volver a los valores por defecto.',
    }], {
      pDelta: {
        enabled: true, converged: false, loadStepsUsed: 0, totalIterations: 0,
        initialResidual: Number.NaN, finalResidual: Number.NaN, finalDisplacementIncrement: Number.NaN,
        finalAxialChange: Number.NaN, finalEquilibriumResidual: Number.NaN,
        convergenceReason: '', failureReason: configProblems.join(' '),
        history: [], memberAxialForces: {},
      },
    });
  }
  const frameMemberIds = project.members.filter((member) => member.type === 'frame').map((member) => member.id);

  const firstOrder = analyzeProject(project, combination);
  if (!firstOrder.success) {
    return {
      ...firstOrder,
      pDelta: {
        enabled: true, converged: false, loadStepsUsed: 0, totalIterations: 0,
        initialResidual: Number.NaN, finalResidual: Number.NaN, finalDisplacementIncrement: Number.NaN,
        finalAxialChange: Number.NaN, finalEquilibriumResidual: Number.NaN,
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
    const outcome = solveLoadStep(project, combination, target, loadStepsUsed + 1, axialForces, frameMemberIds, config);
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
  // The condition-number ratio previously used here was measured failing in
  // both directions — it misses 0.90·Pcr (ratio 9.7) and 0.95·Pcr (19.3, under
  // its own threshold of 20), and it is *blind* above the critical load, where
  // the ratio falls back below 1 (0.43 at 3·Pcr) because κ recovers on the far
  // side of the singularity. A computed load factor is monotone, scale-free
  // and directly comparable across models, so the warning is derived from it.
  const criticalLoadFactor = estimateCriticalLoadFactor(
    project,
    scaleCombination(project, combination, 1),
    axialForces,
    firstOrder.displacements,
  );
  const stabilityWarning = criticalLoadFactor !== undefined && criticalLoadFactor <= CRITICAL_FACTOR_WARNING
    ? `Factor de carga crítica elástica estimado ≈ ${criticalLoadFactor.toFixed(2)} para este patrón de cargas: la carga aplicada está al ${(100 / criticalLoadFactor).toFixed(0)} % de la crítica estimada. Es una estimación por bisección sobre la fuerza axial, no un análisis de valores propios, y con un elemento por miembro sobrestima la crítica alrededor de un 0.75 %; subdivide los miembros comprimidos para acotarla mejor.`
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
    finalAxialChange: lastIteration?.residual ?? 0,
    finalEquilibriumResidual: lastIteration?.equilibriumResidual ?? finalResult.residualNorm,
    criticalLoadFactor,
    convergenceReason: lastConverged.reason,
    stabilityWarning,
    amplificationFactor,
    history,
    memberAxialForces,
  };

  const issues = stabilityWarning
    ? [{ id: 'pdelta-near-critical', severity: 'warning' as const, title: 'Proximidad a la carga crítica', message: stabilityWarning }, ...finalResult.issues]
    : finalResult.issues;

  // `finalResult.reliability` was stamped by `analyzeProject` before `pDelta`
  // existed on the object, so it still judges this run by first-order
  // equilibrium bookkeeping — recompute now that `result.pDelta.enabled` is
  // visible to `classifyAnalysisReliability`, or every real P-Delta result
  // reads as "unreliable" for the exact P·Δ moment it was asked to capture.
  const withPDelta: AnalysisResult = { ...finalResult, issues, pDelta };
  return { ...withPDelta, reliability: classifyAnalysisReliability(withPDelta) };
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
    finalAxialChange: lastIteration?.residual ?? Number.NaN,
    finalEquilibriumResidual: lastIteration?.equilibriumResidual ?? Number.NaN,
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
