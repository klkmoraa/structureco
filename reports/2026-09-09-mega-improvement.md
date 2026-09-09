# Mega mejora · calculadora, home e identidad

## Cambio

- Inicio conserva sus rutas existentes, pero añade un resumen honesto del modelo abierto: nudos, barras, cargas y apoyos tomados del `ProjectModel`.
- La barra superior incorpora `Abrir proyecto` y una calculadora de sección. La calculadora es una herramienta de estudio independiente: no escribe en el modelo ni duplica la lógica del solver.
- La calculadora resuelve rectángulo, círculo, tubo rectangular y perfil I, con `A`, `Ix`, `Iy`, `Wx`, `Wy`, `rx` y `ry`. Las fórmulas viven en código testeable y las magnitudes se presentan en las unidades del proyecto.
- La marca SVG se sustituyó por un símbolo estructural geométrico, y favicon, iconos PWA, manifest y colores de primer pintado quedaron alineados con la dirección visual Studio.
- Se retiraron tres escalas activas que violaban el contrato de interacción Clay; ahora usan los tokens de presión existentes.

## Verificación focalizada

- `npm run typecheck`
- `npm run lint`
- `npm run test:ui` — 41 archivos, 292 tests.
- Prueba focal de calculadora — 2 archivos, 6 tests.
- `npm run verify:styles`
- `npm run build`
- Revisión visual del concepto aprobado y del icono PWA generado.

La validación final del despliegue se hará sobre la URL pública de GitHub Pages después del push autorizado a `main`.
