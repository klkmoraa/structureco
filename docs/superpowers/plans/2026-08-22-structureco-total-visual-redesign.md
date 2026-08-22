# StructureCo Total Visual Redesign Implementation Plan

**Clasificación:** `AUDIT/TEMPORARY`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Rebuild StructureCo's complete visual and UX layer around a parametric structural illustration system while preserving every protected analytical and data contract.

**Architecture:** A typed structural-assets package supplies the forty illustrations, theme-aware renderer, exports, and presets. Home and specialized surfaces consume that package. Workspace changes stay behind the current composition broker and command interfaces, leaving the solver and canvas interaction core intact.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Motion, Vitest, Playwright, SVG, IndexedDB/local repository patterns.

**Spec:** `docs/superpowers/specs/2026-08-22-structureco-total-visual-redesign.md`

## Global Constraints

- Preserve the complete protected analytical/data boundary named in the spec.
- Use TDD for every behavior change.
- Bundle fonts and assets locally; do not require runtime font or image requests.
- Produce a change report and commit for each completed task group.
- Never push or publish the source branch without explicit approval. Sites checkpoint publication is authorized.

---

### Task 1: Canonical foundation and structural asset registry

**Files:** create `src/features/structural-assets/*`; modify design-system font/token files; test the registry and renderer.

**Interfaces:** produce `StructuralAssetFamily`, `StructuralAssetVariant`, `StructuralAssetPreset`, `StructuralAssetRenderOptions`, `STRUCTURAL_ASSET_REGISTRY`, and `StructuralIllustration`.

- [ ] Write failing tests for ten families, four unique variants per family, deterministic transparent rendering, semantic technical colors, and reduced-motion behavior.
- [ ] Run focused tests and confirm the expected missing-module failures.
- [ ] Implement the typed registry, forty geometry definitions, renderer, three detail levels, theme variables, local typography, and motion boundary.
- [ ] Run focused tests, typecheck, lint, protected verification, and build.
- [ ] Generate the phase report and commit explicit files.

### Task 2: Complete Home shell and six real views

**Files:** modify `src/features/welcome/*`, `src/features/project-hub/*`, `src/App.tsx`, and focused catalogs/tests.

**Interfaces:** consume `StructuralIllustration`; preserve existing callbacks for Workspace and Space3D; add internal typed Home view navigation without fake routes.

- [ ] Write failing tests for the once-per-session hero, exactly three recents, library thumbnails, six views, direct open, responsive navigation, and removal of the old hero/wizard copy.
- [ ] Run focused tests and confirm behavior failures.
- [ ] Recompose Home for desktop/tablet/mobile and rewrite Spanish/English copy.
- [ ] Run focused tests, accessibility checks, typecheck, lint, protected verification, build, Chromium/WebKit QA, and six screenshots.
- [ ] Publish the first Sites checkpoint, send its link and necessary images by Gmail, report, and commit.

### Task 3: Illustration Studio

**Files:** create `src/features/structural-assets/studio/*` and separate preset repository; integrate Settings entry; add tests.

**Interfaces:** produce preset validation/migration, SVG serialization, PNG export at 1x/2x/4x, and immutable factory presets.

- [ ] Write failing tests for edits, validation, persistence isolation, factory immutability, restore, and export.
- [ ] Confirm red failures, implement the parameter studio, then confirm green.
- [ ] Validate keyboard/touch operation and Day/Night previews.
- [ ] Run gates, report, and commit.

### Task 4: Workspace desktop shell

**Files:** modify Top Bar, Tool Rail, Workspace shell/presentation, Inspector, Results, and focused CSS/tests without replacing StructuralCanvas interaction logic.

**Interfaces:** retain workspace commands and surface broker; implement four dock groups, shared right slot, panel sizing/pinning, and the single quantity bar.

- [ ] Write failing tests for Top Bar hierarchy, white Analyze label, dock grouping, absence of duplicate route buttons, Inspector ownership, right-slot exclusivity, and Results quantity mirroring.
- [ ] Confirm red, implement desktop composition, and confirm green.
- [ ] Verify load z-order/label presentation without changing model coordinates.
- [ ] Run PC Chromium/WebKit QA and Day/Night capture gate.
- [ ] Report and commit.

### Task 5: Tablet and mobile Workspace

**Files:** extend the same shell/dock/Inspector/Results modules and tests; avoid duplicate mobile state.

**Interfaces:** tablet overlay Inspector; mobile auto-collapsing dock; 35/55/85 Inspector detents; Results carousel capped at 55%.

- [ ] Write failing responsive and interaction tests at broker boundaries.
- [ ] Confirm red, implement M1/K0 composition, and confirm green.
- [ ] Validate touch targets, safe areas, keyboard/focus, orientation, reduced motion, and load readability.
- [ ] Run tablet/mobile Chromium/WebKit QA and Day/Night capture gates.
- [ ] Report and commit.

### Task 6: Specialized product surfaces

**Files:** modify Datasheet, Model Doctor, Import Center, Generator, Project Hub, and Space3D presentation modules and focused tests.

**Interfaces:** preserve each surface's existing data and command contracts; consume structural assets where informative; leave Aula internals unchanged.

- [ ] Add failing presentation/command-parity tests per surface.
- [ ] Implement task-appropriate responsive layouts and new copy.
- [ ] Run named QA scripts for Doctor, Datasheet, Generator, Space3D, import/export, and structural edits.
- [ ] Report and commit.

### Task 7: Global copy, accessibility, performance, and release evidence

**Files:** audit i18n catalogs, shared states, QA scripts, canonical docs, and reports.

**Interfaces:** preserve translation placeholders and technical symbols; keep internal diagnostics while exposing human errors.

- [ ] Add catalog parity/terminology tests and focused accessibility tests.
- [ ] Rewrite remaining Spanish/English copy and close interaction-state gaps.
- [ ] Run full serial tests, build, docs, protected, performance, Chromium, and WebKit gates.
- [ ] Produce the final six-capture pack, final review report, and exact commit/status evidence.
- [ ] Request explicit approval before any source push or public/final deployment.
