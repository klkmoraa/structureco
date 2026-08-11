import { duplicateModelSelection } from '../data/modelOperations';
import type {
  MemberInitialEffect,
  MemberLoad,
  MemberModel,
  NodalLoad,
  NodeModel,
  PrescribedDisplacement,
  ProjectModel,
  Selection,
} from '../types';

type ProjectEntity = NodeModel | MemberModel | NodalLoad | MemberLoad | PrescribedDisplacement | MemberInitialEffect;
export type ProjectEntityCollection = 'nodes' | 'members' | 'nodalLoads' | 'memberLoads' | 'prescribedDisplacements' | 'memberInitialEffects';

export interface ProjectPatchOperation {
  collection: ProjectEntityCollection;
  id: string;
  index: number;
  before: ProjectEntity | null;
  after: ProjectEntity | null;
}

export interface ProjectPatch {
  description: string;
  operations: ProjectPatchOperation[];
}

interface CommandBase { description: string }

export type ProjectCommand =
  | (CommandBase & { kind: 'member.create'; nodes: NodeModel[]; member: MemberModel })
  | (CommandBase & {
    kind: 'member.material.apply';
    memberId: string;
    materialId: string;
    properties: Pick<MemberModel, 'E'> & Pick<Partial<MemberModel>, 'G' | 'density'>;
  })
  | (CommandBase & {
    kind: 'member.section.apply';
    memberId: string;
    sectionId: string;
    properties: Pick<MemberModel, 'A' | 'I'>;
  })
  | (CommandBase & { kind: 'member.update'; memberId: string; changes: Partial<Omit<MemberModel, 'id'>> })
  | (CommandBase & { kind: 'member.delete'; memberId: string })
  | (CommandBase & { kind: 'selection.duplicate'; selection: Selection; offset: { x: number; y: number } })
  | (CommandBase & { kind: 'dxf.import'; nodes: NodeModel[]; members: MemberModel[]; sourceName: string });

export interface CompiledProjectCommand {
  command: ProjectCommand;
  forward: ProjectPatch;
  inverse: ProjectPatch;
}

const COLLECTIONS: ProjectEntityCollection[] = [
  'nodes', 'members', 'nodalLoads', 'memberLoads', 'prescribedDisplacements', 'memberInitialEffects',
];

const entities = (project: ProjectModel, collection: ProjectEntityCollection): ProjectEntity[] => {
  const value = project[collection];
  return (value ?? []) as ProjectEntity[];
};

const same = (first: unknown, second: unknown): boolean => JSON.stringify(first) === JSON.stringify(second);
const owns = (value: object, key: PropertyKey): boolean => Object.prototype.hasOwnProperty.call(value, key);

const validateProjectBoundary = (project: ProjectModel): void => {
  const nodeIds = new Set<string>();
  for (const node of project.nodes) {
    if (nodeIds.has(node.id)) throw new Error(`ID de nodo duplicado: ${node.id}.`);
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) throw new Error(`El nodo ${node.id} tiene coordenadas no finitas.`);
    nodeIds.add(node.id);
  }
  const memberIds = new Set<string>();
  for (const member of project.members) {
    if (memberIds.has(member.id)) throw new Error(`ID de miembro duplicado: ${member.id}.`);
    if (!nodeIds.has(member.i) || !nodeIds.has(member.j) || member.i === member.j) {
      throw new Error(`El miembro ${member.id} no conserva extremos válidos.`);
    }
    if (member.materialOrigin === 'catalog' && !member.materialId) {
      throw new Error(`El miembro ${member.id} declara material de catálogo sin materialId.`);
    }
    if (member.sectionOrigin === 'catalog' && !member.sectionId) {
      throw new Error(`El miembro ${member.id} declara sección de catálogo sin sectionId.`);
    }
    memberIds.add(member.id);
  }
  for (const load of project.memberLoads) if (!memberIds.has(load.memberId)) throw new Error(`La carga ${load.id} referencia un miembro inexistente.`);
  for (const effect of project.memberInitialEffects ?? []) if (!memberIds.has(effect.memberId)) throw new Error(`El efecto ${effect.id} referencia un miembro inexistente.`);
};

const diffProjects = (before: ProjectModel, after: ProjectModel, description: string): ProjectPatch => {
  const operations: ProjectPatchOperation[] = [];
  for (const collection of COLLECTIONS) {
    const previous = entities(before, collection);
    const next = entities(after, collection);
    for (let index = 0; index < previous.length; index += 1) {
      const entity = previous[index];
      const nextEntity = next.find((candidate) => candidate.id === entity.id) ?? null;
      if (!nextEntity) operations.push({ collection, id: entity.id, index, before: structuredClone(entity), after: null });
      else if (!same(entity, nextEntity)) operations.push({ collection, id: entity.id, index, before: structuredClone(entity), after: structuredClone(nextEntity) });
    }
    for (let index = 0; index < next.length; index += 1) {
      const entity = next[index];
      if (!previous.some((candidate) => candidate.id === entity.id)) {
        operations.push({ collection, id: entity.id, index, before: null, after: structuredClone(entity) });
      }
    }
  }
  return { description, operations };
};

