# Lienzo 2D: encuadre con contenido, retícula adaptativa, escala gráfica y rótulos sin choque

Fecha: 2026-09-04
Base revisada: `a800134` (`main` al iniciar el trabajo)

## Por qué

El lienzo 2D es la superficie principal del producto y arrastraba cinco fallos
de lectura que se ven en cuanto se abre el pórtico de ejemplo:

1. **«Encajar» cortaba el dibujo.** El encuadre ajustaba la envolvente de los
   nudos y nada más. Todo lo que cuelga de ellos —flechas de carga, apoyos,
   reacciones, la ordenada del diagrama— se dibuja en píxeles y no encoge con el
   zoom, así que quedaba fuera del lienzo. Con el pórtico de ejemplo las cargas
   nodales aparecían decapitadas por el borde superior nada más entrar.
2. **La retícula se apagaba sola.** Por debajo de 8 px por división devolvía
   `null`: justo al alejar, cuando más falta hace una referencia métrica, el
   papel se quedaba en blanco. Y era un `<line>` por división, reconstruido en
   cada fotograma de desplazamiento.
3. **«Escala 1.57×» no era una escala.** Era el cociente contra un zoom de
   referencia interno: no se puede medir con él y no significa nada fuera del
   código.
4. **Los sellos de extremo crítico se dibujaban encima de todo.** Se colocaban
   contra el borde del lienzo sin mirar qué había debajo, mientras la capa de
   etiquetas inteligentes repartía el resto. En el pórtico de ejemplo el sello
   `Mmin −31.15 kN·m` caía sobre la etiqueta `M = −31.15 kN·m` de la misma
   esquina, que además decía lo mismo.
5. **No había forma de trazar una barra a un ángulo exacto con el puntero.** La
   única salida era escribir longitud y ángulo en la barra de entrada: sin
   restricción, una columna «vertical» acababa a 89.6°.

## Qué cambió

### Encuadre consciente del contenido — `fitReserve.ts` (nuevo)

`canvasFitReserve` mide en píxeles lo que se dibuja alrededor de los nudos y
`insetsWithFitReserve` lo suma a los `insets` del encuadre. La reserva es
**direccional**: una carga de gravedad pide sitio arriba y no a los lados, y el
diagrama de una columna se separa en horizontal. Se reutilizan `memberAxis` y
`toGlobalVector` —los mismos que usan las capas de dibujo— para orientar cada
símbolo, y un techo por lado deja siempre un tercio del viewport para el modelo
aunque la suma se dispare. `cameraToFitBounds` no cambia.

### Retícula adaptativa — `canvasGrid.ts` (nuevo)

`planCanvasGrid` engorda la separación por múltiplos **enteros** del paso de
imantación (1, 2, 5, 10, …), de modo que toda línea dibujada sigue cayendo sobre
un punto al que el puntero imanta, nunca entre dos. Devuelve tres cadenas `d`
—divisiones menores, mayores (una de cada 5 o 10) y los ejes X = 0 / Y = 0 del
modelo—, así que la retícula completa son **tres nodos del DOM** en vez de uno
por división: a zoom mínimo eran ~156 elementos recreados en cada fotograma.

### Escala gráfica — `scaleBar.ts` (nuevo)

`planScaleBar` elige la mayor longitud redonda (1, 2 o 5 por década) que cabe en
la píldora de estado y la dibuja a su tamaño real. El rótulo pasa por
`formatValue(..., 'canvas')`, la política numérica del producto. **Se retira** el
cociente «Escala N×». En superficies compactas la regla se oculta y queda la
longitud rotulada, que ya es una medida del dibujo.

### Rótulos que no se pisan — `labelLayout.ts`, `CanvasResultLayer.tsx`

- `SmartLabelCandidate` admite `subtext`: una segunda línea dentro de la **misma**
  caja. El sello de extremo crítico pasa a ser un rótulo de dos líneas —valor y
  estación— y entra por la misma puerta anticolisión que los demás.
  `CanvasResultLayer` conserva la marca sobre la curva (tallo, punto, `<title>`)
  y ya no dibuja recuadro propio.
- `dedupeKey` retira el segundo rótulo cuando dos dicen el mismo número casi en
  el mismo sitio: el momento en la cara de un nudo es el mismo que en la cara de
  la barra que llega a él, y el diagrama emitía ambos.
- Un valor de extremo que se lee `0.00` deja de pedir caja: en un pórtico
  articulado eran cuatro etiquetas diciendo lo que el dibujo ya dice.
- La leyenda del diagrama deja de cortar «Curva exacta · escala común» a media
  palabra en escritorio.

### Restricción angular al trazar — `angleConstraint.ts` (nuevo)

Con **Mayús** pulsada, el punto se proyecta sobre el múltiplo de 15° más cercano
al origen del trazo; si la imantación a retícula está activa, la longitud además
cae sobre un múltiplo del paso. El lienzo dibuja el rayo polar y el glifo
`Ángulo` (nuevo `SnapKind`, que sólo emite el lienzo: `resolveSnap` no lo
produce). La traza en curso rotula ahora **longitud y ángulo**, no sólo longitud.

## Frontera

Todo el cambio es de presentación. No se tocan solver, unidades, signos, IDs,
topología, `ProjectModel`, workers, persistencia, import/export ni undo/redo. La
frontera protegida sigue intacta (53 archivos verificados).

## Cómo se verificó

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- `npm run verify:docs`, `verify:protected`, `verify:pwa`, `verify:i18n`,
  `verify:i18n-entry`, `verify:styles`, `verify:space3d`,
  `verify:structural-assets`, `validate:ci`, `verify:perf`.
- Pruebas nuevas: `canvasGrid.test.ts`, `scaleBar.test.ts`,
  `angleConstraint.test.ts`, `fitReserve.test.ts`.
- Pruebas actualizadas por el cambio de superficie: `CanvasChrome.test.tsx`
  (barra de escala en vez del cociente), `CanvasResultLayer.test.tsx` (la marca
  crítica conserva su nombre accesible y ya no lleva recuadro),
  `StructuralCanvas.fit.test.tsx` (lectura de cámara sobre el ancho de la regla).
- Recorrido manual con Playwright sobre el pórtico de ejemplo en 1440×900 y en
  un viewport compacto: cargas y diagrama completos tras «Encajar», píldora de
  estado sin desbordar, y la traza con Mayús fijando 150.0° y 2.000 m.

## Abierto

- Encender la capa de resultados no reencuadra: el diagrama recién mostrado
  puede quedar fuera hasta que se pulsa «Encajar». Reencuadrar solo sería un
  salto de cámara no pedido; queda como decisión de producto.
- La reserva de las cargas sobre barra usa la dirección media del registro. Una
  repartida que cambia de signo a lo largo del vano reserva por el lado
  dominante.
