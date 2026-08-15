/**
 * es-MX / en-US.
 *
 * El idioma es un eje del harness porque el texto largo rompe layouts, y porque
 * la voz de marca es una de las cosas que CRI-11 tiene que poder juzgar. Las dos
 * lenguas se escriben aquí completas: sin `??` de respaldo, para que un hueco se
 * vea en pantalla en vez de esconderse tras el español.
 *
 * REGLAS DE COPY QUE ESTE ARCHIVO NO PUEDE ROMPER
 * ---------------------------------------------------------------------------
 *  · `success ≠ reliable ≠ safe`. Ninguna cadena puede decir que la estructura
 *    es segura, ni convertir un cálculo terminado en una garantía.
 *  · Nada de claims genéricos de calidad («analizamos estructuras con calidad»).
 *    El Brandbook §13 pide precisión antes que persuasión.
 *  · Todo dato del prototipo se rotula como fixture allí donde se lee.
 *
 * El chrome del harness (el panel de laboratorio) va sólo en español: es el
 * instrumento del investigador, no el producto. Lo que se juzga es el producto.
 */

export type Locale = 'es-MX' | 'en-US';

/**
 * Direcciones verbales a comparar. Ninguna está aprobada: son hipótesis que
 * CRI-11 debe poder poner una junto a otra. La opción D es la línea vigente que
 * el encargo pide retirar, y está aquí para verse al lado de las demás.
 */
export type VoiceId = 'A' | 'B' | 'C' | 'D';

export const VOICES: { id: VoiceId; note: string }[] = [
  { id: 'A', note: 'Instrumental · «Modela. Analiza. Entiende.»' },
  { id: 'B', note: 'Contextual · «Tu estructura, siempre en contexto.»' },
  { id: 'C', note: 'Técnica · «Ingeniería estructural, más clara.»' },
  { id: 'D', note: 'Vigente a retirar · claim genérico de calidad' },
];

export const VOICE_COPY: Record<VoiceId, Record<Locale, { hero: string; sub: string }>> = {
  A: {
    'es-MX': {
      hero: 'Modela. Analiza. Entiende.',
      sub: 'Del modelo a los resultados, sin perder el contexto de la estructura.',
    },
    'en-US': {
      hero: 'Model. Analyze. Understand.',
      sub: 'From the model to the results, without losing the structure’s context.',
    },
  },
  B: {
    'es-MX': {
      hero: 'Tu estructura, siempre en contexto.',
      sub: 'Modela, revisa resultados y vuelve al punto exacto que necesitas.',
    },
    'en-US': {
      hero: 'Your structure, always in context.',
      sub: 'Model, review results and return to the exact point you need.',
    },
  },
  C: {
    'es-MX': {
      hero: 'Ingeniería estructural, más clara.',
      sub: 'Modelo, análisis y evidencia en un mismo espacio de trabajo.',
    },
    'en-US': {
      hero: 'Structural engineering, made clearer.',
      sub: 'Model, analysis and evidence in a single workspace.',
    },
  },
  D: {
    'es-MX': {
      hero: 'Analizamos estructuras con calidad.',
      sub: 'La línea vigente. Genérica, no demostrable y sin relación con lo que el producto hace.',
    },
    'en-US': {
      hero: 'We analyze structures with quality.',
      sub: 'The current line. Generic, undemonstrable and unrelated to what the product does.',
    },
  },
};

