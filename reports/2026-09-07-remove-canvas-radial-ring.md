# Reporte — Retiro del Menú Radial Contextual (Touch Radial Ring)

- **Fecha:** 2026-09-07
- **Área:** Canvas, Interacción Táctil
- **Motivo:** Petición directa del usuario (*"los botones q salen como en circulo no sirven y son muy estorbosos"*).

---

## 1. Descripción del Cambio

Se eliminó por completo el menú radial de botones circulares que florecía alrededor de cualquier nudo o barra al seleccionarse en el lienzo (`CanvasTouchRadialRing`):
- Los botones circulares obstruían la visibilidad directa de las entidades estructurales seleccionadas.
- Provocaban toques accidentales y entorpecían la interacción natural de selección e inspección tanto en móvil como en escritorio.

---

## 2. Archivos Modificados / Eliminados

- **`src/features/canvas/StructuralCanvas.tsx`:** Removido el bloque de renderizado del componente `<CanvasTouchRadialRing>`, su importación y la función auxiliar de soporte de nudo que dependía de él.
- **`src/features/canvas/CanvasTouchRadialRing.tsx`:** Archivo eliminado.
- **`src/features/canvas/CanvasTouchRadialRing.test.tsx`:** Archivo eliminado.
- **`src/features/canvas/phase2.css`:** Eliminadas las reglas CSS del anillo radial (`.canvas-touch-radial-ring`, `.radial-ring-center-btn`, `.radial-ring-btn*`).

---

## 3. Verificación Ejecutada

- **Pruebas unitarias y de integración:**
  - `CanvasOrientationCompass.test.tsx` (5/5 pasadas)
  - `CanvasResultLayer.test.tsx` (7/7 pasadas)
  - `CanvasDirectorHud.test.tsx` (5/5 pasadas)
  - `ToolRail.test.tsx` (16/16 pasadas)
  - `App.test.tsx` (38/38 pasadas)
- **Calidad de código y tipado:**
  - `bun run lint` (0 warnings, 0 errores en 798 archivos)
  - `bun run typecheck` (0 errores con `tsc -b --noEmit`)
- **Frontera protegida:** 55/55 archivos intactos.
- **Presupuesto de rendimiento:** 372,413 bytes gzip (límite: 380,000 bytes).
