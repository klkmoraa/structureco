# Matriz de QA — línea base de Fase 1

## Entrada de Fase 3 - Slice 3.0, 2026-07-17

| Capa | Cobertura | Resultado |
| --- | --- | --- |
| `npm.cmd run verify` | lint, 41 archivos, 233 pruebas y build | **PASS** |
| `npm.cmd run qa:phase2` | 117 checks y 14 filas ES/EN | **PASS**, 0 fallos, consola limpia |
| `npm.cmd run qa` | Chromium heredado funcional | **PASS**, consola y page errors vacíos |
| `npm.cmd run qa:webkit` | iPhone 13 e iPad Pro 11 | **PASS** |
| Browser integrado | nueve viewports, Light/Dark, listo/analizado, selección M2 | **PASS funcional / baseline visual abierto** |
| Frontera protegida | engine, workers, data, portable, types | Baseline SHA registrado; diff final exigido en cero |

Hallazgos visuales de entrada: ToolRail plano, agrupación dependiente de separadores, chrome sin zonas seguras explícitas, capas mezcladas con settings persistentes, labels sin prioridad/LOD/colisión y selección verde confundible con acción de producto. Todos son alcance de Fase 3; no se detectó falla matemática.

## Cierre de Fase 2 - 2026-07-17

| Capa | Cobertura | Resultado final |
| --- | --- | --- |
| `npm.cmd run verify` | lint, 41 archivos de prueba, 233 pruebas y build | **PASS** |
| `npm.cmd run qa:phase2` | 117 checks, 14 filas ES/EN, nueve viewports, estados, contraste, foco, reduced motion y zoom 200 % | **PASS**, 0 fallos, 0 console errors, 0 page errors |
| `npm.cmd run qa` | 63 checks Chromium: canvas, resultados, gestos, mecanismo, influencia, móvil y ejemplo educativo | **PASS**, consola limpia |
| `npm.cmd run qa:webkit` | iPhone 13 e iPad Pro 11: importación, viewport, scroll y targets | **PASS**, 0 errores |
| Browser in-app | estados reales, overflow/foco y 13 capturas finales | **PASS** |

Resultados cuantitativos:

- Intersecciones visibles en la TopBar: 0 en 390, 430, 834, 1024, 1194, 1280, 1366, 1440 y 1536 px.
- Controles fuera del header: 0; overflow horizontal: 0 px.
- Targets frecuentes en 390/430/834: al menos 44 x 44 px.
- Texto crítico renderizado: mínimo 12 px.
- Contraste Light del indicador: listo 4.77:1, warning 5.84:1 y error 5.90:1.
- Loading: botón Analizar 148 px antes/durante en wide; estado `calculating` capturado realmente.
- Zoom 200 %: equivalentes CSS 683 x 384 y 417 x 597 sin colisión, salida del header u overflow.

Evidencia reproducible: `evidence/phase-02/after/phase2-metrics.json`.

## Revalidación de entrada - Fase 2, Slice 2.0

| Capa | Resultado 2026-07-17 | Evidencia |
| --- | --- | --- |
| `verify` | PASS - 40 archivos, 229 pruebas, build | `phases/phase-02-baseline.md` |
| QA Chromium | PASS - todos los checks, consola/página limpias | `qa-artifacts/qa-results.json` |
| QA WebKit | PASS - iPhone 13 e iPad Pro 11 emulados | salida `qa:webkit` y capturas QA |
| Geometría P0 | FAIL esperado antes del rediseño en 1440, 1366 y 1194 | `evidence/phase-02/before/baseline-metrics.json` |
| Overflow horizontal | PASS en siete viewports before | `evidence/phase-02/before/` |
| Interacción | PASS - ejemplo -> Analizar -> canvas/inspector/resultados | Browser in-app, consola limpia |

La función está estable, pero los tres P0 visuales siguen abiertos como condición de entrada. Este estado es intencional: el Slice 2.0 mide el antes y todavía no autoriza cambios productivos.

## Resultado actual

