# CRI-11 · Fase B — el harness se vuelve prototipo usable

**Fecha:** 2026-08-16 03:00
**Agente:** Claude Code
**Rama:** `claude/cri-11-fase-a-prototype-ej1x53`, sobre Fase A en **`5bc94bc`**
**Clasificación:** `AUDIT/TEMPORARY` — evidencia de una ejecución concreta. No es
especificación, no es contrato de producto y no prueba implementación en `main`.

> **Qué es y qué no es.** Fase A construyó el instrumento: un laboratorio
> navegable con el recorrido mínimo funcionando. El propio encargo de Fase B lo
> dice sin rodeos — *"quedó demasiado recortada y visualmente NO está
> aprobada"*. Fase B no es limpieza ni pulido: es **devolver puertas y
> capacidades** que Fase A dejó fuera para llegar rápido al recorrido mínimo, y
> convertir el laboratorio en algo con lo que se puede juzgar de verdad si
> StructureCo funciona. Sigue sin ser producto. Ningún número que aparece en
> pantalla sale del solver.

---

## Qué cambió

15 archivos de Fase A se modificaron y 11 archivos nuevos se añadieron dentro
de `prototypes/cri-11-harness/` (2 995 líneas insertadas, 591 eliminadas). Cero
archivos de producción tocados — confirmado abajo.

**Núcleo nuevo (`src/core/`):**

- `model.ts` — el fixture base deja de mutarse directamente. Ahora es
  `Fixture` inmutable + un parche `ModelEdits`, combinados por `deriveModel()`
  puro. Todo lector (lienzo, detalle, datasheet, Model Doctor, análisis) lee el
  `EffectiveModel` derivado, nunca el fixture crudo.
- `hitTest.ts` — la selección deja de ser `onClick` por elemento del DOM y pasa
  a ser una función central de hit-testing sobre el modelo. Sin esto, el
  picker de candidatos (SEL-02) era imposible: el DOM no puede reportar "hay
  tres cosas aquí", sólo "clicaste esto".
- `doctor.ts` — Model Doctor como función pura y determinista sobre el modelo
  efectivo: nudo aislado, nudo sin apoyo, miembro de longitud cero, miembro
  esbelto, carga duplicada. Cada finding se llama explícitamente *revisión de
  modelado*, nunca dictamen de seguridad.
- `analysis.ts` — adaptado para leer `EffectiveModel` en vez de `Fixture` +
  overrides sueltos; se añaden reacciones de apoyo (`NodeReaction`) derivadas
  de los mismos cortantes ya fabricados, para que respondan de forma
  consistente a ediciones de sección o geometría.
- `commands.ts` — el `CommandId` pasa de un puñado de acciones a cubrir
  deshacer/rehacer, eliminar, localizar, las seis puertas nuevas, herramientas
  de creación y zoom. Es el registro que hace que Palette, atajo y botón
  visible invoquen literalmente la misma función.
- `i18n.ts` — más de 80 claves nuevas, es-MX/en-US, con paridad forzada por
  tipos (`Record<TranslationKey, string>`).

**Estado (`src/state/PrototypeStore.tsx`):** reescritura mayor. Selección pasa
de único objeto a array; se añaden `edits`/`history` (deshacer/rehacer real,
no snapshots de pantalla completa), `camera` (pan/zoom), `activeTool`,
filtros de selección y de Model Doctor.

**Superficies nuevas (`src/app/`):** `CandidatePicker`, `PrecisionCrosshair`,
`CommandPalette`, `ModelDoctor`, `Preferences`, `Output`, `Recovery`,
`AnalysisSetup` — ocho puertas que en Fase A existían sólo como fila en el
ledger de capacidad, sin componente.

**Reescrituras mayores:** `StructuralCanvas.tsx` (+850/-∼200 líneas — pan/zoom,
selección múltiple, marquee, picker de candidatos, herramientas de creación,
todo sobre Pointer Events unificado ratón/táctil/pluma), `DenseSurface.tsx`
(pestañas de entidad, columnas ordenables, pestaña Resumen con reacciones),
`DetailSurface.tsx` (estado mixto de bloque, apoyo editable, posición x/y),
`TopBar.tsx` (deshacer/rehacer, Model Doctor con badge de severidad, Palette).

---

## Capacidades recuperadas (verificadas contra `main` + CRI-8)

Antes de recuperar o añadir cualquier capacidad se revisó su existencia real
en `main` y en el inventario de tareas de CRI-8
(`reports/2026-08-15-0130-cri-8-mapa-maestro-ux.md`). Nada de lo siguiente es
invención: todo cita la tarea de CRI-8 que ya lo exige o el finding de CRI-9
que ya lo especificó.

