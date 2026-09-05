import { findStandardMaterial } from '../data/standardMaterials';
import { findStandardSection, type StandardSection } from '../data/standardSections';
import { resolveReliability } from '../engine/reliability';
import type { AnalysisResult, MemberModel, MemberResult, ProjectModel } from '../types';
import type {
  AiscCheckDetail,
  AiscCheckKind,
  AiscCheckStatus,
  AiscMemberDesignResult,
  AiscProjectDesignSummary,
  AiscVariable,
} from './aiscSteel360Types';

export const AISC_SPECIFICATION = {
  code: 'ANSI/AISC 360-16 / 360-22' as const,
  method: 'LRFD' as const,
  title: 'Specification for Structural Steel Buildings' as const,
  phiTension: 0.90,
  phiCompression: 0.90,
  phiFlexure: 0.90,
  phiShear: 0.90,
  maxSlendernessTension: 300,
  maxSlendernessCompression: 200,
} as const;

export const classifyRatioStatus = (ratio: number): AiscCheckStatus => {
  if (!Number.isFinite(ratio) || ratio < 0) return 'indeterminate';
  if (ratio > 1.0) return 'fail';
  if (ratio > 0.90) return 'warning';
  return 'pass';
};

/**
 * Evaluates Chapter D: Tension Members (gross section yielding).
 * AISC 360 Eq. D2-1: Pn = Fy * Ag, phi_t = 0.90, Pd = phi_t * Pn.
 */
export const evaluateAiscTension = (params: {
  demand: number; // Pu (tension, kN >= 0)
  Fy: number; // kN/m²
  Ag: number; // m²
  L: number; // m
  r: number; // m (governing radius of gyration)
}): AiscCheckDetail => {
  const { demand, Fy, Ag, L, r } = params;
  const phi = AISC_SPECIFICATION.phiTension;
  const nominalCapacity = Fy * Ag;
  const designCapacity = phi * nominalCapacity;
  const ratio = designCapacity > 0 ? demand / designCapacity : Number.POSITIVE_INFINITY;
  const slenderness = r > 0 ? L / r : Number.POSITIVE_INFINITY;

  const variables: AiscVariable[] = [
    { symbol: 'Pu', label: 'Demanda de tensión axial', value: demand, unit: 'kN', source: 'AnalysisResult.memberResults' },
    { symbol: 'Fy', label: 'Esfuerzo de fluencia', value: Fy, unit: 'kN/m²', source: 'Catálogo de material' },
    { symbol: 'Ag', label: 'Área bruta de la sección', value: Ag, unit: 'm²', source: 'Catálogo de sección' },
    { symbol: 'Pn', label: 'Resistencia nominal a tensión', value: nominalCapacity, unit: 'kN', source: 'AISC 360 Eq. D2-1' },
    { symbol: 'ϕt', label: 'Factor de resistencia a tensión', value: phi, unit: '1', source: 'AISC 360 Sección D2' },
    { symbol: 'ϕtPn', label: 'Resistencia de diseño a tensión', value: designCapacity, unit: 'kN', source: 'ϕt · Pn' },
    { symbol: 'L/r', label: 'Relación de esbeltez', value: slenderness, unit: '1', source: 'AISC 360 Sección D1 (≤ 300)' },
  ];

  return {
    kind: 'tension',
    title: 'Tensión axial · Fluencia en sección bruta',
    clause: 'Capítulo D · §D2 (Eq. D2-1)',
    equation: 'Pn = Fy · Ag',
    inequality: 'Pu ≤ ϕt · Pn',
    demand,
    nominalCapacity,
    phi,
    designCapacity,
    ratio,
    status: classifyRatioStatus(ratio),
    variables,
  };
};

/**
 * Evaluates Chapter E: Compression Members (flexural buckling).
 * AISC 360 Eq. E3-1 to E3-4, phi_c = 0.90, Pc = phi_c * Pn.
 */
