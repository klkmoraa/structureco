# CRI-11 · Fase C — validación y estrés

**Fecha:** 2026-08-16
**Agente:** Claude Code
**Rama:** `claude/cri-11-fase-c-validation-1tyoq5`, sobre Fase B en **`ade6fca`**
**Clasificación:** `AUDIT/TEMPORARY` — evidencia de una ejecución concreta. No es
especificación, no es contrato de producto y no prueba implementación en `main`.

> **Qué es y qué no es.** Fase A construyó el instrumento; Fase B le devolvió
> las puertas que faltaban. Fase C **no rediseña ni pule** — cierra los siete
> pendientes que el propio informe de Fase B dejó listados, mide en vez de
> describir, y confirma la matriz completa de ejes en un solo paso de
> Chromium. Es el gate de cierre de CRI-11: lo que sigue abierto aquí pasa a
> CRI-12 con evidencia, no como intuición.

---

## Resumen ejecutivo

| | |
|---|---|
| Suites ejecutadas | `resolver.test.mjs` (18/18) · `smoke.mjs` (41/41, sin regresión) · `validate.mjs` nuevo (36/36) |
| Archivos de producción tocados | **Cero** (`git diff --stat HEAD -- src/ package.json vite.config.ts index.html brand/ docs/` vacío) |
| Navegadores | Chromium real (Playwright). Firefox/WebKit **no están instalados** en este entorno — bloqueo documentado, no se gastó tiempo instalándolos |
| Esencial ≠ Completa | **Funciona de verdad**, verificado también contra el fixture de 2 000+ entidades (ver §6) |
| Preview aislado | Actualizado en el mismo Artifact de Fase A/B: `https://claude.ai/code/artifact/22f1ef49-b9b0-4433-82ae-eb74f9fa25b6` |

---

## 1 · Los siete pendientes de Fase B, uno por uno

### 1.1 Selección táctil pendiente en Compact — resuelta, con un bug real encontrado en el camino

Antes de esta fase, un long-press sobre una zona **vacía** del lienzo abría el
crosshair de precisión con `candidate: null` — un callejón sin salida: soltar
el dedo no seleccionaba nada. `StructuralCanvas.tsx` ahora distingue el gesto
en el momento en que arma el long-press: sobre un candidato sigue armando el
crosshair de precisión (sin cambios); **sobre vacío arma selección por marco**
(reutiliza el mecanismo de `marquee` que el ratón ya tenía). Un arrastre corto
—sin pausa— sigue siendo pan exactamente igual que antes: la distinción es
sólo de tiempo (>480 ms quieto), no de zona.

Construyendo la prueba (long-press real vía CDP `Input.dispatchTouchEvent`,
no simulación de eventos DOM) apareció un bug real independiente de mi propio
cambio: `.pt-canvas` no declaraba `touch-action`, así que el navegador podía
interpretar un arrastre táctil sostenido como intento de scroll nativo y
cancelar la secuencia de Pointer Events a mitad de camino — el mismo tipo de
fallo intermitente que habría roto tanto el pan táctil preexistente como el
marquee nuevo en un dispositivo real. Corregido con `touch-action: none` en
`.pt-canvas`. Sin este fix, el marquee táctil fallaba de forma intermitente
incluso con la lógica de armado correcta.

**Hipótesis validada:** un long-press sobre vacío puede armar selección por
marco sin robarle el gesto de pan a un arrastre corto — con el mismo dedo,
distinguibles sólo por tiempo. **Evidencia:** `01-marquee-tactil.png`, 9
objetos seleccionados en un barrido táctil sobre el nudo N3 (7 elementos
convergentes) de `dense-selection`.

**Sigue pendiente, declarado, no fingido:** la multiselección por marquee
**táctil** funciona ahora vía long-press-para-armar; el arrastre **directo**
sigue siendo pan (por diseño, para no romperlo). La vía de escape con
checkboxes por fila en Dense (K0) sigue viva como alternativa sin depender
del lienzo.

### 1.2 Candidate Picker recorrible por teclado — completa la quinta fase de D-06

