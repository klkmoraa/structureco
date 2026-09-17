# Integridad de controles móviles

**Clasificación:** `VISUAL`
**Fecha:** 2026-09-17
**Estado:** Verificado localmente

## Resultado

Se cerró la cascada móvil que permitía que los anchos intrínsecos de los
botones escaparan de sus filas. Inicio conserva sus dos acciones principales
en una columna de ancho conocido; el workspace deja encoger docks, hojas,
paletas y acciones sin perder el target táctil; los botones conservan un piso
horizontal de 44 px salvo el slider segmentado, que puede comprimirse para
seguir cabiendo; las etiquetas de navegación truncan con elipsis; y el topbar
muestra «Analizar» sólo cuando existe espacio para su etiqueta. En teléfonos
más estrechos vuelve a icono sin dejar texto flotando fuera del botón.

## Archivos principales

- `src/features/mobile/mobileHomeIOS.css`
- `src/features/mobile/mobileIOS.css`
- `src/features/topbar/topbar.css`
- `src/features/workspace/mobileIOS.test.ts`

## Frontera

El cambio es sólo de presentación: no altera solver, unidades, signos, IDs,
topología, `ProjectModel`, workers, persistencia, import/export, undo/redo ni
resultados. No se añadieron dependencias.

## Verificación

- Contrato móvil enfocado: 13 pruebas aprobadas.
- Suite UI enfocada: 10 archivos, 89 pruebas aprobadas.
- Suite completa: 342 archivos, 2871 pruebas aprobadas y 5 omitidas.
- TypeScript y build de producción: aprobados con React/Vite fijados.
- Presupuesto de carga inicial: aprobado, 1 389 832 bytes / 379 999 gzip.
- QA visual local a 390 px y 320 px: sin controles interactivos fuera del
  viewport; acciones de Inicio alineadas a 316 px y «Analizar» contenido en
  390 px.
