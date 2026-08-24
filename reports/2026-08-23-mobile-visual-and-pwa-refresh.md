# Corrección móvil: Home, colocación de miembros y actualización PWA

Fecha: 2026-08-23  
Alcance: presentación responsive y shell PWA. No se modifican solver, unidades,
signos, topología, persistencia ni resultados.

## Hallazgos

- La figura de Inicio estaba dentro de una fila móvil cuyo alto dependía de una
  expresión porcentual (`min(100%, 220px)`). En WebKit esa altura podía resolverse
  contra la fila intrínseca y dejar visible sólo el lado derecho de la PNG.
- El aviso `Toca el nodo destino` tenía una regla móvil temprana con `bottom:10px`
  y otra posterior con `top:96px`. Al quedar ambos ejes definidos, el elemento
  absoluto se estiraba casi por todo el lienzo. La captura del teléfono mostró el
  aviso con aproximadamente `176 × 622 px`.
- El service worker generaba una versión nueva en estado `waiting` hasta que el
  cliente nuevo enviara `SKIP_WAITING`; un cliente que todavía ejecutaba el shell
  anterior podía conservar la composición visual antigua.

## Cambios

- `src/features/welcome/totalHome.css`: caja móvil explícita con `clamp`,
  `object-fit:contain` y `object-position:center` para que el asset conserve su
  encuadre en Chromium y WebKit.
- `src/styles.css`: el aviso móvil usa sólo el anclaje superior, altura automática
  acotada a 44 px y ancho de contenido; la entrada rápida conserva su propia
  barra inferior.
- `vite.config.ts`: el service worker llama a `skipWaiting()` después de
  precachear únicamente cuando ya existe un worker activo. Así las actualizaciones
  sustituyen el shell anterior sin forzar una recarga durante la primera instalación.

## Verificación focal

- `npm.cmd run build`: PASS.
- `npm.cmd run verify:protected`: PASS, 38 archivos protegidos.
- `npm.cmd run qa:home`: PASS, 6 escenarios Home Día/Noche en escritorio,
  tablet y móvil.
- Flujo móvil de creación de miembro en Chromium y WebKit: aviso `181 × 44 px`,
  barra de entrada `374 × 111 px`, desbordamiento horizontal `0 px`.

La publicación de esta revisión en `main` y `gh-pages` queda como el siguiente
paso de entrega; el reporte no afirma una corrección pública hasta comprobar el
asset nuevo servido por GitHub Pages.
