# CRI-123 · runner Model Doctor acotado y diagnosticable

## Resultado

La reproducción sobre `main` vigente mostró que `qa:model-doctor` no quedaba
detenido después del build: ejecutaba en silencio una cadena de escenarios con
recargas de proyecto. La corrida completa tarda aproximadamente 288 s y cada
escenario observado avanzó en intervalos de 17–20 s.

El runner ahora informa la etapa activa y el tiempo transcurrido. Un escenario
sin progreso durante 90 s termina con código no cero e incluye en el diagnóstico
la última etapa, URL y errores de página. El watchdog también permanece activo
durante el cierre de Chromium y Vite, por lo que esa frontera ya no puede dejar
el proceso abierto indefinidamente.

No se aumentó ningún timeout global ni se relajó una assertion del producto.

## Evidencia focal

| Gate | Resultado |
| --- | --- |
| `node --test scripts/qa-stage-watchdog.test.mjs` | PASS; rearma el límite y reporta la última etapa. |
| `npm.cmd run qa:model-doctor` | PASS en 288 s; 6 viewports, foco, teclado, contraste, safe area, preview/apply/undo/redo y movimiento reducido. |
| `npm.cmd run verify:protected` | PASS; frontera protegida intacta, 38 archivos. |
| `npm.cmd run verify:docs` | PASS; 2/2 pruebas y 10 documentos clasificados. |

## Límites preservados

El cambio se limita al arnés de QA y su prueba. No modifica solver, matemáticas,
unidades, signos, IDs, topología, workers, `ProjectModel`, persistencia,
import/export, undo/redo ni resultados.
