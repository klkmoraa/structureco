# CRI-26 — fiabilidad y límites de la importación DXF experimental

**Fecha:** 2026-08-24 11:25 CST
**Agente:** Codex
**Rama:** `codex/linear-queue-execution-20260824`
**SHA auditado:** `9543bbc9fd172130566c282ddab99b17cb3e5314`

## Qué cambió

Se añadió un corpus DXF ASCII mínimo y versionado que hace reproducibles los
casos admitidos, ambiguos y bloqueados del importador experimental. No se
cambió el parser, la topología del proyecto, la persistencia ni el contrato de
undo/redo.

## Subconjunto verificado

| Entrada | Estado actual | Conversión |
|---|---|---|
| `LINE` 2D en model space | Admitida | Un miembro por línea no nula. |
| `LWPOLYLINE` 2D recta, abierta o cerrada | Admitida | Un miembro por arista; si está cerrada añade la arista final. |
| `LWPOLYLINE` con bulge, ancho, elevación, espesor o extrusión no estándar | Bloqueada | Diagnóstico explícito; no importa nada. |
| `LINE` con Z, espesor, extrusión no estándar, coordenadas inválidas o longitud cero | Bloqueada | Diagnóstico explícito; no importa nada. |
| Entidades en paper space | Bloqueadas | Diagnóstico explícito; no importa nada. |
| `CIRCLE`, `ARC`, `INSERT`, `POLYLINE` clásica, `VERTEX`, `SEQEND` y cualquier otra entidad | Bloqueadas | Quedan fuera del subconjunto experimental. |
| Referencias a bloques | Bloqueadas | La sección `BLOCKS` no se expande y `INSERT` en `ENTITIES` es no soportada. |

Una `LWPOLYLINE` cuenta como una entidad aceptada aunque produzca varias
aristas. La interfaz muestra tanto la cantidad de entidades aceptadas/rechazadas
como la previsualización de los segmentos compatibles.

## Corpus representativo

| Fixture | Propósito | Resultado esperado |
|---|---|---|
| `line-mm-r2013.dxf` | Dos `LINE`, `AC1027`, milímetros y dos capas | 2 aceptadas, importable. |
| `closed-lwpolyline-m.dxf` | Polilínea ligera cerrada, metros | 1 aceptada, 4 segmentos. |
| `line-units-missing.dxf` | Geometría válida sin `INSUNITS` | Previsualiza y exige unidad explícita. |
| `mixed-line-circle.dxf` | `LINE` válida junto con `CIRCLE` | 1 aceptada, 1 rechazada, importación completa bloqueada. |
| `block-insert.dxf` | Definición de bloque más `INSERT` | `INSERT` no soportada y bloqueante. |
| `classic-polyline.dxf` | `POLYLINE`/`VERTEX` clásica | Entidad no soportada y bloqueante. |
| `non-planar-line.dxf` | `LINE` con coordenada Z | Geometría no planar y bloqueante. |

El corpus es sintético y pequeño a propósito: fija el contrato del parser sin
afirmar compatibilidad general con archivos producidos por todos los programas
CAD. El siguiente gate necesita muestras externas reales y desidentificadas.

## Unidades, escala, orientación y tolerancias

El modelo interno recibe metros. Los factores vigentes son `mm=0.001`,
`cm=0.01`, `m=1`, `in=0.0254`, `ft=0.3048` y
`US survey ft=1200/3937`. `INSUNITS` sólo se reconoce para los códigos
1/2/4/5/6/21; si falta o usa otro código, confirmar exige una selección
explícita de unidad.

Las coordenadas DXF `(x, y)` se escalan sin rotación, traslación, inversión de
ejes ni transformación OCS. El importador sólo admite la extrusión estándar
`(0, 0, 1)` y plano Z=0. Por ello la orientación observada es identidad XY, no
una interpretación automática de UCS, bloques o coordenadas 3D.

`EPSILON=1e-12` se usa para validar planitud y longitud nula en unidades de
origen. Después del escalado, los extremos importados se deduplican por la
representación numérica exacta de `(x, y)`. No existe snap ni tolerancia
geométrica; tampoco se busca coincidencia con nudos que ya estaban en el
proyecto. Dos puntos casi coincidentes, o un punto importado exactamente sobre
un nudo previo, pueden permanecer como nudos distintos.

## Preservación y pérdida de información

| Dato | Resultado |
|---|---|
| Extremos XY de líneas/aristas | Conservados y escalados a metros. |
| `ACADVER`, `INSUNITS` y lista de capas | Conservados durante inspección y visibles en el diálogo. |
| Nombre del archivo | Conservado como `sourceName` del comando. |
| Propiedades numéricas de la plantilla estructural elegida | Copiadas a cada miembro importado. |
| IDs de material/sección de catálogo y sus orígenes | No se copian; los orígenes pasan a `imported`. |
| Capa por entidad | Se usa en inspección, pero no existe en `ProjectModel`; se descarta al importar. |
| Color, tipo de línea, handle, XData, atributos, identidad CAD y metadatos no leídos | No representados; se descartan. |
| Arcos, círculos, curvas, bloques y geometría 3D | No convertidos; bloquean la operación. |

