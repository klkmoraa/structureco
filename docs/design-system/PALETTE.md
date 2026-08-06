# Paleta — Sistema de diseño structureCo

> Fuente de verdad: `src/design-system/tokens.css` (paleta v3, 2026-08-06, AG-015). Contrastes recalculados en esta revisión (ver `reports/` para el detalle de las migraciones v1 → v2 → v3).
> Dirección visual: **"Mesa de dibujo"** — papel de grafito, trazo de tinta y un instrumento de precisión encima. Sustituye a "Mesa Modular"; conserva "Laboratorio Nocturno" para el tema Noche y el rigor numérico de "Instrumento de Precisión".

Lo que cambió en v3:

- **Suelo de grafito, no de menta.** Los neutros pasan de una familia teñida de verde claro a un gris frío de croma bajo, para que el blanco de una superficie sea un escalón real de elevación y no un matiz.
- **Esmeralda en vez de pino.** `--sc-color-action-primary` pasa de `#007a67` a `#00795f`, alineado con el `theme-color` que `index.html` ya declaraba.
- **Segundo tono de marca.** Se añade el cian de trazo (`--sc-cyan-*`) como `--sc-color-brand-secondary`. Vive en el dibujo técnico y en el gradiente de display; **nunca** en controles.
- **La materia es token** (nueva sección 11): vidrio, anillos, halos y gradientes dejan de ser literales por componente.
- Sin cambios: `--sc-color-bg-canvas`, toda la capa técnica (sección 7) y los pares sólidos de éxito/error. Son la base de medida del release 0.8.0 y mover el lienzo obligaría a re-verificar los ocho roles técnicos.

## Arquitectura de capas

Los colores viven en cuatro capas dentro de `tokens.css`; los componentes **solo** consumen las capas 2–4:

| Capa | Prefijo | Consumo permitido |
| --- | --- | --- |
| 1 · Primitivas (ramps) | `--sc-green-*`, `--sc-blue-*`, etc. | **Nunca directo.** Solo se referencian desde roles. El test `src/ui/dependencyBoundary.test.ts` prohíbe primitivas en `ui.css`. |
| 2 · Roles semánticos | `--sc-color-*` | Componentes UI. |
| 3 · Roles técnicos del dominio | `--sc-color-technical-*`, `--sc-color-structure-*`, `--sc-color-tool-*` | Canvas, diagramas, rail de herramientas, métricas de resultados. |
| 4 · Alias de compatibilidad | `--app-bg`, `--accent`, `--axial`, … | CSS heredado en migración; no usar en código nuevo. |

El tema Noche (`:root[data-theme='dark']`) **no es una inversión** del Día: cada rol se reasigna a mano. Está prohibido fabricar el modo oscuro con filtros de inversión, `brightness()` global u opacidad.

## 1 · Primitivas

No se consumen directamente. Se listan como referencia de las ramps.

| Token | Valor | Notas |
| --- | --- | --- |
| `--sc-white` / `--sc-black` | `#ffffff` / `#000000` | El Noche nunca usa negro puro como fondo. |
| `--sc-green-50…900` | `#e4f5ee`, `#c3e9db`, `#93d7bf`, `#54bf9d`, `#18a077`, `#00795f`, `#00614c`, `#004b3b`, `#003a2d`, `#002b21` | Identidad esmeralda (v3). Re-anclada a `--sc-green-500` = `#00795f` (antes `#007a67` teal-pino), conservando la relación de pasos. |
| `--sc-cyan-300/600` | `#8ccfe9`, `#0e6b8f` | **Nuevo en v3.** Cian de trazo: segunda dimensión de marca. Sólo alimenta `--sc-color-brand-secondary` (600 en Día, 300 en Noche). Los escalones intermedios de la familia (`#dcf0fa`, `#3fa9cf`, `#1a86ae`, `#0a536f`) están documentados aquí pero **no se declaran**: una rampa sin consumidor viaja en el chunk de entrada sin pagar su sitio. |
| Familia grafito | `#fafcfb`, `#f4f8f6`, `#eaf0ed`, `#dde5e1`, `#c8d4ce`, `#a3b2ab`, `#7c8b85`, `#5b6b64`, `#41504a`, `#2a3833`, `#16211d`, `#0b1310` | **Nuevo en v3.** Gris frío de croma bajo que sustituye a los neutros mentolados. Por la misma razón que el cian, no se declara como rampa: sólo los escalones con consumidor viven en `tokens.css`, escritos directamente sobre el rol semántico. |
| `--sc-blue-100/300/500/600/700` | `#e8effd`, `#9dbdf6`, `#345fd6`, `#294db7`, `#1847ab` | Azul de interacción: selección / foco / información. `500`/`600` se movieron a un azul más editorial (antes `#2867e8` / `#1e56cc`). |
| `--sc-violet-500` | `#7357d8` | Acento Aula (sin cambios: se mantiene distinto a propósito del resto de la paleta). |
| `--sc-coral-500` | `#c85a45` | **Renombrado** desde `--sc-orange-500` (`#e25d32`). Carga puntual — salmón-coral, ya no naranja. |
| `--sc-red-500` / `--sc-red-700` | `#c73e4d` / `#a92f2f` | Error / foreground de error. `500` se movió a un rojo más rosado (antes `#d44848`). |
| `--sc-amber-500` | `#d88408` | Warning / punto crítico (sin cambios). |
| `--sc-plum-500` | `#7c4db2` | Compresión axial (antes `#8a4da8`). |