export const evaluateAiscCompression = (params: {
  demand: number; // Pu (compression, kN >= 0)
  Fy: number; // kN/m²
  E: number; // kN/m²
  Ag: number; // m²
  L: number; // m
  K?: number; // effective length factor, defaults to 1.0
  rx: number; // m
  ry: number; // m
}): { detail: AiscCheckDetail; KLr: number } => {
  const { demand, Fy, E, Ag, L, rx, ry } = params;
  const K = params.K && params.K > 0 ? params.K : 1.0;
  const rMin = Math.min(rx, ry);
  const KLr = rMin > 0 ? (K * L) / rMin : Number.POSITIVE_INFINITY;
  const phi = AISC_SPECIFICATION.phiCompression;

  // Euler elastic buckling stress: Fe = (pi^2 * E) / (KL/r)^2
  const Fe = KLr > 0 ? (Math.PI * Math.PI * E) / (KLr * KLr) : 0;

  // Buckling threshold: 4.71 * sqrt(E / Fy)
  const lambdaC = 4.71 * Math.sqrt(E / Fy);

  let Fcr: number;
  let equationClause: string;
  if (KLr <= lambdaC && Fe > 0) {
    // Inelastic buckling: Fcr = [0.658^(Fy / Fe)] * Fy
    Fcr = Math.pow(0.658, Fy / Fe) * Fy;
    equationClause = 'E3-2 (pandeo inelástico)';
  } else {
    // Elastic buckling: Fcr = 0.877 * Fe
    Fcr = 0.877 * Fe;
    equationClause = 'E3-3 (pandeo elástico)';
  }

  const nominalCapacity = Fcr * Ag;
  const designCapacity = phi * nominalCapacity;
  const ratio = designCapacity > 0 ? demand / designCapacity : Number.POSITIVE_INFINITY;

  const variables: AiscVariable[] = [
    { symbol: 'Pu', label: 'Demanda de compresión axial', value: demand, unit: 'kN', source: 'AnalysisResult.memberResults' },
    { symbol: 'KL/r', label: 'Esbeltez gobernante', value: KLr, unit: '1', source: 'K · L / min(rx, ry)' },
    { symbol: 'Fe', label: 'Esfuerzo elástico de Euler', value: Fe, unit: 'kN/m²', source: 'AISC 360 Eq. E3-4' },
    { symbol: 'Fcr', label: 'Esfuerzo crítico de pandeo', value: Fcr, unit: 'kN/m²', source: `AISC 360 Eq. ${equationClause}` },
    { symbol: 'Pn', label: 'Resistencia nominal a compresión', value: nominalCapacity, unit: 'kN', source: 'AISC 360 Eq. E3-1' },
    { symbol: 'ϕc', label: 'Factor de resistencia a compresión', value: phi, unit: '1', source: 'AISC 360 Sección E1' },
    { symbol: 'ϕcPn', label: 'Resistencia de diseño a compresión', value: designCapacity, unit: 'kN', source: 'ϕc · Pn' },
  ];

  const detail: AiscCheckDetail = {
    kind: 'compression',
    title: 'Compresión axial · Pandeo por flexión',
    clause: `Capítulo E · §E3 (Eq. ${equationClause})`,
    equation: 'Pn = Fcr · Ag',
    inequality: 'Pu ≤ ϕc · Pn',
    demand,
    nominalCapacity,
    phi,
    designCapacity,
    ratio,
    status: classifyRatioStatus(ratio),
    variables,
  };

  return { detail, KLr };
};

/**
 * Evaluates Chapter F: Flexure (Doubly Symmetric I-Shapes bent about major axis).
 * Evaluates Yielding (Plastic Moment) & Lateral-Torsional Buckling (LTB).
 * AISC 360 Eq. F2-1 to F2-6, phi_b = 0.90, Mc = phi_b * Mn.
 */