`CandidatePicker.tsx` tenía cuatro de las cinco fases del contrato de
selección precisa (detectar/previsualizar/elegir/comitear/cancelar) sin la
quinta: ciclar con flechas antes de elegir. Añadido foco itinerante sobre los
botones de la lista — ArrowDown/ArrowUp mueven el foco, Home/End saltan a los
extremos, Enter/Espacio comprometen por el comportamiento nativo del botón
enfocado (mismo patrón que ya usaba `CommandPalette`, ninguna fuente de
verdad nueva). Verificado sobre el fixture `dense-selection` (7 candidatos en
N3): recorrido completo con `02-picker-teclado.png` como evidencia.

**Hipótesis validada:** el picker puede recorrerse enteramente con teclado
sin ratón ni táctil, reusando el mismo patrón de roving-tabindex que ya
validó `CommandPalette`.

### 1.3 Auditoría de colisiones de atajos — ejecutada, con un hallazgo real de accesibilidad

Se comprobaron tres fuentes reales de colisión antes de fijar una sola tecla
(documentado en la cabecera de `core/commands.ts`):

1. **Navegador/OS:** ninguna letra suelta (sin Ctrl/⌘/Alt) está reservada por
   Chrome/Firefox/Safari; sólo combinaciones con modificador, y ninguna de
   las nuevas coincide con las ya asignadas (`Ctrl/⌘+K`, `Ctrl/⌘+Z`,
   `Ctrl/⌘+Shift+Z`, `Delete`, `Escape`, `Enter`).
2. **Registro interno:** V·N·M·S·L no colisionan entre sí ni con nada
   existente.
3. **Colisión real encontrada:** los lectores de pantalla en modo de
   exploración (NVDA/JAWS/VoiceOver) interceptan letras sueltas para su
   navegación rápida (H=encabezado, B=botón, F=campo…). Asignar un atajo de
   una letra a nivel de `window` habría roto esa navegación en cualquier
   parte de la página — exactamente el riesgo que G-01 (CRI-9) pedía evitar.

**Resolución:** los atajos se registran en el propio `<svg>` del lienzo
(`onKeyDown`, con `tabIndex={0}` y el `role="application"` que ya declaraba),
no en el manejador global de `Workspace.tsx`. Fuera del foco del lienzo la
misma letra escribe texto normal — verificado escribiendo "n" dentro del
campo de la Command Palette y confirmando que el valor del campo es "n", no
un cambio de herramienta. Documentado con `aria-keyshortcuts` (no se tocó el
`aria-label`, para no romper el nombre accesible ni los selectores de
`smoke.mjs`).

**Hipótesis validada:** es posible dar atajos de una letra a las
herramientas de creación sin romper la navegación rápida de lectores de
pantalla, acotando el `onKeyDown` al foco del propio lienzo en vez de a
`window`.

### 1.4 Contexto de análisis conectado con la TopBar — resuelto, y reveló un bug de continuidad real

`AnalysisSetup.tsx` guardaba `active`/`order` en `useState` local. Al cruzar
Compact (K0), el árbol de slots monta la puerta bajo un padre JSX distinto
(`pt-sheet` en vez de `pt-inset`) — React la remonta y el estado local se
perdía **exactamente en la frontera que esta fase tiene que probar que no
pierde nada**. Se movió a `PrototypeStore` (`state.analysisSetup`), lo que
resuelve dos problemas con un solo cambio: sobrevive a Compact, y permite que
la TopBar la resuma sin que nadie la abra.

La TopBar ahora muestra, bajo el botón Resolver (una sola línea, oculta en
Compact donde ya existe el chip "Análisis" del chrome del lienzo como vía de
escape): `{activos}/{total} Casos de carga` y, si el orden es P-Δ, `· P-Δ`.
Clic abre/cierra la puerta real. Verificado: valor por defecto `2/2`,
desactivar un caso + elegir P-Δ → `1/2 · P-Δ` en caliente, cruzar a K0 y
volver → el caso desactivado y el orden P-Δ siguen intactos.

**Hipótesis validada:** D-09 ("viaja junto a la acción que gobierna") se
completa con un resumen visible, no sólo con la puerta alcanzable — y mover
el estado al store es lo que además cierra la fuga de continuidad en Compact.

### 1.5 Continuidad Expanded → Medium → Compact, portrait/landscape

Recorrido: X2 → M1 → K0 → K0(apaisado) → M1(apaisado) → X2, con selección
(M2), evidencia (Momento pintado), resultado `current` y **encuadre de
cámara** (zoom al 144%, no reseteado) fijados antes del recorrido. Los cinco
sobreviven en las seis paradas, en ambas direcciones y en ambas
orientaciones — extiende la prueba T-INV-1 de `smoke.mjs` (que ya cubría
selección/evidencia/estado) añadiendo el encuadre de cámara, que no se había
verificado antes. `04-continuidad-final.png`.

