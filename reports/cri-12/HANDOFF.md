# CRI-12A · Handoff a CRI-12B/12C

**Clasificación:** `AUDIT/TEMPORARY`

Este documento cierra CRI-12A: congela el baseline, no decide UX ni visuales. Lista las preguntas que sí requieren elección humana, con contexto suficiente para decidir sin releer todo lo anterior.

## Nota sobre el corte 12B/12C asumido en este documento

Ningún reporte consultado define explícitamente qué separa 12B de 12C. Dado el encargo de CRI-12A ("no decidas menta/lima, no prototipo, no diseñes"), se asume operativamente:

- **12B** = decisiones de arquitectura funcional/UX no visuales: navegación, ubicación de funciones, gobierno de discoverability, validación de hipótesis de producto (Esencial/Completa), verificaciones técnicas pendientes (rendimiento, accesibilidad, multi-navegador).
- **12C** = decisiones de ejecución visual/material dentro del Brandbook vigente: tratamiento del portal de Welcome, remedición de contraste, aplicación concreta de Clay.

Si esta distinción no es la prevista por quien secuenció CRI-12, reclasificar los ítems de abajo en consecuencia — la separación VERIFIED/DECIDED/UNKNOWN de `01-evidence-matrix.md` no depende de este corte y sigue siendo válida.

## Preguntas para CRI-12B (funcional / no visual)

1. **Esencial/Completa**: ¿se valida la hipótesis (con estudio real, conectada a preferencia persistente) y se implementa, o se descarta por falta de sustento? Hoy no existe en `src/**`; CRI-10 mismo la marca como hipótesis no aprobada.
2. **Flujo de Welcome**: ¿se adopta el flujo de hoja tipo iOS (Bienvenida→Cómo trabajas→Por dónde→Mesa, con salto directo a la Mesa para usuarios que regresan) propuesto por CRI-10, se itera, o se descarta? Las transiciones están descritas, no animadas ni implementadas; nada de esto está aprobado.
3. **Implementación del adaptive shell**: la arquitectura X2/M1/K0 (CB-1..6, D-01/D-04/D-05) ya está decidida y cerrada; producción hoy sólo tiene un booleano de riel compacto. ¿Se prioriza su implementación en 12B, o queda para después de otras decisiones?
4. **Riel sólo-icono en Medium (ABIERTA-1)**: ¿perjudica discoverability? Requiere tarea cronometrada, riel etiquetado vs icono, antes de dar por bueno el M1 actual.
5. **Marco de selección direccional (ABIERTA-3)**: adición propuesta, no decidida. ¿Se incorpora al contrato D-06, se descarta?
6. **Presupuesto de verbos en zócalo Compact apaisado (ABIERTA-4)** y **presupuesto de 6 controles con contenido real (GAP-1)**: pendientes de medir sobre 7 tipos de selección × 2 idiomas antes de fijar el diseño del zócalo Compact.
7. **8 escenarios de discoverability**: diseñados, no ejecutados. Sin esto no hay dato de abandono/tiempo que respalde ninguna decisión de descubribilidad.
8. **Umbral de histéresis del resolver (ABIERTA-2/U-13)**: CRI-11 midió 3 recomposiciones estables en el rango probado, pero su propio reporte dice que la medición no discrimina si el bandPx importa. ¿Se necesita otra medición, o se fija un valor y se avanza?
9. **Costo de sacar `settings.show*` del schema (ABIERTA-8/U-12)**: marcado como el mayor riesgo adyacente a schema de todo CRI-9. Necesita evaluación de impacto antes de decidir si se migra.
10. **Verificaciones técnicas pendientes, sin decisión de producto pero bloqueantes para cerrar sus temas**: contraste medido a nivel de píxel + lectores de pantalla reales (ABIERTA-6); rendimiento de Datasheet/paleta con ~2000 entidades en dispositivo real, no sólo en el harness aislado (ABIERTA-7); disponibilidad de `navigator.clipboard.readText()` en la matriz real de navegadores (U-11); matriz multi-navegador completa (sólo Chromium se probó en CRI-11).
11. **Brechas de implementación de D-07 (paridad táctil)**: `SEL-02`, `SEL-03`, `MOD-13`, `DAT-06`, `MOD-12` tienen arquitectura de cierre decidida (superficie `contextual-actions` + submodo de marco de selección + affordance de pegar) pero cero implementación. ¿Se secuencian en 12B?

