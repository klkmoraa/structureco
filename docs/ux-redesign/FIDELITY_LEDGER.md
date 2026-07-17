# Fidelity ledger

## Fase 3 - ledger inicial

| Punto | Referencia aprobada | Baseline | Criterio de cierre | Estado |
| --- | --- | --- | --- | --- |
| Agrupación por intención | PDF p. 22 | Rail plano con separadores visuales | Grupos nombrados y orden estable sin perder herramientas. | Implementado; QA final pendiente |
| Rail/dock responsive | PDF p. 24 | 164 px wide, 76 px compact, dock de seis | Expandido >=1440, compacto 1024-1439, dock <=1023. | Implementado; QA final pendiente |
| Chrome y safe zones | PDF p. 26 | Badges/controles/status en esquinas sin reserva común | Zonas explícitas sin solapar modelo, labels o dock. | Implementado; QA final pendiente |
| Capas de información | PDF p. 27 | Visibilidad distribuida en ProjectSettings y resultTab | Control UI-only de sesión; modelo siempre visible. | Abierto |
| Prioridad/LOD | PDF pp. 29-30 | Labels directos por boolean y escala fija | P0/P1 persistentes; secundarios adaptados a cámara. | Abierto |
| Colisión/leader lines | PDF p. 31 | Sin resolución de colisión | Layout determinista, sin colisiones P0/P1. | Abierto |
| Selección | PDF pp. 32-33 | Verde de producto y grosor/drop shadow | Azul semántico + geometría específica por objeto. | Abierto |
| Gestos | PDF p. 35 | Mouse/touch/pinch ya funcionales | Paridad conservada y pruebas pen/teclado. | Abierto |

Las capturas de entrada fueron inspeccionadas directamente mediante un contact sheet y vistas individuales. El cierre se realizará contra las mismas diez referencias y la misma matriz de viewports.

## Fase 2 - cierre comparativo

| Punto | Evidencia aprobada | Evidencia final | Resultado | Estado |
| --- | --- | --- | --- | --- |
| Jerarquía TopBar | Referencia A, PDF p. 27 | `after-topbar-1536x960-light-ready.jpg`, `after-topbar-1280x800-dark-stale.jpg` | Documento, Contexto y Acciones son regiones estables; estado y Analizar permanecen visibles. | **Cerrado.** |
| Color semántico | Referencia B, PDF p. 28 | `tokens.css`, capturas Light/Dark | Marca, acción, estados y magnitudes técnicas usan roles separados. | **Cerrado.** |
| Targets/foco | Referencia C, PDF p. 29 | `after-focus-overflow-1194x834.jpg`, métricas JSON | Foco de 3 px, retorno con Escape, targets touch de 44 x 44 px y contrastes AA. | **Cerrado.** |
| Desktop/tablet | Referencia D, PDF p. 30 | `after-topbar-1194x834-light-resolved.jpg`, `after-tablet-834x1194-light-ready.jpg` | Breakpoint por contenido a 1023 px; shell cambia composición sin perder canvas o estado. | **Cerrado.** |
| Header móvil | Referencia E, PDF p. 31 | `after-mobile-430x932-light-error.jpg`, `after-mobile-390x844-dark-aula.jpg` | Documento mínimo, estado, overflow y Analizar caben; dock inferior conserva tareas primarias. | **Cerrado.** |
| Tipografía técnica | Referencias B-C | `phase2-metrics.json` | Escaneo renderizado de superficies críticas: mínimo 12 px, cero muestras inferiores. | **Cerrado.** |

## Desviaciones deliberadas

- Las referencias son especificación de intención, no mockups literales. La implementación mantiene una TopBar clara en Light y oscura en Dark en vez de imponer una barra verde sólida en ambos temas.
- El producto real conserva canvas, inspector y resultados existentes; la Fase 2 cambia su composición, no rediseña sus contenidos internos.
- El label completo del estado se muestra en wide; en compacto queda icono + tooltip/nombre accesible para proteger el ancho útil.

## Revisión visual final

Las cinco referencias 27-31 y las capturas finales fueron inspeccionadas directamente. No se observan colisiones, texto crítico ilegible, controles cortados ni desviaciones funcionales. La jerarquía, adaptación y accesibilidad coinciden con la intención aprobada.
