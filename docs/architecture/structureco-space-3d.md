# Space 3D · S3D-2 (experimental funcional)

**Clasificación:** `CANONICAL`

Este documento describe lo que Space 3D **es** y, con el mismo detalle, lo que
**no** es. Ningún estado de aquí se afirma sin una ejecución que lo respalde.

S3D-1 entregó el marco espacial elástico lineal. **S3D-2 cierra las cinco
carencias que S3D-1 declaraba fuera de alcance**: cargas sobre barra, peso
propio, liberaciones de extremo, muelles de apoyo, asientos y deformación por
cortante. Quedan fuera la dinámica y la no linealidad.

## Qué entrega

Un marco espacial elástico lineal de seis grados de libertad por nudo, con
superficie propia: crear, editar, analizar, visualizar, guardar, reabrir,
importar y exportar. Vive completo bajo `src/space3d/**` y
`src/features/space3d/**`.

- Elemento frame prismático 12×12, con `Iz` en el plano local `x–y`, `Iy` en
  `x–z` y torsión de St. Venant. Euler–Bernoulli por defecto y Timoshenko en
  cuanto la barra declara área de cortante.
- Cargas sobre barra: repartida trapecial o uniforme en cualquier tramo,
  fuerza puntual y momento puntual, en ejes globales o locales.
- Peso propio por densidad de barra y factor por caso de carga.
- Liberaciones de extremo por condensación estática, en las seis acciones de
  cada extremo.
- Muelles de apoyo por grado y asientos de apoyo por caso.
- Ensamblaje, restricciones, casos y combinaciones lineales.
- Reacciones, acciones de extremo en ejes locales, **diagramas de acciones
  internas muestreados a lo largo del vano** y auditoría de equilibrio 6D.
- Worker aislado con protocolo versionado y cancelación real.
- Códec portable estricto con migración desde los esquemas 1 y 2, almacenamiento con
  copia de seguridad, comandos reversibles e historial.
- Escena Three.js con rejilla, ejes globales, apoyos, cargas nodales y de
  barra, triada local del miembro seleccionado, picking por identificador y
  deformada amplificada.

## Convenciones normativas

| Concepto | Valor |
|---|---|
| Ejes globales | `X`, `Y`, `Z` con **`Y` vertical**, igual que el editor 2D |
| GDL nodales | `[ux, uy, uz, rx, ry, rz]` |
| GDL de elemento | seis de `i`, luego seis de `j` |
| Unidades internas | `m`, `kN`, `kN·m`, `kN/m²`, `m²`, `m⁴`, `rad` |
| Triada local | `x` de `i` a `j`; `y` = referencia global proyectada y girada por `roll`; `z = x × y` |
| Inercias | `Iz` gobierna `v`–`rz`; `Iy` gobierna `w`–`ry` |
| Gravedad | `-Y` global; el peso propio es `density · A · g` repartido uniforme |
| Cortante | `phi = 12·E·I / (G·As·L²)`; `As = 0` ⇒ Euler–Bernoulli exacto |
| Repartidas | intensidad **por metro de barra**, no de proyección |
| Acciones internas | `N` positivo en tracción; `dMz/dx = Vy` y `dMy/dx = -Vz` |
| Esquema portable | versión 3; la 1 y la 2 se migran al abrirse |
| Capacidad | 150 nudos / 300 barras, medida (ver más abajo) |

## Cargas sobre barra y acciones internas

Las cargas se reducen a un campo local por barra y se integran contra las
funciones de forma del elemento —las de Timoshenko, que se degradan solas a
Hermite cuando `phi = 0`—. La cuadratura es Gauss–Legendre de cuatro puntos:
el integrando es una forma cúbica por una intensidad lineal, grado cuatro, así
que es exacta y no aproximada. Para una carga uniforme el reparto sigue siendo
`wL/2` y `wL²/12` sea cual sea `phi`, que es el resultado clásico.

