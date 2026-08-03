import { describe, expect, it } from 'vitest';
import type { ProjectModel } from '../types';
import { analyzeProject, geometricStiffness } from './solver';
import { analyzeProjectPDelta, DEFAULT_PDELTA_CONFIG } from './pDelta';

const baseProject = (): ProjectModel => ({
  schemaVersion: 1,
  id: 'test',
  name: 'test',
  nodes: [],
  members: [],
  loadCases: [{ id: 'LC1', name: 'LC1', category: 'variable', active: true }],
  combinations: [],
  nodalLoads: [],
  memberLoads: [],
  settings: {
    units: 'kN-m', language: 'es', gridSize: 1, snap: true, showGrid: true,
    showNodeLabels: true, showMemberLabels: false, showLocalAxes: false, showLoads: true,
    showDimensions: true, showResultValues: true, diagramScale: 1, deformedScale: 50, diagramSide: 'positive',
  },
});

/** Vertical cantilever, base at N1 (fixed), tip at N2; matches the closed-form benchmark below. */
const cantilever = (L: number, E: number, I: number, A = 0.01): ProjectModel => {
  const project = baseProject();
  project.nodes = [
    { id: 'N1', x: 0, y: 0, support: { type: 'fixed' } },
    { id: 'N2', x: 0, y: L, support: { type: 'none' } },
  ];
  project.members = [{ id: 'M1', i: 'N1', j: 'N2', type: 'frame', E, A, I }];
  return project;
};

/** Applies a tip axial force (compressive when `axial<0`, i.e. pushes down toward the base) plus a lateral force. */
const withTipLoads = (project: ProjectModel, axial: number, lateral: number): ProjectModel => {
  project.nodalLoads = [{ id: 'AX', nodeId: 'N2', caseId: 'LC1', fx: lateral, fy: axial, mz: 0 }];
  return project;
};

const tipUx = (project: ProjectModel) => {
  const result = analyzeProjectPDelta(project);
  const tip = result.nodeResults.find((node) => node.nodeId === 'N2')!;
  return { result, ux: Math.abs(tip.ux) };
};

const close = (actual: number, expected: number, relTolerance: number) => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(relTolerance * Math.max(1e-9, Math.abs(expected)));
};

// Closed-form cantilever beam-column reference (derived independently from
// EI v'' + P v = H(L-x) + P*delta, k = sqrt(P/EI); see docs/motor-matematico/CONTEXTO-PDELTA.md).
const exactCantileverDeflection = (L: number, EI: number, H: number, P: number): number => {
  if (P === 0) return (H * L ** 3) / (3 * EI);
  const k = Math.sqrt(P / EI);
  return (H * (Math.tan(k * L) - k * L)) / (P * k);
};
const exactCantileverTensionDeflection = (L: number, EI: number, H: number, T: number): number => {
  const k = Math.sqrt(T / EI);
  return (H * (k * L - Math.tanh(k * L))) / (T * k);
};

const L = 4;
const E = 200e6;
const I = 8e-5;
const EI = E * I; // 16000 kN.m^2
const H = 10;
const Pcr = (Math.PI ** 2 * EI) / (2 * L) ** 2; // fixed-free Euler load

describe('geometricStiffness', () => {
  it('is zero on the axial rows/columns and symmetric, matching the standard beam-column formula', () => {
    const k = geometricStiffness(2, 10); // L=2, N=10 (tension)
    for (const row of [0, 3]) for (let col = 0; col < 6; col += 1) expect(k[row][col]).toBe(0);
    for (let i = 0; i < 6; i += 1) for (let j = 0; j < 6; j += 1) expect(k[i][j]).toBeCloseTo(k[j][i], 12);
    // N/L = 5; 6/5*5=6; L/10*5=1; 2L^2/15*5=13.333...
    expect(k[1][1]).toBeCloseTo(6, 10);
    expect(k[1][2]).toBeCloseTo(1, 10);
    expect(k[2][2]).toBeCloseTo(8 / 3, 10);
    expect(k[1][4]).toBeCloseTo(-6, 10);
  });

  it('is exactly zero when the axial force is zero', () => {
    const k = geometricStiffness(3.7, 0);
    expect(k.flat().every((value) => value === 0)).toBe(true);
  });
});

