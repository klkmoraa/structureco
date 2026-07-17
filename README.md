# structureCo

Aplicación web local-first para modelar, analizar y aprender estructuras planas
2D. Integra un editor gráfico, un motor matricial independiente de la interfaz y
resultados trazables desde el modelo hasta las matrices, reacciones y diagramas.

## Dos experiencias de cálculo

### Aula · diagramas

Pensada para ejercicios de estática y análisis estructural. El estudiante solo
necesita definir:

- nodos y geometría;
- miembros de pórtico o armadura;
- apoyos y liberaciones;
- cargas y el caso o combinación que desea estudiar.

La aplicación conserva internamente propiedades automáticas y entrega reacciones
y diagramas `N`, `V` y `M` sin pedir material, temperatura ni parámetros
avanzados. En estructuras isostáticas, los esfuerzos se determinan por equilibrio
y no dependen de esas rigideces. En estructuras hiperestáticas, el reparto de
esfuerzos sí depende de las propiedades automáticas; el modo Aula lo advierte y
no debe interpretarse como una selección física de material o sección.

### Completo

Expone propiedades de material y sección, teoría Euler–Bernoulli o Timoshenko,
conexiones semirrígidas, asentamientos, temperatura, deformación inicial y forma
deformada. Ambos modos utilizan el mismo solucionador: cambiar de experiencia
modifica los controles visibles, no crea un segundo motor con resultados
incompatibles.

## Capacidades principales

- Marcos y vigas 2D Euler–Bernoulli o Timoshenko; armaduras 2D.
- Miembros inclinados, zonas rígidas colineales y vínculos rígidos exactos.
- Apoyos articulados, rodillos orientables, empotramientos, restricciones
  personalizadas y resortes.
- Liberaciones rotacionales y conexiones semirrígidas mediante resortes de
  extremo y condensación estática.
- Cargas nodales, puntuales y distribuidas uniformes, lineales o parciales;
  momentos puntuales, peso propio, casos y combinaciones lineales.
- Asentamientos o desplazamientos prescritos dependientes del caso de carga.
- Temperatura uniforme, gradiente térmico, deformación axial inicial y curvatura
  inicial.
- Reacciones, desplazamientos y diagramas `N(x)`, `V(x)` y `M(x)` polinómicos
  exactos por tramo.
- Resumen global con máximos y mínimos exactos, localización en el modelo,
  comparación de escenarios y exportación CSV/impresión.
- Deformaciones `u(x)`, `v(x)` y `θ(x)` integradas por tramo, con puntos críticos
  interiores y comprobación de compatibilidad.
- Envolventes mínima y máxima de `N`, `V` y `M`, con identificación del caso o
  combinación gobernante e intersecciones internas entre escenarios.
- Líneas de influencia `N`, `V` y `M` sobre cadenas de miembros frame, con
  límites laterales, extremos interiores y certificación contra análisis de
  carga unitaria independientes.
- Trenes móviles de ejes concentrados con factor de impacto y posición crítica
  analítica, sin barrido por una malla de posiciones.
- Explorador educativo del método de rigidez con grados de libertad, matrices de
  elemento, transformación, ensamblaje, restricciones, residuos y cota numérica.
- Unidades internas kN–m y presentación en kN–m, N–mm, kgf–m o kip–ft.
- Guardado local con respaldo y recuperación, historial, JSON, SVG, PNG e
  impresión.
- Centro de importación con vista previa, selección de contenido, confirmación
  de reemplazo y soporte para JSON, PDF inteligente y paquetes `.structureco`.
- Memoria PDF reimportable con DCL global, diagramas vectoriales `N–V–M`,
  resultados, procedimiento, matrices y un snapshot exacto protegido con
  checksum SHA-256.
- Paquete `.structureco` con `manifest`, proyecto, análisis y memoria PDF; en
  iPhone/iPad usa la hoja nativa de compartir cuando está disponible.
- Interacción unificada para mouse, pantalla táctil y stylus; interfaz responsive,
  tema claro/oscuro y español/inglés.
- Flujo Aula guiado con plantillas parametrizables, predicción previa de
  resultados y revelado progresivo para ejercicios de clase.
- Snapping CAD a cuadrícula, nodos, puntos medios, intersecciones y
  perpendiculares; selección ventana/cruce y filtros por tipo de objeto.

## Ejecutar

```bash
npm ci
npm run dev
```

Vite mostrará la dirección local disponible, normalmente
`http://localhost:5173`.

## Verificar

```bash
npm run verify
npm run qa
```

`verify` ejecuta lint, pruebas automatizadas y build. `qa` recorre la interfaz en
Chromium para escritorio y móvil. `qa:webkit` valida el centro de importación y
la lectura de PDF nativo con perfiles iPhone/iPad en WebKit. El cierre 0.7.0
aprobó 227 de 227 pruebas en 39 archivos.

## Publicar en Netlify

```bash
npm ci
npm run verify
npx netlify deploy --build
npx netlify deploy --prod --build
```

La configuración reproducible de compilación, publicación, caché y rutas SPA
vive en `netlify.toml`. El vínculo local con el sitio no se versiona.

## Documentación

- [Especificación matemática](docs/MATHEMATICAL_SPEC.md)
- [Especificación de paridad con FTOOL 4.01](docs/FTOOL_PARITY_SPEC.md)
- [Informe de verificación](docs/VERIFICATION_REPORT.md)
- [Auditoría integral](docs/AUDIT_2026-07-12.md)
- [Limitaciones](docs/LIMITATIONS.md)
- [Roadmap](docs/ROADMAP.md)
- [Expedientes PDF y `.structureco`](docs/PORTABLE_EXPEDIENTS.md)

## Arquitectura

```text
src/
  components/          editor, inspector, aprendizaje y resultados
  data/                proyectos y migración de esquema
  engine/
    solver.ts          rigidez, restricciones, solución y recuperación
    diagram.ts         funciones internas y deformadas exactas por tramo
    envelope.ts        envolventes analíticas y escenarios gobernantes
    resultSummary.ts   extremos globales y envolventes de resultados
    math.ts            álgebra lineal densa
    units.ts           conversión de unidades
  workers/             análisis y escenarios fuera del hilo de interfaz
  education/           plantillas y progreso del modo Aula
  store/               estado, historial y guardado local
  utils/               importación y exportación
```

## Alcance y aviso

El motor es estático lineal-elástico, de primer orden y pequeñas deformaciones.
No incluye P–Delta, grandes desplazamientos, plasticidad, cables o elementos solo
a tensión, dinámica, trenes móviles con carga distribuida ni diseño normativo.
Las líneas de influencia y los trenes actuales aceptan una trayectoria abierta de
miembros frame y ejes concentrados; todavía no generan una envolvente móvil para
todos los cortes a la vez. El solucionador actual usa matrices densas.

structureCo es una herramienta educativa y de apoyo. Verifica datos, hipótesis,
unidades y resultados con cálculos independientes antes de emplearlos en una
decisión real; no sustituye la revisión de un profesional responsable.

## Licencia

MIT.
