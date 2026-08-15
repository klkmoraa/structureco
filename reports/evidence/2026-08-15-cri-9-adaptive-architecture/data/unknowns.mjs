/**
 * CRI-9 · Unknowns heredados de CRI-8 y nuevos. `status` ∈ RESUELTO | ABIERTO |
 * NO BLOQUEANTE. Lo resuelto trae la cita; lo abierto trae la prueba que falta.
 */

export const UNKNOWNS = [
  {
    id: 'U-01',
    question: 'No hay telemetría: 86 de 122 frecuencias son inferencia, no medida.',
    status: 'ABIERTO',
    effect:
      'Ninguna decisión de este informe se apoya en frecuencia. La presencia se decide por DUEÑO y por PRESUPUESTO, no por uso estimado. '
      + 'Criticidad y frecuencia son dimensiones distintas y aquí manda la criticidad.',
    needed: 'Telemetría local anónima de invocación por superficie, si el propietario la autoriza. Hasta entonces, ninguna cifra de frecuencia puede justificar esconder nada.',
  },
  {
    id: 'U-02',
    question: '¿Cuánto tiempo de sesión transcurre sin selección?',
    status: 'NO BLOQUEANTE',
    effect:
      'Se planteaba como condición para D-02 y ya no lo es: un dock contextual es estrictamente mejor que un panel vacío permanente en '
      + 'todos los viewports medidos, y cuando hay selección el dock está. U-02 afinaría el defecto de `dockIntent`, no la decisión.',
    needed: 'Misma telemetría que U-01.',
  },
  {
    id: 'U-03',
    question: 'Ruta táctil de Repeat (MOD-12).',
    status: 'RESUELTO — no existe',
    effect: 'Confirmado: sólo se activa con la tecla `R` sobre una selección repetible; no está en la paleta ni en «Más». D-07 le da casa en `contextual-actions`.',
    needed: '—',
    evidence: 'StructuralCanvas.tsx:1642-1734; CommandPalette.tsx (sin comando de repetición).',
  },
  {
    id: 'U-04',
    question: '¿El tap táctil acumula o reemplaza en multiselección?',
    status: 'RESUELTO — reemplaza',
    effect:
      'Un tap táctil sobre geometría entra en `startPending`; al confirmarse ejecuta `selectStructuralTarget`, que REEMPLAZA. La acumulación '
      + 'sólo existe con `shiftKey` (puntero) o con marco aditivo — y el marco no tiene ruta táctil. Es decir: hoy NO hay multiselección táctil '
      + 'sobre el lienzo; la única ruta táctil a multiselección es el datasheet. D-07 lo cierra.',
    needed: '—',
    evidence: 'StructuralCanvas.tsx:954-978, :1238-1244, :1400-1412 (`finishSelectionBox` con `box.additive`).',
  },
  {
    id: 'U-05',
    question: '¿Qué gana si las capas del lienzo y los `show*` del Inspector se contradicen?',
    status: 'RESUELTO — ninguno: se componen con AND',
    effect:
      'No hay precedencia porque no hay competencia: la condición de dibujo es una conjunción. `layers.results && layers.labels && '
      + 'resultsAllowed && project.settings.showResultValues && analysis?.success`. Cualquiera de los dos dueños puede apagar; ninguno puede '
      + 'encender solo. Eso es peor que una precedencia mal elegida, y es lo que D-10 corrige.',
    needed: '—',
    evidence: 'StructuralCanvas.tsx:1962, :2403; CanvasResultLayer.tsx:103, :223, :417-427.',
  },
  {
    id: 'U-06',
    question: 'Comportamiento del overlay de resultados cuando el análisis está obsoleto.',
    status: 'RESUELTO — no puede haber evidencia caducada',
    effect:
      'La obsolescencia no es una bandera sobre un resultado vivo: `invalidateAnalysis` pone el análisis a `null`, y `stale` se deriva de '
      + '`analysis === null && hadAnalysis`. Todos los overlays exigen `analysis?.success`, así que desaparecen en el mismo instante. '
      + 'Es una propiedad fail-closed estructural y hay que conservarla explícitamente en cualquier rediseño.',
    needed: '—',
    evidence: 'ProjectContext.tsx:113-125; analysisStatusModel.ts; CanvasResultLayer.tsx:177,223,278,378.',
  },
  {
    id: 'U-07',
    question: 'Rendimiento del datasheet y de la paleta con modelos grandes (el generador admite hasta 2 000 entidades).',
    status: 'ABIERTO',
    effect:
      'Condiciona si «lista de objetos» escala como ruta de precisión y si el dock de datos densos es viable donde CB lo permite. '
      + 'CRI-9 no apoya ninguna decisión en que escale: la ruta de precisión canónica es el picker sobre el lienzo, no la lista.',
    needed: 'Medición con un modelo generado de 2 000 entidades: tiempo hasta primera fila interactiva, coste de un cambio de faceta y de una selección de rango. Reproducible con el generador ya existente.',
  },
  {
    id: 'U-08',
    question: 'Interactividad real del minimapa por teclado y por tap.',
    status: 'RESUELTO — es un botón, con una sola acción',
    effect:
      'El minimapa ES un `<button>` con `aria-label` y `onClick={onFit}`: alcanzable por teclado y por tap. Pero su única acción es encuadrar; '
      + 'no permite desplazarse pulsando una zona. A cambio ocupa 144px del borde derecho y descuadra el margen de encuadre (F-07). '
      + 'CRI-9 lo mantiene como chrome flotante DEGRADABLE: es el primero que se retira cuando CB-3 se incumple.',
    needed: '—',
    evidence: 'CanvasMiniMap.tsx:70-95; canvasChromeGeometry.ts:27-30; CRI-7 F-07.',
  },
  {
    id: 'U-09',
    question: '¿Qué se conserva al entrar y salir de Space 3D?',
    status: 'RESUELTO',
    effect:
      'El dominio 2D sobrevive: `ProjectProvider` está por encima del cambio de pantalla. La presentación 2D NO sobrevive: `WorkspaceShell` '
      + 'se desmonta entero (superficie abierta, detents, foco, cámara). Las capas del lienzo sí, porque ya se persisten. Y 3D nunca escribe en '
      + 'el proyecto 2D: `sourceProject` es de sólo lectura y la divergencia se DETECTA (`space3dMatchesPlanarSource`), no se propaga. '
      + 'Consecuencia contractual: navegar a 3D con borradores sucios exige confirmación (TR-10).',
    needed: '—',
    evidence: 'App.tsx:53-80; Space3DWorkspace.tsx:333-334; editorLayers.ts:14.',
  },
  {
    id: 'U-10',
    question: '¿Pueden divergir localStorage e IndexedDB, y cuál manda en la recuperación?',
    status: 'RESUELTO',
    effect:
      'Sí pueden divergir, y el código ya declara qué pasa. localStorage es la autoridad de la SESIÓN VIVA: es de donde arranca el proyecto. '
      + 'IndexedDB es la autoridad de la BIBLIOTECA. Cuando IndexedDB ya contiene otra revisión, la copia compatible se guarda como '
      + '`recovery` EN LA MISMA TRANSACCIÓN, antes de lanzar el conflicto, y se bloquean las escrituras a IndexedDB para ese id hasta que se '
      + 'abra una versión desde el hub. No hay pérdida silenciosa; lo que falta es la puerta desde la mesa, que abre D-08.',
    needed: '—',
    evidence: 'ProjectContext.tsx:38, :87-111, :161-200; projectRepository.ts:190-208, :277-297.',
  },
  {
    id: 'U-11',
    question: 'Disponibilidad de `navigator.clipboard.readText()` en la matriz de navegadores del producto.',
    status: 'ABIERTO — nuevo en CRI-9',
    effect:
      'Condiciona la ruta táctil de pegado de bloque en el datasheet (D-07, DAT-06). Si no está disponible, hace falta una alternativa '
      + 'declarada (pegar en un campo de texto intermedio); lo que no es aceptable es que la función simplemente no exista en táctil sin decirlo.',
    needed: 'Comprobación en el gate de WebKit ya existente (`npm run qa:webkit`) más Chromium y Firefox, con y sin contexto seguro.',
  },
  {
    id: 'U-12',
    question: 'Coste real de la migración de `settings.show*` fuera de `ProjectSettings`.',
    status: 'ABIERTO — nuevo en CRI-9',
    effect:
      'Es el mayor riesgo adyacente a schema de todo CRI-9 (D-10). Toca `types.ts`, `migrate.ts` y el baseline protegido.',
    needed: 'Inventario de lecturas de `settings.show*`, plan de migración con versión de esquema, y una pasada de `npm run verify:protected` sobre el resultado. Repliegue declarado en D-10 si el coste no compensa.',
  },
  {
    id: 'U-13',
    question: 'Umbral de histéresis y ventana de estabilidad del resolutor.',
    status: 'ABIERTO — nuevo en CRI-9',
    effect:
      'T-INV-5 exige histéresis pero no fija su valor. Demasiado poca y el layout oscila en un arrastre de split-screen; demasiada y la '
      + 'composición se siente pegajosa.',
    needed: 'Prototipo de CRI-11 con arrastre continuo entre 900 y 1300px midiendo recomposiciones por segundo. Es una medición, no una opinión.',
  },
  {
    id: 'U-14',
    question: '¿Aula tolera que los resultados dejen de tener superficie residente?',
    status: 'ABIERTO — nuevo en CRI-9, el riesgo más importante de D-03',
    effect:
      'D-03 retira la banda de resultados de 54px en Compact y los 320px en Expanded. En Aula el bucle Resolver→leer es la tarea central. '
      + 'Si el resultado deja de estar a la vista, el bucle pedagógico puede romperse.',
    needed:
      'CRI-11 debe prototipar el bucle completo con la audiencia de Aula por separado, midiendo tiempo hasta el primer resultado leído. '
      + 'Si falla, el repliegue declarado es que en modo Aula el estado de análisis se acompañe de una tarjeta de resultado en el `inset` de la guía, '
      + 'sin reintroducir el panel monolítico.',
  },
  {
    id: 'U-15',
    question: 'Contraste medido por píxel y prueba con lectores de pantalla reales.',
    status: 'ABIERTO — heredado de CRI-7, no cubierto aquí',
    effect: 'D-14 fija el contrato de exposición de causa; no verifica que los tonos actuales lo cumplan.',
    needed: 'Medición por píxel en ambos temas y una pasada con lector de pantalla real. Pertenece a CRI-10 y a la fase de implementación.',
  },
];
