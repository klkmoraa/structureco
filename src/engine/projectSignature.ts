import type { ProjectModel } from '../types';

const cache = new WeakMap<ProjectModel, string>();

/**
 * Identity of everything `analyzeProject` reads.
 *
 * The store hands out a fresh, deep-cloned `ProjectModel` for any change, so
 * object identity cannot tell a new node apart from a new unit system. Anything
 * that only affects presentation — units, language, diagram scale, layers — is
 * deliberately absent here, so changing it never discards results that are
 * still exact. `settings.calculationMode`, `settings.analysisMode` and
 * `settings.pDeltaConfig` *are* included because `analyzeProjectAuto` branches
 * and iterates on them.
 *
 * Memoised per project object: the callers share one computation per change.
 */
export const analysisSignature = (project: ProjectModel): string => {
  const cached = cache.get(project);
  if (cached !== undefined) return cached;
  const signature = JSON.stringify([
    project.nodes,
    project.members,
    project.loadCases,
    project.combinations,
    project.nodalLoads,
    project.prescribedDisplacements ?? null,
    project.memberLoads,
    project.memberInitialEffects ?? null,
    project.nodeLinks ?? null,
    project.multiPointConstraints ?? null,
    project.nodalMasses ?? null,
    project.generatedLoadSources ?? null,
    project.movingLoadCases ?? null,
    project.settings.calculationMode ?? null,
    project.settings.analysisMode ?? null,
    project.settings.pDeltaConfig ?? null,
  ]);
  cache.set(project, signature);
  return signature;
};

/**
 * The model signature deliberately excludes the persisted project id because
 * it is also used to compare equivalent model inputs. A live analysis needs
 * that identity as a separate binding so a result cannot cross project
 * boundaries, even when two projects happen to contain identical inputs.
 *
 * The worker treats an empty or unknown combination id as the active load
 * cases. Resolve the id the same way here so the binding describes what was
 * actually analyzed, not only what a stale UI control happened to contain.
 */
export interface AnalysisBinding {
  projectId: string;
  analysisSignature: string;
  combinationId: string;
}

export const resolveAnalysisCombinationId = (project: ProjectModel, selectedCombinationId: string): string => (
  selectedCombinationId && project.combinations.some((combination) => combination.id === selectedCombinationId)
    ? selectedCombinationId
    : ''
);

export const analysisBinding = (project: ProjectModel, selectedCombinationId: string): AnalysisBinding => ({
  projectId: project.id,
  analysisSignature: analysisSignature(project),
  combinationId: resolveAnalysisCombinationId(project, selectedCombinationId),
});

export const matchesAnalysisBinding = (
  project: ProjectModel,
  selectedCombinationId: string,
  binding: AnalysisBinding,
): boolean => {
  const current = analysisBinding(project, selectedCombinationId);
  return current.projectId === binding.projectId
    && current.analysisSignature === binding.analysisSignature
    && current.combinationId === binding.combinationId;
};