Las liberaciones se aplican por condensación estática sobre la matriz local y
sobre las acciones de empotramiento a la vez, de modo que un extremo liberado
devuelve exactamente cero en esa acción y la carga equivalente que llega a los
nudos no reparte lo que la barra no puede transmitir. Liberar la misma acción
en los dos extremos es un mecanismo y el validador lo rechaza antes de resolver.

Los diagramas se obtienen por estática desde el extremo `i`, no por
interpolación de la deformada: valen igual con liberaciones, con repartidas
parciales y con acciones puntuales intermedias, y el cierre contra las acciones
del extremo `j` es una invariante comprobada. Una acción puntual duplica su
estación para que el salto se dibuje como salto.

El convenio de signos es el mismo que el del dominio 2D, de modo que una viga
leída en las dos superficies dice lo mismo.

## Validación numérica

Cinco casos manuales con derivación cerrada en
`validation/space3d/manual-cases.md`, cuyos valores esperados produce
`validation/space3d/derive-expected.py` — un script que evalúa **sólo** las
fórmulas del documento y la definición geométrica de la triada, sin invocar el
solver.

| Caso | Qué ejercita | Estado |
|---|---|---|
| `S3D-AXIAL-001` | `EA/L` | PASA |
| `S3D-TORSION-001` | `GJ/L` | PASA |
| `S3D-BENDING-Z-001` | `Iz`, plano `x–y` | PASA |
| `S3D-BENDING-Y-001` | `Iy`, plano `x–z`, signo de `ry` | PASA |
| `S3D-FRAME-001` | miembro inclinado: transformación 12×12 completa | PASA |

Invariantes comprobados: linealidad en las cargas —nodales, de barra y peso
propio—, covarianza ante rotación rígida global, `roll` de `2π`, renumeración
de nudos y barras, simetría con `Iy = Iz`, y energía de deformación no
negativa. La gravedad no participa de la covarianza por definición: apunta a
`-Y` global aunque el modelo gire.

Las capacidades de S3D-2 se contrastan en `src/space3d/engine/memberLoads.test.ts`
contra soluciones cerradas de manual:

| Comprobación | Referencia |
|---|---|
| Voladizo con repartida uniforme | flecha `wL⁴/8EI`, momento `wL²/2` |
| Biempotrada con repartida uniforme | `wL²/12` en apoyos, `wL²/24` en centro |
| Repartida triangular y tramo parcial | resultante y brazo del reparto |
| Carga puntual en barra | idéntica a la nodal equivalente |
| Biapoyada con carga centrada | `PL/4` y reacciones `P/2` |
| Salto de cortante y de momento puntual | estación duplicada con el salto exacto |
| Cierre del diagrama | seis componentes contra las acciones del extremo `j` |
| Peso propio | idéntico a la repartida global equivalente, y escalable |
| Liberación de los dos flectores | biempotrada ⇒ biapoyada, `wL²/8` |
| Muelle de apoyo | flexibilidad `P/k` sumada y reacción publicada |
| Asiento en hiperestática | `6EIδ/L²` con signo |
| Deformación por cortante | `PL³/3EI + PL/GAs` |

Los guardas de mutación se comprobaron provocando el fallo real: intercambiar
`Iy`/`Iz` rompe 5 pruebas, eliminar el término `GJ` rompe 12, construir la
triada como `cross(y, x)` rompe 9 e interpretar el `roll` en grados rompe 4.

## Oráculos externos — EJECUTADOS

| Motor | Versión | Casos | Resultado |
|---|---|---|---|
| OpenSees (`openseespy`) | 3.8.0 | 5/5 | PASA |
| PyNite (`PyNiteFEA`) | 3.0.0 | 5/5 | PASA |
| Frame3DD | — | 0/5 | `NOT_RUN` |

Dos implementaciones independientes de structureCo y entre sí reproducen los
cinco casos a precisión de máquina: la mayor discrepancia observada es
`4,2e-12` sobre un momento de reacción de `66,4 kN·m` (`6e-14` relativo).
Ninguna se toma como verdad única; se comparan por separado.

