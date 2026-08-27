# structureCo — Design Spec (brand truth for the video campaign)

Source: `src/design-system/tokens.css` (repo root, two levels up) + `public/favicon.svg`. This file is the brand truth for every video in the 10-piece campaign; do not invent colors, UI panels, or features not listed here.

## Palette (Noche / dark — campaign default)

- `bg-app: #08110e` · `bg-canvas: #060b09` · `surface-1: #101915` · `surface-2: #16231d`
- `accent (brand green): #39d4a2` · `accent-hover: #3bcb9a` · logo solid: `#157A55` (white glyph)
- `structure-member (lines): #f1f5f4` · `grid: #202a2b` · `grid-strong: #2c3539`
- `text-primary: #f2f7f4` · `text-secondary: #b8c8c0` · `text-muted: #91a299`
- `load: #ff7d66` · `axial: #6bcbf1` · `shear: #78dc94` · `moment: #ff79ac` · `deformed: #5bdae2` · `reaction: #9baaff` · `dimension: #ffd56a` · `aula (violet): #9a83f0` · `selection/focus: #78a8ff`

## Typography

- Display / wordmark / titles: **Inter**, weight 750-800.
- Body / on-screen captions: **Inter**, weight 550-650.
- Technical values, coordinates, units: **JetBrains Mono**, weight 400-700, tabular numerals.

## Motion language

- Entrances: smooth long-tail settle, `power3.out` / `expo.out` — **no bouncy `back.out` overshoot** anywhere (brief explicitly bans "explosiones ni efectos excesivos").
- Camera: slow, single-purpose moves only (push-in, gentle dolly) — no whip pans, no shake.
- Structural lines draw on via measured `stroke-dashoffset` (svg-path-draw), never instantly appear.
- Nodes pop with a calm scale 0→1 (power3.out), never elastic.

## Logo

- Glyph: exact path from `public/favicon.svg` — a 64×64 rounded square (`rx=15`) filled `#157A55`, with a white "S"-shaped path on top. Reproduce the path data verbatim at any scale; never redraw or reinterpret the glyph.
- Wordmark: "structureCo" set in Inter 750, `text-primary` on dark backgrounds.

## Confirmed UI vocabulary (do not exceed)

Topbar, tool rail (Seleccionar/Desplazar, Nodo/Miembro/Apoyo, Carga puntual/distribuida/Momento, Cota/Corte), canvas grid with nodes/members/supports/dimensions, Centro Analítico (Resumen/Reacciones, Axial/Cortante/Momento, Deformada, Influencia, Aprender, Avisos), Inspector (N máx/V máx/M máx), Modo Aula (Construye/Define/Predice/Analiza/Compara/Concluye), Centro de Importación (Archivo/Inspección/Contenido/Destino/Confirmar/Resultado; JSON structureCo / PDF inteligente / Expediente .structureco).

## This video (01 — Revelación de Marca)

Background stays `#060b09` throughout, no color shifts. Single continuous scene, no hard cuts — everything is one unbroken build: retícula → nodos → armadura de líneas → simplificación → glifo "S" sólido → wordmark. Duration 14s, 1920×1080.
