import UIKit

/**
 * Traducción del vocabulario del puente a los generadores de UIKit.
 *
 * Los generadores se preparan antes de disparar: sin `prepare()` el motor
 * táptico tarda del orden de 100 ms en despertar y la háptica llega después del
 * cambio visual que acompaña, que es exactamente el defecto que se nota.
 */
enum Haptics {
    private static let selection = UISelectionFeedbackGenerator()
    private static let notification = UINotificationFeedbackGenerator()

    static func prepare() {
        selection.prepare()
        notification.prepare()
    }

    static func impact(_ style: String) {
        let mapped: UIImpactFeedbackGenerator.FeedbackStyle
        switch style {
        case "heavy": mapped = .heavy
        case "medium": mapped = .medium
        case "rigid": mapped = .rigid
        case "soft": mapped = .soft
        default: mapped = .light
        }
        let generator = UIImpactFeedbackGenerator(style: mapped)
        generator.prepare()
        generator.impactOccurred()
    }

    static func selectionChanged() {
        selection.selectionChanged()
        selection.prepare()
    }

    static func notify(_ style: String) {
        let mapped: UINotificationFeedbackGenerator.FeedbackType
        switch style {
        case "warning": mapped = .warning
        case "error": mapped = .error
        default: mapped = .success
        }
        notification.notificationOccurred(mapped)
        notification.prepare()
    }
}
