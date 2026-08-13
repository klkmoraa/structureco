import type { Language } from '../../i18n/catalogs';

/**
 * Copia de la edición múltiple.
 *
 * Vive junto a la funcionalidad y no en el catálogo global por dos razones de
 * esta fase: el panel todavía no está integrado en el Inspector, y `catalogs.ts`
 * lo está editando en paralelo otra tarea, así que añadir ~120 claves ahí sería
 * un conflicto seguro. Al integrarlo estas claves deben migrar al catálogo
 * global —que es donde vive el texto de `modelDoctorCopy`— y este módulo
 * desaparecer.
 *
 * La interpolación es idéntica a la del catálogo global (`{nombre}`) y una
 * prueba comprueba que ambos idiomas declaran las mismas claves y marcadores.
 * El vocabulario se toma del Inspector para no inventar un segundo léxico.
 */

export const bulkEditEs = {
  'panel.label': 'Edición múltiple',
  'panel.tabs': 'Vistas de la edición múltiple',
  'tab.properties': 'Propiedades',
  'tab.section': 'Vista sección',
  'panel.advanced': 'Más propiedades',

  'summary.label': 'Resumen de la selección',
  'summary.members': '{count} miembros seleccionados',
  'summary.membersOne': '1 miembro seleccionado',
  'summary.nodes': '{count} nudos seleccionados',
  'summary.nodesOne': '1 nudo seleccionado',
  'summary.objects': '{count} objetos seleccionados',
  'summary.objectsOne': '1 objeto seleccionado',
  'summary.empty': 'Sin selección',
  'summary.emptyHelp': 'Selecciona varios objetos del modelo para prepararlos juntos.',
  'summary.compatible': '{count} compatibles',
  'summary.compatibleOne': '1 compatible',
  'summary.incompatible': '{count} incompatibles',
  'summary.memberTypes': '{frame} pórtico · {truss} armadura · {rigid} rígido',

  'value.mixed': 'Varios',
  'value.empty': 'Sin valor',
  'value.unavailable': '—',
  'value.true': 'Sí',
  'value.false': 'No',

  'field.current': 'Actual',
  'field.untouched': 'Sin cambios',
  'field.clear': 'Borrar valor',
  'field.discard': 'Descartar',
  'field.revert': 'Descartar el cambio preparado de {property}',
  'field.compatibility': '{compatible} de {selected} compatibles',
  'field.numberHint': 'Deja el campo vacío para no cambiar esta propiedad.',
  'field.numberInvalid': 'Escribe un número válido o deja el campo vacío.',
  'field.booleanGroup': '{property}: valor preparado',

  'reason.entity-kind': 'No aplica a este tipo de objeto',
  'reason.member-type': 'No aplica a este tipo de miembro',
  'reason.support-type': 'No aplica a esta configuración de apoyo',

  'changes.title': 'Cambios preparados',
  'changes.none': 'Ningún cambio preparado',
  'changes.count': '{count} cambios preparados',
  'changes.countOne': '1 cambio preparado',
  'changes.unchanged': 'Sin cambios',
  'changes.affected': '{count} objetos afectados',
  'changes.affectedOne': '1 objeto afectado',
  'changes.to': 'pasa a',
  'changes.unchangedCount': '{count} propiedades sin cambios',
  'changes.unchangedCountOne': '1 propiedad sin cambios',
  'changes.skipped': '{count} objetos incompatibles quedan fuera',
  'changes.skippedOne': '1 objeto incompatible queda fuera',
  'changes.clear': 'Se borrará el valor',

  'action.cancel': 'Cancelar',
  'action.apply': 'Aplicar a {count}',
  'action.applyEmpty': 'Aplicar',
  'action.applyHint': 'Prepara al menos un cambio para poder aplicarlo.',
  'action.notWired': 'Esta fase sólo emite la intención preparada; todavía no modifica el modelo.',

  'preview.label': 'Vista previa de la sección',
  'preview.current': 'Actual',
  'preview.target': 'Objetivo',
  'preview.unchanged': 'Sin cambio preparado',
  'preview.mixed': 'Varios',
  'preview.mixedHint': 'La selección no comparte una sola sección',
  'preview.equivalent': 'Rectangular equivalente',
  'preview.equivalentHint': 'Deducida de A e I: el modelo no guarda la forma',
  'preview.none': 'Sin sección',
  'preview.noneHint': 'Ningún miembro seleccionado admite sección',
  'preview.shape': 'Sección {name}, canto {depth} {unit}, ancho {width} {unit}',

  'property.member.type': 'Tipo',
  'property.member.materialId': 'Material',
  'property.member.materialOrigin': 'Origen del material',
  'property.member.sectionId': 'Sección',
  'property.member.sectionOrigin': 'Origen de la sección',
  'property.member.E': 'E',
  'property.member.A': 'A',
  'property.member.I': 'I',
  'property.member.G': 'G',
  'property.member.shearArea': 'Área de cortante',
  'property.member.density': 'Densidad',
  'property.member.beamTheory': 'Teoría de viga',
  'property.member.releases.iMoment': 'Liberación de momento en i',
  'property.member.releases.jMoment': 'Liberación de momento en j',
  'property.member.rotationalSpringI': 'Muelle rotacional en i',
  'property.member.rotationalSpringJ': 'Muelle rotacional en j',
  'property.member.rigidOffsetI': 'Zona rígida en i',
  'property.member.rigidOffsetJ': 'Zona rígida en j',
  'property.node.support.type': 'Apoyo',
  'property.node.support.angleDeg': 'Normal del apoyo',
  'property.node.support.restrainX': 'Restricción Ux',
  'property.node.support.restrainY': 'Restricción Uy',
  'property.node.support.restrainR': 'Restricción Rz',
  'property.node.internalHinge': 'Articulación interna',

  'option.member.type.frame': 'Pórtico / viga',
  'option.member.type.truss': 'Barra de armadura',
  'option.member.type.rigid': 'Vínculo rígido',
  'option.member.beamTheory.euler-bernoulli': 'Euler-Bernoulli',
  'option.member.beamTheory.timoshenko': 'Timoshenko',
  'option.member.materialOrigin.catalog': 'Catálogo',
  'option.member.materialOrigin.custom': 'Personalizado',
  'option.member.materialOrigin.imported': 'Importado',
  'option.member.materialOrigin.legacy': 'Legacy / sin especificar',
  'option.member.sectionOrigin.catalog': 'Catálogo',
  'option.member.sectionOrigin.custom': 'Personalizado',
  'option.member.sectionOrigin.imported': 'Importado',
  'option.member.sectionOrigin.legacy': 'Legacy / sin especificar',
  'option.node.support.type.none': 'Libre',
  'option.node.support.type.pin': 'Articulado',
  'option.node.support.type.roller': 'Rodillo orientable',
  'option.node.support.type.fixed': 'Empotramiento',
  'option.node.support.type.custom': 'Personalizado',
};

