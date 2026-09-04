import UIKit
import WebKit

/**
 * El anfitrión: un `WKWebView` a pantalla completa y el otro extremo del puente
 * que `src/platform/nativeBridge.ts` declara.
 *
 * Reparto de responsabilidades, que es lo que evita que esto crezca hasta
 * volverse una segunda aplicación: la interfaz entera es la web. Aquí no hay
 * navegación, ni pestañas, ni pantallas propias. Sólo lo que un navegador no
 * puede dar — insets reales, teclado, hápticas, hoja de compartir, barra de
 * estado — y el transporte para pedirlo.
 */
final class WebHostController: UIViewController, WKScriptMessageHandler, WKNavigationDelegate, WKUIDelegate {
    private var webView: WKWebView!
    private var statusBarStyle: UIStatusBarStyle = .darkContent
    private var bridgeReady = false
    /// Archivo que llegó antes de que la web pudiera recibirlo.
    private var pendingOpen: URL?

    override var preferredStatusBarStyle: UIStatusBarStyle { statusBarStyle }
    override var prefersHomeIndicatorAutoHidden: Bool { false }

    // MARK: - Ciclo de vida

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(named: "AppBackground") ?? .systemBackground

        let configuration = WKWebViewConfiguration()
        configuration.setURLSchemeHandler(AppSchemeHandler(), forURLScheme: AppSchemeHandler.scheme)
        configuration.userContentController.add(self, name: "structureco")
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        // El lienzo estructural resuelve su propio pellizco y arrastre; dejar
        // que WebKit haga además zoom de página desalinea el dibujo del dedo.
        configuration.preferences.isTextInteractionEnabled = true

        webView = WKWebView(frame: view.bounds, configuration: configuration)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear
        // El rebote elástico del `scrollView` despega la barra superior del
        // borde y delata el marco web; el documento no se desplaza, lo hacen
        // sus paneles, que ya contienen su propio gesto.
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.showsVerticalScrollIndicator = false
        webView.allowsBackForwardNavigationGestures = false
        view.addSubview(webView)

        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])

        observeKeyboard()
        Haptics.prepare()
        webView.load(URLRequest(url: AppSchemeHandler.indexURL))
    }

    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        publishSafeArea()
    }

    // MARK: - Nativo → web

    private func publishSafeArea() {
        let insets = view.safeAreaInsets
        send([
            "kind": "safeArea",
            "insets": [
                "top": insets.top,
                "right": insets.right,
                "bottom": insets.bottom,
                "left": insets.left,
            ],
        ])
    }

    func publishLifecycle(phase: String) {
        send(["kind": "lifecycle", "phase": phase])
    }

    /**
     * El teclado se publica en puntos CSS y sólo lo que de verdad tapa la
     * ventana. La web ya lo sigue con `visualViewport`, pero dentro de un
     * `WKWebView` esa medida llega un fotograma tarde y con el teclado a medio
     * subir; el valor del sistema es exacto desde el primer instante.
     */
    private func observeKeyboard() {
        let center = NotificationCenter.default
        center.addObserver(
            self,
            selector: #selector(keyboardChanged(_:)),
            name: UIResponder.keyboardWillChangeFrameNotification,
            object: nil
        )
        center.addObserver(
            self,
            selector: #selector(keyboardHidden),
            name: UIResponder.keyboardWillHideNotification,
            object: nil
        )
    }

    @objc private func keyboardChanged(_ notification: Notification) {
        guard let frame = notification.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect else { return }
        let overlap = max(0, view.bounds.maxY - view.convert(frame, from: nil).minY)
        send(["kind": "keyboard", "height": overlap])
    }

    @objc private func keyboardHidden() {
        send(["kind": "keyboard", "height": 0])
    }

    func open(url: URL) {
        guard bridgeReady else {
            pendingOpen = url
            return
        }
        deliver(url: url)
    }

    private func deliver(url: URL) {
        // Un archivo entregado por otra aplicación llega fuera del contenedor;
        // sin este permiso la lectura falla en silencio.
        let scoped = url.startAccessingSecurityScopedResource()
        defer { if scoped { url.stopAccessingSecurityScopedResource() } }
        guard let data = try? Data(contentsOf: url) else { return }
        send([
            "kind": "openFile",
            "filename": url.lastPathComponent,
            "mimeType": mimeType(for: url),
            "base64": data.base64EncodedString(),
        ])
    }

    private func mimeType(for url: URL) -> String {
        switch url.pathExtension.lowercased() {
        case "json": return "application/json"
        case "structureco": return "application/x-structureco"
        case "pdf": return "application/pdf"
        case "dxf": return "image/vnd.dxf"
        default: return "application/octet-stream"
        }
    }

    private func send(_ message: [String: Any]) {
        guard
            let data = try? JSONSerialization.data(withJSONObject: message),
            let json = String(data: data, encoding: .utf8)
        else { return }
        webView.evaluateJavaScript("window.StructureCoNative?.receive(\(json))")
    }

    // MARK: - Web → nativo

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard
            let body = message.body as? [String: Any],
            let kind = body["kind"] as? String
        else { return }

        switch kind {
        case "app.ready":
            // El contrato es 1.x. Una mayor distinta significa que este shell se
            // quedó atrás: mejor no hablar que adivinar un vocabulario nuevo.
            guard let version = body["version"] as? String, version.hasPrefix("1.") else { return }
            bridgeReady = true
            publishSafeArea()
            if let pending = pendingOpen {
                pendingOpen = nil
                deliver(url: pending)
            }

        case "haptic.impact":
            Haptics.impact(body["style"] as? String ?? "light")

        case "haptic.selection":
            Haptics.selectionChanged()

        case "haptic.notification":
            Haptics.notify(body["style"] as? String ?? "success")

        case "statusBar.style":
            // La web envía el color que debe tener el CONTENIDO de la barra:
            // con la aplicación en Noche pide `light`, que es texto claro.
            statusBarStyle = (body["style"] as? String) == "light" ? .lightContent : .darkContent
            setNeedsStatusBarAppearanceUpdate()

        case "share":
            var items: [Any] = []
            if let url = body["url"] as? String, let parsed = URL(string: url) { items.append(parsed) }
            if let text = body["text"] as? String, !text.isEmpty { items.append(text) }
            if items.isEmpty, let title = body["title"] as? String { items.append(title) }
            guard !items.isEmpty else { return }
            Sharing.present(items: items, from: self)

        case "share.file":
            guard
                let base64 = body["base64"] as? String,
                let data = Data(base64Encoded: base64),
                let filename = body["filename"] as? String,
                let staged = Sharing.stage(data: data, filename: filename)
            else { return }
            Sharing.present(items: [staged], from: self)

        case "scroll.lock":
            webView.scrollView.isScrollEnabled = !((body["locked"] as? Bool) ?? false)

        default:
            break
        }
    }

    // MARK: - Navegación

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.allow)
            return
        }
        // La aplicación vive entera en su propio esquema. Cualquier otra cosa
        // es un enlace externo y va a Safari: abrirlo dentro dejaría al usuario
        // atrapado en una web sin barra de direcciones ni botón de volver.
        if url.scheme == AppSchemeHandler.scheme || url.scheme == "about" {
            decisionHandler(.allow)
            return
        }
        decisionHandler(.cancel)
        if let scheme = url.scheme, ["http", "https", "mailto", "tel"].contains(scheme) {
            UIApplication.shared.open(url)
        }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        publishSafeArea()
    }
}