`validation/space3d/run-oracles.py` no importa nada de structureCo: construye
cada modelo con el API nativo de cada motor desde el mismo
`expected/*.project.json`, y guarda junto a cada salida el crudo del motor para
que el mapa de signos sea auditable. La comparación es sensible: perturbar `Iz`
un `1e-6` relativo rompe ambas.

Los motores se instalan **fuera del repositorio** (`py -3.12 -m pip install
openseespy PyNiteFEA`); no son dependencias del producto ni entran en el bundle.

**Frame3DD sigue sin ejecutarse.** Los espejos de SourceForge responden `403`,
el paquete de PyPI que comparte nombre es un generador de archivos de entrada y
no el solver, y no hay toolchain de C para compilar la fuente oficial. Sus
`.3dd` están escritos pero su equivalencia de ejes es una afirmación no
verificada; el manifiesto mantiene sus campos de salida en `null` y las pruebas
aparecen como omitidas con esa razón.

## Capacidad medida

`node scripts/check-space3d-capacity.mjs`, política de 2000 ms de resolución y
256 MiB de matrices por escalón:

| Nudos | Barras | GDL | Resolución | Matrices | Residual |
|---|---|---|---|---|---|
| 25 | 50 | 150 | 34 ms | 0,49 MiB | 1,0e-16 |
| 50 | 100 | 300 | 32 ms | 2,02 MiB | 7,4e-17 |
| 100 | 200 | 600 | 99 ms | 8,16 MiB | 7,7e-17 |
| 150 | 300 | 900 | 189 ms | 18,42 MiB | 1,5e-16 |

Capacidad aprobada: **150 nudos / 300 barras**, el límite publicado en
`SPACE3D_LIMITS`.

## Puente desde el editor 2D

El botón 3D de la mesa 2D abre el proyecto abierto convertido al dominio
espacial por `src/space3d/data/bridge2d.ts`. Es un adaptador explícito y de una
sola dirección: los stores no se acoplan y el solver no se vuelve híbrido.

Se conservan nombre, identificadores, unidades —incluidas las definiciones de
los sistemas propios—, topología, apoyos planos, cargas nodales, casos y
combinaciones; los nudos se levantan a `z = 0`.

Desde S3D-2 el puente también traduce, en vez de perder: **cargas de barra**
—incluida la conversión de una intensidad medida sobre proyección horizontal o
vertical a intensidad por metro de barra—, **liberaciones de extremo**,
**muelles de apoyo alineados con los ejes**, **desplazamientos impuestos por
caso** como asientos, y **densidad y factor de peso propio**. Cada traducción
deja una nota informativa, no bloqueante.

Lo que un modelo plano no puede saber sigue **sin inventarse**. `G`, `Iy` y `J`
quedan a cero —valor que el validador rechaza y el editor pide completar— y
ninguna restricción fuera del plano se añade sola. Celosías, rótulas internas,
conexiones semirrígidas, cartelas rígidas, apoyos inclinados, muelles normales
a un apoyo inclinado y efectos iniciales se publican como diagnóstico
**bloqueante**: hasta que no se resuelven o se reconocen explícitamente, la
superficie no analiza.

Volver al 2D y reentrar reabre el mismo modelo derivado, que tiene
almacenamiento propio por proyecto de origen. Si el proyecto 2D cambió se
ofrece «Re-derivar desde 2D» en vez de sobrescribir el trabajo 3D.

## Fuera de alcance en S3D-2

- Cargas térmicas y efectos iniciales de deformación.
- Rótulas internas de nudo, apoyos inclinados y conexiones semirrígidas.
- Alabeo, no linealidad geométrica o de material, y análisis dinámico o modal.
- Certificación de seguridad estructural.
- Compatibilidad con tecnologías de asistencia no probadas.
