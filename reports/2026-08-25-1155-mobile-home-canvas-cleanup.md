# Limpieza de Inicio y lienzo móvil

**Fecha:** 2026-08-25 11:55
**Agente:** Codex
**Rama:** codex/ux-feedback-dock-polish

## Qué cambió

Inicio en Compact dejó de depender de carruseles horizontales: los accesos rápidos quedan visibles y proyectos, plantillas y casos de Aula siguen el desplazamiento vertical. El héroe móvil se compactó sin retirar la ilustración estructural.

En el lienzo Compact se retiraron el zócalo redundante de selección, el affordance de Repetir y el lanzador flotante del Inspector que asomaba debajo del dock. Editar selección permanece en `Más herramientas` y el Inspector conserva su ruta con nombre en Utilidades.

El preset Resultados ya no activa el mapa de demanda. La capa sólo se muestra tras una activación explícita en Capas, y la persistencia distingue ese opt-in de estados antiguos encendidos por el preset.

## Por qué

Corrección solicitada a partir de cuatro capturas reales de iPhone: Inicio mostraba opciones cortadas, un botón sin contexto se perdía bajo el dock y varias superficies competían con el diagrama. La intención es devolver espacio al modelo y dejar las acciones secundarias en rutas con nombre.

## Archivos tocados

- `src/features/welcome/totalHome.css` — composición vertical y héroe Compact más corto.
- `src/features/canvas/StructuralCanvas.tsx` — elimina chrome contextual y Repetir en K0 sin cambiar selección ni comandos de dominio.
- `src/features/canvas/editorLayers.ts` — mapa de demanda opt-in y migración de preferencia visual.
- `src/features/workspace/WorkspaceShell.tsx` — retira el lanzador flotante sólo en K0.
- `src/features/topbar/TopBar.tsx` — conserva retorno de foco desde la ruta Utilidades → Inspector.
- `src/App.test.tsx`, `src/features/canvas/CanvasLayers.test.tsx`, `src/features/canvas/editorLayers.test.ts`, `src/features/welcome/totalRedesignHome.test.tsx` — contratos focales de la corrección.
- `scripts/qa-structural-edits.mjs`, `qa.mjs` — QA ajustada a la ruta móvil con nombre y a la ausencia de chrome redundante.

## Cómo verificar

- `npx.cmd vitest run src/features/canvas/editorLayers.test.ts src/features/welcome/totalRedesignHome.test.tsx src/features/canvas/CanvasLayers.test.tsx src/features/canvas/StructuralCanvas.contextualActions.test.tsx src/features/canvas/ContextualActions.test.tsx src/features/canvas/StructuralEditOverlay.test.tsx src/features/canvas/ToolRail.test.tsx src/features/topbar/TopBar.test.tsx --maxWorkers=1 --pool=threads --no-file-parallelism` → 80/80 PASS.
- Pruebas Compact de `src/App.test.tsx` (chrome limpio e Inspector por Utilidades) → 2/2 PASS.
- `npm.cmd run qa:home` → PASS, siete capturas; 390×844 Día/Noche sin overflow y con los tres accesos visibles.
- `npm.cmd run qa:structural-edits` → PASS en Chromium.
- `npm.cmd run qa:structural-edits:webkit` → PASS en WebKit.
- `npm.cmd run qa:webkit` → PASS en iPhone 13/iPad; Inicio desplaza, accesos y proyectos son alcanzables, objetivos táctiles ≥44 px.
- `npm.cmd run lint` → código 0, con seis warnings existentes.
- `npm.cmd run verify:protected` → `Frontera protegida intacta: 38 archivos verificados.`
- `git diff --check` → PASS.

La ejecución completa de `src/App.test.tsx` conserva un fallo ajeno a este cambio: la prueba histórica espera foco en `Resultados` al cerrar, mientras `WorkspaceShell` en HEAD lo devuelve intencionalmente a `.utility-more-button`. El resto de esa corrida fue 53 PASS; no se alteró ese contrato colateral.

## Pendiente / siguiente paso

Falta autorización explícita para `git push` y cualquier publicación de Pages. El reporte ajeno sin seguimiento `reports/2026-08-23-cri-29-action-contract-audit.md` se preservó y no forma parte de este cambio.
