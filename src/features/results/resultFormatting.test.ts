import { describe, expect, it } from 'vitest';
import { formatResultNumber, formatResultValue } from './resultFormatting';

describe('result presentation formatting', () => {
  it('keeps six useful digits without writing back a rounded value', () => {
    const stored = 4.123456789012345;
    expect(formatResultNumber(stored)).toBe('4.12346');
    expect(stored).toBe(4.123456789012345);
  });

  it('reserves zero for exact zero and preserves small analytical values', () => {
    expect(formatResultNumber(-0)).toBe('0');
    expect(formatResultNumber(1e-14)).toBe('1.0000e-14');
    expect(formatResultNumber(0.0000123456)).toBe('1.2346e-5');
    expect(formatResultNumber(Number.NaN)).toBe('—');
    expect(formatResultValue(12.5, 'kN')).toBe('12.5 kN');
  });
});
