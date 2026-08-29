# ACM de estructura completa

## Cambio

ACM deja de mostrar una tarjeta inferior de un solo miembro. Ahora dibuja las lecturas N, V y M directamente sobre cada miembro resuelto del modelo, con sus segmentos y discontinuidades, para conservar la geometría completa del pórtico.

## Verificación focalizada

- Prueba de componente: un pórtico de tres barras genera las tres capas ACM en cada barra.
- Pruebas focalizadas: `CanvasDiagramStack` y `CanvasEvidenceRail` — 3 passed.
- Build de producción: `npm.cmd run build` — passed.
- Comprobación visual: pórtico de ejemplo resuelto en 1280×820 y 390×844; ACM mostró 9 capas (N, V y M para M1, M2 y M3), sin errores ni advertencias de consola.