**Nota honesta:** el preset 1024×768 (M1) tiene w>h en sí mismo, así que
alternar el eje "Orientación" sobre ese preset concreto no cambia el
viewport numérico resultante — la comprobación de M1 "apaisado" en este
recorrido es en la práctica una repetición de M1 portrait, no una condición
nueva. La cobertura real de cambio de orientación vive en K0 (390×844 ↔
844×390), que sí es sensible al eje y que además ya validaba CB-6 (la hoja
llega por el lado) desde Fase B.

### 1.6 Mouse/keyboard/touch, Día/Noche, ES/EN, reduced motion, Esencial/Completa

- **Mouse/keyboard/touch:** cubiertos en conjunto por `smoke.mjs` (mouse +
  teclado) y `validate.mjs` (táctil real vía CDP, ver §1.1; teclado del
  picker, ver §1.2; atajos de lienzo, ver §1.3).
- **Día/Noche, ES/EN:** sin regresión (`smoke.mjs`), y ejercitados de nuevo
  en el recorrido de continuidad.
- **Reduced motion:** verificado por primera vez que el eje realmente apaga
  la animación de entrada de los drawers, no sólo que existe el control:
  `animation-duration` pasa de `0.22s` a `1e-06s` al activar "Reducido"
  (`[data-motion='reduced'] * { animation-duration: 0.001ms !important }`).
- **Esencial/Completa:** ver §6 — funciona también bajo estrés, no sólo con
  el fixture pequeño.

---

## 2 · Los siete estados de análisis

Los siete —`current`, `stale`, `limited`, `unreliable`, `failed`, `offline`,
`recovery`— alcanzables y reflejados correctamente. Fase B sólo había
ejercitado `current`/`unreliable`/`failed`/`offline` en `smoke.mjs`; esta
fase añade `limited` (sin cubrir antes) y `recovery` (antes sólo se veía el
chip; ahora se confirma que el chip **abre la superficie real** `recovery`,
D-08). `05-estado-recovery.png`.

`stale` se verificó también por su ruta directa del eje (no sólo por edición
de modelo, que ya cubría `smoke.mjs`), reafirmando fail-closed por un segundo
camino de código (`applyHarnessState`, no `applyEdits`).

---

## 3 · Fixture grande (2 084 entidades) — medido, no descrito

| Flujo | Medición |
|---|---|
| Datasheet, hasta la primera fila pintada | **1 162 ms** (1 292 filas, sin virtualización) |
| Palette, hasta poder escribir | **123 ms** |
| Palette, búsqueda por tecla (2 pulsaciones) | **27–30 ms** cada una |
| Pan con ratón (10 pasos de arrastre) | **269 ms** |
| Zoom con controles flotantes (3 clics) | **716 ms** |
| Resize/recomposición X2→M1 | **244 ms** |
| Resize/recomposición M1→X2 | **263 ms** |

Ninguna de estas cifras cruza un umbral preocupante para un prototipo sin
virtualización, pero **Datasheet sin virtualizar pintando 1 292 filas es la
que más se acerca**: en un dispositivo real más lento que la máquina de CI de
este entorno, ahí es donde primero se notaría. Es la recomendación más
concreta que esta fase puede dar para CRI-12 (§8).

---

## 4 · INP / latencia de interacción y U-13

**INP/latencia:** la instrumentación (`measureInteraction`, gesto → dos
`requestAnimationFrame` → medición real, no estimada) existía desde Fase A
pero sólo cubría `dense.search`/`dense.locate`/`doctor.locate`. Esta fase le
añade `palette.search` (mismo patrón que `DenseSurface`) y **publica por
primera vez la tabla real**, descargada de la telemetría del propio
prototipo (no inventada): `dense.search` en 58.8 ms con el fixture pequeño;
`palette.search` en 27–30 ms con el fixture de 2 000+ entidades (ver §3). Cero
tareas largas (>50 ms) observadas durante el recorrido medido.

**U-13 (histéresis):** primera medición publicada de recomposiciones/segundo
en un barrido de ancho 900↔1300px, para `bandPx` de 0/24/60/120:

