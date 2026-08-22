# Home total y assets estructurales Three.js — corrección de accesibilidad y evidencia completa

**Fecha:** 2026-08-22 02:06
**Agente:** Codex
**Rama:** `codex/clay-workspace-phase-2`

## Qué cambió

El menú de navegación móvil del Home ahora responde a `Escape`: se cierra y el foco vuelve al botón que abrió el menú. Se añadieron pruebas focales para ese contrato y para el contrato existente de apertura/cierre mediante `aria-expanded` y selección de un destino.

El oráculo visual del Home captura ahora exactamente seis escenarios: escritorio, tablet y móvil, todos en Día y Noche. La evidencia regenerada contiene los seis PNG y un resumen instrumental sin fallos.

Fix round 2 migró las cinco pruebas históricas de `WelcomeHeader.test.tsx` al contrato aprobado del Home total. Se conservaron tema, idioma, wordmark de una línea, navegación móvil accesible, Escape con retorno de foco y unicidad de controles; no se reintrodujeron el `h1` editorial ni el drawer modal eliminados.

## Por qué

La revisión de Task 2 detectó tres faltantes: no había evidencia de las seis vistas requeridas, el RED original no estaba explicado en el reporte y no existía cobertura focal de navegación móvil accesible. Esta corrección deja la evidencia verificable sin alterar el diseño de navegación ni sus callbacks existentes.

## Archivos tocados

- `src/features/welcome/WelcomeScreen.tsx` — escucha `Escape` sólo mientras el menú móvil está abierto y devuelve foco a su activador.
- `src/features/welcome/totalRedesignHome.test.tsx` — RED/GREEN de Escape y caracterización de `aria-expanded`, cierre y actualización de contenido al elegir Plantillas.
- `src/features/welcome/WelcomeHeader.test.tsx` — migración de cinco contratos históricos a la estructura responsive vigente.
- `scripts/qa-total-home-redesign.mjs` — matriz fija de seis escenarios.
- `reports/evidence/2026-08-22-total-home-redesign/` — seis capturas, `qa-summary.json` y extracción literal `tdd-red-home.txt`.
- `reports/2026-08-22-0128-home-three-assets.md` — este checkpoint actualizado.
- `.superpowers/sdd/2026-08-22-structureco-total-visual-redesign/{task-2-report.md,progress.md}` — cierre y ledger de fix round 2.

## Evidencia TDD

| Etapa | Comando / fuente | Resultado honesto |
|---|---|---|
| RED original de Task 2 | `reports/evidence/2026-08-22-total-home-redesign/tdd-red-home.txt` | Extracción literal concisa del raw archivado: 1 archivo y 3 pruebas fallaron en 14.15 s por navegación ausente, hero `undefined` y ausencia del botón exacto `Nuevo proyecto`. Incluye rollout/call_id y omite explícitamente sólo el enorme dump DOM. |
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
npm.cmd test -- src/features/welcome --reporter=verbose
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run verify:protected
npm.cmd run build
node scripts/qa-total-home-redesign.mjs
```

Resultados de esta corrección:

- Home completo: 7 archivos, 42/42 PASS en 32.72 s.
- `WelcomeHeader.test.tsx`: 5/5 PASS tras migrar el contrato, sin cambios de producción en fix round 2.
- `typecheck`: PASS.
- `lint`: exit 0 con 13 warnings preexistentes fuera del diff (evidencia/prototipo, `measure-datasheet-performance.mjs`, `WorkspaceShell.tsx` y `ContextualActions.tsx`).
- `verify:protected`: PASS, 38 archivos protegidos intactos.
- `build`: PASS. Vite conserva el warning no bloqueante por chunks mayores de 500 kB.
- QA visual: PASS, 6/6 capturas.

## Pendiente / siguiente paso

El alcance de Task 2 queda cerrado sin concerns funcionales pendientes: la suite completa de Home pasa. Permanecen únicamente los 13 warnings de lint ajenos al diff y el warning no bloqueante de Vite por chunks mayores de 500 kB; no se ampliaron en esta tarea.

El checkpoint aislado de revisión también quedó publicado con acceso owner-only en `https://structureco-redesign-checkpoint.crdrawin.chatgpt.site`. Reúne la matriz Desktop/Tablet/Móvil en Día/Noche y las primeras familias Three.js sin placa azul. El enlace se envió al correo autorizado. Esta publicación no adaptó ni desplegó la SPA real, no cambió sus dependencias y no implicó push de la rama del producto.

Este checkpoint existente sirve como change report obligatorio; no se creó un reporte duplicado. No se tocaron engine, solver, `ProjectModel`, persistencia, import/export, comandos, unidades, signos, topología ni interacción de canvas. Se preservó el archivo no rastreado ajeno `reports/evidence/2026-08-21-clay-mobile-density-phase-5/full-test.log`.
