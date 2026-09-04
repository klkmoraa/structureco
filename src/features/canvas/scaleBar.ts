import { formatValue } from '../../utils/numberFormat';

/**
 * Barra de escala gráfica del lienzo 2D.
 *
 * El lienzo publicaba antes «Escala 1.57×», un cociente contra un zoom de
 * referencia interno que no dice nada sobre el dibujo: no se puede medir con
 * él, no aparece en una lámina y cambia de significado si cambia el zoom base.
 * Una barra de escala sí es información de plano: una longitud redonda del
 * modelo, dibujada a su tamaño real en pantalla.
 */
export interface ScaleBarPlan {
  /** Longitud representada, ya en unidades de presentación. */
  length: number;
  /** Ancho en píxeles que ocupa esa longitud. */
  widthPx: number;
}

/** Mantissas de una escala legible: 1, 2 y 5 por década. */
const NICE_MANTISSAS = [1, 2, 5] as const;

const MIN_BAR_PX = 34;

/**
 * Mayor longitud redonda que cabe en `maxWidthPx`.
 *
 * `pixelsPerUnit` es cuántos píxeles mide una unidad **de presentación**: el
 * llamador ya aplicó la conversión de unidades, así que la barra rotula metros,
 * pies o pulgadas sin que este módulo conozca ningún sistema.
 */
export const planScaleBar = (pixelsPerUnit: number, maxWidthPx: number): ScaleBarPlan | null => {
  if (!Number.isFinite(pixelsPerUnit) || pixelsPerUnit <= 0) return null;
  if (!Number.isFinite(maxWidthPx) || maxWidthPx < MIN_BAR_PX) return null;

  const rawLength = maxWidthPx / pixelsPerUnit;
  const decade = 10 ** Math.floor(Math.log10(rawLength));
  let best: number | null = null;
  // Se recorren dos décadas para cubrir el caso en que `rawLength` cae justo
  // por encima de un 5·10ⁿ y la mantissa correcta vive en la década siguiente.
  for (const exponent of [decade / 10, decade, decade * 10]) {
    for (const mantissa of NICE_MANTISSAS) {
      const candidate = mantissa * exponent;
      if (candidate <= rawLength && (best === null || candidate > best)) best = candidate;
    }
  }
  if (best === null || !Number.isFinite(best) || best <= 0) return null;

  const widthPx = best * pixelsPerUnit;
  if (widthPx < MIN_BAR_PX) return null;
  return { length: best, widthPx };
};

/**
 * Rótulo de la barra: 2 m, 0.5 m, 12.5 m.
 *
 * Una escala es siempre un número redondo, así que se rotula sin decimales de
 * relleno —«1 m», no «1.000 m»—, pero pasa por la misma política numérica que
 * el resto del producto para que un valor no finito siga siendo el marcador de
 * ausencia y nunca un `NaN` en pantalla.
 */
export const scaleBarLabel = (length: number, unit: string): string =>
  formatValue(length, unit, 'canvas');