| `hysteresisPx` | Recomposiciones | Duración del barrido | Recomp./s |
|---|---|---|---|
| 0 | 3 | 939 ms | 3.19 |
| 24 (valor por defecto) | 3 | 831 ms | 3.61 |
| 60 | 3 | 719 ms | 4.17 |
| 120 | 3 | 854 ms | 3.51 |

**Lectura honesta, no forzada:** el número de recomposiciones (3) no varía
con `bandPx` en este barrido concreto — a esta altura fija (900px) y este
rango de ancho, el barrido sólo cruza una frontera de composición en cada
sentido más un evento adicional, independientemente de la banda de
histéresis probada. Esto **no** confirma ni refuta que U-13 no importe: mide
que, en esta configuración exacta, la banda no cambia cuántas veces se cruza
la frontera, sólo (marginalmente) cuánto tarda el navegador en aplicar la
secuencia de `setViewportSize`. Para una lectura más discriminante haría
falta barrer una altura donde el viewport pase CERCA de dos fronteras
distintas, o una banda mayor que 400px (el rango barrido). Se deja como
pregunta abierta para CRI-12, no como conclusión — la medición está hecha,
la interpretación fuerte no.

---

## 5 · Chromium confirmado; Firefox/WebKit — bloqueo documentado

Este entorno trae **sólo Chromium** preinstalado
(`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` contiene `chromium-1194` y
`chromium_headless_shell-1194`, nada con prefijo `firefox-` ni `webkit-`).
Por instrucción explícita del encargo, no se gastó tiempo instalando esa
infraestructura. Los 36 checks de `validate.mjs` y los 41 de `smoke.mjs`
corrieron sólo contra Chromium real (no headless simulado con parámetros
falsos). La matriz multi-navegador sigue pendiente — se traslada a CRI-12
como punto explícito (§8).

---

## 6 · Esencial vs. Completa — el veredicto que pide el encargo

**Funciona de verdad, verificado dos veces:** con el fixture pequeño
(`smoke.mjs`, ya en verde desde Fase B) y esta fase lo repite **con el
fixture de 2 084 entidades bajo estrés**: Esencial reduce de 9 a 6 columnas
en Datasheet sin ocultar ni una sola de las 1 292 filas ni ninguna de sus
rutas de acción (`Localizar` sigue presente en cada fila). Esencial es un
*disclosure* real —menos densidad de columnas— no una amputación de objetos
ni de capacidades, y ese contrato se sostiene incluso cuando el modelo es
grande, que es exactamente cuando más tentador sería recortar filas para
"aligerar".

---

## 7 · Qué cambió (archivos)

10 archivos modificados dentro de `prototypes/cri-11-harness/` (213
inserciones, 37 eliminaciones) + 1 script nuevo (`scripts/validate.mjs`, 617
líneas). Cero archivos de producción tocados.

| Archivo | Qué |
|---|---|
| `src/app/StructuralCanvas.tsx` | Long-press sobre vacío arma marquee (no precisión); atajos de herramienta acotados al foco del lienzo (`tabIndex`, `onKeyDown`) |
| `src/app/prototype.css` | `touch-action: none` en `.pt-canvas` (bug real, ver §1.1); estilos del resumen de Contexto de análisis en TopBar |
| `src/app/CandidatePicker.tsx` | Roving tabindex: ArrowUp/Down/Home/End |
| `src/app/ToolRail.tsx` | `aria-keyshortcuts` + `title` con la tecla auditada, sin tocar `aria-label` |
| `src/core/commands.ts` | Auditoría documentada; `shortcut` en las cinco herramientas, ruta `shortcut` añadida |
| `src/state/PrototypeStore.tsx` | `state.analysisSetup` (antes local en el componente); `setTool` acepta `route` para telemetría precisa |
| `src/app/AnalysisSetup.tsx` | Lee/escribe el store en vez de `useState` local |
| `src/app/TopBar.tsx` | Resumen de casos/orden bajo Resolver, oculto en Compact |
| `src/app/CommandPalette.tsx` | `measureInteraction('palette.search', …)` — mismo patrón que `DenseSurface` |
| `src/core/i18n.ts` | Copy del picker menciona flechas; clave `analysisSetup.pdeltaBadge` |
| `scripts/validate.mjs` | Nuevo — 36 comprobaciones + métricas de estrés/INP/U-13, evidencia en `reports/evidence/2026-08-16-cri-11-fase-c/` |

