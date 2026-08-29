import { describe, expect, it } from 'vitest';
import type { ProjectModel, SupportDefinition } from '../types';
import { analyzeModal } from './modal';

const E = 2e8; const I = 1e-4; const A = 0.01; const density = 7850; const length = 6;
const project = (elements: number, left: SupportDefinition, right: SupportDefinition, memberDensity = density): ProjectModel => ({
  schemaVersion: 1, id: 'modal', name: 'modal', nodes: Array.from({ length: elements + 1 }, (_, index) => ({
    id: `N${index}`, x: length * index / elements, y: 0,
    support: index === 0 ? left : index === elements ? right : { type: 'none' as const },
  })),
  members: Array.from({ length: elements }, (_, index) => ({ id: `M${index}`, i: `N${index}`, j: `N${index + 1}`, type: 'frame' as const, E, A, I, density: memberDensity })),
  loadCases: [{ id: 'LC1', name: 'LC1', category: 'variable', active: true }], combinations: [], nodalLoads: [], memberLoads: [],
  settings: { units: 'kN-m', language: 'es', gridSize: 1, snap: true, showGrid: true, showNodeLabels: true, showMemberLabels: false, showLocalAxes: false, showLoads: true, showDimensions: true, showResultValues: true, diagramScale: 1, deformedScale: 50, diagramSide: 'positive' },
});

describe('análisis modal', () => {
  it('recupera la primera frecuencia de una viga biapoyada con un oráculo cerrado', () => {
    const result = analyzeModal(project(16, { type: 'pin' }, { type: 'roller' }), { modes: 1 });
    const massPerLength = density * A / 1000;
    const exact = (Math.PI / length) ** 2 * Math.sqrt(E * I / massPerLength);
    expect(result.success, result.reason).toBe(true);
    expect(result.converged).toBe(true);
    expect(Math.abs(result.modes[0].angularFrequency - exact) / exact).toBeLessThan(2e-3);
  });

  it('declara el modelo sin masa en lugar de inventar una frecuencia', () => {
    const result = analyzeModal(project(2, { type: 'pin' }, { type: 'roller' }, 0));
    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/masa/);
  });
});
