# Limpieza segura del repositorio sin cambio de comportamiento

**Fecha:** 2026-08-14 21:11
**Agente:** Claude Code
**Rama:** `claude/structureco-safe-cleanup-zqkznc` (partiendo de `main` en `8b3705d`)

## Qué cambió

Se eliminó únicamente material con evidencia estática de no tener consumidores: un componente huérfano de Aula, cinco helpers de exportación/importación superados, un asset de plantilla ajena que se publicaba en cada build, el CSS legacy del antiguo "portón de resultados" de Aula, 33 claves i18n de esa misma familia muerta, y tres artefactos sueltos de sesiones previas en la raíz. Total: **1069 líneas y 5 archivos menos**, sin tocar solver, teoría estructural, schema ni UX visible.

No se modificó ningún archivo de la frontera matemática protegida (`src/engine/**`, `src/workers/**`, `src/data/**`, `src/store/ProjectContext.tsx`, `src/types.ts`), y por tanto `scripts/protected-baseline.sha256` no requiere refresco.

## Por qué

Petición del usuario: limpieza segura del repositorio, borrando sólo lo que tenga evidencia clara de ser innecesario, conservando y documentando todo lo dudoso, sin refactors grandes ni cambios de comportamiento.

## Método de evidencia

Antes de borrar se construyeron cuatro análisis estáticos sobre el árbol completo:

1. **Grafo de módulos** desde los entrypoints reales (`src/main.tsx`, todos los `*.test.tsx?`, y las referencias desde `scripts/**`, `qa*.mjs` e `index.html`), siguiendo `import`, `export … from`, `import()` dinámico, `require()` y `new URL()`. Detectó archivos inalcanzables.
2. **Referencias por símbolo**, separando valores de tipos y distinguiendo *sin ninguna referencia* (código muerto real) de *usado sólo en su propio archivo* (el `export` sobra, pero el código vive).
3. **CSS**: clases declaradas contra menciones en TSX/TS/QA, y custom properties declaradas contra `var(--…)`.
4. **i18n**: claves del catálogo contra el corpus completo, más una búsqueda explícita de construcción dinámica de claves.

Los análisis se reejecutaron después de los borrados para comprobar que no aparecía código muerto en cascada. No apareció ninguno fuera de las rutas conservadas a propósito.

## Qué se eliminó y con qué evidencia

### Componente huérfano

- `src/features/classroom/ClassroomPredictionForm.tsx` (113 líneas) — cero consumidores en todo el repositorio. Nació en `02cec58` junto a `ClassroomGuide.tsx` y `ClassroomPedagogyLevels.tsx`; esos dos sí se montan (`WorkspaceShell.tsx:264`, `ResultsPanel.tsx:970`), éste nunca se conectó. No estaba renderizado, así que su retiro no altera ninguna pantalla.

### Helpers de exportación/importación superados

El consumo real de estas utilidades pasa por el barrel `src/utils/portable.ts`, importado dinámicamente en `TopBar.tsx:269`. De ese barrel sólo se usan `createCalculationReport`, `createPortableBundle`, `shareOrDownloadPortableBytes` y `STRUCTURECO_BUNDLE_MIME`. Los siguientes quedaron sin ninguna ruta de llamada:

- `src/utils/portableDownload.ts` — `downloadCalculationReport` y `downloadStructureCoBundle`, sustituidos por `shareOrDownloadPortableBytes` (que además cubre la hoja de compartir de iOS). Con ellos salieron sus imports ya innecesarios de `calculationPdf`, `portableBundle` y `portableTypes`.
- `src/utils/calculationPdf.ts` — `createCalculationReportBlob`, envoltorio de una línea sobre `createCalculationReport`.
- `src/utils/portableFile.ts` — `importPortableFile` y el tipo `PortableImportResult`, que sólo servía de retorno suyo. El Centro de Importación usa `inspectPortableFile` directamente vía `portableImportAdapter.ts`.
- `src/features/import-export/ImportCenterDialog.tsx` — `jsonImportCenterAdapter`, instancia preconstruida sin consumidores; la fábrica interna `createJsonImportCenterAdapter` sigue usándose como fallback en la línea 221. Con ella salió el `// oxlint-disable-next-line` que existía sólo para permitir ese export.
- `src/features/datasheet/datasheetEditDraft.ts` — `EMPTY_DATASHEET_PLAN`, constante congelada sin lecturas.

