/**
 * Utilización elástica estimada (η) por barra.
 *
 * Es una lectura de presentación construida **sobre** la salida del solver, no
 * una verificación normativa: toma los extremos N y M que ya resolvió el motor,
 * los combina con la tensión de Navier σ = |N|/A + |M|/W y los compara contra un
 * límite elástico de referencia. Nada de esto entra al solver ni al modelo.
 *
 * Tres decisiones sostienen la estimación, y las tres se declaran al usuario:
 *
 *  · **W elástico.** Si `sectionId` identifica explícitamente un perfil del
 *    catálogo, se usa su `sectionModulusX` real. Si no, se supone la sección
 *    rectangular equivalente (h = √(12·I/A)) y W = I/(h/2).
 *  · **Límite elástico.** Si `materialId` identifica explícitamente un material
 *    del catálogo, se toma su `yieldStrength`. Sin identidad fiable
 *    se cae a 250 MPa (acero A36) y `estimatedYield` queda en `true`.
 *  · **Combinación.** N y M se suman en valor absoluto — la envolvente más
 *    conservadora, porque los extremos pueden no ocurrir en la misma sección.
 *
 * Todas las magnitudes viajan en las unidades base internas (kN, m ⇒ kN/m²).
 */
import { findStandardMaterial } from '../../data/standardMaterials';
import { findStandardSection } from '../../data/standardSections';
import type { AnalysisResult, MemberModel, MemberResult, ProjectModel } from '../../types';

/** Acero A36 en unidades base internas (kN/m²). Sólo se usa si el material no se reconoce. */
export const FALLBACK_YIELD_STRENGTH = 250_000;

export type DemandTone = 'safe' | 'warning' | 'overstressed';

/**
 * Los dos únicos cortes del sistema, y son cerrados por abajo:
 *
 *   η < 0,85            → `safe`
 *   0,85 ≤ η < 1,00     → `warning`
 *   η ≥ 1,00            → `overstressed`
 *
 * Que sean `>=` no es un detalle: con `>` estricto, η = 1,00 exacto —el caso
 * que más se mira— caía en `warning` en los paneles mientras la rampa de color
 * del mapa de calor, que sí usaba `>=`, lo pintaba de crítico. La misma barra
 * decía dos cosas distintas según dónde se la mirara. Ahora hay un solo
 * clasificador, `demandTone`, y todo lo demás —color del lienzo, medidores,
 * narrativa, sello del corte— se deriva de él.
 */
export const DEMAND_WARNING_RATIO = 0.85;
export const DEMAND_YIELD_RATIO = 1;

export interface MemberElasticDemand {
  memberId: string;
  /** kN, valor absoluto máximo de la envolvente axial de la barra. */
  maxAxial: number;
  /** kN·m, valor absoluto máximo de la envolvente de momento. */
  maxMoment: number;
  /** kN/m² */
  sigmaAxial: number;
  sigmaBending: number;
  sigmaTotal: number;
  yieldStrength: number;
  /** η = σ_total / f_y */
  ratio: number;
  /** Fracción de σ_total aportada por el axil, en [0, 1]. */
  axialShare: number;
  /** Nombre del perfil comercial reconocido, o `null` si W se dedujo de A e I. */
  sectionName: string | null;
  /** `true` cuando f_y viene del valor de reserva y no de un material del catálogo. */
  estimatedYield: boolean;
}

export interface StructuralDemandSummary {
  /** Ordenadas de mayor a menor η. */
  demands: MemberElasticDemand[];
  critical: MemberElasticDemand;
  maxRatio: number;
  /** `true` si alguna barra tuvo que recurrir al límite elástico de reserva. */
  anyEstimatedYield: boolean;
}

const matchingSection = (member: MemberModel) =>
  member.sectionOrigin === 'catalog' && member.sectionId
    ? findStandardSection(member.sectionId) ?? null
    : null;

/** Módulo elástico W (m³) y el perfil que lo respalda, si lo hay. */
export const memberSectionModulus = (member: MemberModel): { modulus: number; sectionName: string | null } => {
  const section = matchingSection(member);
  if (section && section.sectionModulusX > 0) return { modulus: section.sectionModulusX, sectionName: section.name };
  const area = member.A > 0 ? member.A : 0;
  const inertia = member.I > 0 ? member.I : 0;
  if (area <= 0 || inertia <= 0) return { modulus: 0, sectionName: null };
  const depth = Math.sqrt((12 * inertia) / area);
  return { modulus: depth > 0 ? inertia / (depth / 2) : 0, sectionName: null };
};

