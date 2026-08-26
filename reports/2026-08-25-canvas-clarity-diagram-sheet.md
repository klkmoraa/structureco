# Canvas clarity and diagram sheet

## Implemented

- Results launcher moved beside the active analysis case.
- Fresh editor chrome defaults to model plus concise loads; IDs, dimensions,
  results, and persistent help remain opt-in.
- Added optional **Lámina de diagramas** from Results. It preserves a global
  model sketch, starts with shear and moment, stores each project's selected
  quantities locally, and keeps the wide canvas scrollable on narrow screens.
- The minimap now appears only for materially large models. Canvas load labels
  retain magnitude and units without repeated technical prefixes.

## Verification

- `npm run typecheck` passed.
- Focused Vitest suite passed: 28 tests, 3 intentionally skipped.
- `npm run verify:protected` passed with 40 protected files intact.
- `npm run verify:i18n` passed.
- Local Playwright review confirmed the relocated Results control and clean
  empty-canvas hierarchy at 1440x900.

## Boundary

No solver, topology, units, selection identity, ProjectModel schema, worker,
or result calculation code was changed.
