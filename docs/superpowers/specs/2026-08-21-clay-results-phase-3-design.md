# StructureCo Clay Results — Diseño de Fase 3

**Clasificación:** `AUDIT/TEMPORARY`

**Estado:** Aprobado para implementación por la instrucción del usuario de continuar con la siguiente fase.

## Objetivo

Rediseñar la superficie residente de Resultados como una mesa de decisión Clay: legible, técnica y profundamente física en sus controles, pero plana en números, tablas y curvas. La fase conserva todos los resultados calculados, sus unidades, signos, cursor, procedencia, casos y rutas de accesibilidad.

## Decisiones visuales

- Día usa el marfil cálido existente; Noche usa el grafito profundo existente.
- Axial conserva azul, Cortante conserva verde, Momento de resultado conserva coral y Deformada conserva su color técnico. No cambian entre temas.
- La acción primaria conserva esmeralda profundo con texto blanco; no sustituye colores de resultados.
- El panel, controles de modo, pestañas, selectores y acciones tienen relieve Clay corto y pressed visible.
- Tablas, números, ejes, curvas, celdas, lecturas de cursor y procedencia quedan en BASE: sin gradiente, brillo, sombra volumétrica o radios decorativos.
- No se permiten glassmorphism, blur de fondo, glow decorativo ni drop-shadow luminoso de la deformada.

## Alcance

Incluye:

- `ResultsPanel`, `ResultSummary`, tarjetas de extremos, controles de diagrama y estilos de Resultado.
- Presentaciones ya existentes: dock X2, inset M1 y sheet K0.
- Estados vacío, análisis fallido, análisis activo, resumen, axial, cortante, momento, deformada, comparación y envolvente.
- Estados hover, pressed, disabled, loading, error, foco, reduced motion y responsive.
- QA real en Día/Noche para desktop, tablet y móvil.

No incluye:

- Solver, diagrama, envelope, fiabilidad, P-Delta, unidades, signos, tipos, persistencia, comandos, import/export y generación de PDF/CSV.
- `DenseResultsSurface`, Aula, Datasheet, Model Doctor, Import Center, Generator o Space 3D.
- Alterar el broker de superficies, la selección de `WorkspaceUIContext`, el cursor del diagrama o el contrato modeless móvil.

## Arquitectura que se conserva

- `surfacePresentation.ts` mantiene la única tabla X2/M1/K0: Results es dock, inset y sheet respectivamente.
- `ResultsPanel` mantiene el estado local de altura/modo y consume `resultTab`, selección, cursor, análisis y combinación desde los contextos existentes.
- `ResultSummary` conserva `summarizeAnalysisResults`, `resolveReliability`, unidades y comandos de exportación; sólo cambia su presentación.
- Los lanzadores de reacciones, influencia y aprender continúan abriendo `dense` a través de `emitWorkspaceCommand`; no se vuelven pestañas residentes.
- Las curvas y lecturas continúan usando la salida del motor. La capa visual no calcula ni redondea valores nuevos.

## Composición

### X2 — desktop

- Panel dock con barra superior de contexto y selector de densidad que se leen como instrumentos elevados.
- Resumen con extrema cards en una banda compacta; tabla de miembros como base técnica de ancho completo.
- Diagramas con una banda de contexto y controles a nivel raised, pero lienzo de gráfico completamente plano.

### M1 — tablet

- Results inset sin reflow permanente del lienzo.
- Pestañas y lanzadores se mantienen en una franja desplazable, con nombres accesibles y foco claro.
- El resumen conserva una cuadrícula de dos columnas sin volver los datos una pared de tarjetas.

### K0 — móvil

- Sheet con agarradera y cabecera compacta; el primer vistazo muestra el contexto y un valor crítico antes del carrusel de pestañas.
- Acciones con objetivo mínimo de 44 × 44 px y barra de comando alcanzable con el pulgar.
- La curva conserva su área de interacción; no se anima ni escala al cambiar de pestaña.

## Estados y movimiento

- Hover eleva controles hasta 2 px; pressed los hunde y usa sombra inset.
- La pestaña activa se asienta en una cavidad, con acento de su familia técnica y una forma/posición que no depende sólo del color.
- La deformada usa línea y patrón técnico sin halo luminoso.
- Loading usa estado mate; error conserva icono, copia y acción visibles.
- `prefers-reduced-motion: reduce` elimina translate, scale y transiciones de paneles y controles, conservando foco y jerarquía final.

## Verificación

- TDD para el contrato visual de Resultados y para que tabla/curva se mantengan BASE.
- Pruebas existentes de `ResultsPanel`, `ResultSummary`, `ResultExtremeCard`, `DenseResultsSurface`, broker y shell sin regresión.
- QA con proyecto real: resumen y momento en X2/M1/K0, Día y Noche, con viewport sin overflow, targets táctiles y sin errores de consola en Chromium y WebKit.
- Máximo seis capturas Chromium; correo sólo con las necesarias.

## Criterio de cierre

Resultados se percibe como parte inequívoca de la identidad Clay de StructureCo, prioriza lectura estructural sobre decoración y conserva íntegramente la semántica de análisis y de navegación existente.
