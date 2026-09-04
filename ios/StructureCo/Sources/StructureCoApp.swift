import SwiftUI

/**
 * Punto de entrada. Ciclo de vida de SwiftUI: sin `AppDelegate`, sin
 * `SceneDelegate` y sin `UIWindow` montada a mano.
 *
 * Todo lo que antes vivía en esos dos delegados es aquí una modificación
 * declarativa sobre la escena: la apertura de archivos es `.onOpenURL`, el paso
 * a segundo plano es `scenePhase`, y la barra de estado es
 * `.preferredColorScheme`. Nada de eso necesita un objeto que reciba llamadas
 * del sistema y las reparta.
 */
@main
struct StructureCoApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
        }
    }
}
