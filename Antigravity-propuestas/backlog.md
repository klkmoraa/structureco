# Backlog Tecnológico y de Producto — Antigravity

Este documento registra todas las oportunidades de mejora identificadas en **structureCo**, clasificadas por prioridad, complejidad y estado.

---

## Propuestas Prioritarias (En Evaluación / Aprobadas)

| ID | Nombre | Categoría | Prioridad | Complejidad | Estado | Dependencias | Descripción Breve |
|---|---|---|---|---|---|---|---|
| **AG-006** | Sistema de Undo/Redo Granular y Transacciones de Selección | UX / Store | Media | Media | En evaluación | AG-001 | Aislar el historial de deshacer/rehacer a mutaciones estructurales sin resetear la selección de UI. |
| **AG-007** | Modulación de Catálogos i18n con Carga Diferida (Lazy Loading) | Rendimiento / i18n | Media | Baja | En evaluación | Ninguna | Cargar diferidamente `es.json` y `en.json` reduciendo $\sim 60\text{ KB}$ de bundle inicial. |
| **AG-008** | Cobertura de Pruebas Visuales Automatizadas de Diagramas N-V-M con Playwright | Testing / QA | Media | Media | En evaluación | Ninguna | Integrar Visual Regression Testing pixel a pixel para diagramas de esfuerzos en Playwright. |
| **AG-009** | Presets de Materiales y Perfiles Estructurales Estándar (AISC / Eurocódigo) | Producto / Feature | Alta | Baja | En evaluación | Ninguna | Catálogo de aceros A36/A992, concretos y perfiles comerciales IPE/W/HSS en el Modo Completo. |
| **AG-010** | Exportación Vectorial CAD a Formato DXF | Import / Export | Media | Media | En evaluación | Ninguna | Generador nativo de archivos DXF para AutoCAD, Revit y FTOOL. |

---

## Propuestas Implementadas

| ID | Nombre | Categoría | Estado | Resultado |
|---|---|---|---|---|
| **AG-001** | Rediseño de Gestión de Estado Global y Desacoplamiento de Componentes Canvas | Arquitectura / UI | **Implementada** (2026-08-05) | Segregación de contextos React (`ProjectModelContext`, `ProjectAnalysisContext`, `WorkspaceUIContext`), conservación de fachada `useProject()` y descomposición de `StructuralCanvas.tsx` en `CanvasGeometryLayer`, `CanvasResultLayer` y `CanvasInteractionLayer`. |
| **AG-002** | Optimización de Renderizado SVG del Canvas y Algoritmos de Snapping | Rendimiento / Canvas | **Implementada** (2026-08-05) | Cuadrícula espacial de broad-phase para las intersecciones, hash de puntos para colapsar coincidencias, barrido sin asignaciones en `resolveSnap` y perpendiculares memoizadas por revisión del modelo. Coste por `pointermove` con 150 miembros: 0,412 ms → 0,018 ms. |
| **AG-003** | Refactorización Declarativa del Módulo de Expedientes y Memorias PDF | PDF / Arquitectura | **Implementada** (2026-08-05) | `calculationPdf.ts` (1.058 líneas) descompuesto en 13 módulos bajo `src/utils/pdf/`: `PdfLayout` (cursor vertical, saltos de página, `text`/`heading`/`row`), chrome editorial, tipografía matemática, diagramas vectoriales y una sección por página. Documento impreso idéntico. |
| **AG-004** | Sistema de Diseño UX/UI Móvil y Paneles Responsive Adaptativos | UX / UI / Responsive | **Implementada** (2026-08-05) | Integración de CSS Container Queries (`@container results-panel`), unidades dinámicas `dvh`, corrección de targets táctiles $\ge 44\text{px}$ bajo `@media (pointer:coarse)` y sincronización del alto del panel con `visualViewport` sin listeners extra. |
| **AG-005** | Introducción de Solucionador Disperso (Sparse Matrix Solver) para el Motor Matricial | Solver / Rendimiento | **Implementada** (2026-08-05, Fase A) | Vía dispersa CSR + LDLᵀ con RCM sobre el bloque reducido, tras eliminar las restricciones de un solo grado. Factorización 5x más rápida (180→36 ms a 980 incógnitas). |
| **AG-011** | Perfilado y Medición del Análisis Completo para Localizar el Cuello de Botella del Motor | Rendimiento / Engine | **Implementada** (2026-08-05) | Arnés de perfilado por fases (`performanceProfiler.ts`) instrumentado en `solver.ts`, overhead cero cuando está inactivo. Reveló que `educationTrace` (trazas de matrices para la trazabilidad educativa) domina el tiempo en modelos grandes (58–64 % a 300 miembros), no el solucionador lineal ni los diagramas. |
