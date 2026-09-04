import { describe, expect, it } from 'vitest';
import { gridMajorEvery, gridStepMultiplier, MIN_GRID_STEP_PX, planCanvasGrid } from './canvasGrid';

const viewport = { width: 800, height: 600 };
const camera = (scale: number, x = 0, y = 600) => ({ scale, x, y });

const segments = (path: string) => (path ? path.split('M').filter(Boolean).length : 0);

describe('adaptive canvas grid', () => {
  it('only coarsens by whole multiples of the snap step, so every line is snappable', () => {
    expect(gridStepMultiplier(40)).toBe(1);
    expect(gridStepMultiplier(6)).toBe(2);
    expect(gridStepMultiplier(2)).toBe(5);
    expect(gridStepMultiplier(0.5)).toBe(20);
  });

  it('keeps a métric reference when the old grid switched itself off', () => {
    // 0.25 m a 20 px/m son 5 px por división: la retícula anterior devolvía
    // null y el dibujo se quedaba sin referencia. Ahora sube al múltiplo ×2.
    const plan = planCanvasGrid(camera(20), viewport, 0.25);
    expect(plan).not.toBeNull();
    expect(plan!.step).toBe(0.5);
    expect(plan!.stepPx).toBeGreaterThanOrEqual(MIN_GRID_STEP_PX);
    // Y a un zoom mucho menor sigue habiendo retícula, sólo que más gruesa.
    expect(planCanvasGrid(camera(4), viewport, 0.25)!.step).toBe(2.5);
  });

  it('promotes one line in five once the divisions are far enough apart', () => {
    expect(gridMajorEvery(12)).toBe(5);
    expect(gridMajorEvery(9)).toBe(10);
    expect(planCanvasGrid(camera(60), viewport, 1)!.majorEvery).toBe(5);
  });

  it('draws the model axes apart from the divisions when the origin is in frame', () => {
    const plan = planCanvasGrid(camera(60, 300, 400), viewport, 1)!;
    // x = 0 en pantalla 300 e y = 0 en pantalla 400: ambos ejes están dentro.
    expect(plan.axes).toBe('M300 0V600M0 400H800');
    expect(plan.minor).not.toContain('M300 0V600');
    expect(plan.major).not.toContain('M300 0V600');
  });

  it('leaves the axes out when the origin is off screen', () => {
    expect(planCanvasGrid(camera(60, -4000, 9000), viewport, 1)!.axes).toBe('');
  });

  it('covers the viewport with a bounded number of subpaths', () => {
    const plan = planCanvasGrid(camera(85, 120, 500), viewport, 1)!;
    const total = segments(plan.minor) + segments(plan.major) + segments(plan.axes);
    // 800/85 verticales + 600/85 horizontales, con margen por el redondeo.
    expect(total).toBeGreaterThan(10);
    expect(total).toBeLessThan(24);
  });

  it('refuses degenerate cameras and viewports instead of emitting NaN paths', () => {
    expect(planCanvasGrid(camera(0), viewport, 1)).toBeNull();
    expect(planCanvasGrid(camera(Number.NaN), viewport, 1)).toBeNull();
    expect(planCanvasGrid(camera(60), { width: 0, height: 600 }, 1)).toBeNull();
    const fallback = planCanvasGrid(camera(60), viewport, 0)!;
    expect(fallback.step).toBe(1);
  });
});
