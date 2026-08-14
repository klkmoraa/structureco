/**
 * Índice elástico estimado (η) — capa de presentación sobre la salida del solver.
 *
 * η compara una tensión normal de Navier construida con los extremos ya
 * resueltos por el motor, σ* = |N*|/A + |M*|/W, contra el límite elástico del
 * material declarado, Fy. **No es una verificación normativa**: no hay φ, Ω,
 * pandeo, LTB ni interacción P-M de código. Nada de esto entra al solver ni al
 * modelo, y ninguna de sus constantes vive fuera de este archivo.
 *
 * El contrato tiene una sola regla dura: **η sólo se publica cuando cada dato
 * que lo forma es verificable**. La versión anterior rellenaba los huecos —
 * Fy = 250 MPa cuando el material no se reconocía, W de un rectángulo
 * equivalente h = √(12·I/A) cuando la sección no era de catálogo — y el
 * resultado era un número con apariencia de medida que el usuario no podía
 * auditar. Ahora un dato ausente produce `unavailable` y el nombre exacto de lo
 * que falta; nunca un ratio fabricado.
 *
 * Tres decisiones sostienen la lectura, y las tres se declaran al usuario:
 *
 *  · **W elástico.** Sólo desde `sectionId` con `sectionOrigin === 'catalog'`.
 *    Sin esa identidad explícita no hay `sectionModulusX` auditable.
 *  · **Fy.** Sólo desde `materialId` con `materialOrigin === 'catalog'`.
 *    Coincidir en E con un material del catálogo no es identidad.
 *  · **Combinación.** N* y M* son los máximos absolutos de sus envolventes y
 *    pueden proceder de secciones distintas de la barra: se suman como
 *    **envolvente conservadora**, y así se etiqueta en toda la interfaz.
 *
 * Todas las magnitudes viajan en las unidades base internas (kN, m ⇒ kN/m²), de
 * modo que el sistema de unidades visible no puede alterar η.
 */
import { findStandardMaterial } from '../../data/standardMaterials';
import { findStandardSection } from '../../data/standardSections';
import { resolveReliability } from '../../engine/reliability';
import type { AnalysisResult, MemberModel, MemberResult, ProjectModel } from '../../types';

/**
 * η = 1 sólo dice que la estimación alcanza el Fy de referencia del material.
 * No dice «pasa» ni «falla»: eso pertenece a una comprobación por norma, que
 * este módulo no hace (ver CRI-45).
 */
export const ELASTIC_REFERENCE_RATIO = 1;

/** El dato concreto que impide publicar η en una barra. */
export type ElasticIndexGap = 'section-geometry' | 'yield-strength' | 'section-modulus';

/** Lo que impide publicar η en toda la estructura, antes de mirar barra a barra. */
export type ElasticDemandBlocker = 'no-analysis' | 'unreliable' | 'no-evaluable-member';

/**
 * `limited` no es un resultado ordinario: el análisis pasó los controles
 * mínimos pero alguno quedó fuera de su margen cómodo, así que la lectura se
 * publica marcada y nunca como una medida corriente.
 */
export type ElasticDemandConfidence = 'reliable' | 'limited';

/** Procedencia del Fy publicado: siempre un material del catálogo, por id. */
export interface ElasticYieldSource {
  id: string;
  name: string;
  /** kN/m² */
  yieldStrength: number;
}

/** Procedencia del W publicado: siempre un perfil del catálogo, por id. */
export interface ElasticSectionSource {
  id: string;
  name: string;
  /** m³ */
  sectionModulus: number;
}

export interface MemberElasticIndex {
  status: 'available';
  memberId: string;
  /** kN, máximo absoluto de la envolvente axial. */
  maxAxial: number;
  /** kN·m, máximo absoluto de la envolvente de momento. */
  maxMoment: number;
  /** m² */
  area: number;
  /** kN/m² */
  sigmaAxial: number;
  sigmaBending: number;
  sigmaTotal: number;
  /** η = σ* / Fy */
  ratio: number;
  /** Fracción de σ* aportada por el axil, en [0, 1]. */
  axialShare: number;
  material: ElasticYieldSource;
  section: ElasticSectionSource;
}

export interface MemberElasticIndexGap {
  status: 'unavailable';
  memberId: string;
  /** En orden estable: geometría, Fy, W. */
  gaps: ElasticIndexGap[];
}

export type MemberElasticIndexReading = MemberElasticIndex | MemberElasticIndexGap;

export interface ElasticDemandAvailable {
  status: 'available';
  confidence: ElasticDemandConfidence;
  /** La barra con mayor η entre las que sí pudieron leerse. */
  governing: MemberElasticIndex;
  /** Ordenadas de mayor a menor η. */
  readings: MemberElasticIndex[];
  /** Barras excluidas de la lectura, con el dato que les falta. */
  gaps: MemberElasticIndexGap[];
  /** id → η, sólo de las barras publicables. Es lo que consume el lienzo. */
  ratios: ReadonlyMap<string, number>;
}

