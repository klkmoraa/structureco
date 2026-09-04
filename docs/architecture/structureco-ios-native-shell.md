# structureCo · Capa nativa y shell iOS (Swift)

**Clasificación:** `REFERENCE`

Este documento describe la capa de plataforma (`src/platform/**`), el contrato
del puente y el shell nativo que lo implementa (`ios/**`).

El shell existe en el árbol: seis archivos Swift, una especificación de
XcodeGen y un script de sincronización. Lo que **no** se versiona es el
`.xcodeproj` —lo genera XcodeGen— ni el build web dentro del paquete —lo copia
`ios/Scripts/sync-web.sh`—. Ese árbol no se compila en CI: no hay macOS, y
montarlo para un shell de seis archivos costaría más de lo que protege. Lo que
sí se comprueba en cada `npm run verify` es que los dos lados hablen el mismo
puente (ver §5).

Nada de lo que hay aquí toca el solver, el modelo, las unidades, los IDs, la
topología, los workers, la persistencia, el import/export ni el historial. La
capa nativa sólo cambia presentación y entrada.

---

## 1 · Qué aporta la capa de plataforma sin anfitrión nativo

`src/platform/nativeShell.ts` se monta una vez desde `src/App.tsx` y funciona
igual en un navegador normal:

| Señal | Cómo se publica | Para qué |
|---|---|---|
| Plataforma | `data-platform` en `<html>` (`ios`/`android`/`macos`/`other`) | Reglas que sólo valen en Apple (suavizado, 16 px en campos). |
| Instalada | `data-standalone` | Las barras fijas reclaman el área segura sólo cuando la app es la ventana. |
| Anfitrión nativo | `data-native` | Distinguir PWA instalada de shell Swift. |
| Puntero | `data-pointer` (`coarse`/`fine`) | Objetivo táctil y anulación del hover pegado. |
| Área segura | `--sc-safe-top/right/bottom/left` | Resuelven a `env(safe-area-inset-*)`. |
| Teclado | `--sc-keyboard-inset` | Alto real del teclado vía `visualViewport`; `env()` no lo ve. |
| Alto visible | `--sc-viewport-h` | Alto inmune a la barra dinámica de Safari. |
| Barra de estado | `<meta name="theme-color">` reescrito por tema | Sin esto, Noche deja una franja clara arriba. |

`src/platform/haptics.ts` degrada en tres escalones: shell nativo →
`navigator.vibrate` → silencio. Safari en iOS no expone vibración a la web, así
que en un iPhone sin shell nativo **no vibra nada**, y eso es correcto: fingir
una háptica con una animación es ruido visual, no retroalimentación.

## 2 · El contrato del puente

`src/platform/nativeBridge.ts` es la única fuente de verdad. Está tipado, así
que `npm run typecheck` impide que la web emita un mensaje que el contrato no
declare.

- **Canal**: `structureco`. El shell registra exactamente ese
  `WKScriptMessageHandler`.
- **Versión**: `NATIVE_BRIDGE_VERSION` (`1.0.0`). El shell debe rechazar una
  versión mayor distinta en vez de adivinar.
- **Web → nativo**: `sendToNative(message)` sobre
  `window.webkit.messageHandlers.structureco.postMessage`. Devuelve `false` sin
  lanzar cuando no hay anfitrión.
- **Nativo → web**: `window.StructureCoNative.receive(message)`, invocado con
  `evaluateJavaScript`.

### Mensajes salientes (`NativeOutboundMessage`)

| `kind` | Carga | Qué espera del shell |
|---|---|---|
| `app.ready` | `version` | Comprobar la versión del contrato y responder con `safeArea`. |
| `haptic.impact` | `style` | `UIImpactFeedbackGenerator`. |
| `haptic.selection` | — | `UISelectionFeedbackGenerator`. |
| `haptic.notification` | `style` | `UINotificationFeedbackGenerator`. |
| `statusBar.style` | `light`/`dark` | `preferredStatusBarStyle`. |
| `share` | `title`, `text?`, `url?` | `UIActivityViewController`. |
| `share.file` | `filename`, `mimeType`, `base64` | Escribir a temporal y compartir. |
| `scroll.lock` | `locked` | `scrollView.isScrollEnabled`. |

### Mensajes entrantes (`NativeInboundMessage`)

