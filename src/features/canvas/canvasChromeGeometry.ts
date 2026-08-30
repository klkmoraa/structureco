import type { CanvasCamera, ViewportSize } from './canvasInteraction';

export interface CanvasSafeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface CanvasSafeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ModelBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const FALLBACK_MODEL_BOUNDS: ModelBounds = {
  // Keep the model origin visible when the source bounds are empty or corrupt.
  minX: -1,
  maxX: 1,
  minY: -1,
  maxY: 1,
};

const finiteAtLeast = (value: number, minimum: number, fallback: number): number =>
  Number.isFinite(value) ? Math.max(minimum, value) : fallback;

/** Keeps fit inputs finite without changing valid model-space bounds. */
export const finiteModelBounds = (bounds: ModelBounds): ModelBounds => {
  const values = [bounds.minX, bounds.maxX, bounds.minY, bounds.maxY];
  if (!values.every(Number.isFinite) || bounds.minX > bounds.maxX || bounds.minY > bounds.maxY) {
    return { ...FALLBACK_MODEL_BOUNDS };
  }
  return bounds;
};

export const canvasSafeInsetsFor = (viewport: ViewportSize): CanvasSafeInsets => {
  if (viewport.width <= 480) return { top: 104, right: 58, bottom: 58, left: 58 };
  if (viewport.width <= 1023) return { top: 116, right: 64, bottom: 62, left: 64 };
  return { top: 116, right: 68, bottom: 62, left: 68 };
};

export const canvasSafeRect = (
  viewport: ViewportSize,
  insets: CanvasSafeInsets = canvasSafeInsetsFor(viewport),
): CanvasSafeRect => {
  const safeViewport = {
    width: finiteAtLeast(viewport.width, 1, 1),
    height: finiteAtLeast(viewport.height, 1, 1),
  };
  const defaultInsets = canvasSafeInsetsFor(safeViewport);
  const safeInsets = {
    top: finiteAtLeast(insets.top, 0, defaultInsets.top),
    right: finiteAtLeast(insets.right, 0, defaultInsets.right),
    bottom: finiteAtLeast(insets.bottom, 0, defaultInsets.bottom),
    left: finiteAtLeast(insets.left, 0, defaultInsets.left),
  };
  return {
    x: safeInsets.left,
    y: safeInsets.top,
    width: Math.max(1, safeViewport.width - safeInsets.left - safeInsets.right),
    height: Math.max(1, safeViewport.height - safeInsets.top - safeInsets.bottom),
  };
};

/** Fits model bounds inside the chrome-free rectangle without changing model data. */
export const cameraToFitBounds = (
  bounds: ModelBounds,
  viewport: ViewportSize,
  insets: CanvasSafeInsets = canvasSafeInsetsFor(viewport),
  minScale = 24,
  maxScale = 150,
): CanvasCamera => {
  const safeBounds = finiteModelBounds(bounds);
  const safe = canvasSafeRect(viewport, insets);
  const safeMinScale = finiteAtLeast(minScale, 1, 24);
  const safeMaxScale = Number.isFinite(maxScale)
    ? Math.max(safeMinScale, maxScale)
    : Math.max(safeMinScale, 150);
  const spanX = Math.max(2, safeBounds.maxX - safeBounds.minX);
  const spanY = Math.max(2, safeBounds.maxY - safeBounds.minY);
  const scale = clamp(Math.min(safe.width / spanX, safe.height / spanY), safeMinScale, safeMaxScale);
  const modelCenterX = (safeBounds.minX + safeBounds.maxX) / 2;
  const modelCenterY = (safeBounds.minY + safeBounds.maxY) / 2;
  const screenCenterX = safe.x + safe.width / 2;
  const screenCenterY = safe.y + safe.height / 2;
  const fallback = {
    scale: clamp(85, safeMinScale, safeMaxScale),
    x: screenCenterX,
    y: screenCenterY,
  };
  const camera = {
    scale,
    x: screenCenterX - modelCenterX * scale,
    y: screenCenterY + modelCenterY * scale,
  };
  return Object.values(camera).every(Number.isFinite) ? camera : fallback;
};
