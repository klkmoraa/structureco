# Aula vNext Result Explanation Implementation Plan

**Clasificación:** `REFERENCE`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an accessible, result-first Aula explanation inside the existing dense Results surface without changing numerical analysis or project data.

**Architecture:** A feature-local pure resolver turns a transient result request into a view model backed by the current `ProjectModel` and `AnalysisResult`. Existing Results launchers pass the request through the typed workspace command to `dense/learn`; the presentation broker remains the only surface and focus authority. Reading, cause, and verification are progressive views over existing provenance, explanation, reliability, and lazy `EducationTrace` data.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, Playwright browser QA, existing workspace command bus and surface broker.

## Global Constraints

- Preserve solver mathematics, signs, units, topology, workers, `ProjectModel`, project persistence, import/export, undo/redo, and numerical results.
- Keep the existing explicit `{ kind, id }` selection authority and the CRI-94 presentation broker.
- Reuse `dense/learn`; do not add a resident Aula panel or a second solver.
- Treat predictions, quizzes, grading, and conversation as optional and outside the primary flow.
- Persist neither `AulaExplanationRequest` nor a copied numerical result.
- Use exact source indices plus IDs for result points; never identify a model selection through floating-point proximity.
- Present `unreliable` and `failed` analysis as non-ordinary results with an explicit next action.
- Use test-first red-green-refactor and finish every task with focused tests plus `npm.cmd run verify:protected`.
- Do not add dependencies.

## Scope

This plan implements slices AULA-A1 through AULA-A8 from `docs/superpowers/specs/2026-08-24-aula-vnext-result-anchored-design.md`. Retiring persisted prediction fields and creating an editorial content manifest are independent migrations (AULA-A9/A10) and require their own specifications after A1–A8 reach parity.

## File map

| File | Responsibility |
|---|---|
| `src/features/results/aulaExplanation.ts` | Feature-local request types, source validation, stale analysis gate, actions and governing evidence resolver |
| `src/features/results/aulaExplanation.test.ts` | Pure resolver contract and numerical-source regression cases |
| `src/features/workspace/workspaceCommands.ts` | Typed optional request on `open-dense-results` |
| `src/features/workspace/WorkspaceShell.tsx` | Transient request state and broker-owned surface opening/closing |
| `src/features/results/DenseResultsSurface.tsx` | Pass request to the existing `learn` view; no new surface |
| `src/features/results/ResultExplanationLauncher.tsx` | Accessible result-specific launcher |
| `src/features/results/AulaExplanationView.tsx` | Reading, cause and verification UI for a resolved request |
| `src/features/results/LearnView.tsx` | Anchored explanation first; existing method explorer remains the unanchored path |
| `src/features/results/ResultExtremeCard.tsx` | Optional launcher slot on exact result cards |
| `src/features/results/ResultsPanel.tsx` | Construct requests from stored critical/diagram points and envelope evidence |
| `src/features/results/*.test.tsx` | Component, command, focus, cursor-side and invariance coverage |
| `src/i18n/catalogs.ts` | Semantically equivalent ES/EN copy for every state |
| `src/styles.css` | Existing visual grammar, X2/M1/K0 reflow and 44 px touch targets |
| `scripts/qa-aula-explanation.mjs` | Browser oracle for composition, themes, keyboard, reflow and stale state |
| `package.json` | `qa:aula-explanation` command only; no dependency changes |
| Git history | Closure evidence and explicit protected-boundary statement; no permanent phase report |

---

### Task 1: Pure request and resolver contract

**Files:**
- Create: `src/features/results/aulaExplanation.ts`
- Create: `src/features/results/aulaExplanation.test.ts`
- Read: `src/features/results/provenance.ts`
- Read: `src/engine/projectSignature.ts`
- Read: `src/engine/reliability.ts`

