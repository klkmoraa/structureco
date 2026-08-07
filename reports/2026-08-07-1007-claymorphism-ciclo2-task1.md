# Base compartida de claymorphism — ciclo 2, tarea 1

**Fecha:** 2026-08-07 10:17
**Agente:** Codex
**Rama:** main

## Qué cambió

Se añadió el rol semántico `--sc-color-border-canvas-chrome`, medido a 3:1 o más contra el lienzo en Día y Noche. La materia clay quedó centralizada en `material.css`, cargada de forma eager desde `App.tsx`, mientras `.sc-surface` conserva sólo radio y transición.

`Surface` ahora acepta `button`, `header` y `nav` mediante su prop `as`. También se retiraron sólo los primitivos sin consumidores `--sc-sky-500` y `--sc-lilac-500`.

## Por qué

La Tarea 1 del ciclo 2 establece contratos reutilizables para el chrome del lienzo y las siguientes migraciones de superficies. El borde específico evita que los controles flotantes dependan del desenfoque para separarse del dibujo, y el material por niveles elimina la repetición de fondo, borde y sombras.

La resolución vinculante del controller aplaza la retirada de `--sc-surface-glass*`, `--sc-blur-glass` y `--sc-blur-chrome` a la Tarea 9; sus consumidores de bienvenida y sus contratos de test permanecen intactos.

## Archivos tocados

- `src/design-system/tokens.css` — rol de borde de chrome y limpieza de dos primitivos huérfanos.
- `src/design-system/tokens.test.ts` — contrato de contraste para el rol nuevo.
- `src/design-system/material.css` — niveles reutilizables flat, raised, floating y pressed.
- `src/App.tsx` — import eager de la materia después de `styles.css`.
- `src/styles.css` — `.sc-surface` conserva forma y delega la materia.
- `src/design-system/components/surface.tsx` — amplía `as` a button/header/nav.
- `src/design-system/components/surface.test.tsx` — pruebas de elementos interactivos y landmarks.

## Cómo verificar

```powershell
npx.cmd vitest run src/design-system/tokens.test.ts
npx.cmd vitest run src/design-system/components/surface.test.tsx src/features/welcome/
npx.cmd vitest run src/design-system/components/dependencyBoundary.test.ts src/design-system/tokens.test.ts
npm.cmd run lint
npx.cmd vitest run
npm.cmd run typecheck
npm.cmd run build
```

Resultados de esta ejecución: tokens 20/20; Surface y bienvenida 26/26; frontera y tokens 23/23; suite completa 97 archivos y 735 pruebas; lint, typecheck y build correctos.

## Pendiente / siguiente paso

La retirada de vidrio y la relajación de sus dos listas de contrato quedan explícitamente para la Tarea 9. No hay pendientes dentro del alcance de la Tarea 1.