| Capa | Entorno | Cobertura | Resultado | Observación visual |
| --- | --- | --- | --- | --- |
| Verificación de código | Node 24.18.0 / npm 11.16.0 | lint, unitarias, integración y build | **PASS** — 40 archivos, 229 pruebas | No evalúa composición visual. |
| Recorrido automatizado | Chromium | desktop/mobile, pan, zoom, touch, abrir, menús, tema, inspector, influencia, mecanismo, Hibbeler, overflow | **PASS** | Las capturas revelan microtexto y densidad que los checks booleanos no detectan. |
| Compatibilidad | WebKit emulado iPhone 13 | importación y ajuste al viewport | **PASS** | Centro de importación es una fortaleza. |
| Compatibilidad | WebKit emulado iPad Pro 11 | importación, targets y viewport | **PASS** | No cubre el workspace de 1194 px auditado manualmente. |
| Recorrido manual | Chromium 1440×900 | Completo, claro, analizado, selección, resultados | **PASS funcional / FAIL visual** | TopBar se cruza; resultados pequeños. |
| Recorrido manual | Chromium 1366×768 | Completo, claro, analizado | **PASS funcional / FAIL visual** | Historial/guardado invaden el selector. |
| Recorrido manual | Chromium 1194×834 | tableta horizontal | **PASS funcional / FAIL visual** | Breakpoint tardío y colisiones severas. |
| Recorrido manual | Chromium 834×1194 | tableta vertical | **PASS funcional / FAIL táctil** | Composición útil; controles frecuentes <44 px. |
| Recorrido manual | Chromium 390×844 | móvil, resultados e inspector | **PASS funcional / FAIL visual** | Tabs parciales, microtexto y targets pequeños. |
| Recorrido manual | Chromium 1440×900 | oscuro, Aula y predicción | **PASS funcional / FAIL de dirección** | Aula no tiene stepper persistente ni acento secundario propio. |
| Estado de error | Chromium desktop/mobile | mecanismo y diagnóstico | **PASS funcional** | Mensaje claro; detalle demasiado pequeño. |
| Consola | Chromium durante el recorrido | errores, warnings y page errors | **PASS** | Sin incidencias observadas. |

## Matriz mínima para una implementación futura

Cada cambio visual deberá probar como mínimo:

| Eje | Valores obligatorios |
| --- | --- |
| Viewport | 390×844, 430×932, 834×1194, 1024×768, 1194×834, 1280×800, 1366×768, 1440×900, 1536×960 |
| Tema | claro, oscuro |
| Modo | Completo, Aula |
| Proyecto | nuevo, ejemplo, importado |
| Análisis | listo, calculando, resuelto, desactualizado, mecanismo/error |
| Selección | ninguna, nodo, miembro, carga, múltiple |
| Paneles | cerrados, compactos, expandidos, modal/pantalla completa |
| Entrada | mouse, teclado, touch; stylus cuando exista hardware disponible |
| Idioma | ES, EN |
| Preferencias | movimiento reducido, transparencia reducida, zoom navegador 200 % |

## Gates cuantitativos

- Cero colisiones geométricas o overflow horizontal de página.
- Cero texto crítico por debajo de 12 px.
- Cuerpo de lectura de 14 px o más salvo excepción documentada.
- Targets frecuentes de 44×44 px como mínimo.
- Contraste WCAG AA para texto, controles y estados relevantes.
- Foco visible, orden lógico, modal con fondo inerte y restauración de foco.
- Tab activo y estado de análisis identificables sin depender sólo del color.
- Mismos resultados, precisión, signos y unidades antes/después.
- `npm.cmd run verify`, `npm.cmd run qa` y `npm.cmd run qa:webkit` aprobados.
- Comparación visual contra [`evidence/baseline/`](evidence/baseline/README.md) con diferencias intencionales documentadas.

## Riesgos no cerrados en esta fase

- Hardware iOS/iPadOS/Android real y stylus.
- Auditoría completa con lector de pantalla.
- Recorrido completo sólo con teclado en todas las herramientas del canvas.
- Zoom de navegador al 200 % y escalado del sistema operativo.
- Pruebas perceptuales de daltonismo sobre todos los diagramas.

Estos riesgos deben incorporarse antes de declarar terminado el rediseño, pero no impiden cerrar la auditoría de Fase 1.
