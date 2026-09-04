import Observation
import SwiftUI

/**
 * Estado del puente, observable.
 *
 * Es el único punto donde se traduce el vocabulario de
 * `src/platform/nativeBridge.ts` a estado de SwiftUI. Un mensaje del anfitrión
 * entra por `receive(...)` y sale convertido en una propiedad; a partir de ahí
 * la vista reacciona sola y nadie tiene que llamar a `setNeedsX` ni recordar
 * qué hay que refrescar. Ése es exactamente el trabajo que en UIKit había que
 * escribir a mano.
 */
@Observable
final class NativeBridgeModel {
    /// Contenido de la barra de estado. `nil` deja decidir al sistema.
    var interfaceScheme: ColorScheme?
    /// Archivo o enlace pendiente de compartir; presenta la hoja del sistema.
    var shareItem: ShareItem?
    /// El desplazamiento del `WKScrollView` mientras hay una hoja abierta.
    var scrollLocked = false
    /// Retroalimentación háptica pendiente y su disparador.
    private(set) var feedback: SensoryFeedback?
    private(set) var feedbackTick = 0

    /// `true` en cuanto la web responde `app.ready` con una versión compatible.
    private(set) var ready = false

    /// Alto de la ventana, para medir cuánto tapa el teclado.
    @ObservationIgnored var windowHeight: CGFloat = 0
    /// Puente hacia la web. Lo instala `WebView` al crear el `WKWebView`.
    @ObservationIgnored var send: (([String: Any]) -> Void)?
    /// Archivo que llegó antes de que la web pudiera recibirlo.
    @ObservationIgnored private var pendingOpen: URL?

    struct ShareItem: Identifiable {
        let id = UUID()
        let items: [Any]
    }

    // MARK: - Web → nativo

    /**
     * Un mensaje del `WKScriptMessageHandler`. Devuelve `false` cuando el
     * cuerpo no es del puente, para que quien llama pueda ignorarlo en vez de
     * adivinar.
     */
    @discardableResult
    @MainActor
    func receive(_ body: [String: Any]) -> Bool {
        guard let kind = body["kind"] as? String else { return false }

        switch kind {
        case "app.ready":
            // El contrato es 1.x. Una mayor distinta significa que este shell se
            // quedó atrás: mejor no hablar que adivinar un vocabulario nuevo.
            guard let version = body["version"] as? String, version.hasPrefix("1.") else { return true }
            ready = true
            if let pending = pendingOpen {
                pendingOpen = nil
                deliver(url: pending)
            }

        case "haptic.impact":
            let style = body["style"] as? String ?? "light"
            // `rigid` y `soft` son flexibilidad, no peso: otra familia de la
            // misma API, y se consultan aparte para no aplanarlas contra
            // `.light`.
            if let flexibility = Self.impactFlexibilities[style] {
                fire(.impact(flexibility: flexibility))
            } else {
                fire(.impact(weight: Self.impactWeights[style] ?? .light))
            }

        case "haptic.selection":
            fire(.selection)

        case "haptic.notification":
            fire(Self.notifications[body["style"] as? String ?? "success"] ?? .success)

        case "statusBar.style":
            // La web envía el color que debe tener el CONTENIDO de la barra: con
            // la aplicación en Noche pide `light`, que es texto claro, y eso en
            // SwiftUI se consigue declarando el esquema oscuro.
            interfaceScheme = (body["style"] as? String) == "light" ? .dark : .light

        case "share":
            var items: [Any] = []
            if let url = body["url"] as? String, let parsed = URL(string: url) { items.append(parsed) }
            if let text = body["text"] as? String, !text.isEmpty { items.append(text) }
            if items.isEmpty, let title = body["title"] as? String { items.append(title) }
            guard !items.isEmpty else { return true }
            shareItem = ShareItem(items: items)

        case "share.file":
            guard
                let base64 = body["base64"] as? String,
                let data = Data(base64Encoded: base64),
                let filename = body["filename"] as? String,
                let staged = Self.stage(data: data, filename: filename)
            else { return true }
            shareItem = ShareItem(items: [staged])

        case "scroll.lock":
            scrollLocked = (body["locked"] as? Bool) ?? false

        default:
            return false
        }
        return true
    }

    /*
     * Estos tres mapeos son diccionarios y no `switch`, y la razón no es de
     * estilo: `verify:native-bridge` lee los `case "…"` del shell como los
     * mensajes del puente que atiende. Un `switch` sobre un valor de estilo
     * («heavy», «warning») entraría ahí como un mensaje que la web no declara y
     * el gate fallaría con seis desajustes inventados. En este shell, un
     * `case "…"` significa exactamente una cosa: un `kind` del contrato.
     */
    private static let impactWeights: [String: SensoryFeedback.Weight] = [
        "light": .light,
        "medium": .medium,
        "heavy": .heavy,
    ]
    private static let impactFlexibilities: [String: SensoryFeedback.Flexibility] = [
        "rigid": .rigid,
        "soft": .soft,
    ]
    private static let notifications: [String: SensoryFeedback] = [
        "success": .success,
        "warning": .warning,
        "error": .error,
    ]

    private func fire(_ next: SensoryFeedback) {
        feedback = next
        // El disparador tiene que CAMBIAR para que `.sensoryFeedback` reaccione;
        // repetir la misma háptica dos veces seguidas no movería la propiedad.
        feedbackTick &+= 1
    }

    // MARK: - Nativo → web

    func publishSafeArea(_ insets: EdgeInsets) {
        send?([
            "kind": "safeArea",
            "insets": [
                "top": insets.top,
                "right": insets.trailing,
                "bottom": insets.bottom,
                "left": insets.leading,
            ],
        ])
    }

    func publishKeyboard(height: CGFloat) {
        send?(["kind": "keyboard", "height": max(0, height)])
    }

    func publishLifecycle(phase: String) {
        send?(["kind": "lifecycle", "phase": phase])
    }

    /// «Abrir con structureCo» desde Archivos, Correo o AirDrop.
    @MainActor
    func open(url: URL) {
        guard ready else {
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
        send?([
            "kind": "openFile",
            "filename": url.lastPathComponent,
            "mimeType": Self.mimeTypes[url.pathExtension.lowercased()] ?? "application/octet-stream",
            "base64": data.base64EncodedString(),
        ])
    }

    /// Diccionario y no `switch`: el gate de paridad lee los `case` del puente.
    private static let mimeTypes: [String: String] = [
        "json": "application/json",
        "structureco": "application/x-structureco",
        "pdf": "application/pdf",
        "dxf": "image/vnd.dxf",
    ]

    /**
     * Escribe los bytes en un temporal con su nombre real. Compartir un `Data`
     * suelto llega al destino como «Adjunto» sin extensión, y un expediente
     * `.structureco` sin extensión no se puede volver a abrir.
     */
    private static func stage(data: Data, filename: String) -> URL? {
        let safe = filename.isEmpty ? "structureco" : filename
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent("share", isDirectory: true)
        do {
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            let target = directory.appendingPathComponent(safe)
            try data.write(to: target, options: .atomic)
            return target
        } catch {
            return nil
        }
    }
}
