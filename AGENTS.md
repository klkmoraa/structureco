# StructureCo — contrato de trabajo

- GitHub (`github.com/klkmoraa/structureco`, `main`) es el puente entre agentes. Antes de integrar o publicar: revisar rama, diff, archivos sin seguimiento y el SHA remoto.
- La dirección visual vigente vive en el código y en la [especificación del rediseño total](docs/superpowers/specs/2026-08-22-structureco-total-visual-redesign.md), además de las referencias aprobadas por la persona usuaria. `brand/**` es procedencia histórica: no limita decisiones visuales nuevas.
- En trabajo visual no se cambia el motor, unidades, signos, IDs, topología, `ProjectModel`, workers, persistencia, import/export, undo/redo ni resultados. Un cambio de dominio requiere una solicitud explícita y pruebas de comportamiento.
- Todo cambio relevante lleva un reporte breve en `reports/` con archivos, motivo, verificaciones y pendientes. `docs/README.md` clasifica la documentación; planes y capturas no prueban por sí solos el producto.
- Los artefactos de build, capturas locales, worktrees y wrappers de prueba no se versionan. Si se elimina material, primero se comprueba que no tenga consumidores ni sea trabajo de otro agente.
- Publicar requiere autorización explícita, nunca force push, y evidencia fresca de los gates proporcionales. La publicación de `main` y la de `gh-pages` se verifican por separado.
- No introducir dependencias, teoría física ni secretos sin una necesidad autorizada y verificable.
