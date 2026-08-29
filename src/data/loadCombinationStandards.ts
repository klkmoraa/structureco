import type { LoadCase, LoadCombination } from '../types';

export type NormativeActionRole = 'permanent' | 'variable';
export type NormativeStateLimit = 'service' | 'ultimate';

export interface NormativeCombinationRecipe {
  readonly id: string;
  readonly label: string;
  readonly stateLimit: NormativeStateLimit;
  readonly factors: Readonly<Record<NormativeActionRole, number>>;
  readonly sourceSections: readonly string[];
}

export interface LoadCombinationStandardDataset {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly revision: string;
  readonly title: string;
  readonly jurisdiction: string;
  readonly edition: string;
  readonly publicationDate: string;
  readonly reviewedAt: string;
  readonly units: 'dimensionless-factors';
  readonly source: {
    readonly title: string;
    readonly url: string;
    readonly sha256: string;
  };
  readonly scope: {
    readonly buildingGroup: 'B';
    readonly materials: 'material-agnostic';
    readonly structuralFamily: 'buildings';
    readonly permanentCaseCount: 1;
    readonly variableCaseCount: 1;
    readonly variableIntensity: 'maximum';
  };
  readonly exclusions: readonly string[];
  readonly recipes: readonly NormativeCombinationRecipe[];
}

export interface NormativeCaseMapping {
  readonly permanentCaseId: string;
  readonly variableCaseId: string;
}

export interface NormativeCombinationDraft {
  readonly kind: 'normative-combination-draft';
  readonly draftId: string;
  readonly datasetId: string;
  readonly datasetRevision: string;
  readonly recipeId: string;
  readonly name: string;
  readonly stateLimit: NormativeStateLimit;
  readonly factors: Readonly<Record<string, number>>;
  readonly requiresProfessionalReview: true;
  readonly appliedToProject: false;
  readonly safetyCertification: false;
  readonly assumptions: readonly string[];
  readonly provenance: {
    readonly title: string;
    readonly jurisdiction: string;
    readonly edition: string;
    readonly publicationDate: string;
    readonly reviewedAt: string;
    readonly sourceUrl: string;
    readonly sourceSha256: string;
    readonly sourceSections: readonly string[];
  };
}

const deepFreeze = <T>(value: T): Readonly<T> => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
};

export const NTC_CDMX_2023_GROUP_B = deepFreeze({
  schemaVersion: 1,
  id: 'ntc-cdmx-2023-criteria-actions-group-b-pv',
  revision: '2026-08-24.1',
  title: 'NTC CDMX 2023 · Criterios y Acciones · Grupo B · permanente + variable',
  jurisdiction: 'Ciudad de México',
  edition: '2023',
  publicationDate: '2023-11-06',
  reviewedAt: '2026-08-24',
  units: 'dimensionless-factors',
  source: {
    title: 'Gaceta Oficial de la Ciudad de México · Normas Técnicas Complementarias 2023',
    url: 'https://data.consejeria.cdmx.gob.mx/portal_old/uploads/gacetas/b3c4f4ff37241d0a93cc6742a8b0bf2f.pdf',
    sha256: '293f22316a59ec2ec64d1f64f0749f49ba8849ded15b289cd88cc171c55ae62a',
  },
  scope: {
    buildingGroup: 'B',
    materials: 'material-agnostic',
    structuralFamily: 'buildings',
    permanentCaseCount: 1,
    variableCaseCount: 1,
    variableIntensity: 'maximum',
  },
  exclusions: [
    'Edificaciones Grupo A.',
    'Más de una acción permanente o variable y valores instantáneos o medios.',
    'Acciones accidentales, favorables, de viento, sismo, granizo, inundación o cimentación.',
    'Selección de intensidades, clasificación de la edificación y verificación de resistencia.',
    'Aplicación automática al proyecto o certificación de seguridad normativa.',
  ],
  recipes: [
    {
      id: 'ultimate-permanent-variable',
      label: 'Grupo B · falla · permanente + variable máxima',
      stateLimit: 'ultimate',
      factors: { permanent: 1.3, variable: 1.5 },
      sourceSections: ['2.3.1(a)', '3.4.1(a)'],
    },
    {
      id: 'service-permanent-variable',
      label: 'Servicio · permanente + variable máxima',
      stateLimit: 'service',
      factors: { permanent: 1, variable: 1 },
      sourceSections: ['2.3.1(a)', '3.3.2', '3.4.1(d)'],
    },
  ],
} satisfies LoadCombinationStandardDataset) as Readonly<LoadCombinationStandardDataset>;

