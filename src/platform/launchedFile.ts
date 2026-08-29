import { consumeLaunchQueue, type LaunchedFile } from './fileSystem';

// La cola del SO llega antes de React; este buzón de un solo uso evita perderla
// sin volver a abrir el mismo expediente al regresar a Inicio.
let pending: LaunchedFile | null = null;
const listeners = new Set<(launched: LaunchedFile) => void>();
let started = false;

export const startLaunchQueue = (): void => {
  if (started) return;
  started = true;
  consumeLaunchQueue((launched) => {
    if (listeners.size) { listeners.forEach((listener) => listener(launched)); return; }
    pending = launched;
  });
};

export const claimLaunchedFile = (): LaunchedFile | null => {
  const claimed = pending;
  pending = null;
  return claimed;
};

export const onLaunchedFile = (listener: (launched: LaunchedFile) => void): (() => void) => {
  listeners.add(listener);
  const waiting = claimLaunchedFile();
  if (waiting) listener(waiting);
  return () => listeners.delete(listener);
};

export const resetLaunchQueueForTests = (): void => { pending = null; listeners.clear(); started = false; };
