import { analysisSignature } from '../../engine/projectSignature';
import type { AnalysisResult, ProjectModel } from '../../types';

export type RevisionAnalysisState = 'fresh' | 'stale' | 'missing';
export type RevisionChangeDomain = 'input' | 'state' | 'result';
export type RevisionChangeCategory = 'geometry' | 'properties' | 'loads' | 'configuration' | 'analysis-state' | 'results';
export type RevisionChangeType = 'added' | 'removed' | 'modified';
export type ResultComparability = 'comparable' | 'qualified' | 'blocked';
export type RevisionComparisonWarningCode =
  | 'display-units-changed'
  | 'identity-churn-unmatched'
  | 'different-project-identity-unverified'
  | 'base-analysis-missing'
  | 'target-analysis-missing'
  | 'base-analysis-stale'
  | 'target-analysis-stale'
  | 'base-analysis-unusable'
  | 'target-analysis-unusable'
  | 'analysis-scenario-mismatch'
  | 'analysis-scenario-definition-changed'
  | 'limited-reliability'
  | 'correlation-not-causality';

export interface RevisionAnalysisBinding {
  result: AnalysisResult;
  projectSignature: string;
  resultDigest: string;
  scenarioId: string;
}

export interface RevisionSnapshot {
  schemaVersion: 1;
  kind: 'structureco-revision-snapshot';
  revisionId: string;
  capturedAt: string;
  project: ProjectModel;
  analysis: RevisionAnalysisBinding | null;
}

export interface RevisionChange {
  changeId: string;
  domain: RevisionChangeDomain;
  category: RevisionChangeCategory;
  entityKind: string;
  entityId: string;
  changeType: RevisionChangeType;
  field: string;
  before: unknown;
  after: unknown;
  beforePath: string | null;
  afterPath: string | null;
  unit?: string;
  delta?: number;
  percentDelta?: number | null;
}

export interface RevisionComparisonWarning {
  code: RevisionComparisonWarningCode;
  severity: 'info' | 'warning';
}

export interface RevisionChangeSummary {
  added: number;
  removed: number;
  modified: number;
  total: number;
}

export interface RevisionComparison {
  schemaVersion: 1;
  kind: 'structureco-revision-comparison';
  baseRevisionId: string;
  targetRevisionId: string;
  baseAnalysisState: RevisionAnalysisState;
  targetAnalysisState: RevisionAnalysisState;
  resultComparability: ResultComparability;
  warnings: readonly RevisionComparisonWarning[];
  changes: readonly RevisionChange[];
  summary: {
    input: RevisionChangeSummary;
    state: RevisionChangeSummary;
    result: RevisionChangeSummary;
    total: number;
  };
}

const domainOrder: Record<RevisionChangeDomain, number> = { input: 0, state: 1, result: 2 };
const categoryOrder: Record<RevisionChangeCategory, number> = {
  geometry: 0,
  properties: 1,
  loads: 2,
  configuration: 3,
  'analysis-state': 4,
  results: 5,
};

const lexical = (left: string, right: string): number => left < right ? -1 : left > right ? 1 : 0;

const canonicalize = (value: unknown): unknown => {
  if (value === undefined) return null;
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => lexical(left, right))
    .map(([key, item]) => [key, canonicalize(item)]));
};

const stableStringify = (value: unknown): string => JSON.stringify(canonicalize(value));
const sameValue = (left: unknown, right: unknown): boolean => stableStringify(left) === stableStringify(right);
const copyValue = (value: unknown): unknown => canonicalize(value);

const sha256 = async (value: unknown): Promise<string> => {
  if (!globalThis.crypto?.subtle) throw new Error('Web Crypto no está disponible para identificar la revisión.');
  const bytes = new TextEncoder().encode(stableStringify(value));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((item) => item.toString(16).padStart(2, '0')).join('');
};

export const resolveRevisionScenarioId = (project: ProjectModel, selectedScenarioId: string): string => (
  selectedScenarioId
  || project.loadCases.find((loadCase) => loadCase.active)?.id
  || project.loadCases[0]?.id
  || ''
);

export const captureRevisionSnapshot = async (
  project: ProjectModel,
  analysis: AnalysisResult | null,
  scenarioId: string,
  capturedAt = new Date().toISOString(),
): Promise<RevisionSnapshot> => {
  const projectClone = structuredClone(project);
  const analysisClone = analysis ? structuredClone(analysis) : null;
  return {
    schemaVersion: 1,
    kind: 'structureco-revision-snapshot',
    revisionId: `sha256:${await sha256(projectClone)}`,
    capturedAt,
    project: projectClone,
    analysis: analysisClone ? {
      result: analysisClone,
      projectSignature: analysisSignature(projectClone),
      resultDigest: `sha256:${await sha256(analysisClone)}`,
      scenarioId: resolveRevisionScenarioId(projectClone, scenarioId),
    } : null,
  };
};