La plantilla debe ser un miembro existente y explícito. Esta política evita
inventar propiedades estructurales a partir de geometría CAD, pero significa
que un proyecto sin miembros no puede confirmar la importación.

## Atomicidad, recuperación y reversibilidad

El comportamiento vigente es **todo o nada**, no una importación parcial. El
parser conserva los segmentos válidos para previsualización y diagnóstico,
pero cualquier error deja `canImport=false`; el botón de confirmar permanece
deshabilitado. Así, el caso mixto `LINE + CIRCLE` no importa silenciosamente la
línea.

Cuando todo el archivo es admisible y ya se eligieron unidad y plantilla, la
UI crea una recuperación `dxf-import` y ejecuta un único `ProjectCommand`. Sus
nudos y miembros se agregan juntos y la inversión restaura el proyecto previo.
La cancelación antes de confirmar no muta el proyecto.

## Límites defensivos

- Texto: máximo provisional de 5,000,000 caracteres.
- Pares código/valor: máximo provisional de 200,000.
- Entidades en `ENTITIES`: máximo provisional de 20,000.
- Formato: extensión `.dxf`, texto ASCII sin bytes NUL y pares completos.
- Ejecución: lectura, parseo y previsualización ocurren en el hilo de la UI;
  los topes evitan entradas ilimitadas, pero no constituyen un presupuesto de
  latencia de navegador.

## Mensajes humanos recomendados

Antes de considerar una importación parcial futura, el contrato debería decir
de forma inequívoca:

1. `Se detectaron X entidades compatibles y Y bloqueadas. No se importó nada.`
2. `El archivo no declara una unidad compatible. Elige la unidad de origen; el resultado se guardará en metros.`
3. `Las capas se muestran para auditoría, pero el modelo estructural no las conserva.`
4. `Los nudos coincidentes con el modelo existente no se fusionan automáticamente.`

Estos textos son recomendación de producto; CRI-26 no modificó la interfaz. Una
modalidad parcial debe ser una tarea separada con selección explícita de
entidades, resumen previo y una sola transacción reversible. No debe habilitarse
saltando silenciosamente diagnósticos.

## Decisión

**Mantener DXF como importador experimental, estrecho y estricto.** El flujo
actual es seguro respecto a mutación parcial y tiene recuperación/undo, pero no
es suficientemente amplio ni preserva suficiente semántica CAD para promoción
general.

Los gates previos a ampliar o promover son:

1. corpus de archivos reales desidentificados exportados por al menos dos
   herramientas CAD, con evidencia de browser;
2. política explícita de snap/fusión y pruebas contra nudos existentes;
3. decisión de producto sobre preservación de capas;
4. contrato transaccional y de previsualización si se desea importación parcial;
5. presupuesto de latencia/memoria en el worker o navegador para los topes
   actuales;
6. ampliación entidad por entidad, nunca mediante tolerancia silenciosa.

## Evidencia ejecutada

- Parser + UI + corpus DXF: **3 archivos, 12/12 PASS**.
- El corpus nuevo pasó primero por RED: **6/6 fallaron por fixtures ausentes**;
  después de añadir únicamente los archivos representativos, **6/6 PASS**.
- Caso mixto compatible/no soportado: bloquea confirmación y conserva
  diagnóstico.
- Comando con plantilla explícita: recuperación previa y reversión verificadas
  por pruebas existentes.

## Por qué

CRI-26 pide distinguir compatibilidad real, ambigüedad y pérdida de datos. El
corpus fija esos límites como pruebas ejecutables y el reporte declara lo que
se descarta, sin convertir la auditoría en una ampliación no autorizada del
formato.

## Archivos tocados

- `src/import/dxf/dxfFixtures.test.ts` — contrato ejecutable del corpus.
- `src/import/dxf/fixtures/*.dxf` — siete entradas mínimas representativas.
- `reports/2026-08-24-cri-26-dxf-fiabilidad.md` — matriz, riesgos, decisión y gates.

## Cómo verificar

```powershell
npm.cmd exec -- vitest run src/import/dxf/dxfFixtures.test.ts src/import/dxf/dxfParser.test.ts src/import/dxf/DxfImportDialog.test.tsx --maxWorkers=1 --pool=threads --no-file-parallelism --reporter=verbose
npm.cmd run verify:docs
git diff --check
```

## Pendiente / siguiente paso

CRI-26 queda cerrada como auditoría y corpus de regresión. No se implementó
soporte nuevo, importación parcial, snap, fusión con nodos existentes, capas en
el modelo, transformación CAD, cambios de persistencia ni cambios de topología.
La siguiente posición vigente es CRI-43.
