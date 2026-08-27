# Personal Library Implementation Plan

**Clasificación:** `REFERENCE`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver CRUD, search, trash/restore and explicit application of safe material, section, pair and visual favorites without coupling them to project persistence.

**Architecture:** A feature-local immutable repository validates a versioned `localStorage` envelope and exposes typed operations. Home mounts the complete management view; Inspector and View mount focused adapters that read/write the same key and apply through existing project commands. Structural favorites store catalog IDs only; visual favorites store theme plus `CanvasViewSettings`.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, existing Home/Inspector design system and browser QA scripts.

## Global Constraints

- Do not change solver, workers, numerical formulation, result values, `ProjectModel` schema or project persistence formats.
- Never infer material/section identity from numeric values or names.
- Apply pairs atomically through `selection.bulk.apply` and one undo entry.
- Keep `structureCo.personal-library.v1` separate from every project key/repository.
- No dependencies, presets of loads/supports/combinations, cloud sync or custom numeric catalogs.
- Use current visual tokens and responsive X2/M1/K0 composition; touch targets are at least 44 px.

---

### Task 1: Versioned personal repository

**Files:**
- Create: `src/features/library/personalLibrary.ts`
- Create: `src/features/library/personalLibrary.test.ts`

**Interfaces:**
- Produces `PersonalFavorite`, `PersonalFavoriteDraft`, `readPersonalLibrary`, `writePersonalLibrary`, `createFavorite`, `renameFavorite`, `duplicateFavorite`, `deleteFavorite`, `restoreFavorite`, `searchFavorites`, `uniqueFavoriteName`.

- [ ] Write RED tests for all four kinds, unique names, soft delete/restore conflict, catalog validation, corrupt/future envelopes and write failure.

```ts
it('keeps explicit ids and restores only without an active name conflict', () => {
  const first = createFavorite([], { kind: 'pair', name: 'Acero + IPE', materialId: 'steel-a992', sectionId: 'ipe-300', unitsAtSave: 'kN-m' }, 'fav-1', '2026-08-24T12:00:00.000Z');
  const deleted = deleteFavorite(first, 'fav-1', '2026-08-24T12:01:00.000Z');
  const occupied = createFavorite(deleted, { kind: 'material', name: 'Acero + IPE', materialId: 'steel-a36', unitsAtSave: 'kN-m' }, 'fav-2', '2026-08-24T12:02:00.000Z');
  expect(() => restoreFavorite(occupied, 'fav-1', '2026-08-24T12:03:00.000Z')).toThrow(/nombre/i);
  expect(occupied[0]).toMatchObject({ materialId: 'steel-a992', sectionId: 'ipe-300' });
});
```

- [ ] Run `npx.cmd vitest run src/features/library/personalLibrary.test.ts --maxWorkers=1`; expect module-not-found RED.
- [ ] Implement strict decoding, immutable operations and typed write result. Validate material/section IDs with `findStandardMaterial`/`findStandardSection`; validate view fields explicitly.
- [ ] Re-run the focused test; expect PASS.
- [ ] Commit repository files with `feat(library): add safe personal favorites repository`.

### Task 2: Home management surface

**Files:**
- Create: `src/features/library/usePersonalLibrary.ts`
- Create: `src/features/library/PersonalLibraryView.tsx`
- Create: `src/features/library/PersonalLibraryView.test.tsx`
- Create: `src/features/library/personalLibrary.css`
- Modify: `src/features/welcome/WelcomeScreen.tsx`
- Modify: `src/features/welcome/WelcomeScreen.test.tsx`
- Modify: `src/features/welcome/welcomeFlow.test.tsx`

**Interfaces:**
- Consumes the Task 1 repository plus current `theme`, `CanvasViewSettings` and unit system.
- Produces top-level `library` navigation with create, search, kind filters, rename, duplicate, delete, trash and restore.

- [ ] Write RED tests that navigate to Biblioteca, create a pair, search it, rename/duplicate it, move one copy to Papelera, restore it and render empty/error states.
- [ ] Run `npx.cmd vitest run src/features/library/PersonalLibraryView.test.tsx src/features/welcome/WelcomeScreen.test.tsx src/features/welcome/welcomeFlow.test.tsx --maxWorkers=1`; expect Biblioteca absent.
- [ ] Implement a local hook that reads once, persists every confirmed operation and keeps the previous in-memory library when a write fails. Build semantic rows, pressed filters and an inline creation form with real catalog selects.
- [ ] Add `HomeView = ... | 'library'`, a `Library` icon/nav item after Plantillas, ES/EN copy in the local Home copy object, and render `PersonalLibraryView` with current theme/view/units.
- [ ] Run focused tests; expect PASS and no mixed-language labels.
- [ ] Commit with `feat(library): add Home favorites management`.

### Task 3: Member favorites in Inspector