export const revisionAnalysisState = (snapshot: RevisionSnapshot): RevisionAnalysisState => {
  if (!snapshot.analysis) return 'missing';
  return snapshot.analysis.projectSignature === analysisSignature(snapshot.project) ? 'fresh' : 'stale';
};

const makeChange = (change: Omit<RevisionChange, 'changeId'>): RevisionChange => ({
  ...change,
  changeId: [change.domain, change.category, change.entityKind, change.entityId, change.changeType, change.field].join(':'),
});

const entityPath = (collection: string, id: string, field?: string): string => (
  `project.${collection}[${id}]${field ? `.${field}` : ''}`
);

interface EntityDiffConfig {
  collection: string;
  entityKind: string;
  addedRemovedCategory: RevisionChangeCategory;
  fields: readonly string[];
  categoryForField?: (field: string) => RevisionChangeCategory;
}

const diffEntities = <T extends { id: string }>(
  baseItems: readonly T[],
  targetItems: readonly T[],
  config: EntityDiffConfig,
): RevisionChange[] => {
  const changes: RevisionChange[] = [];
  const base = new Map(baseItems.map((item) => [item.id, item]));
  const target = new Map(targetItems.map((item) => [item.id, item]));
  const ids = [...new Set([...base.keys(), ...target.keys()])].sort(lexical);
  for (const id of ids) {
    const before = base.get(id);
    const after = target.get(id);
    if (!before) {
      changes.push(makeChange({
        domain: 'input', category: config.addedRemovedCategory, entityKind: config.entityKind, entityId: id,
        changeType: 'added', field: '*', before: null, after: copyValue(after),
        beforePath: null, afterPath: entityPath(config.collection, id),
      }));
      continue;
    }
    if (!after) {
      changes.push(makeChange({
        domain: 'input', category: config.addedRemovedCategory, entityKind: config.entityKind, entityId: id,
        changeType: 'removed', field: '*', before: copyValue(before), after: null,
        beforePath: entityPath(config.collection, id), afterPath: null,
      }));
      continue;
    }
    for (const field of config.fields) {
      const beforeValue = (before as Record<string, unknown>)[field];
      const afterValue = (after as Record<string, unknown>)[field];
      if (sameValue(beforeValue, afterValue)) continue;
      changes.push(makeChange({
        domain: 'input', category: config.categoryForField?.(field) ?? config.addedRemovedCategory,
        entityKind: config.entityKind, entityId: id, changeType: 'modified', field,
        before: copyValue(beforeValue), after: copyValue(afterValue),
        beforePath: entityPath(config.collection, id, field), afterPath: entityPath(config.collection, id, field),
      }));
    }
  }
  return changes;
};

const NODE_FIELDS = ['x', 'y', 'support', 'internalHinge'] as const;
const MEMBER_GEOMETRY_FIELDS = new Set(['i', 'j', 'type', 'releases', 'rotationalSpringI', 'rotationalSpringJ', 'rigidOffsetI', 'rigidOffsetJ']);
const MEMBER_FIELDS = [
  ...MEMBER_GEOMETRY_FIELDS,
  'E', 'A', 'I', 'beamTheory', 'G', 'shearArea', 'density',
  'materialId', 'materialOrigin', 'sectionId', 'sectionOrigin', 'label',
] as const;
const LOAD_CASE_FIELDS = ['name', 'category', 'active', 'selfWeightFactor'] as const;
const COMBINATION_FIELDS = ['name', 'factors', 'source', 'sourceUrl', 'jurisdiction', 'edition', 'stateLimit', 'reviewedAt'] as const;
const NODAL_LOAD_FIELDS = ['nodeId', 'caseId', 'fx', 'fy', 'mz'] as const;
const PRESCRIBED_FIELDS = ['nodeId', 'caseId', 'component', 'value'] as const;
const MEMBER_LOAD_FIELDS = [
  'memberId', 'caseId', 'type', 'coordinateSystem', 'lengthBasis', 'start', 'end',
  'qxStart', 'qxEnd', 'qyStart', 'qyEnd', 'px', 'py', 'moment', 'position',
] as const;
const INITIAL_EFFECT_FIELDS = ['memberId', 'caseId', 'type', 'alpha', 'deltaT', 'gradient', 'axialStrain', 'curvature'] as const;

