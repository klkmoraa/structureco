# structureCo · shell iOS

Aplicación **SwiftUI** mínima que envuelve la web de structureCo en un
`WKWebView`. La interfaz entera sigue siendo la web: aquí sólo vive lo que un
navegador no puede dar.

## Poner en marcha

```bash
brew install xcodegen          # una vez
npm run ios:sync               # compila la web y la copia al paquete
cd ios && xcodegen generate    # produce StructureCo.xcodeproj
open StructureCo.xcodeproj
```

En Xcode: elegir un equipo de firma en **Signing & Capabilities** y ejecutar.
`DEVELOPMENT_TEAM` va vacío en `project.yml` a propósito — un identificador de
equipo es una credencial de cada quien, no del repositorio.

## Qué hay aquí y qué no

| Archivo | Responsabilidad |
|---|---|
| `StructureCoApp.swift` | `App` de SwiftUI con su `WindowGroup`. Nada más. |
| `RootView.swift` | La pantalla: la vista web y seis modificadores. |
| `NativeBridgeModel.swift` | Estado observable; traduce el puente a propiedades. |
| `WebView.swift` | `UIViewRepresentable` del `WKWebView` y su coordinador. |
| `AppSchemeHandler.swift` | Sirve el build web bajo `structureco://app`. |
| `ShareSheet.swift` | `UIActivityViewController` presentado desde `.sheet`. |
| `Resources/PrivacyInfo.xcprivacy` | Manifiesto de privacidad: sin recolección, sin seguimiento. |

**No** hay navegación nativa, ni pestañas, ni pantallas propias, ni almacén
nativo. Todo eso lo tiene ya la web, y duplicarlo crearía una segunda fuente de
verdad que se desincroniza.

## SwiftUI, y qué queda de UIKit

Todo lo que era un delegado es ahora una modificación declarativa: la apertura
de archivos es `.onOpenURL`, el segundo plano es `scenePhase`, la barra de
estado es `.preferredColorScheme` y las hápticas son `.sensoryFeedback`. No hay
`AppDelegate`, ni `SceneDelegate`, ni `UIWindow` montada a mano, ni una sola
llamada a `setNeedsStatusBarAppearanceUpdate`.

Quedan **dos** envoltorios de UIKit, y ninguno por comodidad:

- **`WebView`** — SwiftUI no tiene vista web propia en este objetivo de
  despliegue. `UIViewRepresentable` es la forma correcta de usar `WKWebView`, y
  el envoltorio se mantiene fino a propósito: todo el estado vive en
  `NativeBridgeModel` y aquí sólo quedan la creación de la vista y el despacho.
- **`ShareSheet`** — `ShareLink` existe, pero es declarativo: pide conocer lo
  que se comparte al construir la vista, y aquí el archivo llega en un mensaje
  del puente mucho después. Para compartir algo que aparece por un evento y no
  por un botón, `UIActivityViewController` desde un `.sheet(item:)` es lo
  correcto.

El suelo es **iOS 17** porque `@Observable`, `onChange(of:initial:)` y
`.sensoryFeedback` son la forma nativa de SwiftUI de hacer lo que este shell
hace. Bajarlo obligaría a reintroducir, una por una, el andamiaje UIKit que
esta versión retira.

## Las tres decisiones que importan

**Esquema propio en vez de `file://`.** structureCo se compila a módulos ES y
mueve el solver a Web Workers. WebKit aplica CORS a `file://` y trata cada
archivo como un origen opaco distinto: sobre `file://` los `import` fallan, los
workers no arrancan e IndexedDB —donde vive el Project Hub— no persiste entre
sesiones. `AppSchemeHandler` da un origen real y con él todo eso funciona.

**El build web no se versiona.** `ios/StructureCo/Web` es exactamente el mismo
`dist/` que se publica en la web. Guardarlo en Git sería una segunda copia del
producto que puede quedarse atrás sin que nadie lo note; `ios/Scripts/sync-web.sh`
lo regenera.

**El `.xcodeproj` tampoco.** Un `.pbxproj` escrito a mano no lo revisa nadie de
verdad, produce conflictos ilegibles en cada fusión y se rompe en silencio.
`project.yml` es la fuente y XcodeGen genera el proyecto.

## Una convención que el gate da por hecha

En este shell, `case "…":` significa exactamente una cosa: un `kind` del
contrato del puente. Los mapeos de valores —tipos MIME, estilos de háptica— se
escriben como diccionarios, no como `switch`. No es una preferencia de estilo:
`verify:native-bridge` lee esos `case` para comprobar la paridad, y un `switch`
sobre «heavy» o «warning» entraría ahí como un mensaje que la web no declara.

## El puente

El contrato lo declara la web, tipado, en `src/platform/nativeBridge.ts`, y está
explicado en
[docs/architecture/structureco-ios-native-shell.md](../docs/architecture/structureco-ios-native-shell.md).
Este shell es su implementación: hápticas, barra de estado, hoja de compartir,
insets de área segura, alto del teclado, bloqueo de desplazamiento y apertura de
archivos.

Si el shell y la web dejan de hablar la misma versión mayor del contrato, el
shell no responde a `app.ready` y la web sigue funcionando con sus caminos web:
degradar es siempre preferible a adivinar.

## Verificación

No hay gate automático: este árbol no compila Swift, no hay macOS en CI y montar
uno para un shell de seis archivos costaría más de lo que protege. Lo que sí
está verificado es el lado web —`npm run verify`— y el contrato, que es tipado y
falla en `npm run typecheck` si la web emite un mensaje que no existe.
