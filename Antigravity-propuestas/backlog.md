# Backlog Tecnológico y de Producto — Antigravity

Este documento registra todas las oportunidades de mejora identificadas en **structureCo**, clasificadas por prioridad, complejidad y estado.

---

## Propuestas Prioritarias (En Evaluación / redactadas)

| ID | Nombre | Categoría | Prioridad | Complejidad | Estado | Dependencias | Descripción Breve |
|---|---|---|---|---|---|---|---|
| **AG-003** | Refactorización Declarativa del Módulo de Expedientes y Memorias PDF | PDF / Arquitectura | Media | Alta | En evaluación | Ninguna | Descomponer la lógica imperativa monolítica de `calculationPdf.ts` (1,600+ líneas) en un patrón Builder declarativo con plantillas independientes. |

---

## Propuestas Implementadas

| ID | Nombre | Categoría | Estado | Resultado |
|---|---|---|---|---|
| **AG-001** | Rediseño de Gestión de Estado Global y Desacoplamiento de Componentes Canvas | Arquitectura / UI | **Implementada** (2026-08-05) | Segregación de contextos React (`ProjectModelContext`, `ProjectAnalysisContext`, `WorkspaceUIContext`), conservación de fachada `useProject()` y descomposición de `StructuralCanvas.tsx` en `CanvasGeometryLayer`, `CanvasResultLayer` y `CanvasInteractionLayer`. |
| **AG-002** | Optimización de Renderizado SVG del Canvas y Algoritmos de Snapping | Rendimiento / Canvas | **Implementada** (2026-08-05) | Cuadrícula espacial de broad-phase para las intersecciones, hash de puntos para colapsar coincidencias, barrido sin asignaciones en `resolveSnap` y perpendiculares memoizadas por revisión del modelo. Coste por `pointermove` con 150 miembros: 0,412 ms → 0,018 ms. |
| **AG-004** | Sistema de Diseño UX/UI Móvil y Paneles Responsive Adaptativos | UX / UI / Responsive | **Implementada** (2026-08-05) | Integración de CSS Container Queries (`@container results-panel`), unidades dinámicas `dvh`, corrección de targets táctiles $\ge 44\text{px}$ bajo `@media (pointer:coarse)` y sincronización del alto del panel con `visualViewport` sin listeners extra. |
| **AG-005** | Introducción de Solucionador Disperso (Sparse Matrix Solver) para el Motor Matricial | Solver / Rendimiento | **Implementada** (2026-08-05, Fase A) | Vía dispersa CSR + LDLᵀ con RCM sobre el bloque reducido, tras eliminar las restricciones de un solo grado. Factorización 5x más rápida (180→36 ms a 980 incógnitas). |

---

## Oportunidades en Lista de Espera (Futuras Propuestas)

- **AG-006**: Sistema de Undo/Redo Granular y Transacciones de Selección Independent.
- **AG-007**: Modulación de Catálogos i18n con Lazy Loading para Reducción de Bundle Inicial.
- **AG-008**: Cobertura de Pruebas Visuales Automatizadas de Diagramas N-V-M con Visual Regression Testing en Playwright.
- **AG-009**: Sistema de Presets de Materiales y Perfiles Estructurales Estándar (AISC, Eurocódigo) en Modo Completo.
- **AG-010**: Exportación a Formato DXF / STEP para Integración CAD Profesional.
- **AG-011**: Perfilar el análisis completo para localizar el coste dominante fuera del solucionador lineal. Surge de AG-005.
- **AG-012**: Fase B de AG-005 — complemento de Schur para extender la vía dispersa a modelos con vínculos rígidos y apoyos deslizantes inclinados.
