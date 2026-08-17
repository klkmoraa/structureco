import { interpolate, spring, Easing } from 'remotion';

/**
 * Curvas del brandbook traducidas a Remotion.
 * `--ease-standard: cubic-bezier(.22,1,.36,1)` y `--ease-press: cubic-bezier(.2,.8,.2,1)`.
 */
export const easeEstandar = Easing.bezier(0.22, 1, 0.36, 1);
export const easePulsacion = Easing.bezier(0.2, 0.8, 0.2, 1);

/** Muelle blando: la arcilla pesa, no rebota como goma. */
export const muelleArcilla = { damping: 18, mass: 0.9, stiffness: 120 };
/** Muelle de aparición rápida para elementos pequeños (chips, píldoras). */
export const muelleChip = { damping: 14, mass: 0.5, stiffness: 180 };

interface EntradaOpts {
  frame: number;
  fps: number;
  retraso?: number;
  config?: typeof muelleArcilla;
}

/** Progreso 0→1 con muelle, listo para escalar/desplazar una pieza que entra. */
export const entrada = ({ frame, fps, retraso = 0, config = muelleArcilla }: EntradaOpts): number =>
  spring({ frame: frame - retraso, fps, config, durationInFrames: 34 });

/**
 * Ventana de escena: 0 antes de `desde`, 1 durante el cuerpo y 0 después de
 * `hasta`. Evita cortes secos entre bloques de una misma composición.
 */
export const ventana = (
  frame: number,
  desde: number,
  hasta: number,
  fundido = 14,
): number =>
  interpolate(
    frame,
    [desde, desde + fundido, hasta - fundido, hasta],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeEstandar },
  );

/** Deriva lenta y continua: mantiene el cuadro vivo sin llamar la atención. */
export const flotar = (frame: number, periodo: number, amplitud: number, fase = 0): number =>
  Math.sin((frame / periodo) * Math.PI * 2 + fase) * amplitud;

/** Recorte 0→1 sobre un tramo de frames, con la curva estándar. */
export const tramo = (
  frame: number,
  desde: number,
  hasta: number,
  easing = easeEstandar,
): number =>
  interpolate(frame, [desde, hasta], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing,
  });
