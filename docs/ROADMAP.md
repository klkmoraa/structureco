# Roadmap de producto — structureCo

## Incremento actual — puntos 1 a 9

El incremento posterior a 0.3 endurece el producto sin ampliar su teoría física
más allá del análisis estático 2D lineal-elástico. La publicación pública
(punto 10) está excluida expresamente de este ciclo.

### 1. Articulaciones internas

- Articulación como propiedad del nodo.
- Condensación exacta del momento en todos los marcos incidentes.
- Validación de conectividad y de momentos aplicados a una rotación libre.
- Pruebas contra modelo explícito con liberaciones y equilibrio.

### 2. Zonas rígidas y offsets

- Offsets colineales `ri/rj` con transformación cinemática exacta.
- Rigidez y cargas consistentes ensambladas en las caras deformables.
- Diagramas ubicados sobre la longitud flexible.
- Validación de longitud, tipo de miembro y conflictos con articulaciones.

### 3. División de miembros

- División topológica desde el editor.
- Remapeo de cargas distribuidas, puntuales y momentos.
- Conservación de propiedades, liberaciones y offsets exteriores.
- Prueba de invariancia de la respuesta antes/después de dividir.

### 4. Banco FTool/analítico

- Once fixtures `SC-FT-01…11` con fórmulas y tolerancias reproducibles.
- Vigas, voladizos, pórtico desplazable, miembros inclinados, resorte y liberación.
- Comparaciones externas `SC-FT-01` y `SC-FT-02` aprobadas con FTool 4.01 y
  archivos `.ftl` archivados. `SC-FT-03…11` quedan programadas para la puerta
  de aceptación; no se copian resultados internos como evidencia externa.

### 5. Cargas y diagramas de alta precisión

- Raíces en coordenada adimensional y cuadrática numéricamente estable.
- Cúbicas segmentadas por intervalos monótonos con detección de tangencias.
- Extremos de todos los tramos incluidos como candidatos críticos.
- Superposición de cargas, saltos laterales y cierres de extremo verificados.
- Renderizado Bézier exacto para polinomios hasta grado tres.
- Relleno y trazo exacto separados para impedir que la línea base se confunda
  con el diagrama; saltos, ceros y cierres se representan explícitamente.
- Cursor fijable con lectura simultánea `N–V–M`, selección de miembro y estados
  izquierdo/derecho en discontinuidades.

### 6. Editor profesional

- Separación entre corte educativo y división física.
- Historial consolidado por gesto de arrastre.
- Acciones de duplicar/copiar/pegar y mejoras de selección/snapping.
- Inspector para articulaciones y offsets, con estados táctiles y de teclado.

### 7. Aprendizaje verificable

- Pasos vinculados a objetos reales del modelo.
- Resaltado de nodos/miembros relacionado con el paso activo.
- Resultados esperados estructurados y comprobables en ejemplos.
- DCL/cortes alimentados por el mismo registro de cargas del solucionador.
- Corte gráfico con resultantes, centroides, sustitución numérica y residuos.
- Niveles `Resumen`, `Paso a paso` y `Completo` en el procedimiento.
- Panel de resultados táctil con espacio seguro para la barra móvil.

### 8. Internacionalización

- Catálogos tipados español/inglés con prueba de paridad.
- Selector de idioma aplicado en tiempo de ejecución.
- Magnitudes, fórmulas e identificadores separados de los textos traducidos.

### 9. Persistencia segura

- Esquema `v3`, migración y validación profunda de importaciones.
- Límites de tamaño y rechazo de números no finitos/referencias inválidas.
- Rotación de copia primaria a respaldo y conservación de payload dañado para
  recuperación.

## Puerta de aceptación del incremento

Antes de etiquetar una versión:

1. `npm run lint` sin errores.
2. `npm test` con todos los fixtures y propiedades aprobados.
3. `npm run build` aprobado.
4. QA de escritorio y teléfono sin errores de consola ni desbordamiento.
5. Verificación visual de axial, cortante, momento, saltos, extremos y offsets.
6. Revisión documental: especificación, limitaciones y conteos coinciden con la
   ejecución final.

## Trabajo posterior (no incluido en este ciclo)

- Ejecutar y archivar las comparaciones externas `SC-FT-03…11` con FTool 4.01.
- Añadir panel zones deformables o conexiones semirrígidas con formulación propia.
- Cotas persistentes más avanzadas, selección por capas y modelos grandes.
- Impresión/PDF y PWA después de estabilizar el esquema v3.
- P-Delta, Timoshenko, no linealidad, dinámica, sismo y diseño solo con
  especificaciones y bancos de validación independientes.
- Publicación/hosting: punto 10, pospuesto por decisión del usuario.