## 2 · Identidad y acción

| Token | Día | Noche | Uso previsto | Uso prohibido | Contraste |
| --- | --- | --- | --- | --- | --- |
| `--sc-color-action-primary` | `#00795f` (green-500) | `#2fd39b` | Botón primario, CTA, activo de marca, línea de influencia, snap/hover del canvas | Estados de éxito de formularios (usar `state-success`), foco de teclado (usar azul) | 5.38:1 Día / 9.79:1 Noche contra `action-foreground` |
| `--sc-color-brand-secondary` | `#0e6b8f` (cyan-600) | `#8ccfe9` (cyan-300) | Segundo tono de marca: dibujo técnico de la bienvenida y `--sc-gradient-display` | Controles, estados, cualquier cosa accionable (ese trabajo es del esmeralda) | 5.97:1 Día / 10.67:1 Noche sobre `surface-1` |
| `--sc-color-action-hover` | `#00614c` (green-600) | `#4de0ae` | Hover del primario | Texto suelto | En Noche ahora **aclara** sobre el primario; antes lo oscurecía, que es el gesto contrario al esperado |
| `--sc-color-action-pressed` | `#004b3b` (green-700) | `#22b382` | Pressed del primario | — | Recalibrado junto al nuevo `green-500` |
| `--sc-color-action-foreground` | `#ffffff` | `#06140f` | Texto/icono sobre fondos de acción | Sobre superficies claras | Par de `action-primary` |
| `--sc-color-action-subtle` | `#e4f5ee` (green-50) | `#10241d` | Fondos suaves de acción (chips, hovers tenues) | Como color de texto | Fondo, no requiere 4.5:1 propio |
| `--sc-color-aula` | `#7357d8` (violet-500) | `#9a83f0` | Identidad del modo Aula (guía, insignias) | Estados de error/warning | Sin cambios en v2 |
| `--sc-color-aula-foreground` | `#ffffff` | `#171121` | Texto sobre fondo Aula | — | Par de `aula` |

## 3 · Superficies

| Token | Día | Noche | Uso previsto | Uso prohibido |
| --- | --- | --- | --- | --- |
| `--sc-color-bg-app` | `#eaf0ed` | `#070d0b` | Fondo global de la aplicación | Fondos de tarjetas (usar surface-1/2) |
| `--sc-color-bg-canvas` | `#fafcfb` | `#060b09` | Fondo del lienzo estructural; base de validación de la paleta técnica | Paneles de UI |
| `--sc-color-surface-1` | `#ffffff` | `#0f1614` | Superficie base de paneles y tarjetas | — |
| `--sc-color-surface-2` | `#e1e9e5` | `#16201d` | Superficie secundaria: fondos de segmented, hovers, iconos contenedores | Texto |
| `--sc-color-surface-elevated` | `#ffffff` | `#1d2825` | Popovers, diálogos, drawers (elevación real: en Noche es más clara que surface-1) | Fondos planos extensos |
| `--sc-color-surface-inset` | `#dbe4df` | `#0a100e` | Superficies hundidas (wells, áreas rebajadas) | — |
| `--sc-color-surface-toolbar` | `#f8fbfa` | `#111a17` | Rail de herramientas y topbar | — |
| `--sc-color-surface-input` | `#ffffff` | `#111a17` | Fondo de campos de entrada | — |

