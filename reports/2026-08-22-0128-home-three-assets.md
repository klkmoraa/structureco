# Home total y assets estructurales Three.js — corrección de accesibilidad y evidencia completa

**Fecha:** 2026-08-22 01:48
**Agente:** Codex
**Rama:** `codex/clay-workspace-phase-2`

## Qué cambió

El menú de navegación móvil del Home ahora responde a `Escape`: se cierra y el foco vuelve al botón que abrió el menú. Se añadieron pruebas focales para ese contrato y para el contrato existente de apertura/cierre mediante `aria-expanded` y selección de un destino.

El oráculo visual del Home captura ahora exactamente seis escenarios: escritorio, tablet y móvil, todos en Día y Noche. La evidencia regenerada contiene los seis PNG y un resumen instrumental sin fallos.

## Por qué

La revisión de Task 2 detectó tres faltantes: no había evidencia de las seis vistas requeridas, el RED original no estaba explicado en el reporte y no existía cobertura focal de navegación móvil accesible. Esta corrección deja la evidencia verificable sin alterar el diseño de navegación ni sus callbacks existentes.

## Archivos tocados

- `src/features/welcome/WelcomeScreen.tsx` — escucha `Escape` sólo mientras el menú móvil está abierto y devuelve foco a su activador.
- `src/features/welcome/totalRedesignHome.test.tsx` — RED/GREEN de Escape y caracterización de `aria-expanded`, cierre y actualización de contenido al elegir Plantillas.
- `scripts/qa-total-home-redesign.mjs` — matriz fija de seis escenarios.
- `reports/evidence/2026-08-22-total-home-redesign/` — seis capturas y `qa-summary.json` regenerado.
- `reports/2026-08-22-0128-home-three-assets.md` — este checkpoint actualizado.

## Evidencia TDD

| Etapa | Comando / fuente | Resultado honesto |
|---|---|---|
| RED original de Task 2 | `.superpowers/sdd/2026-08-22-structureco-total-visual-redesign/progress.md` | El ledger registra `npm.cmd test -- src/features/welcome/totalRedesignHome.test.tsx --reporter=verbose` con 3/3 fallos esperados: navegación, hero estructural y acciones compactas. El ledger no conserva el texto de salida, por lo que no se inventó. |
| RED nuevo: Escape | `npm.cmd test -- src/features/welcome/totalRedesignHome.test.tsx --reporter=verbose` | 3 PASS, 1 FAIL esperado: tras `{Escape}`, `aria-expanded` continuaba en `true` (recibido `true`, esperado `false`). Antes de esa ejecución se corrigió una aserción de prueba que usaba un matcher DOM no instalado; no cuenta como evidencia del comportamiento. |
| GREEN nuevo: Escape | mismo comando | 4/4 PASS. |
| Caracterización existente | mismo comando, tras añadir selección de destino | 5/5 PASS: el menú alterna `aria-expanded`, Plantillas lo cierra y muestra su contenido. |

## Evidencia visual

`node scripts/qa-total-home-redesign.mjs` terminó con `Home redesign QA PASS · 6 captures` y `qa-summary.json` sin fallos ni errores de consola.

| Escenario | Viewport | Captura |
|---|---:|---|
| Escritorio Día | 1440×960 | `reports/evidence/2026-08-22-total-home-redesign/desktop-day.png` |
| Escritorio Noche | 1440×960 | `reports/evidence/2026-08-22-total-home-redesign/desktop-night.png` |
| Tablet Día | 1024×900 | `reports/evidence/2026-08-22-total-home-redesign/tablet-day.png` |
| Tablet Noche | 1024×900 | `reports/evidence/2026-08-22-total-home-redesign/tablet-night.png` |
| Móvil Día | 390×844 | `reports/evidence/2026-08-22-total-home-redesign/mobile-day.png` |
| Móvil Noche | 390×844 | `reports/evidence/2026-08-22-total-home-redesign/mobile-night.png` |

La inspección visual manual cubrió escritorio Día, tablet Noche y móvil Día. El oráculo verificó para los seis: tema correcto, cero overflow horizontal, composición sidebar/móvil esperada, tres accesos rápidos, máximo tres recientes, hero estructural, sin carril/portal legado, sin filtros translúcidos y sin errores de consola.

## Cómo verificar

```powershell
npm.cmd test -- src/features/welcome/WelcomeScreen.test.tsx src/features/welcome/totalRedesignHome.test.tsx --reporter=verbose
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run verify:protected
npm.cmd run build
node scripts/qa-total-home-redesign.mjs
```

Resultados de esta corrección:

- Focal `WelcomeScreen` + `totalRedesignHome`: 2 archivos, 11/11 PASS.
- `typecheck`: PASS.
- `lint`: exit 0 con 13 warnings preexistentes fuera del diff (evidencia/prototipo, `measure-datasheet-performance.mjs`, `WorkspaceShell.tsx` y `ContextualActions.tsx`).
- `verify:protected`: PASS, 38 archivos protegidos intactos.
- `build`: PASS. Vite conserva el warning no bloqueante por chunks mayores de 500 kB.
- QA visual: PASS, 6/6 capturas.

## Pendiente / siguiente paso

El alcance de la corrección está cerrado. Como resultado separado, `npm.cmd test -- src/features/welcome --reporter=verbose` falla 4/5 en `WelcomeHeader.test.tsx`: busca la etiqueta `/menú|menu/i`, un drawer con `role="dialog"` y un `h1` del header anterior. Ese archivo no fue modificado y la versión base de `WelcomeScreen.tsx` ya exponía `Abrir navegación`; requiere una tarea de reconciliación de la prueba histórica, no se ocultó ni se reparó fuera de alcance.

No se tocaron engine, solver, `ProjectModel`, persistencia, import/export, comandos, unidades, signos, topología ni interacción de canvas. Se preservó el archivo no rastreado ajeno `reports/evidence/2026-08-21-clay-mobile-density-phase-5/full-test.log`.
