# Task 2 — fix round 1 report

**Estado:** `DONE_WITH_CONCERNS`
**Fecha:** 2026-08-22 01:48
**Checkout:** `C:\Users\crisd\.codex\github-workspaces\structureco-clay-redesign`
**Rama:** `codex/clay-workspace-phase-2`

## Resultado entregado

Se completó la corrección solicitada para el Home de Task 2:

- `Escape` cierra la navegación móvil abierta y devuelve el foco al botón de menú.
- La cobertura focal confirma tanto ese comportamiento como el estado `aria-expanded`, el cierre al seleccionar Plantillas y la actualización del contenido.
- `scripts/qa-total-home-redesign.mjs` genera exactamente seis capturas: Desktop/Tablet/Mobile × Day/Night.
- Se regeneró la evidencia visual y el checkpoint existente fue actualizado con resultados reproducibles y evidencia TDD completa.

## Alcance real

Modificados únicamente:

- `src/features/welcome/WelcomeScreen.tsx`
- `src/features/welcome/totalRedesignHome.test.tsx`
- `scripts/qa-total-home-redesign.mjs`
- `reports/evidence/2026-08-22-total-home-redesign/{desktop-day,desktop-night,tablet-day,tablet-night,mobile-day,mobile-night}.png`
- `reports/evidence/2026-08-22-total-home-redesign/qa-summary.json`
- `reports/2026-08-22-0128-home-three-assets.md`
- `.superpowers/sdd/2026-08-22-structureco-total-visual-redesign/task-2-report.md`

No se modificaron engine, solver, workers, `ProjectModel`, persistencia, import/export, comandos, unidades, signos, topología ni canvas. El archivo ajeno no rastreado `reports/evidence/2026-08-21-clay-mobile-density-phase-5/full-test.log` permanece intacto y sin stage.

## TDD y accesibilidad

La evidencia original se preserva desde `progress.md`: Task 2 comenzó con el comando `npm.cmd test -- src/features/welcome/totalRedesignHome.test.tsx --reporter=verbose`, que falló 3/3 por la navegación, el hero estructural y las acciones compactas faltantes. El ledger sólo conserva ese conteo y descripción; no se reconstruyó ni inventó salida adicional.

Para este fix se añadió primero la prueba de Escape. El RED real ejecutó 3 PASS y 1 FAIL: tras Escape, `aria-expanded` permanecía en `true` cuando se esperaba `false`. Después del cambio mínimo de producción, el mismo comando dio 4/4 PASS. La prueba de la navegación ya existente se añadió como caracterización, no como RED, y el resultado final del archivo fue 5/5 PASS.

## Validación ejecutada

| Validación | Resultado |
|---|---|
| `npm.cmd test -- src/features/welcome/WelcomeScreen.test.tsx src/features/welcome/totalRedesignHome.test.tsx --reporter=verbose` | PASS: 2 archivos, 11/11 pruebas. |
| `npm.cmd run typecheck` | PASS. |
| `npm.cmd run lint` | PASS con exit 0; 13 warnings preexistentes fuera del diff. |
| `npm.cmd run verify:protected` | PASS: 38 archivos protegidos intactos. |
| `npm.cmd run build` | PASS; warning no bloqueante de Vite por chunks >500 kB. |
| `node scripts/qa-total-home-redesign.mjs` | PASS: 6 capturas, resumen sin fallos ni errores de consola. |

Se inspeccionaron manualmente las capturas `desktop-day.png`, `tablet-night.png` y `mobile-day.png`. Los seis escenarios instrumentados comprobaron tema, composición responsive, overflow horizontal cero, hero, accesos rápidos, límite de recientes, ausencia de superficies heredadas y ausencia de filtros translúcidos.

## Evidencia visual

- `desktop-day.png` y `desktop-night.png` — 1440×960.
- `tablet-day.png` y `tablet-night.png` — 1024×900.
- `mobile-day.png` y `mobile-night.png` — 390×844.
- `qa-summary.json` — métricas por escenario y lista de fallos vacía.

## Concern documentado

La suite ampliada `npm.cmd test -- src/features/welcome --reporter=verbose` no pasa completa: `WelcomeHeader.test.tsx` falla 4/5 contra expectativas del header/drawer antiguo (`/menú|menu/i`, `role="dialog"`, `h1`). No se modificó ese archivo ni esas expectativas durante este fix, y la base ya usaba la etiqueta `Abrir navegación`; por ello no se amplió el alcance para reescribir una prueba histórica. El concern queda explícito en el checkpoint y no invalida los gates focales o protegidos que sí pasaron.

## Handoff

El siguiente agente puede partir del commit local asociado a este reporte. Si se autoriza una continuación, el único follow-up sugerido es reconciliar `WelcomeHeader.test.tsx` con el Home rediseñado como tarea independiente; no fue necesario para corregir Escape ni completar la matriz de evidencia de Task 2.
