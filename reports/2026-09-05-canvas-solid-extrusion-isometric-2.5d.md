# Extrusión Isométrica 2.5D en el Canvas: Modo Sólido (Wire-to-Solid Mode)

## Contexto y Motivación

En los análisis matriciales 2D, las estructuras se modelan y dibujan habitualmente como líneas unifilares mono-dimensionales ("wireframe" 1D). Aunque esta abstracción es óptima para la formulación matemática, oculta las propiedades físicas reales de los elementos: la orientación de ejes fuertes y débiles, los espesores de ala y alma en perfiles de acero, y la volumetría de pilares y dinteles.

Con la **Propuesta B (Modo Sólido 2.5D / Wire-to-Solid)**, StructureCo introduce un motor de extrusión axonométrica e isométrica vectorial en tiempo real dentro del propio lienzo SVG, permitiendo a los ingenieros alternar instantáneamente entre el modelo analítico unifilar y la volumetría estructural real.

---

## Innovaciones Implementadas

1. **Motor Geométrico de Extrusión Isométrica 2.5D (`isometricExtrusion.ts`):**
   - Resuelve paramétricamente la geometría transversal del catálogo (`resolveSectionGeometry`):
     - **Perfiles I / H** (`IPE`, `HEB`, `W`): proyecta alas superior e inferior con espesor real $t_f$, estantes interiores hacia el alma, alma rehundida en profundidad $z$ con espesor $t_w$, y tapas de extremo con silueta "I" capital de 12 vértices.
     - **Perfiles Rectangulares y Macizos** (`RECT`, `HSS_RECT`): proyecta prismas 2.5D con caras frontales, superiores, inferiores y tapas laterales en los nudos extremos.
     - **Nudos y Conexiones Estructurales**: genera bloques de unión y cartelas volumétricas en los nudos conectados, dando continuidad monolítica a la unión viga-columna.
   - **Vector de Profundidad Axonométrica**:
     $$\vec{\Delta}_{\text{iso}} = \left(w_{\text{px}} \cdot 0.65 \cdot \cos 30^\circ, -w_{\text{px}} \cdot 0.65 \cdot \sin 30^\circ\right)$$
   - **Eje Fantasma Analítico (Ghost Axis)**:
     Proyecta una línea central discontinua sutil (`.solid-ghost-axis`) para conservar la referencia del eje matemático y los puntos de snap.

2. **Sombreado Lambertiano Claymorphic Direccional:**
   - Vector de iluminación cenital coordinado con la paleta Claymorphic: $\vec{L} \approx (-0.38, -0.76, 0.52)$ normalizado.
   - Cálculo de iluminación difusa con suelo ambiental:
     $$\text{shade} = \text{clamp}\left(\text{ambient} + (1 - \text{ambient}) \cdot (\vec{n} \cdot \vec{L}), 0, 1\right)$$
   - Caras superiores con máxima iluminación ($85\%\sim 95\%$), caras frontales intermedias ($70\%\sim 78\%$), caras inferiores/rehundidas en penumbra ($38\%\sim 50\%$).
   - Biseles y aristas técnicas de contraste (`rgba(255,255,255,0.28)` en luz y `rgba(15,23,42,0.35)` en sombra).
   - Modulación fluida con la demanda elástica ($\eta = \sigma / f_y$) mediante `elasticIndexPaint`.

3. **Capa Interactiva SVG (`CanvasSolidExtrusionLayer.tsx`):**
   - Renderizado con algoritmo del pintor (depth-sorting de caras de atrás hacia adelante).
   - Totalmente interactivo: selección de barras, focos pedagógicos, previsualización de cursor (hover) e inspección de corte transversal (`onShowCut`).
   - Cero pérdida de contexto WebGL y compatibilidad nativa con zoom, pan, exportación a SVG e informe PDF.

4. **Conmutador en el Director HUD (`CanvasDirectorHud.tsx`):**
   - Botón `[ 🧊 Sólido 2.5D ]` con icono `Box` de `lucide-react`.
   - Alterna entre la vista unifilar tradicional ("Wireframe") y la volumetría extruida sólida ("Sólido 2.5D").
   - Comando de workspace `toggle-canvas-solid-mode` para control programático.

5. **Estilos y Acabado Técnico (`phase2.css`):**
   - Reglas específicas para `.solid-extrusion-layer`, `.solid-ghost-axis`, `.solid-face`, filtros de hover y resplandor de selección (`is-selected`).

---

## Verificación Ejecutada

- **Lint:** `bun run lint` (0 advertencias, 0 errores en 796 archivos).
- **Typecheck:** `bun run typecheck` (`tsc -b --noEmit`: 0 errores).
- **Pruebas Unitarias del Motor:** `isometricExtrusion.test.ts` (7/7 pruebas superadas).
- **Pruebas de la Capa Visual:** `CanvasSolidExtrusionLayer.test.tsx` (3/3 pruebas superadas).
- **Pruebas del Director HUD:** `CanvasDirectorHud.test.tsx` (4/4 pruebas superadas).
- **Suite Completa de Canvas:** 46 archivos de prueba, 242 pruebas superadas.
- **Frontera Protegida:** `bun run verify:protected` (55 archivos protegidos intactos).
- **Presupuesto de Rendimiento:** `bun run verify:perf` (1,359,999 bytes / 372,416 gzip vs. límite de 380,000 gzip).
- **Documentación:** `bun scripts/check-docs.mjs` (23 documentos verificados).