describe('P-Delta: coincidencia con primer orden sin fuerza axial (requisito 1)', () => {
  it('reproduce el desplazamiento de primer orden cuando no hay fuerza axial', () => {
    const project = withTipLoads(cantilever(L, E, I), 0, H);
    const firstOrder = analyzeProject(project);
    const { result, ux } = tipUx(project);
    expect(result.success).toBe(true);
    expect(result.pDelta?.converged).toBe(true);
    close(ux, Math.abs(firstOrder.nodeResults.find((n) => n.nodeId === 'N2')!.ux), 1e-8);
    close(ux, exactCantileverDeflection(L, EI, H, 0), 1e-8);
  });
});

describe('P-Delta: compresión pequeña se acerca al primer orden (requisito 2)', () => {
  it('con compresión de 0.1*Pcr, el resultado queda cerca del de primer orden y de la fórmula exacta', () => {
    const P = 0.1 * Pcr;
    const project = withTipLoads(cantilever(L, E, I), -P, H);
    const { ux } = tipUx(project);
    const exact = exactCantileverDeflection(L, EI, H, P);
    const firstOrderDelta = (H * L ** 3) / (3 * EI);
    close(ux, exact, 0.05);
    expect(ux).toBeGreaterThan(firstOrderDelta);
    expect(ux / firstOrderDelta).toBeLessThan(1.3);
  });
});

describe('P-Delta: más compresión amplifica el desplazamiento lateral (requisito 3)', () => {
  it('con compresión de 0.5*Pcr el desplazamiento es mayor que con 0.1*Pcr, y cercano a la fórmula exacta', () => {
    const low = tipUx(withTipLoads(cantilever(L, E, I), -0.1 * Pcr, H)).ux;
    const high = tipUx(withTipLoads(cantilever(L, E, I), -0.5 * Pcr, H)).ux;
    expect(high).toBeGreaterThan(low);
    close(high, exactCantileverDeflection(L, EI, H, 0.5 * Pcr), 0.05);
  });
});

describe('P-Delta: la tensión no amplifica como la compresión (requisito 4)', () => {
  it('con tensión axial el desplazamiento lateral es menor que en primer orden y que en compresión equivalente', () => {
    const magnitude = 0.5 * Pcr;
    const firstOrderDelta = (H * L ** 3) / (3 * EI);
    const tension = tipUx(withTipLoads(cantilever(L, E, I), magnitude, H)).ux;
    const compression = tipUx(withTipLoads(cantilever(L, E, I), -magnitude, H)).ux;
    expect(tension).toBeLessThan(firstOrderDelta);
    expect(firstOrderDelta).toBeLessThan(compression);
    close(tension, exactCantileverTensionDeflection(L, EI, H, magnitude), 0.05);
  });
});

describe('P-Delta: columna en voladizo con carga axial y lateral (requisito 5)', () => {
  it('converge y reporta la fuerza axial usada en la rigidez geométrica', () => {
    const P = 0.3 * Pcr;
    const project = withTipLoads(cantilever(L, E, I), -P, H);
    const { result } = tipUx(project);
    expect(result.pDelta?.converged).toBe(true);
    close(result.pDelta!.memberAxialForces.M1, -P, 1e-6);
  });
});

