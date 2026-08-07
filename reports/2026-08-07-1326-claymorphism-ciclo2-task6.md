# Claymorphism ciclo 2 — tarea 6: chrome del lienzo opaco con borde medido

**Fecha:** 2026-08-07 13:58
**Agente:** Codex
**Rama:** main
**Base:** `60f60d7`

## Qué cambió

Los doce elementos de chrome que flotan sobre el lienzo consumen ahora un único grupo eager en `material.css`: relleno opaco `--sc-color-surface-2`, borde de 1 px con `--sc-color-border-canvas-chrome` y sombra `--sc-shadow-clay-floating`. `styles.css` conserva geometría, tipografía e interacción, pero ya no repite fondo, borde estructural, sombra ni blur para esos contenedores.

Se preservaron los tratamientos semánticos: `placing-load` conserva su borde de fuerza y usa sombra clay; el feedback mantiene el borde warning con especificidad contextual; y los estados hover/active de capas siguen intactos. No se cambió ningún valor `--canvas-safe-*`.

`qa.mjs` mide Chromium real sobre `.canvas-mode-badge` y `.canvas-controls`: ausencia de backdrop estándar/WebKit, borde exacto de 1 px solid cuyo color coincide con el token resuelto, y al menos dos capas `inset` en la sombra.

## Por qué

Al retirar el vidrio, el chrome técnico ya no podía depender del desenfoque del dibujo para separarse del lienzo. El borde específico del ciclo alcanza el contraste no textual medido en ambos temas, mientras el material eager evita repetir la receta en múltiples reglas lazy de `styles.css`.

## Archivos tocados

- `qa.mjs` — añade propiedades computadas, resolución real del token y `verifyCanvasChromeClayMaterial` conectado a desktop.
- `src/design-system/material.css` — añade el grupo único de chrome y renombra a `--toolbar-clay-border-width` el hook local heredado del rail.
- `src/styles.css` — retira materia/blur duplicados, limpia excepciones de transparencia, conserva estados y renombra el mismo hook local sin cambiar valores.
- `reports/2026-08-07-1326-claymorphism-ciclo2-task6.md` — reporte rastreado.
- `.superpowers/sdd/2026-08-07-claymorphism-ciclo2/task-6-report.md` — ledger SDD ignorado.

## Cómo verificar

- Guardián: `main@60f60d7b40fe`, `structureco@0.8.2`, respaldo externo en `%TEMP%/structureco-task6-60f60d7-20260807-134602`, 63 archivos de rutas protegidas inventariados y `capturas.mjs` registrado sin editar.
- RED check-only: con `material.css` y `styles.css` todavía en sus SHA-256 iniciales, `npm.cmd run build` pasó y `node qa.mjs` falló exactamente `canvasChromeHasNoBackdropFilter`, `canvasChromeHasMeasuredBorder` y `canvasChromeHasFloatingClayShadow`.
- GREEN: tras la implementación mínima, `npm.cmd run build` pasó y `node qa.mjs` terminó con los tres checks T6 en `true`, consola vacía y `pageErrors` vacío.
- Mutación: cambiar temporalmente el borde del grupo a `1px solid currentColor` hizo fallar `canvasChromeHasMeasuredBorder`. La primera corrida incluyó además la carrera conocida de welcome; la única repetición permitida falló exclusivamente el check de borde.
- Restauración: `material.css` recuperó byte por byte el SHA-256 pre-mutación `96F204C4B71BB490771CF34FB9D02595165D22046061B87FE6BF341FAF5EFC04`.
- Tokens focused: la primera corrida detectó una deuda heredada de `60f60d7` (`--sc-toolbar-clay-border-width` era un hook local con namespace de design token). Se renombró en sus cuatro usos, sin cambiar valores; `npx.cmd vitest run src/design-system/tokens.test.ts` terminó con 1 archivo y 22/22 pruebas verdes.

## Pendiente / siguiente paso

Por instrucción del checkpoint, una vez terminados RED/GREEN/mutación/restauración no se lanzaron gates largos adicionales. El QA GREEN ocurrió antes del renombre semánticamente neutro del hook local; el controlador debe ejecutar el QA/full gate fresco y la revisión visual sobre modelo denso en Day/Night y 390×844.

No se abrió dev server ni navegador visual, no se ejecutó WebKit ni suite completa, no se tocaron safe areas, rutas protegidas o `capturas.mjs`, y no se hizo push.
