/** Pandeo elástico lineal: K phi = lambda (-Kg) phi. */
import type { LoadCombination, ProjectModel, ValidationIssue } from '../types';
import { constraintNullSpaceBasis, expandFromBasis, generalizedSmallestEigenpairs, projectOntoBasis } from './eigen';
import { assembleForEigen, assembleGeometricStiffness, axialForcesFromResult } from './eigenAssembly';
import { analyzeProject } from './solver';
import type { ModeShapeNode } from './modal';

export interface BucklingMode { criticalLoadFactor: number; shape: ModeShapeNode[] }
export interface BucklingResult {
  success: boolean; modes: BucklingMode[]; criticalLoadFactor?: number; converged: boolean; residual: number;
  issues: ValidationIssue[]; reason: string; referenceAxialForces: Record<string, number>; freeDegreesOfFreedom: number;
}
export interface BucklingOptions { modes?: number; maxIterations?: number; tolerance?: number }
const failure = (reason: string, issues: ValidationIssue[] = [], freeDegreesOfFreedom = 0): BucklingResult => ({ success: false, modes: [], converged: false, residual: Number.NaN, issues, reason, referenceAxialForces: {}, freeDegreesOfFreedom });

export const analyzeBuckling = (project: ProjectModel, combination?: LoadCombination | null, options: BucklingOptions = {}): BucklingResult => {
  const reference = analyzeProject(project, combination, { includeEducationTrace: false });
  if (!reference.success) return failure('El análisis de primer orden no es válido para este modelo; corrígelo antes de pedir el pandeo.', reference.issues);
  const assembly = assembleForEigen(project);
  const frameIds = assembly.elements.filter((element) => element.member.type === 'frame').map((element) => element.member.id);
  if (!frameIds.length) return failure('El modelo no tiene miembros de pórtico: sin rigidez a flexión no hay pandeo por flexión que calcular.');
  const axial = axialForcesFromResult(reference.memberResults, frameIds);
  if (!frameIds.some((id) => (axial.get(id) ?? 0) < 0)) return failure('Ningún miembro está comprimido bajo esta combinación: no hay pandeo posible mientras la carga no cambie de signo.');
  const basis = constraintNullSpaceBasis(assembly.constraints.map((constraint) => constraint.row), assembly.ndof);
  if (!basis.nullity) return failure('Las condiciones de contorno no dejan ningún grado de libertad libre.');
  const geometric = assembleGeometricStiffness(assembly, axial);
  const eigen = generalizedSmallestEigenpairs(projectOntoBasis(assembly.K, basis.vectors), projectOntoBasis(geometric, basis.vectors).map((row) => row.map((value) => -value)), Math.max(1, Math.trunc(options.modes ?? 3)), { positiveOnly: true, maxIterations: options.maxIterations, tolerance: options.tolerance });
  if (!eigen.values.length) return failure(eigen.reason, [], basis.nullity);
  const modes = eigen.values.map((criticalLoadFactor, index) => {
    const vector = expandFromBasis(eigen.vectors[index], basis.vectors);
    const raw = project.nodes.map((node) => { const base = assembly.nodeIndex.get(node.id)! * 3; return { nodeId: node.id, ux: vector[base], uy: vector[base + 1], rz: vector[base + 2] }; });
    const peak = Math.max(...raw.map((node) => Math.max(Math.abs(node.ux), Math.abs(node.uy))), 0); const scale = peak > 0 ? 1 / peak : 1;
    return { criticalLoadFactor, shape: raw.map((node) => ({ ...node, ux: node.ux * scale, uy: node.uy * scale, rz: node.rz * scale })) };
  });
  const issues: ValidationIssue[] = [];
  if (modes[0].criticalLoadFactor <= 1) issues.push({ id: 'buckling-below-applied-load', severity: 'warning', title: 'La carga aplicada supera la carga crítica elástica', message: `El primer modo aparece a ${modes[0].criticalLoadFactor.toFixed(3)} veces la combinación aplicada.`, suggestedFix: 'Revisa las secciones comprimidas, la longitud de pandeo o el arriostramiento.' });
  if (!eigen.converged) issues.push({ id: 'buckling-not-converged', severity: 'warning', title: 'El cálculo de pandeo no estabilizó los modos', message: eigen.reason, suggestedFix: 'Pide menos modos o revisa que el modelo no tenga partes casi desconectadas.' });
  return { success: true, modes, criticalLoadFactor: modes[0].criticalLoadFactor, converged: eigen.converged, residual: eigen.residual, issues, reason: eigen.reason, referenceAxialForces: Object.fromEntries(axial), freeDegreesOfFreedom: basis.nullity };
};