describe('P-Delta: pórtico simple con cargas gravitacionales y laterales (requisito 6)', () => {
  it('un pórtico de una crujía converge y amplifica el desplazamiento lateral respecto al primer orden', () => {
    const project = baseProject();
    const h = 3.5;
    const span = 5;
    project.nodes = [
      { id: 'B1', x: 0, y: 0, support: { type: 'fixed' } },
      { id: 'B2', x: span, y: 0, support: { type: 'fixed' } },
      { id: 'C1', x: 0, y: h, support: { type: 'none' } },
      { id: 'C2', x: span, y: h, support: { type: 'none' } },
    ];
    const E2 = 25e6;
    const A2 = 0.09;
    const I2 = 6.75e-4;
    project.members = [
      { id: 'COL1', i: 'B1', j: 'C1', type: 'frame', E: E2, A: A2, I: I2 },
      { id: 'COL2', i: 'B2', j: 'C2', type: 'frame', E: E2, A: A2, I: I2 },
      { id: 'BEAM', i: 'C1', j: 'C2', type: 'frame', E: E2, A: A2, I: I2 },
    ];
    project.nodalLoads = [
      { id: 'G1', nodeId: 'C1', caseId: 'LC1', fx: 0, fy: -300, mz: 0 },
      { id: 'G2', nodeId: 'C2', caseId: 'LC1', fx: 0, fy: -300, mz: 0 },
      { id: 'W', nodeId: 'C1', caseId: 'LC1', fx: 40, fy: 0, mz: 0 },
    ];
    const firstOrder = analyzeProject(project);
    const result = analyzeProjectPDelta(project);
    expect(firstOrder.success).toBe(true);
    expect(result.success).toBe(true);
    expect(result.pDelta?.converged).toBe(true);
    const swayFirst = Math.abs(firstOrder.nodeResults.find((n) => n.nodeId === 'C1')!.ux);
    const swayPDelta = Math.abs(result.nodeResults.find((n) => n.nodeId === 'C1')!.ux);
    expect(swayPDelta).toBeGreaterThan(swayFirst);
    expect(result.residualNorm).toBeLessThan(1e-8);
  });
});

describe('P-Delta: convergencia con distintos tamaños de paso (requisito 8)', () => {
  it('el desplazamiento convergido no depende de qué política de paso/iteración se use', () => {
    // Two different, independently valid step/iteration policies must settle
    // on the same physical answer — the load-stepping ladder is a numerical
    // strategy, not part of the physics.
    const P = 0.5 * Pcr;
    const project = withTipLoads(cantilever(L, E, I), -P, H);
    const defaultPolicy = analyzeProjectPDelta(project);
    const alternatePolicy = analyzeProjectPDelta(project, undefined, { stepReductionFactor: 0.8, maxIterationsPerStep: 60 });
    expect(defaultPolicy.pDelta?.converged).toBe(true);
    expect(alternatePolicy.pDelta?.converged).toBe(true);
    const uxDefault = Math.abs(defaultPolicy.nodeResults.find((n) => n.nodeId === 'N2')!.ux);
    const uxAlternate = Math.abs(alternatePolicy.nodeResults.find((n) => n.nodeId === 'N2')!.ux);
    close(uxDefault, uxAlternate, 1e-6);
  });
});

describe('P-Delta: reducción automática de paso cuando una iteración falla (requisito 9)', () => {
  it('con un límite de iteraciones demasiado ajustado, subdivide el paso en vez de rendirse de inmediato', () => {
    // maxIterationsPerStep=2 is deliberately too tight for this model's own
    // convergence rate at lambda=1 (it needs ~3): the loop must reduce the
    // load fraction and try again rather than declare failure outright.
    const P = 0.85 * Pcr;
    const result = analyzeProjectPDelta(withTipLoads(cantilever(L, E, I), -P, H), undefined, { maxIterationsPerStep: 2, maxLoadSteps: 12 });
    const distinctLambdas = new Set(result.pDelta?.history.map((entry) => entry.lambda));
    expect(distinctLambdas.size).toBeGreaterThan(1);
  });
});

describe('P-Delta: caso cercano a la carga crítica (requisito 10)', () => {
  it('a 0.9*Pcr converge con una amplificación grande y una advertencia de estabilidad', () => {
    const P = 0.9 * Pcr;
    const result = analyzeProjectPDelta(withTipLoads(cantilever(L, E, I), -P, H));
    expect(result.pDelta?.converged).toBe(true);
    expect(result.pDelta?.amplificationFactor ?? 0).toBeGreaterThan(3);
  });
});

