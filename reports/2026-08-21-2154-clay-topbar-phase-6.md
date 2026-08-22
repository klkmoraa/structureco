# Barra superior Clay y móvil contenido — Fase 6

**Fecha:** 2026-08-21 21:54
**Agente:** Codex
**Rama:** `codex/clay-workspace-phase-2`
**Clasificación:** AUDIT/TEMPORARY

## Qué cambió

- La Top Bar se reconstruyó como una sola superficie Clay mate, con cinco roles claros: **Proyecto**, **contexto de análisis**, **acción primaria**, **salud del modelo** y **utilidades**. Conserva las tres zonas semánticas de composición (`document`, `actions`, `status`) y deja de alinear una fila de cápsulas pequeñas sin jerarquía.
- El nombre del proyecto ya no es un input persistente. Abre un panel propio, donde se puede renombrar, crear un proyecto e importar JSON. Los modelos de ejemplo se despliegan de forma intencional, por lo que móvil no abre una lista de tarjetas gigantes ni esconde Importar.
- Caso/combinación, modo, orden y unidades salen de la barra lineal y pasan a un único resumen desplegable de análisis. No se altera el estado de cálculo ni los ajustes guardados.
- **Analizar** es la única acción verde dominante y usa texto blanco tanto en Día como en Noche. Model Doctor y Estado permanecen separados y visibles como señales de salud, sin mezclar fiabilidad con el control de cálculo.
- Las utilidades conservan deshacer/rehacer, Doctor, Datasheet, idioma, tema, vistas y exportación mediante los comandos compartidos existentes. En K0, el nombre del proyecto se oculta sólo a 360 px para no invadir la acción primaria y se recupera desde Herramientas.
- En K0 los paneles de Proyecto y Herramientas se comportan como hojas inferiores contenidas. Se corrigió un recorte medido en Noche móvil: el panel de Herramientas pasaba de `left: -139 px` a quedar dentro de `8 px` de ambos bordes.
- El QA de Top Bar ahora espera la estabilización de la composición antes de medir `X2`, `M1` o `K0`; antes medía transitoriamente el shell anterior tras un resize.

No se modificaron solver, modelo estructural, signos, unidades de cálculo, IDs, persistencia, importación/exportación de dominio, workers ni resultados.

## Por qué

El usuario indicó que la barra anterior era fea por completo: acomodo, botones, nombres y sensaciones. La respuesta no fue conservar esa retícula con otro color: se reconstruyó la jerarquía y el flujo. En móvil se prioriza la lectura del lienzo y Analizar; las rutas secundarias siguen presentes, pero aparecen desde hojas táctiles profundas y no como botones amontonados.

## Archivos tocados

- `src/features/topbar/TopBar.tsx` — nueva composición, paneles de proyecto/análisis/utilidades y rutas existentes preservadas.
- `src/features/topbar/topbar.css` — material Clay de la Top Bar, estados de presión, Día/Noche, X2/M1/K0 y hojas móviles sin recorte.
- `src/features/topbar/TopBar.test.tsx` y `TopBar.commandParity.test.tsx` — contratos de jerarquía, controles bajo demanda, accesibilidad y paridad con la Paleta.
- `src/i18n/catalogs.ts` — etiquetas nuevas en español e inglés.
- `scripts/qa-topbar.mjs` — barrido estable de geometría, nombres largos, tres composiciones y ausencia de solapamiento.
- `scripts/qa-clay-topbar-phase6.mjs` — cuatro escenarios visuales con aserciones de tema, overflow, texto blanco, ausencia de blur y paneles contenidos.
- `docs/superpowers/specs/2026-08-21-clay-topbar-phase-6-design.md`, `docs/superpowers/plans/2026-08-21-clay-topbar-phase-6.md` y `docs/README.md` — diseño, plan e índice documental.
- `reports/evidence/2026-08-21-clay-topbar-phase-6/` — cuatro capturas y resumen de métricas.

## Cómo verificar

```powershell
npm.cmd run typecheck
npm.cmd exec vitest run src/features/topbar/TopBar.test.tsx src/features/topbar/TopBar.commandParity.test.tsx -- --maxWorkers=1
npm.cmd run qa:topbar
node scripts/qa-clay-topbar-phase6.mjs
npm.cmd run verify:docs
npm.cmd run verify:protected
```

## Resultados observados

- Typecheck: PASS.
- TopBar + paridad de comandos: **28/28 PASS**.
- Build de producción: PASS; conserva el warning heredado de chunks mayores a 500 kB.
- QA Top Bar Chromium: PASS en el barrido continuo 1024–1600 px, límites de breakpoint, suelo K0 360–1023 px, paisaje/retrato y nombres largos ES/EN; no hay overflow ni solapamientos, y Doctor/Estado siguen visibles.
- QA visual: PASS en 4/4 escenarios: X2 Día, M1 Noche, K0 Día con Proyecto y K0 Noche con Herramientas. Los cuatro tienen overflow `0`, texto blanco de Analizar, `backdrop-filter: none`, cero errores de consola y paneles dentro del viewport.
- Documentación: PASS, 41 documentos clasificados y enlaces válidos.
- Frontera protegida: PASS, 38/38 archivos.

## Gate global no concluyente

Se intentó `npm.cmd exec vitest run -- --maxWorkers=1` durante 120 s. No produjo un resultado ni salida de tests antes del timeout, por lo que **no se declara PASS ni FAIL global** y no se atribuye ninguna regresión global a esta fase. Los 28 tests focales intervenidos sí aprobaron.

## Pendiente / siguiente paso

- **Fase 7:** reconstruir Home/Inicio desde cero para alinearlo con los boards aprobados: bienvenida editorial, proyecto principal, accesos de creación/importación útiles y una biblioteca reciente realmente legible, sin el rail y los pasos antiguos como composición dominante.
- Mantener la corrección transversal final de defectos visuales al cerrar las superficies prioritarias restantes.
