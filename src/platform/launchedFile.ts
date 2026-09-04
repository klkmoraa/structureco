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

/**
 * Entrega un archivo al mismo buzón que usa la cola del sistema operativo.
 *
 * Lo consume el shell nativo: en iOS, «Abrir con structureCo» desde Archivos o
 * el Correo no llega por `launchQueue` —esa API no existe en WKWebView— sino
 * como un mensaje del puente. El destino es idéntico: el importador con
 * revisión y confirmación explícita, nunca una sustitución silenciosa del
 * proyecto abierto.
 */
export const emitLaunchedFile = (launched: LaunchedFile): void => {
  if (listeners.size) { listeners.forEach((listener) => listener(launched)); return; }
  pending = launched;
};

export const onLaunchedFile = (listener: (launched: LaunchedFile) => void): (() => void) => {
  listeners.add(listener);
  const waiting = claimLaunchedFile();
  if (waiting) listener(waiting);
  return () => listeners.delete(listener);
};

export const resetLaunchQueueForTests = (): void => { pending = null; listeners.clear(); started = false; };