**Interfaces:**
- Consumes: `ProjectModel`, `AnalysisResult`, `ResultRef`, `ExplanationAnchor`, `analysisSignature(project)`, `resolveExplanationAnchor(analysis, ref)`, `resolveReliability(analysis)`.
- Produces: `AulaExplanationRequest`, `AulaExplanationViewModel`, `createAulaExplanationRequest(input)`, and `resolveAulaExplanation(project, analysis, request)`.

- [ ] **Step 1: Write failing tests for exact source identity and stale analysis**

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createHibbelerStyleDiagramPractice } from '../../data/defaultProject';
import { analyzeProject } from '../../engine/solver';
import { analysisSignature } from '../../engine/projectSignature';
import { createAulaExplanationRequest, resolveAulaExplanation } from './aulaExplanation';

describe('resolveAulaExplanation', () => {
  it('resolves the exact stored critical point without copying its value', () => {
    const project = createHibbelerStyleDiagramPractice();
    const analysis = analyzeProject(project);
    const member = analysis.memberResults[0];
    const pointIndex = member.criticalPoints.findIndex((point) => point.quantity === 'moment');
    const point = member.criticalPoints[pointIndex];
    const request = createAulaExplanationRequest({
      entryPoint: 'result-card', project, trigger: null,
      ref: { quantity: 'M', entity: { kind: 'member', id: member.memberId }, caseOrCombinationId: project.loadCases[0].id, signConvention: 'Momento positivo según ejes locales', position: { x: point.x, side: point.side } },
      sourceLocator: { kind: 'critical-point', memberId: member.memberId, pointIndex, quantity: 'M' },
    });
    const resolved = resolveAulaExplanation(project, analysis, request);
    expect(resolved.status).toBe('resolved');
    expect(resolved.anchor.value).toBe(point.value);
    expect(resolved.anchor.source).toContain(`criticalPoints[${pointIndex}]`);
  });

  it('invalidates an anchor after a solver-visible project edit', () => {
    const project = createHibbelerStyleDiagramPractice();
    const analysis = analyzeProject(project);
    const request = createAulaExplanationRequest({
      entryPoint: 'provenance', project, trigger: null,
      ref: { quantity: 'R', entity: { kind: 'node', id: analysis.nodeResults[0].nodeId }, component: 'y', caseOrCombinationId: project.loadCases[0].id, signConvention: 'Global Y' },
      sourceLocator: { kind: 'node-result', nodeId: analysis.nodeResults[0].nodeId, component: 'ry' },
    });
    const changed = structuredClone(project);
    changed.nodalLoads[0].fy *= 2;
    expect(analysisSignature(changed)).not.toBe(request.analysisSignature);
    expect(resolveAulaExplanation(changed, analysis, request).status).toBe('stale-analysis');
  });
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `npx.cmd vitest run src/features/results/aulaExplanation.test.ts --maxWorkers=1`

Expected: FAIL because `aulaExplanation.ts` and its exports do not exist.

- [ ] **Step 3: Implement the feature-local types and resolver**

```ts
import { analysisSignature } from '../../engine/projectSignature';
import { resolveReliability } from '../../engine/reliability';
import type { AnalysisResult, ProjectModel } from '../../types';
import { resolveExplanationAnchor, type ExplanationAnchor, type ResultRef } from './provenance';

export type AulaSourceLocator =
  | { kind: 'node-result'; nodeId: string; component: 'ux' | 'uy' | 'rz' | 'rx' | 'ry' | 'rm' }
  | { kind: 'diagram-point'; memberId: string; pointIndex: number; quantity: 'N' | 'V' | 'M' }
  | { kind: 'critical-point'; memberId: string; pointIndex: number; quantity: 'N' | 'V' | 'M' };

export interface AulaExplanationRequest {
  entryPoint: 'result-card' | 'diagram-cursor' | 'provenance' | 'learn-explorer';
  analysisSignature: string;
  ref: ResultRef;
  sourceLocator: AulaSourceLocator;
  scenarioEvidence?: { kind: 'envelope'; scenarioId: string; branch: 'minimum' | 'maximum'; source: string };
  trigger: HTMLElement | null;
}

export const createAulaExplanationRequest = (input: Omit<AulaExplanationRequest, 'analysisSignature'> & { project: ProjectModel }): AulaExplanationRequest => {
  const { project, ...request } = input;
  return { ...request, analysisSignature: analysisSignature(project) };
};
```

Implement `resolveAulaExplanation` in the same file with this order: compare signatures; reject absent/non-usable analysis; validate locator ID/index/quantity against the selected array; call `resolveExplanationAnchor`; collect project actions whose case participates directly or through combination factors; collect related `analysis.explanation` IDs; prefer `request.scenarioEvidence`, otherwise `resolveReliability(analysis).governing`, otherwise return `{ kind: 'none', reason: 'no-governing-evidence' }`. A locator mismatch returns `insufficient-evidence`, never a thrown error.

- [ ] **Step 4: Add contract cases and run GREEN**

Add tests for node reaction, diagram point left/right side, locator index out of range, `analysis.success === false`, combination factors, scenario evidence, and `reliability.governing`.

Run: `npx.cmd vitest run src/features/results/aulaExplanation.test.ts src/features/results/provenance.test.ts --maxWorkers=1`

Expected: PASS with every status and governing-evidence branch asserted.

- [ ] **Step 5: Verify protected boundaries and commit**

Run: `npm.cmd run verify:protected`

Expected: PASS; no protected engine file changed.

```powershell
git add src/features/results/aulaExplanation.ts src/features/results/aulaExplanation.test.ts
git commit -m "feat(aula): add result explanation contract"
```

### Task 2: Carry the transient request through the existing broker

**Files:**
- Modify: `src/features/workspace/workspaceCommands.ts`
- Modify: `src/features/workspace/workspaceCommands.test.ts`
- Modify: `src/features/workspace/WorkspaceShell.tsx`
- Modify: `src/features/results/DenseResultsSurface.tsx`
- Modify: `src/features/results/DenseResultsSurface.test.tsx`

**Interfaces:**
- Consumes: `AulaExplanationRequest` from Task 1.
- Produces: optional `request` on `open-dense-results` and `DenseResultsSurfaceProps`, cleared when project identity changes or dense closes.

- [ ] **Step 1: Write failing command and surface tests**

```ts
it('carries an Aula request only with the learn view', () => {
  const handler = vi.fn();
  const unsubscribe = onWorkspaceCommand('open-dense-results', handler);
  emitWorkspaceCommand('open-dense-results', { view: 'learn', request, trigger: launcher });
  expect(handler).toHaveBeenCalledWith({ view: 'learn', request, trigger: launcher });
  unsubscribe();
});
```

Extend the dense harness test so `request` reaches a probe in `LearnView` and disappears after changing `projectId`.

- [ ] **Step 2: Run RED**

Run: `npx.cmd vitest run src/features/workspace/workspaceCommands.test.ts src/features/results/DenseResultsSurface.test.tsx --maxWorkers=1`

Expected: FAIL because the command and surface props reject `request`.

- [ ] **Step 3: Add typed payload and transient shell state**

```ts
// workspaceCommands.ts
'open-dense-results': {
  view: DenseResultView;
  request?: AulaExplanationRequest;
  trigger?: HTMLElement | null;
};
```

In `WorkspaceShell.tsx`, add `const [aulaRequest, setAulaRequest] = useState<AulaExplanationRequest | null>(null);`. The command handler sets it only for `view === 'learn'`, passes it to `LazyDenseResults`, and clears it in the existing `projectId` effect and when `setDenseOpen(false)` closes the surface. Continue to call `openSurface('dense', trigger)` so the broker owns focus.

- [ ] **Step 4: Run GREEN and regression tests**

Run: `npx.cmd vitest run src/features/workspace/workspaceCommands.test.ts src/features/results/DenseResultsSurface.test.tsx src/App.test.tsx --maxWorkers=1`

Expected: PASS; dense remains invoked/non-resident and Escape restores focus.

- [ ] **Step 5: Commit**

```powershell
git add src/features/workspace/workspaceCommands.ts src/features/workspace/workspaceCommands.test.ts src/features/workspace/WorkspaceShell.tsx src/features/results/DenseResultsSurface.tsx src/features/results/DenseResultsSurface.test.tsx
git commit -m "feat(aula): route explanation through dense surface"
```

### Task 3: Launch from an exact result card

**Files:**
- Create: `src/features/results/ResultExplanationLauncher.tsx`
- Create: `src/features/results/ResultExplanationLauncher.test.tsx`
- Modify: `src/features/results/ResultExtremeCard.tsx`
- Modify: `src/features/results/ResultsPanel.tsx`
- Modify: `src/features/results/ResultsPanel.test.tsx`
- Modify: `src/i18n/catalogs.ts`

**Interfaces:**
- Consumes: `AulaExplanationRequest` and `emitWorkspaceCommand`.
- Produces: a button named `Entender este resultado` / `Understand this result` that opens `dense/learn` with itself as focus trigger.

- [ ] **Step 1: Write failing launcher tests**

```tsx
it('opens learn with the exact request and launcher trigger', async () => {
  const user = userEvent.setup();
  const listener = vi.fn();
  const stop = onWorkspaceCommand('open-dense-results', listener);
  render(<ResultExplanationLauncher request={request} />);
  const button = screen.getByRole('button', { name: 'Entender este resultado' });
  await user.click(button);
  expect(listener).toHaveBeenCalledWith({ view: 'learn', request: { ...request, trigger: button }, trigger: button });
  stop();
});
```

In `ResultsPanel.test.tsx`, assert that a moment maximum sends a `critical-point` locator whose index points to the same stored critical point shown on the card.

- [ ] **Step 2: Run RED**

Run: `npx.cmd vitest run src/features/results/ResultExplanationLauncher.test.tsx src/features/results/ResultsPanel.test.tsx --maxWorkers=1`

Expected: FAIL because the launcher and request prop do not exist.

- [ ] **Step 3: Implement the launcher and card slot**

```tsx
export const ResultExplanationLauncher = ({ request }: { request: AulaExplanationRequest }) => {
  const { t } = useI18n();
  return <button type="button" className="result-explanation-launcher" onClick={(event) => {
    const trigger = event.currentTarget;
    const next = { ...request, trigger };
    emitWorkspaceCommand('open-dense-results', { view: 'learn', request: next, trigger });
  }}>{t('results.understandThisResult')}</button>;
};
```

Add an optional `explanationRequest` prop to `ResultExtremeCard`. In `ResultsPanel`, construct it from the exact `criticalPoints` index already selected for maximum/minimum, `analysisSignature(project)`, the current case/combination ID, side and sign convention. Do not expose the action when no stored point exists.

- [ ] **Step 4: Add ES/EN copy and run GREEN**

Add these equivalent keys:

```ts
'results.understandThisResult': 'Entender este resultado',
'results.backToResult': 'Volver al resultado',
// English catalog
'results.understandThisResult': 'Understand this result',
'results.backToResult': 'Back to result',
```

Run: `npx.cmd vitest run src/features/results/ResultExplanationLauncher.test.tsx src/features/results/ResultsPanel.test.tsx src/features/results/ResultExtremeCard.test.tsx --maxWorkers=1`

Expected: PASS in Spanish and English; existing `Localizar` and provenance remain present.

- [ ] **Step 5: Commit**

```powershell
git add src/features/results/ResultExplanationLauncher.tsx src/features/results/ResultExplanationLauncher.test.tsx src/features/results/ResultExtremeCard.tsx src/features/results/ResultsPanel.tsx src/features/results/ResultsPanel.test.tsx src/i18n/catalogs.ts
git commit -m "feat(aula): explain exact result cards"
```

### Task 4: Render the Reading depth inside `dense/learn`

**Files:**
- Create: `src/features/results/AulaExplanationView.tsx`
- Create: `src/features/results/AulaExplanationView.test.tsx`
- Modify: `src/features/results/LearnView.tsx`
- Modify: `src/features/results/DenseResultsSurface.tsx`
- Modify: `src/i18n/catalogs.ts`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `AulaExplanationRequest`, `resolveAulaExplanation`, current project/analysis and broker-owned `onOpenChange`.
- Produces: Reading/Cause/Verification tab shell; Task 4 fully implements Reading and state actions while later tasks fill the other panels.

- [ ] **Step 1: Write failing UI-state tests**

```tsx
it.each([
  ['resolved', /M4.*x = 3.20 m.*COMB-2/i],
  ['stale-analysis', /El modelo cambió desde este resultado/i],
  ['insufficient-evidence', /No hay evidencia suficiente/i],
  ['unusable-analysis', /no puede leerse como un resultado ordinario/i],
])('renders %s without inventing a value', async (status, expected) => {
  renderExplanationFixture(status);
  expect(screen.getByRole('region', { name: 'Entender este resultado' }).textContent).toMatch(expected);
});
```

Add tests for initial Reading tab, exact value/unit, scenario, sign, reliability line, source path, `Volver al resultado`, and no prediction/quiz controls.

- [ ] **Step 2: Run RED**

Run: `npx.cmd vitest run src/features/results/AulaExplanationView.test.tsx src/features/results/DenseResultsSurface.test.tsx --maxWorkers=1`

Expected: FAIL because the anchored view does not exist.

- [ ] **Step 3: Implement Reading and status actions**

Create `AulaExplanationView` with a three-tab roving tablist (`ArrowLeft`, `ArrowRight`, `Home`, `End`), a value header, semantic facts list, reliability line and `ProvenanceCard`. For `stale-analysis`, call the existing analysis command; for `unusable-analysis`, emit `open-model-doctor`; for insufficient evidence, offer return/localize only. `LearnView` renders this component before `EducationExplorer` when a request exists and keeps the current unanchored explorer when it does not.

Use this selection rule for Localizar:

```ts
if (request.ref.entity.kind === 'node') setSelection({ kind: 'node', id: request.ref.entity.id });
else setSelection({ kind: 'member', id: request.ref.entity.id });
```

Never derive selection from `request.ref.position.x`.

- [ ] **Step 4: Add styles/copy and run GREEN**

Use existing surface, typography, focus and technical-color tokens. At `max-width: 1023px`, keep one scrolling panel, 44 px controls and no horizontal overflow. Add exact ES/EN copy for all four statuses and the three depth labels.

Run: `npx.cmd vitest run src/features/results/AulaExplanationView.test.tsx src/features/results/DenseResultsSurface.test.tsx src/features/results/phase1NumericInvariance.test.ts --maxWorkers=1`

Expected: PASS; numerical invariance remains byte-for-byte.

- [ ] **Step 5: Commit**

```powershell
git add src/features/results/AulaExplanationView.tsx src/features/results/AulaExplanationView.test.tsx src/features/results/LearnView.tsx src/features/results/DenseResultsSurface.tsx src/i18n/catalogs.ts src/styles.css
git commit -m "feat(aula): add anchored result reading"
```

### Task 5: Launch from a pinned diagram cursor with exact side

**Files:**
- Modify: `src/features/results/ResultsPanel.tsx`
- Modify: `src/features/results/ResultsPanel.test.tsx`
- Modify: `src/features/results/aulaExplanation.ts`
- Modify: `src/features/results/aulaExplanation.test.ts`

**Interfaces:**
- Consumes: the current pinned `resultCursor`, the already evaluated stored left/right point and `AulaExplanationRequest`.
- Produces: a cursor launcher only when the cursor resolves to an exact stored diagram or critical point; discontinuities preserve `left` or `right`.

- [ ] **Step 1: Write failing discontinuity and ordinary-point tests**

```tsx
it('anchors each side of a pinned jump to a distinct stored result', async () => {
  const { leftButton, rightButton, requests } = await openPinnedJumpFixture();
  await userEvent.click(leftButton);
  await userEvent.click(rightButton);
  expect(requests.map((item) => item.ref.position?.side)).toEqual(['left', 'right']);
  expect(requests.every((item) => item.sourceLocator.kind === 'diagram-point')).toBe(true);
});
```

Also assert that an interpolated hover position does not show the launcher and that pinning never changes structural selection until Localizar is chosen.

- [ ] **Step 2: Run RED**

Run: `npx.cmd vitest run src/features/results/ResultsPanel.test.tsx src/features/results/aulaExplanation.test.ts --maxWorkers=1`

Expected: FAIL because cursor readings do not emit requests.

- [ ] **Step 3: Build requests only from stored point indices**

Add a pure `findStoredDiagramPointLocator(memberResult, quantity, x, side)` that returns a locator only when an entry in `diagram` or `criticalPoints` has the exact same `x` and compatible side. Render separate left/right actions at a jump. Do not add an epsilon lookup; the displayed interpolated cursor remains readable but not explainable as a stored anchor.

- [ ] **Step 4: Run GREEN and selection regressions**

Run: `npx.cmd vitest run src/features/results/ResultsPanel.test.tsx src/features/results/aulaExplanation.test.ts src/App.test.tsx --maxWorkers=1`

Expected: PASS; `{ kind, id }` selection remains unchanged until confirmation/localization.

- [ ] **Step 5: Commit**

```powershell
git add src/features/results/ResultsPanel.tsx src/features/results/ResultsPanel.test.tsx src/features/results/aulaExplanation.ts src/features/results/aulaExplanation.test.ts
git commit -m "feat(aula): explain pinned diagram readings"
```

### Task 6: Add Cause and explicit governing evidence

**Files:**
- Modify: `src/features/results/AulaExplanationView.tsx`
- Modify: `src/features/results/AulaExplanationView.test.tsx`
- Modify: `src/features/results/aulaExplanation.ts`
- Modify: `src/features/results/aulaExplanation.test.ts`
- Modify: `src/features/results/ResultsPanel.tsx`
- Modify: `src/i18n/catalogs.ts`

**Interfaces:**
- Consumes: participating action IDs, related explanation step IDs, optional envelope `scenarioEvidence`, and `reliability.governing`.
- Produces: human cause chain and exactly one typed meaning of governing: scenario, quality check, or no evidence.

- [ ] **Step 1: Write failing semantic tests**

```ts
it('never says a scenario governs without envelope evidence', () => {
  const view = resolveAulaExplanation(project, analysis, requestWithoutScenarioEvidence);
  expect(view.governingEvidence.kind).not.toBe('scenario');
});

it('uses the explicit envelope scenario and source', () => {
  const request = { ...baseRequest, scenarioEvidence: { kind: 'envelope' as const, scenarioId: 'COMB-4', branch: 'minimum' as const, source: 'DiagramEnvelope.minimumScenario' } };
  expect(resolveAulaExplanation(project, analysis, request).governingEvidence).toEqual({ kind: 'scenario', scenarioId: 'COMB-4', source: 'DiagramEnvelope.minimumScenario' });
});
```

UI tests must reject phrases matching percentage contribution and require the limitation copy when only participating actions are known.

- [ ] **Step 2: Run RED**

Run: `npx.cmd vitest run src/features/results/aulaExplanation.test.ts src/features/results/AulaExplanationView.test.tsx --maxWorkers=1`

Expected: FAIL until Cause and governing states are rendered.

- [ ] **Step 3: Implement cause chain without causal percentages**

Render, in order: object/position, case or combination factors, action IDs in participating cases, related `ExplanationStep` summaries, then governing evidence. Label actions «participan en este escenario». When there is no decomposition, show «El análisis no descompone este valor por carga». For quality governance, show the exact check label/message and source `AnalysisResult.reliability.governing`.

- [ ] **Step 4: Run GREEN**

Run: `npx.cmd vitest run src/features/results/aulaExplanation.test.ts src/features/results/AulaExplanationView.test.tsx src/features/results/ResultsPanel.test.tsx --maxWorkers=1`

Expected: PASS for scenario, quality-check and no-evidence branches; no test accepts inferred governing copy.

- [ ] **Step 5: Commit**

```powershell
git add src/features/results/AulaExplanationView.tsx src/features/results/AulaExplanationView.test.tsx src/features/results/aulaExplanation.ts src/features/results/aulaExplanation.test.ts src/features/results/ResultsPanel.tsx src/i18n/catalogs.ts
git commit -m "feat(aula): trace causes and governing evidence"
```

### Task 7: Add Verification with lazy education trace

**Files:**
- Modify: `src/features/results/AulaExplanationView.tsx`
- Modify: `src/features/results/AulaExplanationView.test.tsx`
- Refactor: `src/features/results/LearnView.tsx`
- Create: `src/features/results/EducationExplorer.tsx`
- Modify: `src/i18n/catalogs.ts`

**Interfaces:**
- Consumes: existing `ensureEducationTrace`, `analysis.explanation`, reliability/equilibrium data and current `EducationExplorer` behavior.
- Produces: Verification summary immediately; the existing explorer mounts and requests trace only after explicit expansion.

- [ ] **Step 1: Write failing lazy-load tests**

```tsx
it('does not request EducationTrace until verification detail is opened', async () => {
  renderAnchoredExplanation({ ensureEducationTrace });
  expect(ensureEducationTrace).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('tab', { name: 'Verificación' }));
  expect(ensureEducationTrace).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Abrir detalle del método' }));
  expect(ensureEducationTrace).toHaveBeenCalledTimes(1);
});
```

Keep the existing unanchored Learn test proving that its explorer still loads the trace when opened directly.

- [ ] **Step 2: Run RED**

Run: `npx.cmd vitest run src/features/results/AulaExplanationView.test.tsx src/features/results/DenseResultsSurface.test.tsx --maxWorkers=1`

Expected: FAIL because the explorer currently requests trace as soon as `LearnView` mounts.

- [ ] **Step 3: Extract and gate the existing explorer**

Move `MatrixView`, `NumericalSubstitution` and `EducationExplorer` unchanged in behavior to `EducationExplorer.tsx`. In anchored mode, Verification renders reliability, equilibrium, constraints and provenance first; mount `EducationExplorer` only after `Abrir detalle del método`. Unanchored `LearnView` mounts it immediately, preserving current behavior.

- [ ] **Step 4: Run GREEN and numerical gates**

Run: `npx.cmd vitest run src/features/results/AulaExplanationView.test.tsx src/features/results/DenseResultsSurface.test.tsx src/features/results/phase1NumericInvariance.test.ts --maxWorkers=1`

Expected: PASS; matrix and substitution tests retain their exact values.

Run: `npm.cmd run verify:protected`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/features/results/AulaExplanationView.tsx src/features/results/AulaExplanationView.test.tsx src/features/results/LearnView.tsx src/features/results/EducationExplorer.tsx src/i18n/catalogs.ts
git commit -m "feat(aula): verify results with lazy trace"
```

### Task 8: Responsive, accessibility and browser closure

**Files:**
- Create: `scripts/qa-aula-explanation.mjs`
- Modify: `package.json`
- Modify: `src/styles.css`
- Modify: focused component tests found during browser QA
- Do not create a permanent phase report; preserve closure evidence in Git history

**Interfaces:**
- Consumes: the complete A1–A7 flow.
- Produces: `npm.cmd run qa:aula-explanation` and a closure report with reproducible evidence.

- [ ] **Step 1: Write the browser oracle before CSS fixes**

The script must build once, launch the preview server, and run these cases:

```js
const cases = [
  { id: 'x2-day-es', viewport: { width: 1440, height: 900 }, colorScheme: 'light', language: 'es' },
  { id: 'x2-night-en', viewport: { width: 1440, height: 900 }, colorScheme: 'dark', language: 'en' },
  { id: 'm1-day-es', viewport: { width: 1100, height: 768 }, colorScheme: 'light', language: 'es' },
  { id: 'k0-portrait-day-es', viewport: { width: 390, height: 844 }, colorScheme: 'light', language: 'es', hasTouch: true },
  { id: 'k0-landscape-night-en', viewport: { width: 844, height: 390 }, colorScheme: 'dark', language: 'en', hasTouch: true },
];
```

For every case assert: correct `data-shell-class`; drawer for X2/M1 and fullscreen for K0; launcher and three depth tabs accessible; focus returns after Escape; scroll width does not exceed client width; every visible interactive target on touch is at least 44×44; no console/page errors. Add a reduced-motion context and keyboard-only tab traversal. At 200 % equivalent reflow (`720×900` CSS viewport with enlarged text), assert no horizontal overflow or obscured return action.

- [ ] **Step 2: Run the new oracle and record RED**

Run: `node scripts/qa-aula-explanation.mjs`

Expected: FAIL on any missing selector, target, overflow or focus condition. Keep the first failure text in the report notes; do not weaken assertions.

- [ ] **Step 3: Fix only focal layout/accessibility defects**

Adjust existing Aula explanation selectors in `src/styles.css`; keep presentation and modal/focus behavior in the broker. Use CSS logical properties, safe-area insets and existing tokens. Add `aria-live` only to changing status text, not the entire surface. Ensure equations have adjacent textual labels and no information depends only on color.

- [ ] **Step 4: Run the closure gate set**

Run all commands freshly:

```powershell
npx.cmd vitest run src/features/results/aulaExplanation.test.ts src/features/results/ResultExplanationLauncher.test.tsx src/features/results/AulaExplanationView.test.tsx src/features/results/DenseResultsSurface.test.tsx src/features/results/ResultsPanel.test.tsx src/features/results/phase1NumericInvariance.test.ts --maxWorkers=1
npm.cmd run qa:aula-explanation
npm.cmd run qa:shell-composition
npm.cmd run qa:results-cards
npm.cmd run verify:protected
npm.cmd run verify:docs
```

Expected: every command exits 0; Chromium/WebKit evidence contains no console/page errors; no solver or protected-file diff exists.

- [ ] **Step 5: Write report, verify it and commit**

The closure commit must state implemented slices, exact commands/outcomes, X2/M1/K0 and Day/Night/ES/EN coverage, source SHA, and explicit non-changes to solver, `ProjectModel`, persistence and formats.

```powershell
git add scripts/qa-aula-explanation.mjs package.json src/styles.css src/features/results src/features/workspace src/i18n/catalogs.ts
git commit -m "feat(aula): complete result-first explanation"
```

After the commit, re-run `git status --short` and inspect the exact diff against the integration base. Only with explicit user approval, push without force, fast-forward `main` only if the remote SHA still matches the reviewed base, and verify source `main` separately from any authorized `gh-pages` publication.

## Self-review record

- **Spec coverage:** A1–A8 map to Tasks 1–8. Reading, cause, verification, primary/alternate entry, stale/unusable/insufficient states, exact source identity, governing semantics, responsive behavior and accessibility all have an implementation task and a gate.
- **Independent exclusions:** A9 prediction-storage migration and A10 editorial manifest remain excluded because each changes a separate persistence or content-governance subsystem. Neither blocks A1–A8.
- **Type consistency:** `AulaExplanationRequest`, `AulaSourceLocator`, `scenarioEvidence`, `createAulaExplanationRequest` and `resolveAulaExplanation` are defined in Task 1 and consumed with the same names in Tasks 2–8.
- **Protected boundary:** No task edits solver, `ProjectModel`, workers, persistence, import/export or numerical formats.
