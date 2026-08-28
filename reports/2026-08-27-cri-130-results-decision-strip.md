# CRI-130 — resultado visible al terminar el análisis

Tras una corrida satisfactoria, el Centro analítico se presenta cerrado junto al lienzo sin tomar el foco. La franja contiene el estado resuelto, el caso o combinación, la vigencia de la corrida, la confiabilidad calculada y el extremo de momento gobernante con su miembro. Abrirla continúa llevando al Resumen, no a una vista numérica aislada.

El valor de la franja se deriva de `summarizeAnalysisResults`, las unidades y `resolveReliability`, que ya son las autoridades del resultado; no se guarda una segunda copia ni se altera el solver. Si no existe extremo, la franja lo declara y pide revisar el resumen completo.

Validación focal: `ResultsPanel.test.tsx` (22 pruebas) y `tsc --noEmit`.

Pendiente para cierre: prueba de lectura móvil real, una evaluación con estudiantes/ingenieros y confirmar la continuidad PDF en un navegador antes de considerar la tarea completa.
