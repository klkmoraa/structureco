# CRI-11 · Fase A — harness de prototipado aislado

**Fecha:** 2026-08-15 22:30
**Agente:** Claude Code
**Rama:** `claude/cri-11-fase-a-prototype-ej1x53`, partiendo de `origin/main` en **`7fb927f`**
**Clasificación:** `AUDIT/TEMPORARY` — evidencia de una ejecución concreta. No es
especificación, no es contrato de producto y no prueba implementación en `main`.

> **Qué es y qué no es.** CRI-9 cerró la arquitectura; CRI-10 cierra el sistema
> visual. Fase A de CRI-11 no diseña ni decide: **construye el instrumento** con
> el que las decisiones de ambos se podrán usar, romper y medir. Su entregable no
> son pantallas, es un laboratorio navegable. Ninguna cifra de resultado que
> aparece en él sale del solver.

---

## Qué cambió

Se añadió `prototypes/cri-11-harness/`, un prototipo **aislado** con su propio
`package.json`, que implementa las capas 3 a 6 de la Alternativa D de CRI-9:

- **sensor de entorno** — el único módulo que lee `matchMedia` o mide el viewport;
- **resolutor puro** — port calibrado del modelo de canvas-budget de CRI-9;
- **broker de superficies** — ocupación, `peek`, suspensión, foco y anuncios;
- **superficies** — una implementación, tres presentaciones, un solo árbol;
- **FixtureStore**, **máquina de estados de análisis simulada**, **CommandRegistry**,
  **TelemetrySink local** y el **ledger de capacidad** en código.

Sobre esa base corre el primer recorrido mínimo completo, de extremo a extremo.

No se tocó ni un archivo de producción.

## Por qué

El encargo de CRI-11 dice que los prototipos previos no cuentan como validación,
y que lo que hace falta es **evidencia de uso**: una persona completando una
tarea, no una galería de capturas. Fase A es la condición previa — el gate que el
propio encargo fija es que *ninguna opción del laboratorio requiera reescribir el
escenario*. Ese gate se cumple.

---

## El resolutor: por qué se puede creer

`src/core/resolver.mjs` es un port fiel de
`reports/evidence/2026-08-15-cri-9-adaptive-architecture/canvas-budget-model.mjs`.
Se mantiene en JavaScript plano para que `node --test` lo ejecute sin toolchain.

`resolver.test.mjs` — **18 pruebas, todas en verde** — vuelve a comprobar:

| Qué afirma | Resultado |
|---|---|
| Reproduce las once mediciones de CRI-7 §2 dentro de 0,5 pp | ✅ |
| Las nueve predicciones publicadas por CRI-9 §12, dígito a dígito | ✅ |
| La frontera Expanded↔Medium por altura: 1117 / 1089 / 1065 / 1042 px | ✅ |
| 1024×768 deja de ser Expanded al 24,6% y pasa a `M1` al 81,7% | ✅ |
| Ninguna superficie de resultados es residente por debajo de ~1700 px | ✅ |
| T-INV-5 · la histéresis retrasa al estrechar y nunca al ensanchar | ✅ |
| D-01 · el `inset` reduce el rectángulo seguro sin robar altura | ✅ |
| CB-6 · en apaisado la hoja llega por el lado | ✅ |
| Barrido de 320→2560 px × 6 alturas: nada cae fuera del repliegue declarado | ✅ |

Esto es, literalmente, el gate barato que CRI-9 §17 (riesgo 6) pedía y que hoy
**ninguna prueba de `main` puede hacer**: afirmar qué composición está activa sin
construir la app ni abrir un navegador. F-01 vivió en `main` por esa ausencia.

Dos añadidos que CRI-9 no tenía, ambos declarados:

- `resolveWithHysteresis` — U-13 sigue siendo un unknown, así que el umbral es un
  **parámetro del experimento** (deslizador de 0 a 120 px en el panel), no una
  constante escrita a fuego.
- `safeRect` — el rectángulo seguro derivado de chrome medido (CB-5).

---

## Recorrido mínimo: ejecutado, no descrito

`npm --prefix prototypes/cri-11-harness run smoke` conduce el recorrido en
Chromium real y falla ante un solo error de consola. **26 comprobaciones, 0
fallos.** La evidencia queda en `reports/evidence/2026-08-15-cri-11-fase-a/`.
La evidencia histórica se conserva en Git; el subconjunto `artifact-*` puede
regenerarse localmente con `npm --prefix prototypes/cri-11-harness run
build:artifact` y `npm --prefix prototypes/cri-11-harness run
verify:artifact`, sin volver a añadirlo al índice.

```
Welcome → Continuar proyecto → Workspace → seleccionar M2 → cambiar sección
→ preview → aplicar → STALE → Resolver → calculating → current
→ evidencia Momento sobre el modelo → Datasheet → Localizar → peek → volver
```

