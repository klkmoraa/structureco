# Five Next Major Improvements Implementation Plan

**Clasificación:** `REFERENCE`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** Add a model-health beacon, canvas focus modes, scenario navigator, isolated sensitivity study, and review-readiness board without changing structural-domain contracts.

**Architecture:** New view-models and surfaces live under src/features/**. Existing Model Doctor, analysis results, layer presets, and worker-facing solver entry points remain authoritative. Sensitivity runs against cloned projects in a feature-local worker and is discarded on model or scenario changes.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, Vite worker modules, existing StructureCo design-system components and i18n catalogs.

**Spec:** docs/superpowers/specs/2026-09-16-five-next-major-improvements-design.md

## Global Constraints

- Preserve solver mathematics, signs, units, IDs, topology, ProjectModel, existing workers, persistence, import/export, and undo/redo.
- Use buildModelDoctorReport, resolveReliability, summarizeAnalysisResults, and EditorLayerState instead of duplicating their rules.
- Sensitivity variants use cloned projects, run only on demand, and never write to a project or claim structural safety.
- All new user-facing copy has Spanish and English catalog entries and no raw engine prose is rendered in English mode.
- Keep new controls accessible with keyboard focus, visible labels/tooltips, and mobile-safe horizontal composition.
- Each cohesive task ends with its focused test command and a commit.

---

### Task 1: Model health view-model and canvas beacon

**Files:**
- Create: src/features/model-health/modelHealth.ts
- Create: src/features/model-health/modelHealth.test.ts
- Create: src/features/model-health/ModelHealthBeacon.tsx
- Create: src/features/model-health/ModelHealthBeacon.test.tsx
- Modify: src/features/canvas/CanvasChrome.tsx
- Modify: src/features/canvas/StructuralCanvas.tsx
- Test: src/features/model-doctor/modelDoctorDiagnostics.test.ts

**Interfaces:**
- buildModelHealth(project: ProjectModel, analysis: AnalysisResult | null): ModelHealthSnapshot
- ModelHealthSnapshot exposes status: 'ready' | 'attention' | 'blocked', critical, warnings, suggestions, analysisLevel, and messageKey.
- ModelHealthBeacon consumes { health: ModelHealthSnapshot } and emits open-model-doctor through the existing workspace command bus.

- [ ] **Step 1: Write the failing view-model tests**

~~~ts
it('bloquea la lectura cuando Model Doctor tiene hallazgos críticos', () => {
  const result = buildModelHealth(invalidProject(), null);
  expect(result.status).toBe('blocked');
  expect(result.critical).toBeGreaterThan(0);
});

it('marca atención para una respuesta limitada aunque el modelo sea válido', () => {
  const result = buildModelHealth(projectWithLimitedAnalysis(), limitedAnalysis());
  expect(result.status).toBe('attention');
  expect(result.analysisLevel).toBe('limited');
});
~~~

- [ ] **Step 2: Run the focused test and verify it fails**

Run: PATH="/Users/crismora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" pnpm exec vitest run src/features/model-health/modelHealth.test.ts --maxWorkers=1 --pool=threads --no-file-parallelism

Expected: FAIL because the view-model does not exist.

- [ ] **Step 3: Implement the minimal view-model**

~~~ts
export interface ModelHealthSnapshot {
  status: 'ready' | 'attention' | 'blocked';
  critical: number;
  warnings: number;
  suggestions: number;
  analysisLevel: ReliabilityLevel | null;
  messageKey: TranslationKey;
}

export const buildModelHealth = (project: ProjectModel, analysis: AnalysisResult | null): ModelHealthSnapshot => {
  const report = buildModelDoctorReport(project);
  const level = analysis ? resolveReliability(analysis).level : null;
  const blocked = report.counts.critical > 0 || Boolean(analysis && !analysis.success);
  const attention = !blocked && (report.counts.warning > 0 || level === 'limited' || level === 'failed');
  return {
    status: blocked ? 'blocked' : attention ? 'attention' : 'ready',
    critical: report.counts.critical,
    warnings: report.counts.warning,
    suggestions: report.counts.suggestion,
    analysisLevel: level,
    messageKey: blocked ? 'canvas.healthBlocked' : attention ? 'canvas.healthAttention' : 'canvas.healthReady',
  };
};
~~~

- [ ] **Step 4: Run the view-model tests and verify they pass**

Run: PATH="/Users/crismora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" pnpm exec vitest run src/features/model-health/modelHealth.test.ts src/features/model-doctor/modelDoctorDiagnostics.test.ts --maxWorkers=1 --pool=threads --no-file-parallelism

Expected: PASS.

- [ ] **Step 5: Add the beacon component test**

~~~tsx
it('expone el estado y abre Model Doctor', async () => {
  const user = userEvent.setup();
  render(<ModelHealthBeacon health={attentionHealth} />);
  expect(screen.getByRole('button', { name: /atención/i })).toHaveAttribute('data-health-status', 'attention');
  await user.click(screen.getByRole('button', { name: /atención/i }));
  expect(commandSpy).toHaveBeenCalledWith('open-model-doctor');
});
~~~

- [ ] **Step 6: Implement and connect the beacon**

Render the beacon in CanvasChrome next to the mode badge. Compute buildModelHealth(project, analysis) once in StructuralCanvas with useMemo, pass it through CanvasChrome, and keep the command callback on the existing emitWorkspaceCommand path.

- [ ] **Step 7: Run component tests and commit**

Run: PATH="/Users/crismora/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH" pnpm exec vitest run src/features/model-health src/features/canvas/CanvasChrome.test.tsx --maxWorkers=1 --pool=threads --no-file-parallelism

Expected: PASS.

~~~bash
git add src/features/model-health src/features/canvas/CanvasChrome.tsx src/features/canvas/StructuralCanvas.tsx
git commit -m "feat(canvas): add model health beacon"
~~~

### Task 2: Canvas focus modes

**Files:**
- Modify: src/features/canvas/editorLayers.ts
- Create: src/features/canvas/CanvasFocusModes.tsx
- Create: src/features/canvas/CanvasFocusModes.test.tsx
- Modify: src/features/canvas/CanvasChrome.tsx
- Modify: src/features/canvas/CanvasChrome.test.tsx
- Modify: src/features/workspace/commandRegistry.ts
- Modify: src/i18n/catalogs/es-workspace.ts
- Modify: src/i18n/catalogs/en-workspace.ts
- Modify: src/features/canvas/phase2.css

**Interfaces:**
- Add EditorLayerPresetId = 'all' | 'model' | 'loads' | 'results' | 'review' | 'clean'.
- CanvasFocusModes consumes layers, dispatch, resultTab, setResultTab, and analysisAvailable.
- Mode selection only dispatches EditorLayerAction and, for results/review, selects an existing result tab.

- [ ] **Step 1: Add the failing preset and component tests**

~~~tsx
it('aplica una composición completa de revisión', async () => {
  const user = userEvent.setup();
  render(<CanvasFocusModes layers={createEditorLayerState()} dispatch={dispatch} resultTab="moment" setResultTab={vi.fn()} analysisAvailable />);
  await user.click(screen.getByRole('button', { name: /revisión/i }));
  expect(dispatch).toHaveBeenCalledWith({ type: 'preset', preset: 'review' });
});
~~~

- [ ] **Step 2: Run the focused test to verify it fails**

Run: PATH="/Users/crismora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" pnpm exec vitest run src/features/canvas/CanvasFocusModes.test.tsx --maxWorkers=1 --pool=threads --no-file-parallelism

Expected: FAIL because the review preset and component do not exist.

- [ ] **Step 3: Implement the review preset and mode strip**

Use this presentation-only preset:

~~~ts
review: Object.freeze({
  model: true, loads: true, dimensions: false, ids: true,
  results: true, labels: true, help: false, diagnostics: true, heatmap: true,
}),
~~~

Render four buttons with aria-pressed, data-focus-mode, and a selected state from activeEditorLayerPreset(layers). Disable the Results action when analysisAvailable is false and leave the model layer immutable.

- [ ] **Step 4: Run canvas layer and focus-mode tests**

Run: PATH="/Users/crismora/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH" pnpm exec vitest run src/features/canvas/CanvasFocusModes.test.tsx src/features/canvas/CanvasLayers.test.tsx src/features/canvas/editorLayers.test.ts --maxWorkers=1 --pool=threads --no-file-parallelism

Expected: PASS.

- [ ] **Step 5: Integrate into CanvasChrome and command palette**

Place the mode strip below the mode badge, pass through the existing layer reducer, and add the review preset to the layer-preset command list. Do not add a new persistence key.

- [ ] **Step 6: Add responsive styles and bilingual copy**

Use a compact segmented row with overflow-x: auto, 44 px minimum controls, and the existing Studio tokens. Add labels, descriptions, and command-palette copy in both catalogs.

- [ ] **Step 7: Run UI tests and commit**

Run: PATH="/Users/crismora/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH" pnpm exec vitest run src/features/canvas src/features/workspace/CommandPalette.test.tsx --maxWorkers=1 --pool=threads --no-file-parallelism

Expected: PASS.

~~~bash
git add src/features/canvas src/features/workspace/commandRegistry.ts src/i18n/catalogs/es-workspace.ts src/i18n/catalogs/en-workspace.ts
git commit -m "feat(canvas): add task focus modes"
~~~

### Task 3: Scenario navigator

**Files:**
- Create: src/features/results/scenarioNavigator.ts
- Create: src/features/results/scenarioNavigator.test.ts
- Create: src/features/results/ScenarioNavigator.tsx
- Create: src/features/results/ScenarioNavigator.test.tsx
- Modify: src/features/results/ResultSummary.tsx
- Modify: src/features/results/results.css
- Modify: src/i18n/catalogs/es-results.ts
- Modify: src/i18n/catalogs/en-results.ts

**Interfaces:**
- buildScenarioNavigatorRows(scenarios: readonly AnalysisScenario[], selectedCombinationId: string): ScenarioNavigatorRow[].
- ScenarioNavigator consumes rows, onUseCombination(id), and onCompare().
- A row exposes id, name, kind, status, usable, reason, isCurrent, and values: { axial, shear, moment }.

- [ ] **Step 1: Write failing row-builder tests**

~~~ts
it('conserva fallos y calcula los tres extremos sin ocultar cobertura', () => {
  const rows = buildScenarioNavigatorRows([healthyScenario, failedScenario], 'C1');
  expect(rows[1]).toMatchObject({ status: 'failed', usable: false, reason: expect.any(String) });
  expect(rows[0].values).toEqual(expect.objectContaining({ axial: expect.any(Number), shear: expect.any(Number), moment: expect.any(Number) }));
});
~~~

- [ ] **Step 2: Run the row-builder test to verify it fails**

Run: PATH="/Users/crismora/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH" pnpm exec vitest run src/features/results/scenarioNavigator.test.ts --maxWorkers=1 --pool=threads --no-file-parallelism

Expected: FAIL because the row builder does not exist.

- [ ] **Step 3: Implement the row builder**

Call summarizeAnalysisResults(scenario.result) for each scenario, derive N/V/M from .diagrams[quantity]?.absolute.value, preserve scenario.failureReason, and mark only kind === 'combination' rows as usable by onUseCombination.

- [ ] **Step 4: Add the component test and implement the navigator**

~~~tsx
it('permite usar una combinación y deja la causa del fallo en texto', async () => {
  const user = userEvent.setup();
  render(<ScenarioNavigator rows={rows} onUseCombination={onUse} onCompare={vi.fn()} />);
  await user.click(screen.getByRole('button', { name: /usar combinación c1/i }));
  expect(onUse).toHaveBeenCalledWith('C1');
  expect(screen.getByText(/no se pudo resolver/i)).toBeVisible();
});
~~~

Render a filter for all, usable, and failed, a compact table/card layout, explicit status pills, and an action for combinations only.

- [ ] **Step 5: Replace the inline scenario cards in ResultSummary**

Use useScenarioAnalysis(project) as the calculation source. Wire onUseCombination to setSelectedCombinationId(id) followed by the existing analyze() callback. Keep reaction/deformation envelope summaries below the navigator and do not make a failed scenario contribute to them.

- [ ] **Step 6: Add bilingual copy and responsive styling**

Use technical values in the existing mono face, keep failure reasons readable in both languages, and make the row actions fit a 390 px viewport without horizontal page overflow.

- [ ] **Step 7: Run focused tests and commit**

Run: PATH="/Users/crismora/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH" pnpm exec vitest run src/features/results/scenarioNavigator.test.ts src/features/results/ScenarioNavigator.test.tsx src/features/results/ResultsPanel.test.tsx src/engine/scenarioCoverage.test.ts --maxWorkers=1 --pool=threads --no-file-parallelism

Expected: PASS.

~~~bash
git add src/features/results src/i18n/catalogs/es-results.ts src/i18n/catalogs/en-results.ts
git commit -m "feat(results): add scenario navigator"
~~~

### Task 4: Sensitivity explorer

**Files:**
- Create: src/features/sensitivity/sensitivity.ts
- Create: src/features/sensitivity/sensitivity.test.ts
- Create: src/features/sensitivity/sensitivity.worker.ts
- Create: src/features/sensitivity/useSensitivityStudy.ts
- Create: src/features/sensitivity/SensitivityCard.tsx
- Create: src/features/sensitivity/SensitivityCard.test.tsx
- Create: src/features/sensitivity/sensitivity.css
- Modify: src/features/results/ResultSummary.tsx
- Modify: src/features/results/results.css
- Modify: src/i18n/catalogs/es-results.ts
- Modify: src/i18n/catalogs/en-results.ts

**Interfaces:**
- SensitivityParameter = 'E' | 'A' | 'I'.
- runSensitivityStudy(project, combination: LoadCombination | null, memberId: string, parameter: SensitivityParameter, percent?: number): SensitivityStudyResult.
- SensitivityStudyResult contains baseline, lower, and upper points with success, maxAxial, maxShear, maxMoment, maxDeflection, and optional error.
- useSensitivityStudy(project, combinationId) exposes { result, busy, error, run, reset } and invalidates stale requests by signature and request id.

- [ ] **Step 1: Write failing pure-study tests**

~~~ts
it('no muta el proyecto y devuelve el impacto de ±10 % en la propiedad elegida', () => {
  const source = healthyBeam();
  const before = structuredClone(source);
  const study = runSensitivityStudy(source, source.combinations[0], 'AB', 'I');
  expect(source).toEqual(before);
  expect(study.lower.inputValue).toBeCloseTo(source.members[0].I * 0.9);
  expect(study.upper.inputValue).toBeCloseTo(source.members[0].I * 1.1);
});

it('rechaza I para una armadura con inercia nula', () => {
  expect(() => runSensitivityStudy(truss(), null, 'AB', 'I')).toThrow(/inercia/i);
});
~~~

- [ ] **Step 2: Run the pure-study test to verify it fails**

Run: PATH="/Users/crismora/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH" pnpm exec vitest run src/features/sensitivity/sensitivity.test.ts --maxWorkers=1 --pool=threads --no-file-parallelism

Expected: FAIL because the study module does not exist.

- [ ] **Step 3: Implement the cloned study**

Clone with structuredClone, multiply only the requested member field by 1 - percent/100 and 1 + percent/100, call analyzeProject with includeEducationTrace: false, and derive extrema through summarizeAnalysisResults. Throw only for invalid member/parameter input; return an unsuccessful point for a variant that the solver cannot resolve.

- [ ] **Step 4: Run pure-study tests and verify they pass**

Run: PATH="/Users/crismora/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH" pnpm exec vitest run src/features/sensitivity/sensitivity.test.ts --maxWorkers=1 --pool=threads --no-file-parallelism

Expected: PASS.

- [ ] **Step 5: Add the feature-local worker and hook**

The worker accepts { requestId, input }, posts { requestId, result } or { requestId, error }, and imports only runSensitivityStudy. The hook terminates the worker on cleanup/signature change and uses a setTimeout fallback to call the same pure function when Worker is unavailable.

- [ ] **Step 6: Add the component test and card**

~~~tsx
it('muestra tres variantes y declara que el modelo no cambia', async () => {
  const user = userEvent.setup();
  render(<SensitivityCard />);
  await user.click(screen.getByRole('button', { name: /calcular sensibilidad/i }));
  expect(await screen.findByText(/−10 %/i)).toBeVisible();
  expect(screen.getByText(/no cambia el modelo/i)).toBeVisible();
});
~~~

The card selects the current member when possible, filters parameter options by valid member properties, shows run/error/variant states, and uses formatResultNumber plus project units for all numbers.

- [ ] **Step 7: Integrate, style, test and commit**

Add the card to the result-summary carousel after the numeric certificate. Use the existing surface levels, a three-column result strip that collapses to one column on mobile, and no new dependency.

Run: PATH="/Users/crismora/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH" pnpm exec vitest run src/features/sensitivity src/features/results/ResultsPanel.test.tsx --maxWorkers=1 --pool=threads --no-file-parallelism

Expected: PASS for the feature and existing result tests.

~~~bash
git add src/features/sensitivity src/features/results/ResultSummary.tsx src/features/results/results.css src/i18n/catalogs/es-results.ts src/i18n/catalogs/en-results.ts
git commit -m "feat(results): add isolated sensitivity explorer"
~~~

### Task 5: Review-readiness board

**Files:**
- Create: src/features/review/reviewReadiness.ts
- Create: src/features/review/reviewReadiness.test.ts
- Create: src/features/review/ReviewReadinessCard.tsx
- Create: src/features/review/ReviewReadinessCard.test.tsx
- Create: src/features/review/reviewReadiness.css
- Modify: src/features/results/ResultSummary.tsx
- Modify: src/features/results/results.css
- Modify: src/i18n/catalogs/es-results.ts
- Modify: src/i18n/catalogs/en-results.ts

**Interfaces:**
- buildReviewReadiness(project, health, analysis, scenarios, certificate): ReviewReadinessSnapshot.
- Snapshot exposes status: 'ready' | 'attention' | 'blocked', readyCount, totalCount, and four rows with id, status, labelKey, detailKey, and action.
- ReviewReadinessCard receives the snapshot plus onOpenDoctor and onCompare callbacks.

- [ ] **Step 1: Write failing readiness tests**

~~~ts
it('no llama listo a un análisis sin escenarios comparados o certificado no verificable', () => {
  const snapshot = buildReviewReadiness(project, readyHealth, goodAnalysis, null, notVerifiableCertificate);
  expect(snapshot.status).toBe('attention');
  expect(snapshot.rows.find((row) => row.id === 'coverage')?.status).toBe('pending');
});
~~~

- [ ] **Step 2: Run the test to verify it fails**

Run: PATH="/Users/crismora/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH" pnpm exec vitest run src/features/review/reviewReadiness.test.ts --maxWorkers=1 --pool=threads --no-file-parallelism

Expected: FAIL because the readiness view-model does not exist.

- [ ] **Step 3: Implement deterministic readiness rules**

Use the following rule order: blocked model health or unsuccessful analysis → blocked; limited reliability or scenario failures → attention; absent scenario/certificate runs → pending rows and overall attention; all four ready and verified → ready. Never translate not-verifiable to ready.

- [ ] **Step 4: Implement the card and its tests**

Render a headline with the ready count, four rows with status icons and detail, an “Abrir Doctor” action for the model row, and “Comparar escenarios” for a pending coverage row. The card must label itself as a review aid and state that it is not a safety or code-compliance certification.

- [ ] **Step 5: Integrate and add copy/styles**

Pass the existing health, analysis, scenarios, and certificate values from ResultSummary; call compare for coverage and emitWorkspaceCommand('open-model-doctor') for Model Doctor. Add Spanish/English entries and mobile-safe styles.

- [ ] **Step 6: Run focused tests and commit**

Run: PATH="/Users/crismora/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH" pnpm exec vitest run src/features/review src/features/results/ResultsPanel.test.tsx --maxWorkers=1 --pool=threads --no-file-parallelism

Expected: PASS.

~~~bash
git add src/features/review src/features/results/ResultSummary.tsx src/features/results/results.css src/i18n/catalogs/es-results.ts src/i18n/catalogs/en-results.ts
git commit -m "feat(results): add review readiness board"
~~~

### Task 6: Cross-surface polish, reports, and verification

**Files:**
- Modify: src/features/canvas/phase2.css
- Modify: src/features/results/results.css
- Modify: src/i18n/catalogs/es-results.ts
- Modify: src/i18n/catalogs/en-results.ts
- Modify: src/i18n/catalogs/es-workspace.ts
- Modify: src/i18n/catalogs/en-workspace.ts
- Create: reports/2026-09-16-five-next-major-improvements.md

- [ ] **Step 1: Run the focused functional tests**

Run: PATH="/Users/crismora/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH" pnpm exec vitest run src/features/model-health src/features/canvas/CanvasFocusModes.test.tsx src/features/results/scenarioNavigator.test.ts src/features/results/ScenarioNavigator.test.tsx src/features/sensitivity src/features/review src/features/results/ResultsPanel.test.tsx src/engine/scenarioCoverage.test.ts --maxWorkers=1 --pool=threads --no-file-parallelism

Expected: PASS with no failed tests.

- [ ] **Step 2: Run typecheck and quality contracts**

Run: PATH="/Users/crismora/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH" pnpm run typecheck

Run: PATH="/Users/crismora/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH" pnpm run verify:styles

Run: PATH="/Users/crismora/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH" pnpm run verify:i18n

Run: PATH="/Users/crismora/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH" pnpm run verify:protected

Expected: all commands PASS; the protected boundary still reports 55 verified files.

- [ ] **Step 3: Build and perform visual QA**

Run: PATH="/Users/crismora/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH" pnpm run build

Use the local Vite preview with Chromium at 1440x900 and 390x844. Verify the beacon, focus strip, results navigator, sensitivity card, and review board; check no horizontal page overflow and keyboard focus for each primary action.

- [ ] **Step 4: Write the report with actual evidence**

Record the five delivered improvements, exact focused commands and outcomes, the baseline limitation that the full suite was not run locally, the visual QA viewports, and the fact that verify:protected passed without modifying the mathematical boundary.

- [ ] **Step 5: Commit the final report and polish**

~~~bash
git add src/features/canvas src/features/results src/i18n/catalogs reports/2026-09-16-five-next-major-improvements.md
git commit -m "docs: record five next studio improvements"
~~~

### Task 7: Integrate and publish safely

- [ ] **Step 1: Inspect branch, worktree, untracked files, and remote SHA**

Run from the original checkout:

~~~bash
git status --short --branch
git diff --stat main..codex/five-next-major-improvements
git ls-tree -r --name-only codex/five-next-major-improvements | tail -5
git fetch origin main gh-pages
git rev-parse main origin/main origin/gh-pages
~~~

Expected: only the isolated branch’s files are ahead; no foreign untracked work is staged; remote main has not advanced unexpectedly.

- [ ] **Step 2: Fast-forward main without force**

~~~bash
git switch main
git merge --ff-only codex/five-next-major-improvements
git push origin main
~~~

- [ ] **Step 3: Verify GitHub Actions and Pages**

Use the repository’s existing CI and Pages workflows. Check the push-triggered gate and deployment status; do not manually rewrite gh-pages if the Pages workflow owns deployment. Verify git fetch origin main gh-pages followed by git rev-parse origin/main origin/gh-pages, and request the published URL once the workflow reports success.

- [ ] **Step 4: Run final local status checks and report**

Confirm main matches origin/main, the working tree is clean, and the deployed Pages URL responds. Report exact commit SHA, Pages status/URL, tests run, and tests intentionally not run.
