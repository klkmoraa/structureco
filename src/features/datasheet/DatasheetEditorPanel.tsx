import { Button } from '../../design-system/components/controls';
import type { Language, TranslationKey } from '../../i18n/catalogs';
import type { ProjectModel, UnitSystemId } from '../../types';
import type { DatasheetEditError } from './datasheetEditDraft';
import type { DatasheetFieldId } from './datasheetEditModel';
import type { DatasheetRowKind } from './datasheetModel';
import { LoadCard, MemberCards, NodeCards, type FieldContext } from './DatasheetEditorCards';

type Translate = (key: TranslationKey, variables?: Record<string, string | number>) => string;

export interface DatasheetEditorPanelProps {
  /** Modelo real; sólo lo lee el lado «Antes» de cada transición. */
  project: ProjectModel;
  /** Modelo con el plan aplicado; es el que dibujan todos los previews. */
  previewProject: ProjectModel;
  target: { kind: DatasheetRowKind; id: string } | null;
  units: UnitSystemId;
  language: Language;
  t: Translate;
  draftText: (fieldId: DatasheetFieldId) => string | undefined;
  onStage: (fieldId: DatasheetFieldId, raw: string) => void;
  pendingCount: number;
  planApplicable: boolean;
  planErrors: readonly DatasheetEditError[];
  onApply: () => void;
  onCancelDraft: () => void;
  onFocusObject: () => void;
  focusLabel: string;
}

export const DatasheetEditorPanel = ({
  project,
  previewProject,
  target,
  units,
  language,
  t,
  draftText,
  onStage,
  pendingCount,
  planApplicable,
  planErrors,
  onApply,
  onCancelDraft,
  onFocusObject,
  focusLabel,
}: DatasheetEditorPanelProps) => {
  const byId = <T extends { id: string }>(items: readonly T[]): T | undefined =>
    target ? items.find((item) => item.id === target.id) : undefined;

  const node = target?.kind === 'node' ? byId(previewProject.nodes) : undefined;
  const sourceNode = target?.kind === 'node' ? byId(project.nodes) : undefined;
  const member = target?.kind === 'member' ? byId(previewProject.members) : undefined;
  const sourceMember = target?.kind === 'member' ? byId(project.members) : undefined;
  const nodalLoad = target?.kind === 'nodalLoad' ? byId(previewProject.nodalLoads) : undefined;
  const memberLoad = target?.kind === 'memberLoad' ? byId(previewProject.memberLoads) : undefined;

  const ctx: FieldContext = {
    rowId: target?.id ?? '',
    units,
    language,
    t,
    previewProject,
    draftText,
    onStage,
    errors: planErrors,
  };

  const hasCards = Boolean(node || member || nodalLoad || memberLoad);

  return <aside className="datasheet-context" aria-label={t('datasheet.contextLabel')}>
    <header className="datasheet-context__header">
      <p className="datasheet-context__object">{target?.id ?? '—'}</p>
      <button type="button" className="datasheet-focus-action" onClick={onFocusObject} disabled={!target}>
        {focusLabel}
      </button>
    </header>

    <div className="datasheet-context__body">
      {node && sourceNode
        ? <NodeCards ctx={ctx} node={node} sourceNode={sourceNode} previewProject={previewProject} />
        : null}
      {member && sourceMember
        ? <MemberCards ctx={ctx} member={member} sourceMember={sourceMember} />
        : null}
      {nodalLoad || memberLoad
        ? <LoadCard ctx={ctx} nodalLoad={nodalLoad} memberLoad={memberLoad} />
        : null}
      {hasCards ? null : <p className="datasheet-card__empty">{t('datasheet.contextEmpty')}</p>}
    </div>

    {pendingCount > 0 ? <footer className="datasheet-draft-bar">
      <p role="status">
        {pendingCount === 1
          ? t('datasheet.draft.countOne')
          : t('datasheet.draft.count', { count: pendingCount })}
      </p>
      <Button variant="ghost" onClick={onCancelDraft}>{t('datasheet.draft.cancel')}</Button>
      <Button variant="primary" disabled={!planApplicable} onClick={onApply}>
        {t('datasheet.draft.apply')}
      </Button>
    </footer> : null}
  </aside>;
};
