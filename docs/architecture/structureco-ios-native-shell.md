# structureCo · Capa nativa y shell iOS (Swift)

**Clasificación:** `REFERENCE`

Este documento describe la capa de plataforma que ya vive en el árbol
(`src/platform/**`) y el contrato exacto que un shell nativo en Swift tiene que
cumplir para envolverla. **No hay proyecto Xcode en este repositorio y este
documento no lo aprueba**: describe la superficie que el producto web publica
para que, si se decide construirlo, no haya que renegociar nada del lado web.

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

Lo mínimo que hace falta. El `WKWebView` sirve el mismo `dist/` que se publica
en la web, así que no hay una segunda compilación del producto.

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

No hay gate nativo porque no hay proyecto nativo. Del lado web:

```powershell
npm.cmd run typecheck   # el contrato del puente es tipado
npm.cmd run verify      # lint, docs, frontera, pruebas, build y presupuesto
```

Vuelve al [mapa de arquitectura](README.md).
