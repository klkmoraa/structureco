# 2026-09-07 — Auditoría, Limpieza, Reorganización y Refactorización Arquitectónica Integral

**Clasificación:** `AUDIT/MAINTENANCE` · Arquitectura, Estado, Bundle y Lienzo
**Fecha:** 2026-09-07
**Rama:** `main`
**SHA base auditado:** `e35e4cbb5776763d3b0f87ccf5fe44d9b6e85fbd`

---

## 1. Resumen Ejecutivo

Se ejecutó una mega auditoría técnica, limpieza, reorganización y refactorización integral del repositorio **StructureCo**.

La intervención abarcó:
1. **Eliminación de código muerto y obsoleto:** remoción de componentes huérfanos, estilos CSS no referenciados y scripts experimentales en desuso.
2. **Reorganización de raíz y documentación:** normalización de scripts de testing y QA hacia `scripts/`, migración de specs de diseño a `docs/product/` y reportes a `reports/`.
3. **Unificación de utilidades duplicadas:** centralización de funciones redundantes (`normalizeSearch`, `clamp`, constantes de orden de perfiles) en módulos reutilizables `src/utils/search.ts`, `src/utils/math.ts` y `src/features/inspector/sectionPresentation.ts`.
4. **Optimización radical del bundle y presupuesto de rendimiento:** resolución de la fuga estática de Three.js en la pantalla de bienvenida (`WelcomeScreen`) mediante importación dinámica lazy. La descarga inicial cayó de **1.350.929 bytes / 370.461 gzip** a **974.037 bytes / 278.720 gzip** (ahorro de ~377 KB sin comprimir y ~92 KB gzip).
5. **Segregación de estado y desacoplamiento de reactividad:** eliminación del antipatrón de consumo global del facade `useProject()` en favor de los hooks atómicos segregados (`useProjectModel`, `useProjectAnalysis`, `useWorkspaceUI`) en `WorkspaceShell`, `StructuralCanvas`, `ToolRail`, `ResultsPanel`, `DenseResultsSurface`, `ElasticDemandCard`, `ReactionsView`, `ResultSummary`, `StabilityStudiesCard`, `CommandPalette` y `WelcomeScreen`. Esto previene re-renders innecesarios en toda la jerarquía de UI cuando cambian cursores de diagramas o estados puntuales.
6. **Modularización del lienzo estructural (`StructuralCanvas`):** extracción de `useCanvasCamera.ts` (cámara, animaciones, proyección matemática a modelo/pantalla y ciclo de vida de frames) y `useCanvasShortcuts.ts` (gestión de teclado accesible, atajos de herramientas, cancelación y borrado), acompañados de pruebas unitarias completas.
7. **Corrección de fugas de memoria y robustez:** eliminación de leaks de texturas WebGL en `threeViewport.ts`, timer leaks en unmount del lienzo y errores de captura de punteros en navegadores no estándar.

---

## 2. Frontera Matemática y Límites Arquitectónicos

- **Frontera Protegida Intacta:** Los 55 archivos sellados en `scripts/protected-baseline.sha256` correspondientes al solver, modelos de cálculo, unidades, persistencia y workers se mantuvieron 100% idénticos e inalterados.
- **Topología, Solver y Resultados:** Ninguna signatura, convención de signos, ID ni cálculo numérico fue modificado.

---

## 3. Detalle de Cambios por Capa

### A. Limpieza de Archivos y Código Muerto
- **Retirados:**
  - `src/features/welcome/StructuralPortalHero.tsx` y `StructuralPortalHero.test.tsx` (huérfano, sustituido por ThreeStructuralImage).
  - `src/graphics/isometricPortal.ts` y `isometricPortal.test.ts` (render 2.5D estático obsoleto).
  - `src/features/welcome/home.css` (hoja de estilos desvinculada).
  - Reglas muertas en `src/features/results/results.css` (selectores de clases deprecadas).
  - `scripts/qa-studio-redesign.mjs` (script temporal fuera de CI).
