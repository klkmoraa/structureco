import { normalizeProject } from '../data/migrate';
import { diffProjects, type ProjectDiff } from '../data/projectDiff';
import type { ProjectModel } from '../types';
import type { ProjectRepository, RecoveryRecord, StoredProjectRecord } from './projectRepository';

export type NamedVersion = RecoveryRecord & { reason: 'version'; label: string };
const isNamedVersion = (record: RecoveryRecord): record is NamedVersion => record.reason === 'version' && typeof record.label === 'string' && record.label.length > 0;

export const saveNamedVersion = async (repository: ProjectRepository, project: ProjectModel, label: string): Promise<NamedVersion> => {
  const trimmed = label.trim();
  if (!trimmed) throw new Error('Una versión necesita un nombre que la distinga de las demás.');
  const record = await repository.createRecovery(project, 'version', trimmed);
  if (!isNamedVersion(record)) throw new Error('El repositorio no conservó la etiqueta de la versión.');
  return record;
};

export const listNamedVersions = async (repository: ProjectRepository, projectId: string): Promise<NamedVersion[]> =>
  (await repository.listRecoveries(projectId)).filter(isNamedVersion);

export const restoreNamedVersion = (repository: ProjectRepository, id: string): Promise<StoredProjectRecord> => repository.restoreRecovery(id);
export const compareVersions = (from: NamedVersion, to: NamedVersion): ProjectDiff => from.checksum === to.checksum
  ? { changes: [], summary: { added: 0, removed: 0, modified: 0 }, identical: true }
  : diffProjects(from.project, to.project);
export const compareVersionWithCurrent = (version: NamedVersion, current: ProjectModel): ProjectDiff => diffProjects(version.project, normalizeProject(current));