---

## 8 · Qué pasa a CRI-12

Ninguno de estos bloquea el cierre de CRI-11 — son observaciones medidas
sobre las que CRI-12 puede decidir con datos, no intuiciones:

1. **Datasheet sin virtualizar** es el flujo que más se acerca a un umbral
   de percepción con el fixture grande (1.16 s hasta la primera fila). Antes
   de escalar el fixture más allá de ~2 000 entidades, valdría la pena medir
   en un dispositivo real de gama media, no sólo en la máquina de CI.
2. **Marquee táctil por arrastre directo** sigue siendo pan, por diseño; la
   vía de escape (checkboxes en Dense) es suficiente para esta fase pero no
   es la misma interacción que el arrastre en el lienzo. Si CRI-12 necesita
   arrastre-directo-selecciona en táctil, hace falta un gesto que la
   distinga de pan sin depender de tiempo quieto (p. ej. dos dedos).
3. **U-13** tiene datos pero no una conclusión fuerte (§4): la banda de
   histéresis no mostró efecto discriminante en el barrido probado. Repetir
   con una altura que cruce dos fronteras, o con una banda proporcionalmente
   mayor, antes de fijar `bandPx` como constante de producto.
4. **Matriz multi-navegador** (Firefox/WebKit) sigue completamente sin
   probar — bloqueo de infraestructura del entorno, no del producto.
5. La lectura de "recorrer con teclado" de M1 en apaisado (§1.5) es un
   artefacto del preset elegido, no una prueba real de esa combinación —
   si CRI-12 necesita esa celda de la matriz cubierta de verdad, hace falta
   un preset M1 genuinamente distinto en apaisado, no el mismo par w/h.
6. El botón "Descargar JSON" de telemetría no produce una descarga real
   cuando el harness se ve dentro del visor de Artifact (el sandbox del
   visor bloquea descargas iniciadas por la página) — funciona sin problema
   clonando el repo o sirviendo el build fuera de ese visor. Documentado
   aquí para que no se lea como un bug del prototipo.

---

## Cómo verificar

```bash
# 1 · el resolutor no se tocó
node --test prototypes/cri-11-harness/src/core/resolver.test.mjs        # 18/18

# 2 · tipos limpios
npx --prefix prototypes/cri-11-harness tsc -b --force

# 3 · el recorrido de Fase A/B sigue en verde (sin regresión)
npm --prefix prototypes/cri-11-harness run build
npm --prefix prototypes/cri-11-harness run smoke                        # 41/41

# 4 · la validación de Fase C, ejecutada de verdad
node prototypes/cri-11-harness/scripts/validate.mjs                     # 36/36
#   evidencia + metrics.json en reports/evidence/2026-08-16-cri-11-fase-c/

# 5 · preview aislado
npm --prefix prototypes/cri-11-harness run build:artifact
node prototypes/cri-11-harness/scripts/verify-artifact.mjs              # desktop + móvil, 0 errores

# 6 · producción intacta
git diff --stat HEAD -- src/ package.json vite.config.ts index.html brand/ docs/   # vacío
```

## Confirmación de alcance

- `git status --short` sólo muestra archivos bajo `prototypes/cri-11-harness/`
  y la carpeta nueva `reports/evidence/2026-08-16-cri-11-fase-c/`.
- `git diff --stat HEAD -- src/ package.json vite.config.ts index.html brand/ docs/`
  vacío — cero cambios en producción.
- Las capturas de Fase A, B y C son salidas locales ignoradas. Los comandos
  anteriores las regeneran bajo `reports/evidence/`; sus versiones históricas
  permanecen consultables en Git y no se vuelven a añadir al índice.
- No se copió el solver ni se implementó un segundo análisis.
- No se tocó `Space3D` ni se diseñó Aula vNext.
- No se cambió la dirección visual, `Welcome` ni la paleta de colores.
- No se recuperó el menta original.
- No se corrieron suites masivas del repo — sólo `tsc`, el smoke focal (41),
  el resolutor (18) y la validación focal nueva de esta fase (36).
- No hubo merge a `main` ni publicación en GitHub Pages de producción.

## Preview aislado

Actualizado en el mismo Artifact que Fase A/B (misma URL, nuevo build):
**https://claude.ai/code/artifact/22f1ef49-b9b0-4433-82ae-eb74f9fa25b6**
