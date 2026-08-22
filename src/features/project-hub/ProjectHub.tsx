import { useCallback, useEffect, useState } from 'react';
import { Copy, FolderOpen, MoreHorizontal, Pencil, RotateCcw } from 'lucide-react';
import { usePhase2I18n } from '../../i18n/usePhase2I18n';
import { useI18n } from '../../i18n/useI18n';
import { useWorkspaceUI } from '../../store/ProjectContext';
import type { ProjectModel } from '../../types';
import {
  getProjectRepository,
  type ProjectRepository,
  type RecoveryRecord,
  type StoredProjectRecord,
} from '../../storage/projectRepository';
import { ThreeStructuralImage } from '../structural-assets';
import type { ThreeStructuralAssetId } from '../structural-assets/threeStructuralRender';
import './projectHub.css';

/**
 * Última edición del registro. Sale de `StoredProjectRecord.updatedAt`, que el
 * repositorio ya escribe — no es un dato nuevo ni inventado. Ante una fecha
 * ilegible devuelve cadena vacía y la celda queda muda, que es preferible a
 * enseñar «Invalid Date» junto a un proyecto real.
 */
const formatUpdated = (iso: string, language: 'es' | 'en') => {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return '';
  return new Intl.DateTimeFormat(language === 'es' ? 'es' : 'en', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(at);
};

const projectAssetId = (project: ProjectModel): ThreeStructuralAssetId => {
  const members = project.members;
  if (members.length === 0) return 'portal:single-bay';
  const nodes = new Map(project.nodes.map((node) => [node.id, node] as const));
  if (members.some((member) => member.type === 'truss')) {
    const trusses = ['truss:pratt', 'truss:howe', 'truss:warren', 'truss:king-post'] as const;
    return trusses[members.length % trusses.length];
  }

  const coordinates = members.flatMap((member) => {
    const start = nodes.get(member.i);
    const end = nodes.get(member.j);
    return start && end ? [{ start, end }] : [];
  });
  const xs = project.nodes.map((node) => node.x);
  const ys = project.nodes.map((node) => node.y);
  const width = Math.max(...xs, 1) - Math.min(...xs, 0);
  const height = Math.max(...ys, 1) - Math.min(...ys, 0);
  const vertical = coordinates.filter(({ start, end }) => Math.abs(start.x - end.x) <= Math.max(width, 1) * 0.04).length;
  const horizontal = coordinates.filter(({ start, end }) => Math.abs(start.y - end.y) <= Math.max(height, 1) * 0.04).length;

  if (members.length === 1) {
    const member = members[0];
    const start = nodes.get(member.i);
    const end = nodes.get(member.j);
    const supports = [start?.support.type, end?.support.type].filter((support) => support && support !== 'none');
    if (supports.includes('fixed') && supports.length === 1) return 'cantilever:wall';
    if (supports.length >= 2) return 'beam:simply-supported';
    return 'cantilever:wall';
  }

  if (horizontal === members.length) {
    if (members.length === 2) return 'beam:two-span';
    if (members.length >= 3) return 'beam:three-span';
    return 'beam:overhang';
  }

  const levels = new Set(project.nodes.map((node) => node.y.toFixed(4))).size;
  if (levels >= 3) return 'portal:two-story';
  if (vertical >= 3 || horizontal >= 2) return 'portal:two-bay';
  const elevatedNodes = project.nodes.filter((node) => node.y > Math.min(...ys));
  if (elevatedNodes.length > 1 && new Set(elevatedNodes.map((node) => node.y.toFixed(4))).size > 1) return 'portal:industrial-pitched';
  return 'portal:single-bay';
};

export const ProjectHub = ({
  repository,
  onOpen,
  limit,
  variant = 'full',
}: {
  repository?: ProjectRepository;
  onOpen: (record: StoredProjectRecord) => void;
  limit?: number;
  variant?: 'full' | 'recent';
}) => {
  const { language } = useI18n();
  const { t } = usePhase2I18n(language);
  const { theme } = useWorkspaceUI();
  const activeRepository = repository ?? (typeof indexedDB === 'undefined' ? null : getProjectRepository());
  const [projects, setProjects] = useState<StoredProjectRecord[]>([]);
  const [recoveries, setRecoveries] = useState<RecoveryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

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
    } catch {
      setError(t('hub.unavailable'));
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
    } catch {
      setError(t('hub.unavailable'));
    }
  };

  const commitRename = async () => {
    if (!editing?.name.trim() || !activeRepository) return;
    try {
      await activeRepository.renameProject(editing.id, editing.name.trim());
      setEditing(null);
      await refresh();
    } catch {
      setError(t('hub.unavailable'));
    }
  };

  const restore = async (recovery: RecoveryRecord) => {
    if (!activeRepository) return;
    try {
      const record = await activeRepository.restoreRecovery(recovery.id);
      await refresh();
      onOpen(record);
    } catch {
      setError(t('hub.unavailable'));
    }
  };

  /* CRI-112 · el hub vacío casi desaparece.
     Sin proyectos y sin copias recuperables, la biblioteca no gasta un panel
     entero, un eyebrow y un titular para decir una frase: se queda en una
     línea discreta. En cuanto hay algo que enseñar —un proyecto, un error de
     la biblioteca o una copia pendiente— se despliega sola. La recuperación
     queda garantizada por construcción: su presencia es lo que fuerza el
     despliegue, así que nunca puede quedar menos alcanzable que hoy. */
  const collapsed = !loading && !error && projects.length === 0 && recoveries.length === 0;
  const visibleProjects = limit === undefined ? projects : projects.slice(0, Math.max(0, limit));

  return <section className={`project-hub project-hub--${variant}${collapsed ? ' project-hub--collapsed' : ''}`} data-project-hub-layout="visual-library" aria-label={t('hub.title')}>
    {loading ? <p role="status">{t('hub.loading')}</p> : null}
    {error ? <p className="project-hub__error" role="alert">{error}</p> : null}
    {!loading && projects.length === 0 ? <p className="project-hub__empty">{t('hub.empty')}</p> : null}
    {visibleProjects.length ? <div className="project-hub__list">
      {visibleProjects.map((record) => <article className="project-hub__row" key={record.id}>
        <div className="project-hub__preview" aria-hidden="true">
          <ThreeStructuralImage assetId={projectAssetId(record.project)} theme={theme} />
        </div>
        <div className="project-hub__identity">
          {editing?.id === record.id ? <form onSubmit={(event) => { event.preventDefault(); void commitRename(); }}>
            <label><span className="sr-only">{t('hub.renameLabel')}</span><input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} autoFocus /></label>
            <button type="submit">{t('hub.saveName')}</button>
            <button type="button" onClick={() => setEditing(null)}>{t('hub.cancel')}</button>
          </form> : <><strong>{record.name}</strong><span>{t('hub.meta', { members: record.project.members.length, nodes: record.project.nodes.length })}</span></>}
          <div className="project-hub__record-meta">
            <time className="project-hub__updated" dateTime={record.updatedAt}>{formatUpdated(record.updatedAt, language)}</time>
            {variant === 'full' ? <small className="project-hub__revision">{t('hub.revision', { revision: record.revision })}</small> : null}
          </div>
        </div>
        <div className="project-hub__actions">
          <button className="project-hub__open" type="button" aria-label={t('hub.openLabel', { name: record.name })} onClick={() => onOpen(record)}><FolderOpen size={16} />{t('hub.open')}</button>
          <div className={`project-hub__menu${openMenuId === record.id ? ' is-open' : ''}`}>
            <button type="button" aria-expanded={openMenuId === record.id} aria-label={t('hub.moreActions', { name: record.name })} onClick={() => setOpenMenuId((current) => current === record.id ? null : record.id)}><MoreHorizontal size={18} /></button>
            {openMenuId === record.id ? <div>
              <button type="button" aria-label={t('hub.renameAction', { name: record.name })} onClick={() => { setOpenMenuId(null); setEditing({ id: record.id, name: record.name }); }}><Pencil size={15} />{t('hub.rename')}</button>
              <button type="button" aria-label={t('hub.duplicateAction', { name: record.name })} onClick={() => { setOpenMenuId(null); void duplicate(record); }}><Copy size={15} />{t('hub.duplicate')}</button>
            </div> : null}
          </div>
        </div>
      </article>)}
    </div> : null}
    {/* CRI-104 · la recuperación se abre sola cuando hay algo que recuperar.
        `RecoveryRecord` es seguridad de datos: si existe una copia, verla no
        puede depender de que alguien despliegue un `<details>` cerrado. Sin
        copias, el bloque sigue sin renderizarse, igual que antes. */}
    {recoveries.length ? <details className="project-hub__recoveries" open>
      <summary>{t('hub.recoveries', { count: recoveries.length })}</summary>
      {recoveries.map((recovery) => <button key={recovery.id} type="button" onClick={() => void restore(recovery)}>
        <RotateCcw size={15} /> {t('hub.restore', { name: recovery.project.name })}
      </button>)}
    </details> : null}
  </section>;
};

export default ProjectHub;
