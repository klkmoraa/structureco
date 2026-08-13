import type { UnitQuantity } from '../../engine/units';
import type { MemberModel, MemberType, NodeModel } from '../../types';

/**
 * Contratos de la edición múltiple (fase de fundamentos).
 *
 * El objetivo de estos tipos es que ningún estado ambiguo pueda representarse:
 * `undefined` significa exactamente «esta entidad no guarda un valor», nunca
 * «hay varios valores» ni «no aplica». Esos dos casos tienen su propia etiqueta.
 *
 * Nada aquí muta `ProjectModel`: la fase actual sólo describe la selección y la
 * intención preparada del usuario.
 */

export type BulkEntityKind = 'member' | 'node';

export interface BulkTargetRef {
  kind: BulkEntityKind;
  id: string;
}

/** Entrada de la agregación. Es una copia de sólo lectura de la selección actual. */
export interface BulkSelectionInput {
  members: readonly MemberModel[];
  nodes: readonly NodeModel[];
}

/** Valor primitivo que una propiedad del modelo puede tener. */
export type BulkValue = string | number | boolean | undefined;

/** Valor concreto que el usuario puede fijar; `undefined` sólo se expresa con `clear`. */
export type BulkDefinedValue = Exclude<BulkValue, undefined>;

/**
 * Estado agregado de una propiedad sobre la selección.
 *
 * - `same`: todas las entidades compatibles comparten el valor (incluido `undefined`).
 * - `mixed`: hay más de un valor distinto. Nunca se elige un representante.
 * - `incompatible`: ninguna entidad seleccionada admite la propiedad.
 */
export type AggregatedValue =
  | { state: 'same'; value: BulkValue }
  | { state: 'mixed'; values: readonly BulkValue[] }
  | { state: 'incompatible' };

export type BulkIncompatibilityReason =
  /** La propiedad no existe en este tipo de entidad (una barra frente a un nudo). */
  | 'entity-kind'
  /** El tipo de miembro no admite la propiedad (un rígido no tiene E, A ni I). */
  | 'member-type'
  /** La configuración del apoyo no admite la propiedad (sólo apoyos personalizados). */
  | 'support-type';

export interface BulkIncompatibleTarget {
  target: BulkTargetRef;
  reason: BulkIncompatibilityReason;
}

/** Reparto explícito de la selección: nunca se aplica nada «en silencio». */
export interface BulkCompatibility {
  selected: number;
  compatible: readonly BulkTargetRef[];
  incompatible: readonly BulkIncompatibleTarget[];
}

/** Control con el que la UI presenta la propiedad. */
export type BulkPropertyKind = 'enum' | 'boolean' | 'number' | 'material' | 'section';

export type BulkPropertyId =
  | 'member.type'
  | 'member.materialId'
  | 'member.materialOrigin'
  | 'member.sectionId'
  | 'member.sectionOrigin'
  | 'member.E'
  | 'member.A'
  | 'member.I'
  | 'member.G'
  | 'member.shearArea'
  | 'member.density'
  | 'member.beamTheory'
  | 'member.releases.iMoment'
  | 'member.releases.jMoment'
  | 'member.rotationalSpringI'
  | 'member.rotationalSpringJ'
  | 'member.rigidOffsetI'
  | 'member.rigidOffsetJ'
  | 'node.support.type'
  | 'node.support.angleDeg'
  | 'node.support.restrainX'
  | 'node.support.restrainY'
  | 'node.support.restrainR'
  | 'node.internalHinge';

interface BulkPropertyDescriptorBase {
  id: BulkPropertyId;
  kind: BulkPropertyKind;
  /** Una propiedad derivada se agrega y se muestra, pero el usuario no la fija. */
  editable: boolean;
  /**
   * Admite `clear`. Es más estricto que «opcional en el esquema»: `materialId` y
   * `sectionId` son opcionales y aun así no se borran, porque quitar la identidad
   * dejaría el origen colgando de unos números que ya no la respaldan.
   */
  clearable: boolean;
  /** Magnitud física para convertir a las unidades del proyecto. */
  quantity?: UnitQuantity;
  /** Unidad fija de una magnitud que no depende del sistema (grados, por ejemplo). */
  unit?: string;
  /** Valores admitidos de un `enum`, en el orden en que deben ofrecerse. */
  options?: readonly string[];
}

export interface BulkMemberPropertyDescriptor extends BulkPropertyDescriptorBase {
  entity: 'member';
  ineligible?: (member: MemberModel) => BulkIncompatibilityReason | undefined;
  read: (member: MemberModel) => BulkValue;
}

export interface BulkNodePropertyDescriptor extends BulkPropertyDescriptorBase {
  entity: 'node';
  ineligible?: (node: NodeModel) => BulkIncompatibilityReason | undefined;
  read: (node: NodeModel) => BulkValue;
}

export type BulkPropertyDescriptor = BulkMemberPropertyDescriptor | BulkNodePropertyDescriptor;

export interface BulkPropertyState {
  id: BulkPropertyId;
  entity: BulkEntityKind;
  kind: BulkPropertyKind;
  editable: boolean;
  clearable: boolean;
  quantity?: UnitQuantity;
  unit?: string;
  options?: readonly string[];
  value: AggregatedValue;
  compatibility: BulkCompatibility;
}

export interface BulkSelectionAggregate {
  total: number;
  counts: Record<BulkEntityKind, number>;
  memberTypeCounts: Record<MemberType, number>;
  properties: readonly BulkPropertyState[];
}

/**
 * Cambio que el usuario preparó explícitamente. La ausencia de una entrada es
 * `untouched`: por eso el borrador es parcial y nunca se rellena con el estado
 * completo del formulario.
 *
 * Contrato de las propiedades de catálogo (`materialId`, `sectionId`): un `set`
 * sólo admite un id que exista en el catálogo, así que la fase que lo aplique
 * puede resolver el origen (`catalog`) y las propiedades numéricas asociadas
 * leyéndolas del catálogo, sin inventar procedencia. Por eso una identidad y sus
 * números no pueden prepararse a la vez: `stageBulkChange` retira el otro lado.
 */
export type BulkStagedChange =
  | { kind: 'set'; value: BulkDefinedValue }
  | { kind: 'clear' };

export type BulkChangeIntent = BulkStagedChange | { kind: 'untouched' };

export type BulkEditDraft = Readonly<Partial<Record<BulkPropertyId, BulkStagedChange>>>;

export interface BulkEditIntentEntry {
  property: BulkPropertyId;
  change: BulkStagedChange;
  /** Estado agregado previo, para que el resumen no compare formularios. */
  previous: AggregatedValue;
  compatible: readonly BulkTargetRef[];
  incompatible: readonly BulkIncompatibleTarget[];
}

export interface BulkEditIntent {
  entries: readonly BulkEditIntentEntry[];
  /** Unión de las entidades que algún cambio tocaría. */
  affected: readonly BulkTargetRef[];
  /** Al menos un cambio dejaría fuera a una entidad seleccionada. */
  hasIncompatibleTargets: boolean;
}

export interface BulkChangeSummaryRow {
  property: BulkPropertyId;
  status: 'unchanged' | 'set' | 'clear';
  current: AggregatedValue;
  next?: BulkDefinedValue;
  affected: number;
  skipped: number;
}
