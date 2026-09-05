# Design QA — ACM estructural continuo

Source visual truth: `C:\Users\crisd\.codex\codex-remote-attachments\01a04b91-4c1b-79f0-8947-9112814763a9\30AEB190-AF32-422F-B7EF-46D0FF453216\2-Foto-2.jpg`.

Implementation evidence: browser-rendered StructureCo workspace using the analyzed `Pórtico de ejemplo` with ACM active.

- Desktop viewport: 1280x900 CSS px, density 1. Reference is a beam and the implementation is a pórtico, so only the requested reading grammar is compared: original structure separate above; complete N/V/M diagrams outside it; exact curves, values and fills below/alongside it.
- Mobile viewport: 390x844 CSS px, density 1. ACM displays the original pórtico followed by N, V and M full-structure replicas down the canvas. Zoom controls remain below the final diagram.
- Interaction tested: analyze example, close results overlay, enable ACM.
- Console: no warnings or errors during the visual checks.

**Comparison history**

- [P1] Earlier implementation used three framed mini-card replicas. Fixed by removing panel frames, preserving the complete topology in every diagram and switching wide pórticos to full-width side-by-side replicas.
- [P1] Earlier mobile reading could be mistaken for chart cards. Fixed by vertically sequencing the three complete diagrams without frames or overlays.

**Required fidelity surfaces**

- Fonts and typography: existing StructureCo Instrument Sans/Geist hierarchy remains; only compact technical labels are added.
- Spacing and layout rhythm: N/V/M share a consistent lane rhythm; mobile retains a dedicated camera-control shelf.
- Colors and visual tokens: fills use StructureCo technical axial, shear and moment colors; no green vector-analysis layer was added.
- Image quality and asset fidelity: this is a live solver-driven structural SVG visualization, not a decorative image; it renders exact result segments and jumps.
- Copy and content: labels are N, V, M plus the existing localized quantity names and solved readings.

final result: passed

## Home / app shell redesign — 2026-09-04

Source visual truth: `docs/product/visual-direction.md` plus the approved
structural renders already shipped in `public/assets/`.

- Desktop viewport: 1440x900 CSS px. The new shell keeps the sidebar visible,
  groups navigation by intent, gives the open project one primary action and
  presents exactly three tool launchers without invented product metrics.
- Mobile viewport: 390x844 CSS px. The sidebar becomes a two-column drawer,
  actions remain reachable at touch size, the hero stacks, tool launchers read
  as a single column and there is no horizontal overflow.
- Themes and language: Day/Night and ES/EN were toggled through the live UI;
  hierarchy and focusable controls remain present in both states.
- Interaction tested: drawer open/Escape/focus return, settings sheet and
  focus trap, Import Center, Aula dialog, Space 3D experimental orientation,
  Illustration Studio, navigation to every Home destination, and return to
  Home. The fixed import modal was checked after removing the shell transform
  containing block.
- Console: Browser/IAB route checks had no surfaced console errors. The
  repository's native-bridge parity gate still reports its existing five
  web/iOS message mismatches; no bridge code changed here.

**Fidelity ledger**

- [P0] Existing Home had a large unstructured hero and a single flat option
  list. Fixed with a product shell, grouped navigation, clear CTA hierarchy,
  structural preview, quick tools and a quiet recent-project list.
- [P1] Existing shell animation could offset fixed import overlays after
  settling. Fixed by making the shell entry opacity-only; movement remains on
  inner surfaces where it cannot change modal coordinates.
- [P1] Image Gen mock was unavailable because the service returned a temporary
  429. The final direction therefore follows the canonical visual document and
  approved renders instead of an unverified generated image.

final result: passed — visual/interaction layer only; solver and data
contracts unchanged.

## Home / workbench radical revision — 2026-09-04

Source visual truth: written workbench direction derived from the canonical
visual system and the existing structural asset library. Image Gen was
attempted for a complete concept board but returned `429 usage_limit_reached`,
so no unverified generated asset was introduced.

- Desktop viewport: 1440x900 CSS px. Sidebar is a dark petroleum rail; the
  first viewport is a two-plane project workbench with real project name,
  primary actions and a real structural render. Tool entry points are an
  indexed open rail, not a repeated card grid.
- Mobile viewport: 390x844 CSS px. The rail becomes a dark app bar and drawer;
  the model, project actions, tools, system directory and recent list remain
  in a vertical reading flow. `scrollWidth === clientWidth === 390`.
- Themes and language: Day/Night and ES/EN remain wired to the existing
  preferences and workspace UI state.
- Interaction tested: directory navigation to Plantillas and Biblioteca,
  Illustration Studio launch, tool rail Importar/Aula/Space 3D, settings
  focus return, mobile drawer Escape, and the full import modal geometry.
- Render evidence: `output/playwright/home-radical-desktop.png` and
  `output/playwright/home-radical-mobile.png` were inspected with
  `view_image`; captures stay ignored and are not versioned.

**Fidelity ledger**

- [P0] The previous home read as a dashboard. Fixed by making the active
  project and structural preview the dominant work surface.
- [P0] Tool discovery was split between navigation and three cards. Fixed with
  grouped sidebar intent plus a numbered rail and a complete system directory.
- [P1] Mobile needed a composition that survived the larger directory. Fixed
  with stack-first responsive rules, full touch targets and no horizontal
  overflow.
- [P1] The modal/focus contracts remain intact; all changes are in the visual
  shell and its Home navigation composition.

final result: passed — radical visual revision verified in Browser/IAB and
Playwright capture at native desktop/mobile sizes.
