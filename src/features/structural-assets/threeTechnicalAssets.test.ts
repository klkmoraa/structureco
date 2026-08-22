import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  THREE_TECHNICAL_ASSET_IDS,
  buildThreeTechnicalGroup,
} from './threeTechnicalAssets';

const EXPECTED_IDS = [
  'space-frame:single-module', 'space-frame:multi-bay', 'space-frame:two-story', 'space-frame:industrial-shed',
  'support:pin', 'support:roller', 'support:fixed', 'support:spring',
  'load:point', 'load:distributed', 'load:varying', 'load:applied-moment',
  'section:rectangular', 'section:circular', 'section:i-profile', 'section:box',
  'connection:rigid', 'connection:pinned', 'connection:base-plate', 'connection:splice',
] as const;

const meshSignature = (group: THREE.Group) => {
  const parts: string[] = [];
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.LineSegments) && !(object instanceof THREE.Line)) return;
    parts.push([
      object.type,
      object.geometry.type,
      object.position.toArray().map((value) => value.toFixed(3)).join(','),
      object.quaternion.toArray().map((value) => value.toFixed(3)).join(','),
      object.scale.toArray().map((value) => value.toFixed(3)).join(','),
    ].join(':'));
  });
  return parts.join('|');
};

const standardMaterialColors = (group: THREE.Group) => {
  const colors = new Set<string>();
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (material instanceof THREE.MeshStandardMaterial) colors.add(`#${material.color.getHexString()}`);
    }
  });
  return colors;
};

describe('Three.js technical structural scenes', () => {
  it('provides exactly the twenty approved technical asset IDs', () => {
    expect(THREE_TECHNICAL_ASSET_IDS).toEqual(EXPECTED_IDS);
  });

  it('builds twenty distinct editable structural scenes', () => {
    const signatures = THREE_TECHNICAL_ASSET_IDS.map((assetId) => {
      const group = buildThreeTechnicalGroup(assetId, 'day');
      let editableObjects = 0;
      group.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.LineSegments) {
          editableObjects += 1;
          expect(object.geometry, assetId).toBeInstanceOf(THREE.BufferGeometry);
        }
      });
      expect(group.userData.assetId).toBe(assetId);
      expect(editableObjects, assetId).toBeGreaterThan(3);
      return meshSignature(group);
    });
    expect(new Set(signatures)).toHaveLength(20);
  });

  it('uses only matte texture-free materials with no decorative plane backgrounds', () => {
    for (const theme of ['day', 'night'] as const) {
      for (const assetId of THREE_TECHNICAL_ASSET_IDS) {
        const group = buildThreeTechnicalGroup(assetId, theme);
        group.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          expect(object.geometry.type, `${assetId} background plane`).not.toBe('PlaneGeometry');
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          for (const material of materials) {
            if (!(material instanceof THREE.MeshStandardMaterial)) continue;
            expect(material.map, assetId).toBeNull();
            expect(material.emissiveMap, assetId).toBeNull();
            expect(material.roughness, assetId).toBeGreaterThanOrEqual(0.78);
          }
        });
      }
    }
  });

  it('keeps exact load colors identical in Day and Night', () => {
    const expected = new Map([
      ['load:point', '#2f73c8'],
      ['load:distributed', '#65a323'],
      ['load:varying', '#65a323'],
      ['load:applied-moment', '#c65f86'],
    ] as const);
    for (const theme of ['day', 'night'] as const) {
      for (const [assetId, color] of expected) {
        expect(standardMaterialColors(buildThreeTechnicalGroup(assetId, theme))).toContain(color);
      }
    }
  });
});
