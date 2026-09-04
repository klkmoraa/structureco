import { describe, expect, it } from 'vitest';
import { planScaleBar, scaleBarLabel } from './scaleBar';

describe('canvas scale bar', () => {
  it('picks the largest round length that still fits', () => {
    expect(planScaleBar(85, 108)).toEqual({ length: 1, widthPx: 85 });
    expect(planScaleBar(20, 108)).toEqual({ length: 5, widthPx: 100 });
    expect(planScaleBar(260, 108)).toEqual({ length: 0.2, widthPx: 52 });
  });

  it('only ever reports 1, 2 or 5 per decade', () => {
    for (let pixelsPerUnit = 4; pixelsPerUnit <= 400; pixelsPerUnit += 3) {
      const plan = planScaleBar(pixelsPerUnit, 108);
      if (!plan) continue;
      const mantissa = plan.length / 10 ** Math.floor(Math.log10(plan.length));
      expect([1, 2, 5].some((value) => Math.abs(mantissa - value) < 1e-9)).toBe(true);
      expect(plan.widthPx).toBeLessThanOrEqual(108);
    }
  });

  it('gives up rather than drawing a rule too short to read', () => {
    expect(planScaleBar(0, 108)).toBeNull();
    expect(planScaleBar(Number.NaN, 108)).toBeNull();
    expect(planScaleBar(85, 10)).toBeNull();
  });

  it('labels round lengths without padding zeros', () => {
    expect(scaleBarLabel(1, 'm')).toBe('1 m');
    expect(scaleBarLabel(12.5, 'm')).toBe('12.5 m');
    expect(scaleBarLabel(0.2, 'm')).toBe('0.2 m');
    // Un valor no finito es ausencia, nunca un número: la política numérica
    // del producto pone el marcador y la barra no inventa uno propio.
    expect(scaleBarLabel(Number.NaN, 'm')).toBe('— m');
  });
});
