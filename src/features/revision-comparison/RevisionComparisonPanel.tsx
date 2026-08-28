import { useEffect, useMemo, useState } from 'react';
import { Camera, GitCompareArrows, LocateFixed, RotateCcw, Trash2, TriangleAlert } from 'lucide-react';
import { Button } from '../../design-system/components/controls';
import { Drawer } from '../../design-system/components/overlays';
import type { TranslationKey } from '../../i18n/catalogs';
import { useI18n } from '../../i18n/useI18n';
import { useProjectAnalysis, useProjectModel } from '../../store/ProjectContext';
import { useWorkspaceUI } from '../../store/WorkspaceUIContext';
import type { Selection } from '../../types';
import { formatMachineNumber } from '../../utils/numberFormat';
import { emitWorkspaceCommand } from '../workspace/workspaceCommands';
import type { SurfacePresentation } from '../workspace/surfacePresentation';
import {
  buildRevisionComparison,
  captureRevisionSnapshot,
  type RevisionChange,
  type RevisionChangeCategory,
  type RevisionChangeDomain,
  type RevisionComparisonWarningCode,
  type RevisionSnapshot,
} from './revisionComparison';
import './revisionComparison.css';

type DomainFilter = 'all' | RevisionChangeDomain;
type CategoryFilter = 'all' | RevisionChangeCategory;

export interface RevisionComparisonPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presentation?: Extract<SurfacePresentation, 'drawer' | 'fullscreen'>;
  onSurfaceReady?: (ready?: boolean) => void;
  extent?: 'default' | 'peek';
  onPeek?: () => void;
  onRestore?: () => void;
  baseline: RevisionSnapshot | null;
  onBaselineChange: (snapshot: RevisionSnapshot | null) => void;
}

const warningKeys: Record<RevisionComparisonWarningCode, TranslationKey> = {
  'display-units-changed': 'revision.warning.displayUnitsChanged',
  'identity-churn-unmatched': 'revision.warning.identityChurn',
  'different-project-identity-unverified': 'revision.warning.differentProject',
  'base-analysis-missing': 'revision.warning.baseMissing',
  'target-analysis-missing': 'revision.warning.targetMissing',
  'base-analysis-stale': 'revision.warning.baseStale',
  'target-analysis-stale': 'revision.warning.targetStale',
  'base-analysis-unusable': 'revision.warning.baseUnusable',
  'target-analysis-unusable': 'revision.warning.targetUnusable',
  'analysis-scenario-mismatch': 'revision.warning.scenarioMismatch',
  'analysis-scenario-definition-changed': 'revision.warning.scenarioChanged',
  'limited-reliability': 'revision.warning.limitedReliability',
  'correlation-not-causality': 'revision.warning.correlation',
};

const changeTypeKeys: Record<RevisionChange['changeType'], TranslationKey> = {
  added: 'revision.change.added',
  removed: 'revision.change.removed',
  modified: 'revision.change.modified',
};

const domainKeys: Record<RevisionChangeDomain, TranslationKey> = {
  input: 'revision.domain.input',
  state: 'revision.domain.state',
  result: 'revision.domain.result',
};

const categoryKeys: Record<RevisionChangeCategory, TranslationKey> = {
  geometry: 'revision.category.geometry',
  properties: 'revision.category.properties',
  loads: 'revision.category.loads',
  configuration: 'revision.category.configuration',
  'analysis-state': 'revision.category.analysisState',
  results: 'revision.category.results',
};

const shortRevision = (revisionId: string): string => revisionId.replace(/^sha256:/, '').slice(0, 12);

const displayValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return formatMachineNumber(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
};

const deltaValue = (change: RevisionChange): string => {
  if (change.delta === undefined) return '—';
  const sign = change.delta > 0 ? '+' : '';
  return `${sign}${formatMachineNumber(change.delta)}${change.unit ? ` ${change.unit}` : ''}`;
};

const selectionForChange = (change: RevisionChange, project: ReturnType<typeof useProjectModel>['project']): Selection => {
  if ((change.entityKind === 'node' || change.entityKind === 'nodeResult') && project.nodes.some((item) => item.id === change.entityId)) {
    return { kind: 'node', id: change.entityId };
  }
  if ((change.entityKind === 'member' || change.entityKind === 'memberResult') && project.members.some((item) => item.id === change.entityId)) {
    return { kind: 'member', id: change.entityId };
  }
  if (change.entityKind === 'nodalLoad' && project.nodalLoads.some((item) => item.id === change.entityId)) {
    return { kind: 'nodalLoad', id: change.entityId };
  }
  if (change.entityKind === 'memberLoad' && project.memberLoads.some((item) => item.id === change.entityId)) {
    return { kind: 'memberLoad', id: change.entityId };
  }
  return null;
};

