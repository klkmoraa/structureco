# Roadmap Tecnológico y Secuencia de Implementación — Antigravity

Este roadmap establece la secuencia óptima para implementar las propuestas de mejora en **structureCo**, minimizando el riesgo de regresiones en la frontera matemática protegida y maximizando el impacto en la experiencia del usuario y la mantenibilidad.

---

## Fases del Roadmap

```text
[FASE 1: Fundamentos de UX & Frontend]
  ├── AG-004: UX/UI Responsive y Paneles Táctiles
  └── AG-001: Rediseño de Estado Global y Desacoplamiento de Canvas
         |
         v
[FASE 2: Rendimiento Visual y Generación de Expedientes]
  ├── AG-002: Optimización SVG & Snapping R-Tree
  └── AG-003: Refactorización Declarativa del Módulo PDF
         |
         v
[FASE 3: Optimización del Core Matemático y Escalabilidad]
  └── AG-005: Solucionador de Matriz Dispersa (Sparse LDLT/Cholesky)
```

---

## Detalle por Fase

### Fase 1: Fundamentos de UX y Arquitectura de Estado
1. **AG-004 (UX/UI Responsive y Paneles Táctiles)**:
   - *Razón*: Resuelve inmediatamente problemas de usabilidad móvil y desbordamientos en pantallas pequeñas sin tocar la lógica del motor ni la frontera protegida.
   - *Impacto*: Alto impacto en el usuario de iOS/Android y pantallas táctiles.
2. **AG-001 (Rediseño de Estado Global y Desacoplamiento de Canvas)**:
   - *Razón*: Descompone `ProjectContext.tsx` y `StructuralCanvas.tsx`, estableciendo la base modular sobre la cual se aplicarán optimizaciones posteriores.

### Fase 2: Rendimiento Visual y Publicación Editorial
3. **AG-002 (Optimización SVG & Snapping R-Tree)**:
   - *Dependencia*: AG-001 (requiere que el Canvas esté modularizado en capas).
   - *Impacto*: Mantiene 60 FPS durante la interacción y arrastre de nodos en modelos complejos.
4. **AG-003 (Refactorización Declarativa del Módulo PDF)**:
   - *Razón*: Limpia la deuda técnica de 1,600+ líneas imperativas en `calculationPdf.ts`, haciendo mantenible la generación de informes editoriales sin riesgo para la UI.

### Fase 3: Escalabilidad del Motor Matemático
5. **AG-005 (Solucionador de Matriz Dispersa - Sparse Solver)** — ✅ **Implementada** (2026-08-05, Fase A):
   - *Ejecutada fuera de orden*, antes que las fases 1 y 2, por petición directa del usuario.
   - *Resultado*: factorización 5x más rápida, pero el análisis completo apenas cambia porque
     el sistema lineal solo representaba el 10 % del tiempo. La premisa de matriz definida
     positiva del documento original era incorrecta (el sistema real es simétrico indefinido)
     y se corrigió durante la implementación.
   - *Lección para el roadmap*: **medir antes de optimizar**. AG-005 se priorizó asumiendo que
     el solucionador era el cuello de botella; no lo era. El seguimiento natural es AG-011
     (perfilar el análisis completo), no AG-012 (Fase B del solver disperso).

---

## Cambios Rápidos vs. Cambios de Alto Riesgo

- **Cambios Rápidos (Quick Wins)**: AG-004, AG-003.
- **Cambios Estructurales de Medio Riesgo**: AG-001, AG-002.
- **Cambios de Alto Riesgo (Frontera Protegida)**: AG-005 (requiere verificación estricta contra `PROTECTED_BASELINE.sha256` y suite Vitest).
