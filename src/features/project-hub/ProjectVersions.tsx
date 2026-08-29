import { useCallback, useEffect, useMemo, useState } from 'react';
import { GitCompareArrows, History, RotateCcw, Save } from 'lucide-react';
import type { DiffChangeKind, DiffEntityKind, ProjectDiff } from '../../data/projectDiff';
import type { Phase2TranslationKey } from '../../i18n/phase2Catalogs';
import type { ProjectRepository, StoredProjectRecord } from '../../storage/projectRepository';
import { compareVersionWithCurrent, compareVersions, listNamedVersions, restoreNamedVersion, saveNamedVersion, type NamedVersion } from '../../storage/projectVersions';
import { diffCounts, formatDiffValue, groupChangesByKind, limitChanges } from './projectDiffSummary';

const CURRENT = 'current';
const MAX_CHANGES = 40;

const ENTITY_LABEL_KEYS: Readonly<Record<DiffEntityKind, Phase2TranslationKey>> = {
  node: 'hub.diffKindNode', member: 'hub.diffKindMember', nodalLoad: 'hub.diffKindNodalLoad', memberLoad: 'hub.diffKindMemberLoad',
  prescribedDisplacement: 'hub.diffKindPrescribed', memberInitialEffect: 'hub.diffKindInitialEffect', loadCase: 'hub.diffKindLoadCase', combination: 'hub.diffKindCombination', settings: 'hub.diffKindSettings',
};
const CHANGE_COUNT_KEYS: Readonly<Record<DiffChangeKind, Phase2TranslationKey>> = {
  added: 'hub.diffAdded', modified: 'hub.diffModified', removed: 'hub.diffRemoved',
};
const CHANGE_BADGE_KEYS: Readonly<Record<DiffChangeKind, Phase2TranslationKey>> = {
  added: 'hub.diffBadgeAdded', modified: 'hub.diffBadgeModified', removed: 'hub.diffBadgeRemoved',
};