const diffConfiguration = (base: ProjectModel, target: ProjectModel): RevisionChange[] => {
  const changes: RevisionChange[] = [];
  const compare = (entityKind: string, entityId: string, field: string, before: unknown, after: unknown, path: string) => {
    if (sameValue(before, after)) return;
    changes.push(makeChange({
      domain: 'input', category: 'configuration', entityKind, entityId, changeType: 'modified', field,
      before: copyValue(before), after: copyValue(after), beforePath: path, afterPath: path,
    }));
  };
  compare('project', 'project', 'id', base.id, target.id, 'project.id');
  compare('project', 'project', 'name', base.name, target.name, 'project.name');
  compare('project', 'project', 'schemaVersion', base.schemaVersion, target.schemaVersion, 'project.schemaVersion');
  compare('project', 'project', 'educationalCase', base.educationalCase, target.educationalCase, 'project.educationalCase');
  const settingFields = [...new Set([...Object.keys(base.settings), ...Object.keys(target.settings)])].sort(lexical);
  for (const field of settingFields) {
    compare('settings', 'project', field, (base.settings as unknown as Record<string, unknown>)[field], (target.settings as unknown as Record<string, unknown>)[field], `project.settings.${field}`);
  }
  return changes;
};

const inputChanges = (base: ProjectModel, target: ProjectModel): RevisionChange[] => [
  ...diffEntities(base.nodes, target.nodes, {
    collection: 'nodes', entityKind: 'node', addedRemovedCategory: 'geometry', fields: NODE_FIELDS,
  }),
  ...diffEntities(base.members, target.members, {
    collection: 'members', entityKind: 'member', addedRemovedCategory: 'geometry', fields: MEMBER_FIELDS,
    categoryForField: (field) => MEMBER_GEOMETRY_FIELDS.has(field) ? 'geometry' : 'properties',
  }),
  ...diffEntities(base.loadCases, target.loadCases, {
    collection: 'loadCases', entityKind: 'loadCase', addedRemovedCategory: 'loads', fields: LOAD_CASE_FIELDS,
  }),
  ...diffEntities(base.combinations, target.combinations, {
    collection: 'combinations', entityKind: 'combination', addedRemovedCategory: 'loads', fields: COMBINATION_FIELDS,
  }),
  ...diffEntities(base.nodalLoads, target.nodalLoads, {
    collection: 'nodalLoads', entityKind: 'nodalLoad', addedRemovedCategory: 'loads', fields: NODAL_LOAD_FIELDS,
  }),
  ...diffEntities(base.prescribedDisplacements ?? [], target.prescribedDisplacements ?? [], {
    collection: 'prescribedDisplacements', entityKind: 'prescribedDisplacement', addedRemovedCategory: 'loads', fields: PRESCRIBED_FIELDS,
  }),
  ...diffEntities(base.memberLoads, target.memberLoads, {
    collection: 'memberLoads', entityKind: 'memberLoad', addedRemovedCategory: 'loads', fields: MEMBER_LOAD_FIELDS,
  }),
  ...diffEntities(base.memberInitialEffects ?? [], target.memberInitialEffects ?? [], {
    collection: 'memberInitialEffects', entityKind: 'memberInitialEffect', addedRemovedCategory: 'loads', fields: INITIAL_EFFECT_FIELDS,
  }),
  ...diffConfiguration(base, target),
];

const RESULT_TOLERANCE = 1e-9;
const materiallyDifferent = (before: unknown, after: unknown): boolean => {
  if (typeof before !== 'number' || typeof after !== 'number') return !sameValue(before, after);
  if (!Number.isFinite(before) || !Number.isFinite(after)) return !Object.is(before, after);
  return Math.abs(after - before) > Math.max(1e-12, Math.max(Math.abs(before), Math.abs(after)) * RESULT_TOLERANCE);
};

const resultChange = (
  entityKind: string,
  entityId: string,
  field: string,
  before: unknown,
  after: unknown,
  unit: string | undefined,
  beforePath: string | null,
  afterPath: string | null,
  changeType: RevisionChangeType = 'modified',
): RevisionChange => {
  const numeric = typeof before === 'number' && typeof after === 'number';
  const delta = numeric ? after - before : undefined;
  const percentDelta = numeric ? (Math.abs(before) <= 1e-15 ? null : (delta! / Math.abs(before)) * 100) : undefined;
  return makeChange({
    domain: 'result', category: 'results', entityKind, entityId, changeType, field,
    before: copyValue(before), after: copyValue(after), beforePath, afterPath, unit,
    ...(numeric ? { delta, percentDelta } : {}),
  });
};

