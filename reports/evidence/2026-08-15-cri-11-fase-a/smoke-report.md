# CRI-11 Fase A · recorrido ejecutado

Ejecutado el 2026-08-15T22:20:58.593Z sobre Chromium (Playwright), build de `prototypes/cri-11-harness`.

## Comprobaciones superadas

- Welcome rotula el fixture y muestra la voz seleccionada.
- Continuar proyecto entra al Workspace.
- 1440×900 resuelve X2 (dos docks laterales).
- Seleccionar M2 abre detalle contextual y acciones sobre el objeto.
- El lienzo es tabulable: Enter selecciona sin ratón.
- Resolver recorre calculating → current con evidencia de fixture.
- Cambiar sección previsualiza sin aplicar (preview → commit).
- Aplicar el cambio destruye el resultado: el estado deriva a stale (fail-closed).
- Con el resultado destruido no queda evidencia que pintar.
- Resolver de nuevo devuelve el estado a current.
- La evidencia es una capa del lienzo, no una pestaña de resultados (D-03).
- Localizar degrada la tabla a `peek`: sigue viva y con vuelta explícita.
- La vuelta desde `peek` restaura la tabla.
- 1024×768 · portátil corriente resuelve M1.
- 390×844 · móvil resuelve K0.
- 1440×900 resuelve X2.
- Selección, evidencia y estado sobreviven a X2 → M1 → K0 → X2 (T-INV-1).
- En Compact apaisado la hoja llega por el lado, no por abajo (CB-6).
- es-MX ↔ en-US y Esencial ↔ Completa cambian en caliente sin recargar.
- Cero desbordamiento horizontal accidental.
- El eje de estado alcanza unreliable.
- El eje de estado alcanza failed.
- offline se muestra sin convertirse en una fase de análisis.
- La causa gobernante vive en un botón, no en un `title` (D-14).
- Fixture grande: 1292 filas pintadas sin virtualización en 14 ms hasta la primera fila.
- Esencial baja de 8 a 5 columnas conservando 1292 filas y sus rutas.

## Fallos

Ninguno.

> Las capturas de esta carpeta son evidencia de ejecución, no el entregable de CRI-11.
> Todos los datos que aparecen en ellas son fixture.
