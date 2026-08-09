import { describe, expect, it } from 'vitest';
import { createDefaultProject } from '../data/defaultProject';
import { PROJECT_STORAGE_KEY, type StorageLike } from '../data/projectStorage';
import {
  InMemoryProjectRepository,
  RepositoryConflictError,
  migrateLegacyProject,
} from './projectRepository';

class MemoryStorage implements StorageLike {
  private readonly values: Map<string, string>;
  constructor(values = new Map<string, string>()) { this.values = values; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe('ProjectRepository', () => {
  it('copies, reads back and marks a legacy project without deleting its source', async () => {
    const project = createDefaultProject();
    const raw = JSON.stringify(project);
    const storage = new MemoryStorage(new Map([[PROJECT_STORAGE_KEY, raw]]));
    const repository = new InMemoryProjectRepository();

    const first = await migrateLegacyProject(repository, storage);
    const second = await migrateLegacyProject(repository, storage);

    expect(first.status).toBe('migrated');
    expect(second.status).toBe('already-migrated');
    expect((await repository.openProject(project.id))?.project).toEqual(project);
    expect(storage.getItem(PROJECT_STORAGE_KEY)).toBe(raw);
    expect(await repository.listProjects()).toHaveLength(1);
  });

  it('preserves a conflicting write as a recovery instead of overwriting', async () => {
    const repository = new InMemoryProjectRepository();
    const project = createDefaultProject();
    const stored = await repository.saveProject(project);
    const concurrent = { ...project, name: 'Cambio de otra pestaña' };
    await repository.saveProject(concurrent, stored.revision);

    await expect(repository.saveProject({ ...project, name: 'Cambio local' }, stored.revision)).rejects.toBeInstanceOf(RepositoryConflictError);
    const current = await repository.openProject(project.id);
    expect(current?.project.name).toBe('Cambio de otra pestaña');
    expect((await repository.listRecoveries(project.id))[0]?.project.name).toBe('Cambio local');
  });

  it('does not overwrite IndexedDB when the legacy source has the same id and different content', async () => {
    const repository = new InMemoryProjectRepository();
    const stored = { ...createDefaultProject(), name: 'Revisión IndexedDB' };
    const legacy = { ...stored, name: 'Revisión localStorage' };
    await repository.saveProject(stored);
    const raw = JSON.stringify(legacy);
    const storage = new MemoryStorage(new Map([[PROJECT_STORAGE_KEY, raw]]));

    const result = await migrateLegacyProject(repository, storage);

    expect(result.status).toBe('conflict');
    expect((await repository.openProject(stored.id))?.project.name).toBe('Revisión IndexedDB');
    expect((await repository.listRecoveries(stored.id))[0]?.project.name).toBe('Revisión localStorage');
    expect(storage.getItem(PROJECT_STORAGE_KEY)).toBe(raw);
  });

  it('renames and duplicates without sharing a project id or object graph', async () => {
    const repository = new InMemoryProjectRepository();
    const project = createDefaultProject();
    await repository.saveProject(project);
    await repository.renameProject(project.id, 'Proyecto renombrado');
    const duplicate = await repository.duplicateProject(project.id, 'Copia segura');

    expect((await repository.openProject(project.id))?.project.name).toBe('Proyecto renombrado');
    expect(duplicate.project.id).not.toBe(project.id);
    expect(duplicate.project.name).toBe('Copia segura');
    duplicate.project.nodes[0].x += 10;
    expect((await repository.openProject(project.id))?.project.nodes[0].x).toBe(project.nodes[0].x);
  });
});