### Asset sin referencias

- `public/icons.svg` (5031 B) — cero referencias en código, CSS, HTML, manifiestos o docs. Su contenido son símbolos de plantilla ajena (`bluesky-icon`, `discord-icon`, `github-icon`, `social-icon`, trazo `#aa3bff`), no de la identidad de structureCo. Al vivir en `public/` se copiaba a `dist/` **y entraba en el shell offline de la PWA** en cada release. Comprobado tras el build: ya no está en `dist/` ni en `dist/sw.js`.

### CSS legacy de Aula

Familia completa del antiguo "portón de resultados" y del comparador de predicciones, sin ninguna mención en TSX/TS ni en los scripts de QA:

- `src/styles.css` — `.classroom-guide-dock`, `.classroom-result-gate`, `.classroom-result-gate-actions`, `.classroom-result-lock`, `.classroom-result-note`, `.prediction-comparison`, `.prediction-inputs`, `.hide-classroom-results`, y el bloque `.classroom-prediction*` que quedó muerto al retirar el componente (incluidas sus reglas dentro de las media queries móviles).
- `src/design-system/material.css` — `.hide-classroom-results` sale de la lista de selectores de la superficie `flat`.

Los selectores compartidos se editaron con cuidado: `.classroom-mode-card` sigue viva y conserva sus cuatro reglas; sólo se le quitó el `.classroom-result-note` que la acompañaba. Llaves verificadas: 2350/2350 en `styles.css`, 14/14 en `material.css`.

### Claves i18n muertas

- `src/i18n/catalogs.ts` — 33 claves del espacio `classroom.*` (predicción, comparación, portón, nota de resultados), eliminadas en **ambos** catálogos (33 en `es`, 33 en `en`), de 2006 totales.