### Bordes y divisores

| Token | Día | Noche | Uso previsto |
| --- | --- | --- | --- |
| `--sc-color-border` | `#c8d4ce` | `#26312d` | Borde estándar de controles y paneles |
| `--sc-color-border-soft` | `#e3eae6` | `#1c2522` | Bordes de baja jerarquía (headers de modal, filas) |
| `--sc-color-border-strong` | `#93a49c` | `#43594f` | Bordes enfatizados, scrollbars |
| `--sc-color-divider` | `#dfe7e3` | `#1a2320` | Líneas divisorias puras |

## 4 · Texto

| Token | Día | Noche | Uso previsto | Uso prohibido | Contraste |
| --- | --- | --- | --- | --- | --- |
| `--sc-color-text-primary` | `#0c1a15` | `#f3f8f6` | Texto principal, títulos, valores decisivos | — | 17.88:1 / 17.09:1 |
| `--sc-color-text-secondary` | `#3a4f47` | `#b6c6bf` | Párrafos secundarios, descripciones, instrucciones | — | 8.79:1 / 10.32:1 |
| `--sc-color-text-muted` | `#5b6f66` | `#8ea099` | **Solo** metadatos auxiliares de tamaño suficiente | Párrafos, instrucciones o valores que afecten una decisión (usar secondary/primary) | Regla explícita en COLOR_ACCESSIBILITY.md |
| `--sc-color-text-disabled` | `#93a09a` | `#66716d` | Controles deshabilitados | Nunca comunica información indispensable por sí solo | Exento de AA por estado |
| `--sc-color-text-inverse` | `#ffffff` | `#0b1310` | Texto sobre fondos oscuros/claros invertidos (tooltips) | — | — |
| `--sc-color-text-link` | `#294db7` (blue-600) | `#8db4ff` | Enlaces | Botones primarios | 7.40:1 Día (verificado en el PDF de paleta v2) |
| `--sc-color-text-technical` | `#445450` | `#bfcac5` | Texto técnico de apoyo (etiquetas de magnitudes) | — | — |
| `--sc-color-text-unit` | `#78857f` | `#929d98` | Unidades junto a valores numéricos | Valores en sí | — |

## 5 · Interacción, foco y selección

| Token | Día | Noche | Uso previsto | Uso prohibido | Contraste |
| --- | --- | --- | --- | --- | --- |
| `--sc-color-focus` | `#345fd6` (blue-500) | `#86a8ff` | Focus ring universal (outline 3px) | Color activo genérico de herramientas | 5.59:1 / 7.73:1 contra `surface-1` |
| `--sc-color-selection` | `#dce9ff` | `#18385e` | Relleno de selección (fila, área) | Texto | Fondo |
| `--sc-color-selection-stroke` | `#345fd6` | `#78a8ff` | Contorno de selección en canvas y UI | — | Noche difiere ahora de `technical-reaction` (`#9baaff`); ya no coinciden por accidente |
| `--sc-color-info` | `#345fd6` | `#86a8ff` | Información neutral | — | = focus |

**Regla:** selección/foco = azul, siempre. El azul de interacción no se usa como color activo de herramientas; las reacciones (azul técnico) conservan su rol solo dentro de la representación estructural.

## 6 · Estados

| Token | Día | Noche | Uso previsto | Uso prohibido | Contraste |
| --- | --- | --- | --- | --- | --- |
| `--sc-color-state-success` | `#2b7a3d` | `#7ad96b` | Confirmaciones, validación positiva | Marca (usar action-primary) | Separado del verde de marca a propósito (v2) |
| `--sc-color-state-warning` | `#d88408` (amber-500) | `#f0aa3c` | Advertencias, resultados obsoletos | Texto pequeño en Día (usar `warning-foreground`) | Sin cambios |
| `--sc-color-state-warning-foreground` | `#8a4f00` | = warning (`#f0aa3c`) | Texto de warning legible | — | 6.56:1 / 8.98:1 |
| `--sc-color-state-error` | `#c73e4d` (red-500) | `#ff7586` | Errores, acciones destructivas, geometría inválida | Texto pequeño en Día (usar `error-foreground`) | Más rosado que la v1, se separa del naranja/coral de carga |
| `--sc-color-state-error-foreground` | `#a92f2f` (red-700) | = error (`#ff7586`) | Texto de error legible | — | 6.70:1 / 6.95:1 |
| `--sc-color-state-critical` | `#b3261e` | `#ff8a80` | Severidad crítica (escalón sobre error) | — | Sin cambios en v2; medir antes de usarlo como texto pequeño |
| `--sc-color-state-info` / `-loading` | `#345fd6` | `#86a8ff` | Información / progreso | — | = focus |
| `--sc-color-state-stale` | = warning | = warning | Resultados desactualizados | — | Alias |
| `--sc-color-state-pending` | `#5f736a` | `#8d9895` | Estados pendientes/neutros | — | = text-muted |

