# CRI-48 — Comparación trazable de revisiones

**Fecha:** 2026-08-24
**Agente:** Codex
**Rama:** `codex/linear-queue-execution-20260824`
**SHA base auditado:** `bb412fee206a77b1005c26e542c1ae470e12b2df`

## Resultado

Se incorporó una comparación de dos revisiones explícitas del modelo. La base
es una captura inmutable y content-addressed del `ProjectModel`; si el análisis
está disponible, conserva también su firma, resultado, digest y escenario. El
estado actual se deriva en vivo y la salida separa cambios de entrada, estado
de análisis y resultados mediante IDs y rutas explícitas.

La superficie se abre desde el resumen de Results o la paleta mediante un solo
comando `analysis:compare-revisions`. El broker la presenta como `drawer` en
X2/M1 y `fullscreen` en K0. La base sobrevive al cierre, `peek` y reemplazo de
proyecto dentro del mismo Workspace, pero es efímera: no se persiste ni entra
en `ProjectModel` o formatos.

## Decisiones de comparación

- ID de revisión `sha256:<digest>` sobre el modelo completo con serialización
  canónica; digest independiente para `AnalysisResult`.
- Correspondencia exacta por tipo + ID. Un cambio de ID es `removed + added`,
  nunca una coincidencia por coordenadas, propiedades u orden.
- Diff determinista de nodos, barras, casos, combinaciones, cargas, efectos
  iniciales, configuración y settings.
- Procedencia por cambio mediante rutas como `project.nodes[N2].x` y
  `analysis.memberResults[F1].length`.
- Resultados en unidades base fijas del motor; cambiar unidades de presentación
  sólo genera cambio de configuración y warning informativo.
- Deltas de resultados únicamente con ambos análisis frescos, usables, mismo
  proyecto y mismo caso/combinación. Escenario redefinido o fiabilidad limitada
  califican la lectura; missing/stale/no usable/proyecto o escenario distintos
  la bloquean sin publicar deltas.
- Todo delta se rotula como correlación, no causalidad.
- `Localizar` usa el `{ kind, id }` original, enfoca el lienzo y degrada la
  superficie a `peek`; restaurar conserva filtros y base.

El contrato completo está en
`docs/architecture/structureco-revision-comparison-contract.md`.

## Evidencia ejecutada

- TDD núcleo: RED por módulo ausente; después **5/5 PASS**.
- TDD componente: RED por componente ausente; después **4/4 PASS**.
- Integración broker/comandos/Results: RED en los contratos nuevos; después
  suite focal final de **7 archivos, 67 PASS y 3 skips declarados**.
- TypeScript: `tsc -b --noEmit` **PASS**.
- Lint: salida 0; conserva 6 warnings preexistentes fuera de CRI-48.
- Documentación: `verify:docs` **PASS**, 7 documentos bajo `docs/**`.
- Frontera protegida: `verify:protected` **PASS**, 40 archivos intactos.
- Build productivo: **PASS**, 2,656 módulos; comparador emitido como chunk lazy
  propio.
- Browser oracle `qa:revision-comparison`: **25/25 checks PASS** en X2/M1/K0.
  Captura una base analizada, cambia N2.x mediante el Datasheet real, vuelve a
  analizar y comprueba deltas de entrada/resultado, rutas, filtro, localización,
  `peek`, foco, presentación, 44 px táctiles, overflow y consola.
- Inspección visual manual de X2/M1/K0: jerarquía legible, tabla contenida,
  controles móviles apilados y ninguna salida horizontal del viewport.

## Archivos principales

- `src/features/revision-comparison/revisionComparison.ts` y pruebas — captura,
  identidad, diff, comparabilidad, warnings y resúmenes.
- `src/features/revision-comparison/RevisionComparisonPanel.tsx` y CSS/pruebas —
  base explícita, filtros, tabla, procedencia y localización.
- `src/features/workspace/**` — comando tipado, paleta, broker, continuidad y
  ciclo responsive.
- `src/features/results/ResultSummary.tsx` — launcher contextual desde Results.
- `src/i18n/catalogs.ts` — interfaz completa en español e inglés.
- `scripts/qa-revision-comparison.mjs` y `package.json` — oráculo construido.
- `docs/architecture/structureco-revision-comparison-contract.md` — contrato
  canónico.

## Cómo verificar

```powershell
npm.cmd exec -- vitest run src/features/revision-comparison/revisionComparison.test.ts src/features/revision-comparison/RevisionComparisonPanel.test.tsx src/features/workspace/surfacePresentation.test.ts src/features/workspace/workspaceCommands.test.ts src/features/workspace/commandRegistry.test.ts src/features/results/ResultsPanel.test.tsx src/i18n/catalogs.test.ts --maxWorkers=1 --pool=threads --no-file-parallelism --reporter=dot
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run verify:docs
npm.cmd run verify:protected
npm.cmd run qa:revision-comparison
git diff --check
```

## Exclusiones

No se implementaron historial persistente de revisiones, sincronización,
branching, merge, fuzzy matching, explicación causal, diseño normativo ni
comparación entre escenarios distintos. Tampoco se modificaron solver,
matrices, signos, unidades base, topología, IDs, `ProjectModel`, workers,
persistencia, formatos, undo/redo ni resultados existentes.

La siguiente tarea vigente es CRI-49; no se inició dentro de este cambio.