export type BulkEditCopyKey = keyof typeof bulkEditEs;

const bulkEditEn: Record<BulkEditCopyKey, string> = {
  'panel.label': 'Bulk editing',
  'panel.tabs': 'Bulk editing views',
  'tab.properties': 'Properties',
  'tab.section': 'Section view',
  'panel.advanced': 'More properties',

  'summary.label': 'Selection summary',
  'summary.members': '{count} members selected',
  'summary.membersOne': '1 member selected',
  'summary.nodes': '{count} nodes selected',
  'summary.nodesOne': '1 node selected',
  'summary.objects': '{count} objects selected',
  'summary.objectsOne': '1 object selected',
  'summary.empty': 'Nothing selected',
  'summary.emptyHelp': 'Select several objects in the model to prepare them together.',
  'summary.compatible': '{count} compatible',
  'summary.compatibleOne': '1 compatible',
  'summary.incompatible': '{count} incompatible',
  'summary.memberTypes': '{frame} frame · {truss} truss · {rigid} rigid',

  'value.mixed': 'Mixed',
  'value.empty': 'No value',
  'value.unavailable': '—',
  'value.true': 'Yes',
  'value.false': 'No',

  'field.current': 'Current',
  'field.untouched': 'No change',
  'field.clear': 'Clear value',
  'field.discard': 'Discard',
  'field.revert': 'Discard the staged change of {property}',
  'field.compatibility': '{compatible} of {selected} compatible',
  'field.numberHint': 'Leave the field empty to keep this property unchanged.',
  'field.numberInvalid': 'Enter a valid number or leave the field empty.',
  'field.booleanGroup': '{property}: staged value',

  'reason.entity-kind': 'Does not apply to this kind of object',
  'reason.member-type': 'Does not apply to this member type',
  'reason.support-type': 'Does not apply to this support configuration',

  'changes.title': 'Staged changes',
  'changes.none': 'No staged changes',
  'changes.count': '{count} staged changes',
  'changes.countOne': '1 staged change',
  'changes.unchanged': 'No change',
  'changes.affected': '{count} objects affected',
  'changes.affectedOne': '1 object affected',
  'changes.to': 'becomes',
  'changes.unchangedCount': '{count} properties unchanged',
  'changes.unchangedCountOne': '1 property unchanged',
  'changes.skipped': '{count} incompatible objects left out',
  'changes.skippedOne': '1 incompatible object left out',
  'changes.clear': 'The value will be cleared',

  'action.cancel': 'Cancel',
  'action.apply': 'Apply to {count}',
  'action.applyEmpty': 'Apply',
  'action.applyHint': 'Stage at least one change before applying.',
  'action.notWired': 'This phase only emits the prepared intent; it does not modify the model yet.',

  'preview.label': 'Section preview',
  'preview.current': 'Current',
  'preview.target': 'Target',
  'preview.unchanged': 'No staged change',
  'preview.mixed': 'Multiple',
  'preview.mixedHint': 'The selection does not share a single section',
  'preview.equivalent': 'Equivalent rectangle',
  'preview.equivalentHint': 'Derived from A and I: the model does not store the shape',
  'preview.none': 'No section',
  'preview.noneHint': 'No selected member accepts a section',
  'preview.shape': 'Section {name}, depth {depth} {unit}, width {width} {unit}',

  'property.member.type': 'Type',
  'property.member.materialId': 'Material',
  'property.member.materialOrigin': 'Material origin',
  'property.member.sectionId': 'Section',
  'property.member.sectionOrigin': 'Section origin',
  'property.member.E': 'E',
  'property.member.A': 'A',
  'property.member.I': 'I',
  'property.member.G': 'G',
  'property.member.shearArea': 'Shear area',
  'property.member.density': 'Density',
  'property.member.beamTheory': 'Beam theory',
  'property.member.releases.iMoment': 'Moment release at i',
  'property.member.releases.jMoment': 'Moment release at j',
  'property.member.rotationalSpringI': 'Rotational spring at i',
  'property.member.rotationalSpringJ': 'Rotational spring at j',
  'property.member.rigidOffsetI': 'Rigid zone at i',
  'property.member.rigidOffsetJ': 'Rigid zone at j',
  'property.node.support.type': 'Support',
  'property.node.support.angleDeg': 'Support normal',
  'property.node.support.restrainX': 'Ux restraint',
  'property.node.support.restrainY': 'Uy restraint',
  'property.node.support.restrainR': 'Rz restraint',
  'property.node.internalHinge': 'Internal hinge',

  'option.member.type.frame': 'Frame / beam',
  'option.member.type.truss': 'Truss bar',
  'option.member.type.rigid': 'Rigid link',
  'option.member.beamTheory.euler-bernoulli': 'Euler-Bernoulli',
  'option.member.beamTheory.timoshenko': 'Timoshenko',
  'option.member.materialOrigin.catalog': 'Catalog',
  'option.member.materialOrigin.custom': 'Custom',
  'option.member.materialOrigin.imported': 'Imported',
  'option.member.materialOrigin.legacy': 'Legacy / unspecified',
  'option.member.sectionOrigin.catalog': 'Catalog',
  'option.member.sectionOrigin.custom': 'Custom',
  'option.member.sectionOrigin.imported': 'Imported',
  'option.member.sectionOrigin.legacy': 'Legacy / unspecified',
  'option.node.support.type.none': 'Free',
  'option.node.support.type.pin': 'Pinned',
  'option.node.support.type.roller': 'Oriented roller',
  'option.node.support.type.fixed': 'Fixed',
  'option.node.support.type.custom': 'Custom',
};

export const bulkEditCatalogs: Record<Language, Record<BulkEditCopyKey, string>> = {
  es: bulkEditEs,
  en: bulkEditEn,
};

export type BulkEditTranslate = (
  key: BulkEditCopyKey,
  variables?: Record<string, string | number>,
) => string;

export const translateBulkEdit = (
  language: Language,
  key: BulkEditCopyKey,
  variables?: Record<string, string | number>,
): string => {
  // Una clave desconocida devuelve la clave, no `undefined`: un hueco mudo en
  // la interfaz es más difícil de detectar que un texto que grita el fallo.
  const template = bulkEditCatalogs[language][key] ?? bulkEditEs[key] ?? key;
  if (!variables) return template;
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (match, name: string) =>
    Object.hasOwn(variables, name) ? String(variables[name]) : match);
};

export const createBulkEditTranslator = (language: Language): BulkEditTranslate =>
  (key, variables) => translateBulkEdit(language, key, variables);
