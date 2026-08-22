import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { calculateOrthographicFrame } from './threeStructuralRender';
import { buildThreeFamilyGroup, THREE_FAMILY_ASSET_IDS } from './threeFamilyAssets';

describe('Three.js structural render framing', () => {
  it('keeps every family asset inside a padded 3:2 orthographic frame', () => {
    const direction = new THREE.Vector3(5.4, 4.1, 6.2);
    for (const assetId of THREE_FAMILY_ASSET_IDS) {
      const bounds = new THREE.Box3().setFromObject(buildThreeFamilyGroup(assetId, 'day'));
      const center = bounds.getCenter(new THREE.Vector3());
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
      camera.position.copy(center).add(direction.clone().normalize().multiplyScalar(10));
      camera.lookAt(center);
      camera.updateMatrixWorld(true);
      const frame = calculateOrthographicFrame(bounds, 1.5, direction);
      const corners = [
        [bounds.min.x, bounds.min.y, bounds.min.z], [bounds.min.x, bounds.min.y, bounds.max.z],
        [bounds.min.x, bounds.max.y, bounds.min.z], [bounds.min.x, bounds.max.y, bounds.max.z],
        [bounds.max.x, bounds.min.y, bounds.min.z], [bounds.max.x, bounds.min.y, bounds.max.z],
        [bounds.max.x, bounds.max.y, bounds.min.z], [bounds.max.x, bounds.max.y, bounds.max.z],
      ].map(([x, y, z]) => new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse));

      for (const point of corners) {
        expect(point.x, `${assetId} left`).toBeGreaterThan(frame.left);
        expect(point.x, `${assetId} right`).toBeLessThan(frame.right);
        expect(point.y, `${assetId} bottom`).toBeGreaterThan(frame.bottom);
        expect(point.y, `${assetId} top`).toBeLessThan(frame.top);
      }
      expect((frame.right - frame.left) / (frame.top - frame.bottom), assetId).toBeCloseTo(1.5, 5);
    }
  });
});
