# ACM — diagramas estructurales continuos

- Se eliminó el formato de tarjetas/miniaturas del ACM.
- Una viga conserva los diagramas N, V y M apilados debajo del modelo; cada línea y relleno usa los segmentos exactos del resultado.
- Un pórtico se replica completo: en escritorio N/V/M van lado a lado para aprovechar el ancho; en móvil se repiten hacia abajo, sin pintar sobre la estructura editable ni invadir los controles de cámara.
- Cada réplica conserva todos los miembros, discontinuidades, relleno de los colores técnicos de StructureCo, etiquetas de barras y lecturas de extremos calculados.

Validación focalizada: `CanvasDiagramStack.test.tsx` (3 pruebas), TypeScript y build Vite; revisión visual en 1280x900 y 390x844 sin errores de consola.
