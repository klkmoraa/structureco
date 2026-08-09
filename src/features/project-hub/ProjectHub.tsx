import { useCallback, useEffect, useState } from 'react';
import { Copy, FolderClock, FolderOpen, Pencil, RotateCcw } from 'lucide-react';
import { usePhase2I18n } from '../../i18n/usePhase2I18n';
import { useI18n } from '../../i18n/useI18n';
import {
  getProjectRepository,
  type ProjectRepository,
  type RecoveryRecord,
  type StoredProjectRecord,
} from '../../storage/projectRepository';
import './projectHub.css';

export const ProjectHub = ({
  repository,
  onOpen,
}: {
  repository?: ProjectRepository;
  onOpen: (record: StoredProjectRecord) => void;
}) => {
  const { language } = useI18n();
  const { t } = usePhase2I18n(language);
  const activeRepository = repository ?? (typeof indexedDB === 'undefined' ? null : getProjectRepository());
  const [projects, setProjects] = useState<StoredProjectRecord[]>([]);
  const [recoveries, setRecoveries] = useState<RecoveryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    if (!activeRepository) {
      setProjects([]);
      setRecoveries([]);
      setError(t('hub.unavailable'));
      setLoading(false);
      return;
    }
    try {
      const [nextProjects, nextRecoveries] = await Promise.all([activeRepository.listProjects(), activeRepository.listRecoveries()]);
      setProjects(nextProjects);
      setRecoveries(nextRecoveries);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('hub.unavailable'));
    } finally {
      setLoading(false);
    }
  }, [activeRepository, t]);

  useEffect(() => { void refresh(); }, [refresh]);

  const duplicate = async (record: StoredProjectRecord) => {
    if (!activeRepository) return;
    try {
      await activeRepository.duplicateProject(record.id, t('hub.copyName', { name: record.name }));
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('hub.unavailable'));
    }
  };

  const commitRename = async () => {
    if (!editing?.name.trim() || !activeRepository) return;
    try {
      await activeRepository.renameProject(editing.id, editing.name.trim());
      setEditing(null);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('hub.unavailable'));
    }
  };

  const restore = async (recovery: RecoveryRecord) => {
    if (!activeRepository) return;
    try {
      const record = await activeRepository.restoreRecovery(recovery.id);
      await refresh();
      onOpen(record);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('hub.unavailable'));
    }
  };

  return <section className="project-hub" aria-labelledby="project-hub-title">
    <header className="project-hub__header">
      <div><span className="project-hub__eyebrow">{t('hub.localFirst')}</span><h2 id="project-hub-title">{t('hub.title')}</h2></div>
      <FolderClock size={22} aria-hidden="true" />
    </header>
    {loading ? <p role="status">{t('hub.loading')}</p> : null}
    {error ? <p className="project-hub__error" role="alert">{error}</p> : null}
    {!loading && projects.length === 0 ? <p className="project-hub__empty">{t('hub.empty')}</p> : null}
    <div className="project-hub__list">
      {projects.map((record) => <article className="project-hub__row" key={record.id}>
        <div className="project-hub__identity">
          {editing?.id === record.id ? <form onSubmit={(event) => { event.preventDefault(); void commitRename(); }}>
            <label><span className="sr-only">{t('hub.renameLabel')}</span><input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} autoFocus /></label>
            <button type="submit">{t('hub.saveName')}</button>
            <button type="button" onClick={() => setEditing(null)}>{t('hub.cancel')}</button>
          </form> : <><strong>{record.name}</strong><small>{t('hub.revision', { revision: record.revision })}</small></>}
        </div>
        <div className="project-hub__actions">
          <button type="button" aria-label={t('hub.openLabel', { name: record.name })} onClick={() => onOpen(record)}><FolderOpen size={16} />{t('hub.open')}</button>
          <button type="button" aria-label={t('hub.renameAction', { name: record.name })} onClick={() => setEditing({ id: record.id, name: record.name })}><Pencil size={15} /></button>
          <button type="button" aria-label={t('hub.duplicateAction', { name: record.name })} onClick={() => void duplicate(record)}><Copy size={15} /></button>
        </div>
      </article>)}
    </div>
    {recoveries.length ? <details className="project-hub__recoveries">
      <summary>{t('hub.recoveries', { count: recoveries.length })}</summary>
      {recoveries.map((recovery) => <button key={recovery.id} type="button" onClick={() => void restore(recovery)}>
        <RotateCcw size={15} /> {t('hub.restore', { name: recovery.project.name })}
      </button>)}
    </details> : null}
  </section>;
};

export default ProjectHub;
