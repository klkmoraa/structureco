# Consolidación de ramas remotas

## Alcance

Se revisaron las 53 ramas remotas de `klkmoraa/structureco`, sus ancestros,
árboles y pull requests antes de integrar cambios en `main`. `gh-pages` se
trató como rama de publicación independiente y no se modificó.

## Integración

- Se conservaron en `main` las 43 ramas cuyo contenido ya estaba alcanzado por
  el historial de `main`.
- Se integró `codex/buscar-bugs-visuales`.
- Se integró `claude/cri-11-fase-c-validation-1tyoq5`, que también contiene el
  historial de fase A.
- Se integraron las campañas aisladas `video/`, `motion/**` y el sistema de
  iconos `brand/icon-system-board.html`.
- Se integró `codex/corrige-errores-de-revision-de-codex`, que conserva el
  historial de recuperación de `codex/recover-work` y añade su reporte.
- El único conflicto fue `.gitignore`; se conservaron sus reglas actuales y se
  añadieron sólo los patrones específicos de la campaña HyperFrames.

## Ajustes de verificación

- El riel de evidencia táctil usa `any-pointer:coarse`, mantiene el estado
  seleccionado dentro del target y desplaza la leyenda en móvil para evitar
  solapamiento.
- Se retiró la clave i18n `results.moreResults`, declarada pero sin consumidor.
- No se modificaron solver, unidades, signos, IDs, topología, `ProjectModel`,
  workers, persistencia, import/export, undo/redo ni resultados.

## Evidencia

La validación final se ejecuta sobre `main` y se comprueba por separado contra
`gh-pages`; las ramas remotas se eliminan sólo después de verificar que todos
los heads integrados son alcanzables desde `main`.