## Preguntas para CRI-12C (visual / material, dentro del Brandbook vigente)

12. **Tratamiento visual del portal de Welcome**: el "material clay" vía filtros SVG (grano feTurbulence, caída por cara, oclusión ambiental, luz de borde) propuesto en la 3ª pasada de CRI-10 — explícitamente rechaza un motor 3D real. ¿Se aprueba esta dirección visual, se ajusta, o se descarta?
13. **Remedición de contraste del pórtico en modo Noche (LEDGER-05)**: documentado pero no cambiado sin remedir — ejecutar la medición y decidir si requiere ajuste.
14. **Placa técnica ilustrativa "IPE-240 · A992" en Welcome**: CRI-10 ya fija la regla — si en implementación pasa a leer datos reales, tiene que leerlos de verdad o no mostrarse. No es una decisión nueva, es una restricción a respetar si se implementa el Welcome propuesto.

## Corrección de gobierno de datos recomendada (no es una decisión de producto)

`reports/evidence/2026-08-15-cri-10-ux-system/competitive-research.md` se investigó como si fuera únicamente REFERENCE de materialidad, pero su contenido real hace afirmaciones funcionales y de navegación explícitas (arquitectura de menú contextual dirigida por selección, tamaño de objetivo táctil, un único estado de selección compartido entre canvas/Inspector/Datasheet/Results/Model Doctor, criterios de disclosure progresivo). Esto excede el marco que el encargo fija para las referencias visuales ("no prueban ni deciden navegación, acomodo de botones, funciones, claims"). Las decisiones D-03/D-06/D-07/D-09/D-11/D-12 de CRI-9 citan esta matriz como insumo pero afirman explícitamente que *"ninguna decisión de este informe depende de un matiz literal de esas fuentes"* — así que las decisiones en sí quedan grounded en el presupuesto de canvas y el razonamiento propio de CRI-9, no en mimetismo de competidores. Recomendación para quien retome CRI-12B/C: tratar `competitive-research.md` como REFERENCE estricto de aquí en adelante y no usar sus recomendaciones funcionales como si fueran validación independiente.

## Corrección técnica de bajo riesgo (no es una decisión de diseño)

`.canvas-layer-switch` está declarado de forma inconsistente entre `src/styles.css:2161` y `:3677`. CRI-10 lo señaló como el único cambio de `src/**` que recomienda, deliberadamente sin ejecutar. Es candidato de arreglo mecánico, no de UX — puede resolverse en 12B sin abrir ninguna pregunta de producto.

## Invariantes protegidos (recordatorio, detalle en `01b-inherited-decisions.md` §E)

`success ≠ reliable ≠ safe` · stale fail-closed · canvas-first · 2D/3D separados · Space3D experimental (D-15 congelado) · Aula fuera de alcance · mismo analysis, no segundo solver · `materialId`/`sectionId` explícitos, nunca inferidos por floats · colores técnicos por significado · Brandbook vigente como autoridad visual (paleta lima única, cerrada — no reabrir menta/lima ni ningún verde).

## Confirmación de alcance de CRI-12A

- Único directorio creado o modificado: `reports/cri-12/**` (`00-input-manifest.md`, `01-evidence-matrix.md`, `01b-inherited-decisions.md`, `HANDOFF.md`).
- Cero cambios en `src/**`, `brand/**`, `src/design-system/tokens.css`.
- No se ejecutó ninguna suite de pruebas masiva; las pruebas citadas se verificaron por lectura de código, no por corrida.
- No hubo merge a `main`, no hubo publicación en GitHub Pages.
- No se decidió menta/lima ni ningún otro color — el cierre cromático ya está resuelto y protegido (§D de `01b-inherited-decisions.md`).
- No se prototipó ni se diseñó nada nuevo — todo lo citado como `PROTOTYPE_VALIDATED` proviene de `d2a4dbfa20c08f1e22206619ee4291794555546a`, ya congelado, no ampliado aquí.
