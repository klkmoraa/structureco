# Ajustes móviles: rieles y proyectos

## Alcance aplicado

- El menú `⋯` de cada proyecto ahora muestra **Renombrar**, **Duplicar** y
  **Eliminar**. El borrado pide confirmación explícita antes de quitar el
  registro de la biblioteca local.
- El menú de proyecto queda anclado hacia arriba y limita su ancho en móvil,
  para que sus acciones no se recorten fuera de la tarjeta.
- Los botones de abrir y `⋯` fijan la línea y la caja del SVG, manteniendo sus
  iconos centrados dentro de los controles circulares.
- Las acciones de cada tarjeta reciente se centran verticalmente; dejan de
  quedar pegadas al borde inferior. El riel del canvas conserva sólo Axial,
  Cortante, Momento y Deformada, como la referencia; Mapa de demanda sigue
  accesible mediante su interruptor en Capas. La fila queda compacta en el
  borde superior del canvas y sólo aparece después de un análisis exitoso.
- N, V, M, Deformada y Mapa de demanda se movieron del panel de capas a un
  riel horizontal directamente sobre el canvas. Conservan el mismo estado de
  presentación: no modifican el modelo ni abren Resultados.
- Reacciones, Influencia y Aprender dejaron el menú `⋯` del panel de
  resultados. Ahora se muestran como acciones visibles al final del mismo riel
  horizontal de cantidades y continúan abriendo la superficie densa existente.
- Se normalizó la geometría de ambos rieles para objetivos táctiles de 40 px,
  desplazamiento horizontal en K0 y sin extender el documento en horizontal.

## Verificación focal

- `npm.cmd run typecheck` — PASS.
- `npx.cmd vitest run src/features/project-hub/ProjectHub.test.tsx src/features/canvas/CanvasLayers.test.tsx --maxWorkers=1 --pool=threads --no-file-parallelism --reporter=dot` — PASS, 8 pruebas.
- `npx.cmd vitest run src/features/results/ResultsPanel.test.tsx --maxWorkers=1 --pool=threads --no-file-parallelism --reporter=dot` — PASS, 21 pruebas.
- `npx.cmd vite build --emptyOutDir` — PASS.

## Límites preservados

No se modificaron solver, unidades, signos, topología, `ProjectModel`, workers,
persistencia de análisis ni formatos de importación/exportación. El nuevo
borrado sólo afecta el registro seleccionado de la biblioteca de proyectos.
