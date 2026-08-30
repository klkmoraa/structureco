import { describe, expect, it } from 'vitest';
import { modelBounds } from '../../graphics/structureGeometry';
import { screenToModelPoint } from './canvasInteraction';
import { cameraToFitBounds, canvasSafeInsetsFor, canvasSafeRect, finiteModelBounds } from './canvasChromeGeometry';

const node = (id: string, x: number, y: number) => ({ id, x, y, support: { type: 'none' as const } });

describe('canvas chrome safe zones', () => {
  it('reserves compact edge zones without collapsing narrow canvases', () => {
    expect(canvasSafeInsetsFor({ width: 390, height: 844 })).toEqual({ top: 104, right: 58, bottom: 58, left: 58 });
    expect(canvasSafeRect({ width: 390, height: 844 })).toEqual({ x: 58, y: 104, width: 274, height: 682 });
  });

  it('uses larger desktop zones for chrome while preserving a useful center', () => {
    const safe = canvasSafeRect({ width: 1000, height: 640 });
    expect(safe).toEqual({ x: 64, y: 116, width: 872, height: 462 });
  });

  it('fits and centers model bounds inside the safe rectangle', () => {
    const viewport = { width: 1000, height: 640 };
    const safe = canvasSafeRect(viewport);
    const camera = cameraToFitBounds({ minX: 0, maxX: 6, minY: 0, maxY: 4 }, viewport);
    const safeCenter = { x: safe.x + safe.width / 2, y: safe.y + safe.height / 2 };

    expect(screenToModelPoint(safeCenter, camera)).toEqual({ x: 3, y: 2 });
    expect(camera.scale).toBeCloseTo(115.5, 10);
  });

  it('falls back to a finite origin-centered camera for empty bounds', () => {
    const viewport = { width: 1000, height: 640 };
    const bounds = modelBounds([]);
    const safe = canvasSafeRect(viewport);
    const camera = cameraToFitBounds(bounds, viewport);

    expect(finiteModelBounds(bounds)).toEqual({ minX: -1, maxX: 1, minY: -1, maxY: 1 });
    expect(Object.values(camera).every(Number.isFinite)).toBe(true);
    expect(screenToModelPoint(
      { x: safe.x + safe.width / 2, y: safe.y + safe.height / 2 },
      camera,
    )).toEqual({ x: 0, y: 0 });
  });

  it('keeps a single-point model finite and centered', () => {
    const viewport = { width: 390, height: 844 };
    const safe = canvasSafeRect(viewport);
    const camera = cameraToFitBounds({ minX: 4, maxX: 4, minY: -3, maxY: -3 }, viewport);

    expect(Object.values(camera).every(Number.isFinite)).toBe(true);
    expect(screenToModelPoint(
      { x: safe.x + safe.width / 2, y: safe.y + safe.height / 2 },
      camera,
    )).toEqual({ x: 4, y: -3 });
  });

  it('fits separated nodes joined by a diagonal member without invalid coordinates', () => {
    const viewport = { width: 1000, height: 640 };
    const bounds = modelBounds([
      node('N1', -2, -1),
      node('N2', 5, 6),
    ]);
    const camera = cameraToFitBounds(bounds, viewport);
    const start = { x: camera.x + bounds.minX * camera.scale, y: camera.y - bounds.minY * camera.scale };
    const end = { x: camera.x + bounds.maxX * camera.scale, y: camera.y - bounds.maxY * camera.scale };

    expect(Object.values(camera).every(Number.isFinite)).toBe(true);
    expect(Object.values(start).every(Number.isFinite)).toBe(true);
    expect(Object.values(end).every(Number.isFinite)).toBe(true);
  });

  it('ignores non-finite safe-zone values instead of poisoning the camera', () => {
    const viewport = { width: 1000, height: 640 };
    const insets = { ...canvasSafeInsetsFor(viewport), bottom: Number.NaN };
    const camera = cameraToFitBounds({ minX: 0, maxX: 6, minY: 0, maxY: 4 }, viewport, insets);

    expect(canvasSafeRect(viewport, insets)).toEqual(canvasSafeRect(viewport));
    expect(Object.values(camera).every(Number.isFinite)).toBe(true);
  });

  it('clamps tiny and huge models to the established camera range', () => {
    expect(cameraToFitBounds({ minX: 0, maxX: 0.1, minY: 0, maxY: 0.1 }, { width: 1536, height: 960 }).scale).toBe(150);
    expect(cameraToFitBounds({ minX: 0, maxX: 1000, minY: 0, maxY: 1000 }, { width: 390, height: 844 }).scale).toBe(24);
  });
});
