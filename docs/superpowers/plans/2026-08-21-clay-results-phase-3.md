# Clay Results Phase 3 Implementation Plan

**Clasificación:** `AUDIT/TEMPORARY`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the resident Results surface into a Clay decision table while preserving all analytical values, interactions and responsive surface contracts.

**Architecture:** Keep the existing ResultsPanel and ResultSummary data flow intact. Add a scoped CSS contract test, then append narrowly-scoped presentation rules that use the established material tokens and `data-surface-presentation` attributes. QA exercises the real analysis result, not a mock result surface.

**Tech Stack:** React 19, TypeScript, CSS custom properties, Vitest, Playwright, Vite.

## Global Constraints

- Work only on branch `codex/clay-workspace-phase-2` in the isolated GitHub checkout.
- Preserve `src/engine/**`, `src/workers/**`, `src/data/**`, `src/types.ts`, `src/store/ProjectContext.tsx`, commands, persistence and import/export.
- Preserve `surfacePresentation.ts` and `WorkspaceUIContext` as the authorities for Results placement and selection.
- Keep technical values, tables, curves, cursor readout and provenance at material level BASE.
- Do not add dependencies, glass, backdrop blur, decorative glow or new persistent state.
- Keep technical colors identical in Día/Noche and remove only decorative deformed glow.

---

### Task 1: Freeze Results presentation contracts in RED

**Files:**

- Create: `src/features/results/clayResultsPhase3.test.ts`
- Modify: `src/features/results/ResultsPanel.test.tsx`
- Modify: `src/features/results/ResultSummary.test.tsx` only if an existing semantic hook is absent.

**Interfaces:**

- Consumes `ResultsPanel` classes, `data-surface-presentation`, `.result-tabs`, `.results-body`, `.result-summary-workspace`, `.diagram-chart` and `.results-table`.
- Produces a CSS-level regression contract without changing result values or interactions.

- [ ] **Step 1: Write the failing CSS contract tests**

```ts
it('keeps numerical result surfaces flat while controls retain Clay depth', () => {
  expect(css).toMatch(/\.results-panel\[data-surface-presentation='dock'\][\s\S]*shadow/);
  expect(resultsCss).toMatch(/\.diagram-chart\s*\{[^}]*background:var\(--sc-color-surface-inset\)/s);
  expect(resultsCss).toMatch(/\.results-table\s*\{[^}]*box-shadow:none/s);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npx.cmd vitest run src/features/results/clayResultsPhase3.test.ts --maxWorkers=1`

Expected: FAIL because Phase 3 selectors and base/raised separation are not yet declared.

- [ ] **Step 3: Add focused interaction assertions**

```tsx
expect(screen.getByRole('tab', { name: /momento/i })).toHaveAttribute('aria-selected', 'true');
expect(screen.getByRole('separator', { name: /redimensionar/i })).toBeTruthy();
```

- [ ] **Step 4: Run existing Results tests before styling**

Run: `npx.cmd vitest run src/features/results/ResultsPanel.test.tsx src/features/results/resultCardContracts.test.tsx src/features/results/DenseResultsSurface.test.tsx --maxWorkers=1`

Expected: PASS before production styling; any failure is a blocker.

### Task 2: Apply the Clay decision-table hierarchy

**Files:**

- Modify: `src/features/workspace/phase1.css`
- Modify: `src/styles.css`
- Test: `src/features/results/clayResultsPhase3.test.ts`

**Interfaces:**

- Consumes existing `data-surface-presentation` and result DOM classes.
- Produces visual hierarchy only; no changed props, result values or context state.

- [ ] **Step 1: Implement panel and control material**

```css
.results-panel[data-surface-presentation='dock'] { box-shadow:var(--sc-shadow-clay-md); }
.results-panel .result-tabs button[aria-selected='true'] { box-shadow:var(--sc-shadow-clay-pressed); }
.results-panel .result-tabs button:active:not(:disabled) { transform:var(--sc-clay-press-transform); }
```

- [ ] **Step 2: Keep analytical canvas and grid BASE**

```css
.results-panel .diagram-chart,
.results-panel .results-table,
.results-panel .diagram-cursor-readout { box-shadow:none; }
```

- [ ] **Step 3: Remove decorative deformation glow and define reduced motion**

```css
.results-panel .deformed-orbit,
.deformed-layer path { filter:none; }
@media (prefers-reduced-motion:reduce) { .results-panel :is(button,.result-tabs button) { transform:none; transition:none; } }
```

- [ ] **Step 4: Run the focused contract to verify GREEN**

Run: `npx.cmd vitest run src/features/results/clayResultsPhase3.test.ts --maxWorkers=1`

Expected: PASS.

### Task 3: Adapt the hierarchy for X2, M1 and K0

**Files:**

- Modify: `src/features/workspace/phase1.css`
- Test: `src/features/results/clayResultsPhase3.test.ts`

**Interfaces:**

- Consumes existing shell presentation attributes only.
- Produces dock/inset/sheet depth and 44 px phone controls without new breakpoints or shell state.

- [ ] **Step 1: Add X2 and M1 presentation rules**

```css
.app-shell[data-shell-class='X2'] .results-panel[data-surface-presentation='dock'] { border:var(--sc-clay-edge); }
.app-shell[data-shell-class='M1'] .results-panel[data-surface-presentation='inset'] { box-shadow:var(--sc-shadow-clay-lg); }
```

- [ ] **Step 2: Add K0 thumb-zone rules**

```css
.app-shell[data-shell-class='K0'] .results-mobile-toggle,
.app-shell[data-shell-class='K0'] .results-mobile-focus { min-width:44px; min-height:44px; }
```

- [ ] **Step 3: Run Results, Inspector broker and shell tests**

Run: `npx.cmd vitest run src/features/results/clayResultsPhase3.test.ts src/features/results/ResultsPanel.test.tsx src/features/workspace/surfacePresentation.test.ts src/features/workspace/shellComposition.test.ts --maxWorkers=1`

Expected: PASS with no changed presentation table.

### Task 4: Real QA and delivery evidence

**Files:**

- Create: `scripts/qa-clay-results-phase3.mjs`
- Create: `reports/evidence/2026-08-21-clay-results-phase-3/`
- Create: `reports/2026-08-21-1830-clay-results-phase-3.md`

**Interfaces:**

- Uses a real example project, active analysis and existing Result tabs.
- Produces six Chromium screenshots and JSON summaries for Chromium and WebKit.

- [ ] **Step 1: Seed and capture each composition**

```js
const scenarios = [
  { id: 'desktop', width: 1440, height: 900, shell: 'X2' },
  { id: 'tablet', width: 1024, height: 768, shell: 'M1' },
  { id: 'mobile', width: 390, height: 844, shell: 'K0' },
];
```

- [ ] **Step 2: Assert real presentation**

```js
if (shellClass !== expectedShell) failures.push('shell class');
if (document.documentElement.scrollWidth > document.documentElement.clientWidth) failures.push('overflow');
if (minimumVisibleToolTarget < 44) failures.push('touch target');
```

- [ ] **Step 3: Run Chromium and WebKit QA**

Run: `node scripts/qa-clay-results-phase3.mjs`

Run: `node scripts/qa-clay-results-phase3.mjs --webkit`

Expected: six scenarios per engine without console errors.

- [ ] **Step 4: Run final gates and report**

Run: `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run verify:docs`, `npm.cmd run verify:protected`, `npm.cmd run build`, `npm.cmd test`.

Expected: evidence recorded before committing and updating the existing draft PR.