export const evaluateAiscFlexure = (params: {
  demand: number; // Mux (kN*m >= 0)
  Fy: number; // kN/m²
  E: number; // kN/m²
  Zx: number; // m³
  Sx: number; // m³
  Iy: number; // m⁴
  Ag: number; // m²
  d: number; // m
  tw: number; // m
  tf: number; // m
  bf: number; // m
  Lb: number; // unbraced length, m
  Cb?: number; // lateral-torsional buckling modification factor, defaults to 1.0
}): AiscCheckDetail => {
  const { demand, Fy, E, Zx, Sx, Iy, d, tw, tf, bf, Lb } = params;
  const Cb = params.Cb && params.Cb > 0 ? params.Cb : 1.0;
  const phi = AISC_SPECIFICATION.phiFlexure;

  // Plastic moment: Mp = Fy * Zx
  const Mp = Fy * Zx;

  // Distance between flange centroids
  const h0 = d - tf;

  // Radius of gyration about weak axis: ry = sqrt(Iy / Ag)
  const ry = Math.sqrt(Iy / params.Ag);

  // Limiting unbraced length for yielding: Lp = 1.76 * ry * sqrt(E / Fy)
  const Lp = 1.76 * ry * Math.sqrt(E / Fy);

  // St. Venant torsional constant J approximation for I shape:
  // J ≈ (2 * bf * tf^3 + (d - 2 * tf) * tw^3) / 3
  const J = (2 * bf * Math.pow(tf, 3) + (d - 2 * tf) * Math.pow(tw, 3)) / 3;

  // Effective radius of gyration rts:
  // For doubly symmetric I-shape, Cw = Iy * h0^2 / 4, so rts^2 = (Iy * h0) / (2 * Sx)
  const rts2 = (Iy * h0) / (2 * Sx);
  const rts = Math.sqrt(Math.max(1e-12, rts2));

  // Limiting unbraced length for inelastic LTB (Eq. F2-6):
  // Lr = 1.95 * rts * (E / (0.7 * Fy)) * sqrt( (J * c)/(Sx * h0) + sqrt(( (J*c)/(Sx*h0) )^2 + 6.76 * (0.7*Fy/E)^2 ) )
  // where c = 1.0 for doubly symmetric I-shape
  const term1 = (J * 1.0) / (Sx * h0);
  const term2 = 6.76 * Math.pow((0.7 * Fy) / E, 2);
  const Lr = 1.95 * rts * (E / (0.7 * Fy)) * Math.sqrt(term1 + Math.sqrt(term1 * term1 + term2));

  let Mn: number;
  let clause: string;

  if (Lb <= Lp) {
    // Plastic yielding (no LTB reduction)
    Mn = Mp;
    clause = '§F2.1 (Eq. F2-1 fluencia Mp)';
  } else if (Lb <= Lr) {
    // Inelastic lateral-torsional buckling (Eq. F2-2)
    const reduction = (Mp - 0.7 * Fy * Sx) * ((Lb - Lp) / (Lr - Lp));
    Mn = Math.min(Mp, Cb * (Mp - reduction));
    clause = '§F2.2 (Eq. F2-2 pandeo lateral-torsional inelástico)';
  } else {
    // Elastic lateral-torsional buckling (Eq. F2-3 & F2-4)
    const slendernessLbrts = Lb / rts;
    const Fcr = ((Cb * Math.PI * Math.PI * E) / (slendernessLbrts * slendernessLbrts))
      * Math.sqrt(1 + 0.078 * ((J * 1.0) / (Sx * h0)) * slendernessLbrts * slendernessLbrts);
    Mn = Math.min(Mp, Fcr * Sx);
    clause = '§F2.2 (Eq. F2-3 pandeo lateral-torsional elástico)';
  }

  const designCapacity = phi * Mn;
  const ratio = designCapacity > 0 ? demand / designCapacity : Number.POSITIVE_INFINITY;

  const variables: AiscVariable[] = [
    { symbol: 'Mux', label: 'Momento flector mayorante requerido', value: demand, unit: 'kN·m', source: 'AnalysisResult.memberResults' },
    { symbol: 'Mp', label: 'Momento plástico nominal', value: Mp, unit: 'kN·m', source: 'Fy · Zx' },
    { symbol: 'Lp', label: 'Longitud arriostrada límite plástica', value: Lp, unit: 'm', source: 'AISC 360 Eq. F2-5' },
    { symbol: 'Lr', label: 'Longitud arriostrada límite elástica', value: Lr, unit: 'm', source: 'AISC 360 Eq. F2-6' },
    { symbol: 'Lb', label: 'Longitud no arriostrada', value: Lb, unit: 'm', source: 'Longitud del miembro' },
    { symbol: 'Mn', label: 'Momento nominal resistente', value: Mn, unit: 'kN·m', source: `AISC 360 ${clause}` },
    { symbol: 'ϕb', label: 'Factor de resistencia a flexión', value: phi, unit: '1', source: 'AISC 360 Sección F1' },
    { symbol: 'ϕbMn', label: 'Momento de diseño', value: designCapacity, unit: 'kN·m', source: 'ϕb · Mn' },
  ];

  return {
    kind: 'flexure',
    title: 'Flexión mayorante · Fluencia y pandeo lateral-torsional (LTB)',
    clause: `Capítulo F · ${clause}`,
    equation: 'Mn = Cb[Mp - (Mp - 0.7FySx)((Lb-Lp)/(Lr-Lp))] ≤ Mp',
    inequality: 'Mu ≤ ϕb · Mn',
    demand,
    nominalCapacity: Mn,
    phi,
    designCapacity,
    ratio,
    status: classifyRatioStatus(ratio),
    variables,
  };
};

