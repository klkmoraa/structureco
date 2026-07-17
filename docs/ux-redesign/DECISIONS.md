# Registro de decisiones — Fase 1

## D-001 — Precedencia entre documentos

- Estado: aceptada para esta ejecución.
- Decisión: el Plan Maestro gobierna las compuertas. El PDF detallado de Fase 1 se usa como dirección visual y criterios de auditoría, no como autorización para implementar componentes de fases posteriores.
- Motivo: el Plan Maestro define la Fase 1 como auditoría, inventario y línea base, mientras que el documento detallado incorpora prompts de implementación. Ejecutarlos ahora saltaría la compuerta.
- Consecuencia: esta entrega no modifica la interfaz productiva.

## D-002 — Frontera inviolable del motor

- Estado: aceptada.
- Decisión: no cambiar algoritmos, ecuaciones, convenciones de signo, unidades, workers, contratos de análisis, resultados, importación/exportación ni persistencia.
- Motivo: el usuario autorizó exclusivamente cambios visuales.
- Control: toda propuesta posterior debe envolver o presentar la información existente sin recalcularla ni reinterpretarla silenciosamente.

## D-003 — Evidencia renderizada como fuente principal

- Estado: aceptada.
- Decisión: combinar inspección del código con recorridos reales de la aplicación y capturas reproducibles.
- Motivo: un test funcional aprobado no demuestra legibilidad, ausencia de colisiones o jerarquía visual adecuada.

## D-004 — Severidad de hallazgos

- Estado: aceptada.
- P0: incumple un criterio no negociable, bloquea o degrada seriamente una tarea en un dispositivo objetivo.
- P1: problema frecuente o estructural que debe resolverse antes de pulir detalles.
- P2: inconsistencia o fricción importante, pero no bloqueante.
- P3: acabado cosmético; no forma parte del backlog comprometido de esta fase.

## D-005 — Dirección cromática

- Estado: propuesta para aprobación.
- Decisión: conservar el verde como identidad de producto; separar semánticamente selección, éxito, cortante, cargas y estados. Reservar violeta como acento secundario de Aula, nunca como reemplazo de la marca.
- Motivo: hoy el verde cumple demasiados papeles y dificulta distinguir identidad, interacción y significado estructural.

## D-006 — Breakpoints dirigidos por contenido

- Estado: propuesta para aprobación.
- Decisión: en la siguiente fase, definir cambios de composición cuando los grupos de control dejan de caber, no sólo por categorías genéricas de dispositivo.
- Motivo: el iPad horizontal de 1194 px queda justo fuera del breakpoint actual de 1180 px y presenta colisiones severas.

## D-007 — Trazabilidad del repositorio

- Estado: observación.
- Decisión: esta fase se documenta mediante archivos y evidencia porque no existe metadata Git utilizable en la raíz auditada.
- Consecuencia: no se puede presentar un diff Git confiable; la verificación se apoya en el alcance de archivos generado y en la ausencia deliberada de ediciones bajo `src/`.

## D-008 - Aprobación formal de la Fase 1

- Fecha: 2026-07-17.
- Estado: aprobada por el propietario del producto mediante `structureCo_Fase_2_Instrucciones_para_Codex.pdf`.
- Decisión: la auditoría, baseline, inventario, recorridos, backlog, decisiones y capturas de Fase 1 son la referencia oficial previa al rediseño.
- Consecuencia: se autoriza la Fase 2 como primera fase con cambios productivos visuales, sujeta a sus gates.

## D-009 - Alcance protegido de la Fase 2

- Estado: aceptada.
- Incluye: tokens, tipografía, targets, App Shell, TopBar, overflow secundario, indicador global de análisis, CSS tocado y QA.
- Excluye: rediseño completo de herramientas, canvas, inspector, resultados, Aula, bienvenida e i18n; también cualquier cambio de solver, workers, dominio, schema, persistencia, importación, exportación o fixtures.
- Control: no se modifica `src/` hasta cerrar el Slice 2.0.

## D-010 - Fuentes y dependencias

- Estado: supuesto no bloqueante del Slice 2.0.
- Decisión: usar la pila local/sistema existente (`Inter`, `ui-sans-serif`, `Segoe UI`, `sans-serif`) sin descarga remota ni archivos de fuente nuevos.
- Decisión: implementar con React, CSS y Playwright ya instalados; no añadir dependencias.
- Motivo: el proyecto no contiene Manrope/Inter bundleados y el alcance puede resolverse con la plataforma actual.

## D-011 - Referencias visuales aprobadas

- Estado: aceptada.
- Decisión: las páginas 27-31 del PDF rector de Fase 2 son la especificación visual aprobada para TopBar, color, accesibilidad, desktop/tablet y móvil.
- Consecuencia: no se necesita generar un concepto alternativo; la implementación deberá mantener un ledger de fidelidad contra esas cinco referencias.

## D-012 - Ausencia de repositorio Git

- Estado: resuelta y ejecutada con autorización explícita del propietario.
- Evidencia: `git rev-parse --show-toplevel` falla; `structureCo/.git` no existe y `Structure/.git` es un directorio vacío.
- Decisión ejecutada: repositorio inicializado en `structureCo`, baseline registrado en `85f671d968426502d9d41425b86ca6abde1fd2bf` y rama `phase/2-ui-foundations` creada antes de editar `src/`.
- Consecuencia: la trazabilidad, el rollback y los commits por slice quedan disponibles.

## D-013 - Fundaciones visuales semánticas

- Estado: aceptada y ejecutada en Slice 2.1.
- Decisión: separar paleta primitiva, roles semánticos, roles técnicos, escalas de layout/control y aliases de migración en `src/styles/tokens.css`.
- Motivo: impedir que marca, selección, éxito, error y magnitudes estructurales compartan color por accidente.
- Control: no se añadieron fuentes remotas ni dependencias; la pila local/sistema permanece.

## D-014 - Estado global derivado

- Estado: aceptada y ejecutada en Slice 2.5.
- Decisión: mostrar seis estados visuales a partir de `analysis`, `isAnalyzing`, severidades existentes y una memoria transitoria por `project.id`.
- Motivo: comunicar disponibilidad y vigencia del resultado sin duplicar ni reinterpretar el cálculo.
- Control: el componente no llama al solver, no persiste estado y sólo dirige warning/error al tab Avisos existente.
