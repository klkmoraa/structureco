// @vitest-environment jsdom
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { buildStudioScene, getStudioExportDimensions, serializeStudioSvg } from './studioScene';
import { createFactoryStudioParameters } from './presetRepository';

describe('Illustration Studio canonical scene and export', () => {
  it('applies the same normalized group and camera transforms used by preview and export', () => {
    const parameters = { ...createFactoryStudioParameters('portal:two-story'), widthScale: 1.4, heightScale: .8, depthScale: 1.2, camera: 'front' as const };
    const preview = buildStudioScene(parameters);
    const exported = buildStudioScene(parameters);
    expect(preview.group.userData.assetId).toBe('portal:two-story');
    expect(preview.group.scale.toArray()).toEqual([1.4, .8, 1.2]);
    expect(exported.group.scale.toArray()).toEqual(preview.group.scale.toArray());
    expect(exported.camera.position.toArray()).toEqual(preview.camera.position.toArray());
    expect(exported.camera.toJSON().object).toMatchObject({ left: preview.camera.left, right: preview.camera.right, top: preview.camera.top, bottom: preview.camera.bottom });
    expect(preview.scene.children.some((child) => child instanceof THREE.Mesh && (child as THREE.Mesh).geometry.type === 'PlaneGeometry')).toBe(false);
  });

  it('keeps technical load colors identical between Day and Night', () => {
    const colors = (theme: 'light' | 'dark') => {
      const bundle = buildStudioScene({ ...createFactoryStudioParameters('load:point'), previewTheme: theme });
      const result: string[] = [];
      bundle.group.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const material = object.material as THREE.MeshStandardMaterial;
        result.push(`#${material.color.getHexString()}`);
      });
      return result;
    };
    expect(colors('light')).toContain('#2f73c8');
    expect(colors('dark')).toContain('#2f73c8');
  });

  it('serializes a transparent 900x600 SVG from the transformed Three scene and camera', () => {
    const svg = serializeStudioSvg({ ...createFactoryStudioParameters('truss:warren'), widthScale: 1.25, camera: 'side' });
    expect(svg).toContain('width="900"');
    expect(svg).toContain('height="600"');
    expect(svg).toContain('viewBox="-450 -300 900 600"');
    expect(svg).not.toMatch(/background(?:-color)?\s*:/i);
    expect(svg).not.toMatch(/<rect[^>]+(?:fill|style)=/i);
    expect(svg).toMatch(/<(?:path|polygon)/);
  });

  it('defines exact transparent PNG dimensions at logical 900x600 for 1x, 2x and 4x', () => {
    expect(getStudioExportDimensions(1)).toEqual({ width: 900, height: 600, alpha: true });
    expect(getStudioExportDimensions(2)).toEqual({ width: 1800, height: 1200, alpha: true });
    expect(getStudioExportDimensions(4)).toEqual({ width: 3600, height: 2400, alpha: true });
  });
});
