# SDD ledger — plan: docs/superpowers/plans/2026-08-22-structureco-total-visual-redesign.md

## Baseline

- Branch: `codex/clay-workspace-phase-2`
- HEAD: `c1bace544e6782f9346e3d0ebe3021c5aaa1fcce`
- origin/main: `e01c06bef94154c7b217e1c297c627ced679d38c`
- Package: `0.8.2`
- Backup: `C:/Users/crisd/.codex/backups/structureco-20260822-redesign/structureco-before-total-redesign.bundle`
- Backup SHA-256: `E9E7BAF5DC379F52726FB54D83B03A9DB13031D25F1432F23BEE13CB5295AB63`
- Foreign untracked file preserved: `reports/evidence/2026-08-21-clay-mobile-density-phase-5/full-test.log`

## Pre-flight conflict scan

| Tasks | Producer / consumer | Shared files or interface | Finding / ruling |
|---|---|---|---|
| 1 → 2 | structural asset registry → Home | `StructuralIllustration`, tokens, fonts | Clean. Task 2 consumes only Task 1 public interfaces. |
| 1 → 3 | presets/renderer → Studio | structural-assets package | Clean. Factory data remains immutable; personal storage is separate. |
| 2 → 7 | Home copy → catalog audit | `src/i18n/catalogs.ts` | Ruling: Task 2 owns Home keys; Task 7 may only normalize remaining keys or parity defects. |
| 4 → 5 | desktop shell → responsive shell | TopBar, ToolRail, Inspector, Results CSS/tests | Ruling: Task 5 extends the same composition broker and may not fork mobile state. |
| 4 → 6 | common surfaces → specialized surfaces | workspace presentation broker | Ruling: Task 4 owns shared slot behavior; Task 6 consumes it without changing global breakpoints. |
| 5 → 6 | responsive contracts → specialized surfaces | M1/K0 presentation | Clean. Task 6 maps existing surfaces onto established contracts. |
| 1 | tests vs implementation | 40 assets, transparent renderer | Clean. Tests assert public behavior, not source strings. |
| 2 | tests vs implementation | six views and three recents | Clean. No new router is required; typed internal views preserve callbacks. |
| 3 | tests vs implementation | preset repository/export | Clean. No ProjectModel migration. |
| 4 | tests vs implementation | commands and surface broker | Clean. StructuralCanvas interaction core is excluded. |
| 5 | tests vs implementation | broker boundaries and detents | Clean. Existing X2/M1/K0 authority remains. |
| 6 | tests vs implementation | named product surfaces | Clean. Aula internal redesign is explicitly excluded. |
| 7 | tests vs implementation | parity/accessibility/full gates | Clean. No test weakening or global timeout changes. |

## Rulings

- Ruling: the user-granted creative freedom supersedes old visual Brandbook choices, not solver/data safety contracts — this permits complete presentation replacement without expanding domain scope.
- Ruling: Sites preview publication and checkpoint email are authorized external side effects; source push remains approval-gated.
- Ruling: missing named local guardian/engine-safety/responsive plugins are replaced by explicit backup, protected verification, domain diff audit, and browser QA — no silent skip.

## Progress

- Task 0: complete — canonical spec, implementation plan, backup, baseline, and conflict scan created.
- Task 1A: implemented by Epicurus (`01a02815-f56f-7940-adae-1aa985444513`) and integrated as `50eae85` — 40 transparent structural assets, registry, deterministic renderer, 12/12 focused tests PASS. Independent review assigned to Descartes (`01a02827-d6bd-7c32-8102-8147ab4426bd`).
- Task 1B: implemented by Kant (`01a02815-fd50-7560-a4af-54aa6c78bdf9`) and integrated as `e8cc267` — exact Day/Night palette, technical colors, four matte depths, local Instrument Sans/Geist Mono and licenses. Merge conflict reconciled by preserving prior accessibility roles while selecting the approved exact primary `#007D61`; 40/40 focused foundation tests PASS. Independent review assigned to Avicenna (`01a0282b-2649-7002-bf0c-a66c1790e15a`).
- Task 2 RED: `npm.cmd test -- src/features/welcome/totalRedesignHome.test.tsx --reporter=verbose` failed 3/3 for the expected missing navigation, structural asset hero, and compact action contract.
- Task 2 GREEN (component): Home rebuilt as six internal views, responsive sidebar/rail/mobile menu, session-stable structural hero, explicit Continue/New, compact secondary actions, recent-project mode and responsive Clay CSS. `totalRedesignHome.test.tsx`, `WelcomeScreen.test.tsx`, and `welcomeFlow.test.tsx`: 19/19 PASS. Browser visual QA and checkpoint report remain pending.
- Task 2 QA/checkpoint: `c00d67b` adds transparent Three.js hero/template renders, six responsive Home captures after fix round 1, exact orthographic framing, `Home redesign QA PASS`, focal tests/typecheck/build PASS, and report `reports/2026-08-22-0128-home-three-assets.md`. Two necessary captures were sent to the authorized Gmail address. Because the production Vite SPA is not a Sites package, the controller built and validated an isolated checkpoint without changing product dependencies, then published it owner-only at `https://structureco-redesign-checkpoint.crdrawin.chatgpt.site` and emailed the link to the authorized address. Product source was not pushed.
- Task 2 Ruling: project thumbnails may derive an illustration family only from existing topology/member type/support geometry. They may not invent analysis status, reliability, material, location, or project type fields. Cost if wrong: a thumbnail can be visually approximate, but no stored or analytical truth is changed.
- Task 2 fix round 2: migrated all five `WelcomeHeader.test.tsx` contracts to the approved responsive Home without restoring the removed editorial `h1` or modal drawer; preserved language/theme, wordmark, mobile navigation, Escape/focus and unique accessible controls. Added the exact concise archived RED extraction at `reports/evidence/2026-08-22-total-home-redesign/tdd-red-home.txt`. Fresh gates: Home 7 files/42 tests PASS, typecheck PASS, lint exit 0 with 13 preexisting out-of-scope warnings, `verify:protected` 38/38 PASS, build PASS with the known >500 kB chunk warning. Task 2 status: `DONE`.
- Task 2 external checkpoint closure: Sites version 1 deployed successfully with verified owner-only access; its interactive review exposes Day/Night, Desktop/Tablet/Mobile and the first transparent Three.js family renders. The authorized Gmail follow-up was sent after publication. Task 2 is gate-ready.
