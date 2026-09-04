import SwiftUI
import WebKit

/**
 * La pantalla. Es toda la interfaz nativa que existe: la página web a sangre
 * completa y ocho modificadores.
 *
 * Ese recuento es la decisión de arquitectura, no una casualidad. La interfaz
 * entera de structureCo es la web; aquí no hay navegación, ni pestañas, ni
 * pantallas propias, ni almacén nativo. Sólo lo que un navegador no puede dar:
 * insets reales, alto del teclado, hápticas, hoja de compartir, barra de estado
 * y ciclo de vida.
 */
struct RootView: View {
    @State private var bridge = NativeBridgeModel()
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        GeometryReader { proxy in
            WebView(bridge.page)
                // El fondo lo pinta la propia web. Sin esto, WebKit dibuja el
                // suyo por debajo y en Noche asoma una lámina clara al rebotar.
                .webViewContentBackground(.hidden)
                // El documento no se desplaza: lo hacen sus paneles, que ya
                // contienen su propio gesto. Con una hoja abierta se desactiva
                // del todo, o arrastrarla movería además la vista entera.
                .webViewScrollInputBehavior(bridge.scrollLocked ? .disabled : .enabled, for: .scroll)
                // El lienzo estructural resuelve su propio pellizco con eventos
                // de puntero; el zoom del anfitrión sólo lo desalinearía.
                .webViewMagnificationGestures(.disabled)
                // La aplicación llega al borde físico; el inset lo reparte el
                // CSS con los valores que publica el puente.
                .ignoresSafeArea()
                .onChange(of: proxy.safeAreaInsets, initial: true) { _, insets in
                    bridge.windowHeight = proxy.size.height + insets.top + insets.bottom
                    bridge.publishSafeArea(insets)
                }
        }
        // El teclado NO empuja la vista: taparía el lienzo y descuadraría el
        // dibujo. Su alto se publica y lo reparte el CSS donde hace falta.
        .ignoresSafeArea(.keyboard)
        .background(Color("AppBackground").ignoresSafeArea())
        .preferredColorScheme(bridge.interfaceScheme)
        .sensoryFeedback(trigger: bridge.feedbackTick) { _, _ in bridge.feedback }
        .sheet(item: $bridge.shareItem) { item in
            ShareSheet(items: item.items)
        }
        .onOpenURL { url in bridge.open(url: url) }
        .onChange(of: scenePhase) { _, phase in
            switch phase {
            case .active: bridge.publishLifecycle(phase: "active")
            case .background: bridge.publishLifecycle(phase: "background")
            default: break
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillChangeFrameNotification)) { note in
            guard let end = note.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect else { return }
            // Lo que tapa el teclado es la diferencia entre el pie de la ventana
            // y su borde superior: `visualViewport` en la web ve lo mismo, pero
            // un fotograma tarde y con el teclado a medio subir.
            bridge.publishKeyboard(height: bridge.windowHeight - end.minY)
        }
        .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillHideNotification)) { _ in
            bridge.publishKeyboard(height: 0)
        }
    }
}
