# Deep Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove only demonstrably obsolete repository maintenance configuration while preserving all product behavior and protected mathematical contracts.

**Architecture:** The production graph is rooted at `src/main.tsx`; candidates require static consumer evidence plus targeted validation. Historical packages, backups, release evidence, and generated-site wrappers remain outside the application boundary unless they have no documented retention purpose.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Oxlint.

## Global Constraints

- Do not modify `src/engine/**`, `src/workers/**`, `src/data/**`, `src/store/ProjectContext.tsx`, or `src/types.ts`.
- Preserve UI behavior, persistence, portable-file contracts, units, signs, solver outputs, and versioned release evidence.
- Do not update dependencies or push to GitHub.
- Each removal requires a consumer search, framework/side-effect review, and a residual search.

---

### Task 1: Establish cleanup evidence

**Files:**
- Modify: none
- Test: `src/**/*.{test,spec}.{ts,tsx}`

- [x] **Step 1: Snapshot the repository and protected boundary**

Run: `git status --short --untracked-files=all; git tag -a cleanup-pre-20260807 -m "Safety snapshot before deep repository cleanup" HEAD; npm.cmd run verify:protected`

Expected: clean tracked worktree before cleanup and all protected baseline hashes intact.

- [x] **Step 2: Map the production import graph**

Run a scoped static graph rooted at `src/main.tsx`, including static imports, dynamic imports, CSS, SVG, and Worker `new URL()` entries.

Expected: every non-test source module is classified reachable or reviewed as a framework/side-effect entry.

### Task 2: Remove verified obsolete maintenance configuration

**Files:**
- Modify: `.oxlintrc.json`
- Test: lint scope plus full verification

- [x] **Step 1: Verify the external-wrapper retention boundary**

Search: `rg -n "structureco-sites-test|structureco-sites-test-publish" README.md docs reports package.json .oxlintrc.json vite.config.ts`

Expected: both paths are documented local Sites wrappers, not source modules of the root application.

- [x] **Step 2: Correct the stale lint exclusion list**

Add the two documented wrapper paths to `ignorePatterns` without changing lint rules or product source.

- [x] **Step 3: Verify the cleanup**

Run: `npm.cmd run lint`; then search the configured paths and inspect `git diff --check`.

Expected: root lint no longer parses compiled wrapper assets and source diagnostics remain clean.

### Task 3: Preserve and consolidate evidence

**Files:**
- Create: `reports/2026-08-07-<time>-deep-cleanup.md`
- Modify: `docs/superpowers/plans/2026-08-07-deep-cleanup.md`

- [x] **Step 1: Record verified non-removals**

Document retained source modules, dependencies, historical QA scripts, release artifacts, backups, and reports whose consumers or retention purpose were demonstrated.

- [x] **Step 2: Run the full gate**

Run: `npm.cmd run verify`.

Expected: lint, protected boundary check, tests, build, and performance budget all pass.

- [ ] **Step 3: Commit the cleanup and report locally**

Run: `git add .oxlintrc.json docs/superpowers/plans/2026-08-07-deep-cleanup.md reports/2026-08-07-*-deep-cleanup.md; git commit -m "chore: reduce lint scope to product sources"`.

Expected: one local commit; do not push without explicit user approval.
