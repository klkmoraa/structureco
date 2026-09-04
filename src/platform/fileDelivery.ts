/**
 * Entrega de archivos al usuario, con el camino correcto en cada anfitrión.
 * ---------------------------------------------------------------------------
 * El producto exporta SVG, PNG, CSV, JSON, PDF y el expediente `.structureco`.
 * Hasta ahora todos salían por el mismo sitio: un `<a download>` sintético.
 *
 * Eso funciona en un navegador de escritorio y **no funciona dentro de un
 * `WKWebView`**. Un enlace con `download` en el shell nativo no descarga nada:
 * el toque no hace absolutamente nada visible, sin error ni aviso, y el usuario
 * cree que la exportación falló. Es el fallo más grave que aparecería el primer
 * día de vida de la aplicación en iOS, y no lo revela ninguna prueba de
 * navegador porque el navegador sí lo soporta.
 *
 * Este módulo es el único punto por el que sale un archivo, con tres caminos en
 * orden de fidelidad:
 *
 *   1. Anfitrión nativo → `share.file`, y iOS abre su hoja de compartir real
 *      (Archivos, AirDrop, Correo…). Es también la única forma de *guardar* en
 *      iOS: el sistema no tiene una carpeta de descargas para una app.
 *   2. `navigator.share` con archivos → Safari en iOS y Chrome en Android.
 *   3. `<a download>` → escritorio.
 *
 * Devuelve cómo salió el archivo para que quien exporta pueda decirlo con
 * precisión en vez de afirmar «descargado» siempre.
 */
import { isNativeHost, sendToNative } from './nativeBridge';

export type DeliveryOutcome = 'native' | 'shared' | 'downloaded' | 'cancelled';

/**
 * `btoa` sólo acepta latin-1, así que los bytes se convierten a caracteres uno
 * a uno. El troceado no es una precaución teórica: `String.fromCharCode` con un
 * expediente de varios MB desplegado en argumentos revienta la pila de
 * llamadas en WebKit.
 */
const toBase64 = (bytes: Uint8Array): string => {
  const CHUNK = 0x8000;
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK));
  }
  return btoa(binary);
};

const anchorDownload = (blob: Blob, filename: string): DeliveryOutcome => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Safari en iOS puede seguir leyendo la URL después del clic sintético.
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return 'downloaded';
};

export interface DeliveryRequest {
  blob: Blob;
  filename: string;
  mimeType: string;
  /** Título de la hoja de compartir. */
  title?: string;
  /**
   * `false` evita la hoja de compartir del navegador y baja directo a la
   * descarga. Lo usan las rutas que ya preguntaron al usuario dónde guardar.
   */
  allowWebShare?: boolean;
}

/** Entrega un archivo por el mejor camino disponible en este anfitrión. */
export const deliverFile = async ({
  blob,
  filename,
  mimeType,
  title = 'structureCo',
  allowWebShare = true,
}: DeliveryRequest): Promise<DeliveryOutcome> => {
  if (isNativeHost()) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const sent = sendToNative({ kind: 'share.file', filename, mimeType, base64: toBase64(bytes) });
    if (sent) return 'native';
  }

  if (allowWebShare && typeof navigator.share === 'function') {
    const file = new File([blob], filename, { type: mimeType });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title });
        return 'shared';
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
        // Safari rechaza si una exportación asíncrona perdió la activación del
        // usuario. La descarga sigue siendo una salida válida.
      }
    }
  }

  return anchorDownload(blob, filename);
};

/**
 * Variante síncrona para las rutas que aún no pueden esperar una promesa.
 * Dentro del shell nativo la entrega sigue siendo asíncrona —hay que leer los
 * bytes—, así que se lanza y se olvida; fuera de él es el mismo `<a download>`
 * de siempre, sin ningún cambio de comportamiento.
 */
export const deliverFileSync = (blob: Blob, filename: string, mimeType: string): void => {
  if (isNativeHost()) {
    void deliverFile({ blob, filename, mimeType, allowWebShare: false });
    return;
  }
  anchorDownload(blob, filename);
};

/** Comparte un texto o un enlace; sin anfitrión nativo cae en `navigator.share`. */
export const shareLink = async (title: string, text?: string, url?: string): Promise<boolean> => {
  if (sendToNative({ kind: 'share', title, text, url })) return true;
  if (typeof navigator.share !== 'function') return false;
  try {
    await navigator.share({ title, text, url });
    return true;
  } catch {
    return false;
  }
};
