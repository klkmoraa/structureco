# Fidelity ledger

## Fase 3 - cierre comparativo

| Punto | Referencia aprobada | Baseline | Criterio de cierre | Estado |
| --- | --- | --- | --- | --- |
| Canvas first | PDF p. 22 | Chrome y rail restan área útil sin reserva común | Modelo al centro y zonas de control compactas. | **Cerrado.** Safe rect y nueve viewports aprobados. |
| Agrupación por intención | PDF p. 24 | Rail plano con separadores visuales | Grupos nombrados y orden estable sin perder herramientas. | **Cerrado.** 12 herramientas y 11 shortcuts preservados. |
| Correspondencia cromática herramienta/canvas | Corrección final del propietario, 2026-07-19 | Los iconos no coincidían con los objetos visibles en la mesa de trabajo | Cada herramienta hereda el rol de su objeto: modelo, fuerza, distribuida, momento, cota, sección o eliminación; azul sólo para selección/foco. | **Cerrado.** Valores calculados y capturas Light/Dark aprobados. |
| Rail/dock responsive | PDF pp. 22, 31-32 | 164 px wide, 76 px compact, dock de seis | Expandido >=1440, compacto 1024-1439, dock <=1023. | **Cerrado.** Desktop, tablet y móvil aprobados. |
| Chrome y safe zones | PDF p. 26 | Badges/controles/status en esquinas sin reserva común | Zonas explícitas sin solapar modelo, labels o dock. | **Cerrado.** Cero intersecciones de chrome. |
| Capas de información | PDF p. 27 | Visibilidad distribuida en ProjectSettings y resultTab | Control UI-only de sesión; modelo siempre visible. | **Cerrado.** Ocho capas efímeras; modelo bloqueado. |
| Prioridad/LOD/colisiones | PDF p. 29 | Labels directos por boolean y escala fija | P0/P1 persistentes; secundarios adaptados a cámara y sin colisión. | **Cerrado.** P0-P3, tres LOD y leaders probados. |
| Selección | PDF p. 30 | Verde de producto y grosor/drop shadow | Azul semántico + geometría específica por objeto. | **Cerrado.** Cinco tipos y Light/Dark cubiertos. |
| Desktop/tablet/móvil | PDF pp. 31-32 | Composición responsive existente | Misma lógica, canvas prioritario y dock alcanzable. | **Cerrado.** Chromium y WebKit aprobados. |
| Gestos y accesibilidad | PDF pp. 33, 35 | Mouse/touch/pinch ya funcionales | Paridad, targets, foco, reduced motion y pen/teclado. | **Cerrado.** Entrada y preferencias PASS. |

Las capturas before y las 19 capturas after fueron inspeccionadas mediante contact sheets y vistas individuales. Las referencias se aplicaron como especificación de intención: se preservó el lenguaje visual del producto y no se copiaron como mockups literales.

La correspondencia de páginas se revalidó contra los títulos renderizados del PDF rector antes del cierre. El informe final muestra cada referencia completa con su descripción correcta y SHA-256.

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
