/**
 * Propiedades de masa elementales para los estudios dinámicos opcionales.
 *
 * El solver estático no las consume. Se mantienen aisladas hasta que el
 * ensamblaje modal pueda reutilizar, sin duplicarla, la misma cinemática y las
 * mismas restricciones del análisis autoritativo.
 */
import type { MemberModel } from '../types';
import { addToMatrix, multiply, transpose, zeros, type Matrix } from './math';
import type { EigenAssembly } from './eigenAssembly';

/** kg -> Mg. Con rigidez en kN/m, kN/m / Mg produce rad²/s². */
const KILOGRAM_TO_MEGAGRAM = 1e-3;

/** Masa por longitud en Mg/m; un miembro sin densidad o área no aporta masa. */
export const linearMass = (member: MemberModel): number =>
  (member.density ?? 0) > 0 && member.A > 0
    ? member.density! * member.A * KILOGRAM_TO_MEGAGRAM
    : 0;

/** Matriz de masa consistente de un elemento de pórtico plano Euler-Bernoulli. */
export const frameConsistentMass = (massPerLength: number, length: number): Matrix => {
  const factor = (massPerLength * length) / 420;
  const lengthSquared = length * length;
  return [
    [140 * factor, 0, 0, 70 * factor, 0, 0],
    [0, 156 * factor, 22 * length * factor, 0, 54 * factor, -13 * length * factor],
    [0, 22 * length * factor, 4 * lengthSquared * factor, 0, 13 * length * factor, -3 * lengthSquared * factor],
    [70 * factor, 0, 0, 140 * factor, 0, 0],
    [0, 54 * factor, 13 * length * factor, 0, 156 * factor, -22 * length * factor],
    [0, -13 * length * factor, -3 * lengthSquared * factor, 0, -22 * length * factor, 4 * lengthSquared * factor],
  ];
};

/** Matriz de masa consistente para una barra de dos fuerzas. */
export const trussConsistentMass = (massPerLength: number, length: number): Matrix => {
  const factor = (massPerLength * length) / 6;
  return [
    [2 * factor, 0, 0, factor, 0, 0],
    [0, 2 * factor, 0, 0, factor, 0],
    [0, 0, 0, 0, 0, 0],
    [factor, 0, 0, 2 * factor, 0, 0],
    [0, factor, 0, 0, 2 * factor, 0],
    [0, 0, 0, 0, 0, 0],
  ];
};

/** Masa concentrada: la mitad de la masa lineal del elemento en cada nudo. */
export const lumpedMass = (massPerLength: number, length: number): Matrix => {
  const half = (massPerLength * length) / 2;
  return [
    [half, 0, 0, 0, 0, 0],
    [0, half, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, half, 0, 0],
    [0, 0, 0, 0, half, 0],
    [0, 0, 0, 0, 0, 0],
  ];
};

export type MassFormulation = 'consistent' | 'lumped';
export interface AssembledMass { M: Matrix; totalMass: number; masslessMemberIds: string[] }

/** Ensambla sobre los mismos GDL, excentricidades y miembros del estudio propio. */
export const assembleMass = (assembly: EigenAssembly, formulation: MassFormulation = 'consistent'): AssembledMass => {
  const M = zeros(assembly.ndof, assembly.ndof);
  const masslessMemberIds: string[] = [];
  let totalMass = 0;
  for (const element of assembly.elements) {
    const massPerLength = linearMass(element.member);
    if (!(massPerLength > 0)) { masslessMemberIds.push(element.member.id); continue; }
    totalMass += massPerLength * element.grossLength;
    const local = formulation === 'lumped'
      ? lumpedMass(massPerLength, element.grossLength)
      : element.member.type === 'truss'
        ? trussConsistentMass(massPerLength, element.grossLength)
        : frameConsistentMass(massPerLength, element.grossLength);
    addToMatrix(M, multiply(multiply(transpose(element.transform), local), element.transform), element.indices);
  }
  for (const mass of assembly.nodalMasses) {
    const node = assembly.nodeIndex.get(mass.nodeId);
    if (node === undefined || !(mass.mass > 0)) continue;
    const base = node * 3;
    const translational = mass.mass * KILOGRAM_TO_MEGAGRAM;
    M[base][base] += translational;
    M[base + 1][base + 1] += translational;
    if ((mass.rotationalInertia ?? 0) > 0) M[base + 2][base + 2] += mass.rotationalInertia! * KILOGRAM_TO_MEGAGRAM;
    totalMass += translational;
  }
  return { M, totalMass, masslessMemberIds };
};
