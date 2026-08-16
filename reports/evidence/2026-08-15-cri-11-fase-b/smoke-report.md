# CRI-11 Fase B · recorrido ejecutado

Ejecutado el 2026-08-16T02:55:18.363Z sobre Chromium (Playwright), build de `prototypes/cri-11-harness`.

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
- Fixture grande: 1292 filas pintadas sin virtualización en 26 ms hasta la primera fila.
- Esencial baja de 9 a 6 columnas conservando 1292 filas y sus rutas.
- Deshacer revierte un cambio de sección committeado.
- Rehacer reaplica el cambio deshecho.
- La Command Palette ejecuta «Resolver» por el mismo commandId que el botón visible.
- Navegar a un objeto por ID desde la paleta selecciona el objeto real (SHL-06).
- La herramienta Nodo crea un nudo real en el modelo efectivo (MOD-02), visible en Datasheet.
- Model Doctor detecta el nudo recién creado como hallazgo de modelado, sin dictamen de seguridad.
- Localizar desde Model Doctor sincroniza el objeto y la evidencia (DOC-04).
- Localizar desde Model Doctor lo degrada a `peek`, no lo cierra (D-11).
- Reconocer un hallazgo deja constancia visible en su tarjeta (DOC-06).
- La tecla Delete elimina la selección real del modelo (MOD-09), con Deshacer disponible.
- Shift+clic acumula selección heterogénea/homogénea (SEL-04).
- Detail muestra el estado MIXED de bloque, no la ficha de un solo objeto.
- Zoom flotante: 100% → 144% → encuadrar todo → 100% (CNV-01).
- La puerta Preferencias despacha el mismo axis/set que el panel del laboratorio (una sola fuente de verdad).
- Salida se rotula explícitamente como no-funcional en este prototipo (no finge exportar de verdad).

## Fallos

Ninguno.

> Las capturas de esta carpeta son evidencia de ejecución, no el entregable de CRI-11.
> Todos los datos que aparecen en ellas son fixture.
