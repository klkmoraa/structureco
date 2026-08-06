# Backlog Tecnológico y de Producto — Antigravity

Este documento registra todas las oportunidades de mejora identificadas en **structureCo**, clasificadas por prioridad, complejidad y estado.

---

## Propuestas Prioritarias (En Evaluación / Aprobadas)

| ID | Nombre | Categoría | Prioridad | Complejidad | Estado | Dependencias | Descripción Breve |
|---|---|---|---|---|---|---|---|
| **AG-006** | Sistema de Undo/Redo Granular y Transacciones de Selección | UX / Store | Media | Media | En evaluación | AG-001 | Aislar el historial de deshacer/rehacer a mutaciones estructurales sin resetear la selección de UI. |

---

## Propuestas Implementadas

| ID | Nombre | Categoría | Estado | Resultado |
|---|---|---|---|---|
| **AG-014 Consolidada** | Fases 2, 3 y 4: Sustitución en Aula, Táctil ≥44px y Anexo PDF Editorial | UX / Educación / PDF | **Implementada** (2026-08-05) | Sustitución numérica verificada contra `frameLocalStiffness()`; primitiva `table()` en `PdfLayout` y anexo reglado; suelo táctil para `a[href]`. Las Fases 3 y 4.1 no reproducían su diagnóstico — ver notas en la propuesta. |
| **AG-014A** | Fase 1: Presets de Materiales/Perfiles y Casos de Carga | UX / Inspector | **Implementada** (2026-08-05) | Retención de nombres en selectores optimizada y guía intuitiva de casos de carga integrada. |
| **AG-001** | Rediseño de Gestión de Estado Global y Desacoplamiento de Componentes Canvas | Arquitectura | **Implementada** (2026-08-05) | Segregación de contextos React y descomposición de `StructuralCanvas.tsx`. |
| **AG-002** | Optimización de Renderizado SVG del Canvas y Algoritmos de Snapping | Rendimiento | **Implementada** (2026-08-05) | Cuadrícula espacial de broad-phase, coste por `pointermove` 0,412 ms → 0,018 ms. |
| **AG-003** | Refactorización Declarativa del Módulo de Expedientes y Memorias PDF | PDF | **Implementada** (2026-08-05) | Descomposición en 13 módulos bajo `src/utils/pdf/`. |
| **AG-004** | Sistema de Diseño UX/UI Móvil y Paneles Responsive Adaptativos | UX / Móvil | **Implementada** (2026-08-05) | Unidades `dvh` y corrección de targets táctiles $\ge 44\text{px}$. |
| **AG-005** | Introducción de Solucionador Disperso (Sparse Matrix Solver) | Solver | **Implementada** (2026-08-05) | Factorización 5x más rápida a 980 incógnitas. |
| **AG-009** | Presets de Materiales y Perfiles Estructurales Estándar | Producto | **Implementada** (2026-08-05) | Catálogos `standardMaterials.ts` y `standardSections.ts`. |
| **AG-011** | Perfilado y Medición del Análisis Completo | Rendimiento | **Implementada** (2026-08-05) | Hallazgo clave: la traza educativa consume 60% del tiempo. |
| **AG-013** | Generación Diferida (Lazy Loading) de Trazas Educativas `educationTrace` | Rendimiento | **Implementada** (2026-08-05) | Mejora 2.57x al recalcular trazas solo a demanda. |
