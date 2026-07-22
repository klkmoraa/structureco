export const formatResultNumber = (value: number) => {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return '0';
  const absolute = Math.abs(value);
  if (absolute >= 1e7 || absolute < 1e-4) return value.toExponential(4);
  return Number(value.toPrecision(6)).toString();
};

export const formatResultValue = (value: number, unit: string) => `${formatResultNumber(value)} ${unit}`.trim();
