# Workspace Clay: command island, dock y responsive

**Fecha:** 2026-08-22 06:45
**Agente:** Codex
**Rama:** `codex/clay-workspace-phase-2`
**Clasificación:** `AUDIT/TEMPORARY`

## Qué cambió

Se rediseñó la estructura visible del Workspace en Día y Noche: la Top Bar ahora es una command island mate de tres zonas; la barra lateral de escritorio se convirtió en un dock horizontal flotante y compactable; Results usa una sola barra de magnitudes con overflow real; y el Inspector ocupa menos espacio útil.

En móvil se eliminó la duplicación de herramientas, se compactó la Top Bar a una sola fila, se dejó un único dock inferior y las magnitudes de resultados ahora se desplazan horizontalmente. En tablet se ajustaron las separaciones entre Inspector, acciones contextuales y canvas para evitar solapes.

Los estados técnicos conservan la misma identidad en ambos temas: Axial azul, Cortante verde, Momento coral y Deformada violeta. El botón Analizar usa texto blanco sobre verde.

## Por qué

El Workspace anterior conservaba demasiada estructura heredada: controles repetidos, columnas rígidas, botones persistentes sin jerarquía y poco espacio para el modelo. Esta fase reemplaza esa composición completa por controles más físicos, claros y dinámicos sin modificar el canvas estructural ni la lógica de análisis.

## Archivos tocados

- `src/features/topbar/TopBar.tsx` y `topbar.css` — command island, jerarquía y responsive.
- `src/features/canvas/ToolRail.tsx` — dock X2 de cuatro grupos, estado compacto y continuidad M1/K0.
- `src/features/results/ResultsPanel.tsx` — barra única de magnitudes y menú de resultados secundarios.
- `src/features/workspace/WorkspaceShell.tsx` y `phase1.css` — composición, profundidad y reglas responsive.
- `src/i18n/catalogs.ts` — nombres accesibles para overflow y dock.
- Pruebas focales de Top Bar, Tool Rail y Results Panel.

## Cómo verificar

```powershell
npm.cmd test -- src/features/topbar/TopBar.test.tsx src/features/canvas/ToolRail.test.tsx src/features/results/ResultsPanel.test.tsx --reporter=dot
npm.cmd run typecheck
npm.cmd run lint -- --quiet
npm.cmd run build
npm.cmd run verify:protected
git diff --check
```

Resultado: 53 pruebas focales PASS y 3 SKIP documentados; Results Panel 18 PASS y 3 SKIP después del ajuste final de foco; typecheck PASS; lint PASS; build PASS; frontera protegida 38/38; `git diff --check` sin errores.

QA visual en Chromium: 1440×1000 Día/Noche, 1180×820, 1024×768 y 390×844. Sin overflow horizontal, errores de consola ni controles duplicados.

## Pendiente / siguiente paso

Continúa el rediseño de superficies especializadas: Project Hub, Aula, Datasheet, Model Doctor, Import Center, Generator y Space 3D. No se hizo push.
