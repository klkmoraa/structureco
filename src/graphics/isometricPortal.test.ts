import { describe, expect, it } from 'vitest';
import { buildPortal, projectIso, DEFAULT_PORTAL, type Face } from './isometricPortal';

describe('projectIso', () => {
  it('sends the world origin to the projection origin', () => {
    expect(projectIso({ x: 0, y: 0, z: 0 })).toEqual({ x: 0, y: 0 });
  });

  it('mirrors x and z horizontally, so the two are distinguishable', () => {
    const a = projectIso({ x: 1, y: 0, z: 0 });
    const b = projectIso({ x: 0, y: 0, z: 1 });
    expect(a.x).toBeCloseTo(-b.x, 6);
    expect(a.y).toBeCloseTo(b.y, 6);
  });

  it('sends height straight up the screen', () => {
    const ground = projectIso({ x: 0, y: 0, z: 0 });
    const up = projectIso({ x: 0, y: 10, z: 0 });
    expect(up.x).toBeCloseTo(ground.x, 6);
    expect(up.y).toBeLessThan(ground.y);
  });
});

describe('buildPortal', () => {
  const faces = buildPortal();

  it('emits faces for every material of the portal', () => {
    const materials = new Set(faces.map((f) => f.material));
    expect(materials).toEqual(new Set(['column', 'beam', 'base', 'capital']));
  });

  it('splits the lintel into the requested number of modules', () => {
    const beams = faces.filter((f) => f.material === 'beam');
    const modules = new Set(beams.map((f) => f.id.split(':')[1]));
    expect(modules.size).toBe(DEFAULT_PORTAL.beamModules);
  });

  it('returns faces sorted back to front so painting them in order is correct', () => {
    const depths = faces.map((f) => f.depth);
    expect(depths).toEqual([...depths].sort((a, b) => a - b));
  });

  it('gives every face a closed polygon of at least three points', () => {
    for (const face of faces) expect(face.points.length).toBeGreaterThanOrEqual(3);
  });

  it('shades top faces brighter than side faces, from a single light', () => {
    const brightest = (material: Face['material'], kind: string) => {
      const face = faces.find((f) => f.material === material && f.id.endsWith(kind));
      if (!face) throw new Error(`missing ${material} ${kind}`);
      return face.shade;
    };
    expect(brightest('beam', 'top')).toBeGreaterThan(brightest('beam', 'right'));
    expect(brightest('column', 'left')).toBeGreaterThan(brightest('column', 'right'));
  });

  it('keeps shade inside the unit interval so materials can interpolate on it', () => {
    for (const face of faces) {
      expect(face.shade).toBeGreaterThanOrEqual(0);
      expect(face.shade).toBeLessThanOrEqual(1);
    }
  });

  it('is parametric: a wider span moves the right column right', () => {
    const rightOf = (fs: Face[]) => Math.max(...fs.flatMap((f) => f.points.map((p) => p.x)));
    expect(rightOf(buildPortal({ ...DEFAULT_PORTAL, span: DEFAULT_PORTAL.span * 1.5 })))
      .toBeGreaterThan(rightOf(faces));
  });

  it('is deterministic', () => {
    expect(buildPortal()).toEqual(buildPortal());
  });
});
