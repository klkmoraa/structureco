# Welcome móvil: marco seguro de ilustración

## Alcance

Se corrigió la tarjeta de proyecto abierto de la pantalla de bienvenida para
teléfono. La ilustración estructural ahora tiene un marco móvil explícito y
centrado: ancho contenido, altura máxima de `220px` y recorte del contenedor.

## Problema corregido

En anchos de teléfono amplios, la regla global `height: auto` podía conservar
la altura intrínseca de la imagen. En una entrada de `588px`, la ilustración
llegaba a `348px` de alto y producía el encuadre parcial reportado. La regla
móvil ahora vence esa altura con propiedades físicas (`width` y `height`) y
mantiene la imagen dentro de su tarjeta.

## Verificación focal

- `npm.cmd run build` — PASS.
- `npm.cmd run verify:protected` — PASS, 38 archivos protegidos.
- `npx.cmd vitest run src/features/welcome/WelcomeScreen.test.tsx --maxWorkers=1 --pool=forks --no-file-parallelism --no-cache --reporter=dot` — PASS, 6/6.
- Navegador táctil Chromium, tema Night, portada real y PWA aislada:
  - `390×844`: ancho de documento `390px`, imagen dentro de la tarjeta,
    `216px` de alto.
  - `588×1277`: ancho de documento `588px`, imagen dentro de la tarjeta,
    `220px` de alto (antes de la corrección: `348px`).

## Límites

No se modificaron solver, modelo de proyecto, selección, persistencia,
importación/exportación ni superficies del workspace. Las capturas de QA se
mantuvieron fuera del repositorio.