`--sc-color-state-valid` y `--sc-color-state-invalid` se eliminaron el
2026-08-03. La migración v2 los había dejado con los valores de la v1 y este
documento pedía revisar si debían converger con `state-success`/`state-error`;
al revisarlo se comprobó que **ningún archivo del proyecto los consumía**. La
validación de formularios usa `--sc-color-state-error-foreground`
(`.sc-field__error` en `ui.css`), no estos alias. Se quitaron en vez de
recalibrarlos: eran tokens muertos que solo podían volver a desincronizarse.

## 7 · Técnicos / estructurales (canvas y diagramas)

Paleta v2: familias más separadas entre sí para reducir confusión visual. La carga puntual dejó de ser naranja (`#e25d32` / `#ff825c`) y ahora es un salmón-coral (`#c85a45` / `#ff7d66`); el resto de roles técnicos conserva su familia de matiz pero con tonos recalibrados. Contrastes recalculados contra `bg-canvas` en esta revisión.

| Token | Día | Contraste | Noche | Contraste | Magnitud |
| --- | --- | ---: | --- | ---: | --- |
| `--sc-color-technical-load` | `#c85a45` | 4.07:1 | `#ff7d66` | 7.91:1 | Carga puntual (salmón-coral, ya no naranja) |
| `--sc-color-technical-axial` | `#006b9a` | 5.71:1 | `#6bcbf1` | 10.79:1 | Axial N (se mantiene azul, sin cambio de familia) |
| `--sc-color-technical-shear` | `#2f7d46` | 4.92:1 | `#78dc94` | 11.76:1 | Cortante V / carga distribuida |
| `--sc-color-technical-moment` | `#b23b6f` | 5.44:1 | `#ff79ac` | 8.10:1 | Momento M |
| `--sc-color-technical-deformed` | `#007d8a` | 4.74:1 | `#5bdae2` | 11.86:1 | Deformada |
| `--sc-color-technical-reaction` | `#4a5fd1` | 5.30:1 | `#9baaff` | 9.05:1 | Reacciones (ya no comparte el primitivo con `focus`) |
| `--sc-color-technical-dimension` | `#8a6800` | 5.02:1 | `#ffd56a` | 14.14:1 | Cotas |
| `--sc-color-technical-axis` | `#8b4d2f` | 6.37:1 | `#e6a57a` | 9.46:1 | Ejes / cortes |

**Uso prohibido transversal:** los colores técnicos no son tokens de estado. Un resultado correcto no se pinta con `technical-shear`, ni un error con `technical-moment`, aunque los tonos sean cercanos.

### Roles estructurales formalizados (Sección 12 del sistema)

Mapean sobre los técnicos verificados. Los marcados **reservado** documentan intención sin alterar la codificación actual del canvas.

| Token | Resuelve a (Día / Noche) | Estado |
| --- | --- | --- |
| `--sc-color-structure-member` / `-node` / `-support` | `canvas-member` (`#16211c` / `#f1f5f4`) | Heredado |
| `--sc-color-structure-member-selected` / `-node-selected` / `--sc-color-selection-outline` | `selection-stroke` | Heredado |
| `--sc-color-structure-spring` / `-hinge` / `-release` | `technical-axis` | Heredado |
| `--sc-color-load-point` | `technical-load` | Heredado |
| `--sc-color-load-distributed` | `technical-shear` | Heredado |
| `--sc-color-load-moment` | `technical-moment` | Heredado |
| `--sc-color-reaction` | `technical-reaction` | Heredado |
| `--sc-color-axial-tension` | `technical-axial` | Heredado |
| `--sc-color-axial-compression` | `#7c4db2` (plum-500) / `#d9a7f5` | **Reservado** — el canvas codifica el signo por lado/etiqueta, no por color |
| `--sc-color-shear-positive` / `-negative` | ambos = `technical-shear` | Heredado (signo por geometría) |
| `--sc-color-moment-positive` / `-negative` | ambos = `technical-moment` | Heredado (signo por geometría) |
| `--sc-color-deformation` | `technical-deformed` | Heredado |
| `--sc-color-influence-line` | `action-primary` | Heredado del rol de acción |
| `--sc-color-envelope` | `#624fc7` / `#b8aaff` | Recalibrado en v2 (antes `#5b54c8` / `#a29bf0`) |
| `--sc-color-critical-point` | `#d88408` (amber-500) / `#e7bd55` | Heredado (ámbar / cota Noche) |
| `--sc-color-geometry-error` | `state-error` | Alias |
| `--sc-color-stale-result` | `state-warning` | Alias |
| `--sc-color-snap-target` / `--sc-color-hover-target` | `action-primary` | Heredado |

