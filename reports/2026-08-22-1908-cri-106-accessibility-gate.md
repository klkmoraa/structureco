# CRI-106 — Gate de accesibilidad sobre `main` vigente

**Fecha:** 2026-08-22
**Agente:** Codex
**Rama:** `main`
**SHA medido:** `bf4e713cc9617d21c06a7f6e9e1de934b692a9bb`
**Linear:** CRI-106 quedó `In Progress`

## Resultado

La pasada se rehízo desde cero sobre el `main` actual. No se reutilizó como evidencia el baseline `228b4a6` ni se reabrieron los follow-ups históricos `CRI-113`–`CRI-118`.

**Veredicto: BLOCKED / FOLLOW-UPS.**

La aplicación pasa el gate Chromium y los runners focales de Results, edición estructural y Generator. El cierre completo no es elegible porque:

1. WebKit reproduce cinco targets táctiles menores de 44 px y una carrera de preload/import.
2. `qa:model-doctor` completa el build pero queda bloqueado sin terminar.
3. No fue posible ejecutar un recorrido observable con Windows Narrator en esta sesión.
4. `prefers-reduced-transparency` no tiene emulación real disponible en el runner utilizado.

No se tocó solver, matemática, signos, unidades, IDs, topología, workers, `ProjectModel`, persistencia, import/export, undo/redo ni resultados.

## Entorno y evidencia

- Windows; Node `24.18.0`.
- Playwright `1.61.1`.
- Chromium/Chrome for Testing `149.0.7827.55` disponible.
- WebKit `26.5` disponible.
- Firefox no instalado en este entorno.
- `Narrator.exe` existe, pero no había un proceso/sesión interactiva de Narrator observable para realizar la pasada real.

Evidencia regenerable:

`reports/evidence/2026-08-22-cri-106-accessibility/`

Contiene la tabla JSON de contraste, 15 capturas Día/Noche X2/K0, grayscale/CVD, resultados Chromium, logs WebKit, capturas WebKit y el preflight del lector de pantalla.

## Gates ejecutados

| Comando | Resultado | Evidencia / nota |
|---|---|---|
| `npm.cmd run qa` | PASS | Build correcto; `console=[]`, `pageErrors=[]`; Home, Workspace, Results, Inspector, touch, ES/EN y reduced-motion del runner actual pasaron. |
| `npm.cmd run qa:webkit` | FAIL clasificado | Cinco targets <44 px y errores de preload/import; log nuevo en `qa-webkit-current.log`. |
| `npm.cmd run qa:model-doctor` | BLOCKED | Build correcto; `scripts/qa-model-doctor.mjs` quedó sin salida y fue detenido. No se declaró PASS/FAIL del producto. |
| `npm.cmd run qa:results-cards` | PASS | Results denso X2/M1/K0, foco de retorno, ES K0 y Datasheet plano. |
| `npm.cmd run qa:structural-edits` | PASS | Move, Rotate, Mirror, Linear Array, Align, Distribute, undo/redo, responsive, touch y Candidate Picker. |
| `npm.cmd run qa:structure-generator` | PASS | Preview no mutante, familias/topologías, generación atómica, undo/redo, cancelación, accesibilidad, responsive y performance. |
| `npx.cmd vitest run src/design-system/tokens.test.ts src/design-system/totalRedesignFoundation.test.ts src/design-system/clayReconciliation.test.ts --maxWorkers=1 --pool=threads --no-file-parallelism` | PASS | 3 archivos, 69 tests. |
| `npm.cmd run verify:protected` | PASS | 38 archivos protegidos intactos. |
| `git diff --check` | PASS | Sin errores de whitespace. |

## Hallazgos vigentes

### WebKit / touch

En iPhone 13 e iPad Pro 11, ambos con la misma lista actual:

| Control | Medición |
|---|---:|
| Proyecto actual | 111–112×42 px |
| Herramientas del espacio de trabajo | 40×42 px |
| Model Doctor | 42×42 px |
| Seleccionar (V) | 43×43 px |
| Cerrar notificación | 41×41 px |

