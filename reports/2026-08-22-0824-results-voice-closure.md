# Cierre de voz y consistencia en Resultados

**Fecha:** 2026-08-22 08:24
**Agente:** Codex
**Rama:** codex/clay-workspace-phase-2

## Qué cambió
Se reemplazaron términos de implementación que llegaban a la interfaz por nombres orientados a la tarea. «Datos densos» ahora se presenta como «Resultados avanzados», y su navegación se identifica como «Secciones de resultados». También se reescribieron las ayudas del resumen global y de la comparación de escenarios para explicar con claridad qué puede hacer la persona y por qué las curvas se muestran separadas.

La misma revisión se aplicó al catálogo en inglés. Los nombres accesibles del diálogo, las pestañas, el estado de carga y el botón de cierre quedaron alineados con la nueva voz.

## Por qué
La terminología anterior describía la arquitectura interna y no el objetivo de la persona. Además, mezclaba anglicismos como «small multiples» dentro de la experiencia en español. La nueva redacción es más directa, humana y consistente sin alterar cálculos, comandos, IDs ni comportamiento.

## Archivos tocados
- `src/i18n/catalogs.ts` — nombres y ayudas de Resultados reescritos en español e inglés.
- `src/features/results/DenseResultsSurface.test.tsx` — contratos accesibles actualizados para la nueva voz.

## Cómo verificar
- `npm.cmd test -- src/features/results/DenseResultsSurface.test.tsx src/features/results/ResultsPanel.test.tsx src/i18n/catalogs.test.ts`
- `npm.cmd run typecheck`
- `npm.cmd run verify:protected`

## Pendiente / siguiente paso
Este cierre no deja trabajo funcional pendiente en la fase. Cualquier ajuste posterior puede tratarse como corrección visual puntual durante la revisión del usuario. No se tocó motor, solver, persistencia, formatos ni canvas estructural.
