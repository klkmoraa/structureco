import { Layers3 } from 'lucide-react';
import type { Language } from '../../i18n/catalogs';
import { createBulkEditTranslator } from './bulkEditCopy';
import { bulkSelectionCompatibility } from './bulkEditPresentation';
import type { BulkSelectionAggregate } from './bulkEditTypes';

/**
 * Cabecera del panel: cuántos objetos hay y cuántos admiten la edición.
 *
 * El recuento de incompatibles se muestra siempre que exista, aunque sea cero
 * objetos afectados: una edición múltiple que ignora en silencio parte de la
 * selección es exactamente lo que este panel debe evitar.
 */
export const BulkSelectionSummary = ({
  aggregate,
  language,
}: {
  aggregate: BulkSelectionAggregate;
  language: Language;
}) => {
  const t = createBulkEditTranslator(language);
  const { compatible, incompatible } = bulkSelectionCompatibility(aggregate);
  const { member, node } = aggregate.counts;
  const count = (plural: 'summary.members' | 'summary.nodes' | 'summary.objects', value: number) =>
    value === 1 ? t(`${plural}One`) : t(plural, { count: value });
  const headline = aggregate.total === 0
    ? t('summary.empty')
    : node === 0
      ? count('summary.members', member)
      : member === 0
        ? count('summary.nodes', node)
        : count('summary.objects', aggregate.total);

  return <section className="bulk-summary" aria-label={t('summary.label')}>
    <span className="bulk-summary__icon" aria-hidden="true"><Layers3 size={20} /></span>
    <div className="bulk-summary__body">
      <strong>{headline}</strong>
      {aggregate.total === 0 ? <span>{t('summary.emptyHelp')}</span> : <span className="bulk-summary__counts">
        <span className="bulk-summary__chip">
          {compatible === 1 ? t('summary.compatibleOne') : t('summary.compatible', { count: compatible })}
        </span>
        {incompatible > 0 ? <span className="bulk-summary__chip is-incompatible">
          {t('summary.incompatible', { count: incompatible })}
        </span> : null}
      </span>}
      {member > 0 ? <small>{t('summary.memberTypes', aggregate.memberTypeCounts)}</small> : null}
    </div>
  </section>;
};
