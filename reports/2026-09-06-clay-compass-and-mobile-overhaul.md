# Reporte — Overhaul Integral: Brújula Tipo Clay & Interfaz Móvil

- **Fecha:** 2026-09-06
- **Área:** Canvas, Brújula Polar de Reacciones, Brújula de Navegación Viewport, Glassmorphic Dock 2.0
- **Objetivo:** Resolver la visibilidad de la brújula en el canvas, añadir la Brújula de Orientación Claymorphic en el viewport y elevar la ergonomía táctil en móvil.

---

## 1. Causa Raíz Identificada

El usuario reportó: *"haz una mejora de todo lo que tenemos porqu l abrujula ni la veo"*.

1. **Estado inicial del modo de reacciones**: En `StructuralCanvas.tsx`, `reactionMode` estaba inicializado en `'cartesian'` (`useState<ReactionDisplayMode>('cartesian')`). Por la condición `const showPolar = reactionMode === 'polar' || reactionMode === 'both'`, la brújula polar en los apoyos permanecía oculta al resolver una estructura a menos que el usuario abriera el HUD y la activara manualmente.
2. **Ausencia de brújula de viewport en el lienzo**: Al estar en modo dibujo o antes de calcular, no había ningún widget de brújula/orientación en pantalla similar al ViewCube o View Compass de AutoCAD/Revit/Fusion 360.
3. **Acceso móvil**: En la barra inferior Glassmorphic Dock 2.0 no había un conmutador directo de brújula.

---

## 2. Cambios Implementados

### 2.1 Brújula Polar de Reacciones en Apoyos (Claymorphic)
- `reactionMode` ahora se inicializa en `'both'` por defecto en `StructuralCanvas.tsx` y `CanvasResultLayer.tsx`.
- Radio ampliado a $r=34\text{px}$ para una lectura clara sin saturar.
- Relieve Claymorphic completo:
  - Base con gradiente `url(#sc-compass-dial)` y sombra suave `drop-shadow(0 4px 12px rgba(0, 0, 0, 0.28))`.
  - Ranura concéntrica (`reaction-compass-groove`) y anillo interno segmentado (`reaction-compass-ring`).
  - 8 marcas angulares (ticks principales en 0°, 90°, 180°, 270° y secundarios en 45°, 135°, 225°, 315°).
  - Grabado de letras cardinales ($N$ en rojo vermellón a 90° / $+Y$, $E$, $S$, $W$).
  - Pin central 3D con esfera de arcilla y reflejo especular.
  - Aguja resultante 3D bicolor (naranja-ámbar a cian brillante) con halo luminoso (`reaction-compass-needle-glow`).
  - Arco sectorial de inclinación $\theta^\circ$.
  - Insignia Claymorphic con magnitud neta $R$ y ángulo exacto en grados.
  - Espiral orbital para momento reactivo $M_r$.

### 2.2 Brújula de Orientación del Viewport (`CanvasOrientationCompass`)
- Nuevo componente interactivo flotante en la esquina superior derecha (`data-canvas-chrome="orientation-compass"`).
- Disco táctil de arcilla con rosa de los vientos 3D (agujas facetadas en rojo vermellón y pizarra, letras cardinales y pin central).
- **Acción táctil**: 1 toque centra y encuadra la estructura (`fitModel`) con respuesta háptica (`haptics.impact('light')`) y animación elástica.
- **Píldora de modo de reacciones**: Permite alternar entre Cartesiano, Solo Brújula y Ambos al instante con un toque y confirmación por toast.
- Adaptable a pantallas compactas (`@media (max-width: 768px)`).

### 2.3 Glassmorphic Dock 2.0 — Botón de Brújula
- En la pestaña `Resultados`, se añadió el botón `[ 🧭 Brújula ]` en la sub-repisa segmentada junto a `[ 🧊 2.5D ]`.
- Ejecuta `emitWorkspaceCommand('toggle-canvas-reaction-mode')` con respuesta háptica media.

---

## 3. Verificación Ejecutada

- **Pruebas unitarias ejecutadas:**
  - `CanvasOrientationCompass.test.tsx` (5/5 pasadas)
  - `CanvasResultLayer.test.tsx` (7/7 pasadas)
  - `CanvasDirectorHud.test.tsx` (5/5 pasadas)
  - `CanvasTouchRadialRing.test.tsx` (3/3 pasadas)
  - `ToolRail.test.tsx` (16/16 pasadas)
  - `StructuralCanvas.fit.test.tsx` & `StructuralCanvas.contextualActions.test.tsx` (4/4 pasadas)
  - `App.test.tsx` (38/38 pasadas)
- **Calidad y tipos:**
  - `bun run lint` (0 warnings, 0 errors)
  - `bun run typecheck` (0 errors)
  - `bun scripts/check-protected-baseline.mjs` (55/55 archivos protegidos intactos)
- **Presupuesto de rendimiento:**
  - `bun run build && bun scripts/check-performance-budget.mjs`: Entrada 372,417 bytes gzip ($\le 380,000$ bytes límite).
