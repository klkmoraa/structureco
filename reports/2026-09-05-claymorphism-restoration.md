# Restitución y perfeccionamiento de alto nivel del Claymorphism en StructureCo

**Clasificación:** `FEATURE/PERFECTION`
**Fecha:** 5 de septiembre de 2026
**Rama:** `codex/structureco-studio-redesign`

## Resumen ejecutivo

Se restituyó y perfeccionó el sistema de diseño Claymorphism en toda la aplicación, alcanzando un nivel superior de excelencia táctil, volumen físico y fidelidad ergonómica.

Se eliminaron las anulaciones planas accidentales (`box-shadow: none`, `transform: none`, sombras monocapa genéricas), devolviendo a StructureCo su identidad de arcilla mate cocida, con iluminación direccional (145°), contraluz exterior difuso de rebote, biseles especulares interiores (`inset 0 1px 0`), cavidades táctiles talladas (`inset`), hundimiento físico elástico en estados activos (`translateY(2px) scale(0.98)` / `translateY(2px)`) y radios ergonómicos (10px controles, 18px tarjetas, 24px paneles, 28px modales).

Adicionalmente, se implementó una capa de perfeccionamiento de alto nivel (Tier 1) que introduce micro-interacciones físicas avanzadas, indicadores luminosos de precisión y acabados de cerámica y arcilla técnica de alta gama sin vulnerar ninguno de los contratos de diseño ni el presupuesto de rendimiento.

## Componentes restituidos y perfeccionados (Tier 1)

1. **Tokens de materia (`src/design-system/tokens.css`):**
   - **Escala de radios ergonómicos:** `--sc-radius-control: 10px;`, `--sc-radius-card: 18px;`, `--sc-radius-panel: 24px;`, `--sc-radius-modal: 28px;`.
   - **Sombras con volumen y luz:** restaurada la escala `--sc-shadow-raised`, `lifted`, `floating`, `modal`, `popover`, `drop`, `sheet` con doble capa exterior (sombra profunda abajo-derecha + contraluz suave arriba-izquierda) y bisel superior.
   - **Escala Clay (Día y Noche):**
     - `--sc-shadow-clay-xs`, `sm`, `md`, `lg`, `floating`: 4 capas físicas coordinadas (sombra exterior, contraluz exterior, bisel superior de luz y bisel de profundidad).
     - `--sc-shadow-clay-inset` y `--sc-shadow-clay-pressed`: cavidades táctiles estables y hundimientos activos reales.
     - `--sc-shadow-clay-action`, `hover`, `pressed`: volumen de arcilla teñida con color de marca en estado de reposo, elevación al vuelo y cavidad al pulsar.
     - Calibración nocturna completa: sombras de carbón profundo con contraluz azul grisáceo tenue (`rgba(67, 98, 108, 0.14)`) y bisel de 1px sobre grafito.
   - **Hundimiento táctil:** `--sc-clay-press-transform: translateY(2px) scale(0.98);` y `--sc-clay-press-transform-flat: translateY(2px);`.

2. **TopBar (`src/features/topbar/topbar.css`):**
   - Botón de inicio de marca (`.brand-home-button`): volumen `--sc-shadow-clay-xs`, elevación en hover `--sc-shadow-clay-sm`, cavidad activa con `--sc-shadow-clay-pressed` y hundimiento físico.
   - Selector de proyecto y lanzador de análisis: volumen sutil y cavidad inset.
   - Acciones primarias y botones de comando: elevación clay táctil con estados hover/active.
   - Botón de análisis principal (`.analyze-button--clay-primary`): arcilla teñida de acción con `--sc-shadow-clay-action`, hover elevado y cavidad activa.

3. **Workspace y Dock Flotante (`src/features/workspace/phase1.css`):**
   - Botones del dock (`.tool-button`, `.sc-popover__trigger`): superficie de arcilla mate con `--sc-shadow-clay-xs`, elevación al hover y cavidad de pulsado/activo con `--sc-shadow-clay-pressed`.
   - Transiciones elásticas con curvas spring (`cubic-bezier(.2,.85,.25,1.1)`).
   - **Pip luminoso activo:** indicador en relieve esférico (`::after`) con el color técnico de la herramienta (`--tool-color`), glow direccional y posición ergonómica en el borde inferior.
   - Cumplimiento estricto del contrato mate sin `backdrop-filter` en `phase1.css`.

