import type { LoadCombination, ProjectModel } from '../../types';
import { analyzeProject } from '../../engine/solver';
import { summarizeAnalysisResults } from '../../engine/resultSummary';

export type SensitivityParameter = 'E' | 'A' | 'I';
export type SensitivityMetric = 'maxAxial' | 'maxShear' | 'maxMoment' | 'maxDeflection';

export interface SensitivityPoint {
  label: 'baseline' | 'lower' | 'upper';
  percent: number;
  inputValue: number;
  success: boolean;
  maxAxial: number | null;
  maxShear: number | null;
  maxMoment: number | null;
  maxDeflection: number | null;
  relativeChange: Record<SensitivityMetric, number | null>;
  error?: string;
}

export interface SensitivityStudyResult {
  memberId: string;
  parameter: SensitivityParameter;
  percent: number;
  baseline: SensitivityPoint;
  lower: SensitivityPoint;
  upper: SensitivityPoint;
}

const METRICS: readonly SensitivityMetric[] = ['maxAxial', 'maxShear', 'maxMoment', 'maxDeflection'];

const emptyChanges = (): Record<SensitivityMetric, number | null> => ({ maxAxial: null, maxShear: null, maxMoment: null, maxDeflection: null });

const pointFor = (
  project: ProjectModel,
  combination: LoadCombination | null | undefined,
  memberId: string,
  inputValue: number,
  label: SensitivityPoint['label'],
  percent: number,
): SensitivityPoint => {
  const result = analyzeProject(project, combination ?? null, { includeEducationTrace: false });
  if (!result.success) {
    return { label, percent, inputValue, success: false, maxAxial: null, maxShear: null, maxMoment: null, maxDeflection: null, relativeChange: emptyChanges(), error: result.issues[0]?.message ?? 'El análisis no produjo resultados.' };
  }
  const summary = summarizeAnalysisResults(result);
  const member = summary.members.find((candidate) => candidate.memberId === memberId);
  const maxAxial = member?.diagrams.axial.absolute.value ?? summary.diagrams.axial?.absolute.value ?? null;
  const maxShear = member?.diagrams.shear.absolute.value ?? summary.diagrams.shear?.absolute.value ?? null;
  const maxMoment = member?.diagrams.moment.absolute.value ?? summary.diagrams.moment?.absolute.value ?? null;
  const maxDeflection = member?.deformations.v?.absolute.value === undefined ? null : Math.abs(member.deformations.v.absolute.value);
  return { label, percent, inputValue, success: true, maxAxial, maxShear, maxMoment, maxDeflection, relativeChange: emptyChanges() };
};

const valueOf = (member: ProjectModel['members'][number], parameter: SensitivityParameter): number => member[parameter];

const withChanges = (point: SensitivityPoint, baseline: SensitivityPoint): SensitivityPoint => ({
  ...point,
  relativeChange: Object.fromEntries(METRICS.map((metric) => {
    const current = point[metric];
    const base = baseline[metric];
    const denominator = base === null ? 0 : Math.abs(base);
    return [metric, current === null || base === null || denominator <= 1e-15 ? null : (Math.abs(current) - denominator) / denominator * 100];
  })) as Record<SensitivityMetric, number | null>,
});

/** Runs three ephemeral solves against cloned projects; the source is untouched. */
export const runSensitivityStudy = (
  project: ProjectModel,
  combination: LoadCombination | null | undefined,
  memberId: string,
  parameter: SensitivityParameter,
  percent = 10,
): SensitivityStudyResult => {
  if (!Number.isFinite(percent) || percent <= 0 || percent >= 100) throw new Error('El porcentaje debe estar entre 0 y 100.');
  const member = project.members.find((candidate) => candidate.id === memberId);
  if (!member) throw new Error(`No existe el miembro ${memberId}.`);
  const input = valueOf(member, parameter);
  if (!Number.isFinite(input) || input <= 0) throw new Error(`La ${parameter === 'I' ? 'inercia I' : `propiedad ${parameter}`} del miembro ${memberId} debe ser mayor que cero.`);

  const make = (factor: number, label: SensitivityPoint['label'], pointPercent: number) => {
    const draft = structuredClone(project);
    const draftMember = draft.members.find((candidate) => candidate.id === memberId);
    if (!draftMember) throw new Error(`No existe el miembro ${memberId}.`);
    draftMember[parameter] = input * factor;
    return pointFor(draft, combination, memberId, draftMember[parameter], label, pointPercent);
  };
  const baseline = make(1, 'baseline', 0);
  const lower = make(1 - percent / 100, 'lower', -percent);
  const upper = make(1 + percent / 100, 'upper', percent);
  return { memberId, parameter, percent, baseline, lower: withChanges(lower, baseline), upper: withChanges(upper, baseline) };
};
