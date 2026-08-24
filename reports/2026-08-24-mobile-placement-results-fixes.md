# Correcciones focales de colocación móvil y Resultados · 2026-08-24

## Alcance

Se corrigieron los bugs visuales y de interacción reproducidos en teléfono,
sin abrir la suite completa ni tocar solver, unidades, signos, topología,
`ProjectModel`, workers, persistencia, import/export, undo/redo o resultados
numéricos.

## Causas corregidas

- La pista `Toca el nodo destino` podía conservar un ancla vertical inferior
  junto con `top` en Safari iOS. Eso convertía una línea de estado en una
  superficie que ocupaba casi todo el lienzo. La regla final del canvas fija un
  único ancla, altura automática y máximo de 44 px en teléfono.
- El botón de cancelar una colocación de carga y las opciones del selector de
  coincidencias podían heredar alturas pequeñas. En puntero grueso conservan
  ahora un objetivo mínimo de 44×44 px.
- Resultados no se añadió al dock. En K0 se invoca desde Utilidades, pero el
  botón del menú se desmontaba al abrir la hoja. El broker recibe el lanzador
  persistente y `WorkspaceShell` mantiene un fallback conectado al cerrar;
  además la hoja tiene un botón X táctil explícito.
- El análisis podía reescribir el objetivo de retorno de Resultados mientras
  la hoja ya estaba abierta. Sólo se solicita reapertura automática cuando la
  hoja está activa y no se sustituye el lanzador original durante el análisis.
- El bus del lanzador de la paleta comparte la exclusión de Ctrl/Cmd+K y no
  abre una segunda capa sobre Model Doctor o Datasheet activos.

## Evidencia

| Comprobación | Resultado |
| --- | --- |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run build` | PASS · 2,637 módulos transformados |
| Vitest focal TopBar, ResultsPanel, broker y CanvasChrome | PASS · 48/48 ejecutadas; 3 omitidas por el propio archivo |
| Navegador K0 390×844 · pista de destino | PASS · 181×44, entrada rápida 374×81, overflow 0 |
| Navegador K0 · cancelar carga | PASS · botón 44×44 |
| Navegador K0 · Resultados desde Utilidades | PASS · no está en ToolRail; cierre X devuelve foco a Utilidades y conserva la Mesa |
| QA TopBar | PASS · breakpoints, barrido 1024–1600, nombres ES/EN y piso compacto |
| QA Results cards | PASS · X2/M1/K0, dense, día/noche y sin overflow |
| QA Datasheet K0 | PASS · 76/76 comprobaciones en portrait, landscape, M1 y X2 |
| `git diff --check` | PASS |

## Estado de publicación

La publicación de `main` y `gh-pages` se verificará por separado después del
commit final. El reporte extranjero
`reports/2026-08-23-cri-29-action-contract-audit.md` permanece sin seguir y
fuera del cambio.

## Límite conocido

No se ejecutó `scripts/qa-model-doctor.mjs` porque el runner largo ya había
quedado sin progreso en una secuencia anterior; no se presenta como PASS ni se
atribuye ese comportamiento a este cambio.
