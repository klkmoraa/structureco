# CRI-11 Fase C · validación y estrés — recorrido ejecutado

Ejecutado el 2026-08-16T03:47:18.427Z sobre Chromium (Playwright), build de `prototypes/cri-11-harness`.
Firefox instalado en este entorno: no · WebKit: no.

## Comprobaciones superadas

- Arranque: Welcome → Workspace, listo para la matriz de validación.
- Pan táctil corto (sin pausa) sigue funcionando exactamente igual tras el cambio (no se rompió).
- Long-press + arrastre táctil arma selección por marco y selecciona: "9 seleccionados" (antes era un callejón sin salida).
- Zona con siete candidatos abre el picker (nunca elige en silencio).
- ArrowDown recorre los candidatos del picker uno a uno (quinta fase de D-06 completada).
- ArrowUp retrocede sin perder el ciclado.
- Home/End saltan a los extremos de la lista de candidatos.
- Enter compromete el candidato que tiene el foco (Enter/Espacio nativos del botón).
- "N" con foco en el lienzo activa la herramienta Nodo (atajo auditado, sin colisión con el navegador).
- "V" vuelve a Seleccionar.
- Fuera del lienzo, la misma letra escribe texto normal — el atajo no fuga de su ámbito (auditoría G-01 cerrada).
- La TopBar resume el Contexto de análisis sin abrirlo: "2/2 Casos de carga" (D-09 completo).
- Cambiar casos/orden se refleja en la TopBar en caliente: "1/2 Casos de carga · P-Δ".
- El Contexto de análisis sobrevive a X2 → K0 → X2: caso desactivado y orden P-Δ intactos (continuidad real, no sólo alcanzable).
- X2 → M1 → K0 → K0(apaisado) → M1(apaisado) → X2: selección, evidencia, estado y encuadre de cámara sobreviven en ambas direcciones y en las dos orientaciones.
- Motion reducido recorta la animación de entrada de 0.22s a 1e-06s.
- Estado "current" alcanzable y reflejado en la TopBar.
- Estado "limited" alcanzable y reflejado en la TopBar.
- Estado "unreliable" alcanzable y reflejado en la TopBar.
- Estado "failed" alcanzable y reflejado en la TopBar.
- Estado "stale" alcanzable directamente por el eje (fail-closed reafirmado).
- Estado "offline" visible sin convertirse en una fase de análisis (son ejes distintos, D-14).
- Estado "recovery" visible en TopBar y abre la superficie real de recuperación (D-08).
- Datasheet (fixture grande): 1292 filas, 1162 ms hasta la primera fila pintada.
- Palette (fixture grande): 123 ms hasta poder escribir.
- Palette · búsqueda con fixture grande: 27.4, 29.8 ms por tecla.
- Pan con ratón (fixture grande, 10 pasos): 269 ms de principio a fin del gesto.
- Zoom con controles flotantes (fixture grande, 3 clics): 716 ms.
- Resize/recomposición (fixture grande): X2→M1 244 ms · M1→X2 263 ms.
- Esencial/Completa funciona con el fixture grande: 9→6 columnas, 1292 filas intactas — Esencial ES un disclosure real, no un amputado.
- INP/latencia registrada vía telemetría: 1 interacciones medidas, 0 tareas largas (>50ms) observadas.
- dense.search: 58.8 ms.
- U-13 · histéresis 0px: 3 recomposiciones en el barrido 900↔1300px (939 ms) → 3.19/s.
- U-13 · histéresis 24px: 3 recomposiciones en el barrido 900↔1300px (831 ms) → 3.61/s.
- U-13 · histéresis 60px: 3 recomposiciones en el barrido 900↔1300px (719 ms) → 4.17/s.
- U-13 · histéresis 120px: 3 recomposiciones en el barrido 900↔1300px (854 ms) → 3.51/s.

## Fallos

Ninguno.

## Métricas (ver también `metrics.json`)

```json
{
  "interactions": {
    "dense.search": [
      58.8
    ],
    "longTaskCount": 0
  },
  "hysteresis": [
    {
      "hysteresisPx": 0,
      "recompositions": 3,
      "elapsedMs": 939,
      "perSecond": 3.19
    },
    {
      "hysteresisPx": 24,
      "recompositions": 3,
      "elapsedMs": 831,
      "perSecond": 3.61
    },
    {
      "hysteresisPx": 60,
      "recompositions": 3,
      "elapsedMs": 719,
      "perSecond": 4.17
    },
    {
      "hysteresisPx": 120,
      "recompositions": 3,
      "elapsedMs": 854,
      "perSecond": 3.51
    }
  ],
  "stress": {
    "datasheetOpenMs": 1162,
    "datasheetRows": 1292,
    "paletteOpenMs": 123,
    "paletteSearchMs": [
      27.4,
      29.8
    ],
    "panMs": 269,
    "zoomMs": 716,
    "resizeToM1Ms": 244,
    "resizeToX2Ms": 263
  }
}
```

> Las capturas de esta carpeta son evidencia de ejecución, no el entregable de CRI-11.
> Todos los datos que aparecen en ellas son fixture.
