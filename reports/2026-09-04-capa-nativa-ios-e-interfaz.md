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

## Segundo tramo · el shell existe y el puente se comprueba

**`ios/` es una aplicación real, en SwiftUI.** Seis archivos: `WKWebView` a
pantalla completa, insets, teclado, hápticas, hoja de compartir, barra de estado,
bloqueo de desplazamiento y apertura de archivos del sistema. El
`.xcodeproj` no se versiona —lo genera XcodeGen desde `ios/project.yml`— ni el
build web dentro del paquete —lo copia `ios/Scripts/sync-web.sh`—.

Todo lo que sería un delegado es una modificación declarativa: `.onOpenURL`,
`scenePhase`, `.preferredColorScheme`, `.sensoryFeedback`. No hay `AppDelegate`,
ni `SceneDelegate`, ni `UIWindow` montada a mano, ni una llamada a
`setNeedsStatusBarAppearanceUpdate`. Quedan dos envoltorios de UIKit y ninguno
por comodidad: `WebView`, porque SwiftUI no tiene vista web propia en este
objetivo de despliegue; y `ShareSheet`, porque `ShareLink` es declarativo y pide
conocer lo que se comparte al construir la vista, mientras que aquí el archivo
llega en un mensaje del puente mucho después. El suelo es iOS 17 porque
`@Observable`, `onChange(of:initial:)` y `.sensoryFeedback` son la forma nativa
de hacer lo que este shell hace.

La decisión que decide si arranca o no: **esquema propio, no `file://`**.
structureCo se compila a módulos ES y mueve el solver a Web Workers; WebKit
aplica CORS a `file://` y trata cada archivo como un origen opaco distinto, así
que ahí los `import` fallan, los workers no arrancan e IndexedDB no persiste.
`AppSchemeHandler` sirve el build bajo `structureco://app`, que sí es un origen.

**`platform/fileDelivery` es ahora la única salida de archivo.** Un
`<a download>` no entrega nada dentro de un `WKWebView`: no descarga, no avisa,
no falla. El usuario toca «exportar» y no pasa absolutamente nada. Ocho rutas de
exportación —proyecto, SVG, PNG, CSV de resultados, CSV del BOM, secciones
personales, ilustraciones del Estudio, diagnósticos— pasaban por ahí.

**El enlace compartido tenía el mismo problema con otra cara.** Dentro del shell
la página vive en `structureco://app`, que no es contexto seguro: `navigator.clipboard`
no existe y la acción terminaba siempre en «no se pudo copiar el enlace». Ahora,
sin origen web, se comparte el proyecto como archivo —la misma intención por el
único camino que funciona—, y con origen web pero sin portapapeles queda la hoja
de compartir en vez de un error.

**El zoom por doble toque lo quita el CSS, no un oyente.** La primera versión de
esta capa cancelaba en JavaScript el segundo `touchend` rápido, y eso cancelaba
también el `click` sintético: tocar dos veces seguidas el «+» del zoom perdía la
segunda pulsación. `touch-action: manipulation` en la raíz hace justo lo que hay
que hacer y deja el clic intacto.

**`PrivacyInfo.xcprivacy`.** Apple lo exige desde mayo de 2024 y su contenido es
una declaración, no un trámite: sin recolección, sin seguimiento y sin APIs de
las que haya que justificar el uso, porque no hay backend, ni SDK de terceros,
ni red obligatoria.

**El service worker no se registra dentro del shell.** El contenido viaja en el
paquete y lo renueva la App Store; un worker ahí sólo añadiría una segunda copia
del build y un aviso de «hay una versión nueva» que no puede ser cierto.

## Cómo se comprueba un puente en dos lenguajes

Ningún compilador ve los dos lados. `tsc` impide que la web emita un mensaje que
no declara, pero no sabe si Swift lo atiende: añadir uno nuevo compilaría,
pasaría las pruebas, se publicaría — y en el teléfono no haría nada.

- `npm run verify:native-bridge` (en la cadena de `verify`) exige que todo
  saliente declarado tenga su `case` en el shell y que todo lo que el shell
  envía esté declarado como entrante. Además prohíbe que ninguna ruta vuelva al
  `<a download>` fuera de `fileDelivery`.
- `npm run qa:native-shell` levanta el build sobre un origen HTTP real y
  suplanta `window.webkit.messageHandlers` antes de que cargue la aplicación: la
  web se cree nativa y se comprueba el contrato en los dos sentidos —insets,
  teclado, `app.ready`, barra de estado, asa de hoja y bloqueo de
  desplazamiento— sin necesitar un Mac.

Del lado Swift no hay gate y es una limitación declarada: no hay macOS en CI y
montarlo para seis archivos costaría más de lo que protege.

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
PWA, **paridad del puente nativo**, i18n, estilos, 2741 pruebas, build, chunk de
entrada y presupuesto de rendimiento (1 330 416 / 366 413 gzip, límites
1 400 000 / 380 000). No se añadió ninguna prueba nueva.

`npm run qa:native-shell`: 14 comprobaciones en verde, incluido el arrastre de
hoja con toques reales — `touch-action` en la raíz podría anularlo sin que se
notara en ninguna otra prueba.

Comprobado además en navegador real (Chromium, iPhone 15 Pro e iPad emulados,
Día y Noche): el arrastre de hoja descarta a 216 px y vuelve a su sitio a 30 px.

## Abierto

- **El shell iOS no se ha compilado nunca.** No hay macOS aquí ni en CI, así que
  los seis archivos Swift están escritos contra la documentación de SwiftUI y
  WebKit pero sin pasar por un compilador. Lo que sí está verificado es el lado
  web del puente, que es donde una regresión pasaría inadvertida. La primera
  ejecución en Xcode puede necesitar retoques.
- `DEVELOPMENT_TEAM` va vacío en `ios/project.yml`: un identificador de equipo
  es una credencial de cada quien, no del repositorio.
- Las hápticas no suenan en Safari iOS sin el shell: el navegador no expone
  vibración. Es un límite de la plataforma, no una tarea pendiente.
- `appearance` está declarado como mensaje entrante y todavía sin emisor: el
  tema lo decide la web. El gate lo informa sin fallar.
- El gate de paridad da por hecha una convención del shell: un `case "…":` es un
  `kind` del contrato, y los mapeos de valores se escriben como diccionarios.
  Está anotada en `ios/README.md` y en el propio código.