| Puerta / capacidad | Estado en Fase A | Estado en Fase B | Cita |
|---|---|---|---|
| Deshacer / Rehacer | Ausente | Real, con historial de `ModelEdits` (no snapshots) | SHL-03/04 |
| Command Palette | Ausente | Real: busca comandos y navega por ID | SHL-05/06 |
| Model Doctor | Fila en el ledger, sin componente | Real: 5 tipos de hallazgo, localizar, reconocer | DOC-01..07 |
| Salida (exportar/imprimir) | Fila en el ledger, sin componente | Puerta alcanzable; acciones rotuladas explícitamente no-funcionales | SHL-22 |
| Preferencias | Sólo en el panel del laboratorio | Puerta real que despacha la misma acción (`axis/set`) que el panel | — |
| Recuperación / conflicto | Sólo chip visual | Puerta real (`recovery` surface) | D-08 |
| Contexto de análisis | Ausente | Puerta real, estado local (checkboxes de caso, P-Delta) | D-09 |
| Selección múltiple | Un solo objeto | Array; Shift+clic, marquee (ratón), acciones en bloque | SEL-04 |
| Selección precisa / candidatos | Tap directo, primer hit gana | `hitTest()` central + `CandidatePicker` cuando hay ambigüedad | SEL-02/03, D-06 |
| Creación de geometría | ToolRail marcaba herramienta, no creaba nada (rotulado "Fase B" en el propio botón) | Nodo/miembro/apoyo/carga se crean de verdad sobre el `EffectiveModel` | MOD-02/03/04 |
| Eliminar selección | Ausente | Tecla Delete + botón, con deshacer | MOD-09 |
| Pan / zoom | Encuadre fijo | Cámara real: arrastrar, rueda, pellizco táctil, controles flotantes, encuadrar todo | CNV-01/07/08 |
| Reacciones de apoyo | Ausentes | Tabla en Resumen (Dense), derivadas de los cortantes ya fabricados | RES-01/02 |

**Deliberadamente no recuperado, con razón declarada:** Aula (excluida por el
encargo, `NOT_IN_SCOPE`), Space3D (experimental, D-15), un segundo solver
(explícitamente prohibido).

---

## Flujos que ya son interactivos de extremo a extremo

Cada uno se ejecuta en el smoke test contra Chromium real, no se describe:

1. **Selección precisa con ambigüedad real.** El fixture `dense-selection`
   tiene elementos que se superponen; tocar esa zona abre el
   `CandidatePicker` (popover en X2/M1, hoja en K0) en vez de adivinar por
   orden de apilado del DOM.
2. **Crear geometría y verla en Datasheet.** ToolRail → herramienta Nodo →
   clic en el lienzo crea un nudo real en el `EffectiveModel`; aparece de
   inmediato en la tabla de nudos de Dense con su ID nuevo (`nextId('N')`).
3. **Deshacer / Rehacer** sobre cualquier edición (cambio de sección, creación,
   eliminación), con la misma pila para todas.
4. **Model Doctor: finding → localizar → entender → actuar.** Detecta el nudo
   recién creado como hallazgo (aislado, sin apoyo), Localizar sincroniza
   selección + evidencia y degrada el drawer a `peek` (D-11, nunca lo cierra),
   Reconocer deja constancia visible en la tarjeta.
5. **Command Palette.** `Ctrl/⌘+K`, busca "Resolver" y lo ejecuta por el mismo
   `commandId` que el botón de TopBar; escribir un ID de nudo/miembro navega y
   selecciona el objeto real (SHL-06).
6. **Eliminar selección** con Delete, deshacer inmediato disponible.
7. **Selección en bloque heterogénea** (nudo + miembro con Shift+clic) →
   Detail muestra estado `MIXED`, no la ficha de un solo objeto.
8. **Zoom flotante**: 100% → 144% → encuadrar todo → 100%, con pellizco táctil
   equivalente.
9. **Preferencias** despacha la misma acción que el panel del laboratorio —
   una sola fuente de verdad, no una copia con su propio estado.
10. Todo lo que Fase A ya tenía sigue vivo: `stale` fail-closed, evidencia como
    capa del lienzo (D-03), Esencial/Completa como disclosure sin amputar
    filas, Día/Noche, es-MX/en-US, motion reducido, tabulabilidad del lienzo.

---

## Qué sigue siendo fixture

