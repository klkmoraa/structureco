import type { AnalysisScenario } from '../../engine/envelope';
import { summarizeAnalysisResults } from '../../engine/resultSummary';
import type { DiagramQuantity, ReliabilityLevel } from '../../types';

export interface ScenarioNavigatorRow {
  id: string;
  name: string;
  kind: AnalysisScenario['kind'];
  status: ReliabilityLevel;
  usable: boolean;
  reason?: string;
  isCurrent: boolean;
  values: Record<DiagramQuantity, number | null>;
}

const quantities: readonly DiagramQuantity[] = ['axial', 'shear', 'moment'];

const currentScenario = (scenario: AnalysisScenario, selectedCombinationId: string | null | undefined): boolean => {
  if (!selectedCombinationId || scenario.kind !== 'combination') return false;
  const combinationId = selectedCombinationId.startsWith('combination:')
    ? selectedCombinationId.slice('combination:'.length)
    : selectedCombinationId;
  return scenario.id === `combination:${combinationId}`;
};

/** Projects every requested scenario into a compact, readable comparison row. */
export const buildScenarioNavigatorRows = (
  scenarios: readonly AnalysisScenario[],
  selectedCombinationId?: string | null,
): ScenarioNavigatorRow[] => scenarios.map((scenario) => {
  const summary = scenario.result.success ? summarizeAnalysisResults(scenario.result) : null;
  const values = Object.fromEntries(quantities.map((quantity) => [quantity, summary?.diagrams[quantity]?.absolute.value ?? null])) as Record<DiagramQuantity, number | null>;
  return {
    id: scenario.id,
    name: scenario.name,
    kind: scenario.kind,
    status: scenario.status,
    usable: scenario.usable,
    reason: scenario.failureReason,
    isCurrent: currentScenario(scenario, selectedCombinationId),
    values,
  };
});
