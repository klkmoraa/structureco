# Reporte — Overhaul Integral de la Experiencia Móvil en StructureCo Studio

- **Fecha:** 2026-09-08
- **Áreas impactadas:** Canvas & Dock Flotante Móvil, Inspector Bottom Sheet con Gestos Nativos, Carrusel de Resultados Móvil, Navegación Global Home, Safe Areas & Touch Targets HIG.
- **Objetivo:** Elevar holísticamente la experiencia táctil y la ergonomía en dispositivos móviles (smartphones y tablets en vertical, con referencia prioritaria iPhone 390×844 y Dynamic Island).

---

## 1. Cambios Implementados

### 1.1 Canvas y Dock Flotante Móvil
- **Despeje de Colisión Superior Derecha (`mobileCanvasDensity.css`):**
  - Se desacopló la superposición entre el gatillo de capas (`.canvas-layer-trigger`) y la brújula de orientación (`.canvas-orientation-compass`).
  - En pantallas compactas (`<= 768px` y `<= 420px`), la brújula se ancla en `top: 7px; right: 7px;`, mientras que el gatillo de capas se ubica limpiamente a su izquierda en `top: 7px; right: 58px;` (o `56px`), permitiendo acceso simultáneo sin interferencias.
- **Refactorización del Slider de Resultados (`ToolRail.tsx` y `phase2.css`):**
  - Se estructuró el control segmentado para los 4 diagramas mutuamente excluyentes ($N, V, M, \delta$) con un ancho de cursor exacto del 25% (`width: calc((100% - 6px) / 4)` y traslaciones 0%, 100%, 200%, 300%).
  - Las acciones complementarias de alternar Sólido 2.5D (`🧊`) y Brújula de reacciones (`🧭`) se extrajeron a pastillas de acción dedicadas (`dock-action-pill`), eliminando el desborde y la colisión visual del cursor.
- **Protección de Barra de Inicio iOS (`phase2.css`):**
  - Se añadió `margin-bottom: max(6px, env(safe-area-inset-bottom))` a `.mobile-dock-wrapper` para asegurar que el dock flote con distancia de seguridad sobre el Home Indicator.

### 1.2 Inspector Bottom Sheet y Gestos Táctiles Nativos
- **Tirador con Física Gestual (`Inspector.tsx`):**
  - `.inspector-sheet-handle` incorpora captura de puntero táctil con cálculo de desplazamiento ($\Delta Y$) y velocidad ($v_Y$).
  - Arrastrar hacia arriba conmuta con respuesta háptica al detent superior (`compact` $\to$ `medium` $\to$ `large`).
  - Arrastrar hacia abajo desciende de detent o descarta/cierra la hoja con un swipe rápido descendente ($v_Y > 0.45\text{ px/ms}$ o $\Delta Y > 55\text{px}$).
  - Se preservan el clic accesible y la navegación por teclado (`Space`/`Enter`/flechas).
- **Corrección de Hueco Inferior (`phase1.css`):**
  - Se corrigió el anclaje inferior de `.inspector-panel[data-surface-presentation='sheet']`: se eliminó el offset huérfano de 64px, anclando al fondo con `inset: auto 0 var(--sc-visual-viewport-bottom, 0px)` y `padding-bottom: max(16px, var(--sc-safe-bottom))`.

### 1.3 Carrusel de Tarjetas de Resultados en Móvil
- **Agrupación en Carrusel con Snap (`ResultSummary.tsx` y `results.css`):**
  - Las tarjetas técnicas de ingeniería (Demanda elástica, Calidad numérica, Certificado, Estudios de estabilidad, AISC 360 y NTC) se envolvieron en `.result-summary-cards-carousel`.
  - En escritorio conserva `display: contents`, comportándose de forma idéntica al diseño canónico.
  - En móvil (`<= 700px`), se transforma en un carrusel horizontal con `scroll-snap-type: x mandatory`, permitiendo navegar fácilmente entre tarjetas sin saturar el sheet de 55dvh con un scroll vertical interminable.

### 1.4 Navegación Global, Diálogos y Objetivos Táctiles (HIG)
- **Backdrop en Menú Móvil de Home (`WelcomeScreen.tsx` y `totalHome.css`):**
  - Se incorporó `.sc-home-nav-backdrop` (`z-index: 38`, desenfoque de fondo y animación suave) para cerrar el menú desplegable al hacer tap fuera.
- **Protección contra Dynamic Island en `HomeSearch` (`homeSearch.css`):**
  - `padding-top: max(24px, calc(var(--sc-safe-top) + 14px))` en `< 760px`.
  - Botón de cierre ampliado a 44×44px.
- **Ajuste de Altura en `PdfPreviewDialog` (`pdfPreviewDialog.css`):**
  - `height: min(calc(100dvh - var(--sc-safe-top) - 12px), 860px)` para evitar colisión con el notch superior en dispositivos iOS.
- **Botones Táctiles en Smart Sizer AISC y Ajustes (`aiscSteelDesignCard.css`, `totalHome.css`):**
  - `.aisc-adopt-btn`, `.aisc-canvas-focus-btn` y `.aisc-tab-btn` configurados con altura mínima táctil de 44px.
  - Botones de cierre y métricas en preferencias de Home elevados a $\ge$ 44px.

---

## 2. Verificación Ejecutada

Conforme al acuerdo de trabajo de `AGENTS.md` (política de verificación mínima):
- **Verificación de Tipos:** `bun run typecheck` (`tsc -b --noEmit`) $\to$ **0 errores**.
- **Linter de Calidad:** `bun run lint` (`oxlint`) $\to$ **0 errores, 0 advertencias en 798 archivos**.
- **Frontera Protegida:** `bun scripts/check-protected-baseline.mjs` $\to$ **55/55 archivos intactos**.
- **Presupuesto de Rendimiento:** `bun scripts/check-performance-budget.mjs` $\to$ **372,486 bytes gzip** ($\le 380,000$ bytes límite permitido).
- **Compilación de Producción:** `bun run build` $\to$ **exitosa en 748 ms**.
- **Pruebas Unitarias de Componentes Modificados:**
  - `src/features/canvas/ToolRail.test.tsx` (16/16 pruebas superadas)
  - `src/features/canvas/CanvasOrientationCompass.test.tsx` (5/5 pruebas superadas)
  - `src/features/results/ResultsPanel.test.tsx` (24/24 pruebas superadas)
  - `src/features/workspace/AppShellLayout.test.tsx` (3/3 pruebas superadas)
  - `src/features/workspace/clayWorkspacePhase2.test.ts` (9/9 pruebas superadas)
  - `src/features/results/resultCardContracts.test.tsx` (6/6 pruebas superadas)
  - `src/features/canvas/canvasEvidenceRailStyles.test.ts` (1/1 prueba superada)
  - `src/App.test.tsx` (38/38 pruebas superadas)
