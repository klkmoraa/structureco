# Comparación de revisiones

**Clasificación:** `CANONICAL`

Este documento fija el contrato observable de CRI-48. El código de
`src/features/revision-comparison/**` y sus pruebas ejecutables son la autoridad
operativa si este texto llegara a divergir.

## Revisión e identidad

Una revisión es una captura **explícita, inmutable y efímera** que la persona
toma desde el comparador. No es el historial de undo/redo, una versión de
IndexedDB ni un autoguardado. Su ID es `sha256:<digest>` sobre el `ProjectModel`
completo, serializado con claves canónicas; por ello incluye tanto entradas de
análisis como configuración y presentación.

La base permanece en memoria mientras el mismo `WorkspaceShell` está montado,
incluso si se reemplaza el proyecto actual. No se escribe en `ProjectModel`,
localStorage, IndexedDB, import/export ni el expediente portable. Cerrar o
degradar la superficie a `peek` no la elimina; recargar o salir de la Mesa sí.

Si al capturar existe un análisis actual, la revisión conserva una copia
inmutable del resultado, el `analysisSignature(project)` al que pertenece, un
SHA-256 independiente del resultado y el ID exacto del caso o combinación. La
captura nunca recalcula ni modifica modelo, selección, historial o resultados.

## Correspondencia de entidades

La comparación empareja exclusivamente por `(tipo, ID)`:

- el mismo ID permite comparar campos;
- un ID ausente en la base es `added`;
- un ID ausente en el estado actual es `removed`;
- una aparente sustitución con otro ID se publica como `removed + added` y
  advierte que la continuidad no está demostrada;
- nunca se empareja por coordenadas, propiedades, orden de arreglo o tolerancia
  geométrica.

Cada cambio tiene `changeId`, dominio, categoría, tipo, entidad, ID, campo,
valor anterior/actual y rutas explícitas como `project.nodes[N2].x` o
`analysis.memberResults[F1].maxMoment`. El orden es determinista por dominio,
categoría, tipo de entidad, ID, campo y tipo de cambio.

## Dominios y alcance

| Dominio | Categorías | Contenido |
|---|---|---|
| Entrada | Geometría, propiedades, cargas, configuración | Nodos, barras, casos, combinaciones, cargas, efectos iniciales, nombre/ID/schema y settings. |
| Estado | Estado de análisis | Presente, fresco o stale respecto de la revisión capturada. |
| Resultado | Resultados | Resultados nodales, extremos de barra y diagnósticos globales seleccionados. |

Los deltas de resultado usan las unidades base fijas del motor (`m`, `rad`,
`kN`, `kN·m`). Cambiar sólo las unidades de presentación aparece como cambio de
configuración y warning informativo; no convierte ni altera resultados.

## Gate de comparabilidad de resultados

Los cambios de entrada siempre se muestran. Los números de resultado sólo se
comparan cuando ambos lados cumplen simultáneamente:

1. tienen análisis;
2. la firma del análisis coincide con el modelo capturado (`fresh`);
3. el resultado terminó, es usable y no tiene fiabilidad `failed` o
   `unreliable`;
4. conservan el mismo ID de proyecto;
5. conservan el mismo ID de caso o combinación.

| Estado | Resultado |
|---|---|
| Ambos frescos, usables, mismo proyecto y escenario | `comparable` |
| Lo anterior, pero cambió la definición del escenario o hay fiabilidad `limited` | `qualified` con advertencia |
| Falta/stale/no usable, proyecto distinto o escenario distinto | `blocked`; no se publican deltas de resultado |

Dos proyectos con IDs distintos pueden compararse como modelos de entrada,
pero un mismo ID interno no prueba continuidad entre ellos. Los resultados se
bloquean. Del mismo modo, un caso y una combinación distintos no se tratan como
escenarios equivalentes aunque sus factores coincidan.

Todo delta visible se presenta como **correlación, no causalidad**: describe dos
snapshots completos y no atribuye un cambio de salida a una entrada aislada.

## Integración de Workspace

`comparison` es una superficie `tool` del broker de CRI-94:

| Clase | Presentación |
|---|---|
| X2 | `drawer` |
| M1 | `drawer` |
| K0 | `fullscreen` |

Se invoca desde el resumen de Results o desde el comando
`analysis:compare-revisions`. Mientras está activa excluye la paleta para no
apilar otra superficie modal. `Localizar` selecciona el `{ kind, id }` exacto,
emite `focus-object` y degrada a `peek`; restaurar conserva base, filtros y
búsqueda. Al cerrar, el broker devuelve el foco al launcher que la abrió.

## Fronteras

El comparador es de sólo lectura respecto del dominio. No altera solver,
matrices, unidades base, signos, topología, IDs, `ProjectModel`, workers,
persistencia, formatos, undo/redo ni `AnalysisResult`. No sustituye control de
versiones, revisión profesional, diseño normativo ni explicación causal.

## Verificación

- `src/features/revision-comparison/revisionComparison.test.ts`
- `src/features/revision-comparison/RevisionComparisonPanel.test.tsx`
- `src/features/workspace/surfacePresentation.test.ts`
- `src/features/workspace/workspaceCommands.test.ts`
- `src/features/results/ResultsPanel.test.tsx`
- `npm run qa:revision-comparison`

El oráculo de navegador construye la app, captura una base analizada, modifica
un nodo mediante el Datasheet real, vuelve a analizar y verifica rutas, deltas,
filtros, procedencia, `peek`, foco, overflow, consola y targets táctiles en
X2/M1/K0.
