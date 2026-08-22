# Inicio/Home Clay · Fase 7 Implementation Plan

**Clasificación:** `AUDIT/TEMPORARY`

**Goal:** Reconstruir la portada de Inicio como Home funcional Clay, preservando todos los flujos existentes y usando `ProjectHub` como única biblioteca de datos local.

**Architecture:** `WelcomeScreen` deja de depender visualmente del carril de pasos. El estado de plantillas y formas secundarias vive en una hoja accionada desde “más formas de empezar”; los diálogos y callbacks existentes se reutilizan. El CSS se encapsula bajo una clase Home nueva, con composición explícita X2/M1/K0.

**Tech Stack:** React, TypeScript, Vitest/Testing Library, `motion/react`, tokens Clay y Playwright/Chromium existentes.

## Restricciones

- No modificar motor, solver, data model, persistencia, repositorio, import/export, workers, resultados, unidades, signos, IDs ni topología.
- Reutilizar `ProjectHub`, `PortableImportCenter`, `Phase2DxfAction`, `NewExerciseDialog`, `StructuralPortalHero` y rutas existentes; no crear páginas ficticias.
- No introducir `matchMedia` de componente: la composición debe seguir `data-shell-class`.
- No usar glassmorphism, blur decorativo, colores técnicos como ornamento ni texto de interfaz sin i18n.

## Tarea 1 · Caracterizar el Home nuevo antes de mover JSX

- [x] Escribir expectativas que distingan la portada del carril histórico: proyecto actual y biblioteca visibles; pasos/puertas secundarias disponibles bajo demanda.
- [x] Probar que nuevo lienzo, Aula, importación, DXF, Space 3D, modelos de ejemplo y abrir un proyecto del hub mantienen sus efectos.
- [x] Ejecutar rojo focal y fijar los nombres accesibles antes de sustituir la composición.

## Tarea 2 · Reorganizar WelcomeScreen sin cambiar flujos

- [x] Crear el bloque de proyecto actual y su acción de entrar a la Mesa usando `project.name`, nodos y barras reales.
- [x] Dejar crear, Aula e importar como acciones compactas; mover DXF, Space 3D y catálogo de ejemplos a la hoja “más formas de empezar”.
- [x] Reutilizar filtros y `presentExample`; al elegir un ejemplo conservar exactamente `replaceProject` y `onOpenWorkspace`.
- [x] Montar `ProjectHub` directamente bajo el bloque principal y mantener recuperaciones visibles cuando existan.

## Tarea 3 · Aplicar composición Clay X2/M1/K0

- [x] Añadir una clase Home aislada y reemplazar reglas del carril/panel histórico que ya no describan la portada.
- [x] Mantener DXF, Space 3D y catálogo bajo una ruta de demanda ya existente, sin hojas nuevas ni tarjetas abiertas por defecto.
- [x] Comprobar día/noche, estados hover/pressed y la reducción de movimiento.

## Tarea 4 · QA, evidencia y entrega

- [x] Añadir QA Chromium de cuatro escenarios y medir overflow, altura de la portada, carril móvil y ausencia de blur decorativo.
- [x] Ejecutar typecheck, tests focales, `verify:protected`, `verify:docs`, build y QA.
- [x] Crear reporte fechado, capturas y commit explícito sin incluir logs ajenos. Pedir confirmación nueva antes de push.
