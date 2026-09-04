# Mapa de arquitectura vigente

**Clasificación:** `CANONICAL`

Este mapa orienta hacia las implementaciones y contratos actuales. No duplica el inventario de capacidades del [README principal](../../README.md) ni convierte decisiones históricas en arquitectura vigente.

## Mapa de subsistemas

```text
App / navegación
├─ Workspace 2D
│  ├─ features + design-system
│  ├─ ProjectCommand + historial
│  ├─ Project Hub + persistencia
│  ├─ workers → engine 2D → AnalysisResult
│  └─ módulo normativo separado → DesignResult
├─ Aula sobre el proyecto 2D
└─ Space 3D experimental
   ├─ modelo, validación y comandos propios
   ├─ worker y solver espacial propios
   └─ persistencia, resultados y renderer propios
```

| Subsistema | Implementación principal | Contrato observable |
|---|---|---|
| Shell y navegación | `src/App.tsx`, `src/features/workspace/**` | Inicio, mesa 2D y Space 3D se cargan como superficies explícitas. |
| Dominio 2D | `src/types.ts`, `src/data/**`, `src/store/**` | Modelo versionado, unidades, topología, persistencia e historial. |
| Análisis 2D | `src/engine/**`, `src/workers/**` | Solver, auditorías, resultados y protocolos asíncronos protegidos. |
| Diseño normativo | `src/design/**`, `src/features/design/**` | Proyección versionada de `AnalysisResult` a `DesignResult`; consulta el [RFC canónico](structureco-design-module-rfc.md). |
| Comandos e historial | `src/commands/**`, `src/store/ProjectContext.tsx` | `ProjectCommand`, patches reversibles y undo/redo. |
| Proyectos | `src/storage/projectRepository.ts`, `src/features/project-hub/**` | IndexedDB, migración y recuperaciones. |
| Import/export y PDF | `src/utils/**`, `src/features/import-export/**`, `src/import/dxf/**` | Formatos validados, expediente portable y DXF ASCII experimental. |
| Datasheet | `src/features/datasheet/**` | Proyección tabular del modelo, sin store propio; consulta su [contrato canónico](structureco-datasheet.md). |
| BOM estructural | `src/features/bom/**` | Proyección geométrica reproducible, sin store propio; consulta su [contrato canónico](structureco-bom-contract.md). |
| Comparación de revisiones | `src/features/revision-comparison/**` | Captura base inmutable, diff determinista y gate de comparabilidad; consulta su [contrato canónico](structureco-revision-comparison-contract.md). |
| Aula | `src/education/**`, `src/features/classroom/**`, `src/store/ClassroomSessionContext.tsx` | Recorrido, predicciones, niveles y progreso local. |
| Space 3D | `src/space3d/**`, `src/features/space3d/**` | Dominio separado S3D-2; consulta su [contrato canónico](structureco-space-3d.md). |
| Design system | `src/design-system/**` | Tokens, tipografía, componentes, iconografía y movimiento. |
| Capa de plataforma | `src/platform/**` | Área segura, teclado, hápticas, entrega de archivos y contrato tipado con el anfitrión nativo. |
| Shell iOS | `ios/**` | `WKWebView` sobre el mismo build web, con esquema propio; consulta su [documento de referencia](structureco-ios-native-shell.md) y su [puesta en marcha](../../ios/README.md). |

## Fronteras protegidas

`src/engine/**`, `src/workers/**`, `src/data/**`, `src/store/ProjectContext.tsx` y `src/types.ts` contienen contratos estructurales y persistentes del dominio 2D. `scripts/protected-baseline.sha256` registra su huella y `npm run verify:protected` comprueba que una tarea fuera de ese alcance no los alteró.

El diseño normativo permanece fuera de `src/engine/**`: sólo lee resultados
confiables e identidades explícitas y produce un `DesignResult` efímero. Sus
checks iniciales y límites están en el [RFC canónico](structureco-design-module-rfc.md).

Space 3D permanece aislado bajo `src/space3d/**` y `src/features/space3d/**`. El adaptador 2D → 3D es de una sola dirección y publica diagnósticos cuando no puede traducir una capacidad sin inventar datos.

## Documentos de arquitectura

- `CANONICAL`: [Space 3D](structureco-space-3d.md), [módulo de diseño normativo](structureco-design-module-rfc.md), [BOM estructural](structureco-bom-contract.md), [comparación de revisiones](structureco-revision-comparison-contract.md) e [identidad de materiales y secciones en Model v6](structureco-member-identity-v6.md).
- `REFERENCE`: [paquete de revisión local-first](structureco-review-package-rfc.md), [fronteras para capacidades de análisis futuras](future-analysis-boundaries.md), [capa nativa y shell iOS](structureco-ios-native-shell.md) y [pre-RFC de IA mediante `CommandProposal`](structureco-fase-4-ai-command-proposal-pre-rfc.md). El paquete de revisión requiere aprobación antes de cualquier formato o interfaz nuevos.

Las decisiones históricas retiradas del árbol operativo permanecen recuperables en Git.

Para clasificación completa, validación, identidad visual y política de reportes, vuelve al [índice documental](../README.md).
