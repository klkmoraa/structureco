/**
 * Persistencia local de Space 3D con copia de seguridad.
 *
 * Claves propias, separadas del producto 2D: abrir Space 3D nunca puede tocar
 * el proyecto plano del usuario.
 *
 * El invariante del backup es simple y deliberado: el backup sólo se escribe
 * con contenido que ya se ha comprobado que parsea. Si el primary se corrompe
 * por cualquier motivo, guardar encima no arrastra esa corrupción al backup, y
 * el usuario conserva el último estado bueno.
 */
import { parseSpace3DProject, serializeSpace3DProject } from './codec';
import type { Space3DProjectV1 } from '../model/types';

export const SPACE3D_STORAGE_KEY = 'structureco:space3d:v1';
export const SPACE3D_BACKUP_STORAGE_KEY = 'structureco:space3d:v1:backup';

export type Space3DStorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const browserStorage = (): Space3DStorageLike | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    // Safari en modo privado y algunos entornos embebidos lanzan al tocar `localStorage`.
    return null;
  }
};

const readValid = (storage: Space3DStorageLike, key: string): Space3DProjectV1 | null => {
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    return null;
  }
  if (raw === null) return null;
  try {
    return parseSpace3DProject(raw);
  } catch {
    return null;
  }
};

export const loadSpace3DProject = (storage: Space3DStorageLike | null = browserStorage()): Space3DProjectV1 | null => {
  if (!storage) return null;
  return readValid(storage, SPACE3D_STORAGE_KEY) ?? readValid(storage, SPACE3D_BACKUP_STORAGE_KEY);
};

/** Devuelve `true` sólo si el proyecto quedó realmente escrito y es recuperable. */
export const saveSpace3DProject = (
  project: Space3DProjectV1,
  storage: Space3DStorageLike | null = browserStorage(),
): boolean => {
  if (!storage) return false;

  let payload: string;
  try {
    payload = serializeSpace3DProject(project);
    // Serializar no basta: el archivo tiene que volver a entrar por el códec.
    parseSpace3DProject(payload);
  } catch {
    return false;
  }

  try {
    const current = storage.getItem(SPACE3D_STORAGE_KEY);
    if (current !== null && current !== payload && readValid(storage, SPACE3D_STORAGE_KEY)) {
      storage.setItem(SPACE3D_BACKUP_STORAGE_KEY, current);
    }
    storage.setItem(SPACE3D_STORAGE_KEY, payload);
    return true;
  } catch {
    return false;
  }
};

export const clearSpace3DProject = (storage: Space3DStorageLike | null = browserStorage()): void => {
  if (!storage) return;
  try {
    storage.removeItem(SPACE3D_STORAGE_KEY);
    storage.removeItem(SPACE3D_BACKUP_STORAGE_KEY);
  } catch {
    // Un almacenamiento que no deja borrar tampoco deja guardar: no hay nada que rescatar.
  }
};