export const ProjectVersions = ({
  repository,
  record,
  formatDate,
  t,
  onRestored,
  onChanged,
}: {
  repository: ProjectRepository;
  record: StoredProjectRecord;
  formatDate: (iso: string) => string;
  t: (key: Phase2TranslationKey, variables?: Record<string, string | number>) => string;
  onRestored: (record: StoredProjectRecord) => void;
  onChanged: () => void;
}) => {
  const [versions, setVersions] = useState<NamedVersion[]>([]);
  const [name, setName] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareId, setCompareId] = useState(CURRENT);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    try { setVersions(await listNamedVersions(repository, record.id)); setError(null); }
    catch { setError(t('hub.versionsFailed')); }
  }, [record.id, repository, t]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (selectedId && !versions.some((version) => version.id === selectedId)) setSelectedId(null);
    if (compareId !== CURRENT && !versions.some((version) => version.id === compareId)) setCompareId(CURRENT);
  }, [compareId, selectedId, versions]);

  const selected = versions.find((version) => version.id === selectedId) ?? null;
  const other = compareId === CURRENT ? null : versions.find((version) => version.id === compareId) ?? null;
  const comparison = useMemo<{ diff: ProjectDiff; againstLabel: string } | null>(() => {
    if (!selected) return null;
    if (compareId === CURRENT) return { diff: compareVersionWithCurrent(selected, record.project), againstLabel: t('hub.currentState') };
    return other ? { diff: compareVersions(selected, other), againstLabel: other.label } : null;
  }, [compareId, other, record.project, selected, t]);

  const save = async () => {
    if (!name.trim()) { setError(t('hub.versionNameRequired')); return; }
    setBusy(true);
    try { const version = await saveNamedVersion(repository, record.project, name); setName(''); await refresh(); setSelectedId(version.id); onChanged(); }
    catch { setError(t('hub.versionsFailed')); }
    finally { setBusy(false); }
  };
  const restore = async (version: NamedVersion) => {
    setBusy(true);
    try { const restored = await restoreNamedVersion(repository, version.id); await refresh(); onChanged(); onRestored(restored); }
    catch { setError(t('hub.versionsFailed')); }
    finally { setBusy(false); }
  };
  const valueLabels = { absent: t('hub.diffAbsent'), yes: t('hub.yes'), no: t('hub.no') };

  return <details className="project-hub__versions">
    <summary><History size={15} aria-hidden="true" /> {t('hub.versions', { count: versions.length })}</summary>
    <div className="project-hub__versions-body">
      <form className="project-hub__version-form" onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <label><span className="sr-only">{t('hub.versionNameLabel')}</span><input value={name} disabled={busy} placeholder={t('hub.versionNamePlaceholder')} aria-label={t('hub.versionNameLabel')} onChange={(event) => setName(event.target.value)} /></label>
        <button type="submit" disabled={busy}><Save size={15} aria-hidden="true" /> {t('hub.saveVersion')}</button>
      </form>
      <p className="project-hub__versions-note">{t('hub.versionsNote')}</p>
      {error ? <p className="project-hub__error" role="alert">{error}</p> : null}
      {!versions.length ? <p className="project-hub__versions-empty">{t('hub.versionsEmpty')}</p> : <ul className="project-hub__version-list">
        {versions.map((version) => <li key={version.id} className={version.id === selectedId ? 'is-selected' : undefined}>
          <button type="button" className="project-hub__version-pick" aria-pressed={version.id === selectedId} onClick={() => setSelectedId((id) => id === version.id ? null : version.id)}><strong>{version.label}</strong><time dateTime={version.createdAt}>{formatDate(version.createdAt)}</time></button>
          <button type="button" disabled={busy} aria-label={t('hub.restoreVersion', { label: version.label })} onClick={() => void restore(version)}><RotateCcw size={15} aria-hidden="true" /> {t('hub.restoreShort')}</button>
        </li>)}
      </ul>}
      {selected ? <section className="project-hub__diff" aria-label={t('hub.diffTitle', { label: selected.label })}>
        <header><label className="project-hub__diff-target"><span>{t('hub.compareWith')}</span><select value={compareId} onChange={(event) => setCompareId(event.target.value)}><option value={CURRENT}>{t('hub.currentState')}</option>{versions.filter((version) => version.id !== selected.id).map((version) => <option key={version.id} value={version.id}>{version.label}</option>)}</select></label><p className="project-hub__diff-direction"><GitCompareArrows size={15} aria-hidden="true" />{comparison ? t('hub.diffDirection', { from: selected.label, to: comparison.againstLabel }) : null}</p></header>
        {comparison?.diff.identical ? <p className="project-hub__diff-identical">{t('hub.diffIdentical')}</p> : null}
        {comparison && !comparison.diff.identical ? <><p className="project-hub__diff-counts">{diffCounts(comparison.diff).map((entry) => t(CHANGE_COUNT_KEYS[entry.change], { count: entry.count })).join(' · ')}</p><p className="project-hub__versions-note">{t('hub.diffBaseUnits')}</p>{groupChangesByKind(comparison.diff).map((group) => { const limited = limitChanges(group.changes, MAX_CHANGES); return <section key={group.kind} className="project-hub__diff-group"><h4>{t(ENTITY_LABEL_KEYS[group.kind])}</h4><ul className="project-hub__diff-list">{limited.shown.map((change) => <li key={`${change.kind}:${change.id}`} data-change={change.change}><span className="project-hub__diff-badge">{t(CHANGE_BADGE_KEYS[change.change])}</span><code>{change.id}</code>{change.fields.length ? <span className="project-hub__diff-fields">{change.fields.map((field) => `${field.field}: ${formatDiffValue(field.before, valueLabels)} → ${formatDiffValue(field.after, valueLabels)}`).join(' · ')}</span> : null}</li>)}</ul>{limited.hidden ? <p className="project-hub__diff-more">{t('hub.diffMore', { count: limited.hidden })}</p> : null}</section>; })}</> : null}
      </section> : null}
    </div>
  </details>;
};
