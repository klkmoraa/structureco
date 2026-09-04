import SwiftUI
import UIKit

/**
 * Hoja de compartir del sistema.
 *
 * SwiftUI tiene `ShareLink`, pero es declarativo: pide conocer lo que se
 * comparte al construir la vista, y aquí el archivo llega en un mensaje del
 * puente mucho después. Presentar `UIActivityViewController` desde un
 * `.sheet(item:)` es la forma correcta de compartir algo que aparece por un
 * evento y no por un botón.
 *
 * En iOS compartir y guardar son el mismo gesto: una aplicación no tiene
 * carpeta de descargas, así que esta hoja es también la única forma de que un
 * archivo exportado llegue a Archivos.
 */
struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}
