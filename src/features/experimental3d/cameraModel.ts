import type { Experimental3DBounds, Experimental3DPoint } from './sceneModel';

export type Experimental3DViewPreset = 'front' | 'isometric';

export interface Experimental3DCameraPlacement {
  readonly position: readonly [number, number, number];
  readonly target: Experimental3DPoint;
  readonly near: number;
  readonly far: number;
}

export const computeCameraPlacement = (
  bounds: Experimental3DBounds,
  preset: Experimental3DViewPreset,
): Experimental3DCameraPlacement => {
  const span = Number.isFinite(bounds.span) && bounds.span > 0 ? bounds.span : 10;
  const halfVerticalFov = (45 * Math.PI / 180) / 2;
  const distance = Math.max(2, (span / 2) / Math.tan(halfVerticalFov) * 1.45);
  const [x, y, z] = bounds.center;
  const position = preset === 'front'
    ? [x, y, z + distance] as const
    : [x + distance * 0.72, y + distance * 0.58, z + distance] as const;

  return Object.freeze({
    position,
    target: bounds.center,
    near: Math.max(0.001, distance / 1_000),
    far: Math.max(100, distance * 100),
  });
};
