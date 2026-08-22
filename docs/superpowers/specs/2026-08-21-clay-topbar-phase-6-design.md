# StructureCo · Top Bar de trabajo · Fase 6

**Clasificación:** `AUDIT/TEMPORARY`

## Objetivo aprobado

Reemplazar por completo la Top Bar actual del Workspace. Debe dejar de ser una hilera de cápsulas, selectores comprimidos e iconos sin jerarquía. La nueva barra comunica primero el proyecto, después el contexto real de análisis y su acción primaria, y por último la salud y las utilidades. Mantiene la identidad Clay mate: superficie marfil cálida en Día, petróleo funcional en Noche, bordes definidos, sombras cortas y estados físicos; no introduce vidrio, brillo ni fondos translúcidos decorativos.

## Diagnóstico de partida

- La barra actual publica tres zonas semánticas correctas (`document`, `actions`, `status`), pero cada una está dividida nuevamente en múltiples mini-contenedores. El resultado visual es una cadena de controles con el mismo peso.
- Los cuatro selectores de análisis permanecen siempre a la vista en X2 y se eliminan abruptamente en K0. Ocupan más atención que el modelo que gobiernan y el usuario no puede leer su relación como un solo contexto.
- El nombre es un `input` permanente y los controles de historial, exportación, Datasheet, Space 3D y más se acumulan sin una familia visual legible.
- K0 encoge controles de escritorio; no constituye una cabecera móvil propia. En particular, la acción de analizar pierde su texto y Doctor/Estado se perciben como botones aislados.

## Diseño

### 6A · Una barra de trabajo, cinco roles claros

La Top Bar conserva sus tres zonas de accesibilidad y QA, pero visualmente se ordena en cinco roles dentro de una sola franja Clay:

1. **Inicio y proyecto.** Marca como retorno a Inicio y una pastilla de proyecto con nombre completo/truncamiento visual. No existe un `input` permanente en la franja. La pastilla abre el panel de proyecto para renombrar, crear un lienzo, cargar ejemplo o importar.
2. **Resumen de análisis.** Un único control muestra una lectura breve y verdadera de combinación, orden y unidades. Su panel agrupa Caso o combinación, modo, orden de análisis y unidades. No inventa ni modifica datos del modelo: delega a los mismos setters actuales.
3. **Analizar.** Es el único botón de color verde sólido y texto blanco. El rótulo permanece visible en X2, M1 y K0; únicamente cambia el ancho.
4. **Salud.** Estado de análisis y acceso a Model Doctor quedan juntos como lectura de confianza, pero siguen siendo dos semánticas distintas: estado del último cálculo y fiabilidad/diagnóstico. Un aviso mantiene su ruta directa al Doctor.
5. **Utilidades.** Datasheet, Space 3D, historial, vistas, exportación, tema e idioma aparecen como herramientas agrupadas. En X2 se muestran las utilidades de uso frecuente; el resto va a un único panel. No se eliminan comandos ni se crean alternativas manuales al registro de comandos.

Las zonas `document`, `actions` y `status` continúan presentes para no romper la composición ni la automatización, pero ya no se dibujan como tres tarjetas encadenadas.

### 6B · Tres composiciones reales

- **X2 (escritorio amplio):** marca/proyecto a la izquierda, resumen de análisis y Analizar en el centro funcional, salud y utilidades a la derecha. El contexto se lee en una sola línea y los controles secundarios no pesan más que la acción primaria.
- **M1 (tablet y escritorio compacto):** proyecto conserva nombre; el resumen de análisis pasa a una lectura de una línea con panel completo al abrirse. Historial y exportación viven en utilidades. Datasheet, Space 3D, Analizar, estado y Doctor tienen rutas visibles o de un toque coherentes.
- **K0 (móvil):** una cabecera de aplicación, no una PC recortada. Inicio, proyecto, Analizar con texto blanco y salud ocupan el borde superior. El panel de proyecto incluye las utilidades secundarias; las acciones táctiles miden al menos 44px y sus nombres completos siguen disponibles a lectores de pantalla. No hay una fila secundaria de chips ni controles superpuestos.

### 6C · Paneles y estados

- El panel de proyecto usa un editor de nombre explícito y conserva Enter, Escape, foco de retorno y la misma ruta de `renameProject`.
- El panel de análisis monta una sola instancia de cada selector y conserva las distinciones entre configuración de vista y entrada analítica: modo y unidades siguen el setter actual de vista; orden conserva `updateProjectAnalysisSettings` e invalida resultados por su ruta existente.
- El panel de utilidades reutiliza las acciones del registro para deshacer, rehacer, Datasheet, Model Doctor, tema y exportaciones. Espacio 3D mantiene su callback propio y sigue siendo la única ruta 3D del Workspace.
- Hover sube un escalón breve; pressed/activo hunde la misma pieza. Popovers y hojas entran con movimiento corto de resorte. Se preserva `prefers-reduced-motion` para quien lo necesite.

## Arquitectura y límites

- `TopBar.tsx` conserva el único contexto de comandos y los callbacks de exportación/portapapeles. El rediseño sólo reorganiza sus controles y separa los paneles visuales; no modifica el registro ni sus efectos.
- `AnalysisStatus` sigue siendo la fuente de estado y fiabilidad. No se combinan ni se reinterpretan cálculos, resultados, unidades o signos.
- La composición X2/M1/K0 sigue viniendo del shell. La barra no añade `matchMedia` ni estado de breakpoint propio.
- El CSS específico se aísla bajo una clase de superficie de Top Bar para que las reglas históricas no vuelvan a transformar la composición nueva.
- No se modifica `src/engine/**`, workers, `src/data/**`, `ProjectModel`, persistencia, topología, formatos, importación/exportación, IDs ni pruebas estructurales.

## Accesibilidad y verificación

- Cada panel conserva Escape, clic exterior, foco inicial y retorno al disparador. Los controles tienen nombre accesible, foco visible y área de 44px en puntero táctil.
- Se mantienen los tres roles de zona, los comandos compartidos con la paleta, la región viva única de persistencia y el acceso siempre disponible a Estado y Model Doctor.
- Se actualizará `qa:topbar` para medir la composición nueva en el barrido continuo, límites de X2/M1/K0, nombres largos en español/inglés y portrait/landscape. El gate comprueba que no haya solapes, overflow ni controles funcionales ocultos.

## Siguiente fase dependiente

La Fase 7 sustituirá Inicio/Home usando la jerarquía ya establecida aquí: portada editorial, proyecto actual, rutas de inicio compactas y biblioteca real. Sus rutas actuales —Aula, plantillas, importación, DXF, Space 3D y recuperación— no se eliminan.