export interface ElasticDemandUnavailable {
  status: 'unavailable';
  blocker: ElasticDemandBlocker;
  /** `null` cuando el bloqueo es anterior a poder clasificar el análisis. */
  confidence: ElasticDemandConfidence | null;
  gaps: MemberElasticIndexGap[];
  /** Unión sin repetir de los datos que faltan, en orden estable. */
  missing: ElasticIndexGap[];
  /** Siempre vacío: sin lectura publicable no se tiñe el lienzo. */
  ratios: ReadonlyMap<string, number>;
}

export type ElasticDemandView = ElasticDemandAvailable | ElasticDemandUnavailable;

/** Vista por barra, la que consume el Inspector. Misma puerta que el Resumen. */
export type MemberElasticIndexView =
  | { status: 'available'; confidence: ElasticDemandConfidence; index: MemberElasticIndex }
  | { status: 'unavailable'; blocker: ElasticDemandBlocker | null; gaps: ElasticIndexGap[] };

const EMPTY_RATIOS: ReadonlyMap<string, number> = new Map();

const GAP_ORDER: ElasticIndexGap[] = ['section-geometry', 'yield-strength', 'section-modulus'];

/**
 * Módulo elástico W (m³) con su procedencia, o `null` si la sección no es
 * identificable. No se deduce de A e I: un W inventado publica un η que el
 * usuario no puede rastrear hasta un perfil concreto.
 */
export const memberSectionModulus = (member: MemberModel): ElasticSectionSource | null => {
  if (member.sectionOrigin !== 'catalog' || !member.sectionId) return null;
  const section = findStandardSection(member.sectionId);
  if (!section || !(section.sectionModulusX > 0)) return null;
  return { id: section.id, name: section.name, sectionModulus: section.sectionModulusX };
};

/**
 * Límite elástico de referencia (kN/m²) con su procedencia, o `null` si el
 * material no es identificable. Sin valor de reserva: coincidir en E con un
 * material del catálogo no es identidad.
 */
export const memberYieldStrength = (member: MemberModel): ElasticYieldSource | null => {
  if (member.materialOrigin !== 'catalog' || !member.materialId) return null;
  const material = findStandardMaterial(member.materialId);
  if (!material || !(material.yieldStrength > 0)) return null;
  return { id: material.id, name: material.name, yieldStrength: material.yieldStrength };
};

/**
 * η en una sección concreta a partir de N y M ya resueltos allí.
 *
 * Es la misma regla que la lectura de barra completa; sólo cambian los esfuerzos
 * que entran. Que el corte del lienzo y los paneles compartan esta función es lo
 * que impide que la misma barra se lea distinto según dónde se la mire.
 */
export const sectionElasticIndex = (
  member: MemberModel,
  axial: number,
  moment: number,
): MemberElasticIndexReading => {
  const gaps: ElasticIndexGap[] = [];
  if (member.type === 'rigid' || !(member.A > 0)) {
    return { status: 'unavailable', memberId: member.id, gaps: ['section-geometry'] };
  }
  const material = memberYieldStrength(member);
  if (!material) gaps.push('yield-strength');
  const section = memberSectionModulus(member);
  if (!section) gaps.push('section-modulus');
  if (!material || !section) return { status: 'unavailable', memberId: member.id, gaps };

  const maxAxial = Math.abs(axial);
  const maxMoment = Math.abs(moment);
  const sigmaAxial = maxAxial / member.A;
  const sigmaBending = maxMoment / section.sectionModulus;
  const sigmaTotal = sigmaAxial + sigmaBending;
  if (!Number.isFinite(sigmaTotal)) {
    return { status: 'unavailable', memberId: member.id, gaps: ['section-geometry'] };
  }

  return {
    status: 'available',
    memberId: member.id,
    maxAxial,
    maxMoment,
    area: member.A,
    sigmaAxial,
    sigmaBending,
    sigmaTotal,
    ratio: sigmaTotal / material.yieldStrength,
    axialShare: sigmaTotal > 0 ? sigmaAxial / sigmaTotal : 0,
    material,
    section,
  };
};

/**
 * η de la barra completa, con la envolvente conservadora |N|max + |M|max.
 *
 * Los dos extremos pueden ocurrir en secciones distintas; sumarlos es el caso
 * más desfavorable posible y así se etiqueta en la interfaz, nunca como la
 * tensión real de un punto.
 */
export const memberElasticIndex = (
  member: MemberModel,
  result: MemberResult,
): MemberElasticIndexReading => sectionElasticIndex(
  member,
  Math.max(Math.abs(result.maxAxial ?? 0), Math.abs(result.minAxial ?? 0)),
  Math.max(Math.abs(result.maxMoment ?? 0), Math.abs(result.minMoment ?? 0)),
);

