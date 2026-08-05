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
[FASE 3: Escalabilidad del Motor y Funcionalidades Profesionales]
  ├── AG-005: Solucionador de Matriz Dispersa (Sparse LDLT/Cholesky) — ✅ Implementada
  ├── AG-011: Perfilado del Análisis Completo para Localizar Cuellos de Botella — ✅ Implementada
  ├── AG-009: Presets de Materiales y Perfiles Estructurales AISC / Eurocódigo
  └── AG-010: Exportación Vectorial CAD a Formato DXF
```

---

## Detalle por Fase

### Fase 1: Fundamentos de UX y Arquitectura de Estado
1. **AG-004 (UX/UI Responsive y Paneles Táctiles)** — ✅ **Implementada** (2026-08-05).
2. **AG-001 (Rediseño de Estado Global y Desacoplamiento de Canvas)** — ✅ **Implementada** (2026-08-05).

### Fase 2: Rendimiento Visual y Publicación Editorial
3. **AG-002 (Optimización SVG & Snapping R-Tree)** — ✅ **Implementada** (2026-08-05).
4. **AG-003 (Refactorización Declarativa del Módulo PDF)** — ✅ **Implementada** (2026-08-05).

### Fase 3: Escalabilidad del Motor y Funcionalidades Profesionales
5. **AG-005 (Solucionador de Matriz Dispersa - Sparse Solver)** — ✅ **Implementada** (2026-08-05, Fase A).
6. **AG-011 (Perfilado del Motor)** — ✅ **Implementada** (2026-08-05):
   - *Resultado*: `performanceProfiler.ts` + instrumentación en `solver.ts` (overhead cero cuando inactivo). El cuello de botella real no es el solucionador lineal ni los diagramas: es `educationTrace` (trazas de matrices para la trazabilidad educativa), 58–64 % del tiempo total a 300 miembros.
7. **AG-009 (Presets de Materiales y Perfiles AISC)**:
   - *Impacto*: Catálogo comercial directo en el Inspector (Acero A36/A992, perfiles IPE/W/HSS).
8. **AG-010 (Exportación DXF para CAD)**:
   - *Impacto*: Exportación directa para AutoCAD, Revit y FTOOL.
