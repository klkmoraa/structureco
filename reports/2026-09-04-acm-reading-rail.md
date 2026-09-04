# ACM reading rail

## Change

The canvas evidence rail now presents structural results as a compact reading surface:

- direct `N Axial`, `V Cortante`, and `M Momento` controls;
- a persistent `NVM Comparar` entry for the simultaneous structural reading;
- `Deformada` remains available as a secondary reading;
- desktop places the rail at the lower canvas edge, keeping the model identity and drawing area clear;
- mobile reduces the rail to technical symbols and retains the shared touch target.

## Boundaries

This is presentation-only. It does not change project data, units, signs, topology, solver behavior, results, persistence, or export semantics.

## Verification

- `npm run typecheck`
- targeted canvas evidence/component/style tests
- `npm run build`

The local Vite server could not start in this environment because Node 24 raised `uv_interface_addresses` from `os.networkInterfaces`, so browser visual capture could not run here.
