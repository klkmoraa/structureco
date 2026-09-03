# Rediseño UI/UX: consola e Instrument

Fecha: 2026-08-30

## Entregado

- `WorkspaceShell` usa una consola permanente como único chrome principal del workspace.
- La consola contiene proyecto, paleta, acciones de superficie, herramientas, inspector, análisis, tema y modo canvas completo.
- `ToolRail` queda anidado en la consola; el lanzador de la paleta se mantiene único en el shell activo.
- La barra inferior `Instrument` concentra coordenadas, escala, censo del modelo (`N/B/C`), herramienta activa, salud del análisis y persistencia local.
- El lienzo deja de pintar el readout duplicado cuando el `Instrument` está conectado; las refs externas conservan la lectura viva de coordenadas y escala.
- La ranura contextual se resuelve como una sola capa activa en `X2`, `M1` y `K0`. Las capas desplazadas quedan suspendidas y conservan su intención para reanudarse.
- Se retiraron del shell activo el FAB antiguo, el CSS de Home sin uso y el color de tema heredado del HTML.

## Compatibilidad deliberada

Los componentes `TopBar`, el contrato legacy de `AppShellLayout` y la preferencia `toolDockPosition` siguen presentes para consumidores y tests aislados. No participan en el shell activo; se podrán retirar en una pasada posterior cuando se cierre la migración completa.

## Validación

- `npm.cmd run typecheck` — pasa.
- `npm.cmd run lint` — pasa con el warning preexistente de `CanvasDiagramStack.tsx` (`react(only-export-components)`).
- `npm.cmd run build` — pasa; Vite conserva únicamente sus warnings informativos de tamaño de chunks.
- Tests afectados (`App` + broker de superficies) — 52/52 pasan.
- La suite global base anterior a este último corte — 306 archivos, 2656 tests pasados, 5 omitidos.
- QA en navegador: 1440, 1100, 900 y 390 px; temas claro/oscuro; sin overflow horizontal. La consola mide 52 px en escritorio y 61 px como banda inferior en K0; `Instrument` mide 24 px en todos los viewports.

## Pendiente del plan original

- Consolidar por completo los breakpoints y constantes `CHROME` con la nueva geometría.
- Retirar definitivamente los archivos legacy de TopBar cuando no queden consumidores aislados.
- Ejecutar las fases de reducción de copy de Inspector/Resultados, integración equivalente en Home/Space3D y sweep final de copy.
- No se hizo commit, push ni publicación.