4. **Lienzo estructural y HUD (`src/features/canvas/phase2.css`):**
   - Retención de profundidad elevada `--sc-shadow-raised` para controles del canvas, chips de vista, barra de evidencia y paneles.
   - Acabado de cerámica translúcida esmerilada (`backdrop-filter: blur(14px)`) en `.canvas-controls`, `.canvas-view-chips`, `.canvas-layer-panel`, `.quick-entry-bar`, `.canvas-hint`.
   - Micro-botones y chips con elevación al hover (`--sc-shadow-clay-xs`), pulsado físico con cavidad (`--sc-shadow-clay-pressed`) y contraste nítido.

5. **Inspector de Propiedades (`src/features/inspector/inspector.css`):**
   - Tarjetas de selección, grupos de propiedades, narrativa y resumen del modelo con elevación `--sc-shadow-clay-xs`.
   - Pestañas con cavidad activa `--sc-shadow-clay-pressed`.
   - Controles numéricos y selectores estándar con cavidad táctil tallada `--sc-shadow-clay-inset`.
   - **Interruptores 3D físicos (`.toggle-row input[type='checkbox']`):** pista tallada en bajorrelieve con `--sc-shadow-clay-pressed` y perilla esférica moldeada en 3D con `--sc-shadow-clay-xs`, elevación al hover, estado pulsado activo elástico y desplazamiento fluido.

6. **Resultados Estructurales (`src/features/results/results.css`):**
   - Tarjetas métricas, cartas de extremos y paneles analíticos con volumen `--sc-shadow-clay-xs`.
   - **Tarjetas de extremos técnicos:** acento superior coloreado (`border-top: 2px solid var(--extreme-color)`) según magnitud física ($M, V, N, R$).
   - Botón de localización rápida (`.result-extreme-card__locate`): moldeado táctil con `--sc-shadow-clay-xs`, elevación hover y cavidad activa al pulsar.
   - Pestañas de resultados con cavidad activa y delimitación limpia.

7. **Pantalla de Inicio y Búsqueda Global (`src/features/welcome/totalHome.css`, `homeSearch.css`):**
   - Tarjeta principal hero con radio generoso (24px) y sombra clay `--sc-shadow-clay-sm`.
   - Botón Continuar (acción clay primaria) y botón Nuevo proyecto con tactilidad completa y hundimiento.
   - Buscador global rápido con cavidad inset `--sc-shadow-clay-inset`.
   - Modal de búsqueda global (`homeSearch.css`): fondo difuminado de cristal esmerilado (`backdrop-filter: blur(12px)`), sombra modal multicapa y opciones interactivas con elevación al hover y cavidad activa.
   - Teclas de acceso rápido (`<kbd>`): moldeadas en 3D como teclas mecánicas con borde biselado inferior de 2px y sombra sutil.
   - Cuadrícula de plantillas con tarjetas de arcilla elevadas, medios en cavidad inset y pulsado ergonómico.

8. **Contratos y pruebas de reconciliación (`src/design-system/`):**
   - Reconciliados `clayReconciliation.test.ts`, `tokens.test.ts` y `totalRedesignFoundation.test.ts`.

## Validación y compuertas de calidad

- **Pruebas unitarias y de integración:**
  - `src/design-system`: 17 archivos de prueba, 121 pruebas aprobadas (100%).
  - `src/features`: 162 archivos de prueba, 1.359 pruebas aprobadas (100%).
  - Suite de módulos modificados (`workspace`, `canvas`, `inspector`, `results`, `welcome`, `design-system`): 105 archivos de prueba, 725 pruebas aprobadas (100%).
  - Módulo `TopBar.test.tsx`: 30 pruebas aprobadas (100%).
- **Linter (oxlint):** 0 errores, 0 advertencias en 774 archivos.
- **Tipado TypeScript (tsc):** sin errores (`tsc -b --noEmit`).
- **Frontera protegida (`check-protected-baseline.mjs`):** intacta, 55 archivos verificados.
- **Contrato CSS global (`check-global-css.mjs`):** 3.432 / 8.000 bytes, sin selectores prohibidos.
- **Presupuesto de compilación de producción:** 1.356.300 bytes / 371.131 gzip (límite 1.400.000 / 380.000). Aprobado.

No se modificó el solver, `ProjectModel`, la física, unidades, topología ni resultados matemáticos.
