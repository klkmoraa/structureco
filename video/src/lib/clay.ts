/**
 * Recetas de sombra Clay.
 *
 * El brandbook fija cuatro y sólo cuatro: `raised`, `raised-sm`, `pressed` e
 * `inset`. La regla que las gobierna es «salido o hundido: nunca las dos
 * cosas», así que cada elemento elige exactamente una.
 *
 * Los valores base están escritos para una interfaz a 1x. El video se compone
 * a 1080p/4K, donde una sombra de 34px se pierde: por eso todas las recetas
 * aceptan un `escala` que multiplica desplazamientos y desenfoques sin tocar
 * las opacidades, que son las que definen el material.
 */

import type { Mode } from './theme';

type Nivel = 'raised' | 'raisedSm' | 'pressed' | 'inset';

interface Capa {
  x: number;
  y: number;
  blur: number;
  color: string;
  inset?: boolean;
}

const recetas: Record<Mode, Record<Nivel, Capa[]>> = {
  dia: {
    raised: [
      { x: 13, y: 15, blur: 34, color: 'rgba(83,72,55,.17)' },
      { x: -10, y: -10, blur: 24, color: 'rgba(255,255,255,.95)' },
      { x: 0, y: 1, blur: 0, color: 'rgba(255,255,255,.9)', inset: true },
    ],
    raisedSm: [
      { x: 8, y: 9, blur: 19, color: 'rgba(83,72,55,.15)' },
      { x: -7, y: -7, blur: 16, color: 'rgba(255,255,255,.92)' },
    ],
    pressed: [
      { x: 5, y: 6, blur: 11, color: 'rgba(83,72,55,.18)' },
      { x: -3, y: -3, blur: 8, color: 'rgba(255,255,255,.75)' },
    ],
    inset: [
      { x: 6, y: 7, blur: 14, color: 'rgba(83,72,55,.17)', inset: true },
      { x: -6, y: -6, blur: 13, color: 'rgba(255,255,255,.92)', inset: true },
    ],
  },
  noche: {
    raised: [
      { x: 14, y: 16, blur: 30, color: 'rgba(0,0,0,.55)' },
      { x: -9, y: -9, blur: 20, color: 'rgba(62,92,102,.22)' },
      { x: 0, y: 1, blur: 0, color: 'rgba(255,255,255,.06)', inset: true },
    ],
    raisedSm: [
      { x: 8, y: 9, blur: 18, color: 'rgba(0,0,0,.5)' },
      { x: -6, y: -6, blur: 14, color: 'rgba(62,92,102,.18)' },
    ],
    pressed: [
      { x: 5, y: 6, blur: 11, color: 'rgba(0,0,0,.55)' },
      { x: -3, y: -3, blur: 8, color: 'rgba(62,92,102,.14)' },
    ],
    inset: [
      { x: 6, y: 7, blur: 13, color: 'rgba(0,0,0,.55)', inset: true },
      { x: -5, y: -5, blur: 11, color: 'rgba(62,92,102,.24)', inset: true },
    ],
  },
};

const pinta = (capas: Capa[], escala: number): string =>
  capas
    .map((c) => {
      const partes = [
        `${(c.x * escala).toFixed(2)}px`,
        `${(c.y * escala).toFixed(2)}px`,
        `${(c.blur * escala).toFixed(2)}px`,
        c.color,
      ].join(' ');
      return c.inset ? `inset ${partes}` : partes;
    })
    .join(', ');

export const clay = (mode: Mode, nivel: Nivel = 'raised', escala = 1): string =>
  pinta(recetas[mode][nivel], escala);

/**
 * Interpola entre «salido» y «hundido» sin mezclarlos: cruza por un punto
 * neutro en `t = 0.5`, de modo que nunca hay sombra externa e interna a la vez
 * con peso pleno. Sirve para animar una pulsación.
 */
export const clayPulsado = (mode: Mode, t: number, escala = 1): string => {
  if (t <= 0.5) {
    return pinta(
      recetas[mode].raised.map((c) => ({ ...c, x: c.x * (1 - t * 2), y: c.y * (1 - t * 2) })),
      escala,
    );
  }
  const u = (t - 0.5) * 2;
  return pinta(
    recetas[mode].inset.map((c) => ({ ...c, x: c.x * u, y: c.y * u })),
    escala,
  );
};

/**
 * Brillo especular superior: la arcilla del brandbook siempre tiene una lengua
 * de luz en el borde alto. Se aplica como `background-image` encima del color.
 */
export const lustre = (mode: Mode): string =>
  mode === 'noche'
    ? 'linear-gradient(180deg, rgba(255,255,255,.07) 0%, rgba(255,255,255,0) 42%)'
    : 'linear-gradient(180deg, rgba(255,255,255,.85) 0%, rgba(255,255,255,0) 46%)';
