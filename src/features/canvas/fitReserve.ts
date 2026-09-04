import type { MemberLoad, MemberModel, NodalLoad, NodeModel, ProjectModel } from '../../types';
import { memberAxis, toGlobalVector } from '../../graphics/structureGeometry';
import type { CanvasSafeInsets } from './canvasChromeGeometry';

/**
 * Margen que el encuadre debe reservar para lo que se dibuja **alrededor** de
 * los nudos.
 *
 * `cameraToFitBounds` encuadraba la envolvente de los nudos y nada más, así que
 * todo lo que cuelga de ellos —flechas de carga, símbolos de apoyo, la ordenada
 * del diagrama, las reacciones— quedaba cortado por el borde del lienzo justo
 * después de pulsar «Encajar». Esos símbolos viven en píxeles de pantalla y no
 * encogen con el zoom, de modo que la reserva se calcula también en píxeles y
 * se suma a los `insets` del encuadre.
 *
 * La reserva es **direccional**: una carga de gravedad sobre una viga pide sitio
 * arriba, no a los lados, y el diagrama de una columna se separa en horizontal.
 * Reservar en las cuatro direcciones era fácil pero encogía el dibujo sin
 * motivo, así que cada símbolo aporta sólo por donde realmente se sale.
 *
 * Aquí no se recalcula geometría estructural: se reutilizan `memberAxis` y
 * `toGlobalVector` —los mismos que usan las capas de dibujo— y se repiten las
 * longitudes con las que se pintan los símbolos.
 */