/**
 * Puerta de confiabilidad, común a todas las superficies.
 *
 * `success` no basta y nunca bastó: un análisis puede terminar y aun así tener
 * un residuo o un condicionamiento que invalida la lectura. `unreliable` y
 * `failed` bloquean η; `limited` la deja pasar marcada.
 */
export const elasticDemandGate = (
  analysis: AnalysisResult | null | undefined,
): { blocker: 'no-analysis' | 'unreliable' | null; confidence: ElasticDemandConfidence } => {
  if (!analysis || !analysis.memberResults?.length) return { blocker: 'no-analysis', confidence: 'reliable' };
  const reliability = resolveReliability(analysis);
  if (!reliability.usable || reliability.level === 'unreliable' || reliability.level === 'failed') {
    return { blocker: 'unreliable', confidence: 'limited' };
  }
  return { blocker: null, confidence: reliability.level === 'limited' ? 'limited' : 'reliable' };
};

/** Vista de una barra para el Inspector: misma puerta y mismo clasificador. */
export const memberElasticIndexView = (
  member: MemberModel,
  result: MemberResult,
  analysis: AnalysisResult | null | undefined,
): MemberElasticIndexView => {
  const gate = elasticDemandGate(analysis);
  if (gate.blocker) return { status: 'unavailable', blocker: gate.blocker, gaps: [] };
  const index = memberElasticIndex(member, result);
  return index.status === 'available'
    ? { status: 'available', confidence: gate.confidence, index }
    : { status: 'unavailable', blocker: null, gaps: index.gaps };
};

/** Vista de toda la estructura: la consumen el Resumen y el mapa del lienzo. */
export const elasticDemandView = (
  project: ProjectModel,
  analysis: AnalysisResult | null | undefined,
): ElasticDemandView => {
  const gate = elasticDemandGate(analysis);
  if (gate.blocker) {
    return {
      status: 'unavailable',
      blocker: gate.blocker,
      confidence: gate.blocker === 'unreliable' ? gate.confidence : null,
      gaps: [],
      missing: [],
      ratios: EMPTY_RATIOS,
    };
  }

  const members = new Map(project.members.map((member) => [member.id, member]));
  const readings: MemberElasticIndex[] = [];
  const gaps: MemberElasticIndexGap[] = [];
  for (const result of analysis!.memberResults) {
    const member = members.get(result.memberId);
    if (!member) continue;
    const index = memberElasticIndex(member, result);
    if (index.status === 'available') readings.push(index);
    else gaps.push(index);
  }

  if (readings.length === 0) {
    const seen = new Set(gaps.flatMap((gap) => gap.gaps));
    return {
      status: 'unavailable',
      blocker: 'no-evaluable-member',
      confidence: gate.confidence,
      gaps,
      missing: GAP_ORDER.filter((gap) => seen.has(gap)),
      ratios: EMPTY_RATIOS,
    };
  }

  readings.sort((first, second) => second.ratio - first.ratio);
  return {
    status: 'available',
    confidence: gate.confidence,
    governing: readings[0],
    readings,
    gaps,
    ratios: new Map(readings.map((reading) => [reading.memberId, reading.ratio])),
  };
};

/**
 * Bandas de **magnitud**, no de seguridad.
 *
 * Son tercios exactos de la referencia: sirven para nombrar en texto lo que el
 * color ya dice de forma continua, y para que un lector que no distingue el
 * color no dependa de él. No son umbrales de aceptación ni de aviso — el corte
 * en 0,85 que existía antes no tenía derivación técnica y desapareció. El único
 * punto con significado propio es η = 1: la estimación alcanza el Fy declarado.
 */
export type ElasticIndexBand = 'low' | 'moderate' | 'high' | 'at-reference';

export const elasticIndexBand = (ratio: number): ElasticIndexBand =>
  ratio >= ELASTIC_REFERENCE_RATIO ? 'at-reference'
    : ratio >= 2 / 3 ? 'high'
      : ratio >= 1 / 3 ? 'moderate' : 'low';

/**
 * Color del mapa de demanda: una rampa secuencial continua.
 *
 * El semáforo verde/ámbar/rojo anterior codificaba un juicio de seguridad que
 * esta lectura no puede sostener. Una rampa de una sola familia comunica
 * *cuánta* demanda hay sin decir si eso está bien, y deja un único color aparte
 * —el de la referencia— para el hecho verificable de que η alcanza Fy.
 */
export const elasticIndexColor = (ratio: number): string => {
  if (ratio >= ELASTIC_REFERENCE_RATIO) return 'var(--sc-color-demand-reference)';
  const percent = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  return `color-mix(in oklab, var(--sc-color-demand-peak) ${percent}%, var(--sc-color-demand-base))`;
};
