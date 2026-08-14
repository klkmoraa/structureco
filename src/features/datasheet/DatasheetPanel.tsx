import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Drawer } from '../../design-system/components/overlays';
import { useI18n } from '../../i18n/useI18n';
import { useProjectModel } from '../../store/ProjectModelContext';
import { useWorkspaceUI } from '../../store/WorkspaceUIContext';
import type { Selection } from '../../types';
import { emitWorkspaceCommand } from '../workspace/workspaceCommands';
import { DatasheetContextPanel } from './DatasheetContextPanel';
import { DatasheetGrid } from './DatasheetGrid';
import { clampGridPosition, type GridPosition } from './datasheetGridNavigation';
import {
  applyDatasheetPipeline,
  datasheetColumns,
  datasheetFacets,
  datasheetRowSearchText,
  projectDatasheetRows,
  type DatasheetColumn,
  type DatasheetEntity,
  type DatasheetRow,
  type DatasheetSort,
} from './datasheetModel';
import { editabilityMessageKey, formatDatasheetNumber } from './datasheetPresentation';
import './datasheet.css';

/**
 * Datasheet estructural — fase de auditoría (CRI-81).
 *
 * Es una **proyección** del proyecto, no un modelo paralelo: no hay estado de
 * entidades aquí, ni historial, ni undo propios. Lo único que este componente
 * guarda es la vista —entidad, búsqueda, filtros, orden y celda enfocada—, que
 * no es información del modelo y desaparece al cerrar sin dejar rastro.
 *
 * La selección es la del workspace. Seleccionar varias filas produce una
 * selección `multi`, que es exactamente lo que ya consumen el lienzo, el
 * Inspector y la edición múltiple.
 */

const selectionIds = (selection: Selection, entity: DatasheetEntity): ReadonlySet<string> => {
  if (!selection) return new Set();
  if (entity === 'loads') {
    // `Selection.multi` sólo transporta nudos y miembros, así que una tabla de
    // cargas sincroniza como mucho la fila enfocada. No se amplía `Selection`:
    // editar varias cargas no lo necesita, porque las ediciones son por celda.
    return selection.kind === 'nodalLoad' || selection.kind === 'memberLoad'
      ? new Set([selection.id])
      : new Set();
  }
  if (selection.kind === 'multi') return new Set(entity === 'nodes' ? selection.nodeIds : selection.memberIds);
  const expected = entity === 'nodes' ? 'node' : 'member';
  return selection.kind === expected ? new Set([selection.id]) : new Set();
};

/** Selección de una carga: siempre simple, porque `multi` no la sabe transportar. */
const buildLoadSelection = (rows: readonly DatasheetRow[], ids: readonly string[]): Selection => {
  const row = ids.length === 1 ? rows.find((candidate) => candidate.id === ids[0]) : undefined;
  if (!row) return null;
  return row.kind === 'nodalLoad' ? { kind: 'nodalLoad', id: row.id } : { kind: 'memberLoad', id: row.id };
};

/** Construye la selección del workspace conservando la de la otra entidad. */
const buildSelection = (
  entity: DatasheetEntity,
  ids: readonly string[],
  current: Selection,
  rows: readonly DatasheetRow[],
): Selection => {
  if (entity === 'loads') return buildLoadSelection(rows, ids);
  const other = current?.kind === 'multi'
    ? (entity === 'nodes' ? current.memberIds : current.nodeIds)
    : current?.kind === (entity === 'nodes' ? 'member' : 'node')
      ? [current.id]
      : [];
  const nodeIds = entity === 'nodes' ? [...ids] : [...other];
  const memberIds = entity === 'nodes' ? [...other] : [...ids];
  if (nodeIds.length === 0 && memberIds.length === 0) return null;
  if (nodeIds.length === 1 && memberIds.length === 0) return { kind: 'node', id: nodeIds[0] };
  if (memberIds.length === 1 && nodeIds.length === 0) return { kind: 'member', id: memberIds[0] };
  return { kind: 'multi', nodeIds, memberIds };
};

export interface DatasheetPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusTo?: HTMLElement | null;
}