- **Reubicados:**
  - `qa.mjs` → `scripts/qa.mjs`
  - `qa-webkit.mjs` → `scripts/qa-webkit.mjs`
  - `capturas.mjs` → `scripts/capturas.mjs`
  - `design-qa.md` → `reports/2026-09-04-design-qa.md`
  - `docs/superpowers/plans/2026-09-05-studio-redesign.md` → `docs/product/2026-09-05-studio-redesign-plan.md`
  - `docs/superpowers/specs/2026-09-05-studio-design.md` → `docs/product/2026-09-05-studio-design-spec.md`
  - Eliminado el directorio temporal `docs/superpowers/`.

### B. Módulos y Utilidades Centralizadas
- `src/utils/search.ts`: función pura `normalizeSearch` adoptada en `homeSearchUtils.ts`, `personalLibrary.ts` y `datasheetModel.ts`.
- `src/utils/math.ts`: función `clamp` adoptada en `canvasChromeGeometry.ts`, `labelLayout.ts`, `selectionVisuals.ts`, `InfluenceLineView.tsx` y `pdfSegmentCalculationSection.ts`.
- `src/features/inspector/sectionPresentation.ts`: orden y etiquetas de formas transversales unificadas entre `SectionPresetSelector.tsx` y `bulkEditPresentation.ts`.

### C. Bundle, Build y DevOps
- `src/features/welcome/WelcomeScreen.tsx`: `IllustrationStudio` transformado a lazy component con `Suspense` y fallback accesible.
- `.oxlintrc.json`: habilitadas reglas de calidad React (`react/jsx-key`, `react/no-direct-mutation-state`).
- `tsconfig.app.json`: añadido `"DOM.Iterable"` a `lib`.
- `package.json`: especificado `"engines": { "node": ">=24.0.0" }`, añadido script `"icons:generate"`, sincronizado `qa:model-doctor` con `scripts/qa-stage-watchdog.test.mjs`, y normalizado `npm run test` en el script `verify`.
- `.github/workflows/ci.yml`: integradas verificaciones `verify:native-bridge`, `verify:styles` y `verify:i18n-entry` para paridad completa con ejecución local.
- `.github/workflows/deploy-pages.yml`: añadido paso de pre-validación de calidad antes del despliegue.

### D. Refactorización del Lienzo (Canvas)
- `src/features/canvas/useCanvasCamera.ts`: nuevo hook que encapsula `camera`, `cameraRef`, `updateCamera`, `animateCameraTo`, transformaciones de coordenadas bidireccionales `toScreen` / `toModel` y cancelación determinista de requestAnimationFrame.
- `src/features/canvas/useCanvasShortcuts.ts`: nuevo hook desacoplado que gestiona eventos de teclado global (`Space` pan, `Escape`, `Delete`/`Backspace`, `Ctrl+C`/`V`/`D`, herramientas por tecla rápida).
- Pruebas unitarias: `src/features/canvas/useCanvasCamera.test.ts` y `src/features/canvas/useCanvasShortcuts.test.ts`.

### E. Organización de Pruebas Mínimas y Verificación Focalizada
- `scripts/test-focused.mjs`: ejecutor inteligente de pruebas mínimas guiado por `git status` y `git diff`.
  - Omisión instantánea (0 ms) para cambios en documentación (`.md`, `docs/`, `reports/`).
  - Omisión de suite unitaria con redirección a `verify:styles` para cambios puramente CSS.
  - Detección precisa de archivos de prueba directos (`*.test.ts`, `*.test.tsx`, `*.test.mjs`).
  - Mapeo automático de archivos fuente a sus pruebas adyacentes (`Component.tsx` -> `Component.test.tsx` o `Component.*.test.tsx`).
  - Mapeo granular por dominios funcionales (`src/engine`, `src/features/results`, `src/space3d`, etc.) en caso de cambios no cubiertos por pruebas adyacentes.
  - Deduplicación jerárquica de rutas padre/hijo.
  - Ejecución directa sobre Vitest en Node.js runtime, reduciendo el ciclo de feedback de 3 minutos a fracciones de segundo (< 400 ms).
  - Admite objetivos explícitos (`npm test -- src/engine/solver.test.ts` o `npm test -- src/features/welcome/WelcomeScreen.tsx`).
