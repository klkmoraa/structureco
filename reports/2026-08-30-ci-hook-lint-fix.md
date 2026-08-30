# Corrección del gate rápido

El gate rápido de `main` fallaba por interpretar el manejador local
`useSavedMovingCase` como un Hook de React. Se renombró a `applySavedMovingCase`,
sin cambiar la lógica que carga un caso móvil guardado, para que el linter aplique
correctamente las reglas de Hooks.

Validación local: lint, prueba enfocada de línea de influencia y build de producción.
