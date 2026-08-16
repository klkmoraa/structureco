/**
 * Detección de candidatos · contrato de selección precisa de cinco fases
 * (CRI-9 §9, D-06).
 *
 * Es una función pura: dado un punto y el modelo proyectado, devuelve TODOS
 * los objetos dentro de su radio de acierto, ordenados por distancia — no
 * sólo el que gane el `hit-test` del DOM. Eso es lo que hace posible
 * distinguir «un candidato claro» de «ambiguo»: la ambigüedad se mide en esta
 * función, no se infiere del orden de pintado.
 *
 * Los radios (13/22 px de nodo, 12/22 px de medio-ancho de miembro) son los
 * mismos que ya pinta `StructuralCanvas` como `.pt-node-hit`/`.pt-member-hit`
 * — el área de acierto nunca engorda la geometría dibujada, sólo el área que
 * la reconoce (Brandbook §02).
 */

import type { EffectiveModel } from './model';

export type CandidateKind = 'node' | 'member';

export interface Candidate {
  kind: CandidateKind;
  id: string;
  distance: number;
  /** Para el picker: un diferenciador legible, ya en el idioma de la UI. */
  differentiator: string;
}

export interface Projector {
  x: (worldX: number) => number;
  y: (worldY: number) => number;
}

const distanceToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSq));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
};

export interface HitTestOptions {
  pointerCoarse: boolean;
  /** Si se declara, sólo se buscan candidatos de ese tipo (SEL-06). */
  filter?: 'node' | 'member' | 'all';
}

/**
 * `px`/`py` van en el mismo espacio px que produce `project.x()/y()` — es
 * decir, YA compensados por cámara (pan/zoom) por quien llama.
 */
export const hitTest = (px: number, py: number, model: EffectiveModel, project: Projector, options: HitTestOptions): Candidate[] => {
  const nodeRadius = options.pointerCoarse ? 22 : 13;
  const memberHalfWidth = (options.pointerCoarse ? 44 : 24) / 2;
  const candidates: Candidate[] = [];

  if (options.filter !== 'member') {
    for (const node of model.nodes) {
      const nx = project.x(node.x);
      const ny = project.y(node.y);
      const distance = Math.hypot(px - nx, py - ny);
      if (distance <= nodeRadius) {
        const support = node.support === 'none' ? '' : ` · ${node.support}`;
        candidates.push({ kind: 'node', id: node.id, distance, differentiator: `(${node.x.toFixed(1)}, ${node.y.toFixed(1)})${support}` });
      }
    }
  }

  if (options.filter !== 'node') {
    for (const member of model.members) {
      const i = model.nodes.find((node) => node.id === member.i);
      const j = model.nodes.find((node) => node.id === member.j);
      if (!i || !j) continue;
      const x1 = project.x(i.x);
      const y1 = project.y(i.y);
      const x2 = project.x(j.x);
      const y2 = project.y(j.y);
      const distance = distanceToSegment(px, py, x1, y1, x2, y2);
      if (distance <= memberHalfWidth) {
        candidates.push({ kind: 'member', id: member.id, distance, differentiator: member.label ?? member.type });
      }
    }
  }

  return candidates.sort((a, b) => a.distance - b.distance);
};

/** Rectángulo mundo→pantalla para marquee-select: intersección simple AABB. */
export const withinBox = (
  model: EffectiveModel,
  project: Projector,
  box: { x1: number; y1: number; x2: number; y2: number },
): Candidate[] => {
  const left = Math.min(box.x1, box.x2);
  const right = Math.max(box.x1, box.x2);
  const top = Math.min(box.y1, box.y2);
  const bottom = Math.max(box.y1, box.y2);
  const inside = (px: number, py: number) => px >= left && px <= right && py >= top && py <= bottom;

  const candidates: Candidate[] = [];
  for (const node of model.nodes) {
    if (inside(project.x(node.x), project.y(node.y))) {
      candidates.push({ kind: 'node', id: node.id, distance: 0, differentiator: '' });
    }
  }
  for (const member of model.members) {
    const i = model.nodes.find((node) => node.id === member.i);
    const j = model.nodes.find((node) => node.id === member.j);
    if (!i || !j) continue;
    const midX = project.x((i.x + j.x) / 2);
    const midY = project.y((i.y + j.y) / 2);
    if (inside(midX, midY)) candidates.push({ kind: 'member', id: member.id, distance: 0, differentiator: '' });
  }
  return candidates;
};
