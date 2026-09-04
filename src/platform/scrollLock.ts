/**
 * Bloqueo de desplazamiento del anfitrión mientras hay una superficie modal.
 * ---------------------------------------------------------------------------
 * Dentro de un `WKWebView` el `scrollView` de UIKit sigue vivo por debajo del
 * documento. Con una hoja abierta, arrastrar sobre ella mueve además la vista
 * entera del anfitrión: la hoja se queda quieta y la aplicación se despega del
 * borde de la pantalla. En la web no pasa —`overscroll-behavior` lo contiene—,
 * pero ese CSS no llega a la vista nativa.
 *
 * El contador es lo que hace correcto el anidamiento: la Hoja de datos puede
 * abrir un diálogo encima, y cerrar el de encima no debe devolver el
 * desplazamiento mientras la de abajo siga abierta.
 */
import { sendToNative } from './nativeBridge';

let depth = 0;

/** Bloquea mientras el componente esté montado. Devuelve su liberación. */
export const holdScrollLock = (): (() => void) => {
  depth += 1;
  if (depth === 1) sendToNative({ kind: 'scroll.lock', locked: true });
  let released = false;
  return () => {
    if (released) return;
    released = true;
    depth -= 1;
    if (depth === 0) sendToNative({ kind: 'scroll.lock', locked: false });
  };
};

/** Sólo para pruebas: devuelve el contador a cero sin avisar al anfitrión. */
export const resetScrollLockForTests = (): void => { depth = 0; };
