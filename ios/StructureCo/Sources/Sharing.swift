import UIKit

/**
 * Hoja de compartir del sistema.
 *
 * Es la única salida de archivo que tiene sentido en iOS: una app no tiene
 * carpeta de descargas, así que «guardar» y «compartir» son el mismo gesto y lo
 * resuelve `UIActivityViewController` (Archivos, AirDrop, Correo, imprimir).
 *
 * El archivo se escribe primero a un temporal con su nombre real: compartir un
 * `Data` suelto llega al destino como «Adjunto» sin extensión, y un expediente
 * `.structureco` sin extensión no se puede volver a abrir.
 */
enum Sharing {
    static func present(items: [Any], from controller: UIViewController, source: CGRect? = nil) {
        let activity = UIActivityViewController(activityItems: items, applicationActivities: nil)
        // En iPad el popover necesita un ancla o UIKit lanza una excepción.
        if let popover = activity.popoverPresentationController {
            popover.sourceView = controller.view
            popover.sourceRect = source ?? CGRect(
                x: controller.view.bounds.midX,
                y: controller.view.bounds.midY,
                width: 0,
                height: 0
            )
            popover.permittedArrowDirections = []
        }
        controller.present(activity, animated: true)
    }

    /// Escribe los bytes en un temporal con su nombre y devuelve su URL.
    static func stage(data: Data, filename: String) -> URL? {
        let safe = filename.isEmpty ? "structureco" : filename
        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent("share", isDirectory: true)
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
