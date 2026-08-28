# Documentación de StructureCo

**Clasificación:** `CANONICAL`

Este es el índice documental del producto. El estado real lo prueban el código, las pruebas y los gates ejecutables; los documentos orientan, pero no sustituyen esa evidencia.

## Orden de autoridad

```text
código + pruebas + gates
→ documentos CANONICAL
→ documentos REFERENCE
→ historial en Git
```

## Decisión sobre PDFs documentales

StructureCo no mantiene una colección paralela de PDFs estáticos como fuente
canónica. No hay PDFs documentales versionados, manifiesto, propietario ni
pipeline de regeneración en el árbol operativo; crear ese paquete duplicaría
el código, los gates y los documentos clasificados de este índice.

Esta decisión no retira la memoria de cálculo PDF del producto. Los PDFs
reimportables que genera la aplicación son artefactos de un proyecto y se rigen
por el código de exportación/importación y sus pruebas; no sustituyen la
documentación canónica del repositorio. Los PDFs externos enlazados desde una
referencia conservan únicamente el carácter de fuente externa indicado por el
documento que los cita.

## Documentos vigentes

| Documento | Para qué sirve |
|---|---|
| [README principal](../README.md) | Entrada del producto y comandos de desarrollo. |
| [Mapa de arquitectura](architecture/README.md) | Navegación por los subsistemas y sus límites. |
| [Space 3D · S3D-1](architecture/structureco-space-3d-s3d1.md) | Contrato operativo del espacio 3D experimental. |
| [Datasheet estructural](architecture/structureco-datasheet.md) | Límites, edición y verificaciones del datasheet. |
| [Índice elástico estimado](architecture/structureco-elastic-index.md) | Significado y límites del índice η. |
| [Módulo de diseño normativo](architecture/structureco-design-module-rfc.md) | Contrato separado `AnalysisResult → DesignResult` y primer slice NTC Acero 2023. |
| [BOM estructural](architecture/structureco-bom-contract.md) | Contrato reproducible de cuantificación geométrica, agrupación explícita y procedencia por barra. |
| [Comparación de revisiones](architecture/structureco-revision-comparison-contract.md) | Identidad de snapshot, diff explícito y gate fail-closed para deltas de resultado. |
| [Fronteras de análisis futuro](architecture/future-analysis-boundaries.md) | Decisiones de alcance y precondiciones para buckling, dinámica, superficies, no linealidad y promoción de S3D-1. |
| [Dirección visual](product/visual-direction.md) | Dirección de la interfaz y la experiencia actuales. |

## Referencias

| Documento | Uso correcto |
|---|---|
| [Biblioteca personal · contrato seguro](product/personal-library.md) | Contrato implementado para favoritos locales y aplicación explícita; el código y sus pruebas siguen siendo la autoridad operativa. |
| [Aula vNext · explicación anclada a resultados](product/aula-vnext.md) | Diseño de producto para implementación futura; no describe una capacidad ya implementada. |
| [Pre-RFC de IA y `CommandProposal`](architecture/structureco-fase-4-ai-command-proposal-pre-rfc.md) | Propuesta futura; no describe una capacidad implementada. |
| [Brandbook heredado](../brand/README.md) | Procedencia de assets anteriores; no restringe el rediseño vigente. |
| [Validación de Space 3D](../validation/space3d/README.md) | Procedimiento de oráculos que debe ejecutarse de nuevo al cambiar el área. |

## Historial y reportes

Los reportes narrativos y capturas de QA de fases cerradas ya no viven en el árbol operativo: se recuperan desde el historial de Git cuando haga falta trazabilidad. Los planes y especificaciones que aún funcionan como referencia se clasifican en este índice. La carpeta [reports](../reports/README.md) conserva sólo handoffs con trabajo abierto verificable y el reporte transitorio de su consolidación; las capturas regenerables están ignoradas.

## Fuentes por tema

| Tema | Autoridad |
|---|---|
| Ingeniería 2D | `src/types.ts`, `src/engine/**`, `src/workers/**`, pruebas cercanas y `npm run verify:protected`. |
| Diseño normativo | [RFC del módulo](architecture/structureco-design-module-rfc.md), `src/design/**` y pruebas cercanas; nunca el solver. |
| Ingeniería 3D | [Space 3D · S3D-1](architecture/structureco-space-3d-s3d1.md), `src/space3d/**` y `npm run verify:space3d`. |
| Interfaz | `src/design-system/**`, `src/features/**`, pruebas y QA ejecutables. |
| Assets estructurales | `public/assets/structural/**`, sus contratos y `npm run verify:structural-assets`. |
| Identidad visual | [Dirección visual](product/visual-direction.md), código y referencias aprobadas. |

## Oráculos y generación

| Comando | Qué comprueba o genera |
|---|---|
| `npm run qa:personal-library` | Verifica Biblioteca, aplicación estructural/visual, persistencia aislada, X2/M1/K0, targets táctiles y consola sobre la app construida. |
| `npm run qa:structural-bom` | Verifica cuantificación, filtros, procedencia, exportación CSV y presentación X2/M1/K0 sobre la app construida. |
| `npm run qa:revision-comparison` | Verifica captura, edición real, reanálisis, deltas, filtros, procedencia y presentación X2/M1/K0 sobre la app construida. |
| `npm run qa:shell-composition` | Verifica las composiciones X2/M1/K0, continuidad de selección/foco y ausencia de desborde horizontal en el shell construido. |
| `npm run qa:results-cards` | Verifica la materia de las tarjetas de resultados, la superficie `dense` y el Datasheet plano en la app construida. |
| `npm run assets:generate` | Regenera las miniaturas PNG transparentes de las escenas Three.js editables y valida el bundle antes de publicarlo. |

Los oráculos generan evidencia en `reports/evidence/`, una salida regenerable que permanece ignorada por Git.

Los nuevos documentos bajo `docs/**` deben declarar una clasificación válida: `CANONICAL`, `REFERENCE`, `HISTORICAL` o `AUDIT/TEMPORARY`.
