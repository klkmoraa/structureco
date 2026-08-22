# Top Bar de trabajo · Fase 6 Implementation Plan

**Clasificación:** `AUDIT/TEMPORARY`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la Top Bar por una cabecera jerárquica, compacta y física en X2/M1/K0, sin cambiar ningún comando, cálculo, persistencia o ruta de producto.

**Architecture:** `TopBar` retiene el contexto de comandos y los callbacks de exportación, pero reagrupa la presentación en proyecto, resumen de análisis, acción primaria, salud y utilidades. Los paneles usan los popovers existentes; el CSS aislado bajo `topbar--atelier` declara la composición por Shell class y neutraliza las reglas antiguas sin tocar el resto del Workspace.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, lucide-react, motion/react ya instalado, variables CSS del design system y Playwright/Chromium.

## Global Constraints

- Trabajar sólo en `codex/clay-workspace-phase-2`; no hacer merge a `main`.
- Mantener motor, solver, ProjectModel, almacenamiento, import/export, signos, unidades, IDs, topología, historial y resultados.
- Resolver X2/M1/K0 mediante `ShellCompositionProvider`; no añadir un breakpoint o `matchMedia` local.
- Mantener el registro de comandos como fuente de verdad de Analizar, deshacer/rehacer, Datasheet, Doctor, tema y exportaciones.
- Añadir al catálogo español/inglés sólo los rótulos nuevos de la cabecera; no dejar texto de interfaz escrito directamente en JSX.
- Día y Noche comparten colores técnicos; sin glassmorphism ni brillo decorativo. Analizar tiene fondo verde y tipografía blanca.
- Los controles táctiles miden al menos 44px y el modo reducido conserva la alternativa sin movimiento.

---

### Task 1: Caracterizar el contrato funcional antes de la nueva composición

**Files:**

- Modify: `src/features/topbar/TopBar.test.tsx`
- Modify: `src/features/topbar/TopBar.commandParity.test.tsx`
- Modify: `src/i18n/catalogs.ts`

**Interfaces:**

- Consumes: `resolveTopBarCommand`, `TopBarCommandContext`, callbacks `onOpenHome`/`onOpenSpace3D`, `renameProject` y `AnalysisStatus`.
- Produces: pruebas de contrato de Proyecto, Contexto de análisis, Analizar, Salud y Utilidades que sustituyen las aserciones de mini-clusters históricos.

- [ ] **Step 1: Write the failing behavior tests**

```tsx
it('opens the project panel, edits the project name there, and returns focus to its trigger', async () => {
  render(<TopBarHarness><TopBar onOpenHome={vi.fn()} /></TopBarHarness>);
  const trigger = screen.getByRole('button', { name: /proyecto actual/i });
  await user.click(trigger);
  const name = screen.getByRole('textbox', { name: /nombre del proyecto/i });
  await user.clear(name);
  await user.type(name, 'Pórtico norte{Enter}');
  expect(name).toHaveValue('Pórtico norte');
  await user.keyboard('{Escape}');
  expect(document.activeElement).toBe(trigger);
});

it('keeps all analysis inputs behind one context launcher', async () => {
  render(<TopBarHarness><TopBar /></TopBarHarness>);
  await user.click(screen.getByRole('button', { name: /configuración de análisis/i }));
  expect(screen.getByRole('combobox', { name: /caso o combinación/i })).toBeTruthy();
  expect(screen.getByRole('combobox', { name: /unidades/i })).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify red**

Run: `npm.cmd exec vitest run src/features/topbar/TopBar.test.tsx -- --maxWorkers=1`

Expected: FAIL because the project name is permanent and analysis selectors are separate controls.

- [ ] **Step 3: Preserve command parity coverage**

Retain the construction tests for `resolveTopBarCommand`. Add assertions that the new visible Analyze, Datasheet and Model Doctor triggers invoke the same `run` source as the command palette and that no direct Datasheet/export/print implementation is added.

- [ ] **Step 4: Re-run the characterization set**

Run: `npm.cmd exec vitest run src/features/topbar/TopBar.commandParity.test.tsx -- --maxWorkers=1`

Expected: PASS; command authority is known before JSX moves.

### Task 2: Recompose Top Bar controls and panels

**Files:**

- Modify: `src/features/topbar/TopBar.tsx`
- Modify: `src/features/topbar/TopBar.test.tsx`
- Modify: `src/features/topbar/TopBar.commandParity.test.tsx`
- Modify: `src/i18n/catalogs.ts`

**Interfaces:**

- Consumes: `command(id)`, `AnalysisStatus`, `updateProjectView`, `updateProjectAnalysisSettings`, export helpers and the existing `data-topbar-zone` identifiers.
- Produces: `.topbar--atelier`, `[data-topbar-role='project']`, `[data-topbar-role='analysis']`, `[data-topbar-role='primary']`, `[data-topbar-role='health']` and `[data-topbar-role='utilities']`.

- [ ] **Step 1: Implement the project panel**

```tsx
<button ref={projectMenuButtonRef} className="topbar-project-trigger"
  aria-label={t('topbar.currentProject')} aria-expanded={showProjectMenu}
  aria-haspopup="dialog" onClick={toggleProjectMenu}>
  <span>{t('topbar.projectLabel')}</span><strong>{project.name}</strong><ChevronDown aria-hidden="true" />
