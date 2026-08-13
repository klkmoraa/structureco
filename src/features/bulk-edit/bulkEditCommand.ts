import { projectCommandSnapshot, type MemberBulkChanges, type MemberBulkEntry, type ProjectCommand } from '../../commands/projectCommand';
import { findStandardMaterial } from '../../data/standardMaterials';
import { findStandardSection } from '../../data/standardSections';
import type { ProjectModel } from '../../types';
import { findBulkProperty } from './bulkEditAggregation';
import { canStageBulkChange } from './bulkEditIntent';
import type {
  BulkEditDraft,
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
  readonly command: Extract<ProjectCommand, { kind: 'member.bulk.apply' }>;
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

const hasChanges = (changes: MemberBulkChanges): boolean => Object.keys(changes).length > 0;

/**
 * Agrupa los miembros por el conjunto exacto de cambios que reciben. Con una
 * selección homogénea sale un solo grupo; con tipos mezclados salen tantos como
 * combinaciones de elegibilidad haya, y ninguno escribe de más.
 */
export const prepareBulkMemberEdit = (
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
    const selected = aggregate.properties.some((property) => property.entity === 'member'
      && property.compatibility.compatible.concat(property.compatibility.incompatible.map((entry) => entry.target))
        .some((candidate) => candidate.kind === 'member' && candidate.id === member.id));
    if (!selected) continue;

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

  const entries: MemberBulkEntry[] = [...groups.values()].map((group) => ({
    memberIds: group.memberIds,
    changes: group.changes,
  }));

  return {
    command: {
      kind: 'member.bulk.apply',
      description,
      entries,
      sourceSnapshot: projectCommandSnapshot(project),
    },
    affected,
    skipped,
  };
};
