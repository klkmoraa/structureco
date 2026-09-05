import { describe, expect, it } from 'vitest';
import { findStandardMaterial } from '../data/standardMaterials';
import { findStandardSection } from '../data/standardSections';
import type { AnalysisResult, MemberModel, MemberResult, ProjectModel } from '../types';
import {
  classifyRatioStatus,
  evaluateAiscCompression,
  evaluateAiscFlexure,
  evaluateAiscInteraction,
  evaluateAiscMember,
  evaluateAiscShear,
  evaluateAiscSteel360Project,
  evaluateAiscTension,
} from './aiscSteel360';

const steelA992 = findStandardMaterial('steel-a992')!;
const w8x31 = findStandardSection('w8x31')!;
const w12x26 = findStandardSection('w12x26')!;

describe('AISC 360-16 / 360-22 LRFD Steel Design', () => {
  describe('classifyRatioStatus', () => {
    it('classifies pass, warning, fail and indeterminate', () => {
      expect(classifyRatioStatus(0.5)).toBe('pass');
      expect(classifyRatioStatus(0.90)).toBe('pass');
      expect(classifyRatioStatus(0.901)).toBe('warning');
      expect(classifyRatioStatus(1.00)).toBe('warning');
      expect(classifyRatioStatus(1.001)).toBe('fail');
      expect(classifyRatioStatus(-1)).toBe('indeterminate');
      expect(classifyRatioStatus(Number.NaN)).toBe('indeterminate');
    });
  });

  describe('evaluateAiscTension (Chapter D)', () => {
    it('evaluates gross yielding and slenderness correctly', () => {
      const Fy = steelA992.yieldStrength; // 345000 kN/m²
      const Ag = w8x31.area; // 0.0058903108 m²
      const nominal = Fy * Ag;
      const design = 0.90 * nominal;

      // Half capacity demand
      const check = evaluateAiscTension({
        demand: design * 0.5,
        Fy,
        Ag,
        L: 3.0,
        r: 0.05,
      });

      expect(check.kind).toBe('tension');
      expect(check.phi).toBe(0.90);
      expect(check.nominalCapacity).toBeCloseTo(nominal, 2);
      expect(check.designCapacity).toBeCloseTo(design, 2);
      expect(check.ratio).toBeCloseTo(0.5, 4);
      expect(check.status).toBe('pass');
      expect(check.clause).toContain('D2');
    });

    it('flags warning when ratio is between 0.90 and 1.00 and fail when above 1.00', () => {
      const Fy = steelA992.yieldStrength;
      const Ag = w8x31.area;
      const design = 0.90 * Fy * Ag;

      const warningCheck = evaluateAiscTension({
        demand: design * 0.95,
        Fy,
        Ag,
        L: 3.0,
        r: 0.05,
      });
      expect(warningCheck.status).toBe('warning');

      const failCheck = evaluateAiscTension({
        demand: design * 1.10,
        Fy,
        Ag,
        L: 3.0,
        r: 0.05,
      });
      expect(failCheck.status).toBe('fail');
    });
  });

  describe('evaluateAiscCompression (Chapter E)', () => {
    it('evaluates inelastic flexural buckling for intermediate column', () => {
      const Fy = steelA992.yieldStrength; // 345,000 kN/m²
      const E = steelA992.elasticModulus; // 200,000,000 kN/m²
      const Ag = w8x31.area;
      const rx = w8x31.radiusOfGyrationX;
      const ry = Math.sqrt(w8x31.inertiaY / Ag);

      const { detail, KLr } = evaluateAiscCompression({
        demand: 500,
        Fy,
        E,
        Ag,
        L: 3.0,
        rx,
        ry,
      });

      const lambdaC = 4.71 * Math.sqrt(E / Fy); // ~ 113.4
      expect(KLr).toBeLessThan(lambdaC);
      expect(detail.clause).toContain('E3-2 (pandeo inelástico)');
      expect(detail.nominalCapacity).toBeGreaterThan(0);
      expect(detail.designCapacity).toBeCloseTo(0.90 * detail.nominalCapacity, 2);
      expect(detail.status).toBe('pass');
    });

    it('evaluates elastic flexural buckling for slender column', () => {
      const Fy = steelA992.yieldStrength;
      const E = steelA992.elasticModulus;
      const Ag = w8x31.area;
      const rx = w8x31.radiusOfGyrationX;
      const ry = Math.sqrt(w8x31.inertiaY / Ag);

      // Long length to trigger elastic Euler buckling
      const { detail } = evaluateAiscCompression({
        demand: 100,
        Fy,
        E,
        Ag,
        L: 12.0,
        rx,
        ry,
      });

      expect(detail.clause).toContain('E3-3 (pandeo elástico)');
    });
  });

  describe('evaluateAiscFlexure (Chapter F)', () => {
    it('evaluates plastic moment yielding when Lb <= Lp', () => {
      const Fy = steelA992.yieldStrength;
      const E = steelA992.elasticModulus;
      const Zx = w12x26.plasticModulusX;
      const Sx = w12x26.sectionModulusX;
      const Iy = w12x26.inertiaY;
      const Ag = w12x26.area;

      const check = evaluateAiscFlexure({
        demand: 100,
        Fy,
        E,
        Zx,
        Sx,
        Iy,
        Ag,
        d: w12x26.depth,
        tw: w12x26.webThickness,
        tf: w12x26.flangeThickness,
        bf: w12x26.width,
        Lb: 0.5, // short unbraced length
      });

      const Mp = Fy * Zx;
      expect(check.nominalCapacity).toBeCloseTo(Mp, 2);
      expect(check.clause).toContain('F2.1');
      expect(check.designCapacity).toBeCloseTo(0.90 * Mp, 2);
    });

    it('evaluates lateral-torsional buckling when unbraced length is large', () => {
      const Fy = steelA992.yieldStrength;
      const E = steelA992.elasticModulus;
      const Zx = w12x26.plasticModulusX;
      const Sx = w12x26.sectionModulusX;
      const Iy = w12x26.inertiaY;
      const Ag = w12x26.area;

      const check = evaluateAiscFlexure({
        demand: 50,
        Fy,
        E,
        Zx,
        Sx,
        Iy,
        Ag,
        d: w12x26.depth,
        tw: w12x26.webThickness,
        tf: w12x26.flangeThickness,
        bf: w12x26.width,
        Lb: 6.0, // large unbraced length
      });

      const Mp = Fy * Zx;
      expect(check.nominalCapacity).toBeLessThan(Mp);
      expect(check.clause).toContain('F2.2');
    });
  });

  describe('evaluateAiscShear (Chapter G)', () => {
    it('evaluates web shear capacity with phi = 1.0 or 0.90', () => {
      const Fy = steelA992.yieldStrength;
      const E = steelA992.elasticModulus;

      const check = evaluateAiscShear({
        demand: 150,
        Fy,
        E,
        d: w12x26.depth,
        tw: w12x26.webThickness,
        tf: w12x26.flangeThickness,
      });

      expect(check.kind).toBe('shear');
      expect(check.nominalCapacity).toBeGreaterThan(0);
      expect(check.designCapacity).toBeGreaterThan(0);
      expect(check.ratio).toBe(150 / check.designCapacity);
    });
  });

  describe('evaluateAiscInteraction (Chapter H)', () => {
    it('evaluates Eq. H1-1a when Pu / Pc >= 0.2', () => {
      const check = evaluateAiscInteraction({
        Pu: 300,
        Pc: 1000, // Pu/Pc = 0.30 >= 0.2
        isTension: false,
        Mux: 50,
        Mcx: 100, // Mux/Mcx = 0.50
      });

      // Ratio = 0.30 + (8/9) * 0.50 = 0.30 + 0.4444 = 0.7444
      expect(check.ratio).toBeCloseTo(0.30 + (8 / 9) * 0.50, 4);
      expect(check.clause).toContain('H1-1a');
      expect(check.status).toBe('pass');
    });

    it('evaluates Eq. H1-1b when Pu / Pc < 0.2', () => {
      const check = evaluateAiscInteraction({
        Pu: 100,
        Pc: 1000, // Pu/Pc = 0.10 < 0.2
        isTension: false,
        Mux: 60,
        Mcx: 100, // Mux/Mcx = 0.60
      });

      // Ratio = 0.10 / 2 + 0.60 = 0.05 + 0.60 = 0.65
      expect(check.ratio).toBeCloseTo(0.65, 4);
      expect(check.clause).toContain('H1-1b');
      expect(check.status).toBe('pass');
    });
  });

  describe('evaluateAiscMember & Project Integration', () => {
    const member: MemberModel = {
      id: 'M1',
      i: 'N1',
      j: 'N2',
      type: 'frame',
      materialId: steelA992.id,
      materialOrigin: 'catalog',
      sectionId: w12x26.id,
      sectionOrigin: 'catalog',
      E: steelA992.elasticModulus,
      A: w12x26.area,
      I: w12x26.inertiaX,
    };

    const memberResult: MemberResult = {
      memberId: 'M1',
      length: 4.0,
      localDisplacements: [],
      localEndForces: [],
      diagramSegments: [],
      diagramJumps: [],
      criticalPoints: [],
      diagram: [],
      deformation: [],
      deformationSegments: [],
      deformationCriticalPoints: [],
      maxAxial: 50,
      minAxial: -200, // 200 kN compression
      maxShear: 40,
      minShear: -40,
      maxMoment: 80,
      minMoment: -30,
    } as unknown as MemberResult;

    const project: ProjectModel = {
      id: 'P1',
      name: 'Steel Frame AISC Test',
      nodes: [],
      members: [member],
      loadCases: [],
      combinations: [],
      nodalLoads: [],
      memberLoads: [],
      prescribedDisplacements: [],
      memberInitialEffects: [],
      settings: { units: 'kN-m', language: 'es' },
    } as unknown as ProjectModel;

    const analysis: AnalysisResult = {
      success: true,
      issues: [],
      nodeResults: [],
      memberResults: [memberResult],
      displacements: [],
      residualNorm: 0,
      conditionEstimate: 1,
      equilibrium: { sumFx: 0, sumFy: 0, sumM: 0, normalizedComponents: { fx: 0, fy: 0, mz: 0 }, normalizedResidual: 0 },
      explanation: [],
      reliability: { completed: true, usable: true, level: 'reliable', checks: [], reasons: [] },
    } as AnalysisResult;

    it('evaluates an individual frame member via evaluateAiscMember directly', () => {
      const result = evaluateAiscMember({ member, memberResult, project });
      expect(result.isEligible).toBe(true);
      expect(result.memberId).toBe('M1');
      expect(result.sectionName).toBe('W12x26');
      expect(result.checks.compression).toBeDefined();
      expect(result.checks.flexure).toBeDefined();
      expect(result.checks.shear).toBeDefined();
      expect(result.checks.interaction).toBeDefined();
    });

    it('evaluates an eligible frame member with all Chapter checks and interaction', () => {
      const summary = evaluateAiscSteel360Project(project, analysis, 'COMB-1');
      expect(summary.totalMembers).toBe(1);
      expect(summary.evaluatedMembers).toBe(1);
      expect(summary.criticalMember).not.toBeNull();
      expect(summary.criticalMember?.memberId).toBe('M1');
      expect(summary.criticalMember?.sectionName).toBe('W12x26');
      expect(summary.criticalMember?.checks.compression).toBeDefined();
      expect(summary.criticalMember?.checks.flexure).toBeDefined();
      expect(summary.criticalMember?.checks.shear).toBeDefined();
      expect(summary.criticalMember?.checks.interaction).toBeDefined();
    });

    it('fails closed when member material is not structural steel', () => {
      const concreteMember: MemberModel = {
        ...member,
        materialId: 'concrete-28mpa',
      };
      const proj = { ...project, members: [concreteMember] };
      const summary = evaluateAiscSteel360Project(proj, analysis);
      expect(summary.evaluatedMembers).toBe(0);
      expect(summary.resultsByMemberId['M1'].isEligible).toBe(false);
      expect(summary.resultsByMemberId['M1'].ineligibilityReason).toContain('acero');
    });

    it('fails closed when member section properties drift from catalog', () => {
      const driftedMember: MemberModel = {
        ...member,
        A: w12x26.area * 1.5, // 50% mismatch
      };
      const proj = { ...project, members: [driftedMember] };
      const summary = evaluateAiscSteel360Project(proj, analysis);
      expect(summary.evaluatedMembers).toBe(0);
      expect(summary.resultsByMemberId['M1'].isEligible).toBe(false);
      expect(summary.resultsByMemberId['M1'].ineligibilityReason).toContain('difieren del catálogo');
    });

    it('fails closed when analysis is not reliable', () => {
      const unreliableAnalysis: AnalysisResult = {
        ...analysis,
        reliability: { completed: true, usable: false, level: 'unreliable', checks: [], reasons: ['Large residual'] },
      };
      const summary = evaluateAiscSteel360Project(project, unreliableAnalysis);
      expect(summary.evaluatedMembers).toBe(0);
      expect(summary.criticalMember).toBeNull();
    });
  });
});
