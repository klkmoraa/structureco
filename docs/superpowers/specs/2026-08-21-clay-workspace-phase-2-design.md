# StructureCo Clay Workspace — Diseño de Fase 2

**Clasificación:** `AUDIT/TEMPORARY`

**Estado:** Propuesta cerrada para revisión previa a implementación.

## Objetivo

Aplicar la identidad Clay mate, pronunciada y física al Workspace 2D, Tool Rail e Inspector, y corregir la lectura de cargas superpuestas, sin cambiar el modelo estructural ni ninguna ruta de cálculo, persistencia o comandos.

La fase debe sentirse como una mesa de cálculo real: lienzo técnico plano, instrumentos elevados, cavidades claras, bordes físicos definidos y respuestas táctiles visibles. No se usan glassmorphism, blur de fondo, brillos, halos decorativos ni gradientes de presentación.

## Fuentes y decisiones ya aprobadas

- Los adjuntos entregados por el usuario son la referencia visual obligatoria.
- Día usa marfil cálido; Noche usa grafito profundo funcional.
- Los colores técnicos son idénticos en Día y Noche.
- Momento de resultado permanece coral `#ED4B46`.
- Influencia usa rosa apagado: línea `#B96478`, área `#E7C6D2` y patrón discontinuo.
- Cargas aplicadas cambian por familia: puntual azul, distribuida verde lima profunda y momento aplicado ámbar.
- Tipografía aprobada en Fase 1: DM Serif Display, Manrope y JetBrains Mono.
- El relieve debe ser pronunciado: hundimientos, superposición física, estados presionados visibles y movimiento táctil.
- `prefers-reduced-motion: reduce` desactiva desplazamientos, escalas y duraciones, pero conserva contraste, jerarquía y estado.

## Alcance

Incluye:

- `Workspace 2D`: composición, chrome flotante y relación entre riel, lienzo e Inspector.
- `Tool Rail`: jerarquía de grupos, estado activo, hover, pressed, disabled, tooltips y variante compacta/móvil.
- `Inspector`: encabezado, pestañas, resumen, campos, grupos, estados y presentaciones dock/inset/sheet.
- Cargas dibujadas en el lienzo: color por tipo, orden de pintura y separación visual cuando coinciden.
- Experiencias X2, M1 y K0 ya resueltas por la arquitectura responsive existente.
- Pruebas de contrato, accesibilidad y evidencia visual Día/Noche en desktop, tablet y móvil.

No incluye:

- `src/engine/**`, `src/workers/**`, `src/data/**`, `src/store/ProjectContext.tsx`, `src/types.ts` ni `src/commands/**`.
- Solver, unidades, signos, combinaciones, resultados, topología, IDs, historial, undo/redo, persistencia o import/export.
- Datasheet, Results, Aula, Model Doctor, Import Center, Generator y Space 3D, que pertenecen a fases posteriores.
- Dependencias nuevas o cambios a los assets protegidos de marca.

## Auditoría de arquitectura

La composición actual ya separa presentación y dominio:

- `shellComposition.ts` es la única autoridad para `X2 | M1 | K0`.
- `surfacePresentation.ts` es la única tabla `shell class × surface → presentation`.
- `WorkspaceUIContext` conserva la selección y herramienta activa; no se duplican en componentes visuales.
- `AppShellLayout` organiza slots y no contiene lógica estructural.
- `CanvasGeometryLayer` recibe el proyecto y sólo pinta geometría e intenciones de selección.
- `material.css` es la autoridad de seis niveles: flat, inset, raised, floating, sheet y modal.

Riesgos observados:

- `StructuralCanvas.tsx` es un hotspot de más de 2.600 líneas; sólo se permite el ajuste mínimo de definiciones SVG necesario para los marcadores de carga.
- `styles.css` concentra reglas históricas superpuestas. Las nuevas reglas deben quedar agrupadas, con selectores por `data-shell-class`, sin crear otra tabla responsive.
- Las cargas se pintan hoy en orden de almacenamiento. Una puntual y una distribuida sobre el mismo miembro comparten trayectoria, por lo que la primera puede quedar visualmente absorbida.
- El Inspector y Tool Rail ya tienen contratos de foco, selección y continuidad que no deben migrarse ni duplicarse.

## Alternativas consideradas

### A. Vestido CSS únicamente

Cambiar sombras, radios y colores sin tocar la geometría de cargas.

Ventaja: menor diff. Desventaja: no puede resolver colisiones ni asegurar un orden semántico estable. Se descarta porque deja sin resolver el requisito central de superposición.

### B. Adaptador visual y resolutor puro de carriles — recomendado

Conservar las autoridades actuales y añadir una función pura que clasifique y ordene la presentación de cargas. El render usa ese resultado para color, longitud exterior, carril y z-order, sin mutar el proyecto.

Ventaja: testeable, determinista, reversible y aislada del motor. Resuelve cargas, responsive y materia sin crear estado paralelo.

### C. Reescritura completa del Workspace

Sustituir Shell, Rail, Inspector y Canvas por una nueva composición.

Ventaja: libertad total. Desventaja: riesgo alto para selección, comandos, foco, drafts, accesibilidad y continuidad responsive ya resueltos. Se descarta.

## Dirección visual

### Gramática material

