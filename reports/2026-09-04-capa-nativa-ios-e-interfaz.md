# Capa nativa iOS, tipografía y limpieza de interfaz

**Clasificación:** `AUDIT/TEMPORARY`

## Qué cambió

**Capa de plataforma nueva (`src/platform/**`).** `nativeShell.ts` publica en
`<html>` lo que el CSS no puede preguntar (`data-platform`, `data-standalone`,
`data-native`, `data-pointer`) y mantiene vivas el área segura, el alto real
del teclado (`visualViewport`, que es lo único que ve el teclado de iOS) y el
color de la barra de estado. `nativeBridge.ts` declara, tipado, el contrato con
un anfitrión Swift; `haptics.ts` degrada de `UIImpactFeedbackGenerator` a
`navigator.vibrate` a silencio. `native.css` reúne el comportamiento de
plataforma: inercia y contención de desplazamiento, hover no pegado, objetivo
táctil de 44 px sin engordar la pieza, 16 px en campos para que Safari no haga
zoom al enfocar, y las entradas de pantalla.

**Área segura con un solo dueño.** Las 131 apariciones de
`env(safe-area-inset-*)` repartidas por doce archivos pasan a consumir
`--sc-safe-top/right/bottom/left`. El shell nativo puede sobrescribirlos con
los insets reales de su ventana sin tocar una sola feature.

**Movimiento.** `design-system/motion.ts` recoge los cuatro muelles del
producto y las variantes derivadas; los tokens suman las curvas de iOS.
`ModalSurface` gana asa y arrastre para descartar (96 px o 520 px/s, sólo desde
la cabecera y sólo con dedo), y la pantalla completa en teléfono pasa a ser una
*page sheet*. Inicio y la mesa de trabajo comparten una única entrada de
pantalla; se retiraron dos `@keyframes` duplicados de `styles.css`.

**Tipografía.** Instrument Sans gana su cursiva real —con `font-synthesis:
none`, hasta ahora todo énfasis se pintaba recto— en dos subconjuntos por
`unicode-range`. Dos respaldos con métricas ajustadas eliminan el
desplazamiento de composición del primer pintado.

**Iconos de aplicación.** iOS no lee SVG en `apple-touch-icon`: un iPhone que
añadía structureCo a la pantalla de inicio se quedaba sin icono.
`scripts/generate-app-icons.mjs` genera 180/192/512/512-maskable desde el mismo
SVG. El icono y `theme-color` pasan del lima heredado al verde de marca vigente
y al fondo real de la aplicación.

## Defectos corregidos

- **Píldora de escala estirada.** `mobileCanvasDensity.css` la anclaba arriba y
  `phase2.css` abajo; en un iPhone se dibujaba una cápsula de la altura entera
  del lienzo sobre el dibujo. La posición táctil tiene ahora un solo dueño.
- **Filtros de Model Doctor aplastados.** Contenedor de scroll horizontal dentro
  de un cuerpo en columna: su `min-height: auto` resolvía a 0 y las tres
  pastillas medían 4 px de alto.
- **Aviso legal desbordado.** `flex: 0 0 22px` con texto de dos líneas se salía
  de su caja sobre la paleta de herramientas.
- **Inicio en teléfono.** Dos franjas de chrome apiladas (118 px) con la marca
  escrita dos veces pasan a una barra de 54 px con título grande que se
  desplaza. Las dos acciones principales se apilan a ancho completo en vez de
  recortarse con puntos suspensivos; en escritorio se dimensionan por su
  etiqueta.

## Qué NO cambió

Solver, modelo, unidades, signos, IDs, topología, `ProjectModel`, workers,
persistencia, import/export e historial. `npm run verify:protected` lo confirma.

## Verificación

`npm run verify` completo en verde: lint, documentación, frontera protegida,
PWA, i18n, estilos, 2741 pruebas, build, chunk de entrada y presupuesto de
rendimiento (1 329 378 / 365 762 gzip, límites 1 400 000 / 380 000).

Comprobado además en navegador real (Chromium, iPhone 15 Pro e iPad emulados,
Día y Noche): el arrastre de hoja descarta a 216 px y vuelve a su sitio a 30 px.

## Abierto

- No hay proyecto Xcode. El contrato del puente está descrito y tipado en
  [docs/architecture/structureco-ios-native-shell.md](../docs/architecture/structureco-ios-native-shell.md);
  construir el shell requiere una petición explícita.
- Las hápticas no suenan en Safari iOS sin ese shell: el navegador no expone
  vibración. Es un límite de la plataforma, no una tarea pendiente.
