# Motion — Sistema de diseño structureCo

> Fuente de verdad: `src/styles/tokens.css` (sección 7), `src/ui/ui.css` (keyframes `sc-*`), `src/styles.css` (capa "REDISEÑO 2026-08" y animaciones de bienvenida).
> Filosofía: microinteracciones discretas de instrumento — el movimiento confirma, nunca decora. Todo anima **transform + opacity**; nada produce layout shifts.

## Tokens de duración

| Token | Valor | Uso |
| --- | --- | --- |
| `--sc-motion-instant` | `70ms` | Respuestas inmediatas |
| `--sc-motion-press` | `70ms` | Pulsación de botones (escala al presionar) |
| `--sc-motion-fast` | `140ms` | Tooltips, switches, hovers de fila, menús rápidos (`.popover`) |
| `--sc-motion-control` | `160ms` | Transición estándar de controles (color, borde, sombra, transform) |
| `--sc-motion-standard` | `220ms` | Superficies: popovers `sc-*`, overlays, cambio de tema |
| `--sc-motion-slow` | `360ms` | Entradas de diálogo/drawer, animaciones de bienvenida |
| `--sc-motion-loading` | `800ms` | Ciclo del spinner |

## Tokens de easing

| Token | Curva | Carácter |
| --- | --- | --- |
| `--sc-ease-standard` | `cubic-bezier(.22, 1, .36, 1)` | Curva base: desaceleración limpia |
| `--sc-ease-enter` | `cubic-bezier(.22, 1, .36, 1)` | Entradas (= standard) |
| `--sc-ease-exit` | `cubic-bezier(.4, 0, 1, 1)` | Salidas: aceleración franca |
| `--sc-ease-press` | `cubic-bezier(.2, .8, .2, 1)` | Pulsaciones |
| `--sc-ease-emphasized` | `cubic-bezier(.32, .72, 0, 1)` | Movimientos con intención (subrayado de tabs) |
| `--sc-spring-soft` | `cubic-bezier(.3, 1.18, .35, 1)` | Rebote suave (overshoot leve) |
| `--sc-spring-panel` | `cubic-bezier(.26, 1.08, .32, 1)` | Paneles con asentamiento elástico contenido |

## Paquetes de transición

| Token | Composición | Consumidores |
| --- | --- | --- |
| `--sc-transition-control` | `background-color`, `border-color`, `color`, `box-shadow`, `transform` — todo a `control/standard-ease` | Todos los controles `sc-*` (selector agrupado en `ui.css`), `.tool-button`, segmented, botones de bienvenida |
| `--sc-transition-theme` | `background-color` y `border-color` a `standard` (220ms), `color` a `fast` (140ms) | Cambio Día/Noche coordinado: `.app-shell`, `.topbar`, `.toolbar`, `.inspector-panel`, `.results-panel`, `.center-stage`, `.welcome-screen`, `.professional-note` |

## Qué anima cada superficie

