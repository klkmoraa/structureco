import {
  projectCommandSnapshot,
  type MemberBulkChanges,
  type MemberBulkEntry,
  type MemberLoadBulkChanges,
  type MemberLoadBulkEntry,
  type NodalLoadBulkChanges,
  type NodalLoadBulkEntry,
  type NodeBulkChanges,
  type NodeBulkEntry,
  type ProjectCommand,
} from '../../commands/projectCommand';
import { findStandardMaterial } from '../../data/standardMaterials';
import { findStandardSection } from '../../data/standardSections';
import type { ProjectModel } from '../../types';
import { findBulkProperty } from './bulkEditAggregation';
import { canStageBulkChange } from './bulkEditIntent';
import type {
  BulkEditDraft,
  BulkEntityKind,
  BulkPropertyId,
  BulkSelectionAggregate,
  BulkStagedChange,
  BulkTargetRef,
} from './bulkEditTypes';

/**
 * Traduce la intención preparada en un comando de proyecto.
 *
 * La operación se construye entera antes de tocar nada: el comando lleva el
 * estado exacto sobre el que se preparó, y `compileProjectCommand` lo rechaza si
 * el modelo se movió mientras el usuario revisaba. `executeProjectCommand`
 * calcula el proyecto resultante completo y sólo entonces lo publica, así que un
 * fallo en cualquier miembro deja cero cambios, cero historial y cero
 * persistencia: la operación es atómica por construcción.
 *
 * Cada propiedad se aplica únicamente a los miembros que la admiten, agrupados
 * por el conjunto exacto de cambios que reciben. Ningún miembro incompatible se
 * toca en silencio: el resumen dice cuántos quedan fuera y por qué.
 */

export interface PreparedBulkEdit {
  readonly command: Extract<ProjectCommand, { kind: 'selection.bulk.apply' }>;
  /** Miembros que alguna entrada tocaría. */
  readonly affected: readonly BulkTargetRef[];
  /** Seleccionados que ningún cambio alcanza. */
  readonly skipped: readonly BulkTargetRef[];
}

/** Número que el comando espera; el borrador guarda unidades base. */
const numeric = (change: BulkStagedChange): number | null =>
  change.kind === 'clear' ? null : Number(change.value);

const boolean = (change: BulkStagedChange): boolean | null =>
  change.kind === 'clear' ? null : Boolean(change.value);

/**
 * Cambios que corresponden a un miembro concreto. Una propiedad que ese miembro
 * no admite no entra: se queda en `skipped` con su motivo, nunca se escribe.
 */
const changesForMember = (
  aggregate: BulkSelectionAggregate,
  draft: BulkEditDraft,
  memberId: string,
): MemberBulkChanges => {
  const changes: MemberBulkChanges = {};
  for (const [id, change] of Object.entries(draft) as [BulkPropertyId, BulkStagedChange][]) {
    const state = findBulkProperty(aggregate, id);
    if (!canStageBulkChange(state, change)) continue;
    if (!state.compatibility.compatible.some((target) => target.kind === 'member' && target.id === memberId)) continue;

    switch (id) {
      case 'member.type':
        if (change.kind === 'set') changes.type = change.value as MemberBulkChanges['type'];
        break;
      case 'member.materialId': {
        // La identidad viaja con sus números: el catálogo es la única fuente,
        // así que aplicarla no puede inventar procedencia.
        const material = change.kind === 'set' ? findStandardMaterial(String(change.value)) : undefined;
        if (material) changes.material = {
          materialId: material.id,
          properties: { E: material.elasticModulus, G: material.shearModulus, density: material.density },
        };
        break;
      }
      case 'member.sectionId': {
        const section = change.kind === 'set' ? findStandardSection(String(change.value)) : undefined;
        if (section) changes.section = {
          sectionId: section.id,
          properties: { A: section.area, I: section.inertiaX },
        };
        break;
      }
      case 'member.E': if (change.kind === 'set') changes.E = Number(change.value); break;
      case 'member.A': if (change.kind === 'set') changes.A = Number(change.value); break;
      case 'member.I': if (change.kind === 'set') changes.I = Number(change.value); break;
      case 'member.G': changes.G = numeric(change); break;
      case 'member.shearArea': changes.shearArea = numeric(change); break;
      case 'member.density': changes.density = numeric(change); break;
      case 'member.beamTheory':
        changes.beamTheory = change.kind === 'clear'
          ? null
          : change.value as NonNullable<MemberBulkChanges['beamTheory']>;
        break;
      case 'member.releases.iMoment': changes.iMoment = boolean(change); break;
      case 'member.releases.jMoment': changes.jMoment = boolean(change); break;
      case 'member.rotationalSpringI': changes.rotationalSpringI = numeric(change); break;
      case 'member.rotationalSpringJ': changes.rotationalSpringJ = numeric(change); break;
      case 'member.rigidOffsetI': changes.rigidOffsetI = numeric(change); break;
      case 'member.rigidOffsetJ': changes.rigidOffsetJ = numeric(change); break;
      default:
        // Las propiedades de nudo no entran en un comando de miembros.
        break;
    }
  }
  return changes;
};


