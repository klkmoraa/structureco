# Datasheet estructural — contrato vigente

**Clasificación:** `CANONICAL`

Contrato del datasheet estructural (`src/features/datasheet/**`) tras CRI-81, la
fase de auditoría de sólo lectura. Recoge las dos decisiones que la siguiente
fase no debe volver a tomar por su cuenta: **con qué se construye la rejilla** y
**por dónde se editan los casos de carga y las combinaciones**.

## Qué es el datasheet

Una proyección tabular del `ProjectModel` para auditar el modelo entero: buscar,
ordenar, filtrar, y ver el detalle visual del objeto enfocado.

**No es un modelo paralelo.** No tiene store, ni historial, ni undo propios:

| Qué | Dónde vive |
|---|---|
| Filas | `projectDatasheetRows(project, entity)`, función pura, sin caché |
| Selección | `useWorkspaceUI().selection`, la misma que el lienzo y el Inspector |
| Escritura | No existe en esta fase |
| Vista (entidad, búsqueda, filtros, orden, foco) | Estado local del panel; muere al cerrar |

Una selección de varias filas produce `{ kind: 'multi', nodeIds, memberIds }`,
que es exactamente lo que ya consumen el lienzo, el Inspector y la edición
múltiple. El datasheet no inventa un formato de selección propio.

## Decisión: rejilla propia, sin TanStack Table

**Estado:** vigente desde CRI-81.
**Decisión:** `<table role="grid">` propia sobre un módulo puro
(`datasheetModel.ts` + `datasheetGridNavigation.ts`). **`@tanstack/react-table`
no se instala.**

**Por qué:**

1. `AGENTS.md` prohíbe añadir dependencias sin autorización explícita.
2. Ordenar, filtrar y definir columnas son aquí funciones puras de unas 150
   líneas, del mismo tipo que `bulkEditProjection.ts`, y se prueban sin montar
   React.
3. Lo caro de esta rejilla no es la tabla sino el teclado y la accesibilidad:
   foco itinerante en `role="grid"`, selección distinta del foco, y la costura
   `Enter`/`F2` para la edición. TanStack es *headless* y no resuelve nada de eso.
4. Su edición de celdas es «trae la tuya»: no ahorraría trabajo en la fase de
   edición.

**Cuándo reabrirla:** cuando se pidan a la vez columnas
redimensionables/reordenables/fijadas, agrupación con subtotales, o
virtualización por encima de ~10 000 filas. La frontera para adoptarlo ya está
aislada en `datasheetModel.ts`, que no depende de React.

## Contrato: casos de carga y combinaciones

**Resuelto, verificado en el código. No se inventa una ruta nueva.**

`ProjectCommand` sólo puede describir las colecciones declaradas en
`ProjectEntityCollection` (`src/commands/projectCommand.ts`):

```text
nodes · members · nodalLoads · memberLoads · prescribedDisplacements · memberInitialEffects
```

`loadCases` y `combinations` **no están en esa lista**. Por lo tanto:

- `executeProjectCommand` **no puede** expresar un cambio sobre ellos:
  `diffProjects` recorre sólo esas colecciones y produciría un parche vacío.
- La ruta canónica y única es **`updateProject(updater)`** de `useProjectModel`,
  la que ya usa el Inspector (`src/features/inspector/Inspector.tsx`) para crear
  casos, activarlos, renombrarlos y escribir los factores de una combinación.
  Es reversible: pasa por `commitReversibleProjectChange`, registra historial e
  invalida el análisis vigente.

**Para la fase de edición (CRI-82):** casos y combinaciones se editan por
`updateProject`. Si se quisiera la semántica completa de comando —parche,
inverso y precondiciones—, lo correcto es **ampliar `ProjectEntityCollection`**,
no abrir una ruta paralela desde el datasheet. Eso es un ticket propio.

En CRI-81, casos y combinaciones son sólo referencia de lectura: el nombre del
caso de cada carga en las tarjetas del panel contextual.

## Contrato de editabilidad

Cada columna declara **por qué** su celda no se edita, y `Enter`/`F2` lo anuncia
en una región viva en vez de callarse:

| `editability` | Significado | Ejemplos |
|---|---|---|
| `identity` | Nunca editable. Identidad y referencias estructurales. | `id` de nudo y barra, `i`, `j` |
| `derived` | Nunca editable. Se calcula del modelo. | longitud, restricciones, nº de cargas |
| `pending` | Editable; todavía no en esta fase. | `x`, `y`, apoyo, tipo, `E`, `A`, `I` |

La fase de edición abre exactamente las celdas `pending`. Cambiar una celda
`identity` a editable es un cambio de contrato, no un detalle de interfaz.

## Unidades

Las filas llevan magnitudes en **unidades base internas** (kN, m, m², m⁴). La
conversión al sistema del proyecto ocurre sólo al presentar
(`datasheetPresentation.ts`). Si el orden dependiera de las unidades mostradas,
la misma columna ordenaría distinto en `kN-m` y en `kip-ft`.

## Teclado

`role="grid"` con `aria-rowcount`/`aria-colcount` y foco itinerante: la rejilla
entera es una sola parada de tabulación.

| Tecla | Efecto |
|---|---|
| Flechas | Mueven el foco una celda; topan en los bordes, no envuelven |
| `Inicio` / `Fin` | Primera / última columna de la fila |
| `Ctrl`+`Inicio` / `Ctrl`+`Fin` | Primera / última celda de la tabla |
| `RePág` / `AvPág` | Diez filas |
| `Intro` | Selecciona la fila y anuncia la editabilidad de la celda |
| `F2` | Sólo el anuncio de editabilidad |
| `Ctrl`+`Espacio` | Alterna la fila dentro de la selección múltiple |
| `Esc` | Limpia la selección; sin selección, cierra la hoja |

**El foco no es la selección.** El foco se dibuja como anillo y la selección como
fondo con `aria-selected`. Recorrer la tabla con las flechas no cambia el objeto
seleccionado en el lienzo.

## Superficie

Se abre como Drawer modal desde el comando de workspace `open-datasheet` (barra
superior y paleta de comandos). Con el lienzo inerte, la acción **Enfocar** emite
`focus-object` **y cierra la hoja**, para que el objeto quede centrado y visible
en el mismo gesto.

## Verificación

```bash
npx vitest run src/features/datasheet --maxWorkers=1
```

- `datasheetModel.test.ts`: proyección, unidades base, búsqueda, facetas y orden.
- `datasheetGridNavigation.test.ts`: topes, extremos y reencaje del foco.
- `DatasheetPanel.test.tsx`: proyección viva, sincronización de selección y previews.
- `DatasheetAccessibility.test.tsx`: rejilla, foco itinerante y anuncios de editabilidad.
- `datasheetStyles.test.ts`: tokens Clay, tabla plana y foco distinto de selección.

## Historia

- [Diseño de CRI-81](../superpowers/specs/2026-08-13-structural-datasheet-cri-81-design.md) — contexto de la fase; no prueba el estado actual.