const caseFor = (loadCases: readonly LoadCase[], id: string, role: NormativeActionRole): LoadCase => {
  const loadCase = loadCases.find((candidate) => candidate.id === id);
  if (!loadCase) throw new Error(`El caso ${id} no existe en el proyecto.`);
  if (loadCase.category !== role) {
    const expected = role === 'permanent' ? 'permanente' : 'variable';
    throw new Error(`El caso ${id} debe estar categorizado como ${expected}.`);
  }
  return loadCase;
};

export const generateNormativeCombinationDrafts = (
  dataset: LoadCombinationStandardDataset,
  loadCases: readonly LoadCase[],
  mapping: NormativeCaseMapping,
): readonly NormativeCombinationDraft[] => {
  if (mapping.permanentCaseId === mapping.variableCaseId) {
    throw new Error('Los casos permanente y variable deben ser distintos.');
  }
  const permanent = caseFor(loadCases, mapping.permanentCaseId, 'permanent');
  const variable = caseFor(loadCases, mapping.variableCaseId, 'variable');

  const drafts = dataset.recipes.map((recipe): NormativeCombinationDraft => deepFreeze({
    kind: 'normative-combination-draft',
    draftId: `${dataset.id}/${dataset.revision}/${recipe.id}/${permanent.id}/${variable.id}`,
    datasetId: dataset.id,
    datasetRevision: dataset.revision,
    recipeId: recipe.id,
    name: `${dataset.edition} · ${recipe.label}`,
    stateLimit: recipe.stateLimit,
    factors: {
      [permanent.id]: recipe.factors.permanent,
      [variable.id]: recipe.factors.variable,
    },
    requiresProfessionalReview: true,
    appliedToProject: false,
    safetyCertification: false,
    assumptions: [
      `El caso ${permanent.id} representa una única acción permanente desfavorable.`,
      `El caso ${variable.id} representa una única acción variable con intensidad máxima.`,
      'La clasificación Grupo B y la aplicabilidad de la norma deben revisarse antes de usar el borrador.',
    ],
    provenance: {
      title: dataset.source.title,
      jurisdiction: dataset.jurisdiction,
      edition: dataset.edition,
      publicationDate: dataset.publicationDate,
      reviewedAt: dataset.reviewedAt,
      sourceUrl: dataset.source.url,
      sourceSha256: dataset.source.sha256,
      sourceSections: [...recipe.sourceSections],
    },
  }));

  return deepFreeze(drafts) as readonly NormativeCombinationDraft[];
};

export const evaluateNormativeDraft = (
  draft: NormativeCombinationDraft,
  caseEffects: Readonly<Record<string, number>>,
): number => Object.entries(draft.factors).reduce((total, [caseId, factor]) => {
  const effect = caseEffects[caseId];
  if (!Number.isFinite(effect)) throw new Error(`El efecto del caso ${caseId} debe ser finito.`);
  return total + factor * effect;
}, 0);

/**
 * Converts an inspectable standards draft into the project's existing, editable
 * combination shape.  The draft itself remains immutable; provenance travels
 * with the user-created combination so its origin stays visible after saving.
 */
export const createProjectCombinationFromNormativeDraft = (
  draft: NormativeCombinationDraft,
  existing: readonly LoadCombination[],
): LoadCombination => {
  let index = 1;
  while (existing.some((combination) => combination.id === `COMB${index}`)) index += 1;

  return {
    id: `COMB${index}`,
    name: draft.name,
    factors: { ...draft.factors },
    source: `${draft.provenance.title} · secciones ${draft.provenance.sourceSections.join(', ')} · SHA-256: ${draft.provenance.sourceSha256}`,
    sourceUrl: draft.provenance.sourceUrl,
    jurisdiction: draft.provenance.jurisdiction,
    edition: draft.provenance.edition,
    stateLimit: draft.stateLimit,
    reviewedAt: draft.provenance.reviewedAt,
  };
};