- El lienzo y los datos técnicos son `flat`.
- La bandeja del Tool Rail es `inset`; cada herramienta es una pieza `raised`.
- Tooltips y menús son `floating`.
- Inspector X2 es `raised` acoplado; M1 es `inset` superpuesto; K0 es `sheet` desde abajo.
- No se repite el mismo nivel dentro de sí mismo: campos y filas internas vuelven a BASE o a cavidad sólo cuando son interactivos.
- La luz física llega desde arriba a la izquierda. Las sombras son cortas, opacas y con borde de 1 px.

### Interacción y movimiento

- Hover: elevación corta de 1–2 px y cambio de canto, sin glow.
- Pressed: descenso de 2 px, escala `0.98` e inversión a sombra inset.
- Apertura de panel: 180–240 ms con desaceleración física y recorrido corto.
- Cambio de pestaña: indicador que se desplaza y asienta; el contenido no hace zoom.
- Drag del Inspector: sigue el puntero sin rebote ornamental; al soltar se asienta en el detent.
- Loading: skeleton mate o progreso determinado; nunca shimmer brillante.
- Error: borde y mensaje persistentes; el color no es la única señal.
- Reduced motion: `0.001ms`, sin translate/scale; estados finales y foco permanecen visibles.

## Composición responsive

### X2 — desktop amplio

- Tool Rail vertical a la izquierda con icono y etiqueta.
- Lienzo central como plano continuo.
- Inspector a la derecha, acoplado y redimensionable.
- El relieve separa herramientas y paneles; no se añaden tarjetas dentro de cada fila técnica.

### M1 — tablet y desktop medio

- Tool Rail compacto por iconos, derivado de `isToolRailCompact`.
- Inspector superpuesto como inset lateral sin reducir permanentemente el lienzo.
- Tooltips y nombres accesibles compensan la ausencia de etiquetas persistentes.
- Los controles prioritarios permanecen al alcance y el resto vive en el disclosure existente.

### K0 — móvil

- Lienzo a pantalla completa como tarea principal.
- Dock inferior de herramientas en zona de pulgar, con objetivos mínimos de 44 × 44 CSS px y safe areas.
- Inspector como hoja inferior con detents compact/medium/large; conserva drafts al cambiar de tamaño u orientación.
- Acciones contextuales mantienen el contrato existente: un verbo primario, Borrar y `…`.
- No es una reducción del desktop: etiquetas, densidad y orden se adaptan a una tarea táctil de una mano.

## Contrato visual de cargas

### Color por familia

- Puntual o fuerza nodal: `--sc-color-load-point` (`#3A72E3`).
- Distribuida: `--sc-color-load-distributed` (`#468C09`).
- Momento aplicado: `--sc-color-load-moment-applied` (`#D9720A`).
- Momento de resultado: `--sc-color-moment-line` (`#ED4B46`), sin reutilizar el ámbar aplicado.

### Carriles y superposición

El resolutor es puro y recibe sólo los datos ya existentes. Produce metadatos de presentación; nunca escribe el proyecto.

1. Agrupa cargas de miembro por `memberId`.
2. Las distribuidas ocupan el carril interior, junto al miembro.
3. Una puntual cuyo `position` cae dentro del tramo de una distribuida conserva exactamente su punta en el punto de aplicación, pero extiende su cola 18 px más allá de la envolvente distribuida. Se pinta después de la distribuida.
4. Varias puntuales coincidentes reciben desplazamientos laterales simétricos y pequeños, calculados con un orden estable por `caseId` e `id`; la punta técnica sigue señalando la estación real mediante un tramo final común.
5. Los momentos aplicados ocupan el carril exterior y se pintan después de fuerzas lineales.
6. Carga seleccionada o previsualizada se pinta al final sin cambiar su identidad ni su hit target.
7. La separación se expresa en píxeles de pantalla para conservar legibilidad al hacer zoom; estaciones, magnitudes y direcciones permanecen en coordenadas del modelo.

El orden de pintura será: distribuida → puntual/nodal → momento aplicado → selección/preview. Los atributos `data-structure-kind` y `data-structure-id`, ARIA, teclado y callbacks permanecen intactos.

## Estados y accesibilidad

- Todos los controles conservan nombre accesible, navegación por teclado y foco visible sin glow.
- Iconos nunca son la única identificación en M1/K0: hay tooltip, `aria-label` o texto visible.
- `aria-pressed`, `aria-selected`, `aria-expanded`, roles y retorno de foco siguen gobernados por los componentes actuales.
- Contraste se mide en Día/Noche y en simulación de deficiencia de color; patrón, forma y posición complementan el color.
- Las cargas superpuestas deben seguir siendo seleccionables mediante el candidate picker existente.
- No se modifica el contrato transaccional de selección: la previsualización es local y sólo confirmar cambia la selección.

## Verificación y evidencia

- TDD para el resolutor de carriles, color por tipo, orden estable y ausencia de mutación.
- Pruebas focales de Tool Rail, Inspector, shell composition, surface presentation y Canvas.
- `lint`, `typecheck`, `verify:docs`, `verify:protected`, build y suite completa serial.
- QA renderizada en Chromium y WebKit para teclado, touch, focus, detents y candidate picker.
- Seis capturas máximas: Día/Noche × desktop, tablet y móvil. Cada una debe mostrar el Workspace real y al menos una escena con carga puntual sobre distribuida.
- Se enviarán por correo sólo las capturas necesarias para una decisión visual.

## Criterio de cierre

La fase se considera terminada cuando Workspace, Tool Rail e Inspector se leen como una sola identidad Clay en X2/M1/K0; las cargas aplicadas se distinguen por familia y no se tapan; y todos los gates demuestran que motor, datos, persistencia y comandos permanecen intactos.
