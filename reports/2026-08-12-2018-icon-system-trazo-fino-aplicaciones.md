# Icon System v2 — trazo fino, aplicaciones y réplica de interfaz

**Fecha:** 2026-08-12 20:18 UTC
**Agente:** Claude Code
**Rama:** claude/structureco-icon-system-6th5bd

## Qué cambió

Segunda iteración del Icon System Board (`brand/icon-system-board.html`), sobre el commit anterior 94d65f6:

1. **Trazo fino.** Todos los glyphs bajaron de stroke 1.75 → **1.4** (regular) y 2.3 → **1.75** (dense a 16px). Con menos peso el dibujo se rehizo con más precisión: cabezas de flecha más esbeltas (4.0 × 4.2 en vez de 5.6 × 4.6), puntos sólidos más pequeños (r 1.15–1.4 en vez de 1.3–1.7), anillos de socket de r 2.05, tramas de suelo más finas y las sub-anchuras internas reescaladas en proporción. El resultado renderiza ≈1.17px tanto a 20px como a 16px dense — peso óptico constante.
2. **Glyph `units` rediseñado.** La versión anterior (línea + ticks colgando) se leía como comillas a tamaño pequeño; ahora es un escalímetro cerrado (rectángulo + 3 ticks internos).
3. **Sección nueva "Aplicaciones" (07).** Los glyphs dentro de los controles que ya existen en producto: tool rail 164px y compacto 76px, zona de acciones del topbar, chips de los 6 estados de análisis, tabs de resultados N/V/M/Deformada, filas de propiedad del inspector, stepper de Aula y dock móvil.
4. **Sección nueva "Réplica de la interfaz" (08).** El workspace completo con la iconografía nueva, usando las medidas reales de `tokens.css` (topbar 68px, rail 164px, inspector 320px): topbar con proyecto/combinación/unidades/analizar, rail con grupos, canvas con un pórtico (apoyo articulado + rodillo + carga distribuida + cota) y el inspector con propiedades y resultados. Los apoyos del canvas se dibujan con la misma gramática que los iconos, a escala de modelo.

Nada de esto toca código de producto: sigue siendo un documento de diseño en `brand/`.

## Por qué

El usuario pidió explícitamente iconos menos gruesos y ver el sistema aplicado ("pon aplicaciones etc etc haz una copia de la interfaz pero con esos iconos nuevos"). El trazo de 1.75 leía como librería de UI genérica; 1.4 sobre grid de 24 es el peso de un lápiz de precisión, que es lo que separa "herramienta de ingeniería" de "app de consumo".

## Archivos tocados

- `brand/icon-system-board.html` — modificado. Trazo fino en toda la familia, glyph `units` rediseñado, dos secciones nuevas (Aplicaciones e Interfaz), navegación e índices de sección actualizados. ~208KB.
- `reports/2026-08-12-2018-icon-system-trazo-fino-aplicaciones.md` — este reporte.

## Cómo verificar

Abrir `brand/icon-system-board.html` en un navegador (autocontenido, sin build). Secciones nuevas: "Aplicaciones" e "Interfaz" en el índice superior. Probar el toggle Light/Auto/Dark — la réplica del workspace tiene tokens de canvas propios para ambos temas. Verificado con Playwright + Chromium headless: sin errores de consola, sin overflow horizontal a 1400px ni a 420px, y con el documento envuelto correctamente (`<title>` = "StructureCo Icon System").

## Pendiente / siguiente paso

- Sigue abierto lo mismo que en el reporte anterior: elegir definitivamente entre las 3 alternativas por icono en "Exploración ampliada" y portar los glyphs a `src/design-system/icons/structural.tsx` para reemplazar los de `lucide-react` en el producto real.
- Al portarlos, el stroke de `structural.tsx` (hoy 1.8) debe bajar a 1.4 para coincidir con este sistema, y conviene exponer el peso `dense` (1.75) para los usos a 16px y el dock móvil.
