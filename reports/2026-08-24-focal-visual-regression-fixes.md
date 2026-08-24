# Auditoría focal de visuales y contraste · 2026-08-24

## Alcance

Se reprodujo la interacción móvil mostrada en el reporte: entrar a la Mesa,
activar **Miembro** y seleccionar el primer nodo para iniciar la colocación.
También se revisaron el dock X2, la superficie Resultados y los cuatro
selectores de contraste de CRI-121. No se ejecutó la suite completa.

## Causas y correcciones

- El panel `Toca el nodo destino` tenía `top` y `bottom` simultáneamente en
  móvil. Safari interpretaba el posicionamiento absoluto como un panel que
  ocupaba casi todo el lienzo. La corrección de `bff82f9` deja un solo ancla,
  altura automática y un máximo de 44 px.
- La tinta de **Momento** seguía ganando en Día porque la regla temática de
  `phase1.css` tenía más especificidad que el parche anterior en `styles.css`.
  La regla ganadora ahora usa la tinta de interfaz para el texto, mantiene el
  borde/sombra naranja y no cambia ningún color HEX del sistema.

## Evidencia focal

| Comprobación | Resultado |
| --- | --- |
| `npm.cmd run build` | PASS · 2,636 módulos |
| Colocación móvil Chromium | PASS · hint 181×44, quick entry 374×111, overflow 0 |
| Colocación móvil WebKit | PASS · hint 181×44, quick entry 374×111, overflow 0 |
| Mismo flujo en Pages antes de este parche | PASS · hint 181×44, sin errores de consola |
| Dock izquierdo con Resultados activo | PASS · 54×680, columna vertical, overflow 0 |
| Cierre de Resultados | PASS · devuelve foco al lanzador persistente |
| Edición múltiple Chromium | PASS · selección, revisión, aplicación, undo/redo, persistencia, responsive y teclado |
| Edición múltiple WebKit | PASS · mismas rutas funcionales y sin errores de producto |
| ToolRail headings | PASS · 5.53:1 Día, 8.35:1 Noche |
| Resultados `Expandido` | PASS · 11.23:1 Día, 15.05:1 Noche |
| Resultados `Momento` | PASS · 11.23:1 Día, 15.05:1 Noche |
| Carga móvil | PASS · 13.31:1 Día, 13.46:1 Noche |

## Pendientes separados

- `scripts/qa-model-doctor-peek.mjs` no arranca en este Windows porque conserva
  el ejecutable Linux `/opt/pw-browsers/chromium`. No se modificó el runner ni se
  presentó como un fallo funcional del Model Doctor.

## Límites respetados

No se tocaron solver, unidades, signos, topología, `ProjectModel`, workers,
persistencia, import/export, undo/redo ni resultados numéricos. El reporte
extranjero `reports/2026-08-23-cri-29-action-contract-audit.md` permanece sin
seguir y fuera del commit.