</button>
{showProjectMenu ? <m.div className="popover topbar-project-panel" role="dialog" aria-label={t('topbar.currentProject')}>
  <label><span>{t('project.name')}</span><input ref={projectNameRef} value={projectNameDraft} onBlur={commitProjectName} /></label>
  {/* existing new/example/import actions */}
</m.div> : null}
```

Move the exact existing project replacement/import callbacks into this panel. Update focus selection so it targets the textbox in the dialog and returns to `projectMenuButtonRef` on Escape or Import Center close.

Add `topbar.currentProject`, `topbar.projectLabel`, `topbar.analysisSettings`, `topbar.analysisSummary` and `topbar.utilities` to Spanish and English in `catalogs.ts`; tests use the translated accessible labels rather than literal implementation copy.

- [ ] **Step 2: Implement one analysis summary and one panel**

```tsx
<button className="topbar-analysis-trigger" aria-expanded={showAnalysisMenu}
  aria-haspopup="dialog" onClick={toggleAnalysisMenu}>
  <span>{scenarioName}</span><small>{analysisOrderLabel} · {project.settings.units}</small>
</button>
{showAnalysisMenu ? <m.div className="popover topbar-analysis-panel" role="dialog">
  {/* the four existing selects, mounted exactly once */}
</m.div> : null}
```

Use the current `setSelectedCombinationId`, `updateProjectView` and `updateProjectAnalysisSettings` handlers unchanged. Move former mobile duplicates into this panel; expose the same panel from K0 only through the existing setter paths.

- [ ] **Step 3: Group health and utility paths**

Keep `<AnalysisStatus />` and the Model Doctor command inside the status zone. Keep the primary Analyze `Button` sourced from `analysis:run` with its visible label in every composition. Move secondary history/export/theme/layout entries under one utility trigger while preserving Space 3D's callback and portable export/clipboard failures.

- [ ] **Step 4: Run Top Bar behavior and parity tests**

Run:

```bash
npm.cmd exec vitest run src/features/topbar/TopBar.test.tsx src/features/topbar/TopBar.commandParity.test.tsx -- --maxWorkers=1
```

Expected: PASS; project rename, imports, exports, Space 3D, health states, layout commands and palette parity still work through the new controls.

### Task 3: Apply complete X2/M1/K0 visual grammar and geometry QA

**Files:**

- Create: `src/features/topbar/topbar.css`
- Modify: `src/features/topbar/TopBar.tsx`
- Modify: `scripts/qa-topbar.mjs`

**Interfaces:**

- Consumes: `data-shell-class` on `.app-shell`, Clay tokens and the semantic roles emitted in Task 2.
- Produces: one full-width matte work bar; no control collision, clipping or horizontal overflow in X2/M1/K0.

- [ ] **Step 1: Attach the isolated stylesheet**

```tsx
import './topbar.css';
<header ref={topbarRef} className="topbar topbar--atelier">
```

Scope all replacement rules to `.topbar--atelier`. Define elevated rest, one-level hover and inset pressed states for project, summary, utility and health controls. Keep technical data views flat.

- [ ] **Step 2: Define each composition deliberately**

```css
.app-shell[data-shell-class='X2'] .topbar--atelier { /* full project + analysis summary */ }
.app-shell[data-shell-class='M1'] .topbar--atelier { /* one-line summary, utility overflow */ }
.app-shell[data-shell-class='K0'] .topbar--atelier { /* project + text Analyze + health, 44px targets */ }
```

At K0 hide desktop-only controls only when their commands are available from the Project panel. Do not hide the green button label, AnalysisStatus or Model Doctor accessibility path. Use `#fff`/the foreground token for Analyze text in both themes.

- [ ] **Step 3: Update browser geometry assertions**

Replace selectors that assume a permanently visible project textbox or `Más acciones` at K0. Open the Project panel to rename a long Spanish and English name, assert zone/role rectangles do not overlap, dialogs close by Escape, status/Doctor retain accessible names and focus targets remain visible through 360px portrait and 740px landscape.

- [ ] **Step 4: Run focused visual QA**

Run: `npm.cmd run qa:topbar`

Expected: build completes and Chromium reports no overlap/overflow across the continuous 1024–1600px sweep, X2/M1/K0 boundaries, English/Spanish long project names and mobile portrait/landscape.

### Task 4: Regression gates, evidence and handoff

**Files:**

- Create: `reports/evidence/2026-08-21-clay-topbar-phase-6/*`
- Create: `reports/2026-08-21-HHmm-clay-topbar-phase-6.md`
- Modify: `docs/README.md`

- [ ] **Step 1: Capture necessary visual milestones**

Capture desktop Día, tablet Noche, mobile Día and mobile Noche from the same browser scenario. Inspect hierarchy, project truncation, white Analyze foreground, Clay press depth and absence of raw duplicate actions.

- [ ] **Step 2: Run final gates**

Run:

```bash
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run verify:docs
npm.cmd run verify:protected
npm.cmd run build
npm.cmd test -- --maxWorkers=1
npm.cmd run qa:topbar
```

Record exact PASS/failure counts. If the serial suite stalls or has unrelated baseline failures, state it as non-conclusive and preserve focused gates.

- [ ] **Step 3: Create the Spanish handoff report and commit**

Use the report template in `reports/`, list exact files, evidence and gates, and stage only Phase 6 files. Do not stage `reports/evidence/2026-08-21-clay-mobile-density-phase-5/full-test.log`.

```bash
git add -- docs/README.md docs/superpowers/specs/2026-08-21-clay-topbar-phase-6-design.md docs/superpowers/plans/2026-08-21-clay-topbar-phase-6.md src/features/topbar src/i18n/catalogs.ts scripts/qa-topbar.mjs reports
git commit -m "feat(ui): redesign workspace top bar"
```

- [ ] **Step 4: Push only after user confirmation for this commit**

Run: `git push origin codex/clay-workspace-phase-2`

Expected: the exact committed SHA is available for review on the existing PR; never merge `main`.