| `kind` | Carga | Efecto en la web |
|---|---|---|
| `safeArea` | `insets` | Sobrescribe `--sc-safe-*` en línea sobre `:root`. |
| `keyboard` | `height` | Sobrescribe `--sc-keyboard-inset`. |
| `appearance` | `theme` | Reservado: la web decide su tema hoy. |
| `lifecycle` | `phase` | Reservado para pausar trabajo en segundo plano. |
| `openFile` | `filename`, `mimeType`, `base64` | Reservado para el importador. |

El estilo de la barra de estado se envía en la convención de UIKit: cuando la
aplicación está en Noche, el contenido de la barra tiene que ser **claro**, así
que la web manda `style: 'light'` con tema oscuro. No es un error de signo.
## 3 · El lado Swift

El shell es **SwiftUI**. `ios/StructureCo/Sources/` es la implementación real y
completa; lo que sigue es su núcleo, recortado, para leer el mecanismo sin abrir
los archivos. El detalle de puesta en marcha está en
[ios/README.md](../../ios/README.md).

Todo lo que en una versión UIKit serían delegados es aquí una modificación
declarativa: `.onOpenURL`, `scenePhase`, `.preferredColorScheme`,
`.sensoryFeedback`. La vista web es la de SwiftUI —`WebView` sobre un `WebPage`
observable—, así que tampoco hay `UIViewRepresentable`, ni coordinador, ni ida
y vuelta manual de estado entre SwiftUI y UIKit. Queda un solo envoltorio,
`ShareSheet`, por la razón que se explica al final.

**Por qué un esquema propio y no `file://`.** structureCo se compila a módulos
ES y mueve el solver a Web Workers. WebKit aplica CORS a `file://` y trata cada
archivo como un origen opaco distinto: ahí los `import` fallan, los workers no
arrancan e IndexedDB no persiste entre sesiones. `AppSchemeHandler` sirve el
build bajo `structureco://app`, que sí es un origen real. No es una preferencia
de estilo: sobre `file://` la aplicación no arranca.

### El puente y la página

El modelo es dueño del `WebPage`: la página tiene que existir configurada —con
su manejador de esquema y su canal de mensajes— antes de que la vista la pinte.

```swift
@Observable
@MainActor
final class NativeBridgeModel {
    var interfaceScheme: ColorScheme?      // barra de estado
    var shareItem: ShareItem?              // hoja de compartir pendiente
    var scrollLocked = false               // desplazamiento del anfitrión
    let page: WebPage

    init() {
        var configuration = WebPage.Configuration()
        if let scheme = URLScheme(AppSchemeHandler.scheme) {
            configuration.urlSchemeHandlers[scheme] = AppSchemeHandler()
        }
        configuration.userContentController.add(relay, name: "structureco")
        page = WebPage(configuration: configuration, navigationDecider: ExternalLinkDecider())
        relay.model = self
        page.load(URLRequest(url: AppSchemeHandler.indexURL))
    }

    @discardableResult
    func receive(_ body: [String: Any]) -> Bool {
        guard let kind = body["kind"] as? String else { return false }
        switch kind {
        case "app.ready":
            // El contrato es 1.x; una mayor distinta significa que este shell
            // se quedó atrás y hay que actualizarlo, no adivinar.
            guard let version = body["version"] as? String, version.hasPrefix("1.") else { return true }
            ready = true

        case "haptic.selection":
            fire(.selection)

        case "statusBar.style":
            // La web envía el color que debe tener el CONTENIDO de la barra:
            // en Noche pide `light`, y eso es declarar el esquema oscuro.
            interfaceScheme = (body["style"] as? String) == "light" ? .dark : .light

        case "scroll.lock":
            scrollLocked = (body["locked"] as? Bool) ?? false

        default:
            return false
        }
        return true
    }

    /// Argumentos tipados, no una cadena concatenada: un expediente en base64
    /// puede pesar megas y no tiene por qué atravesar el analizador como texto.
    private func send(_ message: [String: Any]) {
        Task {
            try? await page.callJavaScript(
                "window.StructureCoNative?.receive(message)",
                arguments: ["message": message]
            )
        }
    }
}
```

