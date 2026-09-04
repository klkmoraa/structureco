import { deliverFile, deliverFileSync } from '../platform/fileDelivery';

export const downloadPortableBytes = (bytes: Uint8Array, filename: string, mimeType: string): void => {
  deliverFileSync(new Blob([bytes as BlobPart], { type: mimeType }), filename, mimeType);
};

/**
 * Comparte cuando el anfitrión sabe hacerlo y descarga cuando no.
 *
 * El orden lo decide `platform/fileDelivery`: shell nativo → hoja de compartir
 * de iOS, `navigator.share` → hoja del navegador, y `<a download>` al final.
 * Aquí sólo queda la traducción al vocabulario que ya usaban los llamadores.
 */
export const shareOrDownloadPortableBytes = async (
  bytes: Uint8Array,
  filename: string,
  mimeType: string,
  title = 'Expediente structureCo',
): Promise<'shared' | 'downloaded' | 'cancelled'> => {
  const outcome = await deliverFile({
    blob: new Blob([bytes as BlobPart], { type: mimeType }),
    filename,
    mimeType,
    title,
  });
  if (outcome === 'native') return 'shared';
  return outcome;
};
