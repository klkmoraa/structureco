# Entrada móvil: Inicio explícito y actualización PWA

**Fecha:** 2026-08-23  
**Alcance:** portada raíz, reanudación manual y actualización del shell publicado

## Correcciones

- La entrada raíz de `AppShell` ya no activa `Continuar proyecto` de forma
  automática cuando existe un proyecto guardado. La persona siempre ve
  `Inicio`; la Mesa se abre únicamente al pulsar `Continuar proyecto`.
- `PwaUpdateNotice` activa automáticamente un service worker pendiente cuando
  la página ya está controlada por una versión anterior. Así una publicación
  nueva no deja en el teléfono el CSS/JS hashado antiguo que causaba el
  encuadre desfasado.
- `pwaLifecycle` registra `controllerchange` antes de publicar un worker
  pendiente, para que la recarga no se pierda si la activación ocurre de
  inmediato.

## Verificación focal

- Pruebas Vitest focales: **PASS**, 3 archivos / 19 pruebas.
- `npm.cmd run build`: **PASS**, 2,636 módulos transformados.
- Preview local con Chromium y WebKit, viewport `390×844`, proyecto guardado
  y recarga de la página:
  - Inicio visible después de recargar: **sí**.
  - `.app-shell` visible antes de pulsar continuar: **no**.
  - Ilustración: `324×216px`, centrada dentro del marco `360×228px`.
  - `document.documentElement.scrollWidth`: `390px`; no hay desbordamiento
    horizontal.

## Límites

No se modificaron solver, unidades, signos, IDs, topología, `ProjectModel`,
workers de cálculo, selección, importación/exportación ni resultados. El botón
de continuar y la recuperación local siguen existiendo; sólo dejan de
ejecutarse sin una acción explícita.
