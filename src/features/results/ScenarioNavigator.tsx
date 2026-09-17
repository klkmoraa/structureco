import { useMemo, useState } from 'react';
import type { UnitSystemId } from '../../types';
import { toDisplay, unitLabel } from '../../engine/units';
import { isTrustedForCombination } from '../../engine/reliability';
import type { TranslationKey } from '../../i18n/catalogs';
import { useI18n } from '../../i18n/useI18n';
import { formatResultNumber } from './resultFormatting';
import type { ScenarioNavigatorRow } from './scenarioNavigatorRows';

type ScenarioFilter = 'all' | 'usable' | 'failed';

const statusKeys: Record<ScenarioNavigatorRow['status'], TranslationKey> = {
  reliable: 'results.scenarioStatusReliable',
  limited: 'results.scenarioStatusLimited',
  unreliable: 'results.scenarioStatusUnreliable',
  failed: 'results.scenarioStatusFailed',
};

const quantityLabels = [
  { id: 'axial', label: 'N' },
  { id: 'shear', label: 'V' },
  { id: 'moment', label: 'M' },
] as const;

const valueUnit = (quantity: typeof quantityLabels[number]['id']): 'force' | 'moment' => quantity === 'moment' ? 'moment' : 'force';

const combinationId = (row: ScenarioNavigatorRow): string => row.id.startsWith('combination:') ? row.id.slice('combination:'.length) : row.id;

export const ScenarioNavigator = ({
  rows,
  onUseCombination,
  onCompare,
  units = 'kN-m',
}: {
  rows: readonly ScenarioNavigatorRow[];
  onUseCombination: (combinationId: string) => void;
  onCompare: () => void;
  units?: UnitSystemId;
}) => {
  const { language, t } = useI18n();
  const [filter, setFilter] = useState<ScenarioFilter>('all');
  const visibleRows = useMemo(() => rows.filter((row) => {
    const canFeedEnvelope = row.usable && isTrustedForCombination(row.status);
    return filter === 'all' ? true : filter === 'usable' ? canFeedEnvelope : !canFeedEnvelope;
  }), [filter, rows]);
  const formatValue = (row: ScenarioNavigatorRow, quantity: typeof quantityLabels[number]['id']) => {
    const value = row.values[quantity];
    return value === null ? '—' : `${formatResultNumber(toDisplay(value, units, valueUnit(quantity)))} ${unitLabel(units, valueUnit(quantity))}`;
  };
  return <section className="scenario-navigator" aria-label={t('results.scenarioNavigator')} data-testid="scenario-navigator">
    <header className="scenario-navigator-heading">
      <div><span>{t('results.scenarioNavigatorEyebrow')}</span><h3>{t('results.scenarioNavigator')}</h3><p>{t('results.scenarioNavigatorHint')}</p></div>
      <button type="button" className="scenario-navigator-compare" onClick={onCompare}><span aria-hidden="true">↔</span> {t('results.compareCases')}</button>
    </header>
    <div className="scenario-navigator-toolbar" role="toolbar" aria-label={t('results.scenarioFilters')}>
      {(['all', 'usable', 'failed'] as const).map((id) => <button
        key={id}
        type="button"
        className={filter === id ? 'is-active' : undefined}
        aria-pressed={filter === id}
        onClick={() => setFilter(id)}
      >{t(id === 'all' ? 'results.scenarioFilterAll' : id === 'usable' ? 'results.scenarioFilterUsable' : 'results.scenarioFilterFailed')}</button>)}
      <span>{t('results.scenarioCount', { count: visibleRows.length })}</span>
    </div>
    <div className="scenario-navigator-list">
      {visibleRows.map((row) => {
        const trusted = row.usable && isTrustedForCombination(row.status);
        const statusSymbol = trusted ? '✓' : row.usable ? '!' : '×';
        return <article key={row.id} className={`scenario-navigator-row is-${row.status}${row.isCurrent ? ' is-current' : ''}`} data-scenario-id={row.id} data-scenario-status={row.status}>
          <div className="scenario-navigator-row-main">
            <div className="scenario-navigator-row-title">
              <span className="scenario-navigator-status-symbol" aria-hidden="true">{statusSymbol}</span>
              <strong>{row.name}</strong>
              {row.isCurrent ? <span className="scenario-navigator-current">{t('results.scenarioCurrent')}</span> : null}
            </div>
            <div className="scenario-navigator-meta"><span>{t(row.kind === 'case' ? 'results.scenarioKindCase' : 'results.scenarioKindCombination')}</span><span data-scenario-status-label>{t(statusKeys[row.status])}</span></div>
            {row.reason ? <p className="scenario-navigator-reason">{language === 'es' ? row.reason : t('results.scenarioUnsolved')}</p> : null}
          </div>
          <div className="scenario-navigator-values" aria-label={t('results.scenarioValues')}>
            {quantityLabels.map(({ id, label }) => <span key={id}><b>{label}</b><strong>{formatValue(row, id)}</strong></span>)}
          </div>
          {row.kind === 'combination' ? <button
            type="button"
            className="scenario-navigator-use"
            aria-label={t('results.scenarioUseCombination', { name: row.name })}
            onClick={() => onUseCombination(combinationId(row))}
          ><span aria-hidden="true">▶</span> {t('results.scenarioUse')}</button> : null}
        </article>;
      })}
      {!visibleRows.length ? <p className="scenario-navigator-empty">{t('results.scenarioFilterEmpty')}</p> : null}
    </div>
  </section>;
};
