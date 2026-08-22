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

## Documentos vigentes

| Documento | Para qué sirve |
|---|---|
| [README principal](../README.md) | Entrada del producto y comandos de desarrollo. |
| [Mapa de arquitectura](architecture/README.md) | Navegación por los subsistemas y sus límites. |
| [Space 3D · S3D-1](architecture/structureco-space-3d-s3d1.md) | Contrato operativo del espacio 3D experimental. |
| [Datasheet estructural](architecture/structureco-datasheet.md) | Límites, edición y verificaciones del datasheet. |
| [Índice elástico estimado](architecture/structureco-elastic-index.md) | Significado y límites del índice η. |
| [Rediseño visual total](superpowers/specs/2026-08-22-structureco-total-visual-redesign.md) | Dirección de la interfaz y la experiencia actuales. |

## Referencias

| Documento | Uso correcto |
|---|---|
| [Pre-RFC de IA y `CommandProposal`](architecture/structureco-fase-4-ai-command-proposal-pre-rfc.md) | Propuesta futura; no describe una capacidad implementada. |
| [Brandbook heredado](../brand/README.md) | Procedencia de assets anteriores; no restringe el rediseño vigente. |
| [Validación de Space 3D](../validation/space3d/README.md) | Procedimiento de oráculos que debe ejecutarse de nuevo al cambiar el área. |

## Historial y reportes

Los planes de fases cerradas, sus especificaciones, reportes narrativos y capturas de QA ya no viven en el árbol operativo: se recuperan desde el historial de Git cuando haga falta trazabilidad. La carpeta [reports](../reports/README.md) conserva sólo el handoff de trabajo actual; las capturas regenerables están ignoradas.

## Fuentes por tema

| Tema | Autoridad |
|---|---|
| Ingeniería 2D | `src/types.ts`, `src/engine/**`, `src/workers/**`, pruebas cercanas y `npm run verify:protected`. |
| Ingeniería 3D | [Space 3D · S3D-1](architecture/structureco-space-3d-s3d1.md), `src/space3d/**` y `npm run verify:space3d`. |
| Interfaz | `src/design-system/**`, `src/features/**`, pruebas y QA ejecutables. |
| Assets estructurales | `public/assets/structural/**`, sus contratos y `npm run verify:structural-assets`. |
| Identidad visual | [Rediseño visual total](superpowers/specs/2026-08-22-structureco-total-visual-redesign.md), código y referencias aprobadas. |

Los nuevos documentos bajo `docs/**` deben declarar una clasificación válida: `CANONICAL`, `REFERENCE`, `HISTORICAL` o `AUDIT/TEMPORARY`.