Los mapeos de valores —tipos MIME, estilos de háptica— se escriben como
diccionarios y no como `switch`. Es una convención que el gate de la §5 da por
hecha: en este shell un `case "…":` significa exactamente un `kind` del
contrato.

### La pantalla

```swift
struct RootView: View {
    @State private var bridge = NativeBridgeModel()
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        GeometryReader { proxy in
            WebView(bridge.page)
                .webViewContentBackground(.hidden)
                .webViewScrollInputBehavior(bridge.scrollLocked ? .disabled : .enabled, for: .scroll)
                .webViewMagnificationGestures(.disabled)
                .ignoresSafeArea()
                .onChange(of: proxy.safeAreaInsets, initial: true) { _, insets in
                    bridge.windowHeight = proxy.size.height + insets.top + insets.bottom
                    bridge.publishSafeArea(insets)
                }
        }
        // El teclado NO empuja la vista: taparía el lienzo. Su alto se publica
        // y lo reparte el CSS donde hace falta.
        .ignoresSafeArea(.keyboard)
        .preferredColorScheme(bridge.interfaceScheme)
        .sensoryFeedback(trigger: bridge.feedbackTick) { _, _ in bridge.feedback }
        .sheet(item: $bridge.shareItem) { ShareSheet(items: $0.items) }
        .onOpenURL { url in bridge.open(url: url) }
        .onChange(of: scenePhase) { _, phase in /* lifecycle */ }
    }
}
```

El desplazamiento, el zoom y el fondo son modificadores: lo que antes eran tres
propiedades del `UIScrollView` ajustadas desde `updateUIView`.

### Lo que sigue siendo UIKit, y por qué

- **`ShareSheet`** — `ShareLink` es declarativo y pide conocer lo que se
  comparte al construir la vista; aquí el archivo llega en un mensaje del puente
  mucho después. Para algo que aparece por un evento y no por un botón,
  `UIActivityViewController` desde un `.sheet(item:)` es lo correcto.
- **`MessageRelay`** — el canal web → nativo sigue pidiendo un objeto
  Objective-C. Son seis líneas que reciben y reenvían, sin lógica propia, para
  que el modelo pueda ser una clase Swift normal y observable.

### Versión mínima y concurrencia

El suelo declarado es **iOS 27**. El código usa APIs de **iOS 26** —`WebView`,
`WebPage`, `URLSchemeHandler`—, así que bajarlo a 26.0 no requiere tocar una
línea. El proyecto compila en **Swift 6** con concurrencia estricta completa y
aislamiento al actor principal por defecto; `AppSchemeHandler` y el relevo de
mensajes se marcan `nonisolated` porque servir archivos y recibir un mensaje del
protocolo no tienen por qué ocupar ese actor.

## 4 · Lo que el shell nativo **no** debe hacer

- No reimplementa navegación, ni barra de pestañas, ni pantallas: la interfaz
  entera es la web. Un shell que dibuje su propia barra duplica estado.
- No toca el modelo ni la persistencia. IndexedDB dentro de `WKWebView` es
  persistente mientras la aplicación esté instalada; migrar a un almacén nativo
  crea una segunda fuente de verdad.
- No inyecta CSS ni JavaScript de presentación. Todo lo que cambia por ser
  nativo se decide con los atributos de la sección 1.

## 5 · Comprobación

El puente vive en dos lenguajes y ningún compilador ve los dos a la vez. `tsc`
impide que la web emita un mensaje que no declara, pero no sabe si Swift lo
atiende: sin más control, añadir un mensaje nuevo compilaría, pasaría las
pruebas, se publicaría — y en el teléfono no haría nada, en silencio.

`npm run verify:native-bridge` cierra ese hueco con dos reglas:

1. Todo `kind` saliente declarado en TypeScript tiene su `case` en el shell.
2. Todo `kind` que el shell envía está declarado como entrante en TypeScript.

Un entrante declarado y todavía sin emisor no es un error —el contrato puede
reservar vocabulario antes de que el shell lo use— y se informa sin fallar.

```powershell
npm.cmd run verify:native-bridge   # paridad del puente
npm.cmd run typecheck              # el contrato es tipado
npm.cmd run verify                 # cadena completa, la paridad incluida
```

Del lado Swift no hay gate y esto es una limitación declarada, no un olvido.

Vuelve al [mapa de arquitectura](README.md).
