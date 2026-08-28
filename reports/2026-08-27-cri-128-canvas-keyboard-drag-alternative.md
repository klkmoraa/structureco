# CRI-128 - Canvas keyboard and drag alternative

## Delivered

- A focused, selected canvas object now opens Structural editing with `F2`.
- The route hands focus to the first numeric field and uses the existing local-preview, one-confirmation, one-undo transaction.
- Canvas help and editor copy explicitly describe numeric fields as the alternative to dragging, in Spanish and English.
- The canvas exposes `F2` in `aria-keyshortcuts`; the focused SVG object styling remains the visible focus indicator.

## Matrix of equivalent operations

| Operation | Simple-pointer route | Keyboard / numeric route | Confirmation / reversal |
| --- | --- | --- | --- |
| Move | Explicit Move mode, snap-aware pointer preview | Select object, `F2`, enter ΔX/ΔY | One Apply, one undo/redo entry |
| Rotate and mirror | Contextual edit surface | Select object, `F2`, choose operation and enter values | Preview before Apply; mirror transform/copy remains explicit |
| Array, align and distribute | Contextual edit surface | Select, `F2`, use numeric count/spacing or alignment option | Prepared preview and one history intent |

The editable fields work as the alternative to drag; no pointer gesture has to be performed to commit a precision change.

## Scope

Presentation and interaction only. No solver, units, signs, IDs, topology, `ProjectModel`, persistence, or undo/redo behavior changed.

## Verification

- Desktop keyboard/focus: `StructuralCanvas.structuralEditing.test.tsx` verifies F2 from focus, focus transfer, numeric move, Escape cancellation, undo/redo and transforms.
- Compact/touch: the same canvas suite verifies that ordinary touch remains pan until Move is explicit; `ToolRail.test.tsx` verifies compact sheets, Escape and returned focus.
- UI and domain boundaries: `StructuralEditOverlay.test.tsx`, `structuralEditUi.test.ts`, and `structuralEditing.test.ts` verify the operation list, touch target contract, numeric validation and non-domain mutation boundary.
- Focused result: 64 tests passed. TypeScript compilation passed after the focused suites.

Pending for closure: manual assistive-technology and physical-device checks, which automated DOM tests do not represent. These should be captured in the CRI-125 study without claiming them as completed beforehand.
