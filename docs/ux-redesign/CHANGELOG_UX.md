# Changelog UX/UI

## 2026-07-17 - Fase 2, Slice 2.3

### Cambiado

- Breakpoint funcional tablet ampliado a 1023 px en shell, dock, resultados e inspector.
- Rango 1024-1279 usa rail compacto de 76 px e inspector de 290 px.
- Utilidades secundarias pasan al overflow antes de comprimir el canvas.

### Validado

- 1194, 1024, 834 y 390 px: cero intersecciones y cero overflow horizontal.
- Canvas útil en 1194 x 834: 828 x 414 px.
- Selección M2 y análisis resuelto conservados durante todos los cambios de viewport.
- Drawer de inspector con fondo inert, cierre correcto y retorno de foco.
- `npm.cmd run verify`: 40 archivos, 229 pruebas y build aprobados.

### No cambiado

- Estado matemático, cálculo, resultados, selección y persistencia.

## 2026-07-17 - Fase 2, Slice 2.2

### Cambiado

- Piso legible de 12 px para texto técnico, resultados, warnings y metadatos críticos.
- Controles y menús a 14 px; números tabulares conservados.
- Targets de TopBar, cámara e inspector a 44 x 44 px en tablet/móvil.
- Focus ring semántico azul y ancho estable del botón Analizar durante loading.

### Validado

- Browser 834 x 1194: ocho controles frecuentes medidos en 44 x 44 px, cero overlaps y cero overflow horizontal.
- Menú secundario dentro del viewport, foco visible y retorno al trigger con Escape.
- `npm.cmd run verify`: 40 archivos, 229 pruebas y build aprobados.

### No cambiado

- Valores, precisión, unidades y contratos matemáticos.

## 2026-07-17 - Fase 2, Slice 2.1

### Añadido

- Repositorio Git local, commit baseline `85f671d` y rama `phase/2-ui-foundations`.
- Capa `src/styles/tokens.css` con primitives, roles semánticos, magnitudes técnicas, spacing, radius, elevation, tipografía, controles, layout, motion y z-index.
- Documentación de tokens y política de aliases incrementales.

### Validado

- Light/Dark definidos desde una fuente semántica común.
- Marca, selección, estados y magnitudes técnicas separados.
- `npm.cmd run verify`: 40 archivos, 229 pruebas y build aprobados.

### No cambiado

- Motor, workers, datos, schema, persistencia, importación/exportación y fixtures.

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
