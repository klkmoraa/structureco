# Corrección de viewport en Home para Safari/webviews táctiles

## Hallazgo

En un navegador táctil que expone un viewport de layout ancho (`980×844`), la
Home resolvía únicamente por `max-width: 760px`. Eso dejaba activa la rejilla
de escritorio y el héroe podía verse como una rebanada horizontal en la
pantalla física del teléfono. El viewport móvil real (`390/393 px`) no
reproducía el problema.

## Corrección

- La composición compacta de Home también se activa para `hover: none` +
  `pointer: coarse` hasta `1023px`, además de `max-device-width: 760px`,
  cubriendo el caso de Safari/webview táctil que conserva un ancho de layout
  mayor (incluido el iPhone con layout `980/1024px`) sin convertir la tablet
  de `1024px` en una composición móvil.
- Se añadió `min-width: 0`/`max-width: 100%` a los contenedores flex/grid de la
  portada y a sus acciones primarias para impedir que el tamaño intrínseco de
  la ilustración o los botones fuerce overflow horizontal.
- El registro del Service Worker usa una URL versionada (`rev=2026-08-24-home-viewport`)
  para forzar la comprobación de la revisión nueva en instalaciones PWA que
  conservaban la URL de worker anterior.
- No se tocaron solver, ProjectModel, persistencia, import/export ni resultados
  numéricos.

## Evidencia focal

- Antes: `qa-total-home-redesign` fallaba en `ios-webview-night` con
  `mobileCompositionMismatch`.
- Después: `Home redesign QA PASS · 7 captures`, incluido `ios-webview-night`,
  sin overflow horizontal.
- Vitest focal de Home: `2` archivos, `14/14` pruebas.
- Build/typecheck ejecutados como parte de `qa:home`.