Se creó [CRI-120](https://linear.app/klkmoraa/issue/CRI-120/cri-106-vigente-targets-tactiles-webkit-menores-de-44-px-en-compact). No se reabrió CRI-115.

### WebKit / runner

El mismo build actual reprodujo:

- iPhone 13: `TypeError: Importing a module script failed`.
- iPad Pro 11: preload fallido de `WorkspaceShell-Dbw4BQyB.css`.

Se creó [CRI-122](https://linear.app/klkmoraa/issue/CRI-122/cri-106-vigente-carrera-de-preloadimport-en-webkit-del-build-actual). No se reabrió CRI-116.

### Contraste computado sobre producto real

La instrumentación focal midió cuatro casos (X2/K0 × Día/Noche), sobre superficies Workspace/Results. Los casos bajo el umbral que requieren decisión y remedición quedaron en [CRI-121](https://linear.app/klkmoraa/issue/CRI-121/cri-106-vigente-contraste-insuficiente-en-grupos-toolrail-y-estados):

| Consumidor visible | Día | Noche | Referencia |
|---|---:|---:|---|
| Encabezados de grupos ToolRail | 4.27:1 | — | Texto pequeño: 4.5:1 |
| Estado Results `Expandido` | 3.85:1 | 3.38:1 | Texto pequeño: 4.5:1 |
| Tab activo Results `Momento` | 2.85:1 | 2.85:1 | Medición del consumidor real |
| Botón móvil de carga | 4.24:1 | 3.22:1 | Texto visible del control |

Los ratios de elementos sólo-ARIA o icono-only no se presentan como contraste tipográfico. La tabla completa y los colores computados están en `contrast-and-accessibility.json`.

El gate de tokens sigue verde, pero eso no se usa como sustituto de la medición de consumidores reales.

### Teclado, focus y responsive

`qa` y los runners focales actuales verificaron navegación por teclado, `focus-visible`, touch/pan/pinch, ausencia de overflow horizontal, retorno de foco de Results y continuidad de las superficies actuales. No se inventa una afirmación adicional de lector de pantalla a partir de esos resultados.

### Clipboard

En Chromium real:

- API disponible: `true`.
- Sin permiso: `NotAllowedError`.
- Con permiso concedido: lectura correcta de `CRI106`.

Esto confirma que disponibilidad de API y lectura autorizada son estados distintos. No se modificó `structuralClipboard.ts`.

### Reduced motion y transparency

`reduced-motion` sigue siendo un contrato activo del producto: la especificación canónica, `tokens.css`, `motion` y los tests actuales lo conservan. La comprobación mínima observó duraciones de `0.00001s` en contexto `reducedMotion: reduce` y el gate `qa` pasó la ruta. No se eliminó ni se cambió.

`prefers-reduced-transparency` está declarado en CSS, pero el runner no ofrece una emulación real equivalente; queda **NO PROBADO**, no PASS.

### Lector de pantalla

Windows detecta `C:\WINDOWS\system32\Narrator.exe`, pero no hubo una sesión interactiva con salida observable. El estado correcto es **NO PROBADO/BLOCKED**. No se sustituyó por DOM, ARIA snapshots o inspección de roles. Detalle en `screen-reader-PREFLIGHT.md`.

Se creó [CRI-123](https://linear.app/klkmoraa/issue/CRI-123/cri-106-vigente-runner-qamodel-doctor-queda-bloqueado-despues-del) para el runner bloqueado. El bloqueo de Narrator queda documentado como limitación del entorno, no como defecto de producto.

## Cambios realizados

- Se añadió este reporte tracked.
- Se generó instrumentación y evidencia ignorada en `reports/evidence/2026-08-22-cri-106-accessibility/`.
- No hubo cambios en `src/`.
- Con autorización explícita posterior, `main` se publicó como `1419f21337962cb87405ee20ae04c396471983aa`.
- El build generado desde ese snapshot se publicó en `gh-pages` como `23359baa7251437a3aa671961314f9fffa43e41c`, sin force push.
- La URL servida `https://klkmoraa.github.io/structureco/` respondió HTTP 200 y referencia los assets actuales `index-PYDCmh8G.css` e `index-CiXyw_PA.js`.

## Estado y siguiente paso

CRI-106 permanece `In Progress` en Linear. El gate no debe marcarse `Done` hasta que exista un entorno con Narrator operativo, se decida el tratamiento de los contrastes actuales y se resuelvan/reclasifiquen los follow-ups WebKit/runner.