/**
 * Evaluates Chapter G: Shear in Web of Hot-Rolled I-Shapes.
 * AISC 360 Eq. G2-1, Vn = 0.6 * Fy * Aw * Cv1, Vc = phi_v * Vn.
 */
export const evaluateAiscShear = (params: {
  demand: number; // Vu (kN >= 0)
  Fy: number; // kN/m²
  E: number; // kN/m²
  d: number; // depth, m
  tw: number; // web thickness, m
  tf: number; // flange thickness, m
}): AiscCheckDetail => {
  const { demand, Fy, E, d, tw, tf } = params;
  const Aw = d * tw;
  const h = d - 2 * tf;
  const webSlenderness = tw > 0 ? h / tw : 0;
  const limit = 2.24 * Math.sqrt(E / Fy);

  let phi: number;
  let Cv1: number;
  let clause: string;

  // AISC 360 Section G2.1(a) for hot-rolled I-shapes:
  if (webSlenderness <= limit) {
    phi = 1.00;
    Cv1 = 1.0;
    clause = 'Capítulo G · §G2.1(a)';
  } else {
    phi = AISC_SPECIFICATION.phiShear;
    // Section G2.1(b): unstiffened web kv = 5.34
    const kv = 5.34;
    const limitB = 1.10 * Math.sqrt((kv * E) / Fy);
    if (webSlenderness <= limitB) {
      Cv1 = 1.0;
    } else {
      Cv1 = limitB / webSlenderness;
    }
    clause = 'Capítulo G · §G2.1(b)';
  }

  const nominalCapacity = 0.6 * Fy * Aw * Cv1;
  const designCapacity = phi * nominalCapacity;
  const ratio = designCapacity > 0 ? demand / designCapacity : Number.POSITIVE_INFINITY;

  const variables: AiscVariable[] = [
    { symbol: 'Vu', label: 'Demanda de fuerza cortante', value: demand, unit: 'kN', source: 'AnalysisResult.memberResults' },
    { symbol: 'Aw', label: 'Área del alma (d · tw)', value: Aw, unit: 'm²', source: 'Geometría de la sección' },
    { symbol: 'h/tw', label: 'Esbeltez del alma', value: webSlenderness, unit: '1', source: '(d - 2·tf) / tw' },
    { symbol: 'Cv1', label: 'Coeficiente de cortante del alma', value: Cv1, unit: '1', source: 'AISC 360 Sección G2.1' },
    { symbol: 'Vn', label: 'Resistencia nominal al cortante', value: nominalCapacity, unit: 'kN', source: '0.6 · Fy · Aw · Cv1' },
    { symbol: 'ϕv', label: 'Factor de resistencia a cortante', value: phi, unit: '1', source: 'AISC 360 Sección G2.1' },
    { symbol: 'ϕvVn', label: 'Resistencia de diseño a cortante', value: designCapacity, unit: 'kN', source: 'ϕv · Vn' },
  ];

  return {
    kind: 'shear',
    title: 'Cortante en el alma',
    clause,
    equation: 'Vn = 0.6 · Fy · Aw · Cv1',
    inequality: 'Vu ≤ ϕv · Vn',
    demand,
    nominalCapacity,
    phi,
    designCapacity,
    ratio,
    status: classifyRatioStatus(ratio),
    variables,
  };
};

