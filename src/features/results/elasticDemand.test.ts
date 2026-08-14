import { describe, expect, it } from 'vitest';
import { standardMaterials } from '../../data/standardMaterials';
import { standardSections } from '../../data/standardSections';
import type {
  AnalysisResult,
  MemberModel,
  MemberResult,
  ProjectModel,
  ReliabilityLevel,
  ResultReliability,
} from '../../types';
import * as elasticDemand from './elasticDemand';
import {
  ELASTIC_REFERENCE_RATIO,
  elasticDemandGate,
  elasticDemandView,
  elasticIndexBand,
  elasticIndexColor,
  memberElasticIndex,
  memberElasticIndexView,
  memberSectionModulus,
  memberYieldStrength,
  sectionElasticIndex,
} from './elasticDemand';

const ipe300 = standardSections.find((section) => section.id === 'ipe-300')!;
const a36 = standardMaterials.find((material) => material.id === 'steel-a36')!;
const a992 = standardMaterials.find((material) => material.id === 'steel-a992')!;

const identity = (values: Record<string, unknown>): Partial<MemberModel> =>
  values as unknown as Partial<MemberModel>;

/** Identidad explícita completa: es la única forma de que η se pueda publicar. */
const identified = identity({
  materialId: a36.id, materialOrigin: 'catalog',
  sectionId: ipe300.id, sectionOrigin: 'catalog',
});

const member = (overrides: Partial<MemberModel> = {}): MemberModel => ({
  id: 'B1', i: 'N1', j: 'N2', type: 'frame',
  E: a36.elasticModulus, A: ipe300.area, I: ipe300.inertiaX,
  ...identified,
  ...overrides,
});

const result = (overrides: Partial<MemberResult> = {}): MemberResult => ({
  memberId: 'B1', length: 4,
  localDisplacements: [], localEndForces: [], diagramSegments: [], diagramJumps: [],
  criticalPoints: [], diagram: [], deformation: [], deformationSegments: [], deformationCriticalPoints: [],
  maxAxial: 0, minAxial: 0, maxShear: 0, minShear: 0, maxMoment: 0, minMoment: 0,
  ...overrides,
} as MemberResult);

const reliability = (level: ReliabilityLevel): ResultReliability => ({
  completed: true,
  usable: level !== 'failed',
  level,
  checks: [],
  reasons: level === 'reliable' ? [] : [`nivel ${level}`],
});

const projectOf = (...members: MemberModel[]): ProjectModel => ({
  id: 'p', name: 'p', nodes: [], members, nodalLoads: [], memberLoads: [],
  settings: { units: 'kN-m' },
} as unknown as ProjectModel);

const analysisOf = (
  results: MemberResult[],
  level: ReliabilityLevel = 'reliable',
): AnalysisResult => ({
  success: level !== 'failed',
  memberResults: results,
  nodeResults: [],
  issues: [],
  displacements: [0],
  reliability: reliability(level),
} as unknown as AnalysisResult);

describe('elastic index — data contract', () => {
  it('never publishes a silent fallback yield strength', () => {
    // El valor de reserva de 250 MPa desaparece del módulo: no hay forma de
    // publicar η sin un material verificable por identidad explícita.
    expect(elasticDemand).not.toHaveProperty('FALLBACK_YIELD_STRENGTH');
    expect(memberYieldStrength(member(identity({ materialOrigin: 'legacy', materialId: undefined }))))
      .toBeNull();
  });

  it('takes yield strength from materialId and never from matching E floats', () => {
    expect(memberYieldStrength(member({
      E: 12_345,
      ...identity({ materialId: a992.id, materialOrigin: 'catalog' }),
    }))).toEqual({ yieldStrength: a992.yieldStrength, id: a992.id, name: a992.name });
    // Mismo E exacto que A36, pero sin identidad: no se infiere por coincidencia.
    expect(memberYieldStrength(member({
      E: a36.elasticModulus,
      ...identity({ materialOrigin: 'legacy', materialId: undefined }),
    }))).toBeNull();
  });

  it('uses the catalogue section modulus only when section identity names it', () => {
    expect(memberSectionModulus(member({
      A: 0.01, I: 3e-4,
      ...identity({ sectionId: ipe300.id, sectionOrigin: 'catalog' }),
    }))).toEqual({
      sectionModulus: ipe300.sectionModulusX,
      id: ipe300.id,
      name: ipe300.name,
    });
  });

  it('never derives W from A and I for the published index', () => {
    // La sección rectangular equivalente h = √(12·I/A) desaparece: un W inventado
    // publicaba un η que el usuario no podía auditar.
    const exactFloatsWithoutIdentity = member({
      A: ipe300.area, I: ipe300.inertiaX,
      ...identity({ sectionOrigin: 'legacy', sectionId: undefined }),
    });
    expect(memberSectionModulus(exactFloatsWithoutIdentity)).toBeNull();
    expect(memberSectionModulus(member({
      A: 0.01, I: 3e-4,
      ...identity({ sectionOrigin: 'custom', sectionId: undefined }),
    }))).toBeNull();
  });
});

