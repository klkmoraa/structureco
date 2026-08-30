import { formatNearZero, formatNumber, formatValue } from '../../utils/numberFormat';

/**
 * Results share the Inspector's reading rule: the same stored value must not read as
 * `1e-14` in one panel and `1.0000e-14` in the other.
 */
export const formatResultNumber = (value: number) => formatNumber(value, 'table');

export const formatResultValue = (value: number, unit: string) => formatValue(value, unit, 'table');

/**
 * Presentation-only tolerance for residuals and reaction readings. The solver
 * value remains untouched and a real small value is kept unless it is at the
 * existing relative machine-noise threshold.
 */
export const formatResultNearZero = (value: number, reference: number) => formatNearZero(
  value,
  Number.isFinite(reference) ? reference : 1,
  'table',
);