const selectionLabel = (selection: Exclude<Selection, null>, t: (key: TranslationKey, params?: Record<string, string | number>) => string): string => {
  const kind = selection.kind === 'member' ? t('revision.entity.member')
    : selection.kind === 'node' ? t('revision.entity.node')
      : selection.kind === 'nodalLoad' ? t('revision.entity.nodalLoad')
        : selection.kind === 'memberLoad' ? t('revision.entity.memberLoad')
          : t('revision.entity.object');
  return t('revision.locate', { kind, id: 'id' in selection ? selection.id : '' });
};

export const RevisionComparisonPanel = ({
  open,
  onOpenChange,
  presentation = 'drawer',
  onSurfaceReady,
  extent = 'default',
  onPeek,
  onRestore,
  baseline,
  onBaselineChange,
}: RevisionComparisonPanelProps) => {
  const { project } = useProjectModel();
  const { analysis, selectedCombinationId } = useProjectAnalysis();
  const { setSelection } = useWorkspaceUI();
  const { t } = useI18n();
  const [current, setCurrent] = useState<RevisionSnapshot | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [domain, setDomain] = useState<DomainFilter>('all');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    setCurrent(null);
    setCaptureError(null);
    void captureRevisionSnapshot(project, analysis, selectedCombinationId)
      .then((snapshot) => { if (active) setCurrent(snapshot); })
      .catch((error: unknown) => { if (active) setCaptureError(error instanceof Error ? error.message : 'capture-failed'); });
    return () => { active = false; };
  }, [analysis, project, selectedCombinationId]);

  const comparison = useMemo(() => baseline && current ? buildRevisionComparison(baseline, current) : null, [baseline, current]);
  const visibleChanges = useMemo(() => comparison?.changes.filter((change) => {
    if (domain !== 'all' && change.domain !== domain) return false;
    if (category !== 'all' && change.category !== category) return false;
    if (!query.trim()) return true;
    const needle = query.trim().toLocaleLowerCase();
    return [change.entityKind, change.entityId, change.field, change.beforePath, change.afterPath]
      .some((value) => value?.toLocaleLowerCase().includes(needle));
  }) ?? [], [category, comparison, domain, query]);

  const locate = (change: RevisionChange) => {
    const selection = selectionForChange(change, project);
    if (!selection || selection.kind === 'multi') return;
    setSelection(selection);
    onPeek?.();
    window.requestAnimationFrame(() => emitWorkspaceCommand('focus-object', selection));
  };

  const comparisonLabel = comparison?.resultComparability === 'comparable'
    ? t('revision.comparability.comparable')
    : comparison?.resultComparability === 'qualified'
      ? t('revision.comparability.qualified')
      : t('revision.comparability.blocked');

  return <Drawer
    open={open}
    onOpenChange={onOpenChange}
    side="bottom"
    presentation={presentation}
    title={t('revision.title')}
    description={t('revision.description')}
    closeLabel={t('revision.close')}
    className="revision-comparison-surface"
    surfaceId="comparison"
    restoreFocus={!onSurfaceReady}
    onSurfaceReady={onSurfaceReady}
    extent={extent}
    onRestore={onRestore}
    restoreLabel={t('revision.restore')}
  >
    <div
      className="revision-comparison"
      data-testid="revision-comparison"
      data-input-changes={comparison?.summary.input.total ?? 0}
      data-result-changes={comparison?.summary.result.total ?? 0}
    >
      {!baseline ? <section className="revision-comparison__empty-state">
        <Camera size={28} aria-hidden="true" />
        <div><h3>{t('revision.noBaselineTitle')}</h3><p>{t('revision.noBaselineBody')}</p></div>
        <Button size="touch" disabled={!current} onClick={() => current && onBaselineChange(current)}>
          <Camera size={17} aria-hidden="true" />{t('revision.captureBaseline')}
        </Button>
        {captureError ? <p role="alert">{captureError === 'capture-failed' ? t('revision.captureFailed') : captureError}</p> : null}
      </section> : <>
        <header className="revision-comparison__revisions">
          <article>
            <span>{t('revision.base')}</span>
            <strong>{baseline.project.name}</strong>
            <code>{shortRevision(baseline.revisionId)}</code>
            <small>{t(`revision.analysis.${comparison?.baseAnalysisState ?? 'missing'}` as TranslationKey)}</small>
          </article>
          <GitCompareArrows size={20} aria-hidden="true" />
          <article>
            <span>{t('revision.current')}</span>
            <strong>{current?.project.name ?? t('revision.calculating')}</strong>
            <code>{current ? shortRevision(current.revisionId) : '…'}</code>
            <small>{t(`revision.analysis.${comparison?.targetAnalysisState ?? 'missing'}` as TranslationKey)}</small>
          </article>
          <div className="revision-comparison__baseline-actions">
            <Button size="touch" variant="secondary" disabled={!current} onClick={() => current && onBaselineChange(current)}>
              <RotateCcw size={16} aria-hidden="true" />{t('revision.replaceBaseline')}
            </Button>
            <Button size="touch" variant="ghost" onClick={() => onBaselineChange(null)}>
              <Trash2 size={16} aria-hidden="true" />{t('revision.clearBaseline')}
            </Button>
          </div>
        </header>

        {comparison ? <>
          <section className="revision-comparison__summary" aria-label={t('revision.summary')}>
            <div><span>{t('revision.summary.input')}</span><strong>{comparison.summary.input.total}</strong></div>
            <div><span>{t('revision.summary.result')}</span><strong>{comparison.summary.result.total}</strong></div>
            <div><span>{t('revision.summary.state')}</span><strong>{comparison.summary.state.total}</strong></div>
            <div data-comparability={comparison.resultComparability}><span>{t('revision.summary.comparability')}</span><strong>{comparisonLabel}</strong></div>
          </section>

          {comparison.warnings.length ? <section className="revision-comparison__warnings" aria-label={t('revision.warnings')}>
            {comparison.warnings.map((warning) => <p key={warning.code} data-severity={warning.severity}>
              <TriangleAlert size={15} aria-hidden="true" />
              <span>{warning.code === 'correlation-not-causality' ? <strong>{t('revision.correlationTitle')}</strong> : null}{t(warningKeys[warning.code])}</span>
            </p>)}
          </section> : null}

          <div className="revision-comparison__filters">
            <label><span>{t('revision.domain')}</span><select value={domain} onChange={(event) => setDomain(event.target.value as DomainFilter)}>
              <option value="all">{t('revision.all')}</option>
              {(Object.keys(domainKeys) as RevisionChangeDomain[]).map((item) => <option key={item} value={item}>{t(domainKeys[item])}</option>)}
            </select></label>
            <label><span>{t('revision.category')}</span><select value={category} onChange={(event) => setCategory(event.target.value as CategoryFilter)}>
              <option value="all">{t('revision.all')}</option>
              {(Object.keys(categoryKeys) as RevisionChangeCategory[]).map((item) => <option key={item} value={item}>{t(categoryKeys[item])}</option>)}
            </select></label>
            <label className="revision-comparison__search"><span>{t('revision.search')}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('revision.searchPlaceholder')} /></label>
          </div>

          {visibleChanges.length ? <div className="revision-comparison__table-wrap"><table aria-label={t('revision.tableLabel')}>
            <thead><tr>
              <th>{t('revision.column.change')}</th><th>{t('revision.column.entity')}</th><th>{t('revision.column.field')}</th>
              <th>{t('revision.column.before')}</th><th>{t('revision.column.after')}</th><th>{t('revision.column.delta')}</th><th>{t('revision.column.provenance')}</th>
            </tr></thead>
            <tbody>{visibleChanges.map((change) => {
              const selection = selectionForChange(change, project);
              return <tr key={change.changeId} data-domain={change.domain} data-change-type={change.changeType}>
                <td data-label={t('revision.column.change')}><span className={`revision-change-badge revision-change-badge--${change.changeType}`}>{t(changeTypeKeys[change.changeType])}</span><small>{t(domainKeys[change.domain])} · {t(categoryKeys[change.category])}</small></td>
                <td data-label={t('revision.column.entity')}><strong>{change.entityKind}</strong><code>{change.entityId}</code>{selection && selection.kind !== 'multi' ? <button type="button" aria-label={selectionLabel(selection, t)} onClick={() => locate(change)}><LocateFixed size={14} aria-hidden="true" />{change.entityId}</button> : null}</td>
                <td data-label={t('revision.column.field')}><code>{change.field}</code></td>
                <td data-label={t('revision.column.before')}><span>{displayValue(change.before)}</span></td>
                <td data-label={t('revision.column.after')}><span>{displayValue(change.after)}</span></td>
                <td data-label={t('revision.column.delta')}><strong>{deltaValue(change)}</strong></td>
                <td data-label={t('revision.column.provenance')}><code>{change.afterPath ?? change.beforePath ?? '—'}</code></td>
              </tr>;
            })}</tbody>
          </table></div> : <p className="revision-comparison__no-changes">{comparison.summary.total ? t('revision.noFilteredChanges') : t('revision.noChanges')}</p>}
        </> : <p className="revision-comparison__calculating">{captureError === 'capture-failed' ? t('revision.captureFailed') : captureError ?? t('revision.calculating')}</p>}
      </>}
    </div>
  </Drawer>;
};
