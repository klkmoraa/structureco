import { downloadPortableBytes } from '../utils/portableDownload';

/** Superficie mínima de File System Access, sin depender de tipos experimentales. */
interface WritableHandle {
  createWritable(): Promise<{ write(data: BufferSource): Promise<void>; close(): Promise<void> }>;
  getFile?(): Promise<File>;
  readonly name: string;
}

interface FilePickerWindow {
  showSaveFilePicker?: (options: unknown) => Promise<WritableHandle>;
}

export interface SaveRequest {
  bytes: Uint8Array;
  filename: string;
  mimeType: string;
  extension: string;
  description: string;
  /** Manejador de un guardado anterior para escribir el mismo archivo. */
  handle?: unknown;
}

export type SaveOutcome =
  | { status: 'written'; handle: unknown; filename: string }
  | { status: 'downloaded'; filename: string }
  | { status: 'cancelled' };

export interface LaunchedFile {
  file: File;
  /** Manejador del sistema operativo, cuando el navegador lo proporciona. */
  handle?: unknown;
}

const asWritable = (handle: unknown): WritableHandle | null =>
  handle && typeof (handle as WritableHandle).createWritable === 'function' ? handle as WritableHandle : null;

const isAbort = (error: unknown): boolean =>
  error instanceof DOMException && (error.name === 'AbortError' || error.name === 'NotAllowedError');

const write = async (handle: WritableHandle, bytes: Uint8Array): Promise<void> => {
  const stream = await handle.createWritable();
  // Materializa su propio buffer: una vista puede abarcar bytes ajenos al archivo.
  await stream.write(bytes.slice().buffer);
  await stream.close();
};

const download = (request: SaveRequest): SaveOutcome => {
  downloadPortableBytes(request.bytes, request.filename, request.mimeType);
  return { status: 'downloaded', filename: request.filename };
};

/**
 * Guarda sobre un archivo elegido cuando la API existe. La descarga conocida es
 * la reserva normal para Firefox, Safari o permisos que dejan de ser válidos.
 */
export const saveBytes = async (request: SaveRequest): Promise<SaveOutcome> => {
  const existing = asWritable(request.handle);
  if (existing) {
    try {
      await write(existing, request.bytes);
      return { status: 'written', handle: existing, filename: existing.name };
    } catch (error) {
      return isAbort(error) ? { status: 'cancelled' } : download(request);
    }
  }

  const picker = (window as unknown as FilePickerWindow).showSaveFilePicker;
  if (!picker) return download(request);

  try {
    const handle = await picker({
      suggestedName: request.filename,
      types: [{ description: request.description, accept: { [request.mimeType]: [request.extension] } }],
    });
    await write(handle, request.bytes);
    return { status: 'written', handle, filename: handle.name };
  } catch (error) {
    return isAbort(error) ? { status: 'cancelled' } : download(request);
  }
};

/**
 * Consume el archivo con el que el sistema operativo abrió la aplicación.
 * Declarar `file_handlers` sin atender esta cola haría que un doble clic
 * arrancara StructureCo pero ignorara el expediente.
 */
export const consumeLaunchQueue = (onFile: (launched: LaunchedFile) => void): void => {
  const queue = (window as unknown as {
    launchQueue?: { setConsumer(consumer: (params: { files?: WritableHandle[] }) => void): void };
  }).launchQueue;
  if (!queue) return;
  queue.setConsumer(async (params) => {
    const [handle] = params.files ?? [];
    if (!handle?.getFile) return;
    try { onFile({ file: await handle.getFile(), handle }); } catch { /* sin permiso: arranque normal */ }
  });
};
