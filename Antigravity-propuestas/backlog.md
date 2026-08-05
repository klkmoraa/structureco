# Backlog Tecnológico y de Producto — Antigravity

Este documento registra todas las oportunidades de mejora identificadas en **structureCo**, clasificadas por prioridad, complejidad y estado.

---

## Propuestas Prioritarias (En Evaluación / redactadas)

| ID | Nombre | Categoría | Prioridad | Complejidad | Estado | Dependencias | Descripción Breve |
|---|---|---|---|---|---|---|---|
| **AG-001** | Rediseño de Gestión de Estado Global y Desacoplamiento de Componentes Canvas | Arquitectura / UI | Alta | Alta | En evaluación | Ninguna | Descomponer `ProjectContext.tsx` y `StructuralCanvas.tsx` en hooks/capas desacopladas para evitar re-renders innecesarios y mejorar mantenibilidad. |
| **AG-002** | Optimización de Renderizado SVG del Canvas y Algoritmos de Snapping | Rendimiento / Canvas | Alta | Media | En evaluación | AG-001 | Introducción de índice espacial (R-Tree) para snapping/selección y capa SVG memoizada para geometrías de alto número de miembros. |
| **AG-003** | Refactorización Declarativa del Módulo de Expedientes y Memorias PDF | PDF / Arquitectura | Media | Alta | En evaluación | Ninguna | Descomponer la lógica imperativa monolítica de `calculationPdf.ts` (1,600+ líneas) en un patrón Builder declarativo con plantillas independientes. |
| **AG-004** | Sistema de Diseño UX/UI Móvil y Paneles Responsive Adaptativos | UX / UI / Responsive | Alta | Media | En evaluación | Ninguna | Sustituir media queries frágiles en React por Container Queries, unidades `dvh`, drawers gestuales con físicas fluidas y targets táctiles $\ge 44\text{px}$. |

---

## Propuestas Implementadas

| ID | Nombre | Categoría | Estado | Resultado |
|---|---|---|---|---|
| **AG-005** | Introducción de Solucionador Disperso (Sparse Matrix Solver) para el Motor Matricial | Solver / Rendimiento | **Implementada** (2026-08-05, Fase A) | Vía dispersa CSR + LDLᵀ con RCM sobre el bloque reducido, tras eliminar las restricciones de un solo grado. Factorización 5x más rápida (180→36 ms a 980 incógnitas), pero el análisis completo apenas cambia: el sistema lineal era el 10 % del tiempo. La premisa SPD del documento original era incorrecta; ver la nota de implementación en el propio archivo. |

---

## Oportunidades en Lista de Espera (Futuras Propuestas)

- **AG-006**: Sistema de Undo/Redo Granular y Transacciones de Selección Independent.
- **AG-007**: Modulación de Catálogos i18n con Lazy Loading para Reducción de Bundle Inicial.
- **AG-008**: Cobertura de Pruebas Visuales Automatizadas de Diagramas N-V-M con Visual Regression Testing en Playwright.
- **AG-009**: Sistema de Presets de Materiales y Perfiles Estructurales Estándar (AISC, Eurocódigo) en Modo Completo.
- **AG-010**: Exportación a Formato DXF / STEP para Integración CAD Profesional.
- **AG-011**: Perfilar el análisis completo para localizar el coste dominante fuera del
  solucionador lineal. Surge de AG-005: tras acelerar 5x la factorización, el análisis de una
  viga de 300 vanos sigue tardando ~2,9 s, de los cuales solo 143 ms son el sistema lineal.
  Sin esta medición, cualquier trabajo adicional de rendimiento en el motor es a ciegas.
- **AG-012**: Fase B de AG-005 — complemento de Schur para extender la vía dispersa a modelos
  con vínculos rígidos y apoyos deslizantes inclinados, hoy resueltos por la vía densa.
  Depende de AG-011: solo vale la pena si el solucionador lineal resulta ser un coste
  relevante en algún escenario real.