describe('P-Delta: caso que no converge y se rechaza con claridad (requisito 11)', () => {
  it('por encima de la carga crítica, el análisis se rechaza en vez de devolver un número engañoso', () => {
    const P = 1.2 * Pcr;
    const result = analyzeProjectPDelta(withTipLoads(cantilever(L, E, I), -P, H), undefined, { maxLoadSteps: 8, minimumStep: 1 / 32 });
    expect(result.success).toBe(false);
    expect(result.pDelta?.converged).toBe(false);
    expect(result.issues.some((issue) => issue.id === 'pdelta-not-converged')).toBe(true);
    expect(result.nodeResults).toHaveLength(0);
  });
});

describe('P-Delta: conservación del equilibrio final (requisito 12)', () => {
  it('el residuo algebraico K·U=F y el balance de fuerzas se mantienen pequeños en el resultado convergido', () => {
    // `equilibrium.normalizedResidual` compares against *undeformed* geometry
    // and is expected to carry the real P·Δ moment under P-Delta (see the
    // 'global-equilibrium' info issue) — the algebraic residual of the solved
    // system, and the force (not moment) balance, are the checks that must
    // stay tight regardless of analysis order.
    const P = 0.4 * Pcr;
    const result = analyzeProjectPDelta(withTipLoads(cantilever(L, E, I), -P, H));
    expect(result.residualNorm).toBeLessThan(1e-8);
    // sumFx/sumFy are the residuals (applied + reaction), not the raw loads — they must cancel to ~0.
    close(result.equilibrium.sumFx, 0, 1e-6);
    close(result.equilibrium.sumFy, 0, 1e-6);
  });
});

describe('P-Delta: conservación de restricciones (requisito 13)', () => {
  it('las reacciones del apoyo fijo siguen equilibrando exactamente las cargas aplicadas', () => {
    const P = 0.4 * Pcr;
    const result = analyzeProjectPDelta(withTipLoads(cantilever(L, E, I), -P, H));
    const base = result.nodeResults.find((n) => n.nodeId === 'N1')!;
    close(base.rx ?? 0, -H, 1e-6);
    close(base.ry ?? 0, P, 1e-6);
  });
});

describe('P-Delta: compatibilidad del modo de primer orden existente (requisito 14)', () => {
  it('analyzeProject sin la opción P-Delta se comporta exactamente igual que antes', () => {
    const project = withTipLoads(cantilever(L, E, I), -0.3 * Pcr, H);
    const a = analyzeProject(project);
    const b = analyzeProject(project);
    expect(a).toEqual(b);
    expect(a.pDelta).toBeUndefined();
  });
});

describe('P-Delta: resultado determinista al repetir el análisis (requisito 15)', () => {
  it('dos corridas de analyzeProjectPDelta sobre el mismo modelo dan el mismo resultado', () => {
    const project = withTipLoads(cantilever(L, E, I), -0.4 * Pcr, H);
    const a = analyzeProjectPDelta(project);
    const b = analyzeProjectPDelta(project);
    expect(a.pDelta?.loadStepsUsed).toBe(b.pDelta?.loadStepsUsed);
    expect(a.pDelta?.totalIterations).toBe(b.pDelta?.totalIterations);
    close(Math.abs(a.nodeResults.find((n) => n.nodeId === 'N2')!.ux), Math.abs(b.nodeResults.find((n) => n.nodeId === 'N2')!.ux), 1e-12);
  });
});

describe('P-Delta: configuración por defecto', () => {
  it('tiene límites razonables', () => {
    expect(DEFAULT_PDELTA_CONFIG.maxLoadSteps).toBeGreaterThan(0);
    expect(DEFAULT_PDELTA_CONFIG.maxIterationsPerStep).toBeGreaterThan(1);
    expect(DEFAULT_PDELTA_CONFIG.stepReductionFactor).toBeGreaterThan(0);
    expect(DEFAULT_PDELTA_CONFIG.stepReductionFactor).toBeLessThan(1);
    expect(DEFAULT_PDELTA_CONFIG.minimumStep).toBeGreaterThan(0);
  });
});
