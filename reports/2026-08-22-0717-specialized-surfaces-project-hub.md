# Superficies especializadas y Project Hub visual

**Fecha:** 2026-08-22 07:17
**Agente:** Codex
**Rama:** codex/clay-workspace-phase-2

## Qué cambió
Se rediseñaron Project Hub, Model Doctor, Generator, Datasheet y el selector de proyecto de la barra superior como superficies clay coherentes, compactas y realmente responsive. Project Hub dejó la tabla sin contexto visual y ahora presenta miniaturas 3D determinadas por la topología real del proyecto, apertura primaria y acciones secundarias agrupadas en un solo menú. También se humanizaron los textos de estas superficies y se retiraron repeticiones visuales y explicativas.

## Por qué
El rediseño total requiere que las superficies reales del producto se sientan como una sola identidad y no como paneles anteriores recoloreados. En móvil había controles amontonados, tarjetas sobredimensionadas y encabezados duplicados; en escritorio faltaba jerarquía entre selección, edición y revisión.

## Archivos tocados
- `src/features/project-hub/ProjectHub.tsx` y `projectHub.css` — biblioteca visual con miniaturas 3D, metadatos reales, menú compacto y carrusel responsive.
- `src/features/topbar/TopBar.tsx` y `topbar.css` — selector convertido en Project Hub contextual con acciones descritas.
- `src/features/model-doctor/ModelDoctor.tsx` y `modelDoctor.css` — estado sano compacto, sin explicación duplicada y con profundidad contenida.
- `src/features/structure-generator/StructureGeneratorPanel.tsx` y `structureGenerator.css` — flujo familia/parámetros/revisión, familias compactas y carrusel táctil.
- `src/features/datasheet/DatasheetPanel.tsx` y `datasheet.css` — mesa técnica de auditoría con editor lateral y comportamiento móvil específico.
- `src/features/workspace/phase1.css` — el dock se retrae al abrir Generator para evitar superposiciones.
- `src/i18n/catalogs.ts` y `src/i18n/phase2Catalogs.ts` — copy más directo, humano y consistente en español e inglés.
- Pruebas focales de TopBar, Model Doctor, Generator, Datasheet y Project Hub — contratos visuales y de interacción nuevos.

## Cómo verificar
- `npm.cmd test -- src/features/topbar/TopBar.test.tsx src/features/model-doctor/ModelDoctor.test.tsx src/features/structure-generator/StructureGeneratorPanel.test.tsx src/features/datasheet/datasheetStyles.test.ts src/features/project-hub/ProjectHub.test.tsx --reporter=dot` — 80/80 pruebas pasan.
- `npm.cmd run typecheck` — pasa.
- `npm.cmd run verify:protected` — 38 archivos verificados; frontera de cálculo intacta.
- Abrir Home > Proyectos en 390 px y escritorio: cada proyecto muestra una miniatura estructural, un botón Abrir y un único menú `⋯`.

## Pendiente / siguiente paso
Continuar el rediseño integral de Import Center y Space 3D; después Aula y certificación visual final.
