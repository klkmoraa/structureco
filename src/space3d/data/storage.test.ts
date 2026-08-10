import { beforeEach, describe, expect, it } from 'vitest';
import {
  SPACE3D_BACKUP_STORAGE_KEY,
  SPACE3D_STORAGE_KEY,
  clearSpace3DProject,
  loadSpace3DProject,
  saveSpace3DProject,
} from './storage';
import { serializeSpace3DProject } from './codec';
import { createBlankSpace3DProject, createSpace3DPortalExample } from '../model/defaultProject';

class MemoryStorage implements Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  readonly map = new Map<string, string>();
  throwOnWrite = false;

  getItem(key: string) { return this.map.get(key) ?? null; }

  setItem(key: string, value: string) {
    if (this.throwOnWrite) throw new Error('QuotaExceededError');
    this.map.set(key, value);
  }

  removeItem(key: string) { this.map.delete(key); }
}

let storage: MemoryStorage;
const example = createSpace3DPortalExample();

beforeEach(() => { storage = new MemoryStorage(); });

describe('Space3D storage', () => {
  it('usa claves separadas del producto 2D', () => {
    expect(SPACE3D_STORAGE_KEY).toBe('structureco:space3d:v1');
    expect(SPACE3D_BACKUP_STORAGE_KEY).toBe('structureco:space3d:v1:backup');
  });

  it('devuelve null cuando no hay nada guardado', () => {
    expect(loadSpace3DProject(storage)).toBeNull();
  });

  it('guarda y recupera el proyecto', () => {
    expect(saveSpace3DProject(example, storage)).toBe(true);
    expect(loadSpace3DProject(storage)).toEqual(example);
  });

  it('promueve el primary válido a backup antes de sobrescribirlo', () => {
    saveSpace3DProject(example, storage);
    const blank = createBlankSpace3DProject();
    saveSpace3DProject(blank, storage);
    expect(loadSpace3DProject(storage)).toEqual(blank);
    expect(storage.getItem(SPACE3D_BACKUP_STORAGE_KEY)).toBe(serializeSpace3DProject(example));
  });

  it('recupera desde el backup cuando el primary está corrupto', () => {
    saveSpace3DProject(example, storage);
    saveSpace3DProject(createBlankSpace3DProject(), storage);
    storage.map.set(SPACE3D_STORAGE_KEY, '{ no es json');
    expect(loadSpace3DProject(storage)).toEqual(example);
  });

  it('nunca sobrescribe el único backup válido con un primary corrupto', () => {
    saveSpace3DProject(example, storage);
    storage.map.set(SPACE3D_STORAGE_KEY, '{{{');
    const backupBefore = storage.getItem(SPACE3D_BACKUP_STORAGE_KEY);
    saveSpace3DProject(createBlankSpace3DProject(), storage);
    expect(storage.getItem(SPACE3D_BACKUP_STORAGE_KEY)).toBe(backupBefore);
  });

  it('devuelve false y no rompe cuando el almacenamiento rechaza la escritura', () => {
    storage.throwOnWrite = true;
    expect(saveSpace3DProject(example, storage)).toBe(false);
    expect(loadSpace3DProject(storage)).toBeNull();
  });

  it('devuelve null cuando primary y backup están corruptos', () => {
    storage.map.set(SPACE3D_STORAGE_KEY, 'x');
    storage.map.set(SPACE3D_BACKUP_STORAGE_KEY, 'y');
    expect(loadSpace3DProject(storage)).toBeNull();
  });

  it('rechaza guardar un proyecto que no serializa a un modelo válido', () => {
    const broken = { ...example, members: [{ ...example.members[0], A: 0 }] };
    expect(saveSpace3DProject(broken, storage)).toBe(false);
    expect(storage.getItem(SPACE3D_STORAGE_KEY)).toBeNull();
  });

  it('limpia ambas claves', () => {
    saveSpace3DProject(example, storage);
    saveSpace3DProject(createBlankSpace3DProject(), storage);
    clearSpace3DProject(storage);
    expect(storage.getItem(SPACE3D_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(SPACE3D_BACKUP_STORAGE_KEY)).toBeNull();
  });
});
