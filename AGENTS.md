# StructureCo — acuerdo de trabajo

- `main` en GitHub es el puente entre agentes. Antes de integrar o publicar, revisar rama, diff, archivos sin seguimiento y SHA remoto.
- La dirección visual vigente es el código, las referencias aprobadas y la [especificación de rediseño total](docs/superpowers/specs/2026-08-22-structureco-total-visual-redesign.md). `brand/**` sólo conserva procedencia.
- La capa visual no altera solver, unidades, signos, IDs, topología, `ProjectModel`, workers, persistencia, import/export, undo/redo ni resultados. Cambios de dominio requieren una petición explícita y pruebas.
- Un cambio cohesivo deja un reporte breve en `reports/`; el código, pruebas y gates mandan sobre planes, capturas o reportes.
- Builds, capturas, worktrees y temporales no se versionan. Antes de borrar, confirmar consumidores y no tocar trabajo ajeno.
- Publicar requiere autorización explícita, nunca force push y siempre verifica `main` y `gh-pages` por separado. No añadir dependencias, teoría física ni secretos sin necesidad autorizada.
