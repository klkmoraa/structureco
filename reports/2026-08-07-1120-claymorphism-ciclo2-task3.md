# Claymorphism ciclo 2 — tarea 3: sombras clay en `ui.css`

**Fecha:** 2026-08-07 11:51
**Agente:** Codex
**Rama:** main

## Qué cambió
Se migraron los cinco consumidores de elevación de la biblioteca `sc-*` desde la familia plana AG-015 a la escala clay: segmentado activo, tooltip, popover, modal y thumb del switch de capas.

Se añadió un contrato textual en `tokens.test.ts` que impide que `ui.css` vuelva a consumir sombras planas.

## Por qué
El ciclo 1 dejó `ui.css` con sombras paralelas al nuevo lenguaje clay. Esta tarea elimina esa deuda aislada antes de rediseñar el workspace y evita que componentes futuros reintroduzcan `--sc-shadow-raised`, `--sc-shadow-floating` o `--sc-shadow-modal`.

## Archivos tocados
- `src/design-system/components/ui.css` — reemplaza cinco elevaciones planas por `clay-xs`, `clay-sm`, `clay-md` y `clay-floating` según jerarquía.
- `src/design-system/tokens.test.ts` — añade el contrato que prohíbe la familia plana en `ui.css`.
- `reports/2026-08-07-1120-claymorphism-ciclo2-task3.md` — este reporte.

## Cómo verificar
- RED reconstruido contra `1b35d68`: el mismo contrato detecta `--sc-shadow-raised`, `--sc-shadow-floating` y `--sc-shadow-modal`.
- `npx.cmd vitest run src/design-system/tokens.test.ts src/design-system/components` — 9 archivos, 60 pruebas verdes.
- `npm.cmd run lint; npx.cmd vitest run; npm.cmd run typecheck; npm.cmd run build` — 97 archivos / 738 pruebas, lint, tipos y build verdes.
- `http://127.0.0.1:5173/__components` — Playwright verificó segmentado, tooltip, popover, modal y switch en Claro/Oscuro: todos conservan al menos tres capas, dos `inset`, opacidad final 1 y cero errores de consola. Día usa cuatro capas; Noche usa tres por definición deliberada de los tokens.

## Pendiente / siguiente paso
La implementación está cerrada. La siguiente tarea migra `TopBar` del vidrio al material clay eager. No se hizo push.