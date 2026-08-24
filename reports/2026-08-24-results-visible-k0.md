# Resultados visible en K0

Fecha: 2026-08-24
Alcance: cinta superior responsive; sin cambios al solver, resultados numéricos, modelo, persistencia ni canvas.

## Causa

El botón `.results-launcher` sí se renderizaba, pero `src/features/topbar/topbar.css` lo incluía en la regla K0 que ocultaba los controles no esenciales:

```css
.app-shell[data-shell-class='K0'] ... .results-launcher { display:none; }
```

Por eso el menú de Utilidades conservaba una acción “Resultados”, pero el acceso directo no aparecía en el teléfono.

## Corrección

- Resultados permanece visible en K0 como botón de icono, con nombre accesible `Resultados` y objetivo táctil de 44 px bajo `pointer: coarse`.
- El nombre del proyecto conserva 104 px en K0 y baja a 90 px entre 375 y 389 px para que Resultados, Model Doctor y Estado quepan sin overflow.
- Se conservaron la acción de Resultados dentro de Utilidades, el retorno de foco de Safari y los controles de Model Doctor/Estado.
- La prueba de regresión de TopBar ahora exige Resultados + Model Doctor + Estado visibles en todo el barrido compacto.

## Evidencia

- Caso rojo antes de la corrección: `npm.cmd run qa:topbar` falló en 360 px con `Resultados disappeared`.
- `node scripts/qa-topbar.mjs`: PASS en 360, 375, 390, 414, 460, 500, 600, 660, 700, 740, 800, 900, 1000 y 1023 px; también pasó el barrido de breakpoints, geometría continua y nombres largos ES/EN.
- `npx.cmd vitest run src/features/topbar/TopBar.test.tsx --maxWorkers=1 --pool=threads --no-file-parallelism`: PASS, 23/23.
- Browser local a 393×852 en K0: Resultados visible, `scrollWidth = clientWidth = 393`; al pulsarlo abrió Results como superficie activa a ancho completo (`393 px`).
- Browser local a 375×852 y 360×740: Resultados visible y `scrollWidth = clientWidth` en ambos casos.

## Pendiente

La confirmación final en Safari físico queda como verificación externa del dispositivo. La publicación de esta corrección se documenta por separado al completar el commit y `gh-pages`.
