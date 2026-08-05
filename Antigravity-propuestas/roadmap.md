# Roadmap Tecnológico y Secuencia de Implementación — Antigravity

Este roadmap establece la secuencia óptima para implementar las propuestas de mejora en **structureCo**, minimizando el riesgo de regresiones en la frontera matemática protegida y maximizando el impacto en la experiencia del usuario y la mantenibilidad.

---

## Fases del Roadmap

```text
[FASE 1: Fundamentos de UX & Frontend]
  ├── AG-004: UX/UI Responsive y Paneles Táctiles — ✅ Implementada
  └── AG-001: Rediseño de Estado Global y Desacoplamiento de Canvas — ✅ Implementada
         |
         v
[FASE 2: Rendimiento Visual y Generación de Expedientes]
  ├── AG-002: Optimización SVG & Snapping R-Tree — ✅ Implementada
  └── AG-003: Refactorización Declarativa del Módulo PDF — ✅ Implementada
         |
         v
[FASE 3: Escalabilidad del Motor Matemático]
  └── AG-005: Solucionador de Matriz Dispersa (Sparse LDLT/Cholesky) — ✅ Implementada
```

---

## Detalle por Fase

### Fase 1: Fundamentos de UX y Arquitectura de Estado
1. **AG-004 (UX/UI Responsive y Paneles Táctiles)** — ✅ **Implementada** (2026-08-05):
   - *Resultado*: Migración exitosa de `ResultsPanel` a CSS Container Queries (`@container results-panel (max-width: 560px)`), unidades `dvh` e integración de targets táctiles $\ge 44\text{px}$ bajo `@media (pointer:coarse)`.
2. **AG-001 (Rediseño de Estado Global y Desacoplamiento de Canvas)** — ✅ **Implementada** (2026-08-05):
   - *Resultado*: División de contextos React (`ProjectModelContext`, `ProjectAnalysisContext`, `WorkspaceUIContext`), conservación de fachada `useProject()` y descomposición de `StructuralCanvas.tsx` en `CanvasGeometryLayer`, `CanvasResultLayer` y `CanvasInteractionLayer`.

### Fase 2: Rendimiento Visual y Publicación Editorial
3. **AG-002 (Optimización SVG & Snapping R-Tree)** — ✅ **Implementada** (2026-08-05):
   - *Dependencia*: AG-001 (desbloqueada gracias a las sub-capas del Canvas; la capa SVG memoizada de la
     Fase 3 ya quedó cubierta allí).
   - *Resultado*: Cuadrícula espacial de broad-phase en `buildIntersectionSnapCandidates`, hash de puntos
     para el deduplicado, barrido sin asignaciones en `resolveSnap` y perpendiculares memoizadas por
     revisión del modelo. Coste por `pointermove` con 150 miembros: 0,412 ms → 0,018 ms, muy por debajo
     del presupuesto de 2 ms.
4. **AG-003 (Refactorización Declarativa del Módulo PDF)** — ✅ **Implementada** (2026-08-05):
   - *Razón*: Limpia la deuda técnica de las 1.058 líneas imperativas de `calculationPdf.ts`, haciendo mantenible la generación de informes editoriales sin riesgo para la UI.
   - *Resultado*: 13 módulos bajo `src/utils/pdf/` con `PdfLayout` como único dueño del cursor vertical;
     el orquestador queda en ~90 líneas. Fidelidad verificada operador a operador con PDF.js: todas las
     páginas idénticas salvo el índice de sección duplicado (`05` → `06`), que se corrigió. `pdf-lib`
     sigue fuera del chunk inicial (630 240 bytes eager, sin cambio).

### Fase 3: Escalabilidad del Motor Matemático
5. **AG-005 (Solucionador de Matriz Dispersa - Sparse Solver)** — ✅ **Implementada** (2026-08-05, Fase A):
   - *Ejecutada fuera de orden por petición del usuario*.
   - *Resultado*: Factorización 5x más rápida. Se identificó la necesidad de AG-011 para medir el $90\%$ del tiempo de análisis restante.

---

## Cambios Rápidos vs. Cambios de Alto Riesgo

- **Cambios Rápidos (Quick Wins)**: AG-004 (✅), AG-003 (✅).
- **Cambios Estructurales de Medio Riesgo**: AG-001 (✅), AG-002 (✅).
- **Cambios de Alto Riesgo (Frontera Protegida)**: AG-005 (✅).
