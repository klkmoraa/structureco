# Reporte: Habilitación de Canvas Director HUD y Sólido 2.5D en Móviles + Invalidación de Caché PWA

**Fecha:** 2026-09-05  
**Autor:** Antigravity  
**Alcance:** UI / Móvil / Lienzo Estructural / PWA Cache

## Contexto y Causa Raíz
1. **Director HUD no visible en móviles**: En `StructuralCanvas.tsx`, la condición `visible={Boolean((analysis?.success || project.members.length > 0) && !compactCanvasChrome)}` ocultaba por completo el HUD del Director en teléfonos y pantallas compactas (`compactCanvasChrome` / `shellClass === 'K0'`). Esto impedía el acceso directo a la vista cinemática, oscilador armónico y el nuevo modo **Sólido 2.5D**.
2. **Caché PWA / Navegador móvil persistente**: `SERVICE_WORKER_URL` en `src/platform/pwaLifecycle.ts` permanecía con el token del 25 de agosto, por lo que dispositivos móviles con PWA activa o Service Worker registrado mantenían el bundle compilado previo en caché.

## Cambios Realizados
1. **`src/features/canvas/StructuralCanvas.tsx`**:
   - Eliminada la restricción `!compactCanvasChrome` para que `CanvasDirectorHud` esté disponible en dispositivos móviles.
   - Suministrada la propiedad `compact={compactCanvasChrome}` al componente.
2. **`src/features/canvas/CanvasDirectorHud.tsx`**:
   - Soporte para prop `compact?: boolean` con clase CSS `is-compact-hud` y atributo `data-compact`.
   - Reubicación del botón `[ 🧊 Sólido 2.5D / Wireframe ]` a la **primera posición** del HUD, garantizando acceso táctil inmediato sin requerir scroll horizontal en teléfonos.
3. **`src/features/canvas/mobileCanvasDensity.css`**:
   - Reglas específicas para `.canvas-director-hud` en `@media (max-width: 700px)`:
     - Centrado horizontal con `max-width: calc(100vw - 16px)`, `overflow-x: auto`, `scrollbar-width: none` y `-webkit-overflow-scrolling: touch`.
     - Touch targets optimizados (32px de altura) y espaciado compacto sin colisión con controles superiores ni con el dock inferior.
4. **`src/platform/pwaLifecycle.ts`**:
   - Incrementado `SERVICE_WORKER_URL` a `./sw.js?rev=2026-09-05-canvas-solid-2.5d` para forzar la actualización del Service Worker en navegadores y PWAs instaladas.
5. **Pruebas unitarias**:
   - Añadida prueba en `src/features/canvas/CanvasDirectorHud.test.tsx` verificando los atributos y clases del modo compacto.

## Verificación Ejecutada
- `bun node_modules/.bin/vitest run src/features/canvas/CanvasDirectorHud.test.tsx src/features/canvas/isometricExtrusion.test.ts src/features/canvas/CanvasSolidExtrusionLayer.test.tsx`: 15/15 pruebas pasaron.
- `bun node_modules/.bin/vitest run src/platform/pwaLifecycle.test.ts`: 3/3 pruebas pasaron.
- `oxlint`: 0 warnings, 0 errors en 796 archivos.
- `tsc -b --noEmit`: 0 errores de tipos.
- `scripts/check-protected-baseline.mjs`: 55 archivos frontera protegida verificados intactos.
- `bun run build && scripts/check-performance-budget.mjs`: Presupuesto de entrada aprobado: 1359999 bytes / 372411 gzip (límite 1400000 / 380000).
