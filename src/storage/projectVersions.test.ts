import { describe, expect, it } from 'vitest';
import { createDefaultProject } from '../data/defaultProject';
import { InMemoryProjectRepository } from './projectRepository';
import { compareVersionWithCurrent, compareVersions, listNamedVersions, restoreNamedVersion, saveNamedVersion } from './projectVersions';

const clone = <T,>(value: T): T => structuredClone(value);

describe('named project versions', () => {
  it('requires a label and keeps named versions apart from automatic recoveries', async () => {
    const repository = new InMemoryProjectRepository();
    const project = createDefaultProject();
    await repository.saveProject(project);
    await repository.createRecovery(project, 'manual');
    await expect(saveNamedVersion(repository, project, '  ')).rejects.toThrow(/nombre/i);
    await saveNamedVersion(repository, project, 'Antes de las cargas');

    expect((await listNamedVersions(repository, project.id)).map((version) => version.label)).toEqual(['Antes de las cargas']);
    expect(await repository.listRecoveries(project.id)).toHaveLength(2);
  });

  it('compares versions and restores through the same protected recovery path', async () => {
    const repository = new InMemoryProjectRepository();
    const project = createDefaultProject();
    await repository.saveProject(project);
    const before = await saveNamedVersion(repository, project, 'Original');
    const changed = clone(project);
    changed.nodes[0] = { ...changed.nodes[0], x: 9 };
    await repository.saveProject(changed);
    const after = await saveNamedVersion(repository, changed, 'Nodo movido');

    expect(compareVersions(before, after).summary.modified).toBe(1);
    expect(compareVersionWithCurrent(before, changed).changes).toHaveLength(1);
    await restoreNamedVersion(repository, before.id);
    expect((await repository.openProject(project.id))?.project.nodes[0]?.x).toBe(project.nodes[0]?.x);
    expect((await repository.listRecoveries(project.id)).some((record) => record.reason === 'manual')).toBe(true);
  });
});
