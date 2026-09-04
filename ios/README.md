# structureCo · shell iOS

Aplicación **SwiftUI** mínima que envuelve la web de structureCo en un
`WKWebView`. La interfaz entera sigue siendo la web: aquí sólo vive lo que un
navegador no puede dar.

## Poner en marcha

```bash
brew install xcodegen          # una vez
npm run ios:sync               # compila la web y la copia al paquete
cd ios && xcodegen generate    # produce StructureCo.xcodeproj
open StructureCo.xcodeproj
```

En Xcode: elegir un equipo de firma en **Signing & Capabilities** y ejecutar.
`DEVELOPMENT_TEAM` va vacío en `project.yml` a propósito — un identificador de
equipo es una credencial de cada quien, no del repositorio.

## Qué hay aquí y qué no

| Archivo | Responsabilidad |
|---|---|
| `StructureCoApp.swift` | `App` de SwiftUI con su `WindowGroup`. Nada más. |
| `RootView.swift` | La pantalla: la vista web y ocho modificadores. |
| `NativeBridgeModel.swift` | Estado observable y dueño del `WebPage`. |
| `AppSchemeHandler.swift` | Sirve el build web bajo `structureco://app`. |
| `ShareSheet.swift` | `UIActivityViewController` presentado desde `.sheet`. |
| `Resources/PrivacyInfo.xcprivacy` | Manifiesto de privacidad: sin recolección, sin seguimiento. |

**No** hay navegación nativa, ni pestañas, ni pantallas propias, ni almacén
nativo. Todo eso lo tiene ya la web, y duplicarlo crearía una segunda fuente de
verdad que se desincroniza.

## SwiftUI, y qué queda de UIKit

Todo lo que era un delegado es una modificación declarativa: la apertura de
archivos es `.onOpenURL`, el segundo plano es `scenePhase`, la barra de estado
es `.preferredColorScheme` y las hápticas son `.sensoryFeedback`. No hay
`AppDelegate`, ni `SceneDelegate`, ni `UIWindow` montada a mano, ni una sola
llamada a `setNeedsStatusBarAppearanceUpdate`.

La vista web es la de SwiftUI: `WebView(page)` sobre un `WebPage` observable, no
un `UIViewRepresentable` alrededor de `WKWebView`. Con eso desaparecen el
coordinador, `makeUIView`/`updateUIView` y el ida y vuelta manual de estado
entre SwiftUI y UIKit; el desplazamiento, el zoom y el fondo pasan a ser
modificadores (`webViewScrollInputBehavior`, `webViewMagnificationGestures`,
`webViewContentBackground`), y el envío al JavaScript va por
`page.callJavaScript` con argumentos tipados en vez de una cadena concatenada.

Queda **un** envoltorio de UIKit, y no por comodidad: **`ShareSheet`**.
`ShareLink` existe, pero es declarativo —pide conocer lo que se comparte al
construir la vista— y aquí el archivo llega en un mensaje del puente mucho
después. Para compartir algo que aparece por un evento y no por un botón,
`UIActivityViewController` desde un `.sheet(item:)` es lo correcto.

El canal web → nativo sigue siendo `WKUserContentController`, que pide un objeto
Objective-C; `MessageRelay` es un relevo de seis líneas que recibe y reenvía,
para que el modelo pueda ser una clase Swift normal y observable.

## Versión mínima y concurrencia

El suelo declarado es **iOS 27**, la versión en la que se publica. El código usa
APIs de **iOS 26** —`WebView`, `WebPage`, `URLSchemeHandler`— además de
`@Observable`, `onChange(of:initial:)` y `.sensoryFeedback`, así que bajar el
suelo a 26.0 no requiere tocar una línea. Por debajo de ahí habría que
reintroducir el `UIViewRepresentable` que esta versión retira.

El proyecto compila en **Swift 6 con concurrencia estricta completa** y
aislamiento al actor principal por defecto
(`SWIFT_DEFAULT_ACTOR_ISOLATION: MainActor`). Un shell de interfaz como éste lo
está entero salvo lo que se marque: `AppSchemeHandler` es `nonisolated` porque
leer archivos del paquete no tiene por qué ocupar el actor principal, y el
relevo de mensajes también, porque el requisito del protocolo lo es.

## Las tres decisiones que importan

**Esquema propio en vez de `file://`.** structureCo se compila a módulos ES y
mueve el solver a Web Workers. WebKit aplica CORS a `file://` y trata cada
archivo como un origen opaco distinto: sobre `file://` los `import` fallan, los
workers no arrancan e IndexedDB —donde vive el Project Hub— no persiste entre
sesiones. `AppSchemeHandler` da un origen real y con él todo eso funciona.

**El build web no se versiona.** `ios/StructureCo/Web` es exactamente el mismo
`dist/` que se publica en la web. Guardarlo en Git sería una segunda copia del
producto que puede quedarse atrás sin que nadie lo note; `ios/Scripts/sync-web.sh`
lo regenera.

**El `.xcodeproj` tampoco.** Un `.pbxproj` escrito a mano no lo revisa nadie de
verdad, produce conflictos ilegibles en cada fusión y se rompe en silencio.
`project.yml` es la fuente y XcodeGen genera el proyecto.

## Una convención que el gate da por hecha

En este shell, `case "…":` significa exactamente una cosa: un `kind` del
contrato del puente. Los mapeos de valores —tipos MIME, estilos de háptica— se
escriben como diccionarios, no como `switch`. No es una preferencia de estilo:
`verify:native-bridge` lee esos `case` para comprobar la paridad, y un `switch`
sobre «heavy» o «warning» entraría ahí como un mensaje que la web no declara.

## El puente

El contrato lo declara la web, tipado, en `src/platform/nativeBridge.ts`, y está
explicado en
[docs/architecture/structureco-ios-native-shell.md](../docs/architecture/structureco-ios-native-shell.md).
Este shell es su implementación: hápticas, barra de estado, hoja de compartir,
insets de área segura, alto del teclado, bloqueo de desplazamiento y apertura de
archivos.

Si el shell y la web dejan de hablar la misma versión mayor del contrato, el
shell no responde a `app.ready` y la web sigue funcionando con sus caminos web:
degradar es siempre preferible a adivinar.

## Verificación

No hay gate automático: este árbol no compila Swift, no hay macOS en CI y montar
uno para un shell de seis archivos costaría más de lo que protege. Lo que sí
está verificado es el lado web —`npm run verify`— y el contrato, que es tipado y
falla en `npm run typecheck` si la web emite un mensaje que no existe.
