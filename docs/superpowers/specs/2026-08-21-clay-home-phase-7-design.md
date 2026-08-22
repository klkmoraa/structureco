# StructureCo · Inicio/Home Clay · Fase 7

**Clasificación:** `AUDIT/TEMPORARY`

## Objetivo

Sustituir la pantalla de inicio actual por una portada de producto equivalente a los boards aprobados: composición editorial, proyecto actual claramente dominante, acciones de inicio compactas y biblioteca real debajo. No se conservará el carril de cuatro pasos como composición principal ni se añadirá un menú lateral que apunte a áreas inexistentes.

## Diagnóstico

- La entrada actual mezcla cinco puertas, un carril de cuatro pasos, un pórtico decorativo, una tarjeta de continuar y un hub. Aunque cada pieza tiene una función, juntas crean una página de onboarding alta, fragmentada y poco parecida a los boards de Home/overview.
- El proyecto activo no ocupa una jerarquía inequívoca; la biblioteca local queda muy abajo y los accesos de crear/importar compiten entre sí.
- Móvil hereda demasiadas bandas y tarjetas apiladas. Esto contradice la necesidad aprobada de respiración, controles compactos y profundidad funcional.
- `ProjectHub` ya es la fuente real para proyectos, revisiones, renombrado, duplicado y recuperación. Cualquier biblioteca nueva debe reutilizarla, no copiar ni simular sus datos.

## Diseño

### 7A · Portada funcional, no onboarding por pasos

La vista inicial tendrá una cabecera breve de aplicación y un bloque principal de dos niveles:

1. **Proyecto actual.** Una tarjeta editorial Clay con nombre, nodos/barras reales cuando existan, acceso claro a la Mesa y una ilustración estructural existente. Será la pieza de mayor peso visual.
2. **Empezar.** Tres accesos compactos y de acción directa: crear lienzo, ejercicio Aula e importar. DXF y Space 3D no se eliminan: se agrupan en un desplegable/hoja “más formas de empezar”, porque son rutas menos frecuentes y no deben llenar la portada.
3. **Biblioteca.** `ProjectHub` continúa siendo la única fuente de proyectos locales y recuperaciones. La banda aparece de inmediato debajo del bloque principal, con el ancho suficiente para filas reales y sin copiar estado, fechas o revisiones.

El contenido pedagógico y el catálogo de plantillas dejan de ser pasos de la portada. Se abren bajo demanda desde una hoja explícita de formas de empezar, que conserva sus filtros, ejemplos y sus rutas reales.

### 7B · Composición por dispositivo

- **X2:** cabecera ligera; proyecto actual en una columna editorial amplia y dos/tres accesos compactos en el segundo plano; biblioteca como superficie horizontal debajo. La ilustración se limita a una zona útil, no genera vacío.
- **M1:** el bloque de proyecto conserva protagonismo; accesos en una fila compacta o cuadrícula de dos columnas y biblioteca de ancho completo.
- **K0:** cabecera de una línea, tarjeta de proyecto de altura limitada, carril horizontal de accesos de 44px y biblioteca en filas táctiles. La hoja “más formas” se abre desde el borde inferior y no produce tarjetas gigantes ni secciones superpuestas.

### 7C · Materia, color y movimiento

- Día usa marfil cálido y Noche petróleo funcional, sin `backdrop-filter`, vidrio o halos. Los colores técnicos no se reutilizan como decoración de Home.
- Proyecto principal tiene un escalón de relieve; acciones secundarias una elevación menor; hover eleva un nivel y pressed hunde la pieza. Las transiciones siguen el resorte corto ya usado por Top Bar y respetan `prefers-reduced-motion`.
- Las fuentes y densidad siguen los tokens establecidos de marca. Nada de botones anchos por defecto ni paneles que llenen la pantalla sólo para enumerar opciones.

## Límites y autoridades

- No se modifican `src/engine/**`, `src/data/**`, workers, resultados, formatos, IDs, persistencia, ProjectModel, undo/redo, import/export ni cálculos.
- `ProjectHub` conserva el repositorio, las revisiones y los flujos de abrir, renombrar, duplicar y recuperar. `PortableImportCenter`, `Phase2DxfAction`, `NewExerciseDialog` y el callback de Space 3D conservan sus rutas.
- No se crean enlaces a Biblioteca, Equipos, Plantillas u otras áreas que el producto no tenga como rutas independientes. Las capacidades existentes se hacen alcanzables desde Inicio sin inventar navegación.
- El estado de entrada directa para usuarios recurrentes se preserva. Volver a Inicio desde la Mesa sigue mostrando Inicio de verdad, sin un salto automático que haga inútil el botón de retorno.

## Verificación

- Pruebas de interacción cubren abrir Mesa, nuevo lienzo, Aula, importación, DXF, Space 3D, modelos de ejemplo y `ProjectHub` real.
- QA Chromium captura X2 Día, M1 Noche, K0 Día y K0 Noche. Comprueba clase de shell, sin overflow, acción primaria blanca cuando aplique, hoja móvil contenida y ausencia de error de consola.
- Se inspeccionan capturas para confirmar jerarquía, aire vertical y que Home no sea una versión encogida del escritorio.
