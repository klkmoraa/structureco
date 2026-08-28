# CRI-142 — diagramas legibles y puntos críticos navegables

Las curvas ya no compiten con etiquetas numéricas dibujadas dentro del SVG. El gráfico conserva marcas puntuales y títulos semánticos; los valores exactos aparecen en una leyenda inmediata de «Puntos notables». Cada tarjeta enumera tipo, valor y estación, se adapta por columnas y permite fijar o liberar el cursor con ratón, teclado o táctil.

La misma regla se aplica a diagramas de solicitaciones y respuestas de deformación. Se evita esconder o aproximar resultados: valor, unidad y posición continúan derivándose de los puntos críticos calculados; sólo cambia su ubicación visual. La acción de fijar reutiliza el cursor existente y no modifica el modelo ni ejecuta análisis.

Validación focal: `ResultsPanel.test.tsx` (23 pruebas), incluyendo regresión de ausencia de texto crítico superpuesto y fijación/liberación por teclado, además de `tsc --noEmit`.

Pendiente para cierre: contraste E2E de los diagramas con cargas complejas, revisión de legibilidad en pantalla pequeña y la validación asistiva/humana especificada en CRI-142.
