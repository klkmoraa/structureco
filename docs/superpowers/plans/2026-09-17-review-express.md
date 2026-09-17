# Pase de revisión Implementation Plan

**Clasificación:** `REFERENCE`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir un pase de revisión de un clic que actualice la evidencia existente y muestre su progreso en el tablero de revisión.

**Architecture:** `ResultSummary` coordina los tres ejecutores ya existentes: análisis interactivo, comparación de escenarios y certificado numérico. El pase se ata a `projectId`, firma de análisis y combinación seleccionada; los estados busy/error cancelan o invalidan el ciclo sin interpretar resultados del solver. `ReviewReadinessCard` recibe un callback y el estado de esas operaciones, y representa una banda de progreso de revisión.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, CSS existente del workspace.

**Spec:** `docs/product/visual-direction.md` y `src/features/review/reviewReadiness.ts` (contrato de evidencia vigente).

## Global Constraints

- La capa visual no altera solver, unidades, signos, IDs, topología, `ProjectModel`, workers, persistencia, import/export, undo/redo ni resultados.
- El pase sólo inicia operaciones ya públicas (`analyze`, `compare`, `certificate.run`) y no inventa una certificación de seguridad.
- Las etiquetas nuevas deben existir en español e inglés y conservar la carga diferida de la superficie de resultados.
- Se verifican pruebas focalizadas, typecheck, build, lint y las comprobaciones de publicación requeridas; no se ejecuta una suite general salvo que el release lo justifique.

### Task 1: Definir el contrato visual del pase

**Files:**
- Modify: `src/features/review/ReviewReadinessCard.test.tsx`
- Modify: `src/features/review/ReviewReadinessCard.tsx`
- Modify: `src/features/results/resultsFeatureI18n.ts`

**Interfaces:**
- Consume: `ReviewReadinessSnapshot`, `comparisonBusy`, `certificateBusy`, `analysisBusy` y `onRunReview`.
- Produces: un botón `Actualizar revisión` y tres estados accesibles (`Modelo`, `Análisis`, `Cobertura`, `Certificado`) que se puedan verificar por `data-review-step`.

- [x] **Step 1: Write the failing test**

  Añadir un caso que monte `ReviewReadinessCard` con `onRunReview`, `isRunning: true` y los tres flags ocupados, y compruebe el botón deshabilitado, el texto de progreso y los atributos `data-review-step`.

- [x] **Step 2: Run test to verify it fails**

  Run: `PATH="/Users/crismora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" pnpm exec vitest run src/features/review/ReviewReadinessCard.test.tsx --maxWorkers=1 --pool=threads --no-file-parallelism`

  Expected: FAIL porque el componente aún no acepta ni representa el pase.

- [x] **Step 3: Write minimal implementation**

  Extender las props opcionales, añadir el botón y una banda compacta con iconos/estados para modelo, análisis, cobertura y certificado. Mantener las acciones existentes por fila y no mostrar la banda cuando no se proporciona `onRunReview`.

- [x] **Step 4: Run test to verify it passes**

  Run: `PATH="/Users/crismora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" pnpm exec vitest run src/features/review/ReviewReadinessCard.test.tsx --maxWorkers=1 --pool=threads --no-file-parallelism`

  Expected: PASS.

- [x] **Step 5: Commit**

  `git add src/features/review/ReviewReadinessCard.tsx src/features/review/ReviewReadinessCard.test.tsx src/features/results/resultsFeatureI18n.ts && git commit -m "feat: add review pass progress surface"`

### Task 2: Conectar el pase a los ejecutores existentes

**Files:**
- Modify: `src/features/results/ResultSummary.tsx`
- Modify: `src/features/review/ReviewReadinessCard.test.tsx` (only if a prop contract assertion is needed)

**Interfaces:**
- Consume: `useProjectAnalysis().analyze`, `useScenarioAnalysis().run`, `useNumericCertificate().run` and their busy states.
- Produces: `onRunReview` that starts all three current evidence refreshes, a terminal `complete/failed` outcome bound to the current project, and stable busy/error flags for the card.

- [x] **Step 1: Write the failing test**

  Extend the component-level contract test to assert that the review action invokes the supplied coordinator callback exactly once; keep executor orchestration in `ResultSummary`, where the hooks already live.

- [x] **Step 2: Run test to verify it fails**

  Run: `PATH="/Users/crismora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" pnpm exec vitest run src/features/review/ReviewReadinessCard.test.tsx --maxWorkers=1 --pool=threads --no-file-parallelism`

  Expected: FAIL until the new control is wired to the callback.

- [x] **Step 3: Write minimal implementation**

  In `ResultSummary`, keep the active/outcome state and the current analysis binding, start `analyze()`, `compare()` and `certificate.run()` from a memoized `runReview` callback, block the callback while any evidence executor is busy, resolve terminal failure from executor errors, and invalidate the retained outcome when the project binding changes. Pass busy/error flags and the callback to the lazy card.

- [x] **Step 4: Run test to verify it passes**

  Run: `PATH="/Users/crismora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" pnpm exec vitest run src/features/review/ReviewReadinessCard.test.tsx src/features/results/ResultSummary.test.tsx --maxWorkers=1 --pool=threads --no-file-parallelism`

  Expected: PASS, or if `ResultSummary.test.tsx` is absent, run the existing review/results test set and record the exact files.

- [x] **Step 5: Commit**

  `git add src/features/results/ResultSummary.tsx && git commit -m "feat: coordinate review evidence refresh"`

### Task 3: Polish, report, verify and publish

**Files:**
- Modify: `src/features/review/reviewReadiness.css`
- Create: `reports/2026-09-17-review-express.md`

**Interfaces:**
- Consume: new `data-review-step` and status classes from the card.
- Produces: responsive, keyboard-visible, reduced-motion-safe progress styling and a publication report.

- [x] **Step 1: Write the failing test**

  Add no new test for purely visual rules; use the component test's DOM contract and the repository style verifier.

- [x] **Step 2: Run test to verify it fails**

  Run: `PATH="/Users/crismora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" pnpm exec vitest run src/features/review/ReviewReadinessCard.test.tsx --maxWorkers=1 --pool=threads --no-file-parallelism`

  Expected: the contract remains green before styling; CSS is checked separately.

- [x] **Step 3: Write minimal implementation**

  Add a single compact progress rail using the existing border/surface tokens, preserve mobile wrapping, visible focus, and `@media (prefers-reduced-motion: reduce)` behavior. Write the report with changed files, focused verification, commit SHA, and separate `main`/`gh-pages` evidence.

- [x] **Step 4: Run test to verify it passes**

  Run: `pnpm run lint`, `pnpm run typecheck`, `pnpm run build`, `pnpm run verify:styles`, `pnpm run verify:i18n`, `pnpm run verify:docs`, `pnpm run verify:protected`, and the focused review/results tests. Then run the relevant Pages workflow and verify the public URL returns HTTP 200.

  Expected: all commands pass; lint may retain only the repository's known warnings.

- [x] **Step 5: Commit and publish**

  Commit the cohesive change, fast-forward/merge it into `main` without force push, push `main`, wait for the Pages workflow, and record both branch SHAs separately. Do not alter `gh-pages` directly because this repository deploys Pages from the artifact workflow.
