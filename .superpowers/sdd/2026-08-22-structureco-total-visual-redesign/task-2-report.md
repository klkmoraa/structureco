# Task 2 — fix rounds 1–2 report

**Estado:** `DONE`
**Fecha:** 2026-08-22 02:06
**Checkout:** `C:\Users\crisd\.codex\github-workspaces\structureco-clay-redesign`
**Rama:** `codex/clay-workspace-phase-2`

## Resultado entregado

Se completó la corrección solicitada para el Home de Task 2:

- `Escape` cierra la navegación móvil abierta y devuelve el foco al botón de menú.
- La cobertura focal confirma tanto ese comportamiento como el estado `aria-expanded`, el cierre al seleccionar Plantillas y la actualización del contenido.
- `scripts/qa-total-home-redesign.mjs` genera exactamente seis capturas: Desktop/Tablet/Mobile × Day/Night.
- Se regeneró la evidencia visual y el checkpoint existente fue actualizado con resultados reproducibles y evidencia TDD completa.
- Fix round 2 migró `WelcomeHeader.test.tsx` del header/editorial y drawer antiguos a los contratos responsive vigentes, manteniendo sus cinco comportamientos significativos.
- El RED original quedó preservado como extracción literal concisa y trazable en `tdd-red-home.txt`.
- El checkpoint visual aislado quedó publicado en Sites con acceso privado del propietario; permite alternar Día/Noche y Desktop/Tablet/Móvil sin añadir un adaptador ni dependencias a la aplicación real.
- El enlace de revisión se envió al correo autorizado. No se hizo push del código fuente del producto.

## Alcance real

Modificados únicamente:

- `src/features/welcome/WelcomeScreen.tsx`
- `src/features/welcome/totalRedesignHome.test.tsx`
- `src/features/welcome/WelcomeHeader.test.tsx`
- `scripts/qa-total-home-redesign.mjs`
- `reports/evidence/2026-08-22-total-home-redesign/{desktop-day,desktop-night,tablet-day,tablet-night,mobile-day,mobile-night}.png`
- `reports/evidence/2026-08-22-total-home-redesign/qa-summary.json`
- `reports/evidence/2026-08-22-total-home-redesign/tdd-red-home.txt`
- `reports/2026-08-22-0128-home-three-assets.md`
- `.superpowers/sdd/2026-08-22-structureco-total-visual-redesign/task-2-report.md`
- `.superpowers/sdd/2026-08-22-structureco-total-visual-redesign/progress.md`

No se modificaron engine, solver, workers, `ProjectModel`, persistencia, import/export, comandos, unidades, signos, topología ni canvas. El archivo ajeno no rastreado `reports/evidence/2026-08-21-clay-mobile-density-phase-5/full-test.log` permanece intacto y sin stage.

## TDD y accesibilidad

La evidencia original se preserva ahora en `reports/evidence/2026-08-22-total-home-redesign/tdd-red-home.txt`: es una extracción literal concisa del raw `C:\Users\crisd\.codex\sessions\2026\08\21\rollout-2026-08-21T08-31-43-01a024bc-1fd0-7861-b5f4-1bafcc578a6a.jsonl`, `call_id` `call_Lwl1UISsPNUa58VlIiSTrtGz`. Registra el comando, Vitest, las tres causas y el resumen 1 archivo/3 pruebas FAIL en 14.15 s; omite explícitamente el enorme dump DOM.

Para este fix se añadió primero la prueba de Escape. El RED real ejecutó 3 PASS y 1 FAIL: tras Escape, `aria-expanded` permanecía en `true` cuando se esperaba `false`. Después del cambio mínimo de producción, el mismo comando dio 4/4 PASS. La prueba de la navegación ya existente se añadió como caracterización, no como RED, y el resultado final del archivo fue 5/5 PASS.

Fix round 2 comenzó reproduciendo `WelcomeHeader.test.tsx` con 1 PASS/4 FAIL. La causa era contractual: cuatro pruebas aún exigían el `h1`, `.welcome-brand-line` y `role="dialog"` eliminados. La migración mantuvo cinco casos y cambió sus aserciones hacia navegación traducida, dos wordmarks responsive de una línea, `aria-expanded`, Escape/foco y un único control accesible de idioma/tema. No hubo cambios de producción en esta ronda.

## Validación ejecutada

| Validación | Resultado |
|---|---|
| `npm.cmd test -- src/features/welcome --reporter=verbose` | PASS: 7 archivos, 42/42 pruebas, 32.72 s. |
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

## Concerns restantes

No quedan concerns funcionales dentro de Task 2. Lint conserva 13 warnings preexistentes fuera del diff y Vite mantiene el warning no bloqueante por chunks >500 kB.

## Checkpoint externo

- URL privada: `https://structureco-redesign-checkpoint.crdrawin.chatgpt.site`
- Estado: desplegado correctamente, acceso owner-only verificado.
- Contenido: las seis capturas responsive y cinco muestras Three.js transparentes, con selector Día/Noche.
- Aislamiento: se construyó en el scratch SDD ignorado por Git; no cambió `package.json`, dependencias ni arquitectura de la aplicación real.
- Entrega: enlace enviado a `crisdlm302@gmail.com` después de la publicación.

## Handoff

El siguiente agente puede partir del commit local asociado a este reporte. Task 2 está cerrado: pruebas Home, tipado, frontera protegida, build, evidencia y checkpoint externo están completos. El checkpoint existente funciona como change report, por lo que no se creó un duplicado.
