/**
 * Tokens de la identidad Clay de structureCo.
 *
 * Copiados literalmente de `brand/brandbook-clay.html` (fuente oficial protegida).
 * Este archivo es una lectura de esos valores para el motor de video; no los
 * reemplaza ni los redefine. Si el brandbook cambia, este archivo se actualiza
 * detrás de él, nunca al revés.
 */

export type Mode = 'dia' | 'noche';

export interface Surface {
  ink: string;
  muted: string;
  canvas: string;
  base: string;
  surface: string;
  raised: string;
  line: string;
}

export const dia: Surface = {
  ink: '#23312c',
  muted: '#607068',
  canvas: '#fffdf9',
  base: '#f7f4ee',
  surface: '#fffcf7',
  raised: '#ffffff',
  line: '#ded8ce',
};

export const noche: Surface = {
  ink: '#f4f8f6',
  muted: '#a6b6b0',
  canvas: '#0d161b',
  base: '#0a1116',
  surface: '#15232b',
  raised: '#1e313b',
  line: '#33474f',
};

/** Familia de marca: una sola lima, igual en Día y en Noche. */
export const brand = {
  base: '#89d448',
  ink: '#16250d',
  hover: '#9ade60',
  pressed: '#6fbb2e',
  edge: '#468c09',
};

/** Un color, un significado técnico. No se usan fuera de su magnitud. */
export const tecnica = {
  axial: '#0f95d1',
  momento: '#ed4b46',
  cortante: '#059669',
  deformada: '#8b5cf6',
  reaccion: '#3a72e3',
  eje: '#ad5e18',
  seleccion: '#6a5df2',
  cota: '#b8860b',
} as const;

export const semantica = {
  exito: '#2f9a2a',
  error: '#d92e28',
  aviso: '#d9720a',
  canario: '#f4d75e',
  canarioInk: '#6f5210',
  aula: '#c94a8f',
  aulaSolid: '#c23e82',
} as const;

export const radio = {
  lg: 26,
  md: 18,
  sm: 13,
  pill: 999,
} as const;

export const fuente = {
  display: "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif",
  sans: "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, Menlo, monospace",
} as const;

export const superficie = (mode: Mode): Surface => (mode === 'noche' ? noche : dia);

/** Mezcla dos colores hex en espacio sRGB. `t` va de 0 (a) a 1 (b). */
export const mezcla = (a: string, b: string, t: number): string => {
  const parse = (hex: string) => {
    const h = hex.replace('#', '');
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ] as const;
  };
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  const to = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${to(r1 + (r2 - r1) * t)}${to(g1 + (g2 - g1) * t)}${to(b1 + (b2 - b1) * t)}`;
};

/** Igual que `color-mix(in srgb, color X%, superficie)` del brandbook. */
export const suave = (color: string, mode: Mode, pct = 14): string =>
  mezcla(superficie(mode).surface, color, pct / 100);

export const alfa = (hex: string, a: number): string => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};
