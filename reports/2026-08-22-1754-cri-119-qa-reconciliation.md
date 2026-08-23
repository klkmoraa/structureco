# CRI-119 — QA vigente: Results, Model Doctor y Compact

Fecha: 2026-08-22 17:54 America/Mexico_City
Linear: [CRI-119](https://linear.app/klkmoraa/issue/CRI-119/qa-vigente-reconciliar-results-model-doctor-y-apilado-compact)
Checkout: `Structure`, rama `main`
SHA probado: `228b4a6318b20c5761342b0c0c4fdf585dfb3171`
`origin/main`: `228b4a6318b20c5761342b0c0c4fdf585dfb3171`

## Resultado

La reconciliación funcional de CRI-119 queda PASS en Chromium para la matriz general y los cuatro gates focales. Structural Edits y Structure Generator también pasan en WebKit en sus runners aislados. El gate general WebKit permanece rojo por dos causas separadas y documentadas: targets táctiles por debajo de 44 px y una carrera de preload/lazy CSS del runner.

No se tocó solver, matemática, signos, unidades, IDs, topología, workers, `ProjectModel`, persistencia de dominio, import/export ni resultados numéricos. `verify:protected` confirmó la frontera protegida: 38 archivos intactos.

## Plan ejecutado

1. Revalidar el contrato vigente de Linear, el SHA probado, el estado de Git y la rama de publicación.
2. Ejecutar QA general en Chromium y WebKit, registrando viewport, idioma, tema y composición.
3. Clasificar fallos entre selector histórico, comportamiento vigente, accesibilidad y carrera del runner.
4. Actualizar sólo runners/helpers y el overflow real de Home móvil; repetir gates focales.
5. Registrar evidencia, pendientes y límites de publicación.

## Matriz de gates

| Comando | Escenario vigente | Resultado |
|---|---|---|
| `npm.cmd run qa` | Chromium; Home 1536/390/430; Workspace X2/M1/K0; ES/EN; light/dark; Results, Model Doctor, Inspector, touch, Hibbeler | PASS; `console=[]`, `pageErrors=[]` |
| `npm.cmd run qa:model-doctor` | Chromium; healthy, invalid, sin grounding, topology preview/apply/undo/redo, stale, 1440/900/701/700/390/400, safe area, teclado y reduced motion | PASS |
| `npm.cmd run qa:structural-edits` | Chromium; Move, Rotate, Mirror, Linear Array, Align, Distribute, undo/redo, Candidate Picker, touch y Compact vigente | PASS |
| `npm.cmd run qa:structure-generator` | Chromium; cinco familias, tres topologías de truss, preview no mutante, confirmación atómica, undo/redo, responsive y preview denso | PASS |
| `npm.cmd run qa:results-cards` | Chromium; light/dark, tarjetas extremas, Results denso X2/M1/K0, EN K0 y Datasheet plano | PASS |
| `node scripts/qa-structural-edits.mjs --webkit` | WebKit; Structural Edits y rutas Compact actuales | PASS |
| `node scripts/qa-structure-generator.mjs --webkit` | WebKit; familias, preview, confirmación, responsive y performance | PASS |
| `npm.cmd run qa:webkit` | iPhone 13 e iPad Pro 11; Home/import/workspace/touch | FAIL clasificado; ver abajo |

Oráculos adicionales:

- `npm.cmd run test -- --run src/store/ProjectContext.modelDoctor.test.tsx src/features/canvas/ContextualActions.test.tsx`: **18/18 tests PASS**.
- `npm.cmd run verify:protected`: **PASS**, 38 archivos verificados.
- `npm.cmd run lint`: **exit 0**. Sólo warnings existentes de Fast Refresh y un `exhaustive-deps` en `WorkspaceShell`; no se convirtieron en PASS oculto ni se ampliaron umbrales.
- `node --check` de los runners modificados: **PASS**.
- `git diff --check`: **PASS**.

## Hallazgos y decisiones

### Results

El selector histórico de pestañas residentes ya no describe el producto. Results conserva la superficie principal y las vistas densas se invocan desde el overflow vigente:

- X2 y M1: `drawer`, modal, sin residencia.
- K0 portrait y landscape: `fullscreen`, modal, sin residencia.
- Todas las variantes devuelven foco al lanzador `results-overflow`.
- EN K0 y Datasheet plano pasaron sin overflow ni tarjetas incorrectas.

### Model Doctor

El título vigente de estado sano es “Todo en orden por aquí”. La superficie modal aísla la Mesa (`inert=true`, `aria-hidden=true`); por tanto, una edición de nombre detrás del modal ya no es una interacción browser válida para producir concurrencia.

La prueba browser conserva la parte soportada del contrato: el hallazgo stale ofrece preview no mutante y el workspace queda aislado. El rechazo de aplicar un preview globalmente obsoleto sigue cubierto por `ProjectContext.modelDoctor.test.tsx`, que verifica ausencia de mutación, historial y des-invalidez del análisis. No se marcó como PASS una edición imposible detrás de un modal inerte.

### Compact

El código vigente no monta `[data-contextual-actions]` dentro del Workspace; `ContextualActions.tsx` conserva su contrato unitario y sus tests, pero el recorrido de producción actual es ToolRail → “Más herramientas” → “Editar selección”. El runner dejó de esperar la superficie huérfana y verifica:

- el comando estructural real está expuesto en Compact;
- no existe una superficie `data-contextual-actions` huérfana que intercepte la interacción;
- Candidate Picker toma la superficie de selección mientras está abierto;
- el ToolRail no produce overflow horizontal en landscape.

### Home móvil

En 390×844 el contenido de Home excedía el viewport mientras el global `html, body, #root` permanecía sin scroll. Se añadió scroll vertical al contenedor real `.sc-home` (`height: 100dvh`, `overflow-y: auto`, `overflow-x: hidden`). El gate Chromium confirma `scrollHeight=902`, gesto táctil efectivo y alcanzabilidad de acciones rápidas y proyectos recientes. No se cambió la navegación ni el modelo de datos.

### WebKit general

`npm.cmd run qa:webkit` terminó con:

- iPhone 13 e iPad Pro 11: targets de 40–43 px (`Proyecto actual`, `Herramientas del espacio de trabajo`, `Model Doctor`, `Seleccionar (V)`, `Cerrar notificación`). Se conserva el umbral de 44 px; queda pendiente de CRI-106.
- iPhone 13: `Unhandled Promise Rejection: TypeError: Importing a module script failed.`
- iPad Pro 11: `Unable to preload CSS for .../assets/WorkspaceShell-Dbw4BQyB.css`.

Los runners focales Structural Edits y Structure Generator sí pasan en WebKit, por lo que el rojo general se clasifica como combinación de a11y pendiente y carrera del arnés/lazy preload, no como fallo funcional de CRI-119. No se añadieron sleeps fijos, no se relajaron assertions y no se aumentaron timeouts globales.

## Cambios realizados

- `qa.mjs`: selectors y rutas Home/Inspector/Results/TopBar vigentes; apertura explícita del overflow denso; scroll real de Home; material computado actual; sin referencias a pestañas históricas.
- `qa-webkit.mjs`: Home/import vigentes, continuidad desde el hub de proyecto, limpieza de almacenamiento por dispositivo y espera observable de stylesheet lazy.
- `scripts/qa-welcome.mjs`: navegación actual de Home y helper para aislar el ciclo PWA durante `vite preview`.
- `scripts/qa-model-doctor.mjs`: almacenamiento/PWA aislados, heading vigente, rutas de tema/Doctor actuales y stale browser limitado al contrato soportado.
- `scripts/qa-structural-edits.mjs`: ToolRail vigente para Structural Edit, historia actual y Compact sin superficie contextual huérfana.
- `scripts/qa-structure-generator.mjs`: navegación, historia y aislamiento PWA actuales.
- `src/features/welcome/totalHome.css`: scroll vertical del contenedor Home para que el contenido móvil sea alcanzable.

## Estado Git y publicación

El árbol conserva cambios locales intencionales sin commit ni push. `main` y `origin/main` siguen en `228b4a6318b20c5761342b0c0c4fdf585dfb3171`.

No se publicó. El `gh-pages` local es `03a5db33f0ea26ebfbb885a61dd2fb8b708bc306`, distinto del SHA que figuraba en el contexto de Linear (`86ea6a60153d1cd3e985930ac88803ae9f942fb5`); por seguridad quedan separados source y Pages y se requiere autorización explícita para cualquier publicación.

## Pendientes

- CRI-106: corregir targets táctiles menores de 44 px y repetir el gate WebKit general.
- Seguimiento del preload/import race de WebKit en el arnés general; mantener las esperas observables y verificar si persiste con el entorno/runner actualizado.
- No iniciar ni cerrar issues dependientes ni publicar `main`/`gh-pages` como parte de CRI-119 sin nueva autorización.
