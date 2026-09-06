# Rediseño Cinemático del Canvas: Replicas ACM en el Mundo, Vibración Dinámica, Flujo de Esfuerzos y Brújula Polar de Reacciones

## Cambio Radical

Se transformó la experiencia visual y técnica del lienzo 2D de StructureCo en un entorno interactivo de última generación para ingeniería estructural:

1. **Replicas ACM directas en espacio de mundo (World Coordinate Space):**
   - Eliminación total de la máscara opaca de fondo (`.diagram-stack-canvas-mask`) y las subventanas flotantes estáticas.
   - Proyección de diagramas de solicitaciones ($N, V, M$) directamente en las coordenadas físicas del modelo en el espacio de mundo del canvas.
   - Dos disposiciones espaciales configurables:
     - **Filas (`rows`):** Réplicas apiladas verticalmente con espaciado en eje Y adaptado a la altura física de la estructura.
     - **Columnas (`columns`):** Réplicas alineadas horizontalmente en el eje X para comparación continua de luces y vanos.
   - Insignias flotantes con diseño Claymorphic ancladas en el mundo indicando solicitación ($N, V, M$), nombre y unidades ($kN$, $kN\cdot m$).
   - Sondeo de estaciones (`station probe`) 100% sincronizado en tiempo real a lo largo de todas las réplicas activas en paralelo.

2. **Brújula Polar de Reacciones en Apoyos (`supportCompass.ts`):**
   - Cálculo trigonométrico en tiempo real de la resultante neta de empuje en cada apoyo:
     $$R_{net} = \sqrt{R_x^2 + R_y^2} \quad \text{y} \quad \theta = \arctan\left(\frac{R_y}{R_x}\right)$$
   - **Dial Polar Claymorphic 2.0**: Base circular con degradado suave, anillo concéntrico graduado, marcas cardinales ($0^\circ, 90^\circ, 180^\circ, 270^\circ$) y arco angular indicando la inclinación exacta de la reacción.
   - **Aguja Vectorial Direccional**: Flecha resultante orientada en la dirección real de empuje con resplandor técnico (`sc-reaction-net-vector`).
   - **Anillo Orbital de Momento Torsor**: En apoyos empotrados ($M_r \neq 0$), genera un arco concéntrico orbital indicando la magnitud y sentido de giro del momento reactivo.
   - **Insignia Flotante Claymorphic**: Etiqueta técnica con lectura simultánea de $R_{net}$, ángulo $\theta$, y componentes cartesianas en tooltip accesible.
   - **Selector de modo en Director HUD**: Alternador fluido entre tres modos:
     - `Cartesiano` ($R_x, R_y$ ortogonales tradicionales).
     - `Brújula` ($R_{net}, \theta$ polar neta).
     - `Polar + XY` (híbrido superpuesto con paralelogramo de descomposición).

3. **Motor de Vibración Dinámica y Oscilación Armónica en Tiempo Real (`canvasDynamics.ts`):**
   - Animación interactiva en tiempo real de la elástica deformada y de los modos de vibración:
     $$q(t) = q_0 \cdot \sin(\omega t) \cdot A$$
   - Ejecución fluida mediante `requestAnimationFrame` sin mutar el modelo ni saturar la CPU/GPU.
   - Controles interactivos de reproducción (Play / Pause), frecuencia/velocidad ($0.5\times, 1.0\times, 2.0\times$) y amplificación de micro-deformaciones ($1.0\times, 2.5\times, 5.0\times$).
   - Fantasma de referencia indeformado (`.deformed-rest-ghost`) para visualizar con precisión la amplitud cinemática respecto al estado de reposo.

4. **Flujo de Esfuerzos y Transmisión de Cargas en Tiempo Real (`CanvasForceFlowLayer.tsx`):**
   - Visualización de la trayectoria de cargas a través de la estructura hacia los apoyos mediante corrientes energéticas pulsantes sobre las barras.
   - Diferenciación inmediata de tracción y compresión:
     - **Tracción:** Corrientes en tonalidades cálidas (`#f43f5e` carmín/ámbar) con pulsos fluyendo hacia el exterior.
     - **Compresión:** Corrientes en tonalidades frías (`#0284c7` cian/azul técnico) con pulsos convergiendo hacia los nudos y apoyos.
   - Velocidad y grosor proporcionales a la magnitud del esfuerzo axial normalizado.
   - Aceleración por hardware CSS (`stroke-dashoffset` keyframes) con coste nulo de renderizado.

5. **Consola Flotante "Director HUD" (`CanvasDirectorHud.tsx`):**
   - Dock flotante con acabado Claymorphism/Glassmorphism 2.0 situado en la parte superior del lienzo:
     - Conmutador de Vibración Armónica con indicador de pulso en vivo.
     - Píldoras selectoras de velocidad y amplificación dinámica.
     - Conmutador de Flujo de Fuerzas instantáneo.
     - Selector de Brújula Polar de Reacciones (Cartesiano / Polar / Ambos).
     - Selector de disposición de Réplicas ACM (Filas $\leftrightarrow$ Columnas).
     - Botón de auto-encuadre cinematográfico con interpolación suave (`animateCameraTo`).

6. **Cámara Fluida con Interpolación Cúbica (Lerp):**
   - Transiciones de cámara de 280 ms con curva `cubic-bezier(0.22, 1, 0.36, 1)` para encuadres y cambios de vista.
   - Cancelación instantánea y reactiva ante cualquier interacción manual del usuario (puntero o rueda).

## Fronteras

- Sin modificaciones en solver, matemáticas, unidades, topología, ProjectModel, serialización ni análisis.
- Sin nuevas dependencias externas.
- Cumplimiento estricto del presupuesto de rendimiento y accesibilidad (`prefers-reduced-motion`).

## Verificación

- `bun run lint` (oxlint: 0 advertencias, 0 errores en 792 archivos).
- `bun run typecheck` (`tsc -b --noEmit`: 0 errores en todo el proyecto).
- Suite completa de pruebas (`bun run test`): 322 archivos de prueba pasados, 2,808 pruebas pasadas (0 fallos).
- `bun run verify:protected`: 55 archivos de frontera protegida intactos.
- `bun scripts/check-docs.mjs`: 23 documentos clasificados y enlaces validados.
- `bun run verify:perf`: Aprobado (1,359,999 raw / 372,420 gzip vs límite 1,400,000 / 380,000).
- `bun run build`: Compilación exitosa en 822 ms.
