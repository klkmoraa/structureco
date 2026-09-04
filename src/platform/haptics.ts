/**
 * Retroalimentación háptica con degradación honesta.
 * ---------------------------------------------------------------------------
 * Tres destinos, en orden de fidelidad:
 *   1. Shell nativo (Swift) → `UIImpactFeedbackGenerator` real.
 *   2. `navigator.vibrate` → Android y Chrome de escritorio con motor.
 *   3. Nada. Safari en iOS no expone vibración a la web, y fingirla con una
 *      animación no es háptica: es ruido visual. Se calla.
 *
 * La regla de uso es la de iOS, no «un toque por clic»: la háptica marca un
 * cambio de estado que el usuario provocó y no puede ver entero —una hoja que
 * se cierra al arrastrar, una selección que engancha al snap, un análisis que
 * termina—. Un botón que ya se hunde visualmente no necesita motor.
 */
import { sendToNative, type NativeImpactStyle, type NativeNotificationStyle } from './nativeBridge';

/** Duraciones del respaldo `navigator.vibrate`, en ms. */
const VIBRATION_MS: Record<NativeImpactStyle, number> = {
  light: 8,
  soft: 10,
  medium: 14,
  rigid: 16,
  heavy: 22,
};

const NOTIFICATION_PATTERN: Record<NativeNotificationStyle, number[]> = {
  success: [10, 40, 16],
  warning: [16, 60, 16],
  error: [22, 50, 22, 50, 22],
};

let enabled = true;

const vibrate = (pattern: number | number[]): void => {
  if (!enabled || typeof navigator === 'undefined') return;
  const vibrateFn = (navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean }).vibrate as
    ((this: Navigator, pattern: number | number[]) => boolean) | undefined;
  if (typeof vibrateFn !== 'function') return;
  try {
    vibrateFn.call(navigator, pattern);
  } catch {
    /* Un motor ocupado o una política del navegador no son un error del producto. */
  }
};

export const haptics = {
  /** Apaga o enciende toda la capa; lo consume la preferencia del usuario. */
  setEnabled(next: boolean) {
    enabled = next;
  },
  get isEnabled() {
    return enabled;
  },
  /** Contacto físico: la hoja tocó el borde, la pieza cayó en su sitio. */
  impact(style: NativeImpactStyle = 'light') {
    if (!enabled) return;
    if (sendToNative({ kind: 'haptic.impact', style })) return;
    vibrate(VIBRATION_MS[style]);
  },
  /** Cambio de selección discreta: pestaña, segmento, herramienta, snap. */
  selection() {
    if (!enabled) return;
    if (sendToNative({ kind: 'haptic.selection' })) return;
    vibrate(6);
  },
  /** Resultado de una operación larga: análisis, importación, exportación. */
  notification(style: NativeNotificationStyle) {
    if (!enabled) return;
    if (sendToNative({ kind: 'haptic.notification', style })) return;
    vibrate(NOTIFICATION_PATTERN[style]);
  },
};