| Superficie | Keyframe / mecanismo | Duración · easing | Movimiento |
| --- | --- | --- | --- |
| Popover legado (`.popover`, menús del topbar) | `sc-pop-in` (`styles.css`) | fast · enter | opacity 0→1, `translateY(-4px) scale(.98)` → identidad, `transform-origin: top` |
| Popover de librería (`.sc-popover__surface`) | `sc-surface-in` (`ui.css`) | standard · enter | opacity + `translate: 0 -4px` → 0 |
| Overlay modal (`.sc-overlay`) | `sc-fade-in` | standard · enter | opacity solamente |
| Diálogo (`.sc-modal-surface--dialog`) | `sc-dialog-in` | **slow** · enter | opacity + `translateY(12px) scale(.985)` → identidad |
| Drawer (`.sc-modal-surface--drawer`) | `sc-drawer-in` | slow · enter | opacity + `translateX(16px)` → 0 (lateral) |
| Bienvenida (`.welcome-hero`, `.welcome-options`, `.welcome-example-rail`) | `sc-fade-up` (`styles.css`) | slow · enter | opacity + `translateY(10px)` → 0 |
| Bienvenida, pasos (`.welcome-steps`) | `sc-fade-up` con **delay 120ms** | slow · enter | Escalonado de un solo nivel |
| Tabs de Inspector/Resultados | `::after` con `transform: scaleX(0→1)` | control · **emphasized** | Subrayado que crece desde el centro; el color del subrayado activo hereda la magnitud (axial/shear/moment/influence) |
| Pulsación de botones `sc-*` | `:active { transform: scale(0.975) }` | press (70ms) | Compresión táctil; `.tool-button` usa `.97`, welcome `.985` |
| Switch de capas (`.sc-layer-toggle__switch`) | transición de `background-color` y `transform` del thumb (`translateX(14px)`) | fast · standard | — |
| Tooltip (`.sc-tooltip__content`) | transición opacity + transform con `visibility` diferida | fast · enter | Desplazamiento de 4px hacia su lado |
| Acordeón (chevron) | `transform: rotate(180deg)` | standard · standard | Solo el icono rota |
| Filas de tablas de resultados | transición `background-color` | fast · standard | Hover discreto |
| Spinner (`.sc-spinner__ring`, `.spin`) | `sc-spin` / `spin` | loading (800ms) · linear · infinite | Rotación 360° |
| Cambio de tema | `--sc-transition-theme` | standard/fast | Superficies coordinadas, color de texto más rápido que fondos |

Existe además una familia legada `native-*` en `styles.css` (`native-surface-in`, `native-screen-in`, `native-menu-in`, `native-dialog-in`, `native-content-in`, `native-fade-in`) anterior a la capa 2026-08; mismas reglas de transform+opacity. Debe migrar a los keyframes `sc-*` conforme se toquen esas superficies.

## Reglas

1. **Solo transform + opacity** en animaciones de entrada; las transiciones de controles añaden color/borde/sombra pero nunca propiedades que relayouten (width, height, top/left).
2. **Sin layout shifts**: las superficies se montan en su posición final y entran con desplazamientos ≤ 16px; el subrayado de tabs vive en un pseudo-elemento absolutamente posicionado.
3. **Los popovers declaran `transform-origin`** coherente con su anclaje (top).
4. Los delays escalonados se limitan a un nivel (120ms en bienvenida); no hay cascadas largas.
5. Duraciones y easings **siempre** salen de tokens; no se escriben ms o beziers ad hoc.

## `prefers-reduced-motion`: mecanismo de anulación

Tres capas de defensa, todas activas:

1. **Anulación en la fuente (tokens)** — `tokens.css` redefine dentro de `@media (prefers-reduced-motion: reduce)` **todas** las duraciones a `0.001ms` (instant, press, fast, control, standard, slow, loading) y degrada `--sc-ease-emphasized`, `--sc-spring-soft` y `--sc-spring-panel` a `linear`. Como cada animación/transición del sistema consume estos tokens, el media query las colapsa a efectivamente instantáneas **sin tocar ningún selector**: es el mecanismo principal y cubre también código futuro que use los tokens. (Se usa `0.001ms` y no `0` para que los eventos `transitionend`/`animationend` sigan disparándose.)
2. **Apagado explícito en `styles.css`** — el mismo media query pone `transition: none` en el subrayado de tabs, `.tool-button`, `.welcome-option`, `.segmented-control button` y en las superficies del cambio de tema.
3. **Apagado del spinner en `ui.css`** — `.sc-spinner__ring { animation: none; opacity: 0.72 }`: la animación infinita no debe quedar ni siquiera "instantánea", se sustituye por un estado estático semitransparente.

Regla para código nuevo: si una animación es infinita o comunica progreso, debe declarar su propio apagado explícito (capa 3); todo lo demás queda cubierto por la capa 1 siempre que consuma tokens.
