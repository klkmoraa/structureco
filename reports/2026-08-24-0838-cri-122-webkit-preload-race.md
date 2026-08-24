# CRI-122 — aislar carrera de preload/import en WebKit

**Fecha:** 2026-08-24 08:38
**Agente:** Codex
**Rama:** codex/ux-feedback-dock-polish

## Qué cambió

El runner general de WebKit reutiliza ahora las ayudas del arnés para desactivar el ciclo de actualización del service worker durante QA y limpiar la biblioteca antes del arranque. Se conserva la espera observable del stylesheet lazy de `WorkspaceShell`.

## Por qué

El baseline de `npm.cmd run qa:webkit` reproducía un fallo de módulo en iPhone 13 y un fallo de preload CSS en iPad Pro 11. La instrumentación mostró que `PwaUpdateNotice` podía actualizar el service worker mientras se cargaban los chunks dinámicos; WebKit cancelaba esas solicitudes y el runner las reportaba como errores de import/preload.

## Archivos tocados

- `qa-webkit.mjs` — aísla el ciclo PWA y reutiliza la limpieza de biblioteca existente antes de navegar.
- `reports/2026-08-24-0838-cri-122-webkit-preload-race.md` — deja la causa, el alcance y la evidencia de cierre.

## Cómo verificar

- `node --check qa-webkit.mjs; node --check scripts/qa-welcome.mjs` — PASS.
- `npx.cmd oxlint qa-webkit.mjs scripts/qa-welcome.mjs` — PASS, exit 0.
- `npm.cmd run verify:protected` — PASS, 38 archivos verificados.
- `npm.cmd run qa:webkit` — PASS en iPhone 13 e iPad Pro 11; `errors: []`, importación JSON/PDF y checks táctiles/responsive PASS.
- `npm.cmd run qa:structure-generator:webkit` — PASS.
- `git diff --check` — PASS.

El gate `npm.cmd run qa:structural-edits:webkit` alcanzó sus escenarios hasta CRI-97 y falló en el oracle ajeno `cri97CompactHasNoOrphanedContextualActionsSurface` (`scripts/qa-structural-edits.mjs:536`); no se modifica ni se clasifica como parte de CRI-122.

## Pendiente / siguiente paso

No queda trabajo funcional pendiente dentro de CRI-122. El commit y su reporte quedan listos localmente; el push requiere autorización explícita. El fallo focal de CRI-97 permanece separado para su tarea correspondiente.
