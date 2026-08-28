# CRI-131 — límites verificables de Space 3D

La entrada experimental ahora incluye una matriz breve: qué se deriva del plano, qué campos espaciales debe aportar la persona y qué diferencias deben revisarse. No abre ni cambia el modelo hasta que se confirma; el retorno mantiene intacto el editor 2D.

En un proyecto derivado, el botón Analizar muestra el siguiente requisito bloqueante. Cada requisito que se puede completar abre el inspector de la entidad afectada con una acción «Completar ahora»; la acción no escribe valores, no reconoce diferencias y el análisis permanece bloqueado hasta que la persona guarde datos válidos. La lista conserva los IDs de los miembros afectados y los casos no representables continúan requiriendo reconocimiento explícito.

Validación focal: `Space3DEntryDialog.test.tsx` y `Space3DWorkspace.test.tsx` (29 pruebas), además de `tsc --noEmit`.

Pendiente para cierre: contraste E2E con y sin WebGL, recorrido completo de cargas distribuidas y la decisión de producto para cualquier conversión o lote de Iy/J. No se infieren propiedades, no se convierten cargas ni se cambió el solver durante este trabajo.
