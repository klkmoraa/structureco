# CRI-47 — BOM estructural trazable

**Fecha:** 2026-08-24
**Agente:** Codex
**Rama:** `codex/linear-queue-execution-20260824`
**SHA base auditado:** `188c3f4330e4db124ed4492abe55bbb95eef648a`

## Resultado

Se incorporó una cuantificación geométrica pura y reproducible de barras
`frame` y `truss`. La salida agrupa únicamente identidades explícitas y válidas
de material/sección, conserva procedencia hasta cada ID de barra y exporta el
alcance visible como CSV estable. No modifica el proyecto, el solver ni los
resultados.

La superficie se abre desde Exportar o la paleta compartiendo el comando
`export:bom`; el broker de CRI-94 la presenta como `drawer` en X2/M1 y
`fullscreen` en K0. Los filtros distinguen familia e identidad de catálogo o
sin resolver. `Localizar` selecciona `{ kind: 'member', id }`, enfoca el lienzo
y degrada el BOM a `peek`; restaurar conserva sus filtros.

## Decisiones de cuantificación

- Longitud geométrica entre nudos, sin descontar offsets analíticos.
- Volumen `A × L` en m³; masa `densidad × volumen` en kg; peso propio
  informativo con gravedad estándar en kN.
- Desperdicio fijo en 0 %; sin largos comerciales, optimización de cortes,
  precio, proveedor, moneda ni costo.
- `frame` y `truss` incluidos; `rigid` excluido con ID y razón.
- Agrupación sólo por `(memberType, materialId, sectionId)` cuando ambas
  identidades son de catálogo y `A`/densidad no divergen.
- Identidades custom/imported/legacy/ausentes/desviadas quedan en una fila por
  barra; nunca se infiere identidad por coincidencia numérica.
- Duplicados cuentan como piezas independientes. Segmentos discontinuos se
  agregan sólo con identidad explícita y cada segmento permanece en
  `provenance`. Un ID generado se conserva como ID ordinario porque el modelo
  no publica procedencia de generador.

El contrato completo y el schema CSV están en
`docs/architecture/structureco-bom-contract.md`.

## CSV schema 1

El archivo usa UTF-8 con BOM, CRLF, números de máquina y un orden rectangular
de 19 columnas. No contiene fecha ni locale, por lo que el mismo proyecto y
filtros producen los mismos bytes. Incluye identidad, origen, piezas,
longitud, volumen, masa, peso propio, `member_ids`, procedencia nudo a nudo,
fuente y warnings.

## Evidencia ejecutada

- TDD núcleo: RED por módulo ausente; después **4/4 PASS**.
- TDD componente: RED por superficie ausente; después **4/4 PASS**.
- Integración comando/broker/TopBar: RED en 4 contratos; después **38/38 PASS**.
- Suite focal final: **5 archivos, 46/46 PASS**.
- TypeScript: `tsc -b --noEmit` **PASS**.
- Lint: salida 0; conserva 6 warnings preexistentes fuera de CRI-47.
- Documentación: `verify:docs` **PASS**, 6 documentos bajo `docs/**`.
- Frontera protegida: `verify:protected` **PASS**, 40 archivos intactos.
- Build productivo: **PASS**, 2,653 módulos.
- Browser oracle `qa:structural-bom`: **37 checks PASS** en X2/M1/K0;
  presentación, filtros, duplicados, identidad sin resolver, CSV descargado,
  procedencia, selección exacta, `peek`, retorno de foco, 44 px táctiles,
  ausencia de overflow y consola limpia.
- Inspección visual manual de las tres capturas regenerables: sin solapes,
  clipping horizontal ni controles fuera del viewport.
- `git diff --check`: **PASS**; sólo avisos informativos de normalización
  LF/CRLF del checkout.

La ruta compartida de QA de bienvenida ahora reconoce tanto “Continuar
proyecto” como “Continue project”; esto permite validar K0 en inglés mediante
la misma ruta real de producto.

## Archivos principales

- `src/features/bom/structuralBom.ts` y pruebas — proyección pura, totales,
  exclusiones y CSV.
- `src/features/bom/StructuralBomPanel.tsx` y CSS/pruebas — lectura,
  filtros, exportación y procedencia localizable.
- `src/features/workspace/**`, `src/features/topbar/**` — comando único,
  broker y lanzadores responsive.
- `src/i18n/catalogs.ts` — interfaz completa en español e inglés.
- `scripts/qa-structural-bom.mjs` y `package.json` — oráculo construido.
- `docs/architecture/structureco-bom-contract.md` — contrato canónico.

## Cómo verificar

```powershell
npm.cmd exec -- vitest run src/features/bom/structuralBom.test.ts src/features/bom/StructuralBomPanel.test.tsx src/features/workspace/surfacePresentation.test.ts src/features/workspace/workspaceCommands.test.ts src/features/topbar/TopBar.commandParity.test.tsx --maxWorkers=1 --pool=threads --no-file-parallelism --reporter=verbose
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run verify:docs
npm.cmd run verify:protected
npm.cmd run qa:structural-bom
git diff --check
```

## Exclusiones

No se implementaron estimación de compra, costos, merma configurable, stock
comercial, optimización de cortes, conexiones, placas, pernos, soldadura,
concreto, acero de refuerzo ni procedencia de generadores que el modelo no
posee. Tampoco se modificaron solver, matrices, signos, unidades base,
topología, `ProjectModel`, workers, persistencia, import/export existente,
undo/redo ni resultados.

La siguiente tarea vigente es CRI-48; no se inició dentro de este cambio.