/**
 * Evaluates Chapter H: Combined Axial Force and Flexure.
 * AISC 360 Eq. H1-1a & H1-1b:
 * For Pu / Pc >= 0.2: Pu/Pc + 8/9 (Mux / Mcx) <= 1.0
 * For Pu / Pc < 0.2:  Pu/(2Pc) + (Mux / Mcx) <= 1.0
 */
export const evaluateAiscInteraction = (params: {
  Pu: number; // required axial strength, kN >= 0
  Pc: number; // design axial strength (phi_c Pn or phi_t Pn), kN > 0
  isTension: boolean;
  Mux: number; // required flexural strength, kN*m >= 0
  Mcx: number; // design flexural strength (phi_b Mn), kN*m > 0
}): AiscCheckDetail => {
  const { Pu, Pc, isTension, Mux, Mcx } = params;
  const axialRatio = Pc > 0 ? Pu / Pc : 0;
  const flexureRatio = Mcx > 0 ? Mux / Mcx : 0;

  let ratio: number;
  let equationStr: string;
  let clauseStr: string;

  if (axialRatio >= 0.2) {
    ratio = axialRatio + (8 / 9) * flexureRatio;
    equationStr = 'Pu/Pc + 8/9(Mux/Mcx) ≤ 1.0';
    clauseStr = 'Capítulo H · §H1.1 (Eq. H1-1a)';
  } else {
    ratio = axialRatio / 2 + flexureRatio;
    equationStr = 'Pu/(2Pc) + Mux/Mcx ≤ 1.0';
    clauseStr = 'Capítulo H · §H1.1 (Eq. H1-1b)';
  }

  const variables: AiscVariable[] = [
    { symbol: 'Pu', label: isTension ? 'Tensión axial requerida' : 'Compresión axial requerida', value: Pu, unit: 'kN', source: 'Demanda axial' },
    { symbol: 'Pc', label: isTension ? 'Resistencia de diseño a tensión (ϕtPn)' : 'Resistencia de diseño a compresión (ϕcPn)', value: Pc, unit: 'kN', source: 'Capítulo D / E' },
    { symbol: 'Pu/Pc', label: 'Relación axial', value: axialRatio, unit: '1', source: 'Pu / Pc' },
    { symbol: 'Mux', label: 'Momento flector requerido', value: Mux, unit: 'kN·m', source: 'Demanda a flexión' },
    { symbol: 'Mcx', label: 'Momento flector de diseño (ϕbMn)', value: Mcx, unit: 'kN·m', source: 'Capítulo F' },
    { symbol: 'Ratio', label: 'Índice de interacción combinada', value: ratio, unit: '1', source: equationStr },
  ];

  return {
    kind: 'interaction',
    title: isTension ? 'Interacción flexo-tensión' : 'Interacción flexo-compresión (Beam-Column)',
    clause: clauseStr,
    equation: equationStr,
    inequality: `${equationStr.replace(' ≤ 1.0', '')} = ${ratio.toFixed(3)} ≤ 1.0`,
    demand: ratio,
    nominalCapacity: 1.0,
    phi: 1.0,
    designCapacity: 1.0,
    ratio,
    status: classifyRatioStatus(ratio),
    variables,
  };
};

export interface EvaluateMemberParams {
  member: MemberModel;
  memberResult: MemberResult;
  project: ProjectModel;
}

/**
 * Pure projection that evaluates an individual steel member under ANSI/AISC 360-16 / 360-22 LRFD.
 */
