# PDF export and method-panel recovery

## Scope

- Restore the interactive PDF preview and complete-PDF export in the browser.
- Move the calculation-procedure selector from the compact top-bar popover to **Analysis and loads**, where its applicability and effect are explicit.

## Cause and resolution

- The export route loaded MathJax's Node-oriented adaptor, which reached for CommonJS `require` in the browser. The PDF now uses the built-in readable formula fallback, while retaining the existing calculation data and diagrams.
- The preview and PDF import now use PDF.js's browser build and browser worker instead of the legacy Node-targeted build.

## Focused validation

- `npx.cmd vitest run src/features/inspector/Inspector.test.tsx --maxWorkers=1 --pool=threads --no-file-parallelism` — 42 passed.
- `npx.cmd vitest run src/features/topbar/TopBar.test.tsx src/utils/calculationPdf.test.ts --maxWorkers=1 --pool=threads --no-file-parallelism` — 33 passed.
- `npx.cmd vitest run src/features/pdf-preview/PdfPreviewDialog.test.tsx --maxWorkers=1 --pool=threads --no-file-parallelism` — 2 passed.
- `npm.cmd run build` — passed after the browser-PDF declarations were added.
- Manual mobile check at 390×844: the preview opens a rendered 11-page PDF, and the **Analysis and loads** sheet exposes the applicable procedure and its result-authority note without console warnings or errors.
