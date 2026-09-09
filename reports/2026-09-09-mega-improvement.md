# Mega mejora · calculadora, home, identidad y móvil

## Cambio

- Inicio conserva sus rutas existentes, pero añade un resumen honesto del modelo abierto: nudos, barras, cargas y apoyos tomados del `ProjectModel`.
- La barra superior incorpora `Abrir proyecto` y una calculadora de sección. La calculadora es una herramienta de estudio independiente: no escribe en el modelo ni duplica la lógica del solver.
- La calculadora resuelve rectángulo, círculo, tubo rectangular y perfil I, con `A`, `Ix`, `Iy`, `Wx`, `Wy`, `rx` y `ry`. Las fórmulas viven en código testeable y las magnitudes se presentan en las unidades del proyecto.
- La marca SVG se sustituyó por un símbolo estructural geométrico, y favicon, iconos PWA, manifest y colores de primer pintado quedaron alineados con la dirección visual Studio.
- Se retiraron tres escalas activas que violaban el contrato de interacción Clay; ahora usan los tokens de presión existentes.
- La experiencia móvil se recompuso como una composición iOS: barra superior compacta, dock inferior estable, subherramientas desplazables y zonas reservadas para cámara, evidencia y entrada rápida.
- Inspectores, resultados, diálogos y Space 3D ahora se comportan como hojas inferiores con safe areas, un único dueño de scroll, controles táctiles de 44 px y acciones que no quedan debajo del dock.
- Se conservaron la paleta original y las sombras/bordes clay existentes; la hoja móvil sólo consume tokens StructureCo y no crea una segunda identidad visual.
- Los botones de inicio que competían por ancho pasan a una fila propia: abrir proyecto y calculadora quedan como acciones táctiles, mientras la búsqueda ocupa el espacio flexible sin solaparse.
- La calculadora usa la política numérica común también para sus valores iniciales editables, evitando formatos directos dispersos y conservando precisión de entrada.

## Verificación focalizada

- `npm run typecheck`
- `npm run lint`
- `npm run test:ui` — 41 archivos, 292 tests.
- Prueba focal de calculadora — 2 archivos, 6 tests.
- `npm run verify:styles`
- `npm run build`
- Revisión visual del concepto aprobado y del icono PWA generado.

La validación final del despliegue se hará sobre la URL pública de GitHub Pages después del push autorizado a `main`.
