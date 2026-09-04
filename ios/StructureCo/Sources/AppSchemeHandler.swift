import Foundation
import WebKit

/**
 * Sirve el `dist/` empaquetado bajo un origen propio.
 *
 * Es la pieza que decide si la aplicación arranca o no, y por qué no basta con
 * cargar un `file://`: structureCo se compila a módulos ES y usa Web Workers
 * para el solver. WebKit aplica CORS a `file://` y trata cada archivo como un
 * origen opaco distinto, así que ahí los `import` fallan, los workers no
 * arrancan e IndexedDB —donde vive el Project Hub— no persiste entre sesiones.
 * No es una limitación que se pueda relajar con una bandera.
 *
 * Un manejador de esquema da un origen real (`structureco://app`). Con él los
 * módulos cargan, los workers arrancan y el almacenamiento es estable. El
 * esquema tiene que ser propio: WebKit no deja interceptar `http` ni `https`.
 *
 * `nonisolated` a propósito: el proyecto aísla todo al actor principal por
 * defecto, y leer archivos del paquete no tiene por qué hacerlo desde ahí.
 */
nonisolated struct AppSchemeHandler: URLSchemeHandler {
    static let scheme = "structureco"
    static let host = "app"
    static var indexURL: URL { URL(string: "\(scheme)://\(host)/index.html")! }

    /// Carpeta del build web dentro del paquete (`ios/Scripts/sync-web.sh` la llena).
    private let root: URL = Bundle.main.url(forResource: "Web", withExtension: nil)
        ?? Bundle.main.bundleURL.appendingPathComponent("Web")

    private static let mimeTypes: [String: String] = [
        "html": "text/html; charset=utf-8",
        "js": "text/javascript; charset=utf-8",
        "mjs": "text/javascript; charset=utf-8",
        "css": "text/css; charset=utf-8",
        "json": "application/json; charset=utf-8",
        "webmanifest": "application/manifest+json; charset=utf-8",
        "svg": "image/svg+xml",
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "webp": "image/webp",
        "woff2": "font/woff2",
        "woff": "font/woff",
        "ttf": "font/ttf",
        "wasm": "application/wasm",
        "txt": "text/plain; charset=utf-8",
        "map": "application/json; charset=utf-8",
    ]

    /**
     * La respuesta es una secuencia: primero la cabecera, después el cuerpo.
     *
     * Los archivos del paquete se leen enteros de disco local, así que la
     * secuencia siempre emite dos elementos y termina. La forma asíncrona no es
     * un rodeo: es lo que permitiría servir por partes un expediente grande sin
     * cambiar nada de lo que hay aquí.
     */
    func reply(for request: URLRequest) -> AsyncThrowingStream<URLSchemeTaskResult, any Error> {
        AsyncThrowingStream { continuation in
            guard let url = request.url else {
                continuation.finish(throwing: URLError(.badURL))
                return
            }

            var relative = url.path
            if relative.isEmpty || relative == "/" { relative = "/index.html" }

            // `..` en la ruta pedida no puede salir de la carpeta servida: es el
            // único control de acceso entre la web y el resto del paquete.
            let candidate = root.appendingPathComponent(relative).standardizedFileURL
            guard candidate.path.hasPrefix(root.standardizedFileURL.path) else {
                continuation.finish(throwing: URLError(.noPermissionsToReadFile))
                return
            }

            if let data = try? Data(contentsOf: candidate) {
                let type = Self.mimeTypes[candidate.pathExtension.lowercased()] ?? "application/octet-stream"
                Self.emit(data: data, url: url, mimeType: type, into: continuation)
                return
            }

            // Una SPA resuelve sus propias rutas, así que una ruta *sin
            // extensión* que no existe es navegación y se responde con el
            // documento de entrada. Un `.js` o un `.css` que falta es otra cosa
            // —un error real— y devolver HTML ahí lo enmascararía tras un fallo
            // de tipo MIME imposible de diagnosticar.
            guard
                candidate.pathExtension.isEmpty,
                let fallback = try? Data(contentsOf: root.appendingPathComponent("index.html"))
            else {
                continuation.finish(throwing: URLError(.fileDoesNotExist))
                return
            }
            Self.emit(data: fallback, url: url, mimeType: "text/html; charset=utf-8", into: continuation)
        }
    }

    private static func emit(
        data: Data,
        url: URL,
        mimeType: String,
        into continuation: AsyncThrowingStream<URLSchemeTaskResult, any Error>.Continuation
    ) {
        let response = HTTPURLResponse(
            url: url,
            statusCode: 200,
            httpVersion: "HTTP/1.1",
            headerFields: [
                "Content-Type": mimeType,
                "Content-Length": String(data.count),
                // Todo se sirve desde el mismo origen; el permiso explícito
                // evita que un worker o un módulo se quede fuera por CORS.
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "no-cache",
            ]
        )!
        continuation.yield(.response(response))
        continuation.yield(.data(data))
        continuation.finish()
    }
}