const es = {
  'welcome.eyebrow': 'structureCo',
  'welcome.continue': 'Continuar proyecto',
  'welcome.new': 'Nuevo proyecto',
  'welcome.import': 'Abrir o importar',
  'welcome.recent': 'Proyectos recientes',
  'welcome.recentEmpty': 'Aún no hay proyectos recientes.',
  'welcome.secondary': 'Descubrimiento secundario',
  'welcome.aula': 'Aprender con un ejemplo',
  'welcome.space3d': 'Space 3D',
  'welcome.space3dTag': 'Experimental',
  'welcome.lastOpened': 'Abierto por última vez',

  'command.changeSection': 'Cambiar sección',
  'command.locate': 'Localizar',
  'command.solve': 'Resolver',
  'command.commit': 'Aplicar cambio',
  'command.cancel': 'Cancelar',
  'command.back': 'Volver al lienzo',
  'command.clearSelection': 'Quitar selección',

  'evidence.none': 'Sin evidencia',
  'evidence.N': 'Axial N',
  'evidence.V': 'Cortante V',
  'evidence.M': 'Momento M',
  'evidence.deformed': 'Deformada',

  'surface.view': 'Vista',
  'surface.detail': 'Detalle',
  'surface.dense': 'Datasheet',
  'surface.close': 'Cerrar',
  'surface.suspended': 'se suspendió con su estado; sigue disponible.',
  'surface.restored': 'volvió con su estado.',
  'surface.peek': 'quedó reducida para no tapar el objeto.',
  'surface.peekReturn': 'Volver a la tabla',

  'state.label': 'Estado del análisis',
  'state.ready': 'Sin resolver',
  'state.calculating': 'Calculando…',
  'state.current': 'Resultados vigentes',
  'state.stale': 'Resultados obsoletos',
  'state.limited': 'Precisión limitada',
  'state.unreliable': 'Requiere revisión',
  'state.failed': 'Sin resultados utilizables',
  'state.offline': 'Sin conexión',
  'state.recovery': 'Copia de recuperación',

  'state.ready.detail': 'El modelo no se ha resuelto todavía.',
  'state.calculating.detail': 'El cálculo está en curso. Nada se ha afirmado aún.',
  'state.current.detail': 'Estos resultados corresponden al modelo actual.',
  'state.stale.detail': 'El modelo cambió. Vuelve a resolver para actualizar los resultados.',
  'state.limited.detail': 'El cálculo terminó, pero su precisión numérica está limitada. Revisa la causa antes de leer los valores.',
  'state.unreliable.detail': 'Hay números, pero no deben leerse como un resultado ordinario. Revisa la causa.',
  'state.failed.detail': 'El cálculo no produjo resultados utilizables.',
  'state.offline.detail': 'Sin conexión. El trabajo sigue siendo local y no se ha perdido nada.',
  'state.recovery.detail': 'Existe una copia de recuperación de este proyecto. Ninguna versión se descarta sola.',

  'state.cause': 'Ver la causa',
  'state.causeLabel': 'Comprobación gobernante',
  'state.notSafety': 'Éxito no es fiabilidad, y fiabilidad no es seguridad. Estos valores no son una verificación normativa.',
  'state.staleAction': 'Volver a resolver',
  'state.recoveryAction': 'Revisar copias',

  'detail.title': 'Detalle',
  'detail.empty': 'Selecciona un nodo, miembro, apoyo o carga para ver sus acciones.',
  'detail.identity': 'Identidad',
  'detail.geometry': 'Geometría',
  'detail.properties': 'Propiedades',
  'detail.results': 'Resultado del objeto',
  'detail.provenance': 'Procedencia',
  'detail.section': 'Sección',
  'detail.material': 'Material',
  'detail.type': 'Tipo',
  'detail.length': 'Longitud',
  'detail.nodes': 'Nodos',
  'detail.showAll': 'Mostrar todas las propiedades',
  'detail.showLess': 'Mostrar sólo lo esencial',
  'detail.preview': 'Vista previa · sin aplicar',
  'detail.previewHint': 'El cambio aún no se ha aplicado al modelo.',
  'detail.noResult': 'Sin resultado vigente para este objeto.',
  'detail.momentMax': 'Momento máximo',
  'detail.shearMax': 'Cortante máximo',
  'detail.axial': 'Axial',
  'detail.deflectionMax': 'Flecha máxima',
  'detail.at': 'en',
  'detail.end.i': 'Extremo i',
  'detail.end.j': 'Extremo j',

  'dense.title': 'Datasheet',
  'dense.search': 'Buscar por identificador',
  'dense.searchPlaceholder': 'M12, N7…',
  'dense.rows': 'filas',
  'dense.onlySelection': 'Sólo la selección',
  'dense.column.id': 'ID',
  'dense.column.type': 'Tipo',
  'dense.column.nodes': 'Nodos',
  'dense.column.section': 'Sección',
  'dense.column.material': 'Material',
  'dense.column.length': 'Longitud',
  'dense.column.moment': 'M máx.',
  'dense.column.deflection': 'Flecha máx.',
  'dense.noResults': 'Ningún objeto coincide.',
  'dense.locateHint': 'Localizar deja esta tabla reducida, no la cierra.',

  'view.title': 'Vista del lienzo',
  'view.evidence': 'Evidencia sobre el modelo',
  'view.evidenceLocked': 'La evidencia necesita un resultado vigente.',
  'view.layers': 'Capas',
  'view.layer.grid': 'Retícula',
  'view.layer.loads': 'Cargas',
  'view.layer.supports': 'Apoyos',
  'view.layer.labels': 'Etiquetas',

  'toolrail.select': 'Seleccionar',
  'toolrail.node': 'Nodo',
  'toolrail.member': 'Miembro',
  'toolrail.support': 'Apoyo',
  'toolrail.load': 'Carga',
  'toolrail.phaseB': 'Herramienta declarada; su edición llega en Fase B.',

  'contextual.title': 'Acciones de',
  'contextual.more': 'Más',

  'topbar.project': 'Proyecto',
  'topbar.solve': 'Resolver',
  'topbar.units': 'kN · m',
  'topbar.saved': 'Guardado localmente',

  'canvas.selectHint': 'Selecciona un objeto del modelo.',
  'canvas.keyboardHint': 'Tab recorre los objetos; Enter selecciona.',
  'canvas.fixture': 'Fixture',
  'canvas.fixtureFull': 'Modelo y resultados de fixture · no provienen del solver',

  'mode.essential': 'Esencial',
  'mode.complete': 'Completa',

  'a11y.announcements': 'Anuncios del espacio de trabajo',
  'a11y.selected': 'seleccionado',
} as const;

