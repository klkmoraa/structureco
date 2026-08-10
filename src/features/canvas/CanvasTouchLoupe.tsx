import { formatFixed } from '../../utils/numberFormat';

export interface CanvasTouchLoupeProps {
  /** Punto dentro del lienzo, en píxeles locales del host. */
  screenX: number;
  screenY: number;
  modelX: number;
  modelY: number;
  lengthLabel: string;
}

/**
 * Lupa táctil. En un dedo el punto de contacto queda tapado por el propio dedo,
 * así que la retícula y la cota se dibujan desplazadas hacia arriba: lo que se
 * está apuntando se lee sin levantar la mano.
 *
 * Es sólo lectura y `aria-hidden`: la posición ya la anuncia el readout de
 * coordenadas del chrome, y repetirla en el árbol de accesibilidad sería ruido.
 */
export const CanvasTouchLoupe = ({ screenX, screenY, modelX, modelY, lengthLabel }: CanvasTouchLoupeProps) => (
  <div
    className="canvas-touch-loupe"
    style={{ left: `${screenX}px`, top: `${screenY}px` }}
    aria-hidden="true"
    data-canvas-chrome="touch-loupe"
  >
    <span className="canvas-touch-loupe-reticle" />
    <span className="canvas-touch-loupe-coord">
      X {formatFixed(modelX, 2)} · Y {formatFixed(modelY, 2)} {lengthLabel}
    </span>
  </div>
);
