/**
 * Capa de plataforma: lo que la interfaz necesita saber del dispositivo.
 * ---------------------------------------------------------------------------
 * Publica en `<html>` un puñado de atributos que el CSS consume para
 * comportarse como una aplicación y no como una página:
 *
 *   data-platform   ios | android | macos | other
 *   data-standalone true cuando corre instalada (PWA) o dentro del shell nativo
 *   data-native     true sólo dentro del shell Swift
 *   data-pointer    coarse | fine
 *
 * Y mantiene tres variables vivas que ninguna media query puede dar:
 *
 *   --sc-safe-*        insets reales (el anfitrión nativo los sobrescribe)
 *   --sc-keyboard-inset alto del teclado en pantalla, vía `visualViewport`
 *   --sc-viewport-h    alto visible real, inmune a la barra dinámica de Safari
 *
 * Ninguna de estas señales toca el modelo, el solver ni la persistencia: son
 * hechos del dispositivo, y sólo cambian presentación.
 */
import { installNativeBridge, isNativeHost, onNativeMessage, sendToNative } from './nativeBridge';
import { emitLaunchedFile } from './launchedFile';

export type NativePlatform = 'ios' | 'android' | 'macos' | 'other';

const root = (): HTMLElement | null => (typeof document === 'undefined' ? null : document.documentElement);

/**
 * iPadOS 13+ se anuncia como Macintosh. La única señal fiable que lo separa de
 * un Mac de escritorio es que tenga pantalla táctil: ningún Mac la expone.
 */
export const detectPlatform = (): NativePlatform => {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  const touchPoints = navigator.maxTouchPoints ?? 0;
  if (/iPhone|iPod/.test(ua)) return 'ios';
  if (/iPad/.test(ua)) return 'ios';
  if (/Macintosh/.test(ua) && touchPoints > 1) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Macintosh|Mac OS X/.test(ua)) return 'macos';
  return 'other';
};

/** Instalada en la pantalla de inicio, en modo app, o dentro del shell nativo. */
export const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (isNativeHost()) return true;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia?.('(display-mode: standalone)').matches === true;
};

/**
 * Los mensajes del puente son JSON, así que un archivo viaja en base64. La
 * decodificación puede fallar con una carga corrupta y eso no puede tumbar el
 * despacho: se devuelve `null` y el archivo simplemente no se abre.
 */
const decodeBase64File = (base64: string, filename: string, mimeType: string): File | null => {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new File([bytes], filename, { type: mimeType });
  } catch {
    return null;
  }
};

const setVar = (name: string, value: string) => {
  root()?.style.setProperty(name, value);
};

/**
 * El teclado de iOS no reduce el layout viewport: lo tapa. `visualViewport` es
 * lo único que lo ve, y sin esta variable un campo al pie de una hoja queda
 * debajo del teclado sin que ningún `dvh` lo note.
 */
const trackVisualViewport = (): (() => void) => {
  if (typeof window === 'undefined') return () => undefined;
  const viewport = window.visualViewport;
  if (!viewport) {
    setVar('--sc-keyboard-inset', '0px');
    return () => undefined;
  }
  const sync = () => {
    const occluded = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
    // Por debajo de 90 px lo que se mueve es la barra de direcciones de Safari,
    // no el teclado. Tratarla como teclado haría saltar toda la interfaz al
    // desplazarse.
    setVar('--sc-keyboard-inset', `${occluded > 90 ? Math.round(occluded) : 0}px`);
    setVar('--sc-viewport-h', `${Math.round(viewport.height)}px`);
  };
  sync();
  viewport.addEventListener('resize', sync);
  viewport.addEventListener('scroll', sync);
  return () => {
    viewport.removeEventListener('resize', sync);
    viewport.removeEventListener('scroll', sync);
  };
};