export const evaluateAiscMember = (params: EvaluateMemberParams): AiscMemberDesignResult => {
  const { member, memberResult } = params;

  // Ineligibility checks: Fail-closed architecture
  if (!member.materialId || !member.sectionId) {
    return makeIneligible(member, 'Identificador de catálogo de material o sección ausente');
  }

  const material = findStandardMaterial(member.materialId);
  const section = findStandardSection(member.sectionId) as StandardSection | undefined;

  if (!material) {
    return makeIneligible(member, `Material desconocido: ${member.materialId}`);
  }
  if (material.category !== 'STEEL') {
    return makeIneligible(member, `Material no es acero estructural: ${material.category}`);
  }
  if (!section) {
    return makeIneligible(member, `Sección desconocida: ${member.sectionId}`);
  }
  if (section.standard !== 'AISC' || section.shapeType !== 'I') {
    return makeIneligible(member, `Sección no soportada por el módulo AISC I-shapes: ${section.standard} ${section.shapeType}`);
  }
  if (member.type !== 'frame' && member.type !== 'truss') {
    return makeIneligible(member, `Tipo de miembro no soportado por AISC: ${member.type}`);
  }

  // Verify property drift between member model and catalog
  const areaTolerance = Math.max(1e-9, section.area * 1e-4);
  if (Math.abs(member.A - section.area) > areaTolerance) {
    return makeIneligible(member, 'Las propiedades geométricas del miembro difieren del catálogo oficial');
  }

  const length = memberResult.length;
  if (!Number.isFinite(length) || length <= 0) {
    return makeIneligible(member, 'Longitud del miembro no válida');
  }

  const Fy = material.yieldStrength;
  const E = material.elasticModulus;
  const Ag = section.area;
  const rx = section.radiusOfGyrationX;
  const ry = Math.sqrt(Math.max(1e-12, section.inertiaY / section.area));

  // Determine axial forces: in StructureCo convention, maxAxial/minAxial: positive is tension, negative is compression
  const maxAxial = memberResult.maxAxial ?? 0;
  const minAxial = memberResult.minAxial ?? 0;
  const tensionDemand = Math.max(0, maxAxial);
  const compressionDemand = Math.max(0, -minAxial);

  // Shear and moment demands
  const maxShear = Math.max(Math.abs(memberResult.maxShear ?? 0), Math.abs(memberResult.minShear ?? 0));
  const maxMoment = Math.max(Math.abs(memberResult.maxMoment ?? 0), Math.abs(memberResult.minMoment ?? 0));

  const checks: {
    tension?: AiscCheckDetail;
    compression?: AiscCheckDetail;
    flexure?: AiscCheckDetail;
    shear?: AiscCheckDetail;
    interaction?: AiscCheckDetail;
  } = {};

  let governingCheck: AiscCheckKind = 'tension';
  let maxRatio = 0;
  let slendernessKLr = 0;

  if (member.type === 'truss') {
    // Pure axial member
    if (tensionDemand >= compressionDemand && tensionDemand > 0) {
      const tension = evaluateAiscTension({ demand: tensionDemand, Fy, Ag, L: length, r: Math.min(rx, ry) });
      checks.tension = tension;
      governingCheck = 'tension';
      maxRatio = tension.ratio;
      slendernessKLr = length / Math.min(rx, ry);
    } else {
      const comp = evaluateAiscCompression({ demand: compressionDemand, Fy, E, Ag, L: length, rx, ry });
      checks.compression = comp.detail;
      governingCheck = 'compression';
      maxRatio = comp.detail.ratio;
      slendernessKLr = comp.KLr;
    }
  } else {
    // Frame member: subject to combined axial, flexure, and shear
    const comp = evaluateAiscCompression({ demand: compressionDemand, Fy, E, Ag, L: length, rx, ry });
    checks.compression = comp.detail;
    slendernessKLr = comp.KLr;

    if (tensionDemand > 0) {
      const tens = evaluateAiscTension({ demand: tensionDemand, Fy, Ag, L: length, r: Math.min(rx, ry) });
      checks.tension = tens;
    }

    const flex = evaluateAiscFlexure({
      demand: maxMoment,
      Fy,
      E,
      Zx: section.plasticModulusX,
      Sx: section.sectionModulusX,
      Iy: section.inertiaY,
      Ag,
      d: section.depth,
      tw: section.webThickness,
      tf: section.flangeThickness,
      bf: section.width,
      Lb: length,
    });
    checks.flexure = flex;

    const shear = evaluateAiscShear({
      demand: maxShear,
      Fy,
      E,
      d: section.depth,
      tw: section.webThickness,
      tf: section.flangeThickness,
    });
    checks.shear = shear;

    // Combined interaction
    const isTension = tensionDemand > compressionDemand && tensionDemand > 0;
    const Pu = isTension ? tensionDemand : compressionDemand;
    const Pc = isTension ? (checks.tension ? checks.tension.designCapacity : comp.detail.designCapacity) : comp.detail.designCapacity;

    const interaction = evaluateAiscInteraction({
      Pu,
      Pc,
      isTension,
      Mux: maxMoment,
      Mcx: flex.designCapacity,
    });
    checks.interaction = interaction;

    // Determine governing check
    const checkList: [AiscCheckKind, number][] = [
      ['interaction', interaction.ratio],
      ['flexure', flex.ratio],
      ['shear', shear.ratio],
      ['compression', comp.detail.ratio],
    ];
    if (checks.tension) {
      checkList.push(['tension', checks.tension.ratio]);
    }

    checkList.sort((a, b) => b[1] - a[1]);
    governingCheck = checkList[0][0];
    maxRatio = checkList[0][1];
  }

  return {
    memberId: member.id,
    sectionId: section.id,
    sectionName: section.name,
    materialId: material.id,
    materialName: material.name,
    memberType: member.type,
    length,
    unbracedLength: length,
    effectiveLengthFactorK: 1.0,
    slendernessKLr,
    governingCheck,
    maxRatio,
    status: classifyRatioStatus(maxRatio),
    checks,
    isEligible: true,
  };
};

