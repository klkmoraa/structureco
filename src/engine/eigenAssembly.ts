/** Ensamblaje común para modos propios; reutiliza las reglas cinemáticas del solver. */
import type { MemberModel, NodalMass, NodeModel, ProjectModel } from '../types';
import { addToMatrix, multiply, transpose, zeros, type Matrix } from './math';
import {
  assembleKinematicConstraints, condenseConnections, deformableGeometryOf, frameLocalStiffness,
  foundationLocalStiffness, geometricStiffness, getNodeMap, rigidOffsetTransform, trussLocalStiffness, assembleNodeLink, linearizeNodeLink, type ConstraintDefinition,
} from './solver';

export interface AssembledElement {
  member: MemberModel;
  length: number;
  grossLength: number;
  indices: number[];
  transform: Matrix;
  released: number[];
}

export interface EigenAssembly {
  K: Matrix;
  constraints: ConstraintDefinition[];
  ndof: number;
  dofLabels: string[];
  nodeIndex: Map<string, number>;
  nodes: Map<string, NodeModel>;
  nodalMasses: NodalMass[];
  elements: AssembledElement[];
}

const toGlobal = (local: Matrix, transform: Matrix): Matrix => multiply(multiply(transpose(transform), local), transform);

/** Rigidez elástica y restricciones homogéneas de la misma topología del solver. */
export const assembleForEigen = (project: ProjectModel): EigenAssembly => {
  const nodes = getNodeMap(project);
  const nodeIndex = new Map(project.nodes.map((node, index) => [node.id, index]));
  const ndof = project.nodes.length * 3;
  const K = zeros(ndof, ndof);
  const elements: AssembledElement[] = [];
  for (const member of project.members) {
    if (member.type === 'rigid') continue;
    const { geometry, grossLength, startOffset, endOffset } = deformableGeometryOf(member, nodes);
    const i = nodeIndex.get(member.i); const j = nodeIndex.get(member.j);
    if (i === undefined || j === undefined) continue;
    const indices = [i * 3, i * 3 + 1, i * 3 + 2, j * 3, j * 3 + 1, j * 3 + 2];
    const transform = rigidOffsetTransform(geometry, startOffset, endOffset);
    const elastic = member.type === 'truss' ? trussLocalStiffness(member, geometry.L) : frameLocalStiffness(member, geometry.L);
    const foundation = foundationLocalStiffness(project, member, geometry);
    const stiffness = elastic.map((values, rowIndex) => values.map((value, column) => value + foundation[rowIndex][column]));
    const releaseI = member.type === 'frame' && Boolean(member.releases?.iMoment || nodes.get(member.i)?.internalHinge);
    const releaseJ = member.type === 'frame' && Boolean(member.releases?.jMoment || nodes.get(member.j)?.internalHinge);
    const condensed = member.type === 'frame'
      ? condenseConnections(stiffness, Array(6).fill(0), member, releaseI, releaseJ, 'dense')
      : { stiffness, released: [] as number[] };
    addToMatrix(K, toGlobal(condensed.stiffness, transform), indices);
    elements.push({ member, length: geometry.L, grossLength, indices, transform, released: condensed.released });
  }
  for (const node of project.nodes) {
    const index = nodeIndex.get(node.id)! * 3;
    const spring = node.support.spring;
    if (!spring) continue;
    if (spring.kx) K[index][index] += spring.kx;
    if (spring.ky) K[index + 1][index + 1] += spring.ky;
    if (spring.kr) K[index + 2][index + 2] += spring.kr;
    if (spring.kNormal) {
      const angle = ((spring.angleDeg ?? 90) * Math.PI) / 180;
      const x = Math.cos(angle); const y = Math.sin(angle);
      K[index][index] += spring.kNormal * x * x; K[index][index + 1] += spring.kNormal * x * y;
      K[index + 1][index] += spring.kNormal * x * y; K[index + 1][index + 1] += spring.kNormal * y * y;
    }
  }
  const zeroLoads = Array(ndof).fill(0);
  for (const link of project.nodeLinks ?? []) {
    const tangent = (link.behavior === 'compression-only' || link.behavior === 'tension-only') && (link.clearance ?? 0) === 0
      ? { tangentStiffness: link.stiffness, constantForce: 0, active: true }
      : linearizeNodeLink(link);
    assembleNodeLink(K, zeroLoads, link, nodeIndex, tangent);
  }
  return {
    K, ndof, nodes, nodeIndex, elements, nodalMasses: [...(project.nodalMasses ?? [])],
    dofLabels: project.nodes.flatMap((node) => [`${node.id}.Ux`, `${node.id}.Uy`, `${node.id}.Rz`]),
    constraints: assembleKinematicConstraints(project, nodes, nodeIndex, ndof),
  };
};

/** Rigidez geométrica en el mismo espacio que el ensamblaje elástico. */
export const assembleGeometricStiffness = (assembly: EigenAssembly, axialForces: ReadonlyMap<string, number>): Matrix => {
  const result = zeros(assembly.ndof, assembly.ndof);
  for (const element of assembly.elements) {
    if (element.member.type !== 'frame') continue;
    const axial = axialForces.get(element.member.id);
    if (!axial) continue;
    const elastic = frameLocalStiffness(element.member, element.length);
    const geometric = geometricStiffness(element.length, axial);
    const releaseI = element.released.includes(2); const releaseJ = element.released.includes(5);
    const combined = elastic.map((row, i) => row.map((value, j) => value + geometric[i][j]));
    const condensedCombined = condenseConnections(combined, Array(6).fill(0), element.member, releaseI, releaseJ, 'dense').stiffness;
    const condensedElastic = condenseConnections(elastic, Array(6).fill(0), element.member, releaseI, releaseJ, 'dense').stiffness;
    const onlyGeometric = condensedCombined.map((row, i) => row.map((value, j) => value - condensedElastic[i][j]));
    addToMatrix(result, toGlobal(onlyGeometric, element.transform), element.indices);
  }
  return result;
};

export const axialForcesFromResult = (
  memberResults: ReadonlyArray<{ memberId: string; localEndForces: readonly number[] }>, memberIds: readonly string[],
): Map<string, number> => new Map(memberIds.map((id) => {
  const member = memberResults.find((candidate) => candidate.memberId === id);
  return [id, member ? (-member.localEndForces[0] + member.localEndForces[3]) / 2 : 0];
}));
