import type { MemberType } from '../../types';
import { bulkPropertyDescriptors } from './bulkEditProperties';
import type {
  AggregatedValue,
  BulkCompatibility,
  BulkEntityKind,
  BulkIncompatibilityReason,
  BulkIncompatibleTarget,
  BulkPropertyDescriptor,
  BulkPropertyId,
  BulkPropertyState,
  BulkSelectionAggregate,
  BulkSelectionInput,
  BulkTargetRef,
  BulkValue,
} from './bulkEditTypes';

/**
 * Agregación pura de una selección múltiple.
 *
 * No depende de React ni del store: recibe las entidades ya resueltas y devuelve
 * el estado agregado de cada propiedad. La misma entrada produce exactamente la
 * misma salida, que es lo que permite probar el contrato sin renderizar nada.
 */

/**
 * Reparte la selección entre las entidades que admiten la propiedad y las que no.
 * El motivo viaja con cada entidad rechazada: la UI no tiene que deducirlo.
 *
 * El descriptor se estrecha una sola vez por tipo de entidad: las entidades del
 * otro tipo entran enteras como `entity-kind` sin volver a comprobar nada.
 */
const resolveCompatibility = (
  descriptor: BulkPropertyDescriptor,
  selection: BulkSelectionInput,
): { compatibility: BulkCompatibility; values: BulkValue[] } => {
  const compatible: BulkTargetRef[] = [];
  const incompatible: BulkIncompatibleTarget[] = [];
  const values: BulkValue[] = [];

  const classify = <Entity extends { id: string }>(
    kind: BulkEntityKind,
    entities: readonly Entity[],
    ineligible: ((entity: Entity) => BulkIncompatibilityReason | undefined) | undefined,
    read: (entity: Entity) => BulkValue,
  ) => {
    for (const entity of entities) {
      const target: BulkTargetRef = { kind, id: entity.id };
      const reason = ineligible?.(entity);
      if (reason) incompatible.push({ target, reason });
      else {
        compatible.push(target);
        values.push(read(entity));
      }
    }
  };

  const reject = (kind: BulkEntityKind, ids: readonly { id: string }[]) => {
    for (const { id } of ids) incompatible.push({ target: { kind, id }, reason: 'entity-kind' });
  };

  // Cada familia se clasifica con su propio descriptor; el resto de la
  // selección entra entera como `entity-kind`, nunca se omite.
  const nodalLoads = selection.nodalLoads ?? [];
  const memberLoads = selection.memberLoads ?? [];
  const families: Record<BulkEntityKind, readonly { id: string }[]> = {
    member: selection.members,
    node: selection.nodes,
    nodalLoad: nodalLoads,
    memberLoad: memberLoads,
  };

  for (const kind of ['member', 'node', 'nodalLoad', 'memberLoad'] as const) {
    if (kind === descriptor.entity) {
      classify(
        kind,
        families[kind],
        descriptor.ineligible as ((entity: { id: string }) => BulkIncompatibilityReason | undefined) | undefined,
        descriptor.read as (entity: { id: string }) => BulkValue,
      );
    } else reject(kind, families[kind]);
  }

  return {
    compatibility: {
      selected: selection.members.length + selection.nodes.length + nodalLoads.length + memberLoads.length,
      compatible,
      incompatible,
    },
    values,
  };
};

/**
 * `same` sólo si todas las entidades compatibles coinciden. `undefined` es un
 * valor legítimo: dos miembros sin densidad comparten valor, no están «mezclados».
 *
 * El `Set` compara con SameValueZero, que sólo difiere de `Object.is` en `NaN`
 * y en `±0`; ninguno de los dos distingue un valor estructural real.
 */
const aggregateValues = (values: readonly BulkValue[]): AggregatedValue => {
  if (values.length === 0) return { state: 'incompatible' };
  const distinct = [...new Set(values)];
  return distinct.length === 1 ? { state: 'same', value: distinct[0] } : { state: 'mixed', values: distinct };
};

/** Los casos de carga son del proyecto, no del descriptor: se inyectan aquí. */
const optionsFor = (
  descriptor: BulkPropertyDescriptor,
  selection: BulkSelectionInput,
): readonly string[] | undefined => (
  descriptor.id === 'nodalLoad.caseId' || descriptor.id === 'memberLoad.caseId'
    ? selection.loadCases ?? []
    : descriptor.options
);

const aggregateProperty = (
  descriptor: BulkPropertyDescriptor,
  selection: BulkSelectionInput,
): BulkPropertyState => {
  const { compatibility, values } = resolveCompatibility(descriptor, selection);
  return {
    id: descriptor.id,
    entity: descriptor.entity,
    kind: descriptor.kind,
    editable: descriptor.editable,
    clearable: descriptor.clearable,
    quantity: descriptor.quantity,
    unit: descriptor.unit,
    options: optionsFor(descriptor, selection),
    value: aggregateValues(values),
    compatibility,
  };
};

const emptyMemberTypeCounts = (): Record<MemberType, number> => ({ frame: 0, truss: 0, rigid: 0 });

export const aggregateBulkSelection = (selection: BulkSelectionInput): BulkSelectionAggregate => {
  const memberTypeCounts = emptyMemberTypeCounts();
  for (const member of selection.members) memberTypeCounts[member.type] += 1;

  const nodalLoads = selection.nodalLoads ?? [];
  const memberLoads = selection.memberLoads ?? [];
  return {
    /*
     * El total es lo que el usuario seleccionó: nudos y miembros. Las cargas
     * llegan colgadas de esa selección, no elegidas una a una, así que contarlas
     * aquí diría «5 objetos seleccionados» cuando se marcaron 3.
     */
    total: selection.members.length + selection.nodes.length,
    counts: {
      member: selection.members.length,
      node: selection.nodes.length,
      nodalLoad: nodalLoads.length,
      memberLoad: memberLoads.length,
    },
    memberTypeCounts,
    properties: bulkPropertyDescriptors.map((descriptor) => aggregateProperty(descriptor, selection)),
  };
};

export const findBulkProperty = (
  aggregate: BulkSelectionAggregate,
  id: BulkPropertyId,
): BulkPropertyState => {
  const state = aggregate.properties.find((property) => property.id === id);
  if (!state) throw new Error(`Unknown bulk property: ${id}`);
  return state;
};

/** Propiedades que la UI puede ofrecer: editables y con al menos un objetivo compatible. */
export const editableBulkProperties = (
  aggregate: BulkSelectionAggregate,
): readonly BulkPropertyState[] => aggregate.properties.filter(
  (property) => property.editable && property.compatibility.compatible.length > 0,
);