export const DatasheetPanel = ({ open, onOpenChange, returnFocusTo }: DatasheetPanelProps) => {
  const { t } = useI18n();
  const { project } = useProjectModel();
  const { selection, setSelection } = useWorkspaceUI();
  const [entity, setEntity] = useState<DatasheetEntity>('nodes');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, ReadonlySet<string>>>({});
  const [sort, setSort] = useState<DatasheetSort | null>(null);
  const [focus, setFocus] = useState<GridPosition>({ row: 0, column: 0 });
  const [announcement, setAnnouncement] = useState('');
  /** Ancla del rango con `Mayús`; es estado de interacción, no del modelo. */
  const rangeAnchorRef = useRef<string | null>(null);

  const units = project.settings.units;
  const columns = datasheetColumns(entity);
  const allRows = useMemo(() => projectDatasheetRows(project, entity), [project, entity]);

  const haystack = useCallback(
    (row: Parameters<typeof datasheetRowSearchText>[0]) => datasheetRowSearchText(
      row,
      (key) => t(key),
      (value, quantity) => formatDatasheetNumber(value, units, quantity),
    ),
    [t, units],
  );

  const facets = useMemo(() => datasheetFacets(allRows, entity), [allRows, entity]);
  const rows = useMemo(
    () => applyDatasheetPipeline({ rows: allRows, query, filters, sort, haystack }),
    [allRows, query, filters, sort, haystack],
  );

  const selectedIds = useMemo(() => selectionIds(selection, entity), [selection, entity]);

  // Cambiar de entidad invalida orden, filtros y foco: sus columnas son otras.
  useEffect(() => {
    setFilters({});
    setSort(null);
    setFocus({ row: 0, column: 0 });
    rangeAnchorRef.current = null;
  }, [entity]);

  // Buscar o filtrar puede dejar el foco fuera de la tabla; se reencaja para que
  // la rejilla nunca se quede sin su única parada de tabulación.
  useEffect(() => {
    setFocus((current) => {
      const next = clampGridPosition(current, { rows: rows.length, columns: columns.length });
      return next.row === current.row && next.column === current.column ? current : next;
    });
  }, [rows.length, columns.length]);

  // Al abrir, el datasheet se sitúa sobre lo que ya estaba seleccionado en el
  // lienzo, en vez de mandar al usuario a buscar su objeto en la primera fila.
  useEffect(() => {
    if (!open || !selection || selection.kind === 'multi') return;
    const targetEntity: DatasheetEntity | null = selection.kind === 'node'
      ? 'nodes'
      : selection.kind === 'member'
        ? 'members'
        : selection.kind === 'nodalLoad' || selection.kind === 'memberLoad' ? 'loads' : null;
    if (targetEntity) setEntity(targetEntity);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sólo en la apertura
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const index = rows.findIndex((row) => selectedIds.has(row.id));
    if (index >= 0) setFocus((current) => (current.row === index ? current : { ...current, row: index }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sólo al cambiar de entidad tras abrir
  }, [entity, open]);

  const target = useMemo(() => {
    const focusedRow = rows[Math.min(focus.row, Math.max(rows.length - 1, 0))];
    return focusedRow ? { kind: focusedRow.kind, id: focusedRow.id } : null;
  }, [focus.row, rows]);

  const onSelectRow = useCallback((rowId: string, mode: 'replace' | 'additive' | 'range') => {
    const current = [...selectedIds];
    if (mode === 'replace') {
      rangeAnchorRef.current = rowId;
      setSelection(buildSelection(entity, [rowId], selection, rows));
      return;
    }
    if (mode === 'additive') {
      rangeAnchorRef.current = rowId;
      const next = current.includes(rowId) ? current.filter((id) => id !== rowId) : [...current, rowId];
      setSelection(buildSelection(entity, next, selection, rows));
      return;
    }
    const anchor = rangeAnchorRef.current ?? rowId;
    const from = rows.findIndex((row) => row.id === anchor);
    const to = rows.findIndex((row) => row.id === rowId);
    if (from < 0 || to < 0) {
      setSelection(buildSelection(entity, [rowId], selection, rows));
      return;
    }
    const range = rows.slice(Math.min(from, to), Math.max(from, to) + 1).map((row) => row.id);
    setSelection(buildSelection(entity, range, selection, rows));
  }, [entity, rows, selectedIds, selection, setSelection]);

  const onActivateRow = useCallback((rowId: string) => {
    rangeAnchorRef.current = rowId;
    setSelection(buildSelection(entity, [rowId], selection, rows));
  }, [entity, selection, setSelection]);

  const onRequestEdit = useCallback((column: DatasheetColumn) => {
    setAnnouncement(t(editabilityMessageKey(column.editability), { column: t(column.labelKey) }));
  }, [t]);

  const onClearSelection = useCallback(() => {
    if (selectedIds.size === 0) return false;
    setSelection(buildSelection(entity, [], selection, rows));
    rangeAnchorRef.current = null;
    return true;
  }, [entity, selectedIds.size, selection, setSelection]);

  const onFocusObject = useCallback(() => {
    if (!target) return;
    setSelection({ kind: target.kind, id: target.id });
    // El datasheet es modal: dejarlo abierto taparía justo el objeto que se
    // acaba de centrar, así que enfocar es un solo gesto que además lo cierra.
    onOpenChange(false);
    window.requestAnimationFrame(() => emitWorkspaceCommand('focus-object', { kind: target.kind, id: target.id }));
  }, [onOpenChange, setSelection, target]);

  const toggleFacet = useCallback((columnId: string, token: string) => {
    setFilters((current) => {
      const active = new Set(current[columnId] ?? []);
      if (active.has(token)) active.delete(token);
      else active.add(token);
      return { ...current, [columnId]: active };
    });
  }, []);

  return <Drawer
    open={open}
    onOpenChange={onOpenChange}
    side="bottom"
    title={t('datasheet.title')}
    description={t('datasheet.description')}
    closeLabel={t('datasheet.close')}
    className="datasheet-surface"
    returnFocusTo={returnFocusTo}
  >
    <div className="datasheet-layout">
      <div className="datasheet-main">
        <div className="datasheet-toolbar">
          <div className="datasheet-entity" role="group" aria-label={t('datasheet.entityGroup')}>
            {(['nodes', 'members', 'loads'] as const).map((candidate) => <button
              key={candidate}
              type="button"
              className={entity === candidate ? 'active' : ''}
              aria-pressed={entity === candidate}
              onClick={() => setEntity(candidate)}
            >
              {t(candidate === 'nodes'
                ? 'datasheet.entity.nodes'
                : candidate === 'members' ? 'datasheet.entity.members' : 'datasheet.entity.loads')}
              <span className="datasheet-entity__count">
                {candidate === 'nodes'
                  ? project.nodes.length
                  : candidate === 'members'
                    ? project.members.length
                    : project.nodalLoads.length + project.memberLoads.length}
              </span>
            </button>)}
          </div>

          <label className="datasheet-search">
            <Search size={15} aria-hidden="true" />
            <input
              type="search"
              value={query}
              placeholder={t('datasheet.searchPlaceholder')}
              aria-label={t('datasheet.searchLabel')}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <p className="datasheet-count" role="status">
            {t('datasheet.rowCount', { visible: rows.length, total: allRows.length })}
          </p>
        </div>

        {facets.length > 0 ? <div className="datasheet-filters">
          {facets.map((facet) => <div key={facet.columnId} className="datasheet-filter" role="group" aria-label={t(facet.labelKey)}>
            <span className="datasheet-filter__label">{t(facet.labelKey)}</span>
            {facet.options.map((option) => {
              const active = filters[facet.columnId]?.has(option.token) ?? false;
              return <button
                key={option.token}
                type="button"
                className={`datasheet-chip${active ? ' active' : ''}`}
                aria-pressed={active}
                onClick={() => toggleFacet(facet.columnId, option.token)}
              >
                {/* Un enumerado del dominio se traduce; lo que nombra el usuario
                    se muestra tal cual. El token nunca se enseña: es la clave. */}
                {option.labelKey ? t(option.labelKey) : option.label ?? option.token}
                <span className="datasheet-chip__count">{option.count}</span>
              </button>;
            })}
          </div>)}
        </div> : null}

        <DatasheetGrid
          columns={columns}
          rows={rows}
          units={units}
          t={t}
          selectedIds={selectedIds}
          focus={focus}
          onFocusChange={setFocus}
          sort={sort}
          onSortChange={setSort}
          onSelectRow={onSelectRow}
          onActivateRow={onActivateRow}
          onRequestEdit={onRequestEdit}
          onClearSelection={onClearSelection}
          emptyMessage={t('datasheet.emptyFiltered')}
        />

        <p className="datasheet-keyboard-hint">{t('datasheet.keyboardHint')}</p>
        <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
      </div>

      <DatasheetContextPanel
        project={project}
        target={target}
        units={units}
        t={t}
        onFocusObject={onFocusObject}
        focusLabel={t('datasheet.focusObject')}
      />
    </div>
  </Drawer>;
};

export default DatasheetPanel;