### Lienzo y documento

Explícitos por tema, **nunca producidos por inversión**.

| Token | Día | Noche | Uso |
| --- | --- | --- | --- |
| `--sc-color-canvas-grid` | `#e7ece9` | `#202a2b` | Cuadrícula fina (siempre por debajo del miembro y de resultados) |
| `--sc-color-canvas-grid-strong` | `#d8dfdb` | `#2c3539` | Cuadrícula mayor |
| `--sc-color-canvas-member` | `#16211c` | `#f1f5f4` | Trazo de miembros y apoyos |
| `--sc-color-canvas-node-fill` | `#fafcfb` | `#060b09` | Relleno de nodos (= `bg-canvas` en ambos temas; el contorno lo aporta `canvas-member`) |

`--sc-color-canvas-node-fill` Noche se resincronizó con `--sc-color-bg-canvas` (`#060b09`) el 2026-08-03, cerrando la deuda que había dejado la migración v2: ahora el relleno de nodo iguala el fondo del canvas en ambos temas, igual que ya ocurría en Día. La exportación SVG (`src/utils/svgExport.ts`) usa ese mismo valor.

## 8 · Herramientas (rail)

La identificación de herramienta refleja la codificación del canvas. El color propio del icono se conserva en hover, active y focus; el active puede sumar fondo/borde suave pero no reemplaza la identidad del icono.

| Token | Resuelve a | Herramientas (clase `sc-tool-button--*`) |
| --- | --- | --- |
| `--sc-color-tool-navigation` | `text-secondary` | select, pan |
| `--sc-color-tool-structure` | `text-primary` | node, member, support, split |
| `--sc-color-tool-point-load` | `technical-load` | pointLoad |
| `--sc-color-tool-distributed-load` | `technical-shear` | distributedLoad |
| `--sc-color-tool-moment` | `technical-moment` | moment |
| `--sc-color-tool-dimension` | `technical-dimension` | dimension |
| `--sc-color-tool-cut` | `technical-axis` | cut |
| `--sc-color-tool-destructive` | `state-error` | delete |

## 9 · Overlays

Tres niveles fijos; nunca se usa un negro arbitrario en el componente. Sin cambios en v2.

| Token | Día | Noche | Uso |
| --- | --- | --- | --- |
| `--sc-color-overlay-soft` | `rgba(4, 11, 7, 0.28)` | `rgba(0, 0, 0, 0.34)` | Velos suaves (backdrops secundarios) |
| `--sc-color-overlay-sheet` | `rgba(2, 10, 6, 0.34)` | `rgba(0, 0, 0, 0.46)` | Sheets / paneles móviles |
| `--sc-color-overlay-strong` | `rgba(5, 18, 11, 0.58)` | `rgba(0, 0, 0, 0.68)` | Modales (`.sc-overlay`) |

## 10 · Alias de compatibilidad (capa 4)

Para CSS existente en migración por rol: `--app-bg`, `--surface`, `--surface-2`, `--surface-3` (derivado con `color-mix`), `--canvas-bg`, `--text`, `--muted`, `--muted-strong`, `--subtle`, `--border`, `--border-soft`, `--shadow`, `--accent(-hover/-pressed/-soft/-foreground)`, `--focus`, `--selection(-soft)`, `--axial`, `--shear`, `--moment`, `--force`, `--dimension`, `--axis`, `--deformed`, `--reaction`, `--warning`, `--error`, `--danger`, `--success`, `--grid(-strong)`, `--member`, `--node-fill`, `--radius-*`, `--topbar-h`, `--toolbar-w`, `--inspector-w`, `--motion-*`, `--ease-*`. Todos resuelven a tokens `--sc-*`; el objetivo es retirarlos conforme cada superficie migra. Todos siguen apuntando a los mismos roles semánticos tras la migración v2 — ningún alias cambió de destino, solo el valor final que resuelven.

