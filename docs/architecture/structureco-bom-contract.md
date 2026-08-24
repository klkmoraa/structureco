# BOM estructural · contrato de cuantificación trazable

**Clasificación:** `CANONICAL`

## Propósito y frontera

El BOM estructural es una proyección pura del `ProjectModel` vigente. Cuantifica
barras de pórtico y armadura, conserva la procedencia hasta cada ID de barra y
produce un CSV reproducible. No escribe en el modelo, no ejecuta el solver, no
modifica resultados y no estima compras ni costos.

La salida es geométrica, no comercial. Usa 0 % de desperdicio y no presupone
largos de almacén, cortes, empalmes, optimización, disponibilidad, moneda,
precio, proveedor ni secuencia constructiva. Esas decisiones requieren un
contrato separado y datos explícitos que hoy no pertenecen al modelo.

## Reglas de inclusión y medida

- Se incluyen miembros `frame` y `truss` según los filtros visibles. Los
  miembros `rigid` se excluyen y se reportan por ID.
- La longitud es la distancia euclidiana entre los nudos `i` y `j`, en metros.
  No descuenta offsets rígidos analíticos ni interpreta una longitud de corte.
- Un miembro con nudos ausentes, coincidentes o geometría no finita se excluye
  como geometría inválida; nunca se corrige en silencio.
- El volumen es `A × L` en m³. La masa es `densidad × volumen` en kg. El peso
  propio informativo es `masa × 9.80665 / 1000` en kN.
- Si `A` o `densidad` no están disponibles y son válidas, la cantidad derivada
  correspondiente es `null`; no se rellena con un valor inferido.

## Identidad y agrupación

Una fila puede ser `catalog` o `unresolved`:

1. `catalog` exige `materialId` y `sectionId` explícitos, ambos con origen
   `catalog`, entradas existentes en los catálogos y coincidencia de `A` y
   densidad con las propiedades que gobiernan la cantidad.
2. Sólo las filas `catalog` se agrupan por la tupla estable
   `(memberType, materialId, sectionId)`.
3. Una identidad personalizada, importada, heredada, ausente o desviada queda
   `unresolved` y conserva una fila por barra. Dos números parecidos nunca se
   convierten en identidad de catálogo.

Las barras duplicadas cuentan como piezas independientes. Segmentos no
contiguos con la misma identidad explícita se agregan, pero cada segmento sigue
presente en `provenance`. Los IDs generados se tratan como cualquier otro ID de
barra porque `ProjectModel` no conserva una procedencia de generador separada;
el BOM no inventa esa procedencia.

## Lectura, actualización y localización

La superficie se abre desde Exportar o la paleta de comandos. El broker la
presenta como `drawer` en X2/M1 y `fullscreen` en K0. Los filtros de familia e
identidad reconstruyen la proyección desde el proyecto actual; no existe un
store paralelo ni una caché persistida.

Cada ID de procedencia permite `Localizar`: establece una selección explícita
`{ kind: 'member', id }`, pide al lienzo enfocar esa barra y degrada la
superficie a `peek`. Restaurar devuelve la misma superficie y sus filtros sin
alterar el modelo.

## CSV estable · schema 1

El archivo es UTF-8 con BOM, separador coma, terminación CRLF y nombre
`<proyecto>-bom-estructural.csv`. No incluye fecha ni locale; por eso el mismo
proyecto y los mismos filtros producen los mismos bytes. Los números usan
formato de máquina, mientras que la interfaz localiza sólo su presentación.

Las columnas, en orden, son:

```text
schema_version,row_id,identity_status,member_type,
material_id,material_name,material_origin,
section_id,section_name,section_origin,
member_count,total_length_m,total_volume_m3,total_mass_kg,total_self_weight_kn,
member_ids,provenance,source,warnings
```

`provenance` codifica cada segmento como
`memberId:nodeI-nodeJ:lengthM`; `member_ids` conserva el índice legible. El CSV
exporta exactamente el alcance visible de los filtros y nunca añade redondeos
de compra, desperdicio, precio ni costo.

## Oráculos

- `src/features/bom/structuralBom.test.ts`: duplicados, discontinuidad,
  identidades no resueltas, exclusiones, inmutabilidad y bytes CSV.
- `src/features/bom/StructuralBomPanel.test.tsx`: lectura, filtros,
  actualización, alcance exportado y localización por ID.
- `npm run qa:structural-bom`: recorrido construido X2/M1/K0, descarga real,
  presentación responsive, targets táctiles, `peek` y foco de retorno.
- `npm run verify:protected`: confirma que el BOM no alteró las fronteras
  estructurales protegidas.