describe('elastic index — per member', () => {
  it('combines the axial and bending extremes as a conservative envelope', () => {
    const index = memberElasticIndex(member(), result({
      maxAxial: 100, minAxial: -40, maxMoment: 20, minMoment: -55,
    }));
    if (index.status !== 'available') throw new Error('esperaba un índice disponible');
    expect(index.maxAxial).toBe(100);
    expect(index.maxMoment).toBe(55);
    expect(index.sigmaAxial).toBeCloseTo(100 / ipe300.area, 6);
    expect(index.sigmaBending).toBeCloseTo(55 / ipe300.sectionModulusX, 6);
    expect(index.sigmaTotal).toBeCloseTo(index.sigmaAxial + index.sigmaBending, 6);
    expect(index.ratio).toBeCloseTo(index.sigmaTotal / a36.yieldStrength, 9);
    expect(index.axialShare).toBeCloseTo(index.sigmaAxial / index.sigmaTotal, 9);
  });

  it('carries the provenance of every published input', () => {
    const index = memberElasticIndex(member(), result({ maxMoment: 30 }));
    if (index.status !== 'available') throw new Error('esperaba un índice disponible');
    expect(index.material).toEqual({ id: a36.id, name: a36.name, yieldStrength: a36.yieldStrength });
    expect(index.section).toEqual({ id: ipe300.id, name: ipe300.name, sectionModulus: ipe300.sectionModulusX });
    expect(index.area).toBe(ipe300.area);
  });

  it('reports exactly which datum is missing instead of estimating it', () => {
    const noYield = memberElasticIndex(
      member(identity({ materialOrigin: 'legacy', materialId: undefined })),
      result({ maxAxial: 100 }),
    );
    expect(noYield).toEqual({ status: 'unavailable', memberId: 'B1', gaps: ['yield-strength'] });

    const noModulus = memberElasticIndex(
      member(identity({ sectionOrigin: 'custom', sectionId: undefined })),
      result({ maxAxial: 100 }),
    );
    expect(noModulus).toEqual({ status: 'unavailable', memberId: 'B1', gaps: ['section-modulus'] });

    const nothing = memberElasticIndex(
      member(identity({
        materialOrigin: 'legacy', materialId: undefined,
        sectionOrigin: 'legacy', sectionId: undefined,
      })),
      result({ maxAxial: 100 }),
    );
    expect(nothing).toEqual({ status: 'unavailable', memberId: 'B1', gaps: ['yield-strength', 'section-modulus'] });
  });

  it('declines members with no usable section geometry', () => {
    expect(memberElasticIndex(member({ type: 'rigid' }), result()))
      .toEqual({ status: 'unavailable', memberId: 'B1', gaps: ['section-geometry'] });
    expect(memberElasticIndex(member({ A: 0 }), result()))
      .toEqual({ status: 'unavailable', memberId: 'B1', gaps: ['section-geometry'] });
  });

  it('reads a single section with the same rule as the whole member', () => {
    const atCut = sectionElasticIndex(member(), 100, -55);
    const overMember = memberElasticIndex(member(), result({ maxAxial: 100, minMoment: -55 }));
    if (atCut.status !== 'available' || overMember.status !== 'available') throw new Error('esperaba índices disponibles');
    expect(atCut.ratio).toBeCloseTo(overMember.ratio, 12);
    expect(sectionElasticIndex(member(identity({ materialOrigin: 'legacy', materialId: undefined })), 100, 0).status)
      .toBe('unavailable');
  });
});