export type TranslationKey = keyof typeof es;

const en: Record<TranslationKey, string> = {
  'welcome.eyebrow': 'structureCo',
  'welcome.continue': 'Continue project',
  'welcome.new': 'New project',
  'welcome.import': 'Open or import',
  'welcome.recent': 'Recent projects',
  'welcome.recentEmpty': 'No recent projects yet.',
  'welcome.secondary': 'Secondary discovery',
  'welcome.aula': 'Learn with an example',
  'welcome.space3d': 'Space 3D',
  'welcome.space3dTag': 'Experimental',
  'welcome.lastOpened': 'Last opened',

  'command.changeSection': 'Change section',
  'command.locate': 'Locate',
  'command.solve': 'Solve',
  'command.commit': 'Apply change',
  'command.cancel': 'Cancel',
  'command.back': 'Back to canvas',
  'command.clearSelection': 'Clear selection',

  'evidence.none': 'No evidence',
  'evidence.N': 'Axial N',
  'evidence.V': 'Shear V',
  'evidence.M': 'Moment M',
  'evidence.deformed': 'Deflected shape',

  'surface.view': 'View',
  'surface.detail': 'Detail',
  'surface.dense': 'Datasheet',
  'surface.close': 'Close',
  'surface.suspended': 'was suspended with its state; it is still available.',
  'surface.restored': 'came back with its state.',
  'surface.peek': 'was reduced so it would not cover the object.',
  'surface.peekReturn': 'Back to the table',

  'state.label': 'Analysis state',
  'state.ready': 'Not solved',
  'state.calculating': 'Calculating…',
  'state.current': 'Current results',
  'state.stale': 'Stale results',
  'state.limited': 'Limited precision',
  'state.unreliable': 'Needs review',
  'state.failed': 'No usable results',
  'state.offline': 'Offline',
  'state.recovery': 'Recovery copy',

  'state.ready.detail': 'The model has not been solved yet.',
  'state.calculating.detail': 'The run is in progress. Nothing has been asserted yet.',
  'state.current.detail': 'These results correspond to the current model.',
  'state.stale.detail': 'The model changed. Solve again to refresh the results.',
  'state.limited.detail': 'The run finished, but its numerical precision is limited. Review the cause before reading the values.',
  'state.unreliable.detail': 'Numbers exist, but they must not be read as an ordinary result. Review the cause.',
  'state.failed.detail': 'The run produced no usable results.',
  'state.offline.detail': 'Offline. The work stays local and nothing has been lost.',
  'state.recovery.detail': 'A recovery copy of this project exists. No version is discarded on its own.',

  'state.cause': 'See the cause',
  'state.causeLabel': 'Governing check',
  'state.notSafety': 'Success is not reliability, and reliability is not safety. These values are not a code check.',
  'state.staleAction': 'Solve again',
  'state.recoveryAction': 'Review copies',

  'detail.title': 'Detail',
  'detail.empty': 'Select a node, member, support or load to see its actions.',
  'detail.identity': 'Identity',
  'detail.geometry': 'Geometry',
  'detail.properties': 'Properties',
  'detail.results': 'Object result',
  'detail.provenance': 'Provenance',
  'detail.section': 'Section',
  'detail.material': 'Material',
  'detail.type': 'Type',
  'detail.length': 'Length',
  'detail.nodes': 'Nodes',
  'detail.showAll': 'Show every property',
  'detail.showLess': 'Show only the essentials',
  'detail.preview': 'Preview · not applied',
  'detail.previewHint': 'The change has not been applied to the model yet.',
  'detail.noResult': 'No current result for this object.',
  'detail.momentMax': 'Maximum moment',
  'detail.shearMax': 'Maximum shear',
  'detail.axial': 'Axial',
  'detail.deflectionMax': 'Maximum deflection',
  'detail.at': 'at',
  'detail.end.i': 'End i',
  'detail.end.j': 'End j',

  'dense.title': 'Datasheet',
  'dense.search': 'Search by identifier',
  'dense.searchPlaceholder': 'M12, N7…',
  'dense.rows': 'rows',
  'dense.onlySelection': 'Selection only',
  'dense.column.id': 'ID',
  'dense.column.type': 'Type',
  'dense.column.nodes': 'Nodes',
  'dense.column.section': 'Section',
  'dense.column.material': 'Material',
  'dense.column.length': 'Length',
  'dense.column.moment': 'Max M',
  'dense.column.deflection': 'Max deflection',
  'dense.noResults': 'No object matches.',
  'dense.locateHint': 'Locating leaves this table reduced; it does not close it.',

  'view.title': 'Canvas view',
  'view.evidence': 'Evidence over the model',
  'view.evidenceLocked': 'Evidence needs a current result.',
  'view.layers': 'Layers',
  'view.layer.grid': 'Grid',
  'view.layer.loads': 'Loads',
  'view.layer.supports': 'Supports',
  'view.layer.labels': 'Labels',

  'toolrail.select': 'Select',
  'toolrail.node': 'Node',
  'toolrail.member': 'Member',
  'toolrail.support': 'Support',
  'toolrail.load': 'Load',
  'toolrail.phaseB': 'Declared tool; its editing lands in Phase B.',

  'contextual.title': 'Actions for',
  'contextual.more': 'More',

  'topbar.project': 'Project',
  'topbar.solve': 'Solve',
  'topbar.units': 'kN · m',
  'topbar.saved': 'Saved locally',

  'canvas.selectHint': 'Select an object in the model.',
  'canvas.keyboardHint': 'Tab walks the objects; Enter selects.',
  'canvas.fixture': 'Fixture',
  'canvas.fixtureFull': 'Fixture model and results · not produced by the solver',

  'mode.essential': 'Essential',
  'mode.complete': 'Complete',

  'a11y.announcements': 'Workspace announcements',
  'a11y.selected': 'selected',
};

const DICTIONARIES: Record<Locale, Record<TranslationKey, string>> = { 'es-MX': es, 'en-US': en };

export const translate = (locale: Locale, key: TranslationKey): string => DICTIONARIES[locale][key];

export type Translate = (key: TranslationKey) => string;

export const translatorFor = (locale: Locale): Translate => (key) => translate(locale, key);
