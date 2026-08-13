import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../design-system/components/controls';
import { Accordion, Tabs } from '../../design-system/components/disclosure';
import type { Language } from '../../i18n/catalogs';
import type { UnitSystemId } from '../../types';
import { BulkChangeSummary } from './BulkChangeSummary';
import { BulkPropertyField } from './BulkPropertyField';
import { BulkSectionPreview } from './BulkSectionPreview';
import { BulkSelectionSummary } from './BulkSelectionSummary';
import { aggregateBulkSelection, editableBulkProperties } from './bulkEditAggregation';
import { createBulkEditTranslator } from './bulkEditCopy';
import {
  EMPTY_BULK_DRAFT,
  buildBulkChangeSummary,
  buildBulkEditIntent,
  resolveBulkChange,
  stageBulkChange,
  untouchBulkChange,
} from './bulkEditIntent';
import type {
  BulkEditDraft,
  BulkEditIntent,
  BulkPropertyId,
  BulkPropertyState,
  BulkSelectionAggregate,
  BulkSelectionInput,
} from './bulkEditTypes';
import { buildBulkSectionPreview } from './bulkSectionPreviewModel';
import './bulkEdit.css';

/**
 * Panel de edición múltiple.
 *
 * Se alimenta sólo de props y no toca `ProjectModel`: recibe la selección ya
 * resuelta y devuelve por callback lo que hace falta para preparar el comando.
 * Quien conecta esto con el proyecto es `BulkEditInspectorPanel`; así el panel
 * sigue renderizándose y probándose con fixtures.
 *
 * Mientras se edita, nada sale de aquí: el borrador es estado local, de modo que
 * escribir en un campo no publica al store, no persiste y no invalida análisis.
 */

/** Las decisiones frecuentes van arriba; el resto queda tras una revelación progresiva. */
const PRIMARY_PROPERTIES: readonly BulkPropertyId[] = [
  'member.type',
  'member.materialId',
  'member.sectionId',
  'node.support.type',
  // La articulación interna es una decisión de modelado, no un número avanzado.
  'node.internalHinge',
];

/**
 * Identidad de la selección. El borrador se refiere a *estos* objetos: si la
 * selección cambia, un cambio preparado sobre los anteriores no puede seguir
 * vivo, o se aplicaría a objetos que el usuario nunca editó.
 */
const selectionSignature = (selection: BulkSelectionInput): string => [
  ...selection.members.map((member) => `m:${member.id}`),
  ...selection.nodes.map((node) => `n:${node.id}`),
].join('|');

/**
 * Lo que el panel entrega al confirmar. Lleva la intención (qué se cambió), el
 * borrador (con qué valores) y la agregación (sobre qué objetos y con qué
 * compatibilidad), que es exactamente lo que hace falta para preparar el
 * comando sin volver a recorrer la selección.
 */
export interface BulkEditApplyRequest {
  intent: BulkEditIntent;
  draft: BulkEditDraft;
  aggregate: BulkSelectionAggregate;
}

export interface BulkEditPanelProps {
  selection: BulkSelectionInput;
  units: UnitSystemId;
  language: Language;
  onApply: (request: BulkEditApplyRequest) => void;
  onCancel?: () => void;
  /** Mensaje de fallo del commit, p. ej. una intención obsoleta. */
  error?: string;
  /** Nota bajo el resumen; la usa el Inspector para avisar del análisis. */
  note?: string;
  className?: string;
}

export const BulkEditPanel = ({
  selection,
  units,
  language,
  onApply,
  onCancel,
  error,
  note,
  className = '',
}: BulkEditPanelProps) => {
  const t = createBulkEditTranslator(language);
  const [draft, setDraft] = useState<BulkEditDraft>(EMPTY_BULK_DRAFT);
  const [tab, setTab] = useState('properties');
  const [expanded, setExpanded] = useState<string[]>([]);

  const signature = selectionSignature(selection);
  useEffect(() => { setDraft(EMPTY_BULK_DRAFT); }, [signature]);

  const aggregate = useMemo(() => aggregateBulkSelection(selection), [selection]);
  const properties = useMemo(() => editableBulkProperties(aggregate), [aggregate]);
  const intent = useMemo(() => buildBulkEditIntent(aggregate, draft), [aggregate, draft]);
  const summaryRows = useMemo(() => buildBulkChangeSummary(aggregate, draft), [aggregate, draft]);
  const preview = useMemo(() => buildBulkSectionPreview(aggregate, draft), [aggregate, draft]);

  const primary = properties.filter((property) => PRIMARY_PROPERTIES.includes(property.id));
  const advanced = properties.filter((property) => !PRIMARY_PROPERTIES.includes(property.id));

  const renderField = (state: BulkPropertyState) => <BulkPropertyField
    key={state.id}
    state={state}
    change={resolveBulkChange(draft, state.id)}
    units={units}
    language={language}
    onStage={(change) => setDraft((current) => stageBulkChange(current, state, change))}
    onUntouch={() => setDraft((current) => untouchBulkChange(current, state.id))}
  />;

  const cancel = () => {
    setDraft(EMPTY_BULK_DRAFT);
    onCancel?.();
  };

  if (aggregate.total === 0) {
    return <section className={`bulk-edit-panel is-empty ${className}`.trim()} aria-label={t('panel.label')}>
      <BulkSelectionSummary aggregate={aggregate} language={language} />
    </section>;
  }

  return <section className={`bulk-edit-panel ${className}`.trim()} aria-label={t('panel.label')}>
    <BulkSelectionSummary aggregate={aggregate} language={language} />

    <Tabs
      className="bulk-edit-panel__tabs"
      label={t('panel.tabs')}
      value={tab}
      onValueChange={setTab}
      items={[
        {
          id: 'properties',
          label: t('tab.properties'),
          content: <div className="bulk-edit-panel__properties">
            {primary.map(renderField)}
            {advanced.length > 0 ? <Accordion
              multiple
              className="bulk-edit-panel__advanced"
              expanded={expanded}
              onExpandedChange={setExpanded}
              items={[{
                id: 'bulk-advanced',
                title: t('panel.advanced'),
                content: <div className="bulk-edit-panel__properties">{advanced.map(renderField)}</div>,
              }]}
            /> : null}
          </div>,
        },
        {
          id: 'section',
          label: t('tab.section'),
          content: <BulkSectionPreview preview={preview} units={units} language={language} />,
        },
      ]}
    />

    <BulkChangeSummary aggregate={aggregate} rows={summaryRows} units={units} language={language} />

    {note ? <p className="bulk-edit-panel__note">{note}</p> : null}
    {error ? <p className="bulk-edit-panel__error" role="alert">{error}</p> : null}

    <footer className="bulk-edit-panel__actions">
      {/* La razón por la que no se puede aplicar es texto visible, no un
          `title`: un botón deshabilitado no recibe foco ni puntero. */}
      {intent.entries.length === 0
        ? <p className="bulk-edit-panel__apply-hint">{t('action.applyHint')}</p>
        : null}
      <div className="bulk-edit-panel__buttons">
        <Button variant="ghost" onClick={cancel}>{t('action.cancel')}</Button>
        <Button
          variant="primary"
          disabled={intent.entries.length === 0}
          onClick={() => onApply({ intent, draft, aggregate })}
        >
          {intent.entries.length === 0 ? t('action.applyEmpty') : t('action.apply', { count: intent.affected.length })}
        </Button>
      </div>
    </footer>
  </section>;
};
