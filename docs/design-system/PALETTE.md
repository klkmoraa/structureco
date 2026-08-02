# Paleta — Sistema de diseño structureCo

> Fuente de verdad: `src/styles/tokens.css` (rediseño 2026-08). Contrastes verificados: `docs/ux-redesign/COLOR_ACCESSIBILITY.md` (release 0.8.0).
> Dirección visual: "Mesa Modular" + "Laboratorio Nocturno" + "Instrumento de Precisión", con identidad propia verde/teal de ingeniería estructural.

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
| `--sc-green-50…900` | `#e9f6f0`, `#d2eee2`, `#a6ddc6`, `#6cc6a4`, `#31a97f`, `#0a7e5e`, `#076853`, `#05533f`, `#044534`, `#033628` | Identidad verde/teal ("pino calibrado"). |
| `--sc-blue-100/300/500/600/700` | `#e8effd`, `#9dbdf6`, `#2867e8`, `#1e56cc`, `#1847ab` | Azul de interacción: selección / foco / información. |
| `--sc-violet-500` | `#7357d8` | Acento Aula. |
| `--sc-orange-500` | `#e25d32` | Carga (técnico verificado). |
| `--sc-red-500` / `--sc-red-700` | `#d44848` / `#a92f2f` | Error / foreground de error. |
| `--sc-amber-500` | `#d88408` | Warning / punto crítico. |
| `--sc-plum-500` | `#8a4da8` | Reservado: compresión axial. |

## 2 · Identidad y acción

| Token | Día | Noche | Uso previsto | Uso prohibido | Contraste / origen |
| --- | --- | --- | --- | --- | --- |
| `--sc-color-action-primary` | `#0a7e5e` (green-500) | `#2fbe8e` | Botón primario, CTA, activo de marca, línea de influencia, snap/hover del canvas | Estados de éxito de formularios (usar `state-success`), foco de teclado (usar azul) | AA: 5.32:1 Día / 7.54:1 Noche contra `action-foreground` (verificado 0.8.0) |
| `--sc-color-action-hover` | `#076853` (green-600) | `#3bcb9a` | Hover del primario | Texto suelto | Hereda pareja verificada |
| `--sc-color-action-pressed` | `#05533f` (green-700) | `#27ac80` | Pressed del primario | — | Hereda pareja verificada |
| `--sc-color-action-foreground` | `#ffffff` | `#06140f` | Texto/icono sobre fondos de acción | Sobre superficies claras | Par de `action-primary` |
| `--sc-color-action-subtle` | `#e9f6f0` (green-50) | `#12261f` | Fondos suaves de acción (chips, hovers tenues) | Como color de texto | Fondo, no requiere 4.5:1 propio |
| `--sc-color-brand-secondary` | `#05533f` (green-700) | `#6cc6a4` | Marca secundaria, detalles editoriales | Botones de estado | — |
| `--sc-color-aula` | `#7357d8` (violet-500) | `#9a83f0` | Identidad del modo Aula (guía, insignias) | Estados de error/warning | Nuevo rol del rediseño |
| `--sc-color-aula-foreground` | `#ffffff` | `#171121` | Texto sobre fondo Aula | — | Par de `aula` |

## 3 · Superficies

| Token | Día | Noche | Uso previsto | Uso prohibido |
| --- | --- | --- | --- | --- |
| `--sc-color-bg-app` | `#f4f6f5` | `#101416` | Fondo global de la aplicación | Fondos de tarjetas (usar surface-1/2) |
| `--sc-color-bg-canvas` | `#fafcfb` | `#0c1012` | Fondo del lienzo estructural; base de validación de la paleta técnica | Paneles de UI |
| `--sc-color-surface-1` | `#ffffff` | `#171c1f` | Superficie base de paneles y tarjetas | — |
| `--sc-color-surface-2` | `#eef2f0` | `#1e2427` | Superficie secundaria: fondos de segmented, hovers, iconos contenedores | Texto |
| `--sc-color-surface-elevated` | `#ffffff` | `#232a2e` | Popovers, diálogos, drawers (elevación real: en Noche es más clara que surface-1) | Fondos planos extensos |
| `--sc-color-surface-inset` | `#e8edea` | `#131719` | Superficies hundidas (wells, áreas rebajadas) | — |
| `--sc-color-surface-toolbar` | `#fbfcfc` | `#14191c` | Rail de herramientas y topbar | — |
| `--sc-color-surface-input` | `#ffffff` | `#14191c` | Fondo de campos de entrada | — |

### Bordes y divisores

| Token | Día | Noche | Uso previsto |
| --- | --- | --- | --- |
| `--sc-color-border` | `#d8dfdb` | `#2c3539` | Borde estándar de controles y paneles |
| `--sc-color-border-soft` | `#e6ebe8` | `#222b2e` | Bordes de baja jerarquía (headers de modal, filas) |
| `--sc-color-border-strong` | `#c2cbc6` | `#3b464b` | Bordes enfatizados, scrollbars |
| `--sc-color-divider` | `#e2e8e4` | `#1f272a` | Líneas divisorias puras |

