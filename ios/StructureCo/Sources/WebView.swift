import SwiftUI
import WebKit

/**
 * El `WKWebView`, envuelto para SwiftUI.
 *
 * Es la única pieza de este shell que sigue siendo UIKit, y no por comodidad:
 * SwiftUI no tiene vista web propia en el objetivo de despliegue de esta
 * aplicación. Envolverla es la forma correcta de usarla, y el envoltorio se
 * mantiene fino a propósito — todo el estado vive en `NativeBridgeModel`, y
 * aquí sólo quedan la creación de la vista y el despacho de mensajes.
 */
struct WebView: UIViewRepresentable {
    let bridge: NativeBridgeModel
    /**
     * Se pasa como valor y no se lee del modelo dentro de `updateUIView`:
     * SwiftUI vuelve a llamar a `updateUIView` cuando cambia una propiedad de
     * la estructura, y depender de una lectura observada aquí dentro sería
     * confiar en un efecto que el representable no declara.
     */
    let scrollLocked: Bool

    func makeCoordinator() -> Coordinator { Coordinator(bridge: bridge) }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.setURLSchemeHandler(AppSchemeHandler(), forURLScheme: AppSchemeHandler.scheme)
        configuration.userContentController.add(context.coordinator, name: "structureco")
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear
        // El rebote elástico del `scrollView` despega la barra superior del
        // borde y delata el marco web. El documento no se desplaza: lo hacen sus
        // paneles, que ya contienen su propio gesto.
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.showsVerticalScrollIndicator = false
        webView.allowsBackForwardNavigationGestures = false

        context.coordinator.attach(webView: webView)
        webView.load(URLRequest(url: AppSchemeHandler.indexURL))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        webView.scrollView.isScrollEnabled = !scrollLocked
    }

    static func dismantleUIView(_ webView: WKWebView, coordinator: Coordinator) {
        webView.configuration.userContentController.removeScriptMessageHandler(forName: "structureco")
    }

    /**
     * `WKScriptMessageHandler` no está aislado al actor principal en el SDK, así
     * que la clase tampoco lo está: marcarla entera obligaría a saltar de actor
     * en cada conformidad. WebKit sí entrega estos mensajes en el hilo
     * principal, y `assumeIsolated` lo afirma en el único punto donde importa.
     */
    final class Coordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
        private let bridge: NativeBridgeModel
        private weak var webView: WKWebView?

        init(bridge: NativeBridgeModel) { self.bridge = bridge }

        func attach(webView: WKWebView) {
            self.webView = webView
            bridge.send = { [weak webView] message in
                guard
                    let data = try? JSONSerialization.data(withJSONObject: message),
                    let json = String(data: data, encoding: .utf8)
                else { return }
                Task { @MainActor in
                    webView?.evaluateJavaScript("window.StructureCoNative?.receive(\(json))")
                }
            }
        }

        func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
            guard let body = message.body as? [String: Any] else { return }
            MainActor.assumeIsolated { bridge.receive(body) }
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.allow)
                return
            }
            // La aplicación vive entera en su propio esquema. Cualquier otra
            // cosa es un enlace externo y va a Safari: abrirlo dentro dejaría al
            // usuario atrapado en una web sin barra de direcciones ni botón de
            // volver.
            if url.scheme == AppSchemeHandler.scheme || url.scheme == "about" {
                decisionHandler(.allow)
                return
            }
            decisionHandler(.cancel)
            if let scheme = url.scheme, ["http", "https", "mailto", "tel"].contains(scheme) {
                UIApplication.shared.open(url)
            }
        }
    }
}
