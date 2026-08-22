# Densidad móvil, dock y edición avanzada · Fase 5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir las superficies móviles del Workspace en un dock compacto, resultados legibles y propiedades avanzadas bajo demanda sin alterar el dominio estructural.

**Architecture:** `ToolRail` agrupa las tres rutas de superficie existentes detrás de un único lanzador visual y conserva los comandos tipados. `ResultsPanel` controla solamente la visibilidad local de un rail de métricas, mientras que el Inspector mueve los mismos campos avanzados a un subflujo fullscreen K0 mediante el overlay compartido. El broker sigue determinando las superficies pares del Workspace.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, lucide-react, motion/react ya instalado, CSS variables del design system y Playwright/Chromium para QA.

## Global Constraints

- Trabajar sólo en `codex/clay-workspace-phase-2`; nunca hacer merge a `main`.
- Preservar motor, solver, ProjectModel, persistencia del proyecto, import/export, signos, unidades, IDs, topología y pruebas estructurales.
- X2/M1/K0 se resuelven por `ShellCompositionProvider`; no introducir `matchMedia` locales.
- El broker de superficies conserva la autoridad de `shellClass × surface → presentation`.
- Día y Noche comparten los colores técnicos; no introducir glassmorphism, brillo ni gradientes decorativos.
- Todo control táctil mantiene un área mínima de 44px. `prefers-reduced-motion` sigue respetándose.

---

### Task 1: Lanzador único de paneles y dock compacto K0

**Files:**

- Modify: `src/features/canvas/ToolRail.tsx`
- Modify: `src/features/canvas/ToolRail.test.tsx`
- Modify: `src/features/workspace/phase1.css`

**Interfaces:**

- Consumes: `emitWorkspaceCommand('open-analysis-setup' | 'open-view-settings' | 'open-results')`, `ShellCompositionContext` y las hojas portaled existentes del riel.
- Produces: un control `[data-workspace-panels-launcher]` en X2/M1 y un elemento `Paneles` que abre la hoja K0; las tres rutas siguen emitiendo los mismos comandos.

- [ ] **Step 1: Write the failing test**

```tsx
it('groups workspace panels behind one icon without losing any route', async () => {
  renderToolRail('M1');
  await user.click(screen.getByRole('button', { name: /abrir paneles/i }));
  await user.click(screen.getByRole('button', { name: /resultados/i }));
  expect(openResults).toHaveBeenCalledOnce();
  expect(screen.queryByRole('button', { name: /cargas de análisis/i })).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd exec vitest run src/features/canvas/ToolRail.test.tsx -- --maxWorkers=1`

Expected: FAIL because the rail still exposes three independent launchers and there is no `Abrir paneles`.

- [ ] **Step 3: Write minimal implementation**

```tsx
const WorkspacePanelsLauncher = ({ compact }: { compact: boolean }) => (
  <Popover label={t('workspace.panels')} open={panelsOpen} onOpenChange={setPanelsOpen} className="tool-rail-surface-launcher">
    {workspaceActions.map((action) => <button key={action.command} onClick={() => emitWorkspaceCommand(action.command)}>{t(action.labelKey)}</button>)}
  </Popover>
);
```

Replace the mobile direct actions with one `Paneles` entry that changes the existing portal state to `workspace`; keep focus return bound to that entry. Style the K0 dock as a centered icon capsule while preserving the reserved layout row for safe sheets.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd exec vitest run src/features/canvas/ToolRail.test.tsx -- --maxWorkers=1`

Expected: PASS; X2/M1 expose one launcher, K0 opens the Paneles sheet, and all three commands remain reachable.

- [ ] **Step 5: Commit**

```bash
git add src/features/canvas/ToolRail.tsx src/features/canvas/ToolRail.test.tsx src/features/workspace/phase1.css
git commit -m "feat(ui): compact workspace panel launcher"
```

### Task 2: Rail de métricas horizontal y ocultable en Resultados K0

**Files:**

- Modify: `src/features/results/ResultsPanel.tsx`
- Modify: `src/features/results/ResultsPanel.test.tsx`
- Modify: `src/features/workspace/phase1.css`

**Interfaces:**

- Consumes: `ResultsPanelProps.presentation`, los actuales `ResultExtremeCard` y datos de diagrama/deformada.
- Produces: `#results-mobile-metrics` con `data-mobile-metrics-visible`, control accesible de mostrar/ocultar y rail sólo para presentación `sheet`.

- [ ] **Step 1: Write the failing test**

```tsx
it('keeps K0 metric cards scrollable and lets the user hide them without closing Results', async () => {
  setViewport('phone');
  renderResults();
  await user.click(screen.getByRole('button', { name: 'Analizar estructura' }));
  const toggle = screen.getByRole('button', { name: /ocultar tarjetas de resultados/i });
  await user.click(toggle);
  expect(screen.getByTestId('results-mobile-metrics')).toHaveAttribute('data-mobile-metrics-visible', 'false');
  expect(screen.getByRole('dialog', { name: /resultados/i })).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd exec vitest run src/features/results/ResultsPanel.test.tsx -- --maxWorkers=1`

Expected: FAIL because no mobile metric rail or visibility control exists.

- [ ] **Step 3: Write minimal implementation**