Condición de seguridad comprobada antes de tocarlas: el espacio `classroom.` **no** se construye dinámicamente en ninguna parte (no hay `` t(`classroom.…` ``, ni concatenación, ni `as TranslationKey` sobre ese prefijo). Como `TranslationKey` es una unión derivada de `es`, cualquier uso literal olvidado habría roto el typecheck; no rompió ninguno. La prueba `catalogs.test.ts`, que exige identidad estructural es/en, sigue pasando.

### Artefactos sueltos en la raíz

- `structureCo-contexto-total-autocontenido-0.8.0.zip.manifest.json` — manifiesto de un ZIP de 413 MB partido en 28 trozos **que no existen en el repositorio**, apuntando a una ruta local de Windows y a la versión 0.8.0 (actual: 0.8.2). No es verificable ni referenciado.
- `structureCo-design-exploration-final-critical-20260801.json`
- `structureCo-design-exploration-initial-critical-20260801-151246.json` — inventarios de hashes del 2026-08-01 que describen rutas ya inexistentes (`src/components/StructuralCanvas.tsx`); el árbol actual no tiene `src/components/`. Cero referencias.

Los tres entraron en `dd7bcbf` ("chore: subir configuración local de plugins y manifiestos previos de sesiones") y ninguno está clasificado en `docs/README.md`, que además prohíbe fuentes de verdad paralelas.

## Qué se conservó a propósito

| Elemento | Motivo |
|---|---|
| `structureco-sites-test/` y `structureco-sites-test-publish/` | **La mayor oportunidad pendiente**: 5.3 MB cada uno, 53 archivos cada uno, prácticamente idénticos (sólo difiere `package.json`). Son un proyecto Next.js/Cloudflare aparte, sin build, sin pruebas y sin despliegue (`netlify.toml` publica `dist/` de la raíz); su única referencia en todo el repo son dos patrones de ignorado en `.oxlintrc.json`. No se borran porque eliminar un subproyecto vendorizado completo excede una limpieza segura y requiere decisión del usuario. |
| Exports muertos en `src/engine/**`, `src/workers/**`, `src/data/**`, `src/types.ts` | Frontera matemática protegida. Quedan 7 valores sin referencias (`spacingDivisionCount`, `splitMemberAtNode`, `envelopeCoverage`, `orderFramePath`, `buildAxleTrainEnvelope`, `isProfilingActive`, `formatDisplay`). Tocarlos exigiría refrescar el baseline protegido, que requiere autorización explícita. |
| `src/space3d/engine/solver.ts` (`emptySpace3DAnalysisResult`) y `src/space3d/model/types.ts` (`zeroSpace3DDofValues`, `Space3DDofKey`) | Solver y schema de Space 3D. Fuera de alcance por instrucción. |
| `src/features/results/elasticDemand.ts` (`ElasticCoverage`) | Trabajo de CRI-42 recién aterrizado y citado en su reporte del 2026-08-14; sin beneficio en retirarlo ahora. |
| ~36 exports "superfluos" (usados sólo dentro de su archivo) | Quitarles el `export` no cambia comportamiento ni tamaño de bundle (el bundler ya hace tree-shaking) y tocaría ~20 archivos. Es churn estilístico, no código muerto. |
| ~305 claves i18n restantes sin mención textual | **No son seguras de borrar en bloque.** El repositorio construye claves dinámicamente en al menos 13 familias (`role.`, `warning.`, `topology.`, `gridMembers.`, `support.`, `family.`, `property.`, `option.`, `reason.`, `group.`, `scope.filter.`, `datasheet.error.`, `datasheet.loadFamily.`, más los prefijos `generator.` y `bulk.` vía `as TranslationKey`). Requieren una auditoría dedicada por familia. |
| 65 custom properties CSS sin lecturas | Casi todas son tokens de `design-system/tokens.css` (paleta, escalas, z-index). La identidad visual está declarada como protegida en `brand/README.md`. |
| 147 clases CSS reportadas como "sin mención" | Se verificó que la gran mayoría son falsos positivos por construcción dinámica (`sc-button--${variant}`, `tool-${id}`, `is-${estado}`, `sc-status-strip--${status}`, etc.). Sólo se borraron las comprobadas una a una. |
| `capturas.mjs` y `scripts/qa-phase2.mjs` | Herramientas ejecutables a mano, no código muerto: `capturas.mjs` documenta su propio uso en la cabecera y `qa-phase2.mjs` sigue siendo un gate válido sobre funcionalidad viva (`src/features/canvas/phase2.css`, `src/i18n/phase2Catalogs.ts`). |
| Todas las dependencias de `package.json` | Auditadas una a una: las 8 de runtime y las 13 de desarrollo tienen uso real. `@types/three` es necesario porque `three@0.185` no publica tipos propios. **No hay dependencias sin usar.** |

## Archivos tocados

- `src/features/classroom/ClassroomPredictionForm.tsx` — eliminado (huérfano).
- `public/icons.svg` — eliminado (sin referencias; salía en el build y en el shell PWA).
- `structureCo-contexto-total-autocontenido-0.8.0.zip.manifest.json` — eliminado (artefacto no verificable).
- `structureCo-design-exploration-final-critical-20260801.json` — eliminado (inventario de un árbol superado).
- `structureCo-design-exploration-initial-critical-20260801-151246.json` — eliminado (ídem).
- `src/utils/portableDownload.ts` — retirados `downloadCalculationReport`, `downloadStructureCoBundle` y sus imports huérfanos.
- `src/utils/calculationPdf.ts` — retirado `createCalculationReportBlob`.
- `src/utils/portableFile.ts` — retirados `importPortableFile`, el tipo `PortableImportResult` y el import de `AnalysisResult`.
- `src/features/import-export/ImportCenterDialog.tsx` — retirado `jsonImportCenterAdapter`, su `oxlint-disable` y el import de valor `translate` (queda como import de tipo).
- `src/features/datasheet/datasheetEditDraft.ts` — retirado `EMPTY_DATASHEET_PLAN`.
- `src/styles.css` — retiradas las reglas de la familia muerta de Aula; `.classroom-mode-card` preservada.
- `src/design-system/material.css` — `.hide-classroom-results` fuera de la lista de superficie `flat`.
- `src/i18n/catalogs.ts` — 33 claves `classroom.*` muertas fuera de `es` y de `en`.

## Cómo verificar

```bash
npm ci
npm run lint
npm run typecheck
npm run verify:docs
npm run verify:protected
npm test
npm run build
npm run verify:perf
npm run verify:space3d
```

### Comparación antes / después

| Gate | Antes (`main` 8b3705d) | Después | Veredicto |
|---|---|---|---|
| `lint` (oxlint) | 0 errores, 2 avisos (`prototypes/ios-app/src/components/Structure.tsx:40,47`) | idéntico | Sin cambio |
| `typecheck` (`tsc -b`) | limpio | limpio | Sin cambio |
| `verify:docs` | 27 documentos clasificados, enlaces válidos | idéntico | Sin cambio |
| `test` (suite completa) | 204 archivos · 2047 pasan · 1 falla · 8 omitidas | 204 archivos · 2047 pasan · 1 falla · 8 omitidas | **Idéntico** |
| `build` | correcto | correcto | Sin cambio |
| `verify:protected` | **falla**: `MODIFICADO src/engine/units.ts` | **falla**: `MODIFICADO src/engine/units.ts` | **Preexistente, idéntico** |
| `verify:perf` | 840 882 B / 219 015 B gzip | 830 288 B / 216 914 B gzip | **−10 594 B (−1,26 %) / −2 101 B gzip (−0,96 %)** |
| `verify:space3d` | — | capacidad aprobada 150 nudos / 300 barras | Correcto |

El comportamiento no cambió: mismo número de pruebas, mismas que pasan, mismas que fallan.

## Dos fallos preexistentes que esta rama no introduce ni corrige

Ambos ya estaban en `main` antes de tocar nada, verificados con el árbol limpio:

1. **`verify:protected` falla en `main`.** `src/engine/units.ts` se modificó en `4d82a55` ("feat: replantear la demanda elástica como Índice elástico estimado (CRI-42)") sin refrescar `scripts/protected-baseline.sha256`. Hash actual `b70de244…`, baseline `96f10225…`. **No se refrescó el baseline en esta rama**: hacerlo requiere autorización explícita del usuario y es exactamente la operación que el gate existe para impedir que se haga por inercia. El CI de `main` debe estar rojo por esto.

2. **`ToolBar.test.tsx > reaches the structure generator from the compact Más sheet` falla en la suite completa pero pasa aislada** (`npx vitest run src/features/canvas/ToolBar.test.tsx` → 11/11). Es contaminación de estado entre archivos, no un fallo de la prueba en sí.

## Pendiente / siguiente paso

- **Decisión del usuario**: ¿se borran `structureco-sites-test/` y `structureco-sites-test-publish/`? Son 10,6 MB y 106 archivos duplicados sin ninguna conexión con la aplicación. Es el borrado con mayor rendimiento pendiente, pero no se hace sin confirmación.
- **Decisión del usuario**: los dos fallos preexistentes de arriba. El de `verify:protected` sólo se resuelve autorizando el refresco del baseline (o revirtiendo el cambio en `units.ts`).
- Auditoría dedicada de las ~305 claves i18n restantes, familia por familia, resolviendo primero cada prefijo dinámico.
- Sin merge a `main` y sin publicar Pages, según lo pedido.
