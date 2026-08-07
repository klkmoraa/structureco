# Claymorphism ciclo 2 — tarea 7: inspector raised con datos densos flat

**Fecha:** 2026-08-07 14:48
**Agente:** Codex
**Rama:** main
**Base:** `ebd87ec`

## Qué cambió

El panel del inspector y su resumen de selección consumen ahora el material `raised` eager de `material.css`. Los campos y contenedores densos del inspector consumen un único material `flat`: `.selection-card`, `.number-control`, `.select-field select`, `.effect-card`, `.combination-card`, `.norm-source`, `.compact-toggle-grid label`, `.inspector-note` y `.load-tool-grid button`.

La geometría responsive del panel queda desacoplada del shorthand compartido mediante `--inspector-clay-border-width`. El hook previo del rail también salió del bloque `raised` común y quedó en una regla exclusiva de `.toolbar`. `styles.css` conserva radios, posición, clip-path, safe areas, handle, tabs, foco, error, disabled, selected/active y demás comportamiento, pero ya no repite la materia de los contenedores migrados.

`qa.mjs` selecciona un miembro por su ruta real de teclado y mide la cascada compilada en Chromium: panel y summary raised, control numérico flat con fondo y borde tokenizados, y bottom sheet móvil con anchos `1px 1px 0px 1px`.

## Por qué

El inspector mezclaba paneles elevados con datos técnicos densos y repetía fondos, bordes y sombras en reglas dispersas. Centralizar la materia mantiene la jerarquía clay del ciclo 2 sin dar volumen a cada campo y evita que el shorthand eager destruya los cantos responsive del panel.

## Archivos tocados

- `qa.mjs` — añade y conecta los contratos desktop/mobile del material del inspector.
- `src/design-system/material.css` — incorpora los grupos raised/flat y separa los hooks locales de borde del toolbar y del inspector.
- `src/styles.css` — elimina materia duplicada, conserva estados y reemplaza las geometrías de borde por `--inspector-clay-border-width`.
- `reports/2026-08-07-1430-claymorphism-ciclo2-task7.md` — reporte rastreado de la tarea.
- `.superpowers/sdd/2026-08-07-claymorphism-ciclo2/task-7-report.md` — evidencia SDD ignorada.

## Cómo verificar

- Guardián inicial: `main@ebd87ec4e95b`, `structureco@0.8.2`; respaldo externo en `%TEMP%/structureco-task7-ebd87ec-20260807-143330`; 63 archivos protegidos inventariados; `capturas.mjs` registrado con SHA-256 `1F2CDE477FA77BC74A16C1848F544E8C7E5435FFCF0E7A4D12D644EEA774A710`.
- RED check-only: con CSS intacto, `npm.cmd run build` pasó. Tras corregir el accionamiento del `<g>` SVG a `focus + Enter`, `node qa.mjs` falló los tres contratos raised ausentes: `inspectorDesktopPanelHasRaisedClayMaterial`, `inspectorDesktopSummaryHasRaisedClayMaterial` e `inspectorMobilePanelHasRaisedClayMaterial`. El control numérico ya coincidía visualmente con flat en la base.
- GREEN final restaurado: `npm.cmd run build` pasó; `node qa.mjs` pasó completo, incluidas las cinco claves T7, con `console: []`, `pageErrors: []` y sin overflow horizontal.
- Mutación A: mover temporalmente `.number-control` de flat a raised hizo fallar `inspectorDesktopNumberControlHasFlatMaterial`.
- Mutación B: invalidar temporalmente el valor phone de `--inspector-clay-border-width` hizo fallar `inspectorMobilePanelHasTopOnlyClayEdge`. Se usó `initial` porque una eliminación literal heredaría el mismo valor desde la regla temprana `max-width:1023px` y no alteraría la cascada computada.
- Restauración byte a byte: `material.css` volvió a `528E5D6A149B61C2884A55F3A80A9335B2DF39BFA7BF481C0FBA559592927C80` y `styles.css` a `4FB9621AA3CC470399D8907DE9874DFD3AC50F29E1DA81BD1915F1AA93AF579C`.
- Tokens focused: `npx.cmd vitest run src/design-system/tokens.test.ts` pasó 1 archivo y 22/22 pruebas. La búsqueda de hooks locales `--sc-toolbar/inspector-clay-border-width` terminó sin coincidencias.
- Cierre del guardián: 63/63 hashes protegidos intactos, `capturas.mjs` con el mismo SHA-256 inicial y `git diff --check` limpio.

## Pendiente / siguiente paso

No hay bloqueo de implementación. La carrera heredada de `:active` de welcome apareció en RED, GREEN intermedio y mutaciones; no se modificó y el QA final restaurado pasó. El controlador conserva la revisión independiente y la matriz visual Day/Night y responsive descrita en el brief.

Por alcance no se abrió dev server ni navegador visual, no se ejecutó WebKit ni suite completa, no se tocaron TSX, dependencias, rutas protegidas o `capturas.mjs`, y no se hizo push.
