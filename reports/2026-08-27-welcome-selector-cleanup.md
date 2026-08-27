# Limpieza de selectores heredados de Welcome

## Inventario

`src/styles.css` declaraba 103 clases con prefijo `welcome-`. La búsqueda en
`src/**/*.{ts,tsx}` separó los consumidores reales de coincidencias que no
aplican estilos:

- **15 clases reales**: `.welcome-import-card`, `.welcome-import-icon`,
  `.welcome-import-text`, `.welcome-launcher-arrow` y las once clases
  `.welcome-cycle-*` emitidas por `WorkCycleGlyph.tsx`.
- **Coincidencias no consumidoras**: `welcome-screen` sólo es un
  `data-testid`; `.welcome-steps`, `.welcome-template-card` y
  `.welcome-brand-line` aparecen en aserciones; `.welcome-badge--beam` aparece
  en un comentario de una prueba de tokens.
- **88 clases retiradas**: `.welcome-screen`, `.welcome-header`,
  `.welcome-workflow` y el resto de la antigua composición (brand, content,
  launcher, showcase, templates, workflow, footer, stage, gates, steps,
  panels, resume y navegación).

## Cambio

Se eliminaron de la hoja global las reglas base y todos sus overrides tardíos,
incluidos los alojados en media queries de Compact, reducción de movimiento,
puntero coarse y orientación apaisada. Las reglas de las 15 clases que sí se
emiten desde TSX se trasladaron, conservando su orden de cascada y sus media
queries, a `src/features/welcome/totalHome.css`.

La prueba estática del contrato de Home exige que `src/styles.css` permanezca
libre de cualquier selector `.welcome-*` y nombra explícitamente las tres
familias representativas retiradas en la hoja de la feature.