/** Cambios que corresponden a un nudo concreto, con la misma regla de elegibilidad. */
const changesForNode = (
  aggregate: BulkSelectionAggregate,
  draft: BulkEditDraft,
  nodeId: string,
): NodeBulkChanges => {
  const changes: NodeBulkChanges = {};
  for (const [id, change] of Object.entries(draft) as [BulkPropertyId, BulkStagedChange][]) {
    const state = findBulkProperty(aggregate, id);
    if (!canStageBulkChange(state, change)) continue;
    if (!state.compatibility.compatible.some((target) => target.kind === 'node' && target.id === nodeId)) continue;

    switch (id) {
      case 'node.support.type':
        if (change.kind === 'set') changes.supportType = change.value as NodeBulkChanges['supportType'];
        break;
      case 'node.support.angleDeg': changes.angleDeg = numeric(change); break;
      case 'node.support.restrainX': changes.restrainX = boolean(change); break;
      case 'node.support.restrainY': changes.restrainY = boolean(change); break;
      case 'node.support.restrainR': changes.restrainR = boolean(change); break;
      case 'node.internalHinge': changes.internalHinge = boolean(change); break;
      default:
        // Las propiedades de miembro no entran en un cambio de nudo.
        break;
    }
  }
  return changes;
};


/** Cambios de una carga nodal; nunca alcanzan a una carga de miembro. */
const changesForNodalLoad = (
  aggregate: BulkSelectionAggregate,
  draft: BulkEditDraft,
  loadId: string,
): NodalLoadBulkChanges => {
  const changes: NodalLoadBulkChanges = {};
  for (const [id, change] of Object.entries(draft) as [BulkPropertyId, BulkStagedChange][]) {
    const state = findBulkProperty(aggregate, id);
    if (!canStageBulkChange(state, change)) continue;
    if (!state.compatibility.compatible.some((target) => target.kind === 'nodalLoad' && target.id === loadId)) continue;
    if (change.kind !== 'set') continue;

    switch (id) {
      case 'nodalLoad.caseId': changes.caseId = String(change.value); break;
      case 'nodalLoad.fx': changes.fx = Number(change.value); break;
      case 'nodalLoad.fy': changes.fy = Number(change.value); break;
      case 'nodalLoad.mz': changes.mz = Number(change.value); break;
      default: break;
    }
  }
  return changes;
};

/** Cambios de una carga de miembro, ya acotados a su familia por la elegibilidad. */
const changesForMemberLoad = (
  aggregate: BulkSelectionAggregate,
  draft: BulkEditDraft,
  loadId: string,
): MemberLoadBulkChanges => {
  const changes: MemberLoadBulkChanges = {};
  for (const [id, change] of Object.entries(draft) as [BulkPropertyId, BulkStagedChange][]) {
    const state = findBulkProperty(aggregate, id);
    if (!canStageBulkChange(state, change)) continue;
    if (!state.compatibility.compatible.some((target) => target.kind === 'memberLoad' && target.id === loadId)) continue;

    switch (id) {
      case 'memberLoad.caseId': if (change.kind === 'set') changes.caseId = String(change.value); break;
      case 'memberLoad.coordinateSystem':
        if (change.kind === 'set') changes.coordinateSystem = change.value as MemberLoadBulkChanges['coordinateSystem'];
        break;
      case 'memberLoad.lengthBasis':
        if (change.kind === 'set') changes.lengthBasis = change.value as MemberLoadBulkChanges['lengthBasis'];
        break;
      case 'memberLoad.start': if (change.kind === 'set') changes.start = Number(change.value); break;
      case 'memberLoad.end': if (change.kind === 'set') changes.end = Number(change.value); break;
      case 'memberLoad.position': if (change.kind === 'set') changes.position = Number(change.value); break;
      case 'memberLoad.qxStart': changes.qxStart = numeric(change); break;
      case 'memberLoad.qxEnd': changes.qxEnd = numeric(change); break;
      case 'memberLoad.qyStart': changes.qyStart = numeric(change); break;
      case 'memberLoad.qyEnd': changes.qyEnd = numeric(change); break;
      case 'memberLoad.px': changes.px = numeric(change); break;
      case 'memberLoad.py': changes.py = numeric(change); break;
      case 'memberLoad.moment': changes.moment = numeric(change); break;
      default: break;
    }
  }
  return changes;
};

