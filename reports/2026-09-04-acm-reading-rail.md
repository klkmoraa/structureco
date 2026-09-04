# ACM reading rail

## Change

The canvas evidence rail now presents structural results as a compact reading surface:

- direct `N Axial`, `V Cortante`, and `M Momento` controls;
- a persistent `ACM Comparar` entry for the simultaneous structural reading;
- `Deformada` remains available as a secondary reading;
- desktop places the rail at the lower canvas edge, keeping the model identity and drawing area clear;
- mobile reduces the rail to technical symbols and retains the shared touch target.

The simultaneous sheet received a second pass after in-product review:

- N, V, and M now keep the complete canvas width in every viewport instead of collapsing into three narrow columns on landscape screens;
- card-like panel surfaces were removed and replaced by quiet rules, so the canvas reads as one calculation sheet;
- each lane names its display unit and numeric readings now respect the project's selected unit system;
- moving across, or tapping, a member creates one linked station probe across N, V, and M;
- choosing an individual result while ACM is active exits comparison and guarantees that result remains visible.
- the persistent scale/coordinate status moves to the free upper-left slot while results are available, instead of sitting under the rail;
- narrow screens retain direct `δ` access to the deformed shape, and every symbol-only control keeps a translated accessible name.

## Boundaries

This is presentation-only. It does not change project data, units, signs, topology, solver behavior, results, persistence, or export semantics.

## Verification

- `npm run typecheck`
- targeted canvas evidence/component/style tests
- `npm run build`

The local Vite server started with a loopback-only runtime shim, but the cloud browser could not reach the workspace port (gateway/client policy), so no visual capture was recorded. Component interaction, CSS contracts, i18n, types, and the production build were verified instead.
