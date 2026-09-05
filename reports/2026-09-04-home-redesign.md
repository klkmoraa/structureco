# Rediseño de Home y shell de entrada — 2026-09-04

## Resultado

Se reemplazó la composición de bienvenida por un shell de producto compacto y
adaptable: navegación agrupada, una acción primaria clara, una vista estructural
real como ancla visual y accesos directos a las herramientas existentes. La
implementación es visual y de interacción; no modifica el solver ni los modelos
de dominio.

## Dirección y referencias

La fuente de verdad fue `docs/product/visual-direction.md` y los assets
estructurales ya aprobados del repositorio. La jerarquía se contrastó con:

- [Apple HIG — Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars?changes=_8): la navegación principal se agrupa en Trabajo, Explorar y Herramientas; en móvil pasa a un drawer y no a una barra inferior persistente.
- [Apple — Tab bar y sidebar en iPad](https://developer.apple.com/documentation/uikit/elevating-your-ipad-app-with-a-tab-bar-and-sidebar?changes=_2__5): la navegación conserva una ruta visible y permite una composición más rica en superficies amplias.
- [Things — Features](https://culturedcode.com/things/features/): lectura por listas, espaciado relajado y una interfaz que deja al contenido ser el foco.
- [Linear — Project overview](https://linear.app/docs/project-overview): contexto breve, acciones cercanas y una superficie de detalle que no compite con el contenido principal.

La generación de un mock visual nuevo con Image Gen se intentó, pero el servicio
respondió `429 Too Many Requests` por límite temporal. No se inventó ni se
versionó un asset sustituto: se mantuvieron la dirección canónica y los renders
estructurales reales del producto.

## Sistema visual aplicado

- **Color:** Day `#F3EEE4` / canvas `#FBF8F2` / surface `#F7F1E8` / ink `#102B2D` / action `#007D61`; Night conserva la paleta petróleo canónica. El verde sólo marca acción, selección y estado, no decoración.
- **Tipografía:** Instrument Sans para lectura y Geist Mono para etiquetas técnicas y estados.
- **Ritmo:** sidebar estable de 232 px en escritorio, contenido limitado a 1220 px, hero de dos columnas y separaciones amplias entre Trabajo, herramientas y proyectos recientes.
- **Profundidad:** bordes mates, radios contenidos y sombras suaves sólo en superficies que necesitan separación; no se añadieron gradientes, halos ni tarjetas de aspecto plástico.
- **Movimiento:** entrada por opacidad en el shell; stagger declarativo para secciones y spring sólo en el preview estructural. `prefers-reduced-motion` elimina desplazamientos y transiciones.
- **Estados:** activo, hover, pressed, focus-visible, disabled, experimental y vacío están expresados con color semántico, borde y texto; la disponibilidad se comunica sin inventar métricas.

## Arquitectura de superficies

### Inicio

- Hero con `Proyecto abierto`, `Continuar proyecto`, `Nuevo proyecto`, estado de guardado local y preview 2D estructural.
- Tres accesos de herramienta: Importar, Aula y Space 3D, cada uno con icono, descripción y flecha.
- Proyectos recientes limitados a tres filas de lectura rápida; conserva las acciones y recuperaciones reales del `ProjectHub`.

### Navegación y opciones

- **Trabajo:** Inicio, Proyectos, Plantillas.
- **Explorar:** Biblioteca, Aula.
- **Herramientas:** Importar, Space 3D, Estudio de ilustraciones.
- **Ajustes:** idioma, tema y diagnóstico local dentro de un diálogo con foco atrapado.
- Escritorio usa sidebar persistente; móvil usa header compacto y drawer táctil de dos columnas. Las rutas profundas conservan sus contratos y reciben el nuevo ritmo de Home sin reescribir su dominio.

### Adaptación

- 1440 × 900: sidebar, hero de dos columnas y tres lanzadores en una fila.
- 390 × 844: header con menú, hero apilado, acciones de 44 px o más, lanzadores en una columna y lista de recientes sin overflow horizontal.
- El mismo shell responde a tema claro/nocturno e idioma ES/EN.

## Corrección funcional adicional

La animación de entrada original de esta superficie dejaba un `transform` en
`.sc-home`; al abrir el Centro de importación ese ancestro se convertía en el
containing block del modal fijo. Se sustituyó por un fade-in del shell y se
mantuvieron las animaciones internas. El modal vuelve a cubrir correctamente el
viewport móvil y conserva foco, cierre y acciones existentes.

## Archivos

- `src/features/welcome/WelcomeScreen.tsx`: copy ES/EN, grupos de navegación,
  hero, accesos rápidos, templates y composición de ajustes.
- `src/features/welcome/totalHome.css`: tokens locales, layout desktop/tablet/
  móvil, estados, accesibilidad visual, tema oscuro y movimiento reducido.
- `reports/2026-09-04-home-redesign.md`: esta especificación y evidencia.

## Verificación

- `npm.cmd run lint` — pasa; permanece el warning existente de
  `react(only-export-components)` en `CanvasDiagramStack.tsx`.
- `npm.cmd run typecheck` — pasa.
- `npm.cmd test -- --run src/features/welcome/WelcomeScreen.test.tsx src/features/welcome/totalRedesignHome.test.tsx` — 17/17 pasan.
- `npm.cmd run build` — pasa; sólo quedan los warnings existentes de chunks grandes.
- `npm.cmd run verify:styles` — pasa; CSS global 3499/8000 bytes y sin selectores de features.
- `npm.cmd run verify:protected` — pasa; 55 archivos protegidos intactos.
- `npm.cmd run verify:pwa`, `verify:i18n` y `verify:docs` — pasan.
- `npm.cmd test` — 311 archivos pasan; 2741 pruebas pasan y 5 quedan omitidas
  intencionalmente (2746 totales).
- QA manual en Browser/IAB: Home, Proyectos, Plantillas, Biblioteca, Aula,
  Importar, Space 3D, Estudio, ajustes, tema ES/EN y modales; 0 px de overflow
  horizontal en 390 × 844 y 1440 × 900.
- Capturas de referencia no versionadas: `output/playwright/home-desktop.png`
  y `output/playwright/home-mobile.png`.

El gate `npm.cmd run verify:native-bridge` sigue señalando cinco desajustes ya
existentes entre la superficie web y `ios/StructureCo/Sources` (`appearance`,
`keyboard`, `lifecycle`, `openFile`, `safeArea`); este cambio no toca ese
puente.

## Fronteras

No se cambiaron unidades, signos, IDs, topología, `ProjectModel`, workers,
persistencia, import/export, undo/redo, solver, resultados ni contratos de
Space 3D. Los botones existentes siguen delegando en sus callbacks reales y el
acceso experimental conserva la advertencia de alcance antes de entrar.