/**
 * La barra de estado de iOS se tiñe con `<meta name="theme-color">`. Sin esto,
 * al cambiar a Noche la aplicación queda con una franja clara arriba que
 * delata que es una web dentro de un marco.
 */
export const syncStatusBarTheme = (theme: 'light' | 'dark'): void => {
  if (typeof document === 'undefined') return;
  const color = getComputedStyle(document.documentElement).getPropertyValue('--sc-color-bg-app').trim();
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  for (const meta of metas) meta.remove();
  const meta = document.createElement('meta');
  meta.name = 'theme-color';
  meta.content = color || (theme === 'dark' ? '#07161b' : '#f3eee4');
  document.head.append(meta);
  sendToNative({ kind: 'statusBar.style', style: theme === 'dark' ? 'light' : 'dark' });
};

/**
 * Monta la capa de plataforma. Devuelve su desmontaje para que un `useEffect`
 * la retire sin dejar oyentes colgando.
 */
export const installNativeShell = (): (() => void) => {
  const element = root();
  if (!element || typeof window === 'undefined') return () => undefined;

  const platform = detectPlatform();
  element.dataset.platform = platform;
  element.dataset.standalone = String(isStandalone());
  element.dataset.native = String(isNativeHost());

  const pointerQuery = window.matchMedia?.('(pointer: coarse)');
  const syncPointer = () => {
    element.dataset.pointer = pointerQuery?.matches ? 'coarse' : 'fine';
  };
  syncPointer();
  pointerQuery?.addEventListener('change', syncPointer);

  const uninstallBridge = installNativeBridge();
  const stopViewport = trackVisualViewport();

  const stopMessages = onNativeMessage((message) => {
    if (message.kind === 'safeArea') {
      setVar('--sc-safe-top', `${message.insets.top}px`);
      setVar('--sc-safe-right', `${message.insets.right}px`);
      setVar('--sc-safe-bottom', `${message.insets.bottom}px`);
      setVar('--sc-safe-left', `${message.insets.left}px`);
      return;
    }
    if (message.kind === 'keyboard') {
      setVar('--sc-keyboard-inset', `${Math.max(0, message.height)}px`);
      return;
    }
    if (message.kind === 'openFile') {
      // «Abrir con structureCo» desde Archivos, Correo o AirDrop. Entra por el
      // mismo buzón que la cola del sistema operativo en escritorio, así que
      // acaba en el importador con revisión, no sustituyendo el proyecto.
      const file = decodeBase64File(message.base64, message.filename, message.mimeType);
      if (file) emitLaunchedFile({ file });
    }
  });

  /*
   * El zoom por doble toque lo desactiva `touch-action: manipulation` desde el
   * CSS (`platform/native.css`), no un oyente.
   *
   * La primera versión de esta capa cancelaba en JavaScript el segundo
   * `touchend` rápido, y eso tenía un daño colateral serio: `preventDefault` en
   * `touchend` cancela también el `click` sintético, así que tocar dos veces
   * seguidas el «+» del zoom perdía la segunda pulsación. La regla de CSS hace
   * exactamente lo que hay que hacer —quita el doble toque y deja intacto el
   * clic— y es además la que entiende el compositor, sin un oyente por toque.
   *
   * Lo que sí necesita un oyente es el pellizco de Safari sobre el chrome:
   * `touch-action: manipulation` lo sigue permitiendo, y ampliar la barra
   * superior o el inspector sólo los desalinea. El lienzo no se ve afectado
   * porque declara `touch-action: none` y resuelve su propio pellizco con
   * eventos de puntero, no con los `gesture*` de WebKit.
   */
  const blockGestureZoom = (event: Event) => event.preventDefault();
  document.addEventListener('gesturestart', blockGestureZoom);

  return () => {
    pointerQuery?.removeEventListener('change', syncPointer);
    document.removeEventListener('gesturestart', blockGestureZoom);
    stopMessages();
    stopViewport();
    uninstallBridge();
  };
};
