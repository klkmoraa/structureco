/** Frecuencias y formas propias elásticas, sin amortiguamiento ni espectro sísmico. */
import type { ProjectModel, ValidationIssue } from '../types';
import { constraintNullSpaceBasis, expandFromBasis, generalizedSmallestEigenpairs, projectOntoBasis } from './eigen';
import { assembleForEigen } from './eigenAssembly';
import { assembleMass, type MassFormulation } from './mass';
import { multiplyMatrixVector, type Matrix } from './math';

export interface ModeShapeNode { nodeId: string; ux: number; uy: number; rz: number }
export interface VibrationMode {
  angularFrequency: number; frequency: number; period: number;
  participatingMassRatioX: number; participatingMassRatioY: number; shape: ModeShapeNode[];
}
export interface ModalResult {
  success: boolean; modes: VibrationMode[]; cumulativeMassRatioX: number; cumulativeMassRatioY: number;
  totalMass: number; formulation: MassFormulation; converged: boolean; residual: number;
  issues: ValidationIssue[]; reason: string; freeDegreesOfFreedom: number;
}
export interface ModalOptions { modes?: number; formulation?: MassFormulation; maxIterations?: number; tolerance?: number }

const failure = (reason: string, issues: ValidationIssue[] = []): ModalResult => ({
  success: false, modes: [], cumulativeMassRatioX: 0, cumulativeMassRatioY: 0, totalMass: 0,
  formulation: 'consistent', converged: false, residual: Number.NaN, issues, reason, freeDegreesOfFreedom: 0,
});
const bilinear = (matrix: Matrix, left: readonly number[], right: readonly number[]) =>
  multiplyMatrixVector(matrix, right as number[]).reduce((sum, value, index) => sum + left[index] * value, 0);

export const analyzeModal = (project: ProjectModel, options: ModalOptions = {}): ModalResult => {
  const formulation = options.formulation ?? 'consistent';
  const assembly = assembleForEigen(project);
  if (!assembly.elements.length) return failure('El modelo no tiene miembros deformables: no hay nada que pueda vibrar.');
  const mass = assembleMass(assembly, formulation);
  if (!(mass.totalMass > 0)) return { ...failure('El modelo no declara masa distribuida ni masa nodal adicional.'), formulation };
  const basis = constraintNullSpaceBasis(assembly.constraints.map((item) => item.row), assembly.ndof);
  if (!basis.nullity) return { ...failure('Las condiciones de contorno no dejan ningún grado de libertad libre.'), formulation, totalMass: mass.totalMass };
  const eigen = generalizedSmallestEigenpairs(projectOntoBasis(assembly.K, basis.vectors), projectOntoBasis(mass.M, basis.vectors), Math.max(1, Math.trunc(options.modes ?? 5)), {
    positiveOnly: true, maxIterations: options.maxIterations, tolerance: options.tolerance,
  });
  if (!eigen.values.length) return { ...failure(eigen.reason), formulation, totalMass: mass.totalMass, freeDegreesOfFreedom: basis.nullity };
  const influence = (component: 0 | 1) => {
    const vector = Array(assembly.ndof).fill(0); for (let index = component; index < vector.length; index += 3) vector[index] = 1; return vector;
  };
  const x = influence(0); const y = influence(1); const totalX = bilinear(mass.M, x, x); const totalY = bilinear(mass.M, y, y);
  const modes = eigen.values.map((omegaSquared, index) => {
    const mode = expandFromBasis(eigen.vectors[index], basis.vectors);
    const modalMass = bilinear(mass.M, mode, mode);
    const ratio = (direction: number[], total: number) => total > 0 && modalMass > 0 ? (bilinear(mass.M, mode, direction) ** 2) / modalMass / total : 0;
    const angularFrequency = Math.sqrt(omegaSquared);
    const peak = Math.max(...project.nodes.map((node) => {
      const base = assembly.nodeIndex.get(node.id)! * 3; return Math.max(Math.abs(mode[base]), Math.abs(mode[base + 1]));
    }), 0);
    const scale = peak > 0 ? 1 / peak : 1;
    return {
      angularFrequency, frequency: angularFrequency / (2 * Math.PI), period: angularFrequency > 0 ? 2 * Math.PI / angularFrequency : Number.POSITIVE_INFINITY,
      participatingMassRatioX: ratio(x, totalX), participatingMassRatioY: ratio(y, totalY),
      shape: project.nodes.map((node) => { const base = assembly.nodeIndex.get(node.id)! * 3; return { nodeId: node.id, ux: mode[base] * scale, uy: mode[base + 1] * scale, rz: mode[base + 2] * scale }; }),
    };
  });
  const cumulativeMassRatioX = modes.reduce((sum, mode) => sum + mode.participatingMassRatioX, 0);
  const cumulativeMassRatioY = modes.reduce((sum, mode) => sum + mode.participatingMassRatioY, 0);
  const issues: ValidationIssue[] = [];
  if (mass.masslessMemberIds.length) issues.push({ id: 'modal-massless-members', severity: 'info', title: 'Hay miembros sin masa', message: `${mass.masslessMemberIds.length} miembro(s) no declaran densidad, así que no aportan masa a los modos.`, suggestedFix: 'Asigna un material con densidad a esos miembros si su peso debe participar.' });
  if (Math.max(cumulativeMassRatioX, cumulativeMassRatioY) < 0.9) issues.push({ id: 'modal-insufficient-mass', severity: 'warning', title: 'Los modos calculados no cubren el 90 % de la masa', message: `Los ${modes.length} modos acumulan ${(cumulativeMassRatioX * 100).toFixed(1)} % en X y ${(cumulativeMassRatioY * 100).toFixed(1)} % en Y.`, suggestedFix: 'Pide más modos si vas a usar estos resultados para algo que dependa de la masa participante.' });
  return { success: true, modes, cumulativeMassRatioX, cumulativeMassRatioY, totalMass: mass.totalMass, formulation, converged: eigen.converged, residual: eigen.residual, issues, reason: eigen.reason, freeDegreesOfFreedom: basis.nullity };
};
