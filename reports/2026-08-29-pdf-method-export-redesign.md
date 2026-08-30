# Métodos de cálculo sólo al exportar PDF

## Resultado

- El análisis interactivo sigue usando exclusivamente `analyzeProject` y rigidez matricial.
- El selector de procedimiento salió de **Análisis y cargas** y aparece únicamente en **Preparar PDF de cálculo**.
- El diálogo presenta el catálogo canónico de 12 métodos. La selección es propia del PDF y no modifica ni persiste el proyecto.
- El PDF declara por separado el motor autoritativo, el procedimiento documentado y su estado. Portal y voladizo siguen rotulados como aproximaciones; Kani sólo se habilita cuando cierra sin traslación lateral.
- La aplicabilidad se comprueba con los módulos reales y con los factores exactos del escenario, no sólo con la forma superficial de la estructura.
- Los cálculos por miembro y por método se maquetan como secuencias de DCL, ecuaciones y valores rotulados, sin tablas de resultados.

## Catálogo cubierto

1. Matriz de rigidez.
2. Doble integración.
3. Viga conjugada.
4. Teorema de los tres momentos.
5. Hardy Cross.
6. Trabajo virtual.
7. Cortes / secciones.
8. Método de los nudos.
9. Método del portal.
10. Método del voladizo.
11. Castigliano / trabajo mínimo.
12. Kani / contribución de rotación.

La clasificación y el alcance se contrastaron con MIT OCW para cerchas, NPTEL para fuerza/desplazamiento/rigidez, LibreTexts para vigas, energía y Hardy Cross, Purdue para portal/voladizo y Caprani para tres momentos.

## Contrato de honestidad

La memoria imprime una leyenda equivalente a:

> Motor de resultados: Matriz de rigidez (autoritativo). Procedimiento documentado: método seleccionado. Estado: reconstrucción procedural verificada contra el análisis matricial o aproximación.

`solutionMethod` es una opción del artefacto de exportación. No entra al worker, al solver, a los diagramas autoritativos ni al payload del análisis. Si el procedimiento no cumple cargas, apoyos, continuidad, convergencia o residual, queda deshabilitado y se muestra su razón; no existe fallback silencioso con el nombre anterior.

## Validación

- 65 pruebas de los 12 módulos de métodos: correctas.
- 92 pruebas enfocadas de PDF, Preview, TopBar e Inspector: correctas.
- TypeScript, i18n, CSS global, PWA, build y presupuesto de entrada: correctos.
- PDF real de **Cortes / secciones**: A4, 8 páginas, texto seleccionable, DCL y ecuaciones; renderizado con Poppler y revisado visualmente.
- Flujo de producción local en Edge/Playwright: catálogo de 12 métodos, cambio a `memoria-cortes.pdf`, 0 errores/advertencias de consola.
- Vista móvil 390 × 844: ancho de documento, `body` y diálogo iguales a 390 px; sin desbordamiento horizontal.

## Límites de validación ajenos al cambio

El gate global conserva fallos preexistentes fuera de este alcance en `InfluenceLineView.tsx`, la línea de clasificación de `docs/product/reportlab-pdf-export.md` y el baseline protegido del motor. Ninguno de esos archivos se modificó en esta entrega.
