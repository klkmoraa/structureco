import type { AnalysisResult, DiagramQuantity, DiagramSegment, LoadCombination, ProjectModel } from '../types';
import { evaluatePolynomial, rootsInInterval } from './diagram';
import { analyzeProject } from './solver';

export interface AnalysisScenario {
  id: string;
  name: string;
  result: AnalysisResult;
}

export interface EnvelopeBranch {
  scenarioId: string;
  scenarioName: string;
  coefficients: [number, number, number, number];
}

export interface EnvelopeSegment {
  x0: number;
  x1: number;
  minimum: EnvelopeBranch;
  maximum: EnvelopeBranch;
}

export interface DiagramEnvelope {
  memberId: string;
  quantity: DiagramQuantity;
  segments: EnvelopeSegment[];
  minimum: { x: number; value: number; scenarioId: string; scenarioName: string };
  maximum: { x: number; value: number; scenarioId: string; scenarioName: string };
}

const coefficientsOf = (segment: DiagramSegment, quantity: DiagramQuantity): [number, number, number, number] => {
  const source = segment[quantity];
  return [source[0], source[1], source[2], source[3] ?? 0];
};

const shiftPolynomial = (coefficients: readonly number[], distance: number): [number, number, number, number] => {
  const [c0 = 0, c1 = 0, c2 = 0, c3 = 0] = coefficients;
  return [
    c0 + c1 * distance + c2 * distance ** 2 + c3 * distance ** 3,
    c1 + 2 * c2 * distance + 3 * c3 * distance ** 2,
    c2 + 3 * c3 * distance,
    c3,
  ];
};

const uniqueSorted = (values: number[], tolerance: number) => values.sort((a, b) => a - b).filter((value, index, all) => index === 0 || Math.abs(value - all[index - 1]) > tolerance);

export const analyzeProjectScenarios = (project: ProjectModel): AnalysisScenario[] => {
  const cases = project.loadCases.map((loadCase) => ({
    id: `case:${loadCase.id}`,
    name: loadCase.name,
    combination: { id: `case:${loadCase.id}`, name: loadCase.name, factors: { [loadCase.id]: 1 } } satisfies LoadCombination,
  }));
  const combinations = project.combinations.map((combination) => ({ id: `combination:${combination.id}`, name: combination.name, combination }));
  return [...cases, ...combinations]
    .map((scenario) => ({ ...scenario, result: analyzeProject(project, scenario.combination) }))
    .filter((scenario): scenario is AnalysisScenario & { combination: LoadCombination } => scenario.result.success)
    .map(({ combination: _combination, ...scenario }) => scenario);
};

export const buildDiagramEnvelope = (
  scenarios: AnalysisScenario[],
  memberId: string,
  quantity: DiagramQuantity,
): DiagramEnvelope | null => {
  const source = scenarios.flatMap((scenario) => {
    const member = scenario.result.memberResults.find((result) => result.memberId === memberId);
    return member ? [{ scenario, member }] : [];
  });
  if (!source.length) return null;
  const length = source[0].member.length;
  const tolerance = Math.max(1, length) * 1e-10;
  const breakpoints = uniqueSorted(source.flatMap(({ member }) => member.diagramSegments.flatMap((segment) => [segment.x0, segment.x1])), tolerance);
  const output: EnvelopeSegment[] = [];

  for (let interval = 0; interval < breakpoints.length - 1; interval += 1) {
    const x0 = breakpoints[interval];
    const x1 = breakpoints[interval + 1];
    const h = x1 - x0;
    if (h <= tolerance) continue;
    const midpoint = (x0 + x1) / 2;
    const candidates = source.flatMap(({ scenario, member }) => {
      const segment = member.diagramSegments.find((item) => midpoint >= item.x0 - tolerance && midpoint <= item.x1 + tolerance);
      return segment ? [{ scenario, coefficients: shiftPolynomial(coefficientsOf(segment, quantity), x0 - segment.x0) }] : [];
    });
    const crossings: number[] = [];
    for (let a = 0; a < candidates.length; a += 1) {
      for (let b = a + 1; b < candidates.length; b += 1) {
        const difference = candidates[a].coefficients.map((value, index) => value - candidates[b].coefficients[index]);
        crossings.push(...rootsInInterval(difference, h));
      }
    }
    const localBreaks = uniqueSorted([0, ...crossings, h], tolerance);
    for (let part = 0; part < localBreaks.length - 1; part += 1) {
      const local0 = localBreaks[part];
      const local1 = localBreaks[part + 1];
      if (local1 - local0 <= tolerance) continue;
      const probe = (local0 + local1) / 2;
      const ranked = candidates.map((candidate) => ({ candidate, value: evaluatePolynomial(candidate.coefficients, probe) })).sort((a, b) => a.value - b.value);
      const minimum = ranked[0].candidate;
      const maximum = ranked.at(-1)!.candidate;
      output.push({
        x0: x0 + local0,
        x1: x0 + local1,
        minimum: { scenarioId: minimum.scenario.id, scenarioName: minimum.scenario.name, coefficients: shiftPolynomial(minimum.coefficients, local0) },
        maximum: { scenarioId: maximum.scenario.id, scenarioName: maximum.scenario.name, coefficients: shiftPolynomial(maximum.coefficients, local0) },
      });
    }
  }

  const extrema = output.flatMap((segment) => {
    const h = segment.x1 - segment.x0;
    return (['minimum', 'maximum'] as const).flatMap((branch) => {
      const item = segment[branch];
      const derivative = item.coefficients.slice(1).map((coefficient, index) => coefficient * (index + 1));
      return [0, h, ...rootsInInterval(derivative, h)].map((x) => ({ x: segment.x0 + x, value: evaluatePolynomial(item.coefficients, x), scenarioId: item.scenarioId, scenarioName: item.scenarioName }));
    });
  });
  if (!extrema.length) return null;
  return {
    memberId,
    quantity,
    segments: output,
    minimum: extrema.reduce((best, point) => point.value < best.value ? point : best),
    maximum: extrema.reduce((best, point) => point.value > best.value ? point : best),
  };
};

export const evaluateEnvelopeAt = (envelope: DiagramEnvelope, x: number) => {
  const segment = envelope.segments.find((item) => x >= item.x0 - 1e-10 && x <= item.x1 + 1e-10) ?? envelope.segments.at(-1);
  if (!segment) return null;
  const xi = Math.max(0, Math.min(segment.x1 - segment.x0, x - segment.x0));
  return {
    x: segment.x0 + xi,
    minimum: evaluatePolynomial(segment.minimum.coefficients, xi),
    maximum: evaluatePolynomial(segment.maximum.coefficients, xi),
    minimumScenario: segment.minimum.scenarioName,
    maximumScenario: segment.maximum.scenarioName,
  };
};
