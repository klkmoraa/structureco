# StructureCo — acuerdo de trabajo

- `main` en GitHub es el puente entre agentes. Antes de integrar o publicar, revisar rama, diff, archivos sin seguimiento y SHA remoto.
- La dirección visual vigente es el código, las referencias aprobadas y la [dirección visual canónica](docs/product/visual-direction.md). `brand/**` sólo conserva procedencia.
- La capa visual no altera solver, unidades, signos, IDs, topología, `ProjectModel`, workers, persistencia, import/export, undo/redo ni resultados. Cambios de dominio requieren una petición explícita y verificación focalizada.
- Un cambio cohesivo deja un reporte breve en `reports/`; el código y la verificación ejecutada mandan sobre planes, capturas o reportes.
- Builds, capturas, worktrees y temporales no se versionan. Antes de borrar, confirmar consumidores y no tocar trabajo ajeno.
- Publicar requiere autorización explícita, nunca force push y siempre verifica `main` y `gh-pages` por separado. No añadir dependencias, teoría física ni secretos sin necesidad autorizada.

## Verificación mínima

- No ejecutar suites completas, `npm test` global ni gates generales por rutina.
- Para UI, estilos, copy, composición y refactors visuales: usar únicamente build/typecheck y revisión visual puntual cuando aporten valor.
- Para solver, matemáticas, unidades, cargas, análisis o resultados: ejecutar sólo las pruebas directamente relacionadas y, si cambia el comportamiento numérico, un caso pequeño de referencia.
- Para persistencia, migraciones, `ProjectModel`, import/export o undo/redo: validar sólo el flujo tocado y comprobar conservación de datos.
- La suite completa se reserva para petición expresa del usuario, releases importantes o cambios transversales que no puedan aislarse de forma razonable.
- No crear pruebas nuevas para cambios puramente visuales salvo que exista una regresión concreta que convenga fijar.
- Reportar brevemente qué se verificó y qué no; no presentar como validado aquello que no se ejecutó.