- **El solver.** Cero cambios en `resolver.mjs`; sigue siendo el port fiel de
  CRI-9 con sus 18 pruebas en verde. Todo resultado numérico —incluidas las
  reacciones nuevas— es fabricación determinista rotulada `data-fixture="true"`.
- **Model Doctor** es una función pura sobre reglas locales (geometría,
  conectividad), no un análisis de ingeniería. El disclaimer en pantalla lo
  dice en las dos lenguas.
- **Salida (exportar/imprimir)** es la única puerta nueva que se deja
  explícitamente marcada como no-funcional: la acción real requeriría
  rasterizar el lienzo, fuera del alcance de CRI-11. La puerta es alcanzable
  (SHL-22 se cumple); el botón, no.
- **Recuperación** es representativa: no hay una segunda copia real detrás.
- **Contexto de análisis** (casos, P-Delta) es estado local de componente, no
  está conectado a ningún solver ni afecta el resultado fabricado.
- **La duración de "calculating"** sigue siendo `FIXTURE_SOLVE_MS` declarado,
  no un cálculo real.

---

## Problemas de UX encontrados

Encontrados durante la propia construcción y QA, no inventados para el
reporte — cada uno se verificó visualmente antes de decidir si era regresión
real o artefacto de captura:

1. **Compact (K0) se desborda con las puertas nuevas — regresión real,
   corregida.** Añadir Deshacer/Rehacer, Model Doctor y Palette al TopBar sin
   presupuesto adicional producía recorte duro del nombre del proyecto y,
   peor, del chip de estado (`Resultados vigentes`) fuera del viewport de
   390 px. Se corrigió en dos pasos: Deshacer/Rehacer se ocultan en Compact
   (siguen alcanzables por `Ctrl+Z`/`Ctrl+Shift+Z` y por Palette) y el orden
   del cluster de estado se invirtió a propósito — el chip de estado (D-14, la
   afirmación más crítica) va primero y siempre visible; Palette va al final
   porque su atajo de teclado sigue funcionando aunque el icono se salga por
   scroll horizontal declarado. Queda un recorte elegante del nombre del
   proyecto con elipsis — aceptado como degradación declarada, no como bug,
   por la instrucción explícita de no perseguir pulido pixel-perfect en esta
   fase.
2. **Multiselección por marquee es sólo de ratón/puntero en esta fase — brecha
   declarada, no corregida.** El rectángulo de selección arrastrado (`marquee`
   en `DragMode`) usa Pointer Events, pero un arrastre táctil sobre el lienzo
   hoy se interpreta como pan, no como marquee, porque ambos gestos comparten
   el mismo dedo y distinguirlos con fiabilidad (long-press para armar
   marquee vs. arrastre directo para paneo) no se resolvió en Fase B. La vía
   de escape ya existe y es real: en K0/táctil, Dense expone checkboxes por
   fila que dan selección múltiple sin depender del lienzo. Se documenta aquí
   como pendiente explícito, no como algo silenciosamente omitido.
3. **El picker de candidatos no tiene aún atajo de teclado para ciclar.** Con
   ratón y con long-press táctil se abre y se elige por clic; recorrer
   candidatos con flechas (quinta fase del contrato D-06, "cycle") quedó fuera
   — hoy cada apertura muestra la lista completa y se elige directamente, sin
   ciclar uno a uno.
4. **Contexto de análisis no se conecta visualmente con la corrida que
   gobierna (D-09 parcial).** La puerta existe y viaja junto al botón
   Resolver, pero no hay indicio en TopBar de qué casos están activos sin
   abrirla — es una fila más del ledger que pide iteración, no un fallo de
   esta fase.

---

## Ejes y ledger de capacidad — actualización

`surfaces.ts` se actualizó para reflejar la fase real de cada puerta:
`analysis-setup`, `transient`, `doctor`, `palette`, `preferences`, `recovery`
pasan de "declaradas, sin componente" a construidas en fase `B`. `output`
cambia su `capability` de `VERIFIED_EXISTING` a `PROPOSED_INTERACTION` porque,
a diferencia de las demás, su acción sigue siendo un stub — la nota bilingüe en
el propio archivo lo explica.

---

## Recorrido ejecutado (smoke test)

`npm --prefix prototypes/cri-11-harness run smoke` — **41 comprobaciones, 0
fallos**, evidencia en `reports/evidence/2026-08-15-cri-11-fase-b/` (18
capturas + `smoke-report.md`). Cubre, además de todo lo de Fase A:

```
… → Deshacer/Rehacer sobre cambio de sección → Palette ejecuta "Resolver"
→ Palette navega por ID → herramienta Nodo crea nudo real → Datasheet lo
muestra → Model Doctor lo detecta → Localizar sincroniza y degrada a peek
→ volver → Reconocer → Delete elimina selección → Shift+clic bloque mixto
→ zoom flotante 100→144→encuadrar→100 → Preferencias despacha axis/set
→ Salida se rotula no-funcional
```

Dos artefactos de captura (drenaje del `pt-drawer` en animación de entrada)
se identificaron y descartaron como falsos positivos tras inspección visual
cuidadosa — no eran bugs de layout, sino el timing de `pt-enter`
(`--sc-motion-standard`) capturado a mitad de fundido; se corrigió el script
de prueba, no el producto.

---

## Cómo verificar

```bash
# 1 · el resolutor no se tocó
node --test prototypes/cri-11-harness/src/core/resolver.test.mjs      # 18/18

# 2 · tipos limpios
npx --prefix prototypes/cri-11-harness tsc --noEmit -p prototypes/cri-11-harness/tsconfig.json

# 3 · el recorrido, ejecutado de verdad
npm --prefix prototypes/cri-11-harness run build
npm --prefix prototypes/cri-11-harness run smoke                      # 41 comprobaciones, 0 fallos

# 4 · bundle de un solo archivo para el preview aislado
npm --prefix prototypes/cri-11-harness run build:artifact
node prototypes/cri-11-harness/scripts/verify-artifact.mjs            # desktop + móvil, 0 errores de consola

# 5 · producción intacta
git diff --stat HEAD -- src/ package.json vite.config.ts index.html brand/ docs/   # vacío
```

---

## Confirmación de alcance

- `git status --short` sólo muestra archivos bajo `prototypes/cri-11-harness/`
  y la carpeta nueva `reports/evidence/2026-08-15-cri-11-fase-b/`.
- `git diff --stat HEAD -- src/ package.json brand/ docs/` está vacío.
- Las capturas de `reports/evidence/2026-08-15-cri-11-fase-a/` que un script
  antiguo regeneró por accidente (antes de retargetear `smoke.mjs` a su
  carpeta de Fase B) se revirtieron a su estado commiteado — Fase A no se
  rehizo, ni siquiera en sus píxeles de evidencia.
- No se copió el solver ni se implementó un segundo análisis.
- No se tocó `Space3D` fuera de su condición experimental declarada, ni se
  diseñó Aula vNext.
- No se corrieron suites masivas — sólo build, `tsc --noEmit`, el smoke focal
  de 41 comprobaciones y las 18 pruebas del resolutor.
- No hubo merge a `main` ni publicación en GitHub Pages de producción; el
  único preview es el artefacto aislado.

## Qué falta para la siguiente fase

1. **Marquee táctil real** — distinguir pan de selección-por-rectángulo con el
   mismo dedo (problema #2 arriba). Candidato: long-press para armar, igual
   que ya arma el crosshair de precisión.
2. **Ciclar candidatos por teclado** — completar la quinta fase del contrato
   D-06 (hoy sólo detectar/previsualizar/elegir/comitear/cancelar; falta
   ciclar con flechas antes de elegir).
3. **Auditoría de colisiones de atajos** (G-01 de CRI-9, referida en
   `commands.ts` pero no ejecutada) antes de asignar teclas de un solo
   carácter a herramientas de creación.
4. **Matriz Playwright multi-navegador** — sigue pendiente de Fase A, sigue
   sin resolverse aquí: un solo recorrido en Chromium.
5. **Medición sistemática de INP por flujo** — la instrumentación existe desde
   Fase A; ninguna fase ha publicado todavía la tabla.
6. **U-13** — el deslizador de histéresis sigue sin una medición de cuántas
   recomposiciones por segundo produce un arrastre continuo entre 900 y
   1300 px.
7. **Conectar Contexto de análisis con TopBar** (problema #4 arriba) para que
   D-09 se cumpla también quien no abre la puerta.

Nada de Fase B queda a medias respecto a su propio objetivo: el laboratorio
dejó de estar recortado, cada puerta que Fase A dejaba en el ledger sin
componente ahora tiene uno real o un stub explícitamente rotulado, y el
recorrido principal completo (Welcome → Workspace → selección/edición →
Resolver → Results → localizar → Datasheet → volver) se ejecuta de extremo a
extremo con Deshacer, Model Doctor, Palette y selección precisa integrados,
no al lado.