const makeIneligible = (member: MemberModel, reason: string): AiscMemberDesignResult => ({
  memberId: member.id,
  sectionId: member.sectionId ?? 'desconocida',
  sectionName: member.sectionId ?? 'desconocida',
  materialId: member.materialId ?? 'desconocido',
  materialName: member.materialId ?? 'desconocido',
  memberType: member.type,
  length: 0,
  unbracedLength: 0,
  effectiveLengthFactorK: 1.0,
  slendernessKLr: 0,
  governingCheck: 'tension',
  maxRatio: 0,
  status: 'not-applicable',
  checks: {},
  isEligible: false,
  ineligibilityReason: reason,
});

/**
 * Evaluates all eligible steel members in the project under ANSI/AISC 360-16 / 360-22 LRFD.
 * Pure functional projection: (project, analysis, combinationId) => AiscProjectDesignSummary.
 */
export const evaluateAiscSteel360Project = (
  project: ProjectModel,
  analysis: AnalysisResult | null | undefined,
  combinationId?: string | null,
): AiscProjectDesignSummary => {
  const summaryBase = {
    standard: {
      code: AISC_SPECIFICATION.code,
      method: AISC_SPECIFICATION.method,
      title: AISC_SPECIFICATION.title,
    },
    combinationId: combinationId ?? null,
    totalMembers: project.members.length,
    evaluatedMembers: 0,
    passingMembers: 0,
    warningMembers: 0,
    failingMembers: 0,
    criticalMember: null as AiscMemberDesignResult | null,
    resultsByMemberId: {} as Record<string, AiscMemberDesignResult>,
  };

  // If analysis is missing, failed, or unreliable: fail closed
  if (!analysis || !analysis.success) {
    return summaryBase;
  }
  const reliability = resolveReliability(analysis);
  if (!reliability.usable || (reliability.level !== 'reliable' && reliability.level !== 'limited')) {
    return summaryBase;
  }

  let passing = 0;
  let warning = 0;
  let failing = 0;
  let evaluated = 0;
  let criticalMember: AiscMemberDesignResult | null = null;
  const resultsByMemberId: Record<string, AiscMemberDesignResult> = {};

  for (const member of project.members) {
    const memberResult = analysis.memberResults?.find((r) => r.memberId === member.id);
    if (!memberResult) {
      resultsByMemberId[member.id] = makeIneligible(member, 'Sin resultados de análisis disponibles para este miembro');
      continue;
    }

    const memberDesign = evaluateAiscMember({ member, memberResult, project });
    resultsByMemberId[member.id] = memberDesign;

    if (memberDesign.isEligible) {
      evaluated++;
      if (memberDesign.status === 'pass') passing++;
      else if (memberDesign.status === 'warning') warning++;
      else if (memberDesign.status === 'fail') failing++;

      if (!criticalMember || memberDesign.maxRatio > criticalMember.maxRatio) {
        criticalMember = memberDesign;
      }
    }
  }

  return {
    ...summaryBase,
    evaluatedMembers: evaluated,
    passingMembers: passing,
    warningMembers: warning,
    failingMembers: failing,
    criticalMember,
    resultsByMemberId,
  };
};
