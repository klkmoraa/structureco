# CRI-12B · Registro de dirección UX

**Clasificación:** `AUDIT/TEMPORARY`

Cierra CRI-12B: la dirección UX funcional/no-visual de structureCo sobre `research/cri-12-direction`, HEAD verificado `05f250ec443af7c35e5890ccaceee8da4fa16993`. No decide identidad de color, Clay fino, ni tratamiento visual — eso sigue siendo `MUST_DECIDE_IN_12C` (ver cierre, abajo). No implementa producción: ningún archivo de `src/**`, `brand/**` ni `src/design-system/tokens.css` cambió en esta sesión.

## 1. Qué hereda sin reabrir

Todo lo que `01b-inherited-decisions.md` §A/§B marca como cerrado permanece cerrado: el registro D-01…D-15/G-01/G-02 de CRI-9 (arquitectura de shell adaptativo, contrato de selección de 5 fases, superficie `contextual-actions`, split de Inspector, descomposición de Results, Datasheet modal+`peek`, superficie `recovery`, unificación de edición D-12, Space3D congelado D-15) y el ledger LEDGER-01…09 de CRI-10 (radios, foco, tipografía, tema de 3 estados, target táctil, aviso legal vía `ⓘ`, clases legacy, grosor de icono). Ninguna de estas es una pregunta de 12B — son trabajo de ejecución pendiente en `src/**`, no elección.

## 2. Decisiones cerradas en esta sesión

Detalle fila por fila en `02-ux-decision-matrix.md`. Resumen narrativo:

**Esencial/Completa — descartado.** Sin sustento en código ni en preferencia persistente, y CRI-10 nunca la dio por aprobada. Se retira del roadmap de 12B/12C; no queda ningún trabajo de validación pendiente sobre esta hipótesis.

**Flujo de Welcome — estructura adoptada.** Se cierra la navegación de 4 pasos (Bienvenida→Cómo trabajas→Por dónde→Mesa, con salto directo a Mesa para quien regresa) propuesta en la 3ª pasada de CRI-10. Esto es exclusivamente estructura/navegación: el tratamiento visual del portal ("material clay" vía filtros SVG) sigue sin aprobar y es competencia de CRI-12C. Las transiciones entre pasos siguen sin animar ni implementar.

**Shell adaptativo (X2/M1/K0) — priorizado.** La arquitectura ya estaba `DECIDED` (D-01/D-04/D-05); lo que se decide ahora es secuenciar su implementación real (máquina de estados resolver-driven vía `matchMedia`, conectando los tokens de densidad por tier que ya existen en `tokens.css:556-560`) antes que otras piezas de 12B que dependen de tener las tres clases funcionando de verdad, en vez del booleano `toolRailCompact` actual.

**Marco de selección direccional (ABIERTA-3) — diferido.** No se incorpora al contrato D-06 todavía. El contrato de 5 fases sigue siendo la única superficie de selección vigente; esta adición queda pendiente de un test de discoverability que no se ha corrido.

**Riel sólo-icono en Medium (ABIERTA-1) — mantenido, provisional.** Sin la tarea cronometrada riel-etiquetado-vs-icono, se mantiene el M1 actual (icono sin etiqueta) documentando explícitamente que es una decisión sin evidencia de discoverability, no una que la tenga.

**Histéresis del resolver (ABIERTA-2/U-13) — fijada en `bandPx = 24`.** Es el valor por defecto que CRI-11 ya usaba en el harness y que, junto con 0/60/120, dio el mismo número de recomposiciones (3) en el barrido 900↔1300px a la altura probada. Se documenta explícitamente que esto es evidencia `PROTOTYPE_VALIDATED`, no de producción, y que la fase C de CRI-11 fue honesta al decir que no discrimina si el valor de banda importa a otras alturas o con una banda mayor a 400px — eso queda como pregunta abierta para si una medición futura lo contradice.

**Zócalo Compact apaisado (ABIERTA-4) y chrome de Cinta Compact (GAP-1) — piso conservador fijado.** Zócalo: 1 verbo primario (el más frecuente para el tipo de selección) + Borrar, siempre visibles, resto a `⋯`. Cinta: Estado/resolver y Doctor nunca se degradan (protege `success ≠ reliable ≠ safe` y stale fail-closed, D-14); persistencia, Datasheet y nombre de proyecto son los primeros candidatos a icono-only o truncado con elipsis. Este piso reutiliza el patrón de disclosure que CRI-10 ya mostró en su lámina 25 — **no** reactiva el concepto Esencial/Completa, que queda descartado (ver arriba). No sustituye la medición real pendiente sobre 7 tipos de selección × 2 idiomas.

**8 escenarios de discoverability — riesgo aceptado, se avanza sin ellos.** Ninguna decisión de discoverability de esta sesión (riel Medium, marco direccional si se retoma) tiene respaldo de tiempo/abandono real. Queda como seguimiento post-lanzamiento, no como bloqueante de 12B.

