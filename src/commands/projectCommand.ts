import {
  createMemberAtPoint,
  deleteStructuralSelection,
  duplicateModelSelection,
  repairProjectTopology,
  splitMemberAt,
  type MemberCreationTemplate,
  type TopologyRepairReport,
} from '../data/modelOperations';
import type {
  MemberInitialEffect,
  MemberLoad,
  MemberModel,
  NodalLoad,
  NodeModel,
  PrescribedDisplacement,
  ProjectModel,
  Selection,
  SupportDefinition,
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

/**
 * Cambios preparados de una edición múltiple sobre miembros.
 *
 * Una propiedad ausente es «sin tocar» y no se escribe jamás; `null` la borra
 * explícitamente. Esa distinción es el contrato completo de la operación: un
 * valor mixto que el usuario no editó nunca llega hasta aquí.
 *
 * `materialId` y `sectionId` sólo aceptan una identidad de catálogo y viajan con
 * las propiedades numéricas que esa identidad implica, igual que
 * `member.material.apply` / `member.section.apply`. Escribir E, G o densidad por
 * separado degrada el material a `custom`; escribir A o I degrada la sección.
 */
export interface MemberBulkChanges {
  type?: MemberModel['type'];
  material?: {
    materialId: string;
    properties: Pick<MemberModel, 'E'> & Pick<Partial<MemberModel>, 'G' | 'density'>;
  };
  section?: {
    sectionId: string;
    properties: Pick<MemberModel, 'A' | 'I'>;
  };
  E?: number;
  A?: number;
  I?: number;
  G?: number | null;
  shearArea?: number | null;
  density?: number | null;
  beamTheory?: MemberModel['beamTheory'] | null;
  iMoment?: boolean | null;
  jMoment?: boolean | null;
  rotationalSpringI?: number | null;
  rotationalSpringJ?: number | null;
  rigidOffsetI?: number | null;
  rigidOffsetJ?: number | null;
}

export interface MemberBulkEntry {
  /** Miembros que reciben exactamente este conjunto de cambios. */
  readonly memberIds: readonly string[];
  readonly changes: MemberBulkChanges;
}

export type ProjectCommand =
  | (CommandBase & { kind: 'member.create'; nodes: NodeModel[]; member: MemberModel })
  | (CommandBase & {
    kind: 'member.createAtPoint';
    startNodeId: string;
    point: { x: number; y: number };
    template: MemberCreationTemplate;
  })
  | (CommandBase & {
    kind: 'member.split';
    memberId: string;
    ratio: number;
    nodeSupport?: SupportDefinition;
  })
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
  | (CommandBase & {
    kind: 'member.bulk.apply';
    /** Grupos de miembros que reciben exactamente el mismo cambio. */
    entries: readonly MemberBulkEntry[];
    /** Estado exacto sobre el que se preparó; rechaza una intención obsoleta. */
    sourceSnapshot: string;
  })
  | (CommandBase & { kind: 'member.delete'; memberId: string })
  | (CommandBase & { kind: 'node.delete'; nodeId: string })
  | (CommandBase & { kind: 'selection.delete'; selection: Extract<Selection, { kind: 'multi' }> })
  | (CommandBase & { kind: 'selection.duplicate'; selection: Selection; offset: { x: number; y: number } })
  | (CommandBase & { kind: 'dxf.import'; nodes: NodeModel[]; members: MemberModel[]; sourceName: string })
  | (CommandBase & {
    kind: 'topology.repair';
    /** Exact project state shown when the user reviewed the preview. */
    sourceSnapshot: string;
    /** Exact repair result accepted by the user. */
    repairedSnapshot: string;
  });

export type ProjectCommandResult =
  | { kind: 'member.create'; memberId: string; nodeId: string; created: true }
  | { kind: 'member.createAtPoint'; memberId: string; nodeId: string; created: boolean }
  | { kind: 'member.split'; nodeId: string; firstMemberId: string; secondMemberId: string }
  | { kind: 'topology.repair'; report: TopologyRepairReport };

export interface CompiledProjectCommand {
  command: ProjectCommand;
  forward: ProjectPatch;
  inverse: ProjectPatch;
  result?: ProjectCommandResult;
}

export interface PreparedTopologyRepair extends CompiledProjectCommand {
  command: Extract<ProjectCommand, { kind: 'topology.repair' }>;
  result: Extract<ProjectCommandResult, { kind: 'topology.repair' }>;
  report: TopologyRepairReport;
  repairedProject: ProjectModel;
  repairedSnapshot: string;
}

const COLLECTIONS: ProjectEntityCollection[] = [
  'nodes', 'members', 'nodalLoads', 'memberLoads', 'prescribedDisplacements', 'memberInitialEffects',
];

const entities = (project: ProjectModel, collection: ProjectEntityCollection): ProjectEntity[] => {
  const value = project[collection];
  return (value ?? []) as ProjectEntity[];
};

const encodeExact = (value: unknown): unknown => {
  if (value === undefined) return ['undefined'];
  if (value === null) return ['null'];
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return ['number', 'NaN'];
    if (value === Number.POSITIVE_INFINITY) return ['number', '+Infinity'];
    if (value === Number.NEGATIVE_INFINITY) return ['number', '-Infinity'];
    if (Object.is(value, -0)) return ['number', '-0'];
    return ['number', value];
  }
  if (typeof value === 'string') return ['string', value];
  if (typeof value === 'boolean') return ['boolean', value];
  if (Array.isArray(value)) return ['array', value.map(encodeExact)];
  if (typeof value === 'object') {
    return ['object', Object.keys(value as Record<string, unknown>).sort()
      .map((key) => [key, encodeExact((value as Record<string, unknown>)[key])])];
  }
  throw new Error(`El proyecto contiene un valor no serializable de tipo ${typeof value}.`);
};

