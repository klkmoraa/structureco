# Canvas clarity and direct diagram reading

## Implemented

- Results launcher moved beside the active analysis case.
- Fresh editor chrome defaults to model plus concise loads; IDs, dimensions,
  results, and persistent help remain opt-in.
- Pressing **Analizar** now leaves the result in the same structural canvas:
  it activates the familiar moment diagram, keeps loads visible, places the
  curve toward the lower local side, and does not open a new page, sheet, or
  results panel.
- Direct analysis reading hides the repeated value stamps and keeps the
  existing layer controls available for switching quantity or restoring
  detailed labels when needed.
- The minimap now appears only for materially large models. Canvas load labels
  retain magnitude and units without repeated technical prefixes.

## Verification

- `npm run typecheck` passed.
- Focused Vitest suite passed: 14 tests across direct canvas results, Results,
  and PWA lifecycle.
- `npm run verify:protected` passed with 40 protected files intact.
- `npm run verify:i18n` passed.
- `npm run build` passed.
- Local Playwright review confirmed zero extra result pages and three direct
  moment curves after Analyze in Chromium desktop/phone and WebKit phone,
  without document-level horizontal overflow.

## Boundary

No solver, topology, units, selection identity, ProjectModel schema, worker,
or result calculation code was changed.
