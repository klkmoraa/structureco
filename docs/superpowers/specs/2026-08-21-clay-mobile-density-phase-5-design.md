# StructureCo · Densidad móvil, dock y edición avanzada · Fase 5

**Clasificación:** `AUDIT/TEMPORARY`

## Objetivo aprobado

Convertir el Workspace compacto en una experiencia táctil de herramienta profesional: un dock Clay flotante y compacto, controles de paneles por iconos, Resultados móviles con gráfica y tarjetas horizontales ocultables, y propiedades avanzadas que no vuelcan tarjetas gigantes sobre la hoja. La autoridad visual sigue siendo el Brandbook: arcilla mate, marfil cálido en Día, noche funcional, bordes definidos, sombras cortas y técnicas, sin vidrio ni brillo decorativo.

## Decisiones del usuario incorporadas

- Las rutas de Cargas de análisis, Vista y Resultados siguen siendo funcionales, pero se descubren desde iconos desplegables; no quedan como tres botones visibles y repetidos.
- El dock K0 debe sentirse como un dock de aplicaciones: flotante, compacto, con iconos legibles, respuesta física y hojas que se despliegan; no se elimina ninguna herramienta.
- En Resultados móvil, las tarjetas se recorren horizontalmente y pueden ocultarse; la gráfica sigue siendo la lectura principal junto a esas tarjetas.
- Propiedades avanzadas combina resumen compacto y una edición completa bajo demanda, en lugar de desplegar grupos grandes en línea.
- La tipografía móvil baja moderadamente: controles 11–12px, etiquetas técnicas 10–11px y objetivos táctiles de al menos 44px.
- El Inspector recuerda el último detent y usa 35%, 55% y 85% de alto.
- La animación debe sentirse física y sobria, tipo Apple; el override de `prefers-reduced-motion` se mantiene por accesibilidad.

## Diagnóstico de partida

- La fase anterior eliminó los botones nativos del lienzo, pero introdujo tres lanzadores independientes en el riel y en la hoja `Más`. Son rutas necesarias, no botones decorativos; el problema es su presentación repetitiva.
- K0 reserva una barra inferior completa con seis columnas y rótulos. Aunque cada botón es correcto en aislamiento, su fondo a todo lo ancho y sus etiquetas ocupan demasiado peso visual y aplastan el canvas.
- La sección `Propiedades avanzadas` abre todos sus grupos en la misma hoja. En móvil, los campos, ayudas y tarjetas encadenados convierten una tarea opcional en una pared de contenido.
- Las tarjetas de extremos de Resultados se organizan como rejilla. En móvil necesitan una ruta de exploración horizontal, no columnas estrechas ni tarjetas enormes.

## Diseño

### 5A · Lanzador único de paneles y dock K0

- En X2 y M1, el grupo Navegar mostrará un único icono de Paneles. Al abrirlo, un popover Clay ofrece tres rutas con icono y nombre: Cargas de análisis, Vista y Resultados. El popover emite los comandos existentes; no crea estado de cálculo ni duplica el broker.
- En K0, `Más` contiene un único elemento Paneles. Este abre una hoja táctil propia con esas tres rutas, usando el mismo portal, retorno de foco y cierre por Escape que las hojas de herramientas existentes.
- El dock inferior conserva las seis entradas rápidas actuales (selección, nudo, barra, apoyo, cargas y Más), pero pasa de barra completa a una pieza flotante centrada de iconos. Los nombres continúan en `aria-label`, tooltips/hojas y foco; no se esconden herramientas funcionales.
- El dock ocupa una fila de seguridad para no cruzarse con hojas, pero su materia visual vive sólo en la cápsula de iconos. Puede recorrerse horizontalmente en anchos muy estrechos y las hojas suben desde él con una transición de entrada/salida corta y el hundimiento Clay compartido.

### 5B · Resultados móviles: gráfica + rail de métricas

- Resultados conserva sus pestañas, datos densos, curvas exactas, cursor, proveniencia y la misma autoridad del broker.
- En K0, los extremos se presentan en un rail horizontal con snap: tarjetas de ancho estable, más cortas y nunca comprimidas hasta resultar ilegibles. La gráfica permanece inmediatamente después como la lectura técnica central.
- Un control accesible permite ocultar o volver a mostrar el rail de métricas sin cerrar Resultados. Esta preferencia es sólo de interfaz local; no entra al modelo ni al análisis.
- X2 y M1 preservan la cuadrícula ya aprobada. No se modifican números, unidades, signos, geometría de curvas ni fuentes de resultados.

### 5C · Avanzado resumido y edición completa

- En K0, `Propiedades avanzadas` abre un resumen corto con contexto y un botón `Editar todo`. Los campos avanzados no se duplican: se montan una sola vez dentro de un editor fullscreen cuando se solicita.
- El editor reutiliza la superficie modal del design system para foco inicial, trap de Tab, Escape, retorno de foco y bloqueo de scroll. Es un subflujo del Inspector, no una nueva fuente de selección ni de persistencia.
- Los mismos `onCommit` y comandos existentes siguen escribiendo de forma inmediata y atómica. Cerrar el editor no altera valores, undo/redo ni la selección.
- X2/M1 conservan el acordeón en línea, que ya tiene espacio para esas propiedades.
- Los tres detents K0 quedan en 35%, 55% y 85%; `useWorkspaceLayoutPreferences` conserva el último elegido como ya lo hace para el detent actual.

## Arquitectura y límites

- `ToolRail` posee únicamente la apertura visual del launcher y emite `open-analysis-setup`, `open-view-settings` y `open-results`. `WorkspaceShell` sigue siendo quien abre las superficies mediante el broker.
- `ResultsPanel` posee sólo la preferencia local de visibilidad del rail; los componentes de diagrama reciben la presentación móvil para variar su envolvente, no los datos que representan.
- `InspectorAdvancedProperties` decide entre resumen K0 y contenido en línea; la edición fullscreen se implementa con los primitives existentes de overlay/foco. La selección sigue siendo autoridad exclusiva de `WorkspaceUIContext`.
- No se modifica `src/engine/**`, workers, `ProjectModel`, tipos estructurales, solver, persistencia del proyecto, import/export, topología, signos, unidades ni formatos.

## Accesibilidad, estados y movimiento

- Botones con área táctil mínima 44×44px, nombres accesibles, `aria-expanded`, foco visible y retorno del foco al icono originario.
- El popover y la hoja conservan Escape, clic exterior o backdrop según su patrón existente. El editor avanzado usa la utilidad centralizada de modal.
- Hover eleva una sola capa; pressed y active hunden la misma pieza. Las curvas, tablas y cifras técnicas permanecen planas.
- Se usan los tokens de movimiento, presión y profundidad existentes. La experiencia normal tiene transición física; `prefers-reduced-motion` neutraliza transformación y animación.

## Verificación requerida

- Pruebas RED/GREEN para launcher de paneles, hoja K0, rail visible/oculto y editor avanzado K0.
- Pruebas focales de ToolRail, ResultsPanel, Inspector y preferencias de layout.
- Typecheck, lint, documentación, `verify:protected`, build y suite Vitest serial.
- QA Chromium en 1440px Día, 1024px Noche y 390px Día/Noche: sin botones nativos Cargas/Vista/Resultados, sin overflow, sin solape dock-hojas y con rail de métricas legible.

## Fuera de alcance

- Nuevas familias estructurales, cambios de solver, fórmulas, resultados, unidades, signos o formatos.
- Reordenar la topología de herramientas o eliminar funcionalidades del riel de escritorio.
- Merge a `main`.
