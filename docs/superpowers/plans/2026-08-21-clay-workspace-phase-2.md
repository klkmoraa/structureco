# StructureCo Clay Workspace — Plan de implementación de Fase 2

**Clasificación:** `AUDIT/TEMPORARY`

> **Para agentes:** usar `executing-plans` tarea por tarea, `test-driven-development` para cada contrato, `systematic-debugging` ante cualquier discrepancia y `verification-before-completion` antes del commit de fase.

**Estado de ejecución:** Pendiente de presentación al usuario; no hay cambios de producción de Fase 2.

**Objetivo:** Vestir Workspace 2D, Tool Rail e Inspector con la identidad Clay mate pronunciada y resolver visualmente las cargas superpuestas, sin modificar contratos estructurales.

**Arquitectura:** Reutilizar `shellComposition`, `surfacePresentation`, `WorkspaceUIContext` y `material.css`. Añadir un resolutor puro de presentación de cargas consumido por `CanvasGeometryLayer`; limitar `StructuralCanvas.tsx` a las definiciones SVG de marcadores.

**Stack:** React 19, TypeScript 6, CSS custom properties, Vitest, Testing Library, Vite y Playwright.

## Restricciones globales

- Trabajar sólo en el clon aislado y rama `codex/clay-workspace-phase-2`.
- No tocar `src/engine/**`, `src/workers/**`, `src/data/**`, `src/store/ProjectContext.tsx`, `src/types.ts`, `src/commands/**`, persistencia ni import/export.
- No cambiar signos, unidades, IDs, topología, resultados, historial, selección canónica ni drafts.
- No añadir dependencias ni modificar `brand/**`.
- No crear una segunda autoridad responsive, de selección o de presentación.
- No usar glassmorphism, blur, glow decorativo, brillo o gradiente de presentación.
- Mantener datos técnicos planos dentro de superficies elevadas.
- No avanzar a Results, Aula, Datasheet, Model Doctor, Import Center, Generator o Space 3D en esta fase.

---

### Tarea 1: Congelar los contratos de Fase 2 en rojo

**Archivos:**

- Crear: `src/features/canvas/loadPresentation.ts`
- Crear: `src/features/canvas/loadPresentation.test.ts`
- Crear: `src/features/canvas/CanvasGeometryLayer.test.tsx`
- Modificar: `src/features/canvas/ToolRail.test.tsx`
- Modificar: `src/features/inspector/Inspector.test.tsx`
- Modificar: `src/features/workspace/shellComposition.test.ts`
- Modificar: `src/features/workspace/surfacePresentation.test.ts`

**Contratos:**

- [ ] Probar que el resolutor no muta `MemberLoad[]` y produce orden estable independiente del orden de entrada.
- [ ] Probar que una puntual dentro de una distribuida recibe carril exterior, extensión adicional y z-order superior.
- [ ] Probar que puntuales coincidentes reciben offsets simétricos y deterministas.
- [ ] Probar que un momento aplicado usa su propio carril y se pinta después de fuerzas.
- [ ] Probar que `CanvasGeometryLayer` conserva `data-structure-kind`, `data-structure-id`, ARIA y callbacks.
- [ ] Probar marcadores y clases separadas para puntual, distribuida y momento aplicado.
- [ ] Probar las variantes de Rail e Inspector derivadas de X2/M1/K0 sin estado paralelo.
- [ ] Ejecutar las suites focales y observar RED sólo por contratos todavía ausentes.

### Tarea 2: Implementar el resolutor visual puro de cargas

**Archivos:**

- Implementar: `src/features/canvas/loadPresentation.ts`
- Modificar: `src/features/canvas/CanvasGeometryLayer.tsx`
- Modificar, mínimo localizado: `src/features/canvas/StructuralCanvas.tsx`

**Pasos:**

- [ ] Definir tipos de presentación separados de `MemberLoad` y sin campos persistentes.
- [ ] Agrupar por miembro y detectar solape estación/tramo con tolerancia explícita.
- [ ] Asignar carriles, extensión exterior y offsets laterales en píxeles de pantalla.
- [ ] Ordenar de forma estable: distribuida, puntual/nodal, momento, selección/preview.
- [ ] Conservar la punta en la estación real y desplazar sólo la presentación exterior.
- [ ] Añadir marcadores SVG por tipo usando los tokens ya aprobados.
- [ ] Mantener hit targets, selección, candidate picker y navegación por teclado.
- [ ] Ejecutar `loadPresentation.test.ts` y `CanvasGeometryLayer.test.tsx` hasta GREEN.

### Tarea 3: Vestir Tool Rail como instrumento Clay

**Archivos:**

- Modificar: `src/features/canvas/ToolRail.tsx` sólo si hacen falta atributos de presentación.
- Modificar: `src/features/canvas/phase2.css`
- Modificar: `src/design-system/material.css`
- Modificar: `src/styles.css`

**Pasos:**