Lo que ese recorrido demuestra, y una captura no puede:

- **`stale` es fail-closed de verdad.** Aplicar el cambio de sección no marca el
  resultado: lo destruye. La prueba comprueba que después no queda **ni un solo**
  elemento de diagrama en el DOM. Es imposible pintar evidencia caducada.
- **Localizar no cierra la tabla**: la degrada a `peek`, viva y con vuelta
  explícita (D-11). Hoy, en `main`, datasheet y Model Doctor se cierran.
- **La evidencia es una capa del lienzo, no una pestaña de Results** (D-03).
- **Cruzar X2 → M1 → K0 → X2 conserva selección, evidencia y estado** (T-INV-1).
  Un solo árbol de slots: no hay remontaje, así que no hay nada que restaurar.
- **El lienzo es tabulable**: `Enter` selecciona sin ratón, con anillo propio.
- **La causa de fiabilidad vive en un botón** (D-14), no en un `title`.
- **Esencial no amputa**: baja de 8 a 5 columnas conservando las 1 292 filas y
  todas sus rutas. Cambia el disclosure, no la capacidad.

---

## Ejes del harness

Todos en caliente, sin recargar y sin perder la tarea en curso:

| Eje | Valores | Nota |
|---|---|---|
| Escenario | `portal-basic` · `dense-selection` · `datasheet-2000` | 2 084 entidades el grande |
| Viewport | 10 presets 320×568 → 1920×1080, o ventana real | `ResizeObserver`, resize continuo real |
| Orientación | retrato · apaisado | cambia el lado por el que llega la hoja |
| Input | ratón · táctil · mixto | **nunca** cambia la composición (T-INV-7) |
| Tema | Día · Noche | `data-theme` sobre `:root`, como producción |
| Idioma | es-MX · en-US | diccionario completo, sin respaldos silenciosos |
| Modo | Esencial · Completa | disclosure, no capacidad |
| Motion | normal · reducido | además del `prefers-reduced-motion` real |
| Voz | A · B · C · **D** | D es la línea vigente que el encargo pide retirar, para verla al lado |
| Estado | `current` `stale` `limited` `unreliable` `failed` `offline` `recovery` | ver nota abajo |
| Histéresis | 0–120 px | U-13 |

**Nota sobre los siete estados.** Tres de ellos no son fases de análisis y se
dirigen a su dueño: `offline` es conectividad y `recovery` es persistencia.
Meterlos en la misma variable habría repetido el error de composición que CRI-9
diagnosticó. El selector es uno; el estado interno son tres.

---

## Qué es fixture y cómo se ve que lo es

**Todo**: el modelo, los resultados, los proyectos recientes y hasta la duración
del cálculo (1 400 ms declarados en `FIXTURE_SOLVE_MS`, para que `calculating`
sea un estado que se vive y se puede medir, no un parpadeo).

- Chip `FIXTURE` en TopBar, en el bloque de resultado del objeto, en la cabecera
  del datasheet y en el pie del shell.
- Cada valor numérico de resultado lleva `data-fixture="true"` en el DOM.
- `analysis.ts` y `fixtures.ts` abren con un recuadro que declara que no hay solver.
- La procedencia que se muestra junto al resultado dice literalmente
  «fixture determinista» y el sello del modelo que lo produjo.

Lo que **no** es simulado, porque copiarlo sería el error contrario: la
terminología, las unidades, los signos, la forma de los IDs y los contratos de
estado. `success ≠ reliable ≠ safe` se sostiene en el copy de las dos lenguas.

Las etiquetas de miembro (`Columna izquierda`) siguen en español en modo en-US **a
propósito**: son dato del modelo, no cadena de interfaz. Traducirlas sería inventar
un comportamiento que el producto real no tiene.

---

## Archivos tocados

| Archivo | Qué |
|---|---|
| `prototypes/cri-11-harness/**` | Todo el harness: 34 archivos nuevos (incluidos `package-lock.json` y config) |
| `prototypes/cri-11-harness/src/core/resolver.mjs` + `.d.ts` + `.test.mjs` | Resolutor puro, tipos y sus 18 pruebas |
| `prototypes/cri-11-harness/src/core/{environment,broker,surfaces,commands,analysis,fixtures,telemetry,i18n}.ts` | Núcleo |
| `prototypes/cri-11-harness/src/state/PrototypeStore.tsx` | Estado, con el ownership de CRI-9 §6 |
| `prototypes/cri-11-harness/src/app/*.tsx` + `prototype.css` | Nueve superficies y su vestimenta |
| `prototypes/cri-11-harness/src/harness/*` | El laboratorio |
| `prototypes/cri-11-harness/scripts/smoke.mjs` | Recorrido en Chromium con gate de consola |
| `reports/evidence/2026-08-15-cri-11-fase-a/**` | Evidencia histórica retirada del árbol; el subconjunto `artifact-*` es regenerable |