```tsx
const [mobileMetricsVisible, setMobileMetricsVisible] = useState(true);
<button aria-controls="results-mobile-metrics" aria-expanded={mobileMetricsVisible} onClick={() => setMobileMetricsVisible((value) => !value)} />
<ResultMetricRail mobile={isMobile} visible={mobileMetricsVisible}>{cards}</ResultMetricRail>
```

Pass presentation and visibility into `DiagramView` and `DeformationView`; use a K0-only horizontal scroll-snap rail with compact cards. Keep X2/M1 markup and numerical calculations unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd exec vitest run src/features/results/ResultsPanel.test.tsx src/features/results/clayResultsPhase3.test.ts -- --maxWorkers=1`

Expected: PASS; hiding only removes the rail, not the dialog, analysis, tabs or graph.

- [ ] **Step 5: Commit**

```bash
git add src/features/results/ResultsPanel.tsx src/features/results/ResultsPanel.test.tsx src/features/workspace/phase1.css
git commit -m "feat(ui): streamline mobile results metrics"
```

### Task 3: Resumen de avanzado y editor K0 con detents 35/55/85

**Files:**

- Modify: `src/features/inspector/InspectorPrimitives.tsx`
- Modify: `src/features/inspector/Inspector.test.tsx`
- Modify: `src/i18n/catalogs.ts`
- Modify: `src/features/workspace/phase1.css`

**Interfaces:**

- Consumes: `useShellComposition`, `Drawer` de `design-system/components/overlays`, children avanzados ya existentes y `InspectorDetent` persistido.
- Produces: resumen K0 con `Editar todo`, editor fullscreen que monta una única instancia de los campos y CSS de detents 35/55/85.

- [ ] **Step 1: Write the failing test**

```tsx
it('opens advanced properties in the K0 full editor without duplicating inline fields', async () => {
  renderInspector(project, { modal: true, mobileDetent: 'medium' });
  await user.click(screen.getByRole('button', { name: /propiedades avanzadas/i }));
  await user.click(screen.getByRole('button', { name: /editar todo/i }));
  expect(screen.getByRole('dialog', { name: /propiedades avanzadas/i })).toBeTruthy();
  expect(document.querySelectorAll('.inspector-advanced__content input')).toHaveLength(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd exec vitest run src/features/inspector/Inspector.test.tsx -- --maxWorkers=1`

Expected: FAIL because K0 leaves advanced fields mounted inside the accordion and has no full editor.

- [ ] **Step 3: Write minimal implementation**

```tsx
const compact = shellClass === 'K0';
const [editing, setEditing] = useState(false);
const content = compact ? <InspectorAdvancedSummary onEdit={() => setEditing(true)} /> : children;
return <>
  <Accordion items={[{ id, title, content }]} />
  {compact ? <Drawer open={editing} onOpenChange={setEditing} presentation="fullscreen" title={title}>{children}</Drawer> : null}
</>;
```

Add translated summary/action strings. Apply 35%, 55% and 85% only to existing K0 detent selectors; retain `useWorkspaceLayoutPreferences` unchanged so its local persistence remains the authority.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd exec vitest run src/features/inspector/Inspector.test.tsx src/features/workspace/useWorkspaceLayoutPreferences.test.tsx -- --maxWorkers=1`

Expected: PASS; full editor uses shared focus/escape behavior, fields exist once, and detent persistence remains intact.

- [ ] **Step 5: Commit**

```bash
git add src/features/inspector/InspectorPrimitives.tsx src/features/inspector/Inspector.test.tsx src/i18n/catalogs.ts src/features/workspace/phase1.css
git commit -m "feat(ui): simplify advanced mobile properties"
```

### Task 4: Evidence, protection and handoff

**Files:**

- Create: `scripts/qa-clay-mobile-density-phase5.mjs`
- Create: `reports/evidence/2026-08-21-clay-mobile-density-phase-5/*`
- Create: `reports/2026-08-21-HHmm-clay-mobile-density-phase-5.md`
- Modify: `docs/README.md`

- [ ] **Step 1: Write the failing QA assertion**

```js
assert.equal(await page.locator('[data-workspace-panels-launcher]').count(), 1);
assert.equal(await page.locator('[data-native-canvas-surface-actions]').count(), 0);
assert.equal(await page.locator('.mobile-tool-dock').evaluate((node) => node.scrollWidth <= node.clientWidth), true);
```

- [ ] **Step 2: Run QA to verify the assertion is meaningful**

Run: `node scripts/qa-clay-mobile-density-phase5.mjs`

Expected: it fails before the final selector/layout implementation or reports the exact unmet assertion.

- [ ] **Step 3: Implement deterministic QA and report**

Capture 1440px Día, 1024px Noche, 390px Día and 390px Noche; check overflow, dock/sheet separation, metrics rail visibility and advanced editor launch. Write the Spanish handoff report with exact commands and evidence paths.

- [ ] **Step 4: Run final verification**

Run:

```bash
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run verify:docs
npm.cmd run verify:protected
npm.cmd run build
npm.cmd test -- --maxWorkers=1
node scripts/qa-clay-mobile-density-phase5.mjs
```

Expected: focal tests, protected boundary, build, serial suite and visual QA provide fresh evidence; unrelated warnings, if any, are recorded without being called PASS.

- [ ] **Step 5: Commit and push the approved branch**

```bash
git add docs/README.md docs/superpowers scripts/qa-clay-mobile-density-phase5.mjs reports
git commit -m "feat(ui): refine mobile workspace density"
git push origin codex/clay-workspace-phase-2
```