## 4 · Texto

| Token | Día | Noche | Uso previsto | Uso prohibido | Contraste |
| --- | --- | --- | --- | --- | --- |
| `--sc-color-text-primary` | `#16211c` | `#f1f5f4` | Texto principal, títulos, valores decisivos | — | 16.67:1 / 16.15:1 (AA, verificado) |
| `--sc-color-text-secondary` | `#5a6862` | `#a9b4b1` | Párrafos secundarios, descripciones, instrucciones | — | 5.49:1 / 8.34:1 (AA, verificado) |
| `--sc-color-text-muted` | `#6f7b75` | `#8d9895` | **Solo** metadatos auxiliares de tamaño suficiente | Párrafos, instrucciones o valores que afecten una decisión (usar secondary/primary) | Regla explícita en COLOR_ACCESSIBILITY.md |
| `--sc-color-text-disabled` | `#939c97` | `#67716e` | Controles deshabilitados | Nunca comunica información indispensable por sí solo | Exento de AA por estado |
| `--sc-color-text-inverse` | `#ffffff` | `#101416` | Texto sobre fondos oscuros/claros invertidos (tooltips) | — | — |
| `--sc-color-text-link` | `#1e56cc` (blue-600) | `#8db4ff` | Enlaces | Botones primarios | — |
| `--sc-color-text-technical` | `#46534d` | `#c0cac6` | Texto técnico de apoyo (etiquetas de magnitudes) | — | Nuevo rol del rediseño |
| `--sc-color-text-unit` | `#7b8781` | `#939e9a` | Unidades junto a valores numéricos | Valores en sí | Nuevo rol del rediseño |

## 5 · Interacción, foco y selección

| Token | Día | Noche | Uso previsto | Uso prohibido | Contraste |
| --- | --- | --- | --- | --- | --- |
| `--sc-color-focus` | `#2867e8` (blue-500) | `#6ea0ff` | Focus ring universal (outline 3px) | Color activo genérico de herramientas | 5.01:1 / 6.82:1 AA gráfico (verificado) |
| `--sc-color-selection` | `#dce9ff` | `#18385e` | Relleno de selección (fila, área) | Texto | Fondo |
| `--sc-color-selection-stroke` | `#2867e8` | `#78a8ff` | Contorno de selección en canvas y UI | — | En Noche coincide con `technical-reaction` (`#78a8ff`): contexto los desambigua |
| `--sc-color-info` | `#2867e8` | `#6ea0ff` | Información neutral | — | = focus |

**Regla:** selección/foco = azul, siempre. El azul de interacción no se usa como color activo de herramientas; las reacciones (azul técnico) conservan su rol solo dentro de la representación estructural.

## 6 · Estados

| Token | Día | Noche | Uso previsto | Uso prohibido | Contraste |
| --- | --- | --- | --- | --- | --- |
| `--sc-color-state-success` | `#1c9560` | `#45c98a` | Confirmaciones, validación positiva | Marca (usar action-primary) | Verificado como par de estado 0.8.0 |
| `--sc-color-state-warning` | `#d88408` (amber-500) | `#f0aa3c` | Advertencias, resultados obsoletos | Texto pequeño en Día (usar `warning-foreground`) | — |
| `--sc-color-state-warning-foreground` | `#8a4f00` | = warning (`#f0aa3c`) | Texto de warning legible | — | 6.56:1 / 8.82:1 AA (verificado) |
| `--sc-color-state-error` | `#d44848` (red-500) | `#f26b6b` | Errores, acciones destructivas, geometría inválida | Texto pequeño en Día (usar `error-foreground`) | — |
| `--sc-color-state-error-foreground` | `#a92f2f` (red-700) | = error (`#f26b6b`) | Texto de error legible | — | 6.70:1 / 5.94:1 AA (verificado) |
| `--sc-color-state-critical` | `#b3261e` | `#ff8a80` | Severidad crítica (escalón sobre error) | — | **Nuevo alias**: sin fila propia en las tablas 0.8.0; medir antes de usarlo como texto pequeño |
| `--sc-color-state-info` / `-loading` | `#2867e8` | `#6ea0ff` | Información / progreso | — | = focus (verificado) |
| `--sc-color-state-stale` | = warning | = warning | Resultados desactualizados | — | Alias |
| `--sc-color-state-valid` / `-invalid` | = success / = error | = success / = error | Validación de formularios | — | Alias |
| `--sc-color-state-pending` | `#6f7b75` | `#8d9895` | Estados pendientes/neutros | — | = text-muted |

## 7 · Técnicos / estructurales (canvas y diagramas)

**Todos los `--sc-color-technical-*` conservan los valores verificados WCAG AA del release 0.8.0** (medidos como elemento gráfico contra `bg-canvas`; ver COLOR_ACCESSIBILITY.md). No se alteran sin volver a medir contraste en ambos temas.

