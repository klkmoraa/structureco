/**
 * Contrato tipado con un anfitrión nativo (WKWebView / Swift).
 * ---------------------------------------------------------------------------
 * structureCo se ejecuta hoy en el navegador. Este módulo NO añade una
 * dependencia nativa: declara, en un solo sitio, el vocabulario que un shell
 * Swift tendría que hablar para que la aplicación se comporte como una app de
 * iOS —insets reales, hápticas, hoja de compartir, barra de estado, teclado—
 * y ofrece un camino de degradación limpio cuando ese anfitrión no existe.
 *
 * Por qué vive aquí y no en el shell nativo:
 *   · El contrato es del producto web, que es quien emite y consume. Si lo
 *     dictara el proyecto Xcode, cada cambio de nombre de mensaje sería una
 *     ruptura silenciosa entre dos repositorios.
 *   · Al estar tipado, `tsc` es quien comprueba que la web nunca emita un
 *     mensaje que el puente no declare.
 *
 * La integración concreta (el `WKScriptMessageHandler` de Swift, la
 * configuración de `WKWebViewConfiguration` y el ciclo de vida) está en
 * `docs/architecture/ios-native-shell.md`.
 */

/** Insets de área segura publicados por el anfitrión, en puntos CSS. */
export interface NativeSafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Intensidad de una háptica de impacto (`UIImpactFeedbackGenerator`). */
export type NativeImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';

/** Resultado de una háptica de notificación (`UINotificationFeedbackGenerator`). */
export type NativeNotificationStyle = 'success' | 'warning' | 'error';

/**
 * Mensajes que la web envía al anfitrión. El nombre del caso es el `name` del
 * `WKScriptMessageHandler`; la carga viaja como objeto plano serializable.
 */
export type NativeOutboundMessage =
  | { kind: 'haptic.impact'; style: NativeImpactStyle }
  | { kind: 'haptic.selection' }
  | { kind: 'haptic.notification'; style: NativeNotificationStyle }
  | { kind: 'statusBar.style'; style: 'light' | 'dark' }
  | { kind: 'share'; title: string; text?: string; url?: string }
  | { kind: 'share.file'; filename: string; mimeType: string; base64: string }
  | { kind: 'scroll.lock'; locked: boolean }
  | { kind: 'app.ready'; version: string };

/**
 * Mensajes que el anfitrión envía a la web. Se entregan invocando
 * `window.StructureCoNative.receive(message)` desde Swift con
 * `evaluateJavaScript`.
 */
export type NativeInboundMessage =
  | { kind: 'safeArea'; insets: NativeSafeAreaInsets }
  | { kind: 'keyboard'; height: number }
  | { kind: 'appearance'; theme: 'light' | 'dark' }
  | { kind: 'lifecycle'; phase: 'active' | 'background' }
  | { kind: 'openFile'; filename: string; mimeType: string; base64: string };

type InboundListener = (message: NativeInboundMessage) => void;

interface WebKitMessageHandler {
  postMessage: (body: unknown) => void;
}

interface WebKitBridgeWindow extends Window {
  webkit?: { messageHandlers?: Record<string, WebKitMessageHandler | undefined> };
  StructureCoNative?: {
    receive: (message: NativeInboundMessage) => void;
    version: string;
  };
}

/** Nombre único del canal; el shell Swift registra exactamente este handler. */
export const NATIVE_CHANNEL = 'structureco';

/** Versión del contrato. El shell nativo debe rechazar una mayor distinta. */
export const NATIVE_BRIDGE_VERSION = '1.0.0';

const listeners = new Set<InboundListener>();

const bridgeWindow = (): WebKitBridgeWindow | null =>
  typeof window === 'undefined' ? null : (window as WebKitBridgeWindow);

const handler = (): WebKitMessageHandler | null =>
  bridgeWindow()?.webkit?.messageHandlers?.[NATIVE_CHANNEL] ?? null;

/** `true` cuando la aplicación corre dentro del shell nativo de structureCo. */
export const isNativeHost = (): boolean => handler() !== null;

/**
 * Envía un mensaje al anfitrión. Devuelve `false` —sin lanzar— cuando no hay
 * anfitrión: quien llama decide su alternativa web y nunca tiene que envolver
 * la llamada en un `try`.
 */
export const sendToNative = (message: NativeOutboundMessage): boolean => {
  const channel = handler();
  if (!channel) return false;
  try {
    channel.postMessage(message);
    return true;
  } catch {
    return false;
  }
};

/** Suscribe un oyente a los mensajes entrantes; devuelve su baja. */
export const onNativeMessage = (listener: InboundListener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/**
 * Publica `window.StructureCoNative`, el único punto de entrada que Swift
 * necesita conocer. Es idempotente: montar el shell dos veces no duplica el
 * despacho.
 */
export const installNativeBridge = (): (() => void) => {
  const target = bridgeWindow();
  if (!target) return () => undefined;
  target.StructureCoNative = {
    version: NATIVE_BRIDGE_VERSION,
    receive: (message) => {
      for (const listener of [...listeners]) {
        try {
          listener(message);
        } catch {
          /* Un oyente roto no puede tumbar el despacho del resto. */
        }
      }
    },
  };
  sendToNative({ kind: 'app.ready', version: NATIVE_BRIDGE_VERSION });
  return () => {
    delete target.StructureCoNative;
  };
};
