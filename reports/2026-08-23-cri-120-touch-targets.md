# CRI-120 · targets táctiles de Compact

**Fecha:** 2026-08-23  
**Alcance:** hitboxes visuales de la cinta K0, dock móvil y notificaciones

## Problema

En WebKit móvil las reglas K0 más específicas reescribían el contrato de
44 px: el botón de proyecto quedaba en `112×42`, Herramientas en `40×42` y
Model Doctor en `42×42`. El botón Seleccionar tenía 44 px de layout, pero el
`scale(.98)` del estado hundido lo dibujaba como aproximadamente `43×43`.

## Corrección

- En puntero táctil, proyecto, herramientas, resultados/Model Doctor y los
  botones equivalentes de la cabecera recuperan `44×44` sin cambiar el
  tamaño compacto para ratón.
- El dock móvil conserva el desplazamiento de presión, pero elimina la escala
  reductora del estado activo para conservar un target físico de 44 px.
- El cierre de toast mantiene su target de 44 px y se verificó con una
  notificación persistente.

## Verificación focal

- Chromium y WebKit, `390×844`, shell `K0`: **PASS**.
- Medidas finales: proyecto `112×44`, herramientas `44×44`, Model Doctor
  `44×44`, Seleccionar `44×44`, cerrar notificación `44×44`.
- `document.documentElement.scrollWidth`: `390px`; sin overflow horizontal.
- Vitest focal: **PASS**, 5 archivos / 49 pruebas.
- `npm.cmd run build`: **PASS**.

## Límites

No se modificaron solver, selección semántica, geometría, persistencia ni
resultados. El cambio sólo ajusta CSS de superficies táctiles.
