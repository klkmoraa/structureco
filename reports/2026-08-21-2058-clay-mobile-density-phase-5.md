# Densidad móvil Clay, paneles y propiedades opcionales — Fase 5

**Fecha:** 2026-08-21 20:58
**Agente:** Codex
**Rama:** `codex/clay-workspace-phase-2`
**Clasificación:** AUDIT/TEMPORARY

## Qué cambió

- Las tres superficies reales del Workspace (Cargas, Vista y Resultados) salen de los botones nativos repetidos y se agrupan bajo un único lanzador **Paneles**: popover Clay en X2/M1 y hoja táctil desde **Más** en K0. Sus comandos existentes se conservan.
- El dock K0 se convierte en una cápsula flotante, centrada, deslizable y de iconos, con objetivos táctiles de 44 px; no reserva una banda visual pesada de borde a borde.
- Las tarjetas de extremos de Resultados en K0 forman un carril horizontal con snap. Se pueden ocultar/mostrar mediante icono sin ocultar ni mutar el diagrama. La hoja ocupa 55 % del alto para que gráfico y tarjetas respiren juntos.
- Las propiedades avanzadas en K0 dejan de expandir formularios gigantes: el acordeón muestra un resumen y **Editar todo** abre el editor completo a pantalla completa, reutilizando el Drawer y su foco modal compartido. Los campos y sus commits se montan una sola vez.
- Los detentes del Inspector pasan a 35 / 55 / 85 %, y la preferencia existente de cada usuario se conserva.

No se modificaron solver, modelo, signos, unidades, IDs, persistencia estructural, comandos de dominio, import/export ni workers.

## Por qué

El usuario confirmó que no quiere menos funciones: quiere controles compactos, dinámicos y legibles. También aprobó un dock móvil tipo aplicaciones, tarjetas de resultados horizontales y ocultables, prioridad para gráfica + tarjetas, y el editor opcional completo sólo bajo demanda.

La implementación conserva las autoridades existentes de composición (`X2` / `M1` / `K0`), broker de superficies y foco modal. Así se elimina la apariencia de botones añadidos sin función sin desactivar rutas reales del producto.

## Archivos tocados

- `src/features/canvas/ToolRail.tsx` — lanzador único de Paneles y ruta móvil hacia sus tres superficies reales.
- `src/features/results/ResultsPanel.tsx` — carril de métricas móvil, visibilidad y prioridad del gráfico.
- `src/features/inspector/InspectorPrimitives.tsx` — resumen K0 y editor avanzado completo bajo demanda.
- `src/features/workspace/phase1.css` — dock, carril horizontal, detentes, hoja de Resultados y estados Clay.
- `src/i18n/catalogs.ts` — textos accesibles en español e inglés.
- `src/features/canvas/ToolRail.test.tsx`, `src/features/results/ResultsPanel.test.tsx`, `src/features/inspector/Inspector.test.tsx` — contratos de las rutas y de las nuevas interacciones.
- `scripts/qa-clay-mobile-density-phase5.mjs` — QA Chromium con cuatro composiciones reales.
- `reports/evidence/2026-08-21-clay-mobile-density-phase-5/` — capturas y resumen de QA.

## Cómo verificar

```powershell
npm.cmd run typecheck
npm.cmd exec vitest run src/features/canvas/ToolRail.test.tsx -- --maxWorkers=1
npm.cmd exec vitest run src/features/results/ResultsPanel.test.tsx -- --maxWorkers=1
npm.cmd exec vitest run src/features/inspector/Inspector.test.tsx src/features/workspace/useWorkspaceLayoutPreferences.test.tsx -- --maxWorkers=1
npm.cmd run lint
npm.cmd run verify:docs
npm.cmd run verify:protected
npm.cmd run build
node scripts/qa-clay-mobile-density-phase5.mjs
```

Resultados observados:

- Typecheck: PASS.
- ToolRail: 13/13 PASS.
- Resultados: 17 PASS, 3 skipped existentes.
- Inspector + preferencias: 39/39 PASS.
- Lint: PASS sin errores; conserva 12 warnings preexistentes fuera del diff.
- Documentación: PASS, 39 documentos clasificados.
- Frontera protegida: PASS, 38/38 archivos.
- Build: PASS; conserva el warning heredado de chunks mayores a 500 kB.
- QA Chromium: PASS, 4/4 escenarios (X2 Día, M1 Noche, K0 Día y K0 Noche), sin overflow horizontal, sin `backdrop-filter`, sin errores de consola y con CTA de texto blanco.

## Gate global no concluyente

`npm.cmd test` no se declara PASS. Al iniciarse en esta rama, `src/App.test.tsx` reportó 9 fallos y la ejecución quedó detenida después de ese archivo con CPU prácticamente nula. La ejecución se interrumpió tras varias comprobaciones idénticas. No se atribuyen esos fallos a esta fase sin una línea base limpia; los tests focales de los archivos intervenidos sí aprobaron.

## Pendiente / siguiente paso

- **Fase 6:** rediseñar por completo la Top Bar: estructura, agrupación, nombres, ritmo, acciones y estados para X2, M1 y K0; no será un cambio de color sobre el layout existente.
- **Fase 7:** rediseñar Home/Inicio desde cero, con jerarquía equivalente a los boards aprobados: bienvenida, proyecto principal, accesos útiles y recientes/biblioteca con densidad real.
- Mantener la corrección final de errores visuales como remate transversal, una vez terminadas esas dos superficies prioritarias.