/** Una entidad está en la selección si alguna propiedad la clasificó, compatible o no. */
const isSelected = (aggregate: BulkSelectionAggregate, kind: BulkEntityKind, id: string): boolean =>
  aggregate.properties.some((property) => property.compatibility.compatible
    .some((target) => target.kind === kind && target.id === id)
    || property.compatibility.incompatible
      .some((entry) => entry.target.kind === kind && entry.target.id === id));

const hasChanges = (changes: object): boolean => Object.keys(changes).length > 0;

/**
 * Agrupa los miembros por el conjunto exacto de cambios que reciben. Con una
 * selección homogénea sale un solo grupo; con tipos mezclados salen tantos como
 * combinaciones de elegibilidad haya, y ninguno escribe de más.
 */
export const prepareBulkEdit = (
  project: ProjectModel,
  aggregate: BulkSelectionAggregate,
  draft: BulkEditDraft,
  description: string,
): PreparedBulkEdit => {
  const groups = new Map<string, { changes: MemberBulkChanges; memberIds: string[] }>();
  const affected: BulkTargetRef[] = [];
  const skipped: BulkTargetRef[] = [];

  for (const member of project.members) {
    const target: BulkTargetRef = { kind: 'member', id: member.id };
    if (!isSelected(aggregate, 'member', member.id)) continue;

    const changes = changesForMember(aggregate, draft, member.id);
    if (!hasChanges(changes)) {
      skipped.push(target);
      continue;
    }
    affected.push(target);
    const key = projectCommandSnapshot(changes);
    const group = groups.get(key);
    if (group) group.memberIds.push(member.id);
    else groups.set(key, { changes, memberIds: [member.id] });
  }

  const nodeGroups = new Map<string, { changes: NodeBulkChanges; nodeIds: string[] }>();
  for (const node of project.nodes) {
    const target: BulkTargetRef = { kind: 'node', id: node.id };
    if (!isSelected(aggregate, 'node', node.id)) continue;

    const changes = changesForNode(aggregate, draft, node.id);
    if (!hasChanges(changes)) {
      skipped.push(target);
      continue;
    }
    affected.push(target);
    const key = projectCommandSnapshot(changes);
    const group = nodeGroups.get(key);
    if (group) group.nodeIds.push(node.id);
    else nodeGroups.set(key, { changes, nodeIds: [node.id] });
  }

  const nodalLoadGroups = new Map<string, { changes: NodalLoadBulkChanges; loadIds: string[] }>();
  for (const load of project.nodalLoads) {
    if (!isSelected(aggregate, 'nodalLoad', load.id)) continue;
    const target: BulkTargetRef = { kind: 'nodalLoad', id: load.id };
    const changes = changesForNodalLoad(aggregate, draft, load.id);
    if (!hasChanges(changes)) {
      skipped.push(target);
      continue;
    }
    affected.push(target);
    const key = projectCommandSnapshot(changes);
    const group = nodalLoadGroups.get(key);
    if (group) group.loadIds.push(load.id);
    else nodalLoadGroups.set(key, { changes, loadIds: [load.id] });
  }

  const memberLoadGroups = new Map<string, { changes: MemberLoadBulkChanges; loadIds: string[] }>();
  for (const load of project.memberLoads) {
    if (!isSelected(aggregate, 'memberLoad', load.id)) continue;
    const target: BulkTargetRef = { kind: 'memberLoad', id: load.id };
    const changes = changesForMemberLoad(aggregate, draft, load.id);
    if (!hasChanges(changes)) {
      skipped.push(target);
      continue;
    }
    affected.push(target);
    const key = projectCommandSnapshot(changes);
    const group = memberLoadGroups.get(key);
    if (group) group.loadIds.push(load.id);
    else memberLoadGroups.set(key, { changes, loadIds: [load.id] });
  }

  const entries: MemberBulkEntry[] = [...groups.values()].map((group) => ({
    memberIds: group.memberIds,
    changes: group.changes,
  }));
  const nodeEntries: NodeBulkEntry[] = [...nodeGroups.values()].map((group) => ({
    nodeIds: group.nodeIds,
    changes: group.changes,
  }));

  const nodalLoadEntries: NodalLoadBulkEntry[] = [...nodalLoadGroups.values()].map((group) => ({
    loadIds: group.loadIds,
    changes: group.changes,
  }));
  const memberLoadEntries: MemberLoadBulkEntry[] = [...memberLoadGroups.values()].map((group) => ({
    loadIds: group.loadIds,
    changes: group.changes,
  }));

  return {
    command: {
      kind: 'selection.bulk.apply',
      description,
      entries,
      nodeEntries,
      nodalLoadEntries,
      memberLoadEntries,
      sourceSnapshot: projectCommandSnapshot(project),
    },
    affected,
    skipped,
  };
};