describe('elastic index — reliability gate', () => {
  it('publishes an ordinary reading only for a reliable analysis', () => {
    expect(elasticDemandGate(analysisOf([result()], 'reliable')))
      .toEqual({ blocker: null, confidence: 'reliable' });
  });

  it('marks a limited analysis as limited and never as an ordinary result', () => {
    expect(elasticDemandGate(analysisOf([result()], 'limited')))
      .toEqual({ blocker: null, confidence: 'limited' });
  });

  it('blocks the index for unreliable and failed analyses', () => {
    expect(elasticDemandGate(analysisOf([result()], 'unreliable')).blocker).toBe('unreliable');
    expect(elasticDemandGate(analysisOf([result()], 'failed')).blocker).toBe('unreliable');
    expect(elasticDemandGate(null).blocker).toBe('no-analysis');
  });
});

describe('elastic index — structure view model', () => {
  it('publishes the governing member with its provenance when everything is verifiable', () => {
    const view = elasticDemandView(
      projectOf(member({ id: 'B1' }), member({ id: 'B2' })),
      analysisOf([
        result({ memberId: 'B1', maxMoment: 30 }),
        result({ memberId: 'B2', maxMoment: 90 }),
      ]),
    );
    if (view.status !== 'available') throw new Error('esperaba una vista disponible');
    expect(view.confidence).toBe('reliable');
    expect(view.governing.memberId).toBe('B2');
    expect(view.readings.map((reading) => reading.memberId)).toEqual(['B2', 'B1']);
    expect(view.ratios.get('B2')).toBeCloseTo(view.governing.ratio, 12);
    expect(view.gaps).toEqual([]);
  });

  it('keeps unverifiable members out of the ratios instead of fabricating them', () => {
    const view = elasticDemandView(
      projectOf(
        member({ id: 'B1' }),
        member({ id: 'B2', ...identity({ materialOrigin: 'legacy', materialId: undefined }) }),
      ),
      analysisOf([
        result({ memberId: 'B1', maxMoment: 30 }),
        result({ memberId: 'B2', maxMoment: 900 }),
      ]),
    );
    if (view.status !== 'available') throw new Error('esperaba una vista disponible');
    expect(view.governing.memberId).toBe('B1');
    expect(view.ratios.has('B2')).toBe(false);
    expect(view.gaps).toEqual([{ status: 'unavailable', memberId: 'B2', gaps: ['yield-strength'] }]);
  });

  it('reports unavailable — with what is missing — when no member can be read', () => {
    const view = elasticDemandView(
      projectOf(member({ id: 'B1', ...identity({ sectionOrigin: 'custom', sectionId: undefined }) })),
      analysisOf([result({ memberId: 'B1', maxMoment: 30 })]),
    );
    expect(view.status).toBe('unavailable');
    if (view.status !== 'unavailable') return;
    expect(view.blocker).toBe('no-evaluable-member');
    expect(view.missing).toEqual(['section-modulus']);
    expect(view.ratios.size).toBe(0);
  });

  it('never publishes η for an unreliable analysis, however complete the data is', () => {
    const view = elasticDemandView(
      projectOf(member({ id: 'B1' })),
      analysisOf([result({ memberId: 'B1', maxMoment: 30 })], 'unreliable'),
    );
    expect(view.status).toBe('unavailable');
    if (view.status !== 'unavailable') return;
    expect(view.blocker).toBe('unreliable');
    expect(view.ratios.size).toBe(0);
  });

  it('publishes a limited analysis as explicitly limited', () => {
    const view = elasticDemandView(
      projectOf(member({ id: 'B1' })),
      analysisOf([result({ memberId: 'B1', maxMoment: 30 })], 'limited'),
    );
    if (view.status !== 'available') throw new Error('esperaba una vista disponible marcada como limitada');
    expect(view.confidence).toBe('limited');
  });

  it('gives the inspector the same reading the summary publishes', () => {
    const b1 = member({ id: 'B1' });
    const b1Result = result({ memberId: 'B1', maxAxial: 40, maxMoment: 30 });
    const analysis = analysisOf([b1Result]);
    const view = elasticDemandView(projectOf(b1), analysis);
    const perMember = memberElasticIndexView(b1, b1Result, analysis);
    if (view.status !== 'available' || perMember.status !== 'available') throw new Error('esperaba lecturas disponibles');
    expect(perMember.index.ratio).toBeCloseTo(view.governing.ratio, 12);
    expect(perMember.confidence).toBe(view.confidence);
  });

  it('blocks the inspector reading on the same reliability gate as the summary', () => {
    const b1 = member({ id: 'B1' });
    const perMember = memberElasticIndexView(b1, result({ memberId: 'B1', maxMoment: 30 }), analysisOf([result()], 'unreliable'));
    expect(perMember).toEqual({ status: 'unavailable', blocker: 'unreliable', gaps: [] });
  });
});

