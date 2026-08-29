export interface ModeShapeDof { readonly ux: number; readonly uy: number; readonly rz: number }
export interface ModelPoint { readonly x: number; readonly y: number }

export const modeShapePoints = (
  start: ModelPoint, end: ModelPoint, startDof: ModeShapeDof, endDof: ModeShapeDof,
  { samples = 13, scale = 1 }: { samples?: number; scale?: number } = {},
): ModelPoint[] => {
  const total = Math.max(2, Math.trunc(samples));
  const dx = end.x - start.x; const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (!(length > 0)) return [start, end];
  const c = dx / length; const s = dy / length;
  const ui = c * startDof.ux + s * startDof.uy; const vi = -s * startDof.ux + c * startDof.uy;
  const uj = c * endDof.ux + s * endDof.uy; const vj = -s * endDof.ux + c * endDof.uy;
  return Array.from({ length: total }, (_, index) => {
    const t = index / (total - 1);
    const n1 = 1 - 3 * t ** 2 + 2 * t ** 3;
    const n2 = t - 2 * t ** 2 + t ** 3;
    const n3 = 3 * t ** 2 - 2 * t ** 3;
    const n4 = -(t ** 2) + t ** 3;
    const u = (1 - t) * ui + t * uj;
    const v = n1 * vi + n2 * length * startDof.rz + n3 * vj + n4 * length * endDof.rz;
    return { x: start.x + t * dx + scale * (c * u - s * v), y: start.y + t * dy + scale * (s * u + c * v) };
  });
};

export const modeShapeScaleFor = (nodes: readonly ModelPoint[]) => {
  if (!nodes.length) return 1;
  const xs = nodes.map((node) => node.x); const ys = nodes.map((node) => node.y);
  return Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * 0.08 || 1;
};
