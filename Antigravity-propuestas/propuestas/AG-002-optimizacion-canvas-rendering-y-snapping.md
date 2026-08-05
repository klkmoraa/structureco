# AG-002

# Optimización de Renderizado SVG del Canvas y Algoritmos de Snapping mediante Índice Espacial R-Tree

# En evaluación

# 2026-08-05

# Rendimiento / Canvas

# Resumen ejecutivo

Propone optimizar los algoritmos de detección de snapping CAD (puntos medios, intersecciones, perpendiculares) y el renderizado SVG en el lienzo gráfico. Al introducir una estructura de datos de indexación espacial ligera (R-Tree o cuadrícula espacial en memoria) en `src/utils/snapping.ts`, la búsqueda de candidatos de acoplamiento reducirá su complejidad computacional de $\mathcal{O}(N^2)$ a $\mathcal{O}(\log N)$, manteniendo una frecuencia constante de 60 FPS incluso en estructuras complejas con cientos de miembros.

# Problema

En `src/utils/snapping.ts` y `StructuralCanvas.tsx`, cada vez que el usuario mueve el puntero o dibuja un miembro, el sistema recorre iterativamente todos los nodos y miembros existentes para calcular candidato a intersecciones y perpendiculares:
- `buildIntersectionSnapCandidates` realiza una comparación cruzada cuadrática $\mathcal{O}(M^2)$ entre todos los miembros.
- `buildPerpendicularSnapCandidates` prueba proyecciones ortogonales sobre cada segmento.
Para modelos pequeños (10-20 miembros) el tiempo de cálculo es imperceptible, pero para pórticos o cerchas densas (100+ miembros), esto genera caídas de frames (*lag*) perceptibles en la respuesta del puntero.

# Evidencia

- `src/utils/snapping.ts`: Algoritmos de snapping que recorren arreglos planos de nodos y miembros en cada evento `pointermove` (líneas 1-200).
- `src/features/canvas/StructuralCanvas.tsx`: Invocación directa de `resolveSnap` en la ráfaga de eventos del puntero.

# Objetivo

1. Optimizar los cálculos de snapping CAD para que se ejecuten en $< 2\text{ms}$ por evento.
2. Implementar un índice espacial (R-Tree / Spatial Hash Grid) en `snapping.ts` que filtre candidatos por su Bounding Box antes de ejecutar la geometría precisa.
3. Memoizar la representación gráfica de miembros y apoyos vectoriales estáticos.

# Beneficio esperado

- **Usuarios**: Dibujo y snapping instantáneo en modelos grandes sin retardo en el cursor.
- **Rendimiento**: Reducción del tiempo de cálculo por frame de $16\text{ms}$ a $<2\text{ms}$.

# Solución propuesta

1. **Spatial Hash Grid / R-Tree Nactivo**:
   - Implementar un índice espacial ligero e inmutable en `snapping.ts` que organice los bounding boxes de los miembros.
   - Actualizar el índice únicamente cuando el modelo cambie (`project.nodes` o `project.members`), no en cada evento del ratón.
2. **Filtrado Práctico por Cuadrante**:
   - `buildIntersectionSnapCandidates` solo evaluará pares de miembros cuyos rectángulos envolventes se traslapen (*broad-phase filtering*).
3. **Capa SVG Memoizada**:
   - Separar el renderizado de la estructura física del renderizado del puntero temporal y guías de snapping.

# Alternativas consideradas

- **Librería externa `rbush`**: Es una solución R-Tree excelente (2KB), pero una implementación nativa simple de Spatial Grid (cuadrícula de celdas fijas) en TypeScript satisface el requerimiento de 2D sin agregar dependencias externas.

# Justificación técnica

El patrón *Broad-Phase + Narrow-Phase* es el estándar en motores CAD y de física. Reducir las comparaciones geométricas mediante cajas envolventes es la solución computacional más eficiente.

# Impacto en la experiencia del usuario

Mayor precisión y respuesta inmediata del snapping magnético al dibujar miembros o colocar cargas.

# Impacto visual

Ninguno. El comportamiento de los indicadores visuales de snapping se mantiene exactamente igual.

# Impacto en la arquitectura

Optimización interna en `src/utils/snapping.ts` y desacoplamiento en las capas de renderizado del Canvas.

# Complejidad

**Media**. Requiere implementar un algoritmo espacial eficiente en 2D y verificar casos borde (líneas verticales, miembros coincidentes).

# Prioridad

**Alta**. Mejora la usabilidad central de la herramienta de edición.

# Riesgos

- Omisión de candidatos de acoplamiento si la celda de la cuadrícula o bounding box es demasiado pequeña.

# Dependencias

Ninguna nueva dependencia.

# Librerías o tecnologías recomendadas

Implementación propia en TypeScript dentro de `src/utils/snapping.ts`.

# Archivos y módulos probablemente afectados

- **Modificación probable**:
  - `src/utils/snapping.ts`
  - `src/features/canvas/StructuralCanvas.tsx`
- **Solo revisión**:
  - `src/utils/snapping.test.ts`

# Plan de implementación

## Fase 1: Implementación de Spatial Index
- Crear la clase/función `buildSpatialIndex` en `src/utils/snapping.ts`.
- Filtrar candidatos de intersección y perpendicularidad usando la caja envolvente del puntero.

## Fase 2: Integración en Canvas
- Actualizar `StructuralCanvas` para reconstruir el índice solo ante cambios del modelo.

## Fase 3: Testing
- Ampliar `src/utils/snapping.test.ts` con estructuras densas (100+ miembros).

# Estrategia de implementación

Garantizar paridad exacta de resultados con las funciones actuales de snapping mediante tests unitarios antes de reemplazar los algoritmos.

# Criterios de aceptación

- `npm run verify` pasa sin errores.
- Todos los tests de `snapping.test.ts` continúan en verde.
- El tiempo de cálculo de snapping para 150 miembros es menor a $2\text{ms}$ por frame.

# Pruebas necesarias

- Pruebas unitarias de límites geométricos en Vitest.
- Pruebas de rendimiento en `scripts/check-performance-budget.mjs`.

# Restricciones

- Mantener los tipos de `SnapCandidate` y `SnapKind` intactos.

# Estrategia de reversión

Restaurar los algoritmos lineales en `src/utils/snapping.ts`.

# Definición de terminado

Propuesta integrada, con pruebas de rendimiento verdes y respuesta fluida verificada.

---

# PROMPT PARA CLAUDE CODE

Lee e implementa la propuesta ubicada en:

`Antigravity-propuestas/aprobadas/AG-002-optimizacion-canvas-rendering-y-snapping.md`

Valida la propuesta contra el código real antes de modificar archivos.

Implementa únicamente el alcance aprobado: optimiza la búsqueda de candidatos de snapping en `src/utils/snapping.ts` mediante filtrado broad-phase/spatial grid sin alterar la firma pública ni los tipos.

Conserva los comportamientos y restricciones indicados en el documento.

Ejecuta lint, tests y build (`npm run verify`).

Al terminar:
- resume los cambios
- lista los archivos modificados
- indica las pruebas ejecutadas
- actualiza el estado de la propuesta a Implementada
- mueve el documento a `Antigravity-propuestas/implementadas/AG-002-optimizacion-canvas-rendering-y-snapping.md`
