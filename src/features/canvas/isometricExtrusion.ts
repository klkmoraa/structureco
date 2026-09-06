import { resolveSectionGeometry, type SectionGeometry } from '../inspector/sectionGeometry';
import { elasticIndexPaint } from '../results/elasticDemand';
import type { ProjectModel, NodeModel } from '../../types';
import type { CanvasCamera as Camera, ScreenPoint } from './canvasInteraction';
import type { CandidateTarget } from './candidatePicker';

export interface ExtrudedPoint2D {
  readonly x: number;
  readonly y: number;
}

export interface ExtrudedVector3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export type ExtrudedFacePart =
  | 'flange-top'
  | 'flange-bottom'
  | 'flange-shelf'
  | 'web'
  | 'front'
  | 'top'
  | 'bottom'
  | 'side'
  | 'cap'
  | 'joint-front'
  | 'joint-top'
  | 'joint-side';

export interface ExtrudedFace {
  readonly id: string;
  readonly memberId?: string;
  readonly nodeId?: string;
  readonly part: ExtrudedFacePart;
  readonly points: readonly ExtrudedPoint2D[];
  /** Sombreado Lambertiano direccional de 0 (sombra) a 1 (luz plena). */
  readonly shade: number;
  /** Profundidad para el algoritmo del pintor: menor = más al fondo, mayor = más cerca. */
  readonly depth: number;
  /** Color de relleno derivado del material, selección, demanda y sombreado. */
  readonly fillColor: string;
  /** Color de trazo para las aristas técnicas biseladas. */
  readonly strokeColor: string;
  readonly strokeWidth: number;
  readonly isSelected: boolean;
  readonly isCandidate: boolean;
}

export interface ExtrusionOptions {
  readonly slantAngleDeg?: number;
  readonly depthScale?: number;
  readonly showJoints?: boolean;
}

export interface ExtrudedGhostAxis {
  readonly memberId: string;
  readonly start: ExtrudedPoint2D;
  readonly end: ExtrudedPoint2D;
  readonly isSelected: boolean;
}

export interface ExtrudedStructureResult {
  readonly faces: readonly ExtrudedFace[];
  readonly ghostAxes: readonly ExtrudedGhostAxis[];
}

/** Vector de luz cenital-izquierda para la estética Claymorphic. */
const LIGHT_DIR: ExtrudedVector3D = (() => {
  const lx = -0.38;
  const ly = -0.76;
  const lz = 0.52;
  const len = Math.hypot(lx, ly, lz) || 1;
  return { x: lx / len, y: ly / len, z: lz / len };
})();

/** Sombra Lambertiana con suelo ambiental para que ninguna cara caiga a negro. */
const computeLambertShade = (normal: ExtrudedVector3D, ambient = 0.38): number => {
  const len = Math.hypot(normal.x, normal.y, normal.z) || 1;
  const nx = normal.x / len;
  const ny = normal.y / len;
  const nz = normal.z / len;
  const dot = nx * LIGHT_DIR.x + ny * LIGHT_DIR.y + nz * LIGHT_DIR.z;
  return Math.min(1, Math.max(0, ambient + (1 - ambient) * Math.max(0, dot)));
};

/** Resuelve el color de relleno HSL combinando material, sombreado y demanda. */
const resolveFaceFill = (
  shade: number,
  isSelected: boolean,
  isCandidate: boolean,
  demandRatio: number | undefined,
  materialId?: string,
): string => {
  if (isSelected) {
    // Acento dorado/ámbar Claymorphic para selección
    const l = Math.round(42 + shade * 38);
    return `hsl(38, 92%, ${l}%)`;
  }
  if (isCandidate) {
    const l = Math.round(50 + shade * 35);
    return `hsl(45, 88%, ${l}%)`;
  }
  if (demandRatio !== undefined) {
    const demand = elasticIndexPaint(demandRatio);
    return `color-mix(in srgb, ${demand.color} ${Math.round(40 + shade * 50)}%, hsl(215, 15%, ${Math.round(20 + shade * 40)}%))`;
  }

  // Material base
  const mat = (materialId ?? '').toLowerCase();
  if (mat.includes('conc')) {
    // Concreto arquitectónico suave
    const l = Math.round(48 + shade * 36);
    return `hsl(210, 8%, ${l}%)`;
  }
  if (mat.includes('wood') || mat.includes('madera') || mat.includes('timber')) {
    // Madera cálida
    const l = Math.round(36 + shade * 36);
    return `hsl(32, 45%, ${l}%)`;
  }
  // Acero estructural neutro / azul pizarra técnico
  const l = Math.round(34 + shade * 42);
  return `hsl(216, 18%, ${l}%)`;
};

