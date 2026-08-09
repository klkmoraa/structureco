export type Experimental3DPoint = readonly [x: number, y: number, z: 0];

export interface Experimental3DProjectInput {
  readonly nodes: readonly {
    readonly id: string;
    readonly x: number;
    readonly y: number;
  }[];
  readonly members: readonly {
    readonly id: string;
    readonly i: string;
    readonly j: string;
  }[];
}

export interface Experimental3DNode {
  readonly id: string;
  readonly position: Experimental3DPoint;
}

export interface Experimental3DMember {
  readonly id: string;
  readonly nodeI: string;
  readonly nodeJ: string;
  readonly start: Experimental3DPoint;
  readonly end: Experimental3DPoint;
}

export type Experimental3DDiagnostic =
  | Readonly<{ code: 'invalid-node-coordinate'; nodeId: string }>
  | Readonly<{ code: 'unresolved-member-endpoint'; memberId: string; nodeIds: readonly string[] }>;

export interface Experimental3DBounds {
  readonly min: Experimental3DPoint;
  readonly max: Experimental3DPoint;
  readonly center: Experimental3DPoint;
  readonly span: number;
}

export interface Experimental3DSceneModel {
  readonly nodes: readonly Experimental3DNode[];
  readonly members: readonly Experimental3DMember[];
  readonly bounds: Experimental3DBounds;
  readonly diagnostics: readonly Experimental3DDiagnostic[];
}

const point = (x: number, y: number): Experimental3DPoint => Object.freeze([x, y, 0] as const);

const sceneBounds = (nodes: readonly Experimental3DNode[]): Experimental3DBounds => {
  if (nodes.length === 0) {
    return Object.freeze({
      min: point(0, 0),
      max: point(0, 0),
      center: point(0, 0),
      span: 10,
    });
  }

  let minX = nodes[0].position[0];
  let maxX = minX;
  let minY = nodes[0].position[1];
  let maxY = minY;
  for (const node of nodes.slice(1)) {
    minX = Math.min(minX, node.position[0]);
    maxX = Math.max(maxX, node.position[0]);
    minY = Math.min(minY, node.position[1]);
    maxY = Math.max(maxY, node.position[1]);
  }

  return Object.freeze({
    min: point(minX, minY),
    max: point(maxX, maxY),
    center: point((minX + maxX) / 2, (minY + maxY) / 2),
    span: Math.max(maxX - minX, maxY - minY, 1),
  });
};

export const buildExperimental3DScene = (project: Experimental3DProjectInput): Experimental3DSceneModel => {
  const diagnostics: Experimental3DDiagnostic[] = [];
  const nodes: Experimental3DNode[] = [];
  const nodeById = new Map<string, Experimental3DNode>();

  for (const source of project.nodes) {
    if (!Number.isFinite(source.x) || !Number.isFinite(source.y)) {
      diagnostics.push(Object.freeze({ code: 'invalid-node-coordinate', nodeId: source.id }));
      continue;
    }
    const node = Object.freeze({ id: source.id, position: point(source.x, source.y) });
    nodes.push(node);
    nodeById.set(node.id, node);
  }

  const members: Experimental3DMember[] = [];
  for (const source of project.members) {
    const start = nodeById.get(source.i);
    const end = nodeById.get(source.j);
    if (!start || !end) {
      const nodeIds = [...new Set([!start ? source.i : null, !end ? source.j : null].filter((id): id is string => id !== null))];
      diagnostics.push(Object.freeze({
        code: 'unresolved-member-endpoint',
        memberId: source.id,
        nodeIds: Object.freeze(nodeIds),
      }));
      continue;
    }
    members.push(Object.freeze({
      id: source.id,
      nodeI: source.i,
      nodeJ: source.j,
      start: start.position,
      end: end.position,
    }));
  }

  return Object.freeze({
    nodes: Object.freeze(nodes),
    members: Object.freeze(members),
    bounds: sceneBounds(nodes),
    diagnostics: Object.freeze(diagnostics),
  });
};
