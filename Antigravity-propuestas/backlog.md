# Backlog Tecnológico y de Producto — Antigravity

Este documento registra todas las oportunidades de mejora identificadas en **structureCo**, clasificadas por prioridad, complejidad y estado.

---

## Propuestas Prioritarias (En Evaluación / Aprobadas)

| ID | Nombre | Categoría | Prioridad | Complejidad | Estado | Dependencias | Descripción Breve |
|---|---|---|---|---|---|---|---|
| **AG-014A** | Fase 1: Presets de Materiales/Perfiles y Casos de Carga | UX / Inspector | Alta | Baja | **Implementada** | AG-009 | Retención de nombres en selectores y guía intuitiva de casos de carga. |
| **AG-014B** | Fase 2: Sustitución Numérica con Datos Reales en Modo Aula | Educación / Aula | Alta | Baja | En evaluación | AG-014A | Ecuaciones de rigidez sustituidas explícitamente con números reales del modelo. |
| **AG-014C** | Fase 3: Rediseño Responsive Móvil y Ajustes de Interfaz | UX / Mobile | Alta | Media | En evaluación | AG-014A | Eliminación de amontonamiento en móviles, unidades `dvh` y targets táctiles $\ge 44\text{px}$. |
| **AG-014D** | Fase 4: Rediseño Editorial del Expediente PDF y Anexo | PDF / Publicación | Alta | Media | En evaluación | AG-014A | Expediente PDF con maquetación ejecutiva y Anexo Técnico Verificable pulido. |
| **AG-006** | Sistema de Undo/Redo Granular y Transacciones de Selección | UX / Store | Media | Media | En evaluación | AG-001 | Aislar el historial de deshacer/rehacer a mutaciones estructurales sin resetear la selección de UI. |

---

## Propuestas Descartadas

| ID | Nombre | Motivo |
|---|---|---|
| **AG-010** | Exportación Vectorial CAD a Formato DXF | Descartada por decisión del usuario (enfoque centrado en aplicación web y memorias PDF). |

---

## Propuestas Implementadas

| ID | Nombre | Categoría | Estado | Resultado |
|---|---|---|---|---|
| **AG-001** | Rediseño de Gestión de Estado Global y Desacoplamiento de Componentes Canvas | Arquitectura / UI | **Implementada** (2026-08-05) | Segregación de contextos React (`ProjectModelContext`, `ProjectAnalysisContext`, `WorkspaceUIContext`), conservación de fachada `useProject()` y descomposición de `StructuralCanvas.tsx` en `CanvasGeometryLayer`, `CanvasResultLayer` y `CanvasInteractionLayer`. |
| **AG-002** | Optimización de Renderizado SVG del Canvas y Algoritmos de Snapping | Rendimiento / Canvas | **Implementada** (2026-08-05) | Cuadrícula espacial de broad-phase para las intersecciones, hash de puntos para colapsar coincidencias, barrido sin asignaciones en `resolveSnap` y perpendiculares memoizadas por revisión del modelo. Coste por `pointermove` con 150 miembros: 0,412 ms → 0,018 ms. |
| **AG-003** | Refactorización Declarativa del Módulo de Expedientes y Memorias PDF | PDF / Arquitectura | **Implementada** (2026-08-05) | `calculationPdf.ts` (1.058 líneas) descompuesto en 13 módulos bajo `src/utils/pdf/`: `PdfLayout` (cursor vertical, saltos de página, `text`/`heading`/`row`), chrome editorial, tipografía matemática, diagramas vectoriales y una sección por página. Documento impreso idéntico. |
| **AG-004** | Sistema de Diseño UX/UI Móvil y Paneles Responsive Adaptativos | UX / UI / Responsive | **Implementada** (2026-08-05) | Integración de CSS Container Queries (`@container results-panel`), unidades dinámicas `dvh`, corrección de targets táctiles $\ge 44\text{px}$ bajo `@media (pointer:coarse)` y sincronización del alto del panel con `visualViewport` sin listeners extra. |
| **AG-005** | Introducción de Solucionador Disperso (Sparse Matrix Solver) para el Motor Matricial | Solver / Rendimiento | **Implementada** (2026-08-05, Fase A) | Vía dispersa CSR + LDLᵀ con RCM sobre el bloque reducido, tras eliminar las restricciones de un solo grado. Factorización 5x más rápida (180→36 ms a 980 incógnitas). |
| **AG-009** | Presets de Materiales y Perfiles Estructurales Estándar (AISC / Eurocódigo) | Producto / Feature | **Implementada** (2026-08-05) | Catálogos `standardMaterials.ts` (12 materiales) y `standardSections.ts` (53 perfiles comerciales) con selectores agrupados integrados en el Inspector. |
| **AG-011** | Perfilado y Medición del Análisis Completo para Localizar el Cuello de Botella | Rendimiento / Engine | **Implementada** (2026-08-05) | Arnés de perfilado `performanceProfiler.ts` e instrumentación de 7 fases. **Hallazgo clave**: la generación de trazas educativas de matrices (`educationTrace`) consume el **58% - 64% del tiempo total** en modelos grandes. |
| **AG-013** | Generación Diferida (Lazy Loading) de Trazas Educativas de Matrices (`educationTrace`) | Solver / Rendimiento | **Implementada** (2026-08-05) | `analyzeProject` gana `options.includeEducationTrace` (default `true`); el lienzo interactivo, P-Delta, envolventes y líneas de influencia lo desactivan y `ProjectContext.ensureEducationTrace()` lo recalcula a demanda al abrir "Aprender" o exportar PDF. Medido en viga de 300 vanos: 1976 ms → 768 ms (**2.57x**). |
