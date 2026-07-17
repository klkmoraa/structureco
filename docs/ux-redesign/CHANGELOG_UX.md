# Changelog UX/UI

## 2026-07-17 - Fase 2, Slice 2.0

### Aprobado

- Fase 1 aprobada formalmente por el documento rector de Fase 2.
- Fase 2 autorizada dentro de tokens, tipografía, targets, App Shell, TopBar, indicador de análisis y QA.

### Añadido

- Plan de Fase 2 con pregunta bloqueante, supuestos, mapa de archivos y gates por slice.
- Fidelity ledger inicial contra las cinco referencias aprobadas del PDF.
- Baseline técnico reproducible del Slice 2.0.
- Siete capturas P0 deterministas y métricas geométricas de TopBar.

### Validado

- `npm.cmd run verify`: 40 archivos, 229 pruebas y build aprobados.
- `npm.cmd run qa`: Chromium aprobado, sin errores de consola/página.
- `npm.cmd run qa:webkit`: iPhone 13 e iPad Pro 11 emulados aprobados.
- Interacciones: abrir Pórtico de ejemplo y ejecutar Analizar.

### Bloqueo

- No existe repositorio Git válido; no es posible crear rama/worktree hasta que el propietario autorice inicialización o acepte trazabilidad alternativa.

### No cambiado

- Ningún archivo bajo `src/`.
- Motor, workers, datos, schema, persistencia, importación/exportación, pruebas y fixtures.

## 2026-07-17 — Fase 1

### Añadido

- Línea base técnica y visual reproducible.
- Auditoría UX/UI con hallazgos P0–P2 y criterios de aceptación.
- Inventario de superficies, herramientas, inspector, resultados y estados.
- Recorridos para estudiante inicial/avanzado, profesor y profesional.
- Backlog priorizado.
- Decisión explícita conservar/transformar/retirar.
- Matriz de QA, registro de decisiones, estado de fase y handoff.
- Doce capturas de evidencia en desktop, laptop, tableta, móvil, claro/oscuro, Completo/Aula y error/importación.

### Validado

- `npm.cmd run verify`: 40 archivos, 229 pruebas y build aprobados.
- `npm.cmd run qa`: aprobado en Chromium.
- `npm.cmd run qa:webkit`: aprobado en iPhone 13 e iPad Pro 11 emulados.
- Consola limpia durante el recorrido manual.

### No cambiado

- Código productivo bajo `src/`.
- Motor matemático, workers, fórmulas, unidades, precisión y convenciones.
- Pruebas y fixtures.
- Contratos de persistencia, importación o exportación.

### Artefactos generados/refrescados

- `docs/ux-redesign/`.
- Capturas dentro de `docs/ux-redesign/evidence/baseline/`.
- Salidas existentes de `qa-artifacts/` y `dist/` fueron regeneradas por los comandos de validación; no son cambios de lógica.
