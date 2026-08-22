# Consolidación del árbol operativo y cierre de gates

**Fecha:** 2026-08-22 14:04
**Agente:** Codex
**Rama:** `main`

## Qué cambió

Se terminó la depuración del árbol operativo autorizada para StructureCo y se
dejaron los caminos vigentes explícitos:

- Se retiraron scripts y fixtures históricos sin consumidor actual:
  `scripts/qa-clay-*-phase*.mjs`, `scripts/qa-clay-reconciliation.mjs`,
  `scripts/measure-datasheet-performance.mjs` y los dos fixtures de
  `large-model`. El generador de producto que vive en
  `src/data/generators/structureGenerators.ts` permanece intacto.
- Se documentaron los oráculos reales de shell, resultados, assets y Space 3D
  en `package.json` y `docs/README.md`, incluido `assets:generate`.
- Se corrigieron los QA de Home/resultados para consumir las rutas actuales de
  navegación, el launcher brokerizado móvil y el selector de idioma real.
  También se eliminó la dependencia de una ruta Linux fija para Playwright.
- Se corrigieron cuatro casos de formato numérico que violaban la política de
  presentación y se dio timeout local al único test Three.js que construye 40
  firmas de escena. No se elevó el timeout global.
- Se corrigió el warning de React de la acción Repetir: las dos superficies
  hermanas de `AnimatePresence` ahora tienen claves explícitas.

Los artefactos ignorados/regenerables que estaban mezclados en la raíz se
retiraron a esta cuarentena externa, reversible y fuera del checkout:
`C:\Users\crisd\.codex\structureco-quarantine-20260822`. Se movieron 47
directorios/paquetes explícitos; no se eliminó ningún árbol de otro agente ni
se borró permanentemente información versionada.

## Por qué

El árbol contenía fases cerradas, scripts que ya no correspondían a la
implementación actual y salidas generadas que podían confundirse con fuentes
del producto. La limpieza conserva los consumidores vigentes, hace visibles
los comandos de verificación y evita que una ruta QA obsoleta dicte el diseño o
el comportamiento actual.

## Archivos tocados

- `package.json`
- `docs/README.md`
- `scripts/qa-welcome.mjs`
- `scripts/qa-results-cards.mjs`
- `src/features/canvas/RepeatActionOverlay.tsx`
- `src/features/project-hub/ProjectHub.tsx`
- `src/features/structural-assets/geometry.tsx`
- `src/features/structural-assets/studio/IllustrationStudio.tsx`
- `src/features/structural-assets/studio/presetRepository.ts`
- `src/features/structural-assets/threeStructuralRender.test.ts`
- `scripts/fixtures/large-model.mjs` (eliminado)
- `scripts/fixtures/large-model.test.mjs` (eliminado)
- `scripts/measure-datasheet-performance.mjs` (eliminado)
- `scripts/qa-clay-compact-generator-phase4.mjs` (eliminado)
- `scripts/qa-clay-home-phase7.mjs` (eliminado)
- `scripts/qa-clay-mobile-density-phase5.mjs` (eliminado)
- `scripts/qa-clay-reconciliation.mjs` (eliminado)
- `scripts/qa-clay-results-phase3.mjs` (eliminado)
- `scripts/qa-clay-topbar-phase6.mjs` (eliminado)
- `scripts/qa-clay-workspace-phase2.mjs` (eliminado)

## Cómo verificar

- `npm.cmd test -- --reporter=dot` — **PASS**: 244 archivos; 2363 pruebas
  aprobadas y 8 omitidas (2371 totales), con `--maxWorkers=1`, pool de hilos y
  sin paralelismo por archivo.
- `npx.cmd vitest run src/App.test.tsx --maxWorkers=1 --pool=threads
  --no-file-parallelism` — **PASS**: 33/33.
- Flujo Repetir focal — **PASS**: 1/1, sin warning de claves duplicadas.
- `npm.cmd run lint` — **PASS** con seis advertencias preexistentes de
  Fast Refresh/dependencias en prototipo iOS, `ContextualActions`,
  `ThreeStructuralImage` y `WorkspaceShell`.
- `npm.cmd run typecheck` — **PASS**.
- `npm.cmd run build` — **PASS**; compilación de producción completada.
- `npm.cmd run verify:docs` — **PASS**, 2/2 pruebas y documentos clasificados.
- `npm.cmd run verify:protected` — **PASS**, 38 archivos protegidos.
- `npm.cmd run verify:structural-assets` — **PASS**, 6/6; 80 PNG Three.js de
  Día/Noche, 900×600 y transparentes.
- `node --test scripts/check-space3d-capacity.test.mjs` y
  `node scripts/check-space3d-capacity.mjs` — **PASS**, 9/9; capacidad
  aprobada de 150 nudos y 300 barras.
- `npm.cmd run verify:perf` — **PASS**, sin superar el techo bloqueante.
- `npm.cmd run validate:ci` — **PASS**.
- `node scripts/qa-shell-composition.mjs` — **PASS** en X2, M1, K0,
  orientación vertical/horizontal, transiciones, teclado y continuidad.
- `node scripts/qa-results-cards.mjs` — **PASS** en X2, M1, K0, inglés,
  launcher/drawer, fullscreen, foco y Datasheet plano.

Las salidas de capturas y QA quedan en `reports/evidence/`, ignoradas por Git.

## Alcance protegido

No se modificaron solver, cálculos, signos, unidades, IDs del modelo,
topología, workers, persistencia, import/export, undo/redo ni resultados. Los
cambios de formato son de presentación/serialización de dibujo y no alteran
los valores del modelo.

## Pendiente / siguiente paso

Publicar este `main` en GitHub y regenerar `gh-pages` desde el SHA exacto de
este commit. Después se comprobarán por separado los SHA remotos y la URL
pública de Pages.