| Token | Día | Contraste | Noche | Contraste | Magnitud |
| --- | --- | ---: | --- | ---: | --- |
| `--sc-color-technical-load` | `#e25d32` | 3.43:1 | `#ff825c` | 7.95:1 | Carga puntual |
| `--sc-color-technical-axial` | `#0e7490` | 5.11:1 | `#51bdd2` | 8.84:1 | Axial N |
| `--sc-color-technical-shear` | `#2f8f59` | 3.86:1 | `#58cf83` | 9.86:1 | Cortante V / carga distribuida |
| `--sc-color-technical-moment` | `#b94b43` | 4.83:1 | `#ff8279` | 8.06:1 | Momento M |
| `--sc-color-technical-deformed` | `#2f8f9d` | 3.62:1 | `#65cbd1` | 10.19:1 | Deformada |
| `--sc-color-technical-reaction` | `#2867e8` | 4.77:1 | `#78a8ff` | 8.18:1 | Reacciones |
| `--sc-color-technical-dimension` | `#8d6c19` | 4.67:1 | `#e7bd55` | 10.92:1 | Cotas |
| `--sc-color-technical-axis` | `#a9552d` | 4.98:1 | `#ed8b58` | 7.80:1 | Ejes / cortes |

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
| `--sc-color-axial-compression` | `#8a4da8` (plum-500) / `#c79be0` | **Reservado** — el canvas codifica el signo por lado/etiqueta, no por color |
| `--sc-color-shear-positive` / `-negative` | ambos = `technical-shear` | Heredado (signo por geometría) |
| `--sc-color-moment-positive` / `-negative` | ambos = `technical-moment` | Heredado (signo por geometría) |
| `--sc-color-deformation` | `technical-deformed` | Heredado |
| `--sc-color-influence-line` | `action-primary` | Heredado del rol de acción |
| `--sc-color-envelope` | `#5b54c8` / `#a29bf0` | **Nuevo** — sin fila en tablas 0.8.0 |
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
| `--sc-color-canvas-node-fill` | `#fafcfb` | `#0c1012` | Relleno de nodos (= fondo del canvas) |

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

Tres niveles fijos; nunca se usa un negro arbitrario en el componente.

| Token | Día | Noche | Uso |
| --- | --- | --- | --- |
| `--sc-color-overlay-soft` | `rgba(4, 11, 7, 0.28)` | `rgba(0, 0, 0, 0.34)` | Velos suaves (backdrops secundarios) |
| `--sc-color-overlay-sheet` | `rgba(2, 10, 6, 0.34)` | `rgba(0, 0, 0, 0.46)` | Sheets / paneles móviles |
| `--sc-color-overlay-strong` | `rgba(5, 18, 11, 0.58)` | `rgba(0, 0, 0, 0.68)` | Modales (`.sc-overlay`) |

## 10 · Alias de compatibilidad (capa 4)

Para CSS existente en migración por rol: `--app-bg`, `--surface`, `--surface-2`, `--surface-3` (derivado con `color-mix`), `--canvas-bg`, `--text`, `--muted`, `--muted-strong`, `--subtle`, `--border`, `--border-soft`, `--shadow`, `--accent(-hover/-pressed/-soft/-foreground)`, `--focus`, `--selection(-soft)`, `--axial`, `--shear`, `--moment`, `--force`, `--dimension`, `--axis`, `--deformed`, `--reaction`, `--warning`, `--error`, `--danger`, `--success`, `--grid(-strong)`, `--member`, `--node-fill`, `--radius-*`, `--topbar-h`, `--toolbar-w`, `--inspector-w`, `--motion-*`, `--ease-*`. Todos resuelven a tokens `--sc-*`; el objetivo es retirarlos conforme cada superficie migra.

## Regla transversal: no depender solo del color

Estados, herramientas y resultados **nunca** dependen únicamente del color. Señal adicional obligatoria por significado:

| Significado | Señal de color | Señal adicional obligatoria |
| --- | --- | --- |
| Selección | Azul | Halo, contorno, handles o geometría redundante |
| Foco | Azul | Outline visible y posición de teclado |
| Carga puntual | Naranja | Flecha individual |
| Carga distribuida | Verde | Serie de flechas y línea de distribución |
| Momento | Coral | Flecha circular |
| Cota | Ocre | Extensiones, línea y puntas de cota |
| Error | Rojo | Icono, texto y mensaje explicativo |
| Warning | Ámbar | Icono y etiqueta de advertencia |
| Éxito | Verde de estado | Icono de confirmación y texto |

Complementos adicionales: tipos de línea (los diagramas usan líneas base discontinuas, ver glifos de resultados), etiquetas numéricas junto a cada magnitud, y texto técnico dentro del canvas con halo/`paint-order`/fondo cuando el tamaño es pequeño.

## Checklist al agregar un color

1. Definir el rol semántico antes del valor.
2. Proponer valores Día y Noche juntos (nunca derivar uno del otro por filtro).
3. Medir contraste contra todos los fondos donde aparecerá (piso: 4.5:1 texto normal, 3:1 texto grande/gráficos esenciales/focus).
4. Agregar una señal no cromática.
5. Probar normal, hover, active, focus y disabled.
6. Añadir el par al contrato automático de tokens (`src/styles/tokens.test.ts`) si es texto, foco o dato técnico esencial.
