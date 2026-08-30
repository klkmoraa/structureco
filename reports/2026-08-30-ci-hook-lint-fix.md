# Corrección del gate rápido

El gate rápido de `main` fallaba por interpretar el manejador local
`useSavedMovingCase` como un Hook de React. Se renombró a `applySavedMovingCase`,
sin cambiar la lógica que carga un caso móvil guardado, para que el linter aplique
correctamente las reglas de Hooks.

El siguiente requisito del mismo gate reveló que
`docs/product/reportlab-pdf-export.md` no tenía clasificación documental. Se marcó como
`CANONICAL`, pues describe el flujo de exportación PDF vigente.

Validación local: lint, documentación canónica, prueba enfocada de línea de influencia y
build de producción.

La siguiente corrida completa también reveló dos contratos desactualizados: el lienzo
externo ahora usa el formateador numérico central, y la migración de persistencia espera
la versión de esquema vigente en vez de una versión fija.
