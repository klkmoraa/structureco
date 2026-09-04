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

`ios/StructureCo/Sources/WebHostController.swift` es la implementación real y
completa; lo que sigue es su núcleo, recortado, para leer el mecanismo sin
abrir el archivo. El detalle de puesta en marcha está en
[ios/README.md](../../ios/README.md).

**Por qué un esquema propio y no `file://`.** structureCo se compila a módulos
ES y mueve el solver a Web Workers. WebKit aplica CORS a `file://` y trata cada
archivo como un origen opaco distinto: ahí los `import` fallan, los workers no
arrancan e IndexedDB no persiste entre sesiones. `AppSchemeHandler` sirve el
build bajo `structureco://app`, que sí es un origen real. No es una preferencia
de estilo: sobre `file://` la aplicación no arranca.

```swift
import UIKit
import WebKit

final class StructureCoViewController: UIViewController, WKScriptMessageHandler {
    private var webView: WKWebView!
    private var statusBarStyle: UIStatusBarStyle = .darkContent

    override var preferredStatusBarStyle: UIStatusBarStyle { statusBarStyle }

    override func viewDidLoad() {
        super.viewDidLoad()

        let configuration = WKWebViewConfiguration()
        configuration.userContentController.add(self, name: "structureco")
        // El lienzo hace pellizco y arrastre: sin esto, iOS se queda el gesto.
        configuration.allowsInlineMediaPlayback = true

        webView = WKWebView(frame: .zero, configuration: configuration)
        // El rebote elástico del documento delata el marco web.
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        // La aplicación llega al borde físico; el inset lo reparte el CSS.
        webView.insetsLayoutMarginsFromSafeArea = false
        view.addSubview(webView)

        let index = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "web")!
        webView.loadFileURL(index, allowingReadAccessTo: index.deletingLastPathComponent())
    }

    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        publishSafeArea()
    }

    private func publishSafeArea() {
        let insets = view.safeAreaInsets
        send([
            "kind": "safeArea",
            "insets": [
                "top": insets.top, "right": insets.right,
                "bottom": insets.bottom, "left": insets.left,
            ],
        ])
    }

    private func send(_ message: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: message),
              let json = String(data: data, encoding: .utf8) else { return }
        webView.evaluateJavaScript("window.StructureCoNative?.receive(\(json))")
    }

    // MARK: - Web → nativo

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any],
              let kind = body["kind"] as? String else { return }

        switch kind {
        case "app.ready":
            // El contrato es 1.x; una mayor distinta significa que este shell
            // se quedó atrás y hay que actualizarlo, no adivinar.
            guard let version = body["version"] as? String, version.hasPrefix("1.") else { return }
            publishSafeArea()

        case "haptic.impact":
            let style: UIImpactFeedbackGenerator.FeedbackStyle
            switch body["style"] as? String {
            case "heavy": style = .heavy
            case "medium": style = .medium
            case "rigid": style = .rigid
            case "soft": style = .soft
            default: style = .light
            }
            UIImpactFeedbackGenerator(style: style).impactOccurred()

        case "haptic.selection":
            UISelectionFeedbackGenerator().selectionChanged()

        case "haptic.notification":
            let type: UINotificationFeedbackGenerator.FeedbackType
            switch body["style"] as? String {
            case "warning": type = .warning
            case "error": type = .error
            default: type = .success
            }
            UINotificationFeedbackGenerator().notificationOccurred(type)

        case "statusBar.style":
            statusBarStyle = (body["style"] as? String) == "light" ? .lightContent : .darkContent
            setNeedsStatusBarAppearanceUpdate()

        case "share":
            let items: [Any] = [body["url"], body["text"], body["title"]].compactMap { $0 }
            present(UIActivityViewController(activityItems: items, applicationActivities: nil), animated: true)

        case "scroll.lock":
            webView.scrollView.isScrollEnabled = !((body["locked"] as? Bool) ?? false)

        default:
            break
        }
    }
}
```

El teclado se puede publicar además desde `keyboardWillChangeFrameNotification`
con `{"kind": "keyboard", "height": …}`; sin eso, la web ya lo sigue por
`visualViewport`, que dentro de un `WKWebView` funciona igual que en Safari.

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
