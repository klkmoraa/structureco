# Generar estructura — corrección de desborde móvil

## Alcance

Se corrigió únicamente la composición visual del carrusel de familias de
«Generar estructura» en compacto. No se modificaron parámetros, generación,
vista previa, comandos, `ProjectModel`, solver, unidades, persistencia ni
resultados.

## Causa y cambio

En 390×844, la combinación `grid + flex + overflow` permitía que WebKit
resolviera la altura intrínseca de `.structure-generator__families` en 12 px,
aunque sus botones medían 66 px. Los botones desbordaban su fila y se pintaban
sobre el bloque de parámetros.

La franja móvil ahora reserva un mínimo de 78 px: 66 px para los botones y
12 px para su padding vertical. El QA focal comprueba que cada opción queda
dentro del carrusel y que no invade los parámetros.

## Verificación

- Reproducción previa: la nueva aserción falló con carrusel de 12 px y botón de
  64.68 px renderizados.
- Navegador integrado, 390×844, temas claro y oscuro: carrusel 78 px, botón
  66 px, sin solapamiento; encabezado, familias y acciones permanecen visibles
  después de desplazar.
- `npm.cmd run qa:structure-generator`: PASS en Chromium.
- `npm.cmd run qa:structure-generator:webkit`: PASS en WebKit.
- `npx.cmd vitest run src/features/structure-generator --maxWorkers=1 --pool=threads --no-file-parallelism`:
  5 archivos y 96 pruebas PASS.
- `npm.cmd run verify:protected`: 40 archivos protegidos intactos.
- `git diff --check`: PASS; sólo avisos de normalización LF/CRLF.
