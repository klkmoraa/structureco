# Sistema de iconografía propio — Icon System Board

**Fecha:** 2026-08-12 19:51 UTC
**Agente:** Claude Code
**Rama:** claude/structureco-icon-system-6th5bd

## Qué cambió

Se diseñó y documentó un sistema de iconografía propio para StructureCo: 51 glyphs organizados en 10 familias (Navegación, Geometría, Apoyos, Cargas, Topología, Propiedades, Análisis, Resultados N/V/M/Deformada, Estados de análisis, Aula), con gramática de construcción común (grid 24×24, stroke 1.75/2.3 dense, terminales round cap/join, firma de "socket punch" en juntas, dos lenguajes de flecha — sólida para vectores físicos, chevron para acciones de interfaz). Se entrega como un único documento HTML autocontenido (`brand/icon-system-board.html`) que sirve de Icon System Board: reglas de construcción, prueba de tamaño óptico (24/20/16px), uso de color semántico, la familia completa y una exploración con 3 alternativas visuales para los 14 iconos estructurales más críticos (Node, Member, Pin, Roller, Fixed, Point load, Distributed load, Moment, Cut, Split, N, V, M, Deformed), cada uno con una recomendación marcada.

No se tocó ningún componente de producto (botones, toolbars, layout) ni el motor de cálculo — es un documento de diseño, no una implementación de los glyphs dentro de `src/design-system/icons/`.

## Por qué

El usuario pidió un sistema de iconografía propio que reemplace la sensación de "librería genérica" (Lucide sin modificar) por una familia reconocible, técnicamente correcta y consistente con el brandbook Clay existente — sin inventar una segunda identidad visual ni rediseñar los contenedores de UI.

## Archivos tocados

- `brand/icon-system-board.html` — nuevo. Icon System Board completo, autocontenido (tipografía IBM Plex embebida como data URI desde `public/fonts/`, tokens de color/radio/sombra tomados de `src/design-system/tokens.css`, tema claro/oscuro con toggle). ~180KB.
- `reports/2026-08-12-1951-icon-system-board.md` — este reporte.

## Cómo verificar

Abrir `brand/icon-system-board.html` directamente en un navegador (no requiere build ni servidor). Navegar por el índice superior (Principios, Construcción, Óptico, Color, Familia, Variantes, Exploración) y probar el toggle Light/Auto/Dark en el header. Verificado sin errores de consola y sin overflow horizontal en desktop (1400px) y mobile (420px) con Playwright + Chromium headless.

## Pendiente / siguiente paso

- Este documento es la fase de exploración/decisión visual. Falta: elegir definitivamente entre las 3 alternativas por icono en la sección "Exploración ampliada" (ya hay una recomendación marcada por icono) y, una vez aprobado, portar los glyphs finales a `src/design-system/icons/structural.tsx` (que hoy solo cubre un subconjunto: Node, Member, Support, SplitMember, SectionCut, Dimension, PointLoad, DistributedLoad, MomentLoad) para reemplazar los iconos de `lucide-react` usados en toolbars/paneles de producto.
- No se implementó el reemplazo real de iconos en el producto — eso queda fuera de este alcance (era explícitamente "el glyph, no el botón").
