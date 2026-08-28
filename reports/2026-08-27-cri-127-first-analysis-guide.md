# CRI-127 — ruta de primer análisis

El lienzo vacío muestra una guía no bloqueante con tres rutas explícitas: plantilla, generador guiado o dibujo manual. Después de comenzar, la guía conserva una secuencia de geometría, apoyos, cargas y análisis; antes de resolver muestra el recuento actual y las unidades, con acceso opcional a Model Doctor. La secuencia y su siguiente acción se muestran en el idioma del proyecto.

El generador conserva el valor seguro de no introducir apoyos por defecto. Sus presets opcionales indican antes de confirmar qué grados de libertad restringen, y la vista previa conserva el conteo exacto de nudos con apoyo.

La guía se puede ocultar y reabrir desde la paleta buscando ayuda o “primer análisis”. No altera el modelo ni aplica apoyos/cargas automáticamente.

Validación focal: `FirstAnalysisGuide.test.tsx`, `CommandPalette.test.tsx`, `StructureGeneratorPanel.test.tsx`, `structureGeneratorForm.test.ts`, `structureGenerators.test.ts`, `generatorDeterminism.test.ts`, `classroomProgress.test.ts` y compilación TypeScript (219 pruebas focales de generador/progreso, más 6 de la guía y navegación).

Pendiente para cerrar CRI-127: las pruebas E2E completas de viga, pórtico y cercha, pruebas de teclado/móvil y la validación moderada con participantes de CRI-125. No se han simulado como evidencia de adopción.