**Cero archivos de producción.** `git status` sólo muestra dos directorios nuevos
sin seguimiento; `git diff -- src/ package.json vite.config.ts index.html scripts/ docs/ brand/`
está vacío.

Los tokens y los componentes `sc-*` **se importan** de
`src/design-system/tokens.css` y `components/ui.css` en vez de copiarse: duplicar
la paleta habría creado el sistema visual paralelo que CRI-10 prohíbe, y así el
prototipo hereda cualquier corrección futura del Brandbook sin tocarlo.

---

## Cómo verificar

```bash
# 1 · el resolutor, sin navegador ni toolchain
node --test prototypes/cri-11-harness/src/core/resolver.test.mjs      # 18/18

# 2 · abrir el prototipo
npm --prefix prototypes/cri-11-harness install
npm --prefix prototypes/cri-11-harness run dev                        # http://localhost:5211

# 3 · el recorrido, ejecutado de verdad
npm --prefix prototypes/cri-11-harness run build
npm --prefix prototypes/cri-11-harness run smoke                      # 26 comprobaciones, 0 fallos

# 4 · producción intacta
git diff --stat origin/main -- src/ package.json brand/ docs/ scripts/   # vacío
node scripts/check-docs.mjs                                           # 27 documentos, OK
node scripts/check-protected-baseline.mjs                             # 38 archivos, frontera intacta
```

Los gates documental y de frontera protegida se ejecutaron y pasaron. `npm run
verify` completo no se corrió porque este entorno no tiene instaladas las
dependencias de la raíz y esta rama no toca nada de lo que ese gate observa.

---

## Qué falta para Fase B

Está declarado en código, no sólo aquí: `src/core/surfaces.ts` marca cada
superficie con su fase y su estado de capacidad, y el panel del laboratorio lo
muestra en pantalla.

**Superficies declaradas y no construidas:** `analysis-setup`, `transient`
(picker de precisión), `doctor`, `palette`, `recovery`, `preferences`.

**Lo que Fase B tiene que resolver de verdad:**

1. **Contrato de selección precisa de cinco fases** (D-06) sobre el fixture
   `dense-selection`, que ya existe y ya tiene siete elementos convergiendo en N3.
   Hoy el prototipo selecciona por tap directo; no hay lupa ni picker.
2. **Multiselección y edición estructural real** sobre el fixture. Hoy el ToolRail
   selecciona herramienta y lo anuncia, pero no crea geometría — está marcado `B`
   en cada botón para que nadie lo confunda con capacidad.
3. **Command Palette contextual** y la auditoría de colisiones de atajos.
4. **Model Doctor**: finding → localizar → entender → actuar, reusando el `peek`
   que ya funciona.
5. **Pan/zoom y encuadre**, y con ellos el uso completo del `safeRect`: hoy el
   modelo se encuadra una vez contra el chrome de reposo y no se re-encuadra al
   abrirse una superficie — que es lo correcto (la cámara no se mueve), pero deja
   sin ejercitar la mitad de CB-5.
6. **Medición sistemática**: la instrumentación existe (`measureInteraction`,
   observador de tareas largas, exportación a JSON) pero Fase A no publica una
   tabla de INP por flujo. `longtask` no existe en WebKit ni Firefox: la ausencia
   de datos ahí es un dato, no una cobertura.
7. **Matriz Playwright multi-navegador**. Hoy hay un recorrido en Chromium. Falta
   WebKit, Firefox, emulación táctil real y dispositivo físico.
8. **U-13**: el deslizador de histéresis está, pero nadie ha medido todavía
   cuántas recomposiciones por segundo produce un arrastre continuo entre 900 y
   1300 px.

**Fuera de alcance y así sigue:** Aula (no se rediseña), Space3D (experimental y
separado), el solver, el modelo, el esquema y la persistencia.

---

## Confirmación de alcance

- No se tocó `src/**`, ni `package.json`, ni `vite.config.ts`, ni `index.html`,
  ni `brand/**`, ni `docs/**`, ni los gates.
- No se copió el solver ni se implementó un segundo análisis.
- No se creó paleta, tipografía ni librería visual paralela.
- No se diseñó Aula vNext. Space3D no se tocó.
- No se hizo merge a `main` ni se publicó en Pages.
- Todo lo simulado está rotulado como fixture en pantalla y en el DOM.

## Pendiente / siguiente paso

Fase B, con el orden de arriba. Nada de Fase A queda a medias: el laboratorio
está completo respecto a su gate y el recorrido mínimo se ejecuta de extremo a
extremo con evidencia reproducible.