- [ ] Mantener la bandeja como `inset` y herramientas como piezas `raised`.
- [ ] Implementar hover, active, pressed, disabled y focus sin glow.
- [ ] Conservar grupos, atajos, tooltips y nombres accesibles.
- [ ] X2 muestra icono + etiqueta; M1 compacta a iconos; K0 usa dock inferior de pulgar.
- [ ] Garantizar objetivos táctiles mínimos de 44 × 44 px y safe areas.
- [ ] Mantener el disclosure y los accesos existentes a Palette, Generator y edición.
- [ ] Ejecutar `ToolRail.test.tsx`, `toolRegistry.test.ts` y pruebas de composición.

### Tarea 4: Vestir Inspector y sus tres presentaciones

**Archivos:**

- Modificar: `src/features/inspector/Inspector.tsx` sólo para atributos/clases de rol.
- Modificar: `src/features/inspector/InspectorPrimitives.tsx` si un estado no tiene gancho semántico.
- Modificar: `src/styles.css`
- Modificar: `src/design-system/material.css`

**Pasos:**

- [ ] X2: panel acoplado raised, redimensionable y con jerarquía plana interna.
- [ ] M1: panel inset superpuesto sin reflow permanente del lienzo.
- [ ] K0: sheet inferior con handle, detents y safe areas.
- [ ] Dar estados físicos a pestañas, toggles, selects, campos y acciones.
- [ ] Mantener errores, disabled, dirty, loading y mensajes con señal redundante al color.
- [ ] Preservar selección de `WorkspaceUIContext`, tabs forzadas y drafts durante X2/M1/K0.
- [ ] Ejecutar `Inspector.test.tsx`, sus primitivas y pruebas del broker.

### Tarea 5: Unificar la composición del Workspace

**Archivos:**

- Modificar: `src/features/workspace/phase1.css`
- Modificar: `src/features/canvas/phase2.css`
- Modificar: `src/styles.css`
- Modificar: `src/design-system/material.css`

**Pasos:**

- [ ] Aplicar el fondo marfil/grafito y separar físicamente rail, lienzo e Inspector.
- [ ] Basar reglas principales en `data-shell-class='X2'|'M1'|'K0'`; conservar los umbrales existentes.
- [ ] Eliminar contradicciones de cascada dentro del alcance, sin reordenar estilos ajenos.
- [ ] Mantener chrome de lienzo opaco, técnico y legible en ambos temas.
- [ ] Añadir movimiento físico de 180–240 ms y pressed visible.
- [ ] Verificar que reduced motion elimina desplazamiento/escala y no oculta estados.
- [ ] Ejecutar las pruebas de shell, broker, canvas chrome y accesibilidad focal.

### Tarea 6: QA responsive y de interacción real

**Archivos:**

- Crear: `scripts/qa-clay-workspace-phase2.mjs`
- Crear bajo `reports/evidence/2026-08-21-clay-workspace-phase-2/`: seis capturas y metadatos de ejecución.

**Pasos:**

- [ ] Sembrar un proyecto con distribuida + puntual + momento aplicados en un mismo miembro.
- [ ] Validar X2 1440×900, M1 1024×768 y K0 390×844.
- [ ] Validar Día y Noche con los mismos colores técnicos.
- [ ] Validar mouse, teclado y touch; Rail, pestañas, detents, candidate picker y retorno de foco.
- [ ] Medir targets táctiles y ausencia de overflow horizontal.
- [ ] Ejecutar Chromium y WebKit sin debilitar aserciones por diferencias del navegador.
- [ ] Capturar seis imágenes máximas y revisarlas visualmente contra los adjuntos.

### Tarea 7: Gates, informe y entrega

**Archivos:**

- Crear: `reports/2026-08-21-HHmm-clay-workspace-phase-2.md`

**Pasos:**

- [ ] Ejecutar `npm.cmd run lint`.
- [ ] Ejecutar `npm.cmd run typecheck`.
- [ ] Ejecutar pruebas focales con `--maxWorkers=1`.
- [ ] Ejecutar `npm.cmd run verify:docs`.
- [ ] Ejecutar `npm.cmd run verify:protected` y confirmar las 38 rutas intactas.
- [ ] Ejecutar `npm.cmd run build`.
- [ ] Ejecutar `npm.cmd test -- --maxWorkers=1` sin inventar PASS ni ocultar flakes.
- [ ] Revisar `git diff --name-only` contra el alcance autorizado.
- [ ] Generar el reporte con base SHA, backup, archivos, pruebas, capturas y pendientes.
- [ ] Enviar al correo del usuario sólo las capturas necesarias, máximo seis en esta fase.
- [ ] Stage explícito, commit y detenerse antes de push/merge si no existe autorización vigente.

## Autorrevisión del plan

- La solución evita una reescritura y se apoya en autoridades ya probadas.
- El algoritmo de cargas es presentación pura y tiene TDD propio.
- `StructuralCanvas.tsx` queda limitado a marcadores; no se refactoriza el hotspot.
- El responsive no duplica estado ni breakpoints.
- El alcance no invade otras superficies ni el motor.
- La evidencia visual representa el producto real y no un mockup desconectado.
