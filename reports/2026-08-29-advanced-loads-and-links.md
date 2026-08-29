# Vínculos y cargas avanzadas

Se ampliaron los contratos persistentes y el motor 2D con vínculos nodales lineales, unilaterales, topes y fricción regularizada; restricciones multipunto; liberaciones locales completas; masa nodal; y fuentes de carga de superficie tributaria, presión hidrostática/suelo, patrones vivos, cadenas de miembros, pretensado, fundación Winkler y cargas móviles guardadas.

Las fuentes de carga se resuelven en acciones de miembro o deformaciones iniciales antes del análisis, sin duplicar datos persistidos. La fundación se integra como rigidez consistente y recupera su reacción distribuida en el equilibrio global. Las cargas móviles guardadas alimentan el flujo existente de línea de influencia.

Validación focalizada ejecutada:

- `npm.cmd run typecheck`
- `npx.cmd vitest run src/engine/advancedCapabilities.test.ts src/engine/activeSet.test.ts src/engine/advancedAnalysis.test.ts src/engine/modal.test.ts src/data/migrate.test.ts --maxWorkers=1 --pool=threads --no-file-parallelism --reporter=dot`

No se publicó ni se modificó el estado remoto.
