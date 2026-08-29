import type { ProjectModel } from '../../types';

export interface ModelOverviewData {
  readonly empty: boolean;
  readonly nodes: number;
  readonly members: number;
  readonly supports: number;
  readonly loads: number;
  readonly extent: { readonly width: number; readonly height: number } | null;
  readonly activeLoadCases: number;
  readonly totalLoadCases: number;
  readonly combinationName: string | null;
}

export const buildModelOverview = (project: ProjectModel, selectedCombinationId: string): ModelOverviewData => {
  const nodes = project.nodes;
  const xs = nodes.map((node) => node.x);
  const ys = nodes.map((node) => node.y);
  const width = nodes.length ? Math.max(...xs) - Math.min(...xs) : 0;
  const height = nodes.length ? Math.max(...ys) - Math.min(...ys) : 0;
  return {
    empty: nodes.length === 0,
    nodes: nodes.length,
    members: project.members.length,
    supports: nodes.filter((node) => node.support.type !== 'none').length,
    loads: project.nodalLoads.length + project.memberLoads.length,
    extent: width === 0 && height === 0 ? null : { width, height },
    activeLoadCases: project.loadCases.filter((loadCase) => loadCase.active).length,
    totalLoadCases: project.loadCases.length,
    combinationName: project.combinations.find((combination) => combination.id === selectedCombinationId)?.name ?? null,
  };
};
