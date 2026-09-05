# Iteración Home · Workbench radical

**Fecha:** 2026-09-04
**Rama:** `codex/radical-workspace-home-20260904`
**Alcance:** cambio visual y de descubribilidad sobre la portada; sin cambios de dominio.

## Dirección

La primera iteración organizaba Inicio como un dashboard de tarjetas. Esta iteración cambia la metáfora: StructureCo se presenta como una mesa de trabajo de ingeniería. La barra lateral petróleo funciona como rail persistente, el proyecto real ocupa la primera superficie y el modelo estructural tiene un marco técnico propio. Las herramientas secundarias pasan a un raíl numerado y Plantillas, Biblioteca y Estudio quedan agrupados en un directorio visible desde Inicio.

La dirección toma referencias de la claridad de sidebars de Apple, de la lectura por listas de Things y de la vista de proyecto de Linear. Se conserva la identidad mate de StructureCo: Instrument Sans, Geist Mono para señales técnicas, marfil de Día, petróleo de Noche, verde StructureCo para acciones y líneas finas en lugar de sombras o gradientes decorativos.

## Cambios implementados

- `WelcomeScreen.tsx`: nuevo workbench con proyecto actual, acciones Continuar/Nuevo, metadatos locales y preview estructural; raíl de herramientas con Importar/Aula/Space 3D; directorio de Plantillas/Biblioteca/Estudio; breadcrumb de contexto; copy ES/EN nuevo.
- `totalHome.css`: nueva composición `.sc-home--radical`, sidebar petróleo, workbench a dos planos, rails sin mosaico repetitivo, geometría plana para vistas secundarias y adaptación mobile con lectura vertical.
- `totalRedesignHome.test.tsx`: prueba de descubribilidad y navegación del directorio completo desde Home.

No se modificaron solver, unidades, signos, IDs, topología, `ProjectModel`, workers, persistencia, import/export, undo/redo, resultados ni callbacks de apertura.

## QA visual

Se verificó primero en el navegador integrado (IAB), a 1440×900 y 390×844. Se revisaron seis puntos concretos:

1. Sidebar: agrupación Trabajo/Explorar/Herramientas, estado activo y Ajustes.
2. Primera superficie: contraste petróleo/marfil, jerarquía del nombre real del proyecto y acciones primarias.
3. Preview: asset estructural real estable por sesión, marco técnico, ejes y caption `MODEL / 2D`.
4. Raíl de herramientas: tres entradas funcionales, orden, iconos, flechas y área táctil.
5. Directorio y recientes: Plantillas/Biblioteca/Estudio visibles sin ocultar opciones; proyectos siguen siendo lista, no card grid.
6. Responsive/estados: menú móvil, Escape y retorno de foco, Ajustes, Importar, Space 3D y tema Día/Noche.

La medición móvil quedó en `innerWidth=390`, `clientWidth=390`, `scrollWidth=390`, sin overflow horizontal. La captura de implementación se guardó temporalmente en `output/playwright/` y no se versiona.

La referencia visual de Image Gen no pudo crearse porque el servicio respondió `429 usage_limit_reached` con reset posterior; por eso no se añadió un asset inventado. La implementación se revisó contra esta especificación escrita y contra los assets estructurales canónicos ya existentes del repositorio.

## Verificación técnica

- `npm.cmd run lint` ✅; sólo permanece el warning previo `react(only-export-components)` en `CanvasDiagramStack.tsx`.
- `npm.cmd run typecheck` ✅
- `npm.cmd test` ✅ 311 archivos, 2742 pruebas pasadas, 5 omitidas.
- `npm.cmd run build` ✅; 2764 módulos transformados; sólo warnings existentes de chunks grandes.
- `npm.cmd run verify:styles` ✅
- `npm.cmd run verify:protected` ✅ 55 archivos.
- `npm.cmd run verify:pwa` ✅ 17 pruebas.
- `npm.cmd run verify:i18n` ✅ 2230 claves alcanzables.
- `npm.cmd run verify:i18n-entry` ✅
- `npm.cmd run verify:docs` ✅ 21 documentos.
- `npm.cmd run verify:structural-assets` ✅ 80 PNG.
- `npm.cmd run verify:perf` ✅ 1,362,459 bytes de entrada / 370,489 gzip.
- `npm.cmd run verify:native-bridge` ⚠️ sigue fallando por los cinco desajustes heredados `appearance`, `keyboard`, `lifecycle`, `openFile` y `safeArea`; esta iteración no tocó iOS ni el puente.
