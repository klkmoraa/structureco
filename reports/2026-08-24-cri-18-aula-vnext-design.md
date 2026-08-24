# CRI-18 — Aula vNext anclada a resultados

## Alcance ejecutado

CRI-18 se resolvió como investigación y diseño de producto. No se implementó Aula vNext, no se reabrió CRI-39 y no se modificaron solver, matemáticas, signos, unidades, IDs, topología, `ProjectModel`, workers, persistencia, import/export, undo/redo ni resultados.

## Evidencia revisada

- Issue vigente CRI-18 y absorción explícita de CRI-39.
- Especificación canónica `docs/superpowers/specs/2026-08-22-structureco-total-visual-redesign.md`.
- Recorrido, progreso, sesión, ejercicios y niveles pedagógicos actuales bajo `src/education/**`, `src/store/ClassroomSessionContext.tsx` y `src/features/classroom/**`.
- `LearnView`, superficie densa, Results, procedencia, confiabilidad, `AnalysisResult.explanation` y `EducationTrace` actuales.
- Contrato de composición X2/M1/K0 y autoridad de broker/foco vigentes.

## Decisión

Aula vNext se define como una explicación **result-first** dentro de `dense/learn`, con tres profundidades: Lectura, Causa y Verificación. Consume el mismo `ProjectModel` y `AnalysisResult`; un ancla transitoria conserva fuente exacta, objeto, posición, escenario y foco sin persistir o copiar resultados.

Se descartaron como flujo principal la lección lineal obligatoria y la biblioteca de cursos. Las predicciones, quizzes y contenido editorial quedan optativos o diferidos. «¿Por qué gobierna?» sólo se responde con evidencia explícita de escenario de envolvente o chequeo de confiabilidad; en los demás casos se declara evidencia insuficiente.

## Entregables

- `docs/superpowers/specs/2026-08-24-aula-vnext-result-anchored-design.md`: brief, usuarios, journeys, wireframes X2/M1/K0, contrato de datos, arquitectura, copy, accesibilidad, estados, criterios y backlog A1–A10.
- `docs/superpowers/plans/2026-08-24-aula-vnext-result-explanation.md`: plan TDD ejecutable para A1–A8, con archivos, interfaces, comandos, resultados esperados y commits por task.
- `docs/README.md`: referencia descubrible y marcada como no implementada.

## Verificación

- `npm.cmd run verify:docs` — **PASS**: 2/2 pruebas y 12 documentos bajo `docs/**` clasificados, obligatorios presentes y enlaces relativos válidos.
- `npm.cmd run verify:protected` — **PASS**: frontera protegida intacta, 38 archivos verificados.
- `git diff --check` — **PASS**: sin errores de espacios ni parches inválidos.
- Escaneo de placeholders prohibidos del plan — **PASS**: sin `TBD`, `TODO`, rutas por completar ni instrucciones genéricas.

La implementación, los tests de componentes y el QA de navegador descritos en el plan permanecen pendientes de sus slices futuros; no se reportan como ejecutados en CRI-18.
