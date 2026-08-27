/**
 * Geometría de la escena estructural.
 *
 * Convierte lo que devolvió el motor (`src/data/escena-portico.json`, producido
 * por `scripts/generar-escena.mjs`) en coordenadas de pantalla. Aquí no se
 * calcula nada estructural: sólo se proyecta y se escala lo ya resuelto.
 */

import escena from '../data/escena-portico.json';

export type Escena = typeof escena;
export const ESCENA = escena;

export interface Vista {
  /** Ancho y alto del lienzo en px. */
  ancho: number;
  alto: number;
  /** Margen interior en px. */
  margen: number;
}

export interface Proyeccion {
  /** Modelo (m) → pantalla (px). El eje Y del modelo apunta hacia arriba. */
  aPantalla: (x: number, y: number) => readonly [number, number];
  /** Metros por píxel invertido: px por metro. */
  k: number;
}

export const proyeccion = ({ ancho, alto, margen }: Vista): Proyeccion => {
  const xs = ESCENA.nodos.map((n) => n.x);
  const ys = ESCENA.nodos.map((n) => n.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);

  const k = Math.min((ancho - margen * 2) / (x1 - x0), (alto - margen * 2) / (y1 - y0));
  const anchoUtil = (x1 - x0) * k;
  const altoUtil = (y1 - y0) * k;
  const offX = (ancho - anchoUtil) / 2;
  const offY = (alto - altoUtil) / 2;

  return {
    k,
    aPantalla: (x, y) => [offX + (x - x0) * k, offY + altoUtil - (y - y0) * k] as const,
  };
};

export const nodo = (id: string) => {
  const n = ESCENA.nodos.find((item) => item.id === id);
  if (!n) throw new Error(`Nodo desconocido en la escena: ${id}`);
  return n;
};

export const resultadoNodal = (id: string) => {
  const r = ESCENA.resultadosNodales.find((item) => item.id === id);
  if (!r) throw new Error(`Sin resultado nodal para ${id}`);
  return r;
};

export interface Eje {
  /** Origen y extremo en modelo. */
  xi: number;
  yi: number;
  xj: number;
  yj: number;
  /** Versor axial y su normal (giro de +90°). */
  dx: number;
  dy: number;
  nx: number;
  ny: number;
  longitud: number;
}

export const ejeDeBarra = (idBarra: string): Eje => {
  const barra = ESCENA.barras.find((b) => b.id === idBarra);
  if (!barra) throw new Error(`Barra desconocida: ${idBarra}`);
  const i = nodo(barra.i);
  const j = nodo(barra.j);
  const L = Math.hypot(j.x - i.x, j.y - i.y);
  const dx = (j.x - i.x) / L;
  const dy = (j.y - i.y) / L;
  return { xi: i.x, yi: i.y, xj: j.x, yj: j.y, dx, dy, nx: -dy, ny: dx, longitud: L };
};

/**
 * Deformada de una barra en coordenadas de pantalla.
 * `u` y `v` del motor son locales; se llevan a globales con el versor axial y su
 * normal, y se amplifican por `escala` porque a tamaño real serían invisibles
 * (el desplome del pórtico es de milímetros sobre metros).
 */
export const trazoDeformada = (
  idBarra: string,
  escala: number,
  { aPantalla }: Proyeccion,
  avance = 1,
): string => {
  const eje = ejeDeBarra(idBarra);
  const barra = ESCENA.resultadosBarras.find((b) => b.id === idBarra);
  if (!barra) throw new Error(`Sin resultados para ${idBarra}`);

  const puntos = barra.deformada;
  const hasta = Math.max(2, Math.round(puntos.length * Math.min(1, Math.max(0, avance))));

  return puntos
    .slice(0, hasta)
    .map((p, k) => {
      const gx = eje.xi + eje.dx * p.x + escala * (eje.dx * p.u + eje.nx * p.v);
      const gy = eje.yi + eje.dy * p.x + escala * (eje.dy * p.u + eje.ny * p.v);
      const [sx, sy] = aPantalla(gx, gy);
      return `${k === 0 ? 'M' : 'L'}${sx.toFixed(2)},${sy.toFixed(2)}`;
    })
    .join(' ');
};

/** Mayor momento absoluto de toda la escena; fija la escala común del diagrama. */
export const momentoDeReferencia = (): number =>
  Math.max(
    ...ESCENA.resultadosBarras.flatMap((b) => [Math.abs(b.maxMomento), Math.abs(b.minMomento)]),
  );

/**
 * Área cerrada del diagrama de momentos de una barra, en px.
 * Se dibuja del lado de la normal, con la ordenada proporcional a M.
 */
export const areaMomento = (
  idBarra: string,
  altoPx: number,
  proy: Proyeccion,
  avance = 1,
): string => {
  const eje = ejeDeBarra(idBarra);
  const barra = ESCENA.resultadosBarras.find((b) => b.id === idBarra);
  if (!barra) throw new Error(`Sin resultados para ${idBarra}`);

  const mRef = momentoDeReferencia();
  const puntos = barra.diagrama;
  const hasta = Math.max(2, Math.round(puntos.length * Math.min(1, Math.max(0, avance))));
  const visibles = puntos.slice(0, hasta);

  const enModelo = (x: number, orden: number) => {
    const o = (orden / mRef) * (altoPx / proy.k);
    return [eje.xi + eje.dx * x + eje.nx * o, eje.yi + eje.dy * x + eje.ny * o] as const;
  };

  const superior = visibles.map((p) => {
    const [gx, gy] = enModelo(p.x, p.m);
    return proy.aPantalla(gx, gy);
  });

  const base = visibles
    .slice()
    .reverse()
    .map((p) => {
      const [gx, gy] = enModelo(p.x, 0);
      return proy.aPantalla(gx, gy);
    });

  const d = [...superior, ...base]
    .map(([x, y], k) => `${k === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ');

  return `${d} Z`;
};
