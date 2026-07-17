# Changelog UX/UI

## 2026-07-17 - Fase 3, Slice 3.0

### Preparado

- PDF rector de 56 páginas leído, renderizado y auditado visualmente.
- Diez referencias aprobadas identificadas para herramientas, canvas, capas, labels, selección y gestos.
- Rama `phase/3-canvas-tools`, baseline real y frontera protegida registrados.
- Plan de slices 3.1-3.8, decisiones y ledger inicial creados.

### Evidencia

- Doce capturas before que cubren los nueve viewports obligatorios, Light/Dark, listo/analizado y selección de miembro.
- Manifiesto por archivo con viewport, raster, bytes y SHA-256.
- Contact sheet revisado visualmente.

### Validado

- `verify`: 41 archivos, 233 pruebas y build aprobados.
- `qa:phase2`: 117 checks; `qa` Chromium y `qa:webkit` aprobados sin errores.

### No cambiado

- Ningún archivo bajo `src/`.
- Motor, workers, dominio, schema, migraciones, persistencia, importación/exportación, fórmulas, signos, unidades y precisión.

## 2026-07-17 - Fase 2, entrega final

### Entregado

- Informe completo de 39 páginas con alcance, cambios, decisiones, trazabilidad, pruebas y todas las capturas de referencia, antes y después.
- Archivo `structureCo_Informe_Completo_Fase_2.pdf`, con SHA-256 `e3ee011026c7974ccce2b7242e279e4dfc48163575d2a7539762a0187576e7a4`.
- Correo enviado a `crisdlm302@gmail.com` con el PDF adjunto.

### Verificado

- Mensaje localizado en Enviados con ID Gmail `19f716b2005b62cf`.
- Destinatario, asunto y adjunto de 5,444,459 bytes confirmados mediante lectura posterior al envío.
- Portada y página de trazabilidad renderizadas nuevamente desde la versión final del PDF sin recortes ni deformaciones.

### Cierre

- Fase 2 completada; Fase 3 no iniciada.
- Motor matemático, workers, fórmulas, precisión, signos, unidades, schema y persistencia preservados.

## 2026-07-17 - Fase 2, Slice 2.7

### Añadido

- `qa-phase2.mjs` con 117 checks geométricos, de estados, contraste, foco, reduced motion y zoom 200 %.
- 13 capturas after y métricas JSON reproducibles.
- Captura controlada de loading real, retrasando únicamente la entrega del mensaje del worker en la página de QA.

### Ajustado por QA

- Ancho estable de Analizar en ES/EN durante loading.
- Roles de primer plano AA para warning/error en Light.
- Padding móvil corregido para que controles de 44 px permanezcan dentro del header en landscape/zoom.
- QA Chromium actualizado para acceder a idioma y tema desde el overflow vigente.

### Validado

- `qa:phase2`: 117/117; Chromium heredado: 63/63; WebKit iPhone/iPad: PASS.
- Cero errores de consola o página.
- Comparación visual directa contra referencias A-E aprobada.

### No cambiado

- Motor, workers productivos, fórmulas, precisión, signos, unidades, schema, persistencia y fixtures.

## 2026-07-17 - Fase 2, Slice 2.6

### Consolidado

- Declaraciones visuales de TopBar y controles reunificadas en su bloque principal.
- Selectores huérfanos del antiguo switch de tema eliminados.
- Popovers alineados con tokens de stacking, radio, spacing, borde y sombra.

### Validado

- Lint sin warnings y build aprobado.
- Tokens Light/Dark comprobados en Browser.
- Matriz de nueve viewports repetida sin intersecciones, salidas del header u overflow horizontal.

### No cambiado

- Ningún archivo de motor, dominio, datos, persistencia, importación/exportación o fixtures.

## 2026-07-17 - Fase 2, Slice 2.5

### Añadido

- Indicador global del análisis con estados listo, calculando, actualizado, desactualizado, advertencia y error.
- Acceso directo desde warning/error al tab Avisos, incluida expansión del panel móvil.
- Traducciones ES/EN y pruebas unitarias de precedencia, ciclo por proyecto y acción accesible.

### Validado

- Estados reales listo, actualizado, desactualizado y error en Browser.
- Nueve viewports de 390 a 1536 px sin intersecciones, elementos fuera del header u overflow horizontal.
- Targets 44 x 44 px en 390, 430 y 834 px.
- `npm.cmd run verify`: 41 archivos, 233 pruebas y build aprobados.

### No cambiado

- Solver, workers, fórmulas, contratos, signos, unidades, precisión, persistencia o resultados.

## 2026-07-17 - Fase 2, Slice 2.4

### Cambiado

- TopBar reorganizada en Documento, Contexto y Acciones.
- Guardado se integra en Documento; historial pasa a Acciones.
- Idioma, tema y utilidades secundarias se concentran en un overflow disponible a cualquier ancho.
- Caso, modo, unidades, export e historial se mueven progresivamente antes de colisionar.

### Validado

- Nueve viewports de 390 a 1536 px: cero intersecciones, cero elementos fuera del header y cero overflow horizontal.
- Nombre largo y copys ES/EN sin colisión.
- Overflow dentro del viewport, focus ring de 3 px, Escape y retorno de foco.
- `npm.cmd run verify`: 40 archivos, 230 pruebas y build aprobados.

### No cambiado

- Payload de Analizar, semántica de historial, exportación o estado del proyecto.

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
