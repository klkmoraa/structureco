# Handoff · Clay Compact y Generator · Fase 4

**Clasificación:** `AUDIT/TEMPORARY`

## Qué cambió

- Se eliminaron del canvas los botones HTML flotantes `Cargas`, `Vista` y `Resultados`.
- Sus rutas funcionales pasan al riel Clay X2/M1 y a la hoja táctil `Más` en K0, con comandos tipados e iconografía consistente.
- M1 vuelve a reservar sólo el riel compacto; se elimina la contradicción CSS que dejaba aproximadamente 108px sin uso.
- Generator entra al broker de superficies con presentación `floating` en X2, `inset` en M1 y `sheet` en K0. Inspector/Vista/Resultados quedan suspendidos en M1/K0 y se reanudan al cerrar.
- Las cinco familias funcionales de Generator usan tarjetas Clay con ilustraciones SVG transparentes.
- El Inspector K0 termina por encima del dock inferior y ya no intercepta sus botones.

## Por qué

Las capturas del usuario mostraban controles nativos sin identidad, espacio muerto en el riel y superficies apiladas. La implementación mantiene las funciones, pero las integra en la composición adaptativa y en la identidad mate/Clay del Brandbook.

## Archivos principales

- `src/features/canvas/ToolRail.tsx`
- `src/features/workspace/WorkspaceShell.tsx`
- `src/features/workspace/surfacePresentation.ts`
- `src/features/canvas/StructuralCanvas.tsx`
- `src/features/structure-generator/StructureGeneratorPanel.tsx`
- `src/features/structure-generator/GeneratorFamilyPreview.tsx`
- `src/features/structure-generator/structureGenerator.css`
- `src/features/workspace/phase1.css`
- `src/styles.css`

## Cómo verificar

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run verify:docs`
- `npm.cmd run verify:protected`
- `npm.cmd exec vitest run src/design-system/clayReconciliation.test.ts src/features/workspace/surfacePresentation.test.ts src/features/canvas/ToolRail.test.tsx src/features/structure-generator/StructureGeneratorPanel.test.tsx src/features/structure-generator/StructureGeneratorSurface.test.tsx -- --maxWorkers=1`
- `node scripts/qa-structure-generator.mjs`
- `node scripts/qa-clay-compact-generator-phase4.mjs`

## Evidencia

- Suite global previa al último ajuste de token: 229 archivos PASS, 1 archivo con un único fallo visual; 2,272 pruebas PASS y 8 omitidas. El fallo fue exactamente el literal de presión de las tarjetas nuevas.
- Reejecución después del ajuste: 5 archivos, 98 pruebas PASS, incluida `clayReconciliation.test.ts`.
- Suite global final limpia: 230 archivos PASS; 2,273 pruebas PASS y 8 omitidas.
- Build PASS; typecheck PASS; documentación PASS; frontera protegida PASS (38 archivos).
- QA Generator Chromium PASS: cinco familias, ghost no mutante, revisión, generación atómica, undo/redo, foco, accesibilidad y responsive.
- QA visual Fase 4 PASS en X2 Día, M1 Noche y K0 Día. Resumen: `reports/evidence/2026-08-21-clay-compact-generator-phase-4/qa-summary.json`.

## Pendientes acordados

- Siguiente fase: reducir la sensación aplastada en móvil, revisar tamaños tipográficos de controles y rediseñar la apertura de opciones/propiedades para evitar tarjetas gigantes o secciones amontonadas.
- No se añadieron nuevas familias estructurales; Viga simple, Voladizo, Losa y Marco espacial requieren decisiones funcionales y estructurales separadas.
- No se tocó motor, solver, signos, unidades, persistencia, import/export ni formatos.
