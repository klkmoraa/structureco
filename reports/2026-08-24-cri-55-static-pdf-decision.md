# CRI-55 · decisión sobre el paquete PDF documental

## Decisión

No se mantendrá una colección estática de PDFs como fuente canónica de
StructureCo. La autoridad sigue siendo código, pruebas y gates; después, los
documentos Markdown clasificados en `docs/README.md` y las referencias
aprobadas.

## Evidencia

- El árbol versionado no contiene archivos PDF documentales.
- No existe manifiesto, propietario ni pipeline de regeneración para un
  supuesto paquete canónico.
- `docs/README.md` ya clasifica los documentos vigentes, de referencia e
  históricos y cuenta con un verificador ejecutable.
- El producto sí genera una memoria de cálculo PDF reimportable. Esa capacidad
  funcional permanece intacta y no se confunde con documentación del repo.

## Consecuencias

- No se generan PDFs redundantes para cerrar una tarea anterior al rediseño.
- La decisión queda visible en el índice documental canónico.
- Los artefactos PDF generados por usuarios conservan sus contratos de
  exportación/importación; esta decisión no cambia formatos ni resultados.
- Si en el futuro se propone un paquete documental estático, requerirá un caso
  de uso, propietario, fuentes, pipeline reproducible y política de hashes.

## Alcance protegido

No se modificaron solver, matemáticas, unidades, signos, IDs, topología,
workers, `ProjectModel`, persistencia, import/export, undo/redo ni resultados.
