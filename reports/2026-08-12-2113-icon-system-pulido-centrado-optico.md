# Icon System v3 — pulido de construcción y centrado óptico verificado

**Fecha:** 2026-08-12 21:13 UTC
**Agente:** Claude Code
**Rama:** claude/structureco-icon-system-6th5bd

## Qué cambió

Tercera iteración del Icon System Board (`brand/icon-system-board.html`), sobre dd91c1b. El pulido no se hizo a ojo: se midió la caja de trazo real de los 51 glyphs en Chromium con `getBBox({stroke:true})` y se corrigió contra esa medición.

**1. Centrado óptico.** 20 de 51 glyphs estaban descentrados más de 0.35 u respecto de (12,12), con desviaciones de hasta 2.45 u (`aulaDefinir`) — a 16px eso son 1.6px de deriva, visible cuando los iconos se alinean en una fila del tool rail. Ahora los 51 caen dentro de ±0.25 u.

**2. Extensión normalizada.** El tamaño óptico iba de 10.20 u (`node`) a 17.60 u (`units`) — una diferencia del 72% que hacía que unos iconos se vieran grandes y otros pequeños al mismo tamaño nominal. Ahora la banda es 12.00–15.80 u, mediana 14.20.

**3. Construcción compartida por familia.** Los cinco apoyos comparten media base de triángulo (5.1), línea de suelo (4.9→19.1) y ritmo de trama (3 marcas · 2.4 de caída; 5 densas en Fixed). Las cargas comparten línea de miembro y cabeza de flecha. `momentM` y `deformed` recorren ahora exactamente el mismo tramo vertical (8.5–15.5) con curvatura opuesta: antes discrepaban 1.9 u entre sí siendo un par.

**4. Glyphs rediseñados por defecto real, no por gusto:**
- `loadFrame` — las dos flechas convergían en el mismo punto y a 16px se emborronaban en una mancha. Cuatro intentos documentados; la versión final las separa sobre un miembro común (vertical sólida = global, girada punteada = local).
- `internalForces` — las cabezas de flecha tapaban el plano de sección; ahora arrancan del muñón y dejan ver la línea punteada.
- `criticalPoint` — 8 rayos saturaban a tamaño pequeño; sustituidos por una zona de influencia punteada.
- `repeat` — lazo de dos cabezas simétrico por rotación de 180° (centra solo, y ya no se confunde con undo/redo ni con `mz`).
- `pan` — los chevrons de 1.6 u de brazo se rellenaban con stroke 1.4 y leían como triángulos sólidos; brazos a 2.1 u.
- `solve` — un triángulo pelado se confundía con `supportGeneral` a 16px; ahora lleva vértices perforados (firma de Member) y lee como "el modelo".
- `supportGeneral` vs `supportPin` — eran casi idénticos; se separan por el ápice (punto sólido = nodo restringido / anillo abierto = bisagra), la misma distinción lleno-hueco que ya usan Node y Member.
- `del` — la × dominaba sobre el miembro; rebalanceado.
- `units` — ya venía corregido de v2 (escalímetro cerrado).
- `distributedLoad` — corrección óptica: tres cabezas juntas pesaban más que la única de `pointLoad`, así que se estrecharon de 4.0 a 3.2 u.

**5. Board.** Sección "Óptico" con el resultado de la verificación; SPECS y principios actualizados a los valores medidos reales.

## Por qué

El usuario pidió pulir más. El descentrado y la dispersión de tamaño no eran percepciones subjetivas sino defectos medibles, y son exactamente lo que hace que un set de iconos se sienta "de librería" en vez de "de sistema".

## Archivos tocados

- `brand/icon-system-board.html` — modificado. Geometría de los 51 glyphs, 9 rediseños, sección de verificación óptica, SPECS y principios. ~211KB.
- `reports/2026-08-12-2113-icon-system-pulido-centrado-optico.md` — este reporte.

## Cómo verificar

Abrir `brand/icon-system-board.html` en un navegador (autocontenido, sin build). La sección "Óptico" declara los números medidos. Verificado con Playwright + Chromium: sin errores de consola, sin overflow horizontal a 1400px ni a 420px, 51 iconos / 8 tiras de variantes / 14 tarjetas de exploración presentes, en light y dark.

El script de medición usado no queda en el repo (vivió en el scratchpad de la sesión). Para reproducirlo: renderizar cada glyph dentro de un `<svg viewBox="0 0 24 24">` con `stroke-width="1.4"` y leer `getBBox({stroke:true})` del grupo; el centro debe caer en (12,12) ±0.25 y la extensión máxima entre 12.0 y 15.8.

## Pendiente / siguiente paso

- Sigue abierto: elegir definitivamente entre las 3 alternativas por icono en "Exploración ampliada" y portar los glyphs a `src/design-system/icons/structural.tsx`, bajando su stroke de 1.8 a 1.4 y exponiendo el peso `dense` (1.75) para 16px y dock móvil.
- Al portar, conviene llevarse también el script de medición como test: un `icons.test.ts` que falle si un glyph nuevo entra descentrado o fuera de la banda de tamaño. Hoy esa garantía es manual.