const NODE_RESULT_FIELDS: ReadonlyArray<[string, string]> = [
  ['ux', 'm'], ['uy', 'm'], ['rz', 'rad'], ['rx', 'kN'], ['ry', 'kN'], ['rm', 'kN·m'],
];
const MEMBER_RESULT_FIELDS: ReadonlyArray<[string, string]> = [
  ['length', 'm'], ['maxAxial', 'kN'], ['minAxial', 'kN'], ['maxShear', 'kN'], ['minShear', 'kN'], ['maxMoment', 'kN·m'], ['minMoment', 'kN·m'],
];

const diffResultEntities = (
  baseItems: readonly Record<string, unknown>[],
  targetItems: readonly Record<string, unknown>[],
  idField: string,
  entityKind: string,
  collection: string,
  fields: ReadonlyArray<readonly [string, string]>,
): RevisionChange[] => {
  const changes: RevisionChange[] = [];
  const base = new Map(baseItems.map((item) => [String(item[idField]), item]));
  const target = new Map(targetItems.map((item) => [String(item[idField]), item]));
  const ids = [...new Set([...base.keys(), ...target.keys()])].sort(lexical);
  for (const id of ids) {
    const before = base.get(id);
    const after = target.get(id);
    if (!before) {
      changes.push(resultChange(entityKind, id, '*', null, after, undefined, null, `analysis.${collection}[${id}]`, 'added'));
      continue;
    }
    if (!after) {
      changes.push(resultChange(entityKind, id, '*', before, null, undefined, `analysis.${collection}[${id}]`, null, 'removed'));
      continue;
    }
    for (const [field, unit] of fields) {
      if (!materiallyDifferent(before[field], after[field])) continue;
      const path = `analysis.${collection}[${id}].${field}`;
      changes.push(resultChange(entityKind, id, field, before[field], after[field], unit, path, path));
    }
  }
  return changes;
};

const diffResults = (base: AnalysisResult, target: AnalysisResult): RevisionChange[] => {
  const changes = [
    ...diffResultEntities(
      base.nodeResults as unknown as readonly Record<string, unknown>[],
      target.nodeResults as unknown as readonly Record<string, unknown>[],
      'nodeId', 'nodeResult', 'nodeResults', NODE_RESULT_FIELDS,
    ),
    ...diffResultEntities(
      base.memberResults as unknown as readonly Record<string, unknown>[],
      target.memberResults as unknown as readonly Record<string, unknown>[],
      'memberId', 'memberResult', 'memberResults', MEMBER_RESULT_FIELDS,
    ),
  ];
  const globalFields: ReadonlyArray<readonly [string, unknown, unknown, string | undefined]> = [
    ['success', base.success, target.success, undefined],
    ['residualNorm', base.residualNorm, target.residualNorm, 'kN'],
    ['conditionEstimate', base.conditionEstimate, target.conditionEstimate, undefined],
    ['reliability.level', base.reliability?.level ?? null, target.reliability?.level ?? null, undefined],
    ['pDelta.converged', base.pDelta?.converged ?? null, target.pDelta?.converged ?? null, undefined],
    ['pDelta.amplificationFactor', base.pDelta?.amplificationFactor ?? null, target.pDelta?.amplificationFactor ?? null, undefined],
    ['pDelta.criticalLoadFactor', base.pDelta?.criticalLoadFactor ?? null, target.pDelta?.criticalLoadFactor ?? null, undefined],
  ];
  for (const [field, before, after, unit] of globalFields) {
    if (!materiallyDifferent(before, after)) continue;
    const path = `analysis.${field}`;
    changes.push(resultChange('analysisResult', 'global', field, before, after, unit, path, path));
  }
  return changes;
};

const scenarioDefinition = (snapshot: RevisionSnapshot): unknown => {
  const id = snapshot.analysis?.scenarioId ?? '';
  return snapshot.project.combinations.find((item) => item.id === id)
    ?? snapshot.project.loadCases.find((item) => item.id === id)
    ?? null;
};

const analysisUsable = (snapshot: RevisionSnapshot): boolean => {
  const result = snapshot.analysis?.result;
  if (!result?.success) return false;
  const level = result.reliability?.level;
  return result.reliability?.usable !== false && level !== 'failed' && level !== 'unreliable';
};

