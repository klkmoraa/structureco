import type { StoredProjectRecord } from '../../storage/projectRepository';

export type ProjectLibrarySort = 'updated' | 'name' | 'size';

const normalize = (value: string) => value
  .toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '');

const projectSize = (record: StoredProjectRecord) => {
  const { project } = record;
  return project.nodes.length + project.members.length
    + project.nodalLoads.length + project.memberLoads.length
    + (project.prescribedDisplacements?.length ?? 0)
    + (project.memberInitialEffects?.length ?? 0);
};

const compareUpdated = (left: StoredProjectRecord, right: StoredProjectRecord) =>
  right.updatedAt.localeCompare(left.updatedAt);

export const filterAndSortProjects = (
  projects: readonly StoredProjectRecord[],
  query: string,
  sort: ProjectLibrarySort,
): StoredProjectRecord[] => {
  const needle = normalize(query.trim());
  const filtered = needle
    ? projects.filter((record) => normalize(record.name).includes(needle))
    : [...projects];
  const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

  return filtered.sort((left, right) => {
    if (sort === 'name') return collator.compare(left.name, right.name) || compareUpdated(left, right);
    if (sort === 'size') return projectSize(right) - projectSize(left) || compareUpdated(left, right);
    return compareUpdated(left, right) || collator.compare(left.name, right.name);
  });
};
