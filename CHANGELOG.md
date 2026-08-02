# Changelog

Todos los cambios notables de structureCo se documentan en este archivo. Los
detalles de ejecución UX/UI permanecen en
`docs/ux-redesign/CHANGELOG_UX.md`.

## No publicado — 2026-08-02 · Rediseño visual integral

### Añadido

- Sistema de tokens ampliado (`src/design-system/tokens.css`): paleta semántica
  completa Día/Noche (identidad, superficies, texto, estados, roles
  estructurales formalizados), tokens de densidad, easings `emphasized` y
  `spring`, sombras en capas por tema. Los colores técnicos de diagramas
  conservan los valores verificados WCAG AA de 0.8.0.
- Iconografía estructural propia (`src/design-system/icons/structural.tsx`):
  26 glifos con gramática común (24 px · trazo 1.8 · terminales redondeados),
  incluidos glifos nuevos para Corte de sección y Dividir miembro que
  sustituyen iconos genéricos.
- Documentación del sistema de diseño (`docs/design-system/`): paleta,
  tipografía, espaciado/densidad, motion e iconografía; arquitectura frontend
  en `docs/architecture/FRONTEND.md`.
- Capa de refinamiento de microinteracciones: transición de subrayado en tabs,
  hover de filas en tablas de resultados, feedback de pulsación en
  herramientas y acciones, scrollbars finas tematizadas, animaciones de
  entrada en Bienvenida y popovers, transición coordinada Día/Noche; todo
  anulado bajo `prefers-reduced-motion`.

### Cambiado

- Tema Noche recalibrado a grafito frío profundo ("Laboratorio Nocturno") con
  capas de elevación diferenciadas; tema Día en porcelana técnica editorial.
- Reorganización frontend profesional: `src/components|ui|shell|styles` →
  `src/design-system/` (tokens, componentes, laboratorio) y `src/features/`
  (welcome, workspace, topbar, canvas, inspector, results, classroom,
  import-export). 80 archivos movidos con imports reescritos; sin cambios en
  `src/engine/`, `src/workers/`, `src/data/`, `src/store/` ni `src/types.ts`
  (frontera matemática intacta, suite 388/388 en verde).

## 0.8.0 — 2026-07-27

### Añadido

- Sistema visual, biblioteca de componentes y navegación canvas-first.
- Inspector responsive con edición numérica segura, unidades y validación inline.
- Centro analítico de Resultados y recorrido Aula guiado.
- Matrices de accesibilidad, i18n, responsive, touch, rendimiento y release QA.
- Documentación de baseline, mantenimiento, rollback y contribución.

### Cambiado

- Composición adaptativa para desktop, tablet y móvil.
- Carga diferida de superficies analíticas para reducir costo temprano.
- Feedback, foco, teclado, Light/Dark y presentación ES/EN.

### Preservado

- Motor matemático, unidades internas, signos, defaults físicos, precisión,
  topología, persistencia y formato de proyecto.

Consulta `docs/ux-redesign/RELEASE_NOTES_0.8.0.md` para el detalle de usuario y
`docs/ux-redesign/RELEASE_QA_REPORT.md` para la evidencia técnica.