const summaryOf = (changes: readonly RevisionChange[], domain: RevisionChangeDomain): RevisionChangeSummary => {
  const items = changes.filter((change) => change.domain === domain);
  const added = items.filter((change) => change.changeType === 'added').length;
  const removed = items.filter((change) => change.changeType === 'removed').length;
  const modified = items.filter((change) => change.changeType === 'modified').length;
  return { added, removed, modified, total: items.length };
};

const sortChanges = (left: RevisionChange, right: RevisionChange): number => (
  domainOrder[left.domain] - domainOrder[right.domain]
  || categoryOrder[left.category] - categoryOrder[right.category]
  || lexical(left.entityKind, right.entityKind)
  || lexical(left.entityId, right.entityId)
  || lexical(left.field, right.field)
  || lexical(left.changeType, right.changeType)
);

export const buildRevisionComparison = (base: RevisionSnapshot, target: RevisionSnapshot): RevisionComparison => {
  const changes = inputChanges(base.project, target.project);
  const warnings: RevisionComparisonWarning[] = [];
  const warningCodes = new Set<RevisionComparisonWarningCode>();
  const warn = (code: RevisionComparisonWarningCode, severity: RevisionComparisonWarning['severity'] = 'warning') => {
    if (warningCodes.has(code)) return;
    warningCodes.add(code);
    warnings.push({ code, severity });
  };

  if (base.project.settings.units !== target.project.settings.units) warn('display-units-changed', 'info');
  const addedAndRemovedKind = new Map<string, Set<RevisionChangeType>>();
  for (const change of changes.filter((item) => item.field === '*' && item.domain === 'input')) {
    const types = addedAndRemovedKind.get(change.entityKind) ?? new Set<RevisionChangeType>();
    types.add(change.changeType);
    addedAndRemovedKind.set(change.entityKind, types);
  }
  if ([...addedAndRemovedKind.values()].some((types) => types.has('added') && types.has('removed'))) warn('identity-churn-unmatched');

  const baseState = revisionAnalysisState(base);
  const targetState = revisionAnalysisState(target);
  if (baseState !== targetState) changes.push(makeChange({
    domain: 'state', category: 'analysis-state', entityKind: 'analysis', entityId: 'binding',
    changeType: 'modified', field: 'state', before: baseState, after: targetState,
    beforePath: 'snapshot.analysis', afterPath: 'snapshot.analysis',
  }));

  let resultComparability: ResultComparability = 'blocked';
  if (baseState === 'missing') warn('base-analysis-missing');
  if (targetState === 'missing') warn('target-analysis-missing');
  if (baseState === 'stale') warn('base-analysis-stale');
  if (targetState === 'stale') warn('target-analysis-stale');
  if (base.project.id !== target.project.id) warn('different-project-identity-unverified');

  const bindingSafe = baseState === 'fresh' && targetState === 'fresh';
  if (bindingSafe && !analysisUsable(base)) warn('base-analysis-unusable');
  if (bindingSafe && !analysisUsable(target)) warn('target-analysis-unusable');
  const usable = bindingSafe && analysisUsable(base) && analysisUsable(target);
  const sameProject = base.project.id === target.project.id;
  const sameScenario = base.analysis?.scenarioId === target.analysis?.scenarioId;
  if (usable && sameProject && !sameScenario) warn('analysis-scenario-mismatch');

  if (usable && sameProject && sameScenario && base.analysis && target.analysis) {
    resultComparability = 'comparable';
    if (!sameValue(scenarioDefinition(base), scenarioDefinition(target))) {
      resultComparability = 'qualified';
      warn('analysis-scenario-definition-changed');
    }
    if (base.analysis.result.reliability?.level === 'limited' || target.analysis.result.reliability?.level === 'limited') {
      resultComparability = 'qualified';
      warn('limited-reliability');
    }
    changes.push(...diffResults(base.analysis.result, target.analysis.result));
    warn('correlation-not-causality', 'info');
  }

  changes.sort(sortChanges);
  const input = summaryOf(changes, 'input');
  const state = summaryOf(changes, 'state');
  const result = summaryOf(changes, 'result');
  return {
    schemaVersion: 1,
    kind: 'structureco-revision-comparison',
    baseRevisionId: base.revisionId,
    targetRevisionId: target.revisionId,
    baseAnalysisState: baseState,
    targetAnalysisState: targetState,
    resultComparability,
    warnings,
    changes,
    summary: { input, state, result, total: changes.length },
  };
};
