# Revisión autorizada de la frontera protegida

## Alcance aprobado

Se revisó la actualización acumulada de análisis estructural introducida desde la
línea base anterior: cargas generadas, análisis modal, P-Delta, tipos y migración
persistente, más las integraciones necesarias en el solver y unidades.

## Evidencia

- El cambio se introdujo junto con pruebas de capacidades avanzadas, conjunto activo,
  masa, modal, P-Delta, solver, unidades y migración.
- `advancedCapabilities`, `activeSet`, protocolo de worker, masa, modal y migración:
  33 pruebas aprobadas.
- P-Delta, sus benchmarks, solver y unidades: 66 pruebas aprobadas.
- Lint, comprobación de tipos, documentación canónica y comprobación de la frontera
  actualizada pasaron localmente.

## Decisión

Con autorización explícita, `scripts/protected-baseline.sha256` se actualiza a la
huella actual de 53 archivos. Cambios posteriores en esa frontera volverán a requerir
una revisión y actualización deliberadas.