/** Exact, deterministic snapshot that preserves non-finite numbers and undefined fields. */
export const projectCommandSnapshot = (value: unknown): string => JSON.stringify(encodeExact(value));

const same = (first: unknown, second: unknown): boolean => projectCommandSnapshot(first) === projectCommandSnapshot(second);
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
  operations: patch.operations.map((operation) => ({
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

/** Propiedades que sólo un pórtico puede sostener; el solver rechaza el resto. */
const FRAME_ONLY_FIELDS = [
  'beamTheory', 'releases', 'rotationalSpringI', 'rotationalSpringJ', 'rigidOffsetI', 'rigidOffsetJ', 'shearArea',
] as const;

const setOrClear = <Key extends keyof MemberModel>(
  member: MemberModel,
  key: Key,
  value: MemberModel[Key] | null | undefined,
) => {
  if (value === undefined) return;
  if (value === null) delete member[key];
  else member[key] = value;
};

/**
 * Escribe un cambio preparado sobre un miembro.
 *
 * Tres reglas del dominio se aplican aquí, no en la interfaz:
 * 1. una identidad de catálogo llega con sus números y fija el origen `catalog`;
 * 2. escribir E/G/densidad o A/I por separado degrada la identidad a `custom`,
 *    igual que `member.update`, para que el id nunca contradiga a los números;
 * 3. cambiar el tipo retira lo que el nuevo tipo no puede sostener, en vez de
 *    dejar propiedades que harían fallar al solver.
 */
const applyMemberBulkChanges = (current: MemberModel, changes: MemberBulkChanges): MemberModel => {
  const updated: MemberModel = structuredClone(current);

  if (changes.material) {
    Object.assign(updated, structuredClone(changes.material.properties));
    updated.materialId = changes.material.materialId;
    updated.materialOrigin = 'catalog';
  }
  if (changes.section) {
    Object.assign(updated, structuredClone(changes.section.properties));
    updated.sectionId = changes.section.sectionId;
    updated.sectionOrigin = 'catalog';
  }

  const materialChanged = (['E', 'G', 'density'] as const).some(
    (key) => changes[key] !== undefined && !Object.is(changes[key] ?? undefined, current[key]),
  );
  const sectionChanged = (['A', 'I'] as const).some(
    (key) => changes[key] !== undefined && !Object.is(changes[key], current[key]),
  );

  if (changes.E !== undefined) updated.E = changes.E;
  if (changes.A !== undefined) updated.A = changes.A;
  if (changes.I !== undefined) updated.I = changes.I;
  setOrClear(updated, 'G', changes.G);
  setOrClear(updated, 'shearArea', changes.shearArea);
  setOrClear(updated, 'density', changes.density);
  setOrClear(updated, 'beamTheory', changes.beamTheory);
  setOrClear(updated, 'rotationalSpringI', changes.rotationalSpringI);
  setOrClear(updated, 'rotationalSpringJ', changes.rotationalSpringJ);
  setOrClear(updated, 'rigidOffsetI', changes.rigidOffsetI);
  setOrClear(updated, 'rigidOffsetJ', changes.rigidOffsetJ);

  if (changes.iMoment !== undefined || changes.jMoment !== undefined) {
    const releases = { ...updated.releases };
    if (changes.iMoment === null) delete releases.iMoment;
    else if (changes.iMoment !== undefined) releases.iMoment = changes.iMoment;
    if (changes.jMoment === null) delete releases.jMoment;
    else if (changes.jMoment !== undefined) releases.jMoment = changes.jMoment;
    if (Object.keys(releases).length === 0) delete updated.releases;
    else updated.releases = releases;
  }

  if (materialChanged) {
    delete updated.materialId;
    updated.materialOrigin = 'custom';
  }
  if (sectionChanged) {
    delete updated.sectionId;
    updated.sectionOrigin = 'custom';
  }

  if (changes.type !== undefined && changes.type !== updated.type) {
    updated.type = changes.type;
    if (changes.type !== 'frame') for (const field of FRAME_ONLY_FIELDS) delete updated[field];
  }

  return updated;
};

export const compileProjectCommand = (project: ProjectModel, command: ProjectCommand): CompiledProjectCommand => {
  const next = structuredClone(project);
  let result: ProjectCommandResult | undefined;
  if (command.kind === 'member.create') {
    next.nodes.push(...structuredClone(command.nodes));
    const member = structuredClone(command.member);
    member.materialOrigin ??= 'custom';
    member.sectionOrigin ??= 'custom';
    next.members.push(member);
    result = { kind: 'member.create', memberId: member.id, nodeId: member.j, created: true };
  } else if (command.kind === 'member.createAtPoint') {
    const created = createMemberAtPoint(next, command);
    result = { kind: command.kind, ...created };
  } else if (command.kind === 'member.split') {
    const split = splitMemberAt(next, command.memberId, command.ratio);
    if (command.nodeSupport) {
      const node = next.nodes.find((candidate) => candidate.id === split.nodeId);
      if (!node) throw new Error(`No existe el nodo ${split.nodeId}.`);
      node.support = structuredClone(command.nodeSupport);
    }
    result = { kind: command.kind, ...split };
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
  } else if (command.kind === 'member.bulk.apply') {
    if (projectCommandSnapshot(project) !== command.sourceSnapshot) {
      throw new Error('La edición múltiple preparada está obsoleta; vuelve a prepararla antes de aplicarla.');
    }
    const seen = new Set<string>();
    for (const entry of command.entries) {
      for (const memberId of entry.memberIds) {
        if (seen.has(memberId)) throw new Error(`El miembro ${memberId} recibe dos cambios en la misma edición múltiple.`);
        seen.add(memberId);
        const index = next.members.findIndex((member) => member.id === memberId);
        if (index < 0) throw new Error(`No existe el miembro ${memberId}.`);
        next.members[index] = applyMemberBulkChanges(next.members[index], entry.changes);
      }
    }
  } else if (command.kind === 'member.delete') {
    if (!next.members.some((member) => member.id === command.memberId)) throw new Error(`No existe el miembro ${command.memberId}.`);
    deleteStructuralSelection(next, { kind: 'member', id: command.memberId });
  } else if (command.kind === 'node.delete') {
    deleteStructuralSelection(next, { kind: 'node', id: command.nodeId });
  } else if (command.kind === 'selection.delete') {
    deleteStructuralSelection(next, command.selection);
  } else if (command.kind === 'selection.duplicate') {
    const duplicated = duplicateModelSelection(next, command.selection, command.offset);
    if (!duplicated) throw new Error('La selección no se puede duplicar.');
  } else if (command.kind === 'dxf.import') {
    next.nodes.push(...structuredClone(command.nodes));
    next.members.push(...structuredClone(command.members));
  } else if (command.kind === 'topology.repair') {
    if (projectCommandSnapshot(project) !== command.sourceSnapshot) {
      throw new Error('El preview de reparación está obsoleto; regénéralo antes de aplicar.');
    }
    const report = repairProjectTopology(next);
    if (projectCommandSnapshot(next) !== command.repairedSnapshot) {
      throw new Error('La reparación actual no coincide con el preview preparado.');
    }
    result = { kind: 'topology.repair', report };
  }
  validateProjectBoundary(next);
  const forward = diffProjects(project, next, command.description);
  return { command, forward, inverse: invertProjectPatch(forward), result };
};

/**
 * Runs the established topology repair once on a private clone and freezes the
 * exact source/result contract that the confirmation step must honor.
 */
export const prepareTopologyRepairCommand = (
  project: ProjectModel,
  description = 'Reparar topología segura',
): PreparedTopologyRepair => {
  const sourceSnapshot = projectCommandSnapshot(project);
  const repairedProject = structuredClone(project);
  const report = repairProjectTopology(repairedProject);
  validateProjectBoundary(repairedProject);
  const repairedSnapshot = projectCommandSnapshot(repairedProject);
  const command: Extract<ProjectCommand, { kind: 'topology.repair' }> = {
    kind: 'topology.repair',
    description,
    sourceSnapshot,
    repairedSnapshot,
  };
  const forward = diffProjects(project, repairedProject, description);
  return {
    command,
    forward,
    inverse: invertProjectPatch(forward),
    result: { kind: 'topology.repair', report },
    report,
    repairedProject,
    repairedSnapshot,
  };
};

/** Applies only the already-reviewed repair. It never recompiles a new one. */
export const applyPreparedTopologyRepair = (
  project: ProjectModel,
  prepared: PreparedTopologyRepair,
): ProjectModel => {
  if (projectCommandSnapshot(project) !== prepared.command.sourceSnapshot) {
    throw new Error('El preview de reparación está obsoleto; regénéralo antes de aplicar.');
  }
  if (projectCommandSnapshot(prepared.repairedProject) !== prepared.repairedSnapshot
    || prepared.command.repairedSnapshot !== prepared.repairedSnapshot
    || projectCommandSnapshot(prepared.report) !== projectCommandSnapshot(prepared.result.report)) {
    throw new Error('El resultado preparado no coincide con el preview de reparación.');
  }
  // Reconstruct the authoritative domain operation before trusting any patches
  // carried by the prepared object. This keeps the specific API from becoming
  // a generic, self-signed patch bus for arbitrary structural edits.
  const trusted = compileProjectCommand(project, prepared.command);
  if (projectCommandSnapshot(trusted.forward) !== projectCommandSnapshot(prepared.forward)
    || projectCommandSnapshot(trusted.inverse) !== projectCommandSnapshot(prepared.inverse)
    || projectCommandSnapshot(trusted.result) !== projectCommandSnapshot(prepared.result)) {
    throw new Error('La reparación preparada no coincide con el preview autoritativo.');
  }
  const repaired = applyProjectPatch(project, prepared.forward);
  if (projectCommandSnapshot(repaired) !== prepared.repairedSnapshot) {
    throw new Error('El resultado aplicado no coincide con el preview de reparación.');
  }
  return repaired;
};
