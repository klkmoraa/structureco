import { toDisplay, unitLabel, type UnitQuantity } from '../../engine/units';
import type { TranslationKey } from '../../i18n/catalogs';
import type { UnitSystemId } from '../../types';
import { formatNumber } from '../../utils/numberFormat';
import type { DatasheetColumn, DatasheetEditability, DatasheetValue } from './datasheetModel';

/**
 * Paso de unidad base a texto leído.
 *
 * Está separado de `datasheetModel.ts` a propósito: el modelo ordena y filtra
 * con magnitudes internas, y aquí —y sólo aquí— se convierten al sistema del
 * proyecto. Mezclarlo haría que la misma columna ordenase distinto según las
 * unidades mostradas.
 */

/** Presentación de una celda: `formatNumber(…, 'table')` es la política común. */
export const formatDatasheetNumber = (
  value: number,
  units: UnitSystemId,
  quantity?: UnitQuantity,
): string => formatNumber(quantity ? toDisplay(value, units, quantity) : value, 'table');

export const datasheetCellText = (
  value: DatasheetValue | undefined,
  units: UnitSystemId,
  t: (key: TranslationKey) => string,
): string => {
  if (!value) return '—';
  if (value.kind === 'text') return value.text;
  if (value.kind === 'token') return t(value.labelKey);
  if (value.kind === 'ref') return value.label;
  return value.value === null ? '—' : formatDatasheetNumber(value.value, units, value.quantity);
};

/** Cabecera con su unidad: `x (m)`. Una columna adimensional no lleva paréntesis. */
export const datasheetColumnHeader = (
  column: DatasheetColumn,
  units: UnitSystemId,
  t: (key: TranslationKey) => string,
): string => {
  const label = t(column.labelKey);
  return column.quantity ? `${label} (${unitLabel(units, column.quantity)})` : label;
};

const EDITABILITY_MESSAGES: Record<DatasheetEditability, TranslationKey> = {
  identity: 'datasheet.readOnly.identity',
  derived: 'datasheet.readOnly.derived',
  inline: 'datasheet.edit.inlineHint',
  panel: 'datasheet.edit.panelHint',
};

/**
 * Lo que se anuncia al intentar editar una celda.
 *
 * Cada motivo dice algo distinto y verdadero: una identidad no se editará nunca,
 * un valor derivado se cambia editando su origen, y una celda editable dice
 * dónde se edita. Un mensaje único los haría indistinguibles, y el silencio
 * sería peor todavía.
 */
export const editabilityMessageKey = (editability: DatasheetEditability): TranslationKey =>
  EDITABILITY_MESSAGES[editability];
