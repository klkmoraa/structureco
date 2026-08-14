import { useCallback, useEffect, useMemo, useRef, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import type { TranslationKey } from '../../i18n/catalogs';
import type { UnitSystemId } from '../../types';
import {
  clampGridPosition,
  isGridNavigationKey,
  moveGridFocus,
  type GridPosition,
} from './datasheetGridNavigation';
import type { DatasheetColumn, DatasheetRow, DatasheetSort } from './datasheetModel';
import { datasheetCellText, datasheetColumnHeader } from './datasheetPresentation';

export interface DatasheetGridProps {
  columns: readonly DatasheetColumn[];
  rows: readonly DatasheetRow[];
  units: UnitSystemId;
  t: (key: TranslationKey, variables?: Record<string, string | number>) => string;
  /** Filas actualmente seleccionadas en el workspace; no es el foco. */
  selectedIds: ReadonlySet<string>;
  focus: GridPosition;
  onFocusChange: (position: GridPosition) => void;
  sort: DatasheetSort | null;
  onSortChange: (sort: DatasheetSort | null) => void;
  /** `additive` alterna la fila dentro de la selección; `range` extiende. */
  onSelectRow: (rowId: string, mode: 'replace' | 'additive' | 'range') => void;
  /** `Enter` o doble pulsación sobre una fila. */
  onActivateRow: (rowId: string) => void;
  /** `Enter`/`F2`: intento de edición sobre la celda enfocada. */
  onRequestEdit: (column: DatasheetColumn) => void;
  /** `Esc` con selección activa; devuelve `true` si consumió la tecla. */
  onClearSelection: () => boolean;
  emptyMessage: string;
}

const sortIcon = (state: 'asc' | 'desc' | null) => {
  if (state === 'asc') return <ChevronUp size={14} aria-hidden="true" />;
  if (state === 'desc') return <ChevronDown size={14} aria-hidden="true" />;
  return <ChevronsUpDown size={14} aria-hidden="true" />;
};

const nextSort = (column: DatasheetColumn, sort: DatasheetSort | null): DatasheetSort | null => {
  if (sort?.columnId !== column.id) return { columnId: column.id, direction: 'asc' };
  if (sort.direction === 'asc') return { columnId: column.id, direction: 'desc' };
  // Tercera pulsación: se vuelve al orden del modelo. Sin esta vuelta no hay
  // forma de recuperar el orden en que el usuario construyó la estructura.
  return null;
};

/**
 * Rejilla semántica y plana del datasheet.
 *
 * Es una `<table role="grid">` con foco itinerante: exactamente una celda tiene
 * `tabIndex=0`, así que la rejilla entera es una sola parada de tabulación y
 * dentro se navega con las flechas, como manda el patrón `grid` de ARIA.
 *
 * No tiene relieve por fila a propósito. `SurfaceLevel` reserva `flat` para las
 * zonas técnicas densas: dar volumen a cada fila convierte una rejilla de datos
 * en un montón de fichas y se lee peor.
 */
export const DatasheetGrid = ({
  columns,
  rows,
  units,
  t,
  selectedIds,
  focus,
  onFocusChange,
  sort,
  onSortChange,
  onSelectRow,
  onActivateRow,
  onRequestEdit,
  onClearSelection,
  emptyMessage,
}: DatasheetGridProps) => {
  const bodyRef = useRef<HTMLTableSectionElement>(null);
  const rowCount = rows.length;
  const columnCount = columns.length;
  const safeFocus = useMemo(
    () => clampGridPosition(focus, { rows: rowCount, columns: columnCount }),
    [focus, rowCount, columnCount],
  );

  // El foco del DOM sólo se mueve cuando ya estaba dentro de la rejilla. Si se
  // moviera siempre, filtrar mientras se escribe robaría el foco de la caja de
  // búsqueda en cada pulsación.
  const shouldRestoreFocusRef = useRef(false);
  useEffect(() => {
    if (!shouldRestoreFocusRef.current) return;
    shouldRestoreFocusRef.current = false;
    const cell = bodyRef.current?.querySelector<HTMLElement>('[data-datasheet-focused="true"]');
    cell?.focus({ preventScroll: false });
  }, [safeFocus.row, safeFocus.column, rows]);

  const moveFocus = useCallback((position: GridPosition) => {
    shouldRestoreFocusRef.current = true;
    onFocusChange(position);
  }, [onFocusChange]);

  const onKeyDown = useCallback((event: ReactKeyboardEvent<HTMLTableSectionElement>) => {
    if (rows.length === 0) return;
    const { key } = event;

    if (isGridNavigationKey(key)) {
      const next = moveGridFocus(safeFocus, key, { rows: rowCount, columns: columnCount }, {
        extendToEdge: event.ctrlKey || event.metaKey,
      });
      event.preventDefault();
      if (next.row !== safeFocus.row || next.column !== safeFocus.column) moveFocus(next);
      return;
    }

    if (key === 'Enter') {
      event.preventDefault();
      const row = rows[safeFocus.row];
      const column = columns[safeFocus.column];
      if (row) onActivateRow(row.id);
      if (column) onRequestEdit(column);
      return;
    }

    if (key === 'F2') {
      event.preventDefault();
      const column = columns[safeFocus.column];
      if (column) onRequestEdit(column);
      return;
    }

    if (key === ' ' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      const row = rows[safeFocus.row];
      if (row) onSelectRow(row.id, 'additive');
      return;
    }

    if (key === 'Escape') {
      // El Drawer cierra con Escape desde un listener en `document`. Sólo se
      // detiene la propagación cuando había algo que limpiar, para que la
      // segunda pulsación sí cierre el datasheet.
      if (onClearSelection()) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  }, [columnCount, columns, moveFocus, onActivateRow, onClearSelection, onRequestEdit, onSelectRow, rowCount, rows, safeFocus]);

  const onCellMouseDown = useCallback((event: ReactMouseEvent<HTMLElement>, row: DatasheetRow, rowIndex: number, columnIndex: number) => {
    moveFocus({ row: rowIndex, column: columnIndex });
    if (event.shiftKey) onSelectRow(row.id, 'range');
    else if (event.ctrlKey || event.metaKey) onSelectRow(row.id, 'additive');
    else onSelectRow(row.id, 'replace');
  }, [moveFocus, onSelectRow]);

  if (rows.length === 0) {
    return <p className="datasheet-empty" role="status">{emptyMessage}</p>;
  }

  return <div className="datasheet-grid-scroll">
    <table
      className="datasheet-grid"
      role="grid"
      aria-label={t('datasheet.gridLabel')}
      aria-rowcount={rows.length + 1}
      aria-colcount={columns.length}
    >
      <thead>
        <tr aria-rowindex={1}>
          {columns.map((column, columnIndex) => {
            const state = sort?.columnId === column.id ? sort.direction : null;
            return <th
              key={column.id}
              scope="col"
              aria-colindex={columnIndex + 1}
              aria-sort={state === 'asc' ? 'ascending' : state === 'desc' ? 'descending' : 'none'}
              className={column.numeric ? 'is-numeric' : undefined}
            >
              <button
                type="button"
                className="datasheet-sort"
                onClick={() => onSortChange(nextSort(column, sort))}
              >
                <span>{datasheetColumnHeader(column, units, t)}</span>
                {sortIcon(state)}
              </button>
            </th>;
          })}
        </tr>
      </thead>
      <tbody ref={bodyRef} onKeyDown={onKeyDown}>
        {rows.map((row, rowIndex) => {
          const selected = selectedIds.has(row.id);
          return <tr
            key={row.id}
            aria-rowindex={rowIndex + 2}
            aria-selected={selected}
            data-selected={selected ? 'true' : undefined}
          >
            {columns.map((column, columnIndex) => {
              const focused = rowIndex === safeFocus.row && columnIndex === safeFocus.column;
              const Cell = columnIndex === 0 ? 'th' : 'td';
              return <Cell
                key={column.id}
                {...(columnIndex === 0 ? { scope: 'row' as const } : {})}
                aria-colindex={columnIndex + 1}
                aria-readonly
                tabIndex={focused ? 0 : -1}
                data-datasheet-focused={focused ? 'true' : undefined}
                data-editability={column.editability}
                className={column.numeric ? 'is-numeric' : undefined}
                onMouseDown={(event) => onCellMouseDown(event, row, rowIndex, columnIndex)}
                onDoubleClick={() => onRequestEdit(column)}
              >
                {datasheetCellText(row.values[column.id], units, t)}
              </Cell>;
            })}
          </tr>;
        })}
      </tbody>
    </table>
  </div>;
};
