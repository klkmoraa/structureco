export interface InspectorNumberFormatOptions {
  maximumFractionDigits?: number;
  significantDigits?: number;
}

export type InspectorNumberParseResult =
  | { ok: true; value: number }
  | { ok: false; reason: 'empty' | 'invalid' | 'non-finite' };

const DEFAULT_SIGNIFICANT_DIGITS = 6;
const SCIENTIFIC_LOWER_BOUND = 1e-4;
const SCIENTIFIC_UPPER_BOUND = 1e7;
const DECIMAL_NUMBER_PATTERN = /^[+-]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:[eE][+-]?\d+)?$/;

const boundedInteger = (value: number | undefined, fallback: number, minimum: number, maximum: number) => {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.trunc(value)));
};

const stripTrailingFractionZeros = (value: string) => {
  if (!value.includes('.')) return value;
  return value.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
};

const formatScientific = (value: number, significantDigits: number, maximumFractionDigits?: number) => {
  const fractionDigits = maximumFractionDigits === undefined
    ? significantDigits - 1
    : Math.min(significantDigits - 1, maximumFractionDigits);
  const [rawMantissa, rawExponent] = value.toExponential(fractionDigits).split('e');
  const exponent = Number(rawExponent);
  const exponentSign = exponent >= 0 ? '+' : '';
  return `${stripTrailingFractionZeros(rawMantissa)}e${exponentSign}${exponent}`;
};

/**
 * Formats an Inspector value for reading. This is deliberately presentational:
 * it never feeds a rounded value back into project state.
 */
export const formatInspectorNumber = (
  value: number,
  options: InspectorNumberFormatOptions = {},
): string => {
  if (!Number.isFinite(value)) return '—';
  if (Object.is(value, -0) || value === 0) return '0';

  const significantDigits = boundedInteger(
    options.significantDigits,
    DEFAULT_SIGNIFICANT_DIGITS,
    1,
    21,
  );
  const maximumFractionDigits = options.maximumFractionDigits === undefined
    ? undefined
    : boundedInteger(options.maximumFractionDigits, 0, 0, 100);
  const magnitude = Math.abs(value);

  if (magnitude < SCIENTIFIC_LOWER_BOUND || magnitude >= SCIENTIFIC_UPPER_BOUND) {
    return formatScientific(value, significantDigits, maximumFractionDigits);
  }

  const roundedToSignificance = Number(value.toPrecision(significantDigits));
  const text = maximumFractionDigits === undefined
    ? String(roundedToSignificance)
    : roundedToSignificance.toFixed(maximumFractionDigits);
  const normalized = stripTrailingFractionZeros(text);
  return normalized === '-0' ? '0' : normalized;
};

export const formatInspectorValue = (
  value: number,
  unit = '',
  options: InspectorNumberFormatOptions = {},
): string => {
  const formatted = formatInspectorNumber(value, options);
  return unit ? `${formatted} ${unit}` : formatted;
};

/**
 * Returns JavaScript's shortest round-trip representation for editing. Unlike
 * the reading formatter, this function performs no precision reduction.
 */
export const serializeInspectorNumber = (value: number): string => {
  if (!Number.isFinite(value)) return '';
  return Object.is(value, -0) ? '0' : String(value);
};

/** Accepts decimal/scientific input only; blank, hexadecimal and Infinity are rejected. */
export const parseInspectorNumber = (text: string): InspectorNumberParseResult => {
  const normalized = text.trim();
  if (normalized === '') return { ok: false, reason: 'empty' };
  if (!DECIMAL_NUMBER_PATTERN.test(normalized)) return { ok: false, reason: 'invalid' };

  const value = Number(normalized);
  if (!Number.isFinite(value)) return { ok: false, reason: 'non-finite' };
  return { ok: true, value };
};
