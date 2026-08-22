# Limpieza del árbol operativo

**Fecha:** 2026-08-22 11:43
**Agente:** Codex
**Rama:** `main`

## Qué cambió

Se retiraron 713 reportes y capturas de QA históricos, 21 planes cerrados y 15 especificaciones superadas del árbol de trabajo. Permanecen los assets Three.js de producto, la especificación visual vigente y los scripts que todavía validan o regeneran funcionalidades actuales.

Se simplificaron las reglas de contribución y el índice documental. Las salidas regenerables de QA ahora están ignoradas; los tres oráculos vigentes de Home, assets estructurales e Illustration Studio tienen comandos `npm` explícitos. También se retiró el QA de Fase 2 que no tenía entrada de ejecución ni servidor propio, junto con su fixture exclusivo.

## Por qué

La persona usuaria autorizó una limpieza amplia del repositorio, incluido quitar archivos y reglas que ya no aportaban al producto. Antes de borrar se comprobó que los materiales retirados no tuvieran consumidor de runtime y que los assets Three.js, contratos de estructura y herramientas vigentes continuaran teniendo una ruta real de uso.

## Archivos tocados

- `reports/**` — se eliminó el historial operativo versionado; se conserva esta política y el handoff actual.
- `docs/superpowers/plans/**` — se retiraron 21 planes de fases cerradas.
- `docs/superpowers/specs/**` — se retiraron 15 especificaciones superadas; permanece `2026-08-22-structureco-total-visual-redesign.md`.
- `docs/README.md`, `AGENTS.md` y `.gitignore` — se redujeron reglas, se aclaró la jerarquía y se ignoró `reports/evidence/`.
- `docs/architecture/structureco-datasheet.md`, `docs/architecture/structureco-fase-4-gates.md`, `qa.mjs`, `src/features/workspace/shellComposition.ts` — se quitaron referencias a evidencia eliminada.
- `package.json` — se registraron QA de Home, assets e Illustration Studio; `verify:space3d` ahora incluye su test Node de política.
- `scripts/qa-phase2.mjs`, `scripts/fixtures/phase2-line.dxf` — se retiraron por no tener consumidor, comando ni entorno de ejecución propio.

## Cómo verificar

- `npm.cmd run verify:docs` — 2/2 pruebas y 10 documentos clasificados.
- `npm.cmd run typecheck` — completado sin errores.
- `npm.cmd run verify:protected` — 38 archivos protegidos verificados.
- `node --test scripts/check-space3d-capacity.test.mjs` — 9/9 pruebas.
- `node scripts/check-space3d-capacity.mjs` — capacidad aprobada: 150 nudos / 300 barras.
- `npm.cmd run verify:structural-assets` — 6/6 pruebas; 80 PNG Three.js, Día/Noche, 900×600 y transparencia verificados.
- `npm.cmd run build` — build de producción completado.

## Pendiente / siguiente paso

Reejecutar `npm.cmd run verify:space3d` completo cuando el runner compartido esté libre: la ejecución de Vitest inició y avanzó, pero no cerró en esta sesión aunque sus contratos Node y la compilación sí terminaron. El historial retirado se recupera desde Git si hace falta trazabilidad.
