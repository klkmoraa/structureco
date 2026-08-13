import type { MemberModel, MemberPropertyOrigin, MemberType, NodeModel, SupportType } from '../../types';
import type {
  BulkIncompatibilityReason,
  BulkMemberPropertyDescriptor,
  BulkNodePropertyDescriptor,
  BulkPropertyDescriptor,
} from './bulkEditTypes';

/**
 * Registro de las propiedades que la edición múltiple sabe leer.
 *
 * Cada entrada declara de forma explícita quién la admite y por qué la rechaza.
 * No hay reglas implícitas: si un miembro rígido no tiene rigidez editable, la
 * agregación lo dice con un motivo, no lo omite en silencio.
 */

/**
 * Las opciones de un `enum` se declaran contra la unión del dominio: si `types.ts`
 * gana un tipo de apoyo o de miembro, falta una clave aquí y el build se rompe en
 * vez de ofrecer una lista incompleta en silencio.
 */
const optionsOf = <T extends string>(values: Record<T, true>): readonly T[] =>
  Object.keys(values) as T[];

const MEMBER_TYPES = optionsOf<MemberType>({ frame: true, truss: true, rigid: true });
const SUPPORT_TYPES = optionsOf<SupportType>({ none: true, pin: true, roller: true, fixed: true, custom: true });
const PROPERTY_ORIGINS = optionsOf<MemberPropertyOrigin>({ catalog: true, custom: true, imported: true, legacy: true });
const BEAM_THEORIES = optionsOf<NonNullable<MemberModel['beamTheory']>>({ 'euler-bernoulli': true, timoshenko: true });

/** Un miembro rígido no expone rigidez: su comportamiento no procede de E, A ni I. */
const notRigid = (member: MemberModel): BulkIncompatibilityReason | undefined =>
  member.type === 'rigid' ? 'member-type' : undefined;

/** Liberaciones, semirrigidez, zonas rígidas y teoría de viga son propias del pórtico. */
const frameOnly = (member: MemberModel): BulkIncompatibilityReason | undefined =>
  member.type === 'frame' ? undefined : 'member-type';

const customSupportOnly = (node: NodeModel): BulkIncompatibilityReason | undefined =>
  node.support.type === 'custom' ? undefined : 'support-type';

const rollerOnly = (node: NodeModel): BulkIncompatibilityReason | undefined =>
  node.support.type === 'roller' ? undefined : 'support-type';

const memberProperties: readonly BulkMemberPropertyDescriptor[] = [
  {
    id: 'member.type', entity: 'member', kind: 'enum', editable: true, clearable: false,
    options: MEMBER_TYPES,
    read: (member) => member.type,
  },
  {
    id: 'member.materialId', entity: 'member', kind: 'material', editable: true, clearable: false,
    ineligible: notRigid,
    read: (member) => member.materialId,
  },
  {
    id: 'member.materialOrigin', entity: 'member', kind: 'enum', editable: false, clearable: false,
    options: PROPERTY_ORIGINS,
    ineligible: notRigid,
    read: (member) => member.materialOrigin,
  },
  {
    id: 'member.sectionId', entity: 'member', kind: 'section', editable: true, clearable: false,
    ineligible: notRigid,
    read: (member) => member.sectionId,
  },
  {
    id: 'member.sectionOrigin', entity: 'member', kind: 'enum', editable: false, clearable: false,
    options: PROPERTY_ORIGINS,
    ineligible: notRigid,
    read: (member) => member.sectionOrigin,
  },
  {
    id: 'member.E', entity: 'member', kind: 'number', editable: true, clearable: false,
    quantity: 'elasticModulus', ineligible: notRigid,
    read: (member) => member.E,
  },
  {
    id: 'member.A', entity: 'member', kind: 'number', editable: true, clearable: false,
    quantity: 'area', ineligible: notRigid,
    read: (member) => member.A,
  },
  {
    id: 'member.I', entity: 'member', kind: 'number', editable: true, clearable: false,
    quantity: 'inertia', ineligible: notRigid,
    read: (member) => member.I,
  },
  {
    id: 'member.G', entity: 'member', kind: 'number', editable: true, clearable: true,
    quantity: 'elasticModulus', ineligible: notRigid,
    read: (member) => member.G,
  },
  {
    id: 'member.shearArea', entity: 'member', kind: 'number', editable: true, clearable: true,
    quantity: 'area', ineligible: frameOnly,
    read: (member) => member.shearArea,
  },
  {
    id: 'member.density', entity: 'member', kind: 'number', editable: true, clearable: true,
    quantity: 'density', ineligible: notRigid,
    read: (member) => member.density,
  },
  {
    id: 'member.beamTheory', entity: 'member', kind: 'enum', editable: true, clearable: true,
    options: BEAM_THEORIES, ineligible: frameOnly,
    read: (member) => member.beamTheory,
  },
  {
    id: 'member.releases.iMoment', entity: 'member', kind: 'boolean', editable: true, clearable: true,
    ineligible: frameOnly,
    read: (member) => member.releases?.iMoment,
  },
  {
    id: 'member.releases.jMoment', entity: 'member', kind: 'boolean', editable: true, clearable: true,
    ineligible: frameOnly,
    read: (member) => member.releases?.jMoment,
  },
  {
    id: 'member.rotationalSpringI', entity: 'member', kind: 'number', editable: true, clearable: true,
    quantity: 'rotationalStiffness', ineligible: frameOnly,
    read: (member) => member.rotationalSpringI,
  },
  {
    id: 'member.rotationalSpringJ', entity: 'member', kind: 'number', editable: true, clearable: true,
    quantity: 'rotationalStiffness', ineligible: frameOnly,
    read: (member) => member.rotationalSpringJ,
  },
  {
    id: 'member.rigidOffsetI', entity: 'member', kind: 'number', editable: true, clearable: true,
    quantity: 'length', ineligible: frameOnly,
    read: (member) => member.rigidOffsetI,
  },
  {
    id: 'member.rigidOffsetJ', entity: 'member', kind: 'number', editable: true, clearable: true,
    quantity: 'length', ineligible: frameOnly,
    read: (member) => member.rigidOffsetJ,
  },
];

const nodeProperties: readonly BulkNodePropertyDescriptor[] = [
  {
    id: 'node.support.type', entity: 'node', kind: 'enum', editable: true, clearable: false,
    options: SUPPORT_TYPES,
    read: (node) => node.support.type,
  },
  {
    id: 'node.support.angleDeg', entity: 'node', kind: 'number', editable: true, clearable: true,
    unit: '°', ineligible: rollerOnly,
    read: (node) => node.support.angleDeg,
  },
  {
    id: 'node.support.restrainX', entity: 'node', kind: 'boolean', editable: true, clearable: true,
    ineligible: customSupportOnly,
    read: (node) => node.support.restrainX,
  },
  {
    id: 'node.support.restrainY', entity: 'node', kind: 'boolean', editable: true, clearable: true,
    ineligible: customSupportOnly,
    read: (node) => node.support.restrainY,
  },
  {
    id: 'node.support.restrainR', entity: 'node', kind: 'boolean', editable: true, clearable: true,
    ineligible: customSupportOnly,
    read: (node) => node.support.restrainR,
  },
  {
    id: 'node.internalHinge', entity: 'node', kind: 'boolean', editable: true, clearable: true,
    read: (node) => node.internalHinge,
  },
];

/** Orden de lectura del panel: primero los miembros, después los nudos. */
export const bulkPropertyDescriptors: readonly BulkPropertyDescriptor[] = [
  ...memberProperties,
  ...nodeProperties,
];
