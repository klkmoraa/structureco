# Rediseño Mobile: Glassmorphic Dock 2.0, Touch Quick Ring y Mejoras de Canvas

## Contexto y Motivación

En dispositivos móviles (teléfonos y tabletas), la interacción táctil en StructureCo requería optimización ergonómica:
1. La barra de herramientas inferior (`.mobile-tool-dock`) era un bloque estático gris pegado al borde inferior que dificultaba la navegación y tapaba espacio útil de visualización.
2. Acceder a herramientas frecuentes de nudos y barras tras tocar un elemento obligaba a desplazarse arriba y abajo por la pantalla, perdiendo agilidad.
3. Al resolver la estructura, la cámara ejecutaba un salto/zoom abrupto no deseado hacia los apoyos.
4. Los diagramas de solicitaciones internas ($N, V, M$) en el canvas carecían de suficiente contraste y diferenciación cromática.

---

## Mejoras Implementadas

### 1. Barra de Herramientas Flotante "Glassmorphic Dock 2.0"
- **Diseño Suspendido iOS/iPadOS**:
  - Flota a 12 px del fondo respetando la zona segura de iPhones modernos (`env(safe-area-inset-bottom)`).
  - Material Claymorphic/Glassmorphic translúcido con desenfoque `backdrop-filter: blur(24px) saturate(190%)`, resplandor especular interior y esquinas redondeadas (`border-radius: 24px`).
- **4 Pestañas Conmutables de Alto Nivel**:
  - `[ 🖐️ Navegar ]`: Despliega sub-estante con `[ 👆 Seleccionar | 🖐️ Desplazar | 🔍 Buscar (Ctrl+K) ]`.
  - `[ 🏗️ Geometría ]`: Despliega sub-estante con `[ 🔴 Nodo | 📏 Barra | ⚓ Apoyo | 🏗️ Marco rápido ]` (lanza generador).
  - `[ ⚡ Cargas ]`: Despliega sub-estante directo con `[ ⬇️ Puntual | 〰️ Distribuida | 🔄 Momento ]`.
  - `[ 📊 Resultados ]`: Despliega el control segmentado fluido para alternar instantáneamente solicitaciones.
  - `[ ⋯ Más ]`: Acceso rápido al panel de utilidades avanzadas (cota, corte, dividir, edición estructural, etc.).
- **Segmented Slider Fluido para Solicitaciones ($N, V, M, \delta, \text{2.5D}$)**:
  - Fusión de las solicitaciones en un control segmentado con deslizador animado que se desplaza suavemente al conmutar entre Axial ($N$), Cortante ($V$), Momento ($M$) y Deformada ($\delta$).
  - Botón integrado `[ 🧊 2.5D ]` para alternar la extrusión sólida isométrica directamente desde el dock con respuesta háptica.

### 2. Menú Radial Contextual al Tocar Elementos (Touch Quick Ring)
- **Componente `CanvasTouchRadialRing.tsx`**:
  - Se activa al seleccionar cualquier nudo o barra directamente en el canvas.
  - Florece de forma radial y suave (`@keyframes ringBloom`, 0.2s) exactamente alrededor del punto de toque en pantalla.
  - **Acciones para Barra**: `[ 📏 Sección/Perfil ]` · `[ ⬇️ Carga ]` · `[ ✂️ Cortar ]` · `[ 🗑️ Borrar ]`.
  - **Acciones para Nodo**: `[ ⚓ Ciclar Apoyo (Libre/Articulado/Móvil/Empotrado) ]` · `[ ⬇️ Carga Nodal ]` · `[ 🔗 Nueva Barra ]` · `[ 🗑️ Borrar ]`.
  - Botón central `[ ✕ ]` de cierre rápido y descarte al tocar fuera o presionar escape.
  - Integración háptica inmediata (`haptics.impact('medium')` y `haptics.notification('success')`).

### 3. Corrección del Zoom no Deseado al Resolver
- En `StructuralCanvas.tsx`, la llamada y dependencia a `fitModel` se desacopló mediante `fitModelRef`, eliminando el salto de cámara automático a los apoyos cada vez que finaliza el cálculo de análisis.
- El modo de lectura de reacciones se configuró por omisión como `cartesian` para evitar que las agujas y brújulas polares sobredimensionen el encuadre al calcular.

### 4. Contraste y Diferenciación de Diagramas
- Se aumentaron las opacidades de relleno de diagramas de `0.18` a `0.55` (`results.css`), y en `StructuralCanvas.tsx` los gradientes lineales SVG para axial (`sc-diagram-axial-grad`), cortante (`sc-diagram-shear-grad`) y flector (`sc-diagram-moment-grad`) pasaron de transparencias lavadas a intensidades vivas (`0.68` y `0.25`).
- El trazo de curva exacta aumentó a `2.6px` con sombra de realce, haciendo que $N$, $V$ y $M$ se distingan claramente tanto en modo claro como en modo oscuro.

---

## Verificación Ejecutada

- **Lint:** `bun run lint` (0 errores, 0 advertencias en 798 archivos).
- **Typecheck:** `bun run typecheck` (`tsc -b --noEmit`: 0 errores).
- **Pruebas de Canvas:**
  - `src/features/canvas/ToolRail.test.tsx` (16/16 pruebas superadas).
  - `src/features/canvas/CanvasTouchRadialRing.test.tsx` (3/3 pruebas superadas).
  - `src/features/canvas/canvasEvidenceRailStyles.test.ts` (1/1 prueba superada).
- **Pruebas del App Shell:**
  - `src/App.test.tsx` (38/38 pruebas superadas).
  - `src/features/workspace/clayWorkspacePhase2.test.ts` (9/9 pruebas superadas).
- **Frontera Protegida:** `bun scripts/check-protected-baseline.mjs` (55 archivos protegidos intactos).
- **Presupuesto de Rendimiento:** `bun scripts/check-performance-budget.mjs` (1,359,999 bytes / 372,418 gzip vs. límite de 380,000 gzip).
- **Build de Producción:** `bun run build` exitoso sin errores.
