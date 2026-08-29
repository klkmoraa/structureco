import { describe, expect, it } from 'vitest';
import type { ProjectModel } from '../types';
import { analyzeBuckling } from './buckling';

const E = 2e8; const I = 1e-4; const A = 0.01; const length = 3;
const column = (load = -1): ProjectModel => ({
  schemaVersion: 1, id: 'column', name: 'column',
  nodes: Array.from({ length: 17 }, (_, index) => ({ id: `N${index}`, x: 0, y: length * index / 16, support: index === 0 ? { type: 'fixed' as const } : { type: 'none' as const } })),
  members: Array.from({ length: 16 }, (_, index) => ({ id: `M${index}`, i: `N${index}`, j: `N${index + 1}`, type: 'frame' as const, E, A, I })),
  loadCases: [{ id: 'LC1', name: 'LC1', category: 'variable', active: true }], combinations: [], nodalLoads: [{ id: 'P', nodeId: 'N16', caseId: 'LC1', fx: 0, fy: load, mz: 0 }], memberLoads: [],
  settings: { units: 'kN-m', language: 'es', gridSize: 1, snap: true, showGrid: true, showNodeLabels: true, showMemberLabels: false, showLocalAxes: false, showLoads: true, showDimensions: true, showResultValues: true, diagramScale: 1, deformedScale: 50, diagramSide: 'positive' },
});

describe('pandeo elástico lineal', () => {
  it('recupera Euler para una columna en voladizo', () => {
    const result = analyzeBuckling(column(), null, { modes: 1 });
    const exact = Math.PI ** 2 * E * I / (4 * length ** 2);
    expect(result.success, result.reason).toBe(true);
    expect(Math.abs(result.criticalLoadFactor! - exact) / exact).toBeLessThan(1e-3);
  });
  it('rechaza una columna sin compresión', () => {
    const result = analyzeBuckling(column(1));
    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/comprimido/);
  });
});