## 11 · Materia (nuevo en v3)

Vidrio, anillos, halos y gradientes son tokens, no literales por componente: cada uno se mide distinto en Día y en Noche, y dejarlos sueltos garantiza que el tema oscuro herede una decisión tomada para porcelana.

| Token | Día | Noche | Uso previsto | Uso prohibido |
| --- | --- | --- | --- | --- |
| `--sc-surface-glass` | `surface-1` al 72% | `surface-1` al 76% | Barras y paneles translúcidos sobre contenido | Superficies con texto largo encima |
| `--sc-surface-glass-strong` | `surface-1` al 88% | `surface-1` al 92% | Topbar y pie: cristal que sí soporta texto | — |
| `--sc-surface-glass-border` | blanco al 66% | `border-strong` al 52% | Canto de una superficie de vidrio | — |
| `--sc-blur-glass` / `--sc-blur-chrome` | `blur(20px) saturate(1.6)` / `blur(14px) saturate(1.3)` | idénticos | Desenfoque de cristal. **La saturación no es opcional**: sin ella el desenfoque deja el lienzo lechoso justo donde el ojo compara colores de diagrama | — |
| `--sc-ring-inset` | luz blanca al 72% | acento al 14% | 1px de canto interior superior en todo lo que se eleva | Elementos planos |
| `--sc-glow-accent` / `--sc-glow-aula` | acento/violeta al 24% | al 20% / 22% | Halo de marca **sólo en hover o estado activo** | Reposo |
| `--sc-ring-focus` | foco al 30% | hereda | Halo de foco tokenizado | Sustituir el `outline` de foco |
| `--sc-gradient-brand-soft` | esmeralda 10% → surface | hereda | Relleno de la tarjeta de acción primaria | Fondos extensos |
| `--sc-gradient-display` | esmeralda → cian | hereda | **Un único uso**: la palabra acentuada del titular de bienvenida | Cualquier segundo sitio: repetido deja de leerse como acento |
| `--sc-gradient-sheen` | blanco 64% → transparente | acento 10% → transparente | Brillo superior de tarjetas y botón primario | — |

Elevación: `--sc-shadow-raised` → `--sc-shadow-lifted` (nuevo en v3, para hover de tarjeta) → `--sc-shadow-floating` → `--sc-shadow-popover` → `--sc-shadow-modal`. En Día la tinta de sombra es grafito verdoso (`rgba(11, 31, 24, …)`), no negro puro: sobre porcelana el negro ensucia.

## Regla transversal: no depender solo del color

Estados, herramientas y resultados **nunca** dependen únicamente del color. Señal adicional obligatoria por significado:

| Significado | Señal de color | Señal adicional obligatoria |
| --- | --- | --- |
| Selección | Azul | Halo, contorno, handles o geometría redundante |
| Foco | Azul | Outline visible y posición de teclado |
| Carga puntual | Salmón-coral | Flecha individual |
| Carga distribuida | Verde | Serie de flechas y línea de distribución |
| Momento | Magenta/rosa | Flecha circular |
| Cota | Ocre | Extensiones, línea y puntas de cota |
| Error | Rojo-rosado | Icono, texto y mensaje explicativo |
| Warning | Ámbar | Icono y etiqueta de advertencia |
| Éxito | Verde de estado | Icono de confirmación y texto |

Complementos adicionales: tipos de línea (los diagramas usan líneas base discontinuas, ver glifos de resultados), etiquetas numéricas junto a cada magnitud, y texto técnico dentro del canvas con halo/`paint-order`/fondo cuando el tamaño es pequeño.

## Checklist al agregar un color

1. Definir el rol semántico antes del valor.
2. Proponer valores Día y Noche juntos (nunca derivar uno del otro por filtro).
3. Medir contraste contra todos los fondos donde aparecerá (piso: 4.5:1 texto normal, 3:1 texto grande/gráficos esenciales/focus).
4. Agregar una señal no cromática.
5. Probar normal, hover, active, focus y disabled.
6. Añadir el par al contrato automático de tokens (`src/design-system/tokens.test.ts`) si es texto, foco o dato técnico esencial.