/** Límite elástico de referencia (kN/m²) para el miembro, y si hubo que estimarlo. */
export const memberYieldStrength = (member: MemberModel): { yieldStrength: number; estimated: boolean } => {
  const material = member.materialOrigin === 'catalog' && member.materialId
    ? findStandardMaterial(member.materialId)
    : undefined;
  return material && material.yieldStrength > 0
    ? { yieldStrength: material.yieldStrength, estimated: false }
    : { yieldStrength: FALLBACK_YIELD_STRENGTH, estimated: true };
};

/** `null` para barras rígidas o sin sección utilizable: no hay tensión que estimar. */
export const memberElasticDemand = (member: MemberModel, result: MemberResult): MemberElasticDemand | null => {
  if (member.type === 'rigid' || member.A <= 0) return null;
  const { modulus, sectionName } = memberSectionModulus(member);
  const { yieldStrength, estimated } = memberYieldStrength(member);

  const maxAxial = Math.max(Math.abs(result.maxAxial ?? 0), Math.abs(result.minAxial ?? 0));
  const maxMoment = Math.max(Math.abs(result.maxMoment ?? 0), Math.abs(result.minMoment ?? 0));

  const sigmaAxial = maxAxial / member.A;
  const sigmaBending = modulus > 0 ? maxMoment / modulus : 0;
  const sigmaTotal = sigmaAxial + sigmaBending;
  if (!Number.isFinite(sigmaTotal)) return null;

  return {
    memberId: member.id,
    maxAxial,
    maxMoment,
    sigmaAxial,
    sigmaBending,
    sigmaTotal,
    yieldStrength,
    ratio: yieldStrength > 0 ? sigmaTotal / yieldStrength : 0,
    axialShare: sigmaTotal > 0 ? sigmaAxial / sigmaTotal : 0,
    sectionName,
    estimatedYield: estimated,
  };
};

/** `null` cuando no hay análisis resuelto o ninguna barra admite la estimación. */
export const structuralDemandSummary = (
  project: ProjectModel,
  analysis: AnalysisResult | null,
): StructuralDemandSummary | null => {
  if (!analysis?.success || !analysis.memberResults?.length) return null;
  const members = new Map(project.members.map((member) => [member.id, member]));
  const demands: MemberElasticDemand[] = [];
  for (const result of analysis.memberResults) {
    const member = members.get(result.memberId);
    if (!member) continue;
    const demand = memberElasticDemand(member, result);
    if (demand) demands.push(demand);
  }
  if (demands.length === 0) return null;
  demands.sort((first, second) => second.ratio - first.ratio);
  const critical = demands[0];
  /* Sin `safetyFactor`. 1/η se leía como el coeficiente de seguridad de una
     norma, y esto no es una comprobación normativa: es σ de Navier contra un
     límite elástico supuesto. Lo que se publica es η y su porcentaje. */
  return {
    demands,
    critical,
    maxRatio: critical.ratio,
    anyEstimatedYield: demands.some((demand) => demand.estimatedYield),
  };
};

export const demandTone = (ratio: number): DemandTone =>
  ratio >= DEMAND_YIELD_RATIO ? 'overstressed' : ratio >= DEMAND_WARNING_RATIO ? 'warning' : 'safe';

/**
 * Color por tono. Son roles de dominio del sistema de diseño, no literales: el
 * mismo verde/ámbar/rojo que ya usan los estados, medido en ambos temas.
 */
export const demandToneColorVariable: Record<DemandTone, string> = {
  safe: 'var(--sc-color-state-success)',
  warning: 'var(--sc-color-state-warning)',
  overstressed: 'var(--sc-color-state-error)',
};

/**
 * Color del mapa de calor. Pasa por `demandTone` a propósito: la rampa anterior
 * tenía cinco escalones propios (0,3 · 0,6 · 0,85 · 1) que no se correspondían
 * con los tres estados que nombran los paneles, así que el lienzo y el texto
 * podían discrepar. Un solo clasificador, un solo mensaje.
 */
export const demandColorVariable = (ratio: number): string => demandToneColorVariable[demandTone(ratio)];

/** Mapa memoizable id → η, el formato que consume la capa de geometría. */
export const memberDemandRatios = (
  project: ProjectModel,
  analysis: AnalysisResult | null,
): Map<string, number> => {
  const summary = structuralDemandSummary(project, analysis);
  if (!summary) return new Map();
  return new Map(summary.demands.map((demand) => [demand.memberId, demand.ratio]));
};
