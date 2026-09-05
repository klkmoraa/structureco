# StructureCo Studio Implementation Plan

**Clasificación:** `REFERENCE`

> Implementar con superpowers:subagent-driven-development y revisión de cada unidad.

**Goal:** Renovar la interfaz completa y mejorar el descubrimiento de herramientas sin romper flujos existentes.

**Architecture:** Inicio conserva navegación y callbacks del producto. Búsqueda vive en un componente modal independiente. El editor mantiene el broker y recibe estilos propios y un modo de concentración. Tokens comunes actualizan las demás superficies.

**Tech Stack:** React 19, TypeScript, Vite, CSS, lucide-react, Vitest y navegador integrado; dependencias existentes.

**Spec:** docs/superpowers/specs/2026-09-05-studio-design.md

## Global Constraints

- No publicar ni integrar en main.
- No modificar solver, ProjectModel, persistencia de modelos, topología ni resultados numéricos.
- Mantener español e inglés, foco visible, teclado, móvil y ambos temas.
- No nuevas dependencias. Reporte en reports/ y capturas fuera de Git.

## Task 1: Inicio y búsqueda

- [x] Crear HomeSearch.tsx y pruebas de selección, teclado, Escape y búsqueda sin acentos.
- [x] Integrar en WelcomeScreen.tsx con Cmd/Ctrl+K y exclusión de otros diálogos.
- [x] Reorganizar Inicio según referencia; conservar datos reales y callbacks.
- [x] Añadir búsqueda y familias a Plantillas, con restablecimiento del filtro.
- [x] Renovar totalHome.css, verificar pruebas welcome y navegador.

## Task 2: Sistema y editor

- [x] Actualizar tokens neutrales y estilos del editor según spec.
- [x] Añadir modo de concentración reversible sin perder acceso a controles principales.
- [x] Actualizar pruebas de paleta autorizada; probar comportamiento de concentración y contratos existentes.
- [x] Verificar tipado y documentar los archivos modificados.

## Task 3: Integración y revisión

- [x] Actualizar dirección visual canónica.
- [x] Ejecutar gates, pruebas, lint y build; corregir fallos causados por cambios.
- [x] Revisar diffs y navegación real en ambos temas y tres tamaños.
- [x] Escribir reporte con evidencia y limitaciones; entregar rama y vista local.