**`settings.show*` fuera del schema (ABIERTA-8/U-12) — evaluación de impacto programada en 12B.** No se decide todavía si se migra; se decide encargar la evaluación de riesgo/impacto que el propio CRI-9 marcó como la más alta de todo su schema.

**Brechas de paridad táctil D-07 (SEL-02, SEL-03, MOD-13, DAT-06, MOD-12) — secuenciadas en 12B.** Arquitectura ya cerrada (superficie `contextual-actions` + sub-modo de marco de selección + affordance de pegar); se decide implementarlas ahora, consistente con priorizar el shell adaptativo del que dependen.

**Verificaciones técnicas bloqueantes — gate paralelo, no bloqueante.** Contraste a nivel de píxel + lectores de pantalla reales (ABIERTA-6), rendimiento de Datasheet/paleta en dispositivo real (ABIERTA-7), disponibilidad de `navigator.clipboard.readText()` (U-11) y matriz multi-navegador completa (sólo Chromium probado) no bloquean cerrar esta dirección UX, pero sí bloquean declarar cerrada accesibilidad, rendimiento o compatibilidad — se ejecutan como pista paralela.

## 3. Invariantes protegidos — confirmados intactos

Ninguna decisión de esta sesión los toca:

- `success ≠ reliable ≠ safe` — reforzado por el piso de Cinta Compact (#7), que protege que Estado/resolver y Doctor nunca degraden.
- **Stale fail-closed** — sin cambios.
- **Canvas-first** — sin cambios; el shell adaptativo prioriza ejecución, no reabre presupuesto CB-1..6.
- **Mismo producto en Expanded/Medium/Compact** — el piso conservador del zócalo/Cinta (#7) es explícitamente eso: un piso, no una segunda aplicación. No revive Esencial/Completa.
- **No segundo solver** — sin cambios; ninguna decisión de 12B toca el motor de análisis.
- **2D/3D separados** — sin cambios; Space3D no se mencionó en ninguna de las 11 decisiones.
- **Space3D experimental (D-15 congelado)** — sin cambios.
- **Aula fuera de alcance** — sin cambios; no se mencionó en ninguna decisión.
- **`materialId`/`sectionId` explícitos, nunca inferidos por floats** — sin cambios; no aplica a ninguna de las 11 decisiones (son de navegación/shell/discoverability, no de identidad de datos).
- **No ocultar capacidades reales por "limpieza"** — el piso conservador del zócalo (#7) pliega a overflow, nunca retira una capacidad: mismo patrón que ya usaba el contrato D-07 (Copiar/Duplicar/Repetir con ruta contextual, nunca sólo atajo).

## 4. Qué sigue abierto — no se cierra aquí

Detalle completo en `02-rejected-and-deferred.md`. En síntesis: el marco de selección direccional (diferido), la migración de `settings.show*` (sólo se programó su evaluación, no la decisión de migrar), y todas las verificaciones técnicas y mediciones reales (riel Medium, 8 escenarios de discoverability, contraste+lectores de pantalla, rendimiento en dispositivo real, clipboard, multi-navegador, medición real del zócalo Compact sobre 7 tipos × 2 idiomas, sensibilidad de `bandPx` a otras alturas/bandas) siguen sin ejecutarse. Fijar un valor provisional en 5 de estas (#5, #6, #7) no es lo mismo que haberlas medido — queda explícito en cada fila de la matriz.

## 5. Frontera con CRI-12C — sin tocar

Lo que sigue siendo exclusivamente de CRI-12C, sin ninguna decisión de esta sesión que lo adelante:

- Lima vs menta/esmeralda histórica (tema 19 de `01-evidence-matrix.md`) — identidad de color de marca.
- Tratamiento visual del portal de Welcome ("material clay" vía filtros SVG) — la estructura de pasos se cerró en esta sesión (§2), el tratamiento visual no.
- Remedición de contraste del pórtico en Noche (LEDGER-05).
- Regla de la placa técnica ilustrativa "IPE-240 · A992" en Welcome, si se implementa el Welcome propuesto.

## 6. Confirmación de alcance de CRI-12B

- Único directorio creado o modificado: `reports/cri-12/**` (`02-ux-decision-matrix.md`, `02-ux-direction-record.md`, `02-rejected-and-deferred.md`, actualización de `HANDOFF.md`).
- Cero cambios en `src/**`, `brand/**`, `src/design-system/tokens.css`.
- No se ejecutó ningún gate (`verify:*`, `npm test`) ni suite de pruebas.
- No hubo prototipo nuevo, no hubo merge a `main`, no hubo publicación en GitHub Pages.
- Todas las 11 decisiones fueron tomadas por el propietario del producto en conversación directa, en bloques de 3–5 preguntas con opciones A/B/C(+recomendación), no inferidas ni decididas unilateralmente por el agente.