describe('elastic index — magnitude scale', () => {
  it('has no safety semantics left in its vocabulary', () => {
    // `safe` era una declaración de seguridad estructural que esta lectura no
    // puede sostener, y 0,85 era un umbral sin derivación técnica.
    expect(elasticDemand).not.toHaveProperty('DEMAND_WARNING_RATIO');
    expect(elasticDemand).not.toHaveProperty('demandTone');
    const bands = [0, 0.2, 0.5, 0.8, 0.85, 0.99, 1, 2].map(elasticIndexBand);
    expect(bands).not.toContain('safe');
    expect(bands).not.toContain('overstressed');
  });

  it('bins magnitude in even thirds of the reference, with no cut at 0.85', () => {
    expect(elasticIndexBand(0)).toBe('low');
    expect(elasticIndexBand(1 / 3 - 1e-9)).toBe('low');
    expect(elasticIndexBand(1 / 3)).toBe('moderate');
    expect(elasticIndexBand(2 / 3 - 1e-9)).toBe('moderate');
    expect(elasticIndexBand(2 / 3)).toBe('high');
    // 0,85 y 0,84 pertenecen a la misma banda: el corte anterior ya no existe.
    expect(elasticIndexBand(0.84)).toBe(elasticIndexBand(0.85));
    expect(elasticIndexBand(ELASTIC_REFERENCE_RATIO - 1e-9)).toBe('high');
    expect(elasticIndexBand(ELASTIC_REFERENCE_RATIO)).toBe('at-reference');
    expect(elasticIndexBand(2.5)).toBe('at-reference');
  });

  it('paints the canvas as a continuous magnitude ramp, not a traffic light', () => {
    // Dos η distintas por debajo de la referencia dan dos colores distintos: el
    // lienzo comunica cuánto, no "aprobado / reprobado".
    expect(elasticIndexColor(0.2)).not.toBe(elasticIndexColor(0.6));
    expect(elasticIndexColor(0.5))
      .toBe('color-mix(in oklab, var(--sc-color-demand-peak) 50%, var(--sc-color-demand-base))');
    expect(elasticIndexColor(0)).toBe('color-mix(in oklab, var(--sc-color-demand-peak) 0%, var(--sc-color-demand-base))');
    // η ≥ 1 es el único hecho con significado propio: la estimación alcanza Fy.
    expect(elasticIndexColor(ELASTIC_REFERENCE_RATIO)).toBe('var(--sc-color-demand-reference)');
    expect(elasticIndexColor(3)).toBe('var(--sc-color-demand-reference)');
  });
});

describe('elastic index — unit invariance', () => {
  it('does not depend on the displayed unit system', () => {
    // η se calcula en unidades base internas. La vista no recibe `units`, así que
    // cambiar el sistema visible no puede moverla: se comprueba sobre el modelo.
    const metric = elasticDemandView(projectOf(member()), analysisOf([result({ maxAxial: 120, maxMoment: 45 })]));
    const imperialProject = projectOf(member());
    (imperialProject.settings as { units: string }).units = 'kip-ft';
    const imperial = elasticDemandView(imperialProject, analysisOf([result({ maxAxial: 120, maxMoment: 45 })]));
    if (metric.status !== 'available' || imperial.status !== 'available') throw new Error('esperaba vistas disponibles');
    expect(imperial.governing.ratio).toBe(metric.governing.ratio);
  });
});