export interface FitReserve {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const EMPTY_FIT_RESERVE: FitReserve = { top: 0, right: 0, bottom: 0, left: 0 };

/** Radio del símbolo de apoyo más alto (resorte) con su marco de selección. */
const SUPPORT_RADIUS_PX = 32;
/** Flecha de carga nodal (54) más su etiqueta (anclada a 62, 22 de alto). */
const NODAL_FORCE_REACH_PX = 78;
/** Arco de momento más la etiqueta que lo acompaña. */
const MOMENT_REACH_PX = 52;
/** Flecha de carga puntual sobre barra: cola máxima más etiqueta. */
const MEMBER_FORCE_REACH_PX = 84;
/** Peine de carga repartida (45 máximo) más su etiqueta. */
const DISTRIBUTED_REACH_PX = 66;
/** Ordenada máxima del diagrama a escala 1. */
const DIAGRAM_ORDINATE_PX = 68;
/** Rótulo de dos líneas del extremo crítico, sobre la punta de la ordenada. */
const DIAGRAM_STAMP_PX = 36;
/** Flecha de reacción más su rótulo, alrededor del apoyo. */
const REACTION_REACH_PX = 58;

const merge = (into: FitReserve, patch: Partial<FitReserve>): FitReserve => ({
  top: Math.max(into.top, patch.top ?? 0),
  right: Math.max(into.right, patch.right ?? 0),
  bottom: Math.max(into.bottom, patch.bottom ?? 0),
  left: Math.max(into.left, patch.left ?? 0),
});

const uniform = (into: FitReserve, reach: number): FitReserve =>
  merge(into, { top: reach, right: reach, bottom: reach, left: reach });

/**
 * Reserva de un trazo que sale del objeto hacia `-(ux, uy)` **en pantalla**,
 * que es como se dibuja toda carga: la punta toca el modelo y la cola se aleja.
 */
const againstScreenVector = (into: FitReserve, ux: number, uy: number, reach: number): FitReserve => {
  if (!Number.isFinite(ux) || !Number.isFinite(uy)) return into;
  return merge(into, {
    left: ux > 0 ? ux * reach : 0,
    right: ux < 0 ? -ux * reach : 0,
    top: uy > 0 ? uy * reach : 0,
    bottom: uy < 0 ? -uy * reach : 0,
  });
};

/** Reserva simétrica a ambos lados de una dirección de pantalla. */
const alongScreenAxis = (into: FitReserve, ux: number, uy: number, reach: number): FitReserve =>
  againstScreenVector(againstScreenVector(into, ux, uy, reach), -ux, -uy, reach);

const nodalLoadReserve = (into: FitReserve, load: NodalLoad): FitReserve => {
  const magnitude = Math.hypot(load.fx, load.fy);
  // `y` de pantalla crece hacia abajo: la componente vertical cambia de signo.
  if (magnitude > 1e-9) return againstScreenVector(into, load.fx / magnitude, -load.fy / magnitude, NODAL_FORCE_REACH_PX);
  if (Math.abs(load.mz) > 1e-9) return uniform(into, MOMENT_REACH_PX);
  return into;
};

const memberLoadReserve = (
  into: FitReserve,
  load: MemberLoad,
  memberMap: ReadonlyMap<string, MemberModel>,
  nodeMap: ReadonlyMap<string, NodeModel>,
): FitReserve => {
  if (load.type === 'moment') return uniform(into, MOMENT_REACH_PX);
  const member = memberMap.get(load.memberId);
  const start = member ? nodeMap.get(member.i) : undefined;
  const end = member ? nodeMap.get(member.j) : undefined;
  const reach = load.type === 'distributed' ? DISTRIBUTED_REACH_PX : MEMBER_FORCE_REACH_PX;
  if (!member || !start || !end) return uniform(into, reach);
  const axis = memberAxis(member, start, end);
  if (!(axis.length > 1e-12)) return uniform(into, reach);
  const [x, y] = load.type === 'distributed'
    ? [
      ((load.qxStart ?? 0) + (load.qxEnd ?? load.qxStart ?? 0)) / 2,
      ((load.qyStart ?? 0) + (load.qyEnd ?? load.qyStart ?? 0)) / 2,
    ]
    : [load.px ?? 0, load.py ?? 0];
  const [gx, gy] = toGlobalVector(axis, load.coordinateSystem, x, y);
  const magnitude = Math.hypot(gx, gy);
  if (!(magnitude > 1e-12)) return into;
  return againstScreenVector(into, gx / magnitude, -gy / magnitude, reach);
};

/**
 * La ordenada del diagrama crece sobre la normal de la barra y puede caer a
 * cualquiera de sus dos lados según el signo, así que se reserva en ambos.
 */
const diagramReserve = (
  into: FitReserve,
  member: MemberModel,
  nodeMap: ReadonlyMap<string, NodeModel>,
  reach: number,
): FitReserve => {
  const start = nodeMap.get(member.i);
  const end = nodeMap.get(member.j);
  if (!start || !end) return into;
  const axis = memberAxis(member, start, end);
  if (!(axis.length > 1e-12)) return into;
  return alongScreenAxis(into, axis.normal.x, -axis.normal.y, reach);
};

export interface FitReserveOptions {
  /** La capa de cargas está encendida y visible. */
  loadsVisible: boolean;
  /** La capa de resultados pinta diagrama de esfuerzos. */
  diagramVisible: boolean;
  /** Se dibujan flechas y rótulos de reacción. */
  reactionsVisible: boolean;
  /** `settings.diagramScale`, el factor con el que se estira la ordenada. */
  diagramScale: number;
}

type FitReserveProject = Pick<ProjectModel, 'nodes' | 'members' | 'nodalLoads' | 'memberLoads'>;

/** Reserva en píxeles que el encuadre necesita alrededor de la envolvente de nudos. */
export const canvasFitReserve = (project: FitReserveProject, options: FitReserveOptions): FitReserve => {
  let reserve = EMPTY_FIT_RESERVE;
  const supported = project.nodes.some((node) => node.support.type !== 'none');
  if (supported) reserve = uniform(reserve, SUPPORT_RADIUS_PX);
  if (supported && options.reactionsVisible) reserve = uniform(reserve, REACTION_REACH_PX);

  if (options.loadsVisible) {
    for (const load of project.nodalLoads) reserve = nodalLoadReserve(reserve, load);
    if (project.memberLoads.length) {
      const nodeMap = new Map(project.nodes.map((node) => [node.id, node]));
      const memberMap = new Map(project.members.map((member) => [member.id, member]));
      for (const load of project.memberLoads) reserve = memberLoadReserve(reserve, load, memberMap, nodeMap);
    }
  }

  if (options.diagramVisible && project.members.length) {
    const scale = Number.isFinite(options.diagramScale) && options.diagramScale > 0 ? options.diagramScale : 1;
    const reach = DIAGRAM_ORDINATE_PX * scale + DIAGRAM_STAMP_PX;
    const nodeMap = new Map(project.nodes.map((node) => [node.id, node]));
    for (const member of project.members) reserve = diagramReserve(reserve, member, nodeMap, reach);
  }

  return reserve;
};

/**
 * Suma la reserva a los `insets` del cromo, con un techo por lado.
 *
 * Sin techo, un modelo pequeño con diagrama y reacciones podría pedir más
 * margen que altura tiene el lienzo y el encaje colapsaría al zoom mínimo. El
 * tope deja siempre al menos un tercio del viewport para el dibujo.
 */
export const insetsWithFitReserve = (
  insets: CanvasSafeInsets,
  reserve: FitReserve,
  viewport: { width: number; height: number },
): CanvasSafeInsets => {
  const capX = Math.max(0, (viewport.width - insets.left - insets.right) / 3);
  const capY = Math.max(0, (viewport.height - insets.top - insets.bottom) / 3);
  const cap = (value: number, limit: number) => Math.min(Number.isFinite(value) ? Math.max(0, value) : 0, limit);
  return {
    top: insets.top + cap(reserve.top, capY),
    right: insets.right + cap(reserve.right, capX),
    bottom: insets.bottom + cap(reserve.bottom, capY),
    left: insets.left + cap(reserve.left, capX),
  };
};