/** Color de aristas técnicas: bisel luminoso arriba y trazo sutil en sombra. */
const resolveStrokeStyle = (shade: number, isSelected: boolean) => {
  if (isSelected) {
    return { color: 'rgba(245, 158, 11, 0.85)', width: 1.5 };
  }
  if (shade > 0.7) {
    return { color: 'rgba(255, 255, 255, 0.28)', width: 0.9 };
  }
  return { color: 'rgba(15, 23, 42, 0.35)', width: 0.8 };
};

/**
 * Calcula la malla 2.5D extruida de la estructura completa en coordenadas de pantalla.
 */
export const computeExtrudedStructure = (
  project: ProjectModel,
  toScreen: (x: number, y: number) => ScreenPoint,
  camera: Camera,
  selectedMemberIds: readonly string[],
  selectedNodeIds: readonly string[],
  candidatePreview: CandidateTarget | null | undefined,
  heatmapRatios: ReadonlyMap<string, number>,
  options: ExtrusionOptions = {},
): ExtrudedStructureResult => {
  const faces: ExtrudedFace[] = [];
  const ghostAxes: ExtrudedGhostAxis[] = [];

  const slantDeg = options.slantAngleDeg ?? 30;
  const slantRad = (slantDeg * Math.PI) / 180;
  const depthFactor = options.depthScale ?? 0.65;
  const kIso = {
    x: Math.cos(slantRad),
    y: -Math.sin(slantRad),
  };

  const nodeMap = new Map<string, NodeModel>();
  for (const n of project.nodes) {
    nodeMap.set(n.id, n);
  }

  // 1. Extrusión de cada barra
  for (const member of project.members) {
    const ni = nodeMap.get(member.i);
    const nj = nodeMap.get(member.j);
    if (!ni || !nj) continue;

    const a = toScreen(ni.x, ni.y);
    const b = toScreen(nj.x, nj.y);

    const isSelected = selectedMemberIds.includes(member.id);
    const isCandidate = candidatePreview?.kind === 'member' && candidatePreview.id === member.id;
    const demandRatio = heatmapRatios.get(member.id);

    // Eje fantasma analítico
    ghostAxes.push({
      memberId: member.id,
      start: a,
      end: b,
      isSelected,
    });

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) continue;

    const ux = dx / len;
    const uy = dy / len;
    // Normal transversal en el plano de pantalla
    const vx = -uy;
    const vy = ux;

    // Asegurar que vTop apunte hacia arriba en pantalla (y negativo)
    const vTop = vy <= 0 ? { x: vx, y: vy } : { x: -vx, y: -vy };

    // Geometría del perfil
    const geom: SectionGeometry = resolveSectionGeometry({
      area: member.A,
      inertia: member.I,
      sectionId: member.sectionId,
      sectionOrigin: member.sectionOrigin,
    });

    // Dimensiones en pantalla con límites ergonómicos
    const depthPx = Math.max(8, Math.min(100, geom.depth * camera.scale));
    const widthPx = Math.max(6, Math.min(90, geom.width * camera.scale));
    const flangePx = Math.max(2, Math.min(depthPx * 0.35, geom.flange * camera.scale));

    // Vector de extrusión isométrica para este perfil
    const ex = kIso.x * (widthPx * depthFactor);
    const ey = kIso.y * (widthPx * depthFactor);

    // Profundidad base para ordenar barras (de fondo a frente)
    const baseZ = (a.y + b.y) * 0.05 + (a.x + b.x) * 0.01;

    if (geom.shapeType === 'I') {
      // -------------------------------------------------------------
      // PERFIL I (Alas superior/inferior + Alma rehundida en Z)
      // -------------------------------------------------------------
      const h2 = depthPx / 2;
      const h2MinusTf = h2 - flangePx;

      // Alas en el plano frontal:
      // Ala Superior - Puntos frontales
      const topFlangeA0 = { x: a.x + vTop.x * h2MinusTf, y: a.y + vTop.y * h2MinusTf };
      const topFlangeB0 = { x: b.x + vTop.x * h2MinusTf, y: b.y + vTop.y * h2MinusTf };
      const topFlangeA1 = { x: a.x + vTop.x * h2, y: a.y + vTop.y * h2 };
      const topFlangeB1 = { x: b.x + vTop.x * h2, y: b.y + vTop.y * h2 };

      // Ala Superior - Puntos extruidos (fondo en Z)
      const topFlangeExtA1 = { x: topFlangeA1.x + ex, y: topFlangeA1.y + ey };
      const topFlangeExtB1 = { x: topFlangeB1.x + ex, y: topFlangeB1.y + ey };

      // Ala Inferior - Puntos frontales
      const botFlangeA0 = { x: a.x - vTop.x * h2, y: a.y - vTop.y * h2 };
      const botFlangeB0 = { x: b.x - vTop.x * h2, y: b.y - vTop.y * h2 };
      const botFlangeA1 = { x: a.x - vTop.x * h2MinusTf, y: a.y - vTop.y * h2MinusTf };
      const botFlangeB1 = { x: b.x - vTop.x * h2MinusTf, y: b.y - vTop.y * h2MinusTf };

      // Ala Inferior - Puntos extruidos
      const botFlangeExtA0 = { x: botFlangeA0.x + ex, y: botFlangeA0.y + ey };
      const botFlangeExtB0 = { x: botFlangeB0.x + ex, y: botFlangeB0.y + ey };

      // Alma rehundida en Z (offset intermedio)
      const webZFracStart = 0.35;
      const webOffsetStartX = ex * webZFracStart;
      const webOffsetStartY = ey * webZFracStart;

      const webA0 = { x: topFlangeA0.x + webOffsetStartX, y: topFlangeA0.y + webOffsetStartY };
      const webB0 = { x: topFlangeB0.x + webOffsetStartX, y: topFlangeB0.y + webOffsetStartY };
      const webA1 = { x: botFlangeA1.x + webOffsetStartX, y: botFlangeA1.y + webOffsetStartY };
      const webB1 = { x: botFlangeB1.x + webOffsetStartX, y: botFlangeB1.y + webOffsetStartY };

      // 1. Ala Superior - Cara Superior (muy iluminada)
      const topShade = computeLambertShade({ x: vTop.x * 0.5, y: vTop.y * 0.8, z: 0.3 });
      const topStroke = resolveStrokeStyle(topShade, isSelected);
      faces.push({
        id: `${member.id}-top-flange-top`,
        memberId: member.id,
        part: 'top',
        points: [topFlangeA1, topFlangeB1, topFlangeExtB1, topFlangeExtA1],
        shade: topShade,
        depth: baseZ + 10,
        fillColor: resolveFaceFill(topShade, isSelected, isCandidate, demandRatio, member.materialId),
        strokeColor: topStroke.color,
        strokeWidth: topStroke.width,
        isSelected,
        isCandidate,
      });

      // 2. Ala Superior - Cara Frontal
      const frontShade = computeLambertShade({ x: 0, y: 0, z: 1 });
      const frontStroke = resolveStrokeStyle(frontShade, isSelected);
      faces.push({
        id: `${member.id}-top-flange-front`,
        memberId: member.id,
        part: 'flange-top',
        points: [topFlangeA0, topFlangeB0, topFlangeB1, topFlangeA1],
        shade: frontShade,
        depth: baseZ + 20,
        fillColor: resolveFaceFill(frontShade, isSelected, isCandidate, demandRatio, member.materialId),
        strokeColor: frontStroke.color,
        strokeWidth: frontStroke.width,
        isSelected,
        isCandidate,
      });

      // 3. Estante interior del ala superior (hacia el alma)
      const shelfShade = computeLambertShade({ x: -vTop.x * 0.4, y: -vTop.y * 0.4, z: 0.6 });
      const shelfStroke = resolveStrokeStyle(shelfShade, isSelected);
      faces.push({
        id: `${member.id}-top-flange-shelf`,
        memberId: member.id,
        part: 'flange-shelf',
        points: [topFlangeA0, topFlangeB0, webB0, webA0],
        shade: shelfShade,
        depth: baseZ + 15,
        fillColor: resolveFaceFill(shelfShade, isSelected, isCandidate, demandRatio, member.materialId),
        strokeColor: shelfStroke.color,
        strokeWidth: shelfStroke.width,
        isSelected,
        isCandidate,
      });

      // 4. Cara frontal del Alma rehundida
      const webShade = computeLambertShade({ x: 0.1, y: 0.1, z: 0.9 }, 0.32);
      const webStroke = resolveStrokeStyle(webShade, isSelected);
      faces.push({
        id: `${member.id}-web`,
        memberId: member.id,
        part: 'web',
        points: [webA0, webB0, webB1, webA1],
        shade: webShade,
        depth: baseZ + 5,
        fillColor: resolveFaceFill(webShade, isSelected, isCandidate, demandRatio, member.materialId),
        strokeColor: webStroke.color,
        strokeWidth: webStroke.width,
        isSelected,
        isCandidate,
      });

      // 5. Estante interior del ala inferior (mira hacia arriba al alma)
      const botShelfShade = computeLambertShade({ x: vTop.x * 0.6, y: vTop.y * 0.6, z: 0.5 });
      const botShelfStroke = resolveStrokeStyle(botShelfShade, isSelected);
      faces.push({
        id: `${member.id}-bot-flange-shelf`,
        memberId: member.id,
        part: 'flange-shelf',
        points: [botFlangeA1, botFlangeB1, webB1, webA1],
        shade: botShelfShade,
        depth: baseZ + 14,
        fillColor: resolveFaceFill(botShelfShade, isSelected, isCandidate, demandRatio, member.materialId),
        strokeColor: botShelfStroke.color,
        strokeWidth: botShelfStroke.width,
        isSelected,
        isCandidate,
      });

      // 6. Ala Inferior - Cara Frontal
      faces.push({
        id: `${member.id}-bot-flange-front`,
        memberId: member.id,
        part: 'flange-bottom',
        points: [botFlangeA0, botFlangeB0, botFlangeB1, botFlangeA1],
        shade: frontShade,
        depth: baseZ + 20,
        fillColor: resolveFaceFill(frontShade, isSelected, isCandidate, demandRatio, member.materialId),
        strokeColor: frontStroke.color,
        strokeWidth: frontStroke.width,
        isSelected,
        isCandidate,
      });

      // 7. Ala Inferior - Cara Inferior (en penumbra)
      const botShade = computeLambertShade({ x: -vTop.x * 0.6, y: -vTop.y * 0.8, z: 0.2 }, 0.28);
      const botStroke = resolveStrokeStyle(botShade, isSelected);
      faces.push({
        id: `${member.id}-bot-flange-bottom`,
        memberId: member.id,
        part: 'bottom',
        points: [botFlangeA0, botFlangeB0, botFlangeExtB0, botFlangeExtA0],
        shade: botShade,
        depth: baseZ + 1,
        fillColor: resolveFaceFill(botShade, isSelected, isCandidate, demandRatio, member.materialId),
        strokeColor: botStroke.color,
        strokeWidth: botStroke.width,
        isSelected,
        isCandidate,
      });

      // 8. Tapa de extremo en nudo B (silueta "I")
      const capPoints: ExtrudedPoint2D[] = [
        topFlangeB1,
        topFlangeExtB1,
        { x: topFlangeB0.x + ex, y: topFlangeB0.y + ey },
        { x: topFlangeB0.x + webOffsetStartX, y: topFlangeB0.y + webOffsetStartY },
        { x: botFlangeB1.x + webOffsetStartX, y: botFlangeB1.y + webOffsetStartY },
        { x: botFlangeB1.x + ex, y: botFlangeB1.y + ey },
        botFlangeExtB0,
        botFlangeB0,
        botFlangeB1,
        webB1,
        webB0,
        topFlangeB0,
      ];
      const capShade = computeLambertShade({ x: ux * 0.6, y: uy * 0.6, z: 0.5 });
      const capStroke = resolveStrokeStyle(capShade, isSelected);
      faces.push({
        id: `${member.id}-cap-j`,
        memberId: member.id,
        part: 'cap',
        points: capPoints,
        shade: capShade,
        depth: baseZ + 18,
        fillColor: resolveFaceFill(capShade, isSelected, isCandidate, demandRatio, member.materialId),
        strokeColor: capStroke.color,
        strokeWidth: capStroke.width,
        isSelected,
        isCandidate,
      });
    } else {
      // -------------------------------------------------------------
      // PERFIL RECTANGULAR / TUBULAR (Prisma 2.5D)
      // -------------------------------------------------------------
      const h2 = depthPx / 2;

      // Vértices del prisma frontal
      const frontTopA = { x: a.x + vTop.x * h2, y: a.y + vTop.y * h2 };
      const frontTopB = { x: b.x + vTop.x * h2, y: b.y + vTop.y * h2 };
      const frontBotA = { x: a.x - vTop.x * h2, y: a.y - vTop.y * h2 };
      const frontBotB = { x: b.x - vTop.x * h2, y: b.y - vTop.y * h2 };

      // Vértices extruidos
      const extTopA = { x: frontTopA.x + ex, y: frontTopA.y + ey };
      const extTopB = { x: frontTopB.x + ex, y: frontTopB.y + ey };
      const extBotA = { x: frontBotA.x + ex, y: frontBotA.y + ey };
      const extBotB = { x: frontBotB.x + ex, y: frontBotB.y + ey };

      // 1. Cara Superior
      const topShade = computeLambertShade({ x: vTop.x * 0.5, y: vTop.y * 0.8, z: 0.3 });
      const topStroke = resolveStrokeStyle(topShade, isSelected);
      faces.push({
        id: `${member.id}-rect-top`,
        memberId: member.id,
        part: 'top',
        points: [frontTopA, frontTopB, extTopB, extTopA],
        shade: topShade,
        depth: baseZ + 12,
        fillColor: resolveFaceFill(topShade, isSelected, isCandidate, demandRatio, member.materialId),
        strokeColor: topStroke.color,
        strokeWidth: topStroke.width,
        isSelected,
        isCandidate,
      });

      // 2. Cara Frontal
      const frontShade = computeLambertShade({ x: 0, y: 0, z: 1 });
      const frontStroke = resolveStrokeStyle(frontShade, isSelected);
      faces.push({
        id: `${member.id}-rect-front`,
        memberId: member.id,
        part: 'front',
        points: [frontBotA, frontBotB, frontTopB, frontTopA],
        shade: frontShade,
        depth: baseZ + 20,
        fillColor: resolveFaceFill(frontShade, isSelected, isCandidate, demandRatio, member.materialId),
        strokeColor: frontStroke.color,
        strokeWidth: frontStroke.width,
        isSelected,
        isCandidate,
      });

      // 3. Cara Inferior
      const botShade = computeLambertShade({ x: -vTop.x * 0.5, y: -vTop.y * 0.8, z: 0.2 }, 0.25);
      const botStroke = resolveStrokeStyle(botShade, isSelected);
      faces.push({
        id: `${member.id}-rect-bottom`,
        memberId: member.id,
        part: 'bottom',
        points: [frontBotA, frontBotB, extBotB, extBotA],
        shade: botShade,
        depth: baseZ + 1,
        fillColor: resolveFaceFill(botShade, isSelected, isCandidate, demandRatio, member.materialId),
        strokeColor: botStroke.color,
        strokeWidth: botStroke.width,
        isSelected,
        isCandidate,
      });

      // 4. Tapa lateral en extremo B
      const capShade = computeLambertShade({ x: ux * 0.6, y: uy * 0.6, z: 0.5 });
      const capStroke = resolveStrokeStyle(capShade, isSelected);
      faces.push({
        id: `${member.id}-rect-cap-j`,
        memberId: member.id,
        part: 'cap',
        points: [frontBotB, frontTopB, extTopB, extBotB],
        shade: capShade,
        depth: baseZ + 16,
        fillColor: resolveFaceFill(capShade, isSelected, isCandidate, demandRatio, member.materialId),
        strokeColor: capStroke.color,
        strokeWidth: capStroke.width,
        isSelected,
        isCandidate,
      });
    }
  }

  // 2. Bloques de unión en nudos (Joint Blocks / Cartelas volumétricas)
  if (options.showJoints !== false) {
    const nodeDegree = new Map<string, number>();
    for (const m of project.members) {
      nodeDegree.set(m.i, (nodeDegree.get(m.i) ?? 0) + 1);
      nodeDegree.set(m.j, (nodeDegree.get(m.j) ?? 0) + 1);
    }

    for (const node of project.nodes) {
      const deg = nodeDegree.get(node.id) ?? 0;
      if (deg === 0) continue;

      const p = toScreen(node.x, node.y);
      const isSelected = selectedNodeIds.includes(node.id);
      const isCandidate = candidatePreview?.kind === 'node' && candidatePreview.id === node.id;

      // Tamaño proporcional al grado de conexión y escala
      const size = Math.max(9, Math.min(22, 6 + deg * 3));
      const s2 = size / 2;
      const jex = kIso.x * (size * depthFactor);
      const jey = kIso.y * (size * depthFactor);

      const jf0 = { x: p.x - s2, y: p.y - s2 };
      const jf1 = { x: p.x + s2, y: p.y - s2 };
      const jf2 = { x: p.x + s2, y: p.y + s2 };
      const jf3 = { x: p.x - s2, y: p.y + s2 };

      const jt0 = { x: jf0.x + jex, y: jf0.y + jey };
      const jt1 = { x: jf1.x + jex, y: jf1.y + jey };
      const jt2 = { x: jf2.x + jex, y: jf2.y + jey };

      const jTopShade = computeLambertShade({ x: 0, y: -0.9, z: 0.3 });
      const jFrontShade = computeLambertShade({ x: 0, y: 0, z: 1 });
      const jSideShade = computeLambertShade({ x: 0.8, y: -0.3, z: 0.4 });

      const depthZ = p.y * 0.05 + 25;

      // Cara Superior del nudo
      faces.push({
        id: `node-${node.id}-joint-top`,
        nodeId: node.id,
        part: 'joint-top',
        points: [jf0, jf1, jt1, jt0],
        shade: jTopShade,
        depth: depthZ + 2,
        fillColor: resolveFaceFill(jTopShade, isSelected, isCandidate, undefined),
        strokeColor: resolveStrokeStyle(jTopShade, isSelected).color,
        strokeWidth: 1,
        isSelected,
        isCandidate,
      });

      // Cara Frontal del nudo
      faces.push({
        id: `node-${node.id}-joint-front`,
        nodeId: node.id,
        part: 'joint-front',
        points: [jf0, jf1, jf2, jf3],
        shade: jFrontShade,
        depth: depthZ + 4,
        fillColor: resolveFaceFill(jFrontShade, isSelected, isCandidate, undefined),
        strokeColor: resolveStrokeStyle(jFrontShade, isSelected).color,
        strokeWidth: 1,
        isSelected,
        isCandidate,
      });

      // Cara Lateral del nudo
      faces.push({
        id: `node-${node.id}-joint-side`,
        nodeId: node.id,
        part: 'joint-side',
        points: [jf1, jt1, jt2, jf2],
        shade: jSideShade,
        depth: depthZ + 3,
        fillColor: resolveFaceFill(jSideShade, isSelected, isCandidate, undefined),
        strokeColor: resolveStrokeStyle(jSideShade, isSelected).color,
        strokeWidth: 1,
        isSelected,
        isCandidate,
      });
    }
  }

  // 3. Ordenamiento de caras por profundidad (Algoritmo del Pintor)
  faces.sort((a, b) => a.depth - b.depth);

  return {
    faces,
    ghostAxes,
  };
};
