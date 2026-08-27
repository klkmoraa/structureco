# Corrección visual: objetivos táctiles del riel de evidencia

## Hallazgo

La compactación reciente del riel de evidencia redujo los botones de Axial,
Cortante, Momento y Deformada a 30 px de alto también en dispositivos táctiles.
El riel se veía compacto, pero el área accionable quedaba por debajo del
contrato táctil compartido del workspace.

## Ajuste

- Se conserva la presentación compacta con mouse.
- En punteros gruesos, cada opción vuelve a usar
  `--sc-control-height-touch` (44 px) y mantiene separación horizontal
  suficiente para seleccionar una magnitud sin pulsaciones accidentales.
- Se añadió un contrato focal que evita que una futura compactación elimine la
  regla táctil.

## Límites preservados

El cambio es exclusivamente CSS y de prueba visual estática. No modifica el
solver, resultados, unidades, signos, modelo, persistencia ni interacción de
las capas de evidencia.