export const invertProjectPatch = (patch: ProjectPatch): ProjectPatch => ({
  description: `Revertir: ${patch.description}`,
  operations: [...patch.operations].reverse().map((operation) => ({
    ...operation,
    before: operation.after ? structuredClone(operation.after) : null,
    after: operation.before ? structuredClone(operation.before) : null,
  })),
});

export const applyProjectPatch = (project: ProjectModel, patch: ProjectPatch): ProjectModel => {
  const next = structuredClone(project);
  for (const operation of patch.operations) {
    const collection = entities(next, operation.collection);
    const currentIndex = collection.findIndex((candidate) => candidate.id === operation.id);
    const current = currentIndex >= 0 ? collection[currentIndex] : null;
    if (!same(current, operation.before)) throw new Error(`Falló la precondición para ${operation.collection}/${operation.id}.`);
    if (operation.after === null) collection.splice(currentIndex, 1);
    else if (currentIndex >= 0) collection[currentIndex] = structuredClone(operation.after);
    else collection.splice(Math.min(operation.index, collection.length), 0, structuredClone(operation.after));
    (next as unknown as Record<string, ProjectEntity[]>)[operation.collection] = collection;
  }
  validateProjectBoundary(next);
  return next;
};

export const compileProjectCommand = (project: ProjectModel, command: ProjectCommand): CompiledProjectCommand => {
  const next = structuredClone(project);
  if (command.kind === 'member.create') {
    next.nodes.push(...structuredClone(command.nodes));
    const member = structuredClone(command.member);
    member.materialOrigin ??= 'custom';
    member.sectionOrigin ??= 'custom';
    next.members.push(member);
  } else if (command.kind === 'member.material.apply') {
    const index = next.members.findIndex((member) => member.id === command.memberId);
    if (index < 0) throw new Error(`No existe el miembro ${command.memberId}.`);
    next.members[index] = {
      ...next.members[index],
      ...structuredClone(command.properties),
      materialId: command.materialId,
      materialOrigin: 'catalog',
    };
  } else if (command.kind === 'member.section.apply') {
    const index = next.members.findIndex((member) => member.id === command.memberId);
    if (index < 0) throw new Error(`No existe el miembro ${command.memberId}.`);
    next.members[index] = {
      ...next.members[index],
      ...structuredClone(command.properties),
      sectionId: command.sectionId,
      sectionOrigin: 'catalog',
    };
  } else if (command.kind === 'member.update') {
    const index = next.members.findIndex((member) => member.id === command.memberId);
    if (index < 0) throw new Error(`No existe el miembro ${command.memberId}.`);
    const current = next.members[index];
    const changes = structuredClone(command.changes);
    const materialChanged = (['E', 'G', 'density'] as const).some(
      (key) => owns(changes, key) && !Object.is(changes[key], current[key]),
    );
    const sectionChanged = (['A', 'I'] as const).some(
      (key) => owns(changes, key) && !Object.is(changes[key], current[key]),
    );
    // Identity is only assigned through the two explicit preset commands.
    // Generic edits cannot inject or recover a catalog identity.
    delete changes.materialId;
    delete changes.materialOrigin;
    delete changes.sectionId;
    delete changes.sectionOrigin;
    const updated = { ...current, ...changes, id: command.memberId };
    if (materialChanged) {
      delete updated.materialId;
      updated.materialOrigin = 'custom';
    }
    if (sectionChanged) {
      delete updated.sectionId;
      updated.sectionOrigin = 'custom';
    }
    next.members[index] = updated;
  } else if (command.kind === 'member.delete') {
    if (!next.members.some((member) => member.id === command.memberId)) throw new Error(`No existe el miembro ${command.memberId}.`);
    next.members = next.members.filter((member) => member.id !== command.memberId);
    next.memberLoads = next.memberLoads.filter((load) => load.memberId !== command.memberId);
    next.memberInitialEffects = (next.memberInitialEffects ?? []).filter((effect) => effect.memberId !== command.memberId);
  } else if (command.kind === 'selection.duplicate') {
    const duplicated = duplicateModelSelection(next, command.selection, command.offset);
    if (!duplicated) throw new Error('La selección no se puede duplicar.');
  } else {
    next.nodes.push(...structuredClone(command.nodes));
    next.members.push(...structuredClone(command.members));
  }
  validateProjectBoundary(next);
  const forward = diffProjects(project, next, command.description);
  return { command, forward, inverse: invertProjectPatch(forward) };
};
