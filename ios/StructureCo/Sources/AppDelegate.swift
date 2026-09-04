import UIKit

/**
 * Ciclo de vida UIKit, no SwiftUI.
 *
 * La aplicación es una sola vista a pantalla completa con un `WKWebView`
 * dentro. SwiftUI no aporta nada a eso y sí quita una cosa que aquí importa:
 * el control directo de la barra de estado. `UIHostingController` no delega
 * `preferredStatusBarStyle` en sus hijos, así que teñir la barra al cambiar a
 * Noche —que es justo lo que el puente pide— acabaría en un rodeo. Con UIKit el
 * controlador raíz lo declara y ya está.
 */
@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        configurationForConnecting connectingSceneSession: UISceneSession,
        options: UIScene.ConnectionOptions
    ) -> UISceneConfiguration {
        let configuration = UISceneConfiguration(name: "Default", sessionRole: connectingSceneSession.role)
        configuration.delegateClass = SceneDelegate.self
        return configuration
    }
}
