import { describe, expect, it } from 'vitest';
import { createDefaultProject } from '../../data/defaultProject';
import type { StoredProjectRecord } from '../../storage/projectRepository';
import { filterAndSortProjects } from './projectLibraryView';

const record = (name: string, updatedAt: string): StoredProjectRecord => ({
  id: name.toLowerCase(),
  name,
  schemaVersion: 1,
  revision: 1,
  updatedAt,
  checksum: name,
  project: { ...createDefaultProject(), id: name.toLowerCase(), name },
});

describe('projectLibraryView', () => {
  const projects = [
    record('Zeta', '2026-09-10T10:00:00.000Z'),
    record('Alpha', '2026-09-12T10:00:00.000Z'),
    record('Marco', '2026-09-11T10:00:00.000Z'),
  ];

  it('matches names without accents or case and keeps only matching records', () => {
    expect(filterAndSortProjects(projects, 'ALPHÁ', 'updated').map((item) => item.name)).toEqual(['Alpha']);
  });

  it('sorts by name ascending and by updated date descending', () => {
    expect(filterAndSortProjects(projects, '', 'name').map((item) => item.name)).toEqual(['Alpha', 'Marco', 'Zeta']);
    expect(filterAndSortProjects(projects, '', 'updated').map((item) => item.name)).toEqual(['Alpha', 'Marco', 'Zeta']);
  });
});
