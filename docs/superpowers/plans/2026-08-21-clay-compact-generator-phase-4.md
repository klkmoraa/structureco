# Plan de implementación · Clay Compact y Generator · Fase 4

**Clasificación:** `AUDIT/TEMPORARY`

## Contrato de ejecución

Aplicar TDD estricto sobre la rama aislada `codex/clay-workspace-phase-2`. Preservar la frontera protegida y validar en X2/M1/K0, Día/Noche.

## Tareas

1. **Regresiones del riel y lanzadores**
   - Añadir pruebas de comportamiento en `ToolRail.test.tsx` para Cargas de análisis, Vista y Resultados en escritorio y K0.
   - Añadir un contrato de layout que falle si M1 vuelve a reservar el ancho X2.
   - Implementar comandos tipados, botones Clay e integración en `WorkspaceShell`.

2. **Generator dentro del broker**
   - Añadir primero casos RED a `surfacePresentation.test.ts` para `floating/inset/sheet`, suspensión y reanudación.
   - Mover la apertura lógica a `WorkspaceShell` y pasar estado/presentación al canvas sin mover el ghost ni la preparación estructural.
   - Mantener la superficie montada cuando el broker la retiene y ocultarla cuando queda suspendida.

3. **Tarjetas de familias y materia Clay**
   - Añadir prueba accesible del radiogroup de familias.
   - Crear ilustraciones SVG transparentes deterministas y reemplazar el segmento plano.
   - Ajustar CSS para X2/M1/K0, Día/Noche, presión, profundidad y áreas táctiles.

4. **Verificación y entrega**
   - Ejecutar pruebas focales, typecheck/lint relevantes, suite serial y `verify:protected`.
   - Ejecutar QA renderizada en 1440px, 1024px y 390px, Día/Noche; comprobar overflow y superposición.
   - Generar reporte en `reports/`, commit, push a la rama del PR y enviar únicamente capturas necesarias.
