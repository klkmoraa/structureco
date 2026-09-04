# structureCo · shell iOS

Aplicación nativa mínima que envuelve la web de structureCo en un `WKWebView`.
La interfaz entera sigue siendo la web: aquí sólo vive lo que un navegador no
puede dar.

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
| `AppDelegate.swift` | Ciclo de vida UIKit y configuración de escena. |
| `SceneDelegate.swift` | Ventana, controlador raíz y entrada de archivos del sistema. |
| `WebHostController.swift` | El `WKWebView` y el otro extremo del puente. |
| `AppSchemeHandler.swift` | Sirve el build web bajo `structureco://app`. |
| `Haptics.swift` | Traducción al motor táptico. |
| `Sharing.swift` | Hoja de compartir del sistema. |

**No** hay navegación nativa, ni pestañas, ni pantallas propias, ni almacén
nativo. Todo eso lo tiene ya la web, y duplicarlo crearía una segunda fuente de
verdad que se desincroniza.

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
