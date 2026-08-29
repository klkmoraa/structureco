# Cierre de brechas funcionales de Copia-web

**Base revisada:** `Copia-web/src` local frente a `structureco/src` en esta rama, 29 de agosto de 2026.

## Resultado

La comparación por hash encontró 400 archivos idénticos. Las exclusividades restantes no significan automáticamente una función ausente: la mayoría ya está integrada con los componentes y el broker propios de StructureCo.

| Capacidad de Copia-web | Resolución en StructureCo |
|---|---|
| `DataSurface` y `ResultsContent` | Resultados residente/denso más Hoja, Doctor y BOM enlazados. La navegación conserva teclado, foco y ahora también el borrador de la Hoja durante el handoff. |
| `CanvasNavigator`, `CanvasCutInspector`, `CanvasEvidenceBar` y diagram stack | Cámara, minimapa, inspector de corte y riel ACM viven en las capas actuales de `StructuralCanvas`; no se duplica una segunda cámara o resultado. |
| `ProposalAssistant` y compilador | `LocalCommandAssistant` y `localCommandProposal` mantienen parser local, allowlist, unidades, diff y confirmación por hash. |
| `SectionBuilderPanel` | Biblioteca paramétrica y acceso directo desde el inspector, con aplicación explícita de la instantánea A/I. |
| `CertificateCard` y `StabilityView` | Certificado numérico y tarjeta de estabilidad con modos, masa, residuo, GDL y avisos. |
| Preview y estructura PDF | Los módulos `src/utils/pdf/**`, generación y vista previa están presentes en esta rama; no se añadió MathJax ni su cadena insegura. |
| Catálogos y CSS | Catálogos ES/EN por dominio y CSS por feature sustituyen los catálogos monolíticos y la cascada numerada de Copia-web. |
| `loadCombinationStandards` | El catálogo NTC CDMX 2023 Grupo B ya no queda aislado: el inspector clasifica los casos, muestra borradores con alcance/exclusiones y los añade de forma explícita como combinaciones editables con procedencia. |
| `analysis-methods` | Los 12 procedimientos clásicos de la rama remota actual de Copia-web están incorporados con selector por aplicabilidad, persistencia, fallback al matricial y narrativa verificable en el PDF. |

## No trasladado deliberadamente

- `aisc360.ts` y `eurocode3.ts` de Copia-web no se importan: la auditoría detectó defaults, hash y procedencia insuficientes. Una implementación nueva requiere edición normativa verificable, cláusulas, fixtures/oráculos y revisión técnica.
- Los métodos Portal y Cantilever se conservan como aproximaciones de carga lateral: el PDF declara su brecha frente al análisis matricial en vez de presentarlos como un resultado exacto.

La comprobación de fuentes primarias añade dos condiciones concretas: la edición vigente publicada por AISC es ANSI/AISC 360-22, por lo que el prototipo 360-16 no puede convertirse en la base de una cobertura nueva; y la Comisión Europea indica que los textos EN son distribuidos por los organismos nacionales de normalización y dependen de parámetros nacionales. Antes de abrir cualquiera de esas normas se requiere la edición licenciada, jurisdicción/NDP, alcance, cláusulas y casos oráculo aprobados.

## Evidencia de este corte

- La Hoja de datos mantiene entidad, borrador y origen al desmontarse durante una navegación de datos; cerrar explícitamente Resultados, Hoja, Doctor o BOM inicia una sesión limpia.
- Se ejecutaron 22 pruebas focalizadas para Hoja de datos, navegación y estabilidad; `typecheck` y `git diff --check` completaron sin errores.
- El inspector genera los borradores NTC sólo cuando el proyecto identifica una acción permanente y una variable. Al añadir uno, conserva fuente, URL, secciones, hash, jurisdicción, edición, estado límite y fecha de revisión en la combinación editable; no afirma certificación ni sustituye una revisión profesional.
- Se ejecutaron 47 pruebas focalizadas del catálogo NTC e inspector; `typecheck` y `git diff --check` completaron sin errores.
- La validación integral descubrió una regresión de composición: al cerrar una superficie de datos se desmontaba el `AppShell` completo para reiniciar borradores, dejando los lanzadores desconectados antes del retorno de foco. El proveedor ahora vacía sólo su almacén efímero mediante `resetVersion`, sin remontar barra, lienzo ni resultados.
- `App.test.tsx` pasó 36/36; la corrida completa anterior dejó los otros 284 archivos de prueba en verde. También aprobaron `lint`, `typecheck`, compilación de producción, entrada i18n diferida, presupuesto de rendimiento (1,297,195 bytes / 357,115 gzip) y el límite de archivos protegidos.
- Los 12 solucionadores clásicos y sus utilidades se trasladaron desde `origin/main` de Copia-web; sus 63 pruebas focalizadas aprobaron. El selector persiste la elección válida y el informe PDF ejecuta el método seleccionado, conservando al matricial como resultado autoritativo.
