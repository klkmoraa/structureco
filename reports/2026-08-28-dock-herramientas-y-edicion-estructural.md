# Dock de herramientas y edición estructural

## Alcance

- Se retiró el acceso ambiguo «Paneles de trabajo» del dock.
- Cargas de análisis, Vista y la preferencia de posición pasaron a Herramientas del espacio de trabajo.
- El dock dejó de flotar sobre el lienzo: abajo ocupa su propia franja y a la izquierda usa una columna reservada.
- El Centro analítico conserva su área al abrirse o expandirse.
- La edición estructural conserva etiquetas y campos autoexplicativos; se retiró la explicación redundante de cada operación. Sólo queda el requisito compacto `2+ elementos` cuando Alinear y Distribuir no están disponibles.
- Su superficie se monta fuera del contenedor recortado del lienzo para permanecer completa y el foco llega a su primer campo, también al abrirse desde móvil.
- En móvil el dock conserva seis destinos directos, deriva el resto a Cargas/Más y permanece horizontal también en apaisado para no consumir una columna del lienzo.

## Límites conservados

No se modificaron solver, unidades, signos, IDs, topología, `ProjectModel`, workers, persistencia, importación/exportación, undo/redo ni resultados.

## Validación

- `npm.cmd run typecheck`
- `npm.cmd run verify:i18n`
- Vitest focalizado para `ToolRail`, `StructuralEditOverlay`, `StructuralCanvas` y el flujo de teléfono de `App`.
- Navegador: comprobados dock inferior e izquierdo, Cargas de análisis, Vista, Centro analítico expandido y editor estructural; sin errores de consola. El flujo compacto verifica hoja Más, apertura del editor y foco inicial.