**Files:**
- Create: `src/features/library/MemberFavoritesPanel.tsx`
- Create: `src/features/library/MemberFavoritesPanel.test.tsx`
- Modify: `src/features/inspector/InspectorProperties.tsx`
- Modify: `src/features/inspector/Inspector.test.tsx`
- Modify: `src/i18n/catalogs.ts`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes selected `MemberModel`, catalog resolvers, `executeProjectCommand`, `projectCommandSnapshot` and repository operations.
- Produces save material/section/pair and apply active structural favorite.

- [ ] Write RED tests proving: custom identity cannot be saved; catalog pair saves both IDs; material/section use explicit commands; pair uses one `selection.bulk.apply`; deleting the favorite afterward does not change the member; undo/redo restores pair atomically.
- [ ] Run `npx.cmd vitest run src/features/library/MemberFavoritesPanel.test.tsx src/features/inspector/Inspector.test.tsx src/commands/projectCommand.test.ts --maxWorkers=1`; expect missing panel RED.
- [ ] Implement the panel with one select, one Apply button, a name field and three save actions. Resolve favorites by IDs at application time; unavailable references render disabled with an explanation.

The pair command must be exactly one project command:

```ts
executeProjectCommand({
  kind: 'selection.bulk.apply',
  description: `Aplicar favorito ${favorite.name} a ${member.id}`,
  sourceSnapshot: projectCommandSnapshot(project),
  entries: [{ memberIds: [member.id], changes: {
    material: { materialId: material.id, properties: { E: material.elasticModulus, G: material.shearModulus, density: material.density } },
    section: { sectionId: section.id, properties: { A: section.area, I: section.inertiaX } },
  } }],
  nodeEntries: [], nodalLoadEntries: [], memberLoadEntries: [],
});
```

- [ ] Integrate after material/section catalog selectors, add ES/EN keys and compact existing-token styles.
- [ ] Re-run focused tests and `npm.cmd run verify:protected`; expect PASS.
- [ ] Commit with `feat(library): apply member favorites safely`.

### Task 4: Visual favorites in View

**Files:**
- Create: `src/features/library/ViewFavoritesPanel.tsx`
- Create: `src/features/library/ViewFavoritesPanel.test.tsx`
- Modify: `src/features/inspector/Inspector.tsx`
- Modify: `src/i18n/catalogs.ts`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes `theme`, `setTheme`, `readCanvasViewSettings`, `withCanvasViewSettings`, `updateProjectView`.
- Produces save/apply visual favorite without invalidating analysis.

- [ ] Write RED tests that save a view, change theme/toggles, apply it, and verify the existing `AnalysisResult` object remains available and structural arrays are unchanged.
- [ ] Run `npx.cmd vitest run src/features/library/ViewFavoritesPanel.test.tsx src/features/inspector/Inspector.test.tsx --maxWorkers=1`; expect missing panel RED.
- [ ] Implement one select, Apply, name and Save current view. Apply calls `setTheme(favorite.theme)` plus a single `updateProjectView(draft => withCanvasViewSettings(draft, favorite.view))`.
- [ ] Mount at the top of `DisplayPanel`; add ES/EN copy and K0-safe styles.
- [ ] Re-run focused tests; expect PASS.
- [ ] Commit with `feat(library): save visual workspace favorites`.

### Task 5: Browser QA, documentation and integration

**Files:**
- Create: `scripts/qa-personal-library.mjs`
- Modify: `package.json`
- Modify: `docs/README.md`
- Do not create a permanent phase report; preserve closure evidence in Git history

**Interfaces:**
- Produces `qa:personal-library` evidence across Home and Workspace.

- [ ] Build an oracle for 1440×900, 1100×768, 390×844 and 844×390; cover Day/Night, ES/EN, keyboard, search, empty state, duplicate conflict, write failure, save/apply pair, save/apply view, focus and 44 px touch targets.
- [ ] Run the oracle before focal CSS changes; retain the first real failure as diagnostic evidence.
- [ ] Fix only focal UI/QA defects without changing shell/broker authority.
- [ ] Run fresh closure gates:

```powershell
npx.cmd vitest run src/features/library src/features/inspector/Inspector.test.tsx src/features/welcome/WelcomeScreen.test.tsx src/features/welcome/welcomeFlow.test.tsx src/commands/projectCommand.test.ts --maxWorkers=1
npm.cmd run qa:personal-library
npm.cmd run qa:shell-composition
npm.cmd run verify:docs
npm.cmd run verify:protected
npm.cmd run build
git diff --check
```

- [ ] Write the report with exact PASS/FAIL evidence, source SHA and protected-boundary statement; index the interaction contract under References in `docs/README.md`.
- [ ] Review explicit paths, commit `feat(library): deliver safe personal favorites`, push the execution branch, fast-forward `main` only if its remote base still matches, and verify `main`/`gh-pages` separately.

## Self-review record

- Every CRUD/search/error requirement maps to Tasks 1–2.
- Explicit application, ID preservation and project independence map to Tasks 3–4.
- Expanded/Medium/Compact and accessibility map to Task 5.
- No task changes catalog data, project schema, solver, workers or formats.
