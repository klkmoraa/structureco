import UIKit

/**
 * Ventana, controlador raíz y la puerta por la que entra un archivo.
 *
 * «Abrir con structureCo» desde Archivos, Correo o AirDrop llega como una URL
 * de la escena, no por la cola del sistema que usa la versión web. Se lee aquí
 * y se entrega al puente, que la deposita en el mismo buzón que consume el
 * importador: revisión y confirmación explícita, nunca sustitución silenciosa
 * del proyecto abierto.
 */
final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    private var host: WebHostController?

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let windowScene = scene as? UIWindowScene else { return }
        let controller = WebHostController()
        host = controller

        let window = UIWindow(windowScene: windowScene)
        window.rootViewController = controller
        window.makeKeyAndVisible()
        self.window = window

        // Un archivo que llega en el arranque espera a que la web esté lista;
        // el propio controlador reintenta cuando recibe `app.ready`.
        for context in connectionOptions.urlContexts { controller.open(url: context.url) }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        for context in URLContexts { host?.open(url: context.url) }
    }

    func sceneDidEnterBackground(_ scene: UIScene) { host?.publishLifecycle(phase: "background") }
    func sceneDidBecomeActive(_ scene: UIScene) { host?.publishLifecycle(phase: "active") }
}