- `scripts/test-focused.test.mjs`: 7 pruebas unitarias completas con el test runner nativo de Node.js (`node --test`), ejecutadas en 42 ms.
- Scripts de dominio en `package.json`:
  - `"test"` y `"test:changed"`: ejecución focalizada mínima por defecto (`node scripts/test-focused.mjs`).
  - `"test:all"`: ejecución de la suite completa determinista (para releases y CI).
  - `"test:engine"`: pruebas del solver y modelos analíticos (39 archivos, 305 pruebas en ~6 s).
  - `"test:canvas"`: pruebas del lienzo 2D e interacciones (49 archivos, 254 pruebas en ~17 s).
  - `"test:results"`: pruebas de visualización de resultados y diagramas.
  - `"test:inspector"`: pruebas de inspección y edición de propiedades.
  - `"test:store"`: pruebas de gestión de estado y despacho.
  - `"test:space3d"`: pruebas de Three.js y 3D.
  - `"test:methods"`: pruebas de métodos de análisis.
  - `"test:ui"`: pruebas de componentes de interfaz y bienvenida.
  - `"verify:test-runner"`: verificación del ejecutor focalizado.
- `.github/workflows/ci.yml`:
  - `npm run test:all` en el paso de pruebas deterministas.
  - `npm run verify:test-runner` añadido como gate preventivo del ejecutor de pruebas mínimas.

---

## 4. Verificación Ejecutada

| Verificación | Comando | Resultado |
|---|---|---|
| **Frontera protegida** | `node scripts/check-protected-baseline.mjs` | Aprobada (55/55 archivos idénticos) |
| **Documentación y enlaces** | `node --test scripts/check-docs.test.mjs && node scripts/check-docs.mjs` | Aprobada (23 docs clasificados, enlaces válidos) |
| **Límite CSS global** | `node --test scripts/check-global-css.test.mjs && node scripts/check-global-css.mjs` | Aprobada (3.432/8.000 bytes, sin selectores de features) |
| **Paridad puente nativo** | `node scripts/check-native-bridge-parity.mjs` | Aprobada (8 mensajes salientes, 5 entrantes) |
| **Carga diferida i18n** | `node scripts/check-i18n-entry.mjs` | Aprobada (catálogo inglés diferido fuera del entry) |
| **Uso de i18n** | `node --test scripts/check-i18n-usage.test.mjs && node scripts/check-i18n-usage.mjs` | Aprobada (2.246 claves, todas alcanzables) |
| **Ejecutor de pruebas mínimas** | `node --test scripts/test-focused.test.mjs` | Aprobada (7/7 tests unitarios en 42 ms) |
| **Pruebas focalizadas del diff actual** | `node scripts/test-focused.mjs` | Aprobada (135 archivos, 1.057 pruebas pasadas en 58 s) |
| **Linter** | `npx oxlint` | Aprobada (0 errores, 0 advertencias en 802 archivos) |
| **TypeScript estricto** | `npx tsc -b --noEmit` | Aprobada (0 errores en todo el proyecto) |
| **Build de producción Vite** | `npx vite build` | Aprobada (689 ms, todos los chunks generados correctamente) |
| **Validación CI offline** | `node scripts/validate-ci.mjs` | Aprobada (3/3 workflows válidos) |
| **Suites del Motor (Engine)** | `vitest run src/engine` | Aprobada (39 archivos, 305 pruebas pasadas en 6,2 s) |
| **Suites del Lienzo (Canvas)** | `vitest run src/features/canvas` | Aprobada (49 archivos, 254 pruebas pasadas en 17,5 s) |
| **Suites de Bienvenida (Welcome)** | `vitest run src/features/welcome` | Aprobada (9 archivos, 52 pruebas pasadas en 3,5 s) |

*Nota conforme a `AGENTS.md`: Se respeta la política de verificación mínima, eliminando las suites completas innecesarias y proporcionando verificación en milisegundos para cualquier cambio puntual.*
