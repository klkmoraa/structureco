# CRI-49 — RFC de viabilidad para eigen buckling 2D

**Fecha:** 2026-08-24
**Agente:** Codex
**Rama:** `codex/linear-queue-execution-20260824`
**SHA auditado:** `4d301b2f16ac6f55b18c8ee042c36542d829d001`
**Tipo:** investigación P3; no implementación

## Decisión ejecutiva

| Pregunta | Decisión |
|---|---|
| ¿Eigen buckling cubre un problema distinto a P-Delta? | **Sí.** Extrae multiplicadores y modos de bifurcación de una perturbación lineal; P-Delta busca equilibrio de segundo orden bajo una carga determinada. |
| ¿Puede inferirse de `criticalLoadFactor` actual? | **No.** Ese valor sale de una amplificación B₂ y supone un modo dominante; no resuelve un problema de eigenvalues. |
| ¿Es técnicamente viable para el dominio 2D? | **Sí, en un subconjunto explícito de pórticos elásticos 2D**, porque ya existen rigidez elástica, fuerzas axiales y una matriz geométrica consistente por frame. |
| ¿Puede montarse directamente sobre el solve actual? | **No.** Faltan extracción modal, reducción homogénea de restricciones, separación `K`/`K_G` y tratamiento eigen-consistente de releases/condensación. |
| ¿Debe presentarse como diseño o resistencia normativa? | **No.** El resultado sería una estimación elástica de bifurcación de un modelo ideal y una carga de referencia, nunca una resistencia de diseño ni una carga de colapso garantizada. |
| ¿Se promueve hoy a implementación? | **No. Mantener en investigación.** No se crea issue de implementación hasta cerrar los gates R0–R6 de este RFC. |

Eigen buckling **merece una capacidad futura independiente**, no un badge ni una
extensión nominal de P-Delta. La factibilidad matemática es positiva; la
factibilidad de producto todavía no está demostrada. Este cierre congela el
contrato de investigación y evita introducir un solver modal sin oráculos,
límites ni lenguaje seguro.

## Evidencia del repositorio actual

| Evidencia | Ruta y líneas | Implicación |
|---|---|---|
| El modo persistente sólo distingue primer orden y P-Delta. | `src/types.ts:196-201` | No existe identidad, configuración ni resultado de eigen buckling. |
| Existe una matriz geométrica consistente 2D de 6×6, con tensión positiva y compresión negativa. | `src/engine/solver.ts:169-190` | Es un insumo reutilizable sujeto a validación, no un eigensolver. |
| `pDeltaAxialForces` es un hook interno exclusivo de la iteración P-Delta. | `src/engine/solver.ts:1253-1263` | El contrato público no expone `K_G` ni un pencil generalizado. |
| Sólo miembros `frame` reciben rigidez geométrica. | `src/engine/solver.ts:1349-1359` | Trusses, rigids y otras idealizaciones no tienen hoy formulación de pandeo propia. |
| La matriz elástica y geométrica se suman antes de condensar conexiones. | `src/engine/solver.ts:1352-1369` | Separar después `K + λK_G` no es válido en general para releases: la condensación puede depender de λ. |
| Restricciones generales se ensamblan como `C` y se resuelven por un sistema KKT aumentado. | `src/engine/solver.ts:1412-1529`, `src/engine/solver.ts:1531-1561` | Un eigenproblema necesita un subespacio cinemático homogéneo, no añadir multiplicadores al pencil sin derivación. |
| La fuerza axial P-Delta se aproxima constante por elemento mediante promedio de extremos. | `src/engine/pDelta.ts:89-107` | Es razonable para el beam-column prismático actual, pero requiere convergencia de malla y exclusiones visibles. |
| P-Delta es fixed-point sobre `N`, no extracción de eigenvalues. | `src/engine/pDelta.ts:373-382` | Convergencia P-Delta y bifurcación lineal son evidencias diferentes. |
| No hay dependencia ni kernel de eigenvalues. | `package.json:45-63`, `src/engine/math.ts:586-712` | Debe decidirse y auditarse un algoritmo; no existe una ruta oculta ya disponible. |
| La auditoría P-Delta ya prohíbe llamar eigen buckling a su factor B₂. | `reports/2026-08-24-cri-24-pdelta-madurez.md:24-26`, `reports/2026-08-24-cri-24-pdelta-madurez.md:73-75` | El nuevo resultado debe conservar una identidad separada y provenance propia. |

## Casos de uso y usuarios

### Casos de uso legítimos

1. **Docencia avanzada:** visualizar modos de bifurcación de columnas y pórticos
   elásticos y comparar el primer factor con Euler.
2. **Diagnóstico preliminar profesional:** detectar qué patrón global idealizado
   pierde rigidez primero y orientar malla, arriostramiento o estudios posteriores.
3. **Comparación de alternativas:** observar cómo cambia el factor elástico y el
   carácter modal al modificar geometría, apoyos o rigidez, manteniendo el mismo
   patrón de carga y el mismo contrato de modelado.
4. **Preparación de análisis no lineal:** usar modos únicamente como candidatos
   de imperfección geométrica para una futura capacidad GMNIA independiente.
5. **Validación del motor:** convertir Euler y pórticos publicados en oráculos
   permanentes de la rigidez geométrica y de las restricciones.

### Usos que deben bloquearse o desmentirse

- resistencia normativa de una barra o del sistema;
- capacidad última, factor de seguridad o carga segura;
- predicción de postpandeo, snap-through o colapso;
- efecto de plasticidad, tensiones residuales, conexiones semirrígidas no
  modeladas, daño, pandeo local o distorsional;
- sensibilidad real a imperfecciones, tolerancias de fabricación o excentricidad;
- comparación causal con un resultado P-Delta;
- pandeo fuera del plano de un modelo 2D;
- escalamiento físico de acciones no escalables, como gravedad terrestre o un
  asentamiento impuesto, sin un contrato específico.

### Perfil de producto

El usuario primario sería un ingeniero o estudiante avanzado que entiende una
combinación de referencia. El producto debe asumir que aun ese usuario puede
confundir “primer eigenvalue” con “resistencia”; por eso el warning y la carga
de referencia forman parte del resultado, no de ayuda secundaria.

## Formulación propuesta

### Estado base y perturbación

Para un estado base `B` y un patrón de carga de referencia `Q`, el problema
ideal es:

```text
[K₀(B) + λ KΔ(Q)] φ = 0
```

- `K₀(B)` es la rigidez tangente del estado base, incluyendo las contribuciones
  iniciales que el alcance acepte explícitamente.
- `KΔ(Q)` es la rigidez diferencial producida por las fuerzas de la perturbación
  de referencia.
- `λ` es un multiplicador **adimensional**.
- `φ` es un modo incremental de amplitud y signo arbitrarios.
- la carga crítica estimada es `P_base + λ·Q`, no `λ` aislado cuando existe
  preload.

Para el primer subconjunto promovible se recomienda **sin preload independiente**:

```text
[K_E + λ K_G(N_ref)] φ = 0
```

`N_ref` procede de un análisis lineal fresco de una sola combinación explícita.
Con la convención actual, tensión es positiva y compresión negativa; por ello
`K_G(N_ref)` suaviza bajo compresión y el primer `λ > 0` puede volver singular
la rigidez. El signo debe probarse con Euler y no ajustarse en la interfaz.

La formulación general concuerda con la documentación teórica de
[Abaqus/Standard](https://docs.software.vt.edu/abaqusv2025/English/SIMACAETHERefMap/simathe-c-eigenbuckling.htm),
que define el buckling como perturbación lineal de un estado base y obtiene
`(K₀ + λKΔ)v = 0`. También coincide con el flujo documentado por
[CalculiX](https://www.dhondt.de/ccx_2.19.pdf): carga de referencia, stress
stiffness y extracción de factores de pandeo.

### Unidades y normalización

| Cantidad | Unidad/contrato |
|---|---|
| `E`, `A`, `I`, longitud, fuerzas | Unidades base actuales: kN y m, sin conversión dentro del eigenkernel. |
| `K_E`, `K_G` | Bloques con las mismas dimensiones físicas por par de GDL; deben compartir exactamente orden, transformación y escalado. |
| `λ` | Adimensional; multiplica toda la combinación de referencia. |
| `φ` traslacional | Forma relativa; no representa metros reales. |
| `φ` rotacional | Forma relativa; no representa una rotación real alcanzada. |
| `P_cr` mostrado | `λ ×` cada acción de referencia, con unidades propias de esa acción; no reducir un patrón multiaxial a un único kN engañoso. |

La visualización normalizaría la máxima traslación nodal a 1.0 y elegiría un
signo canónico mediante el primer GDL significativo. Si no existe traslación
significativa, el modo se marca inválido/mecanismo. En eigenvalues repetidos o
muy próximos, la base modal no es única: se presenta un **cluster**, no se
promete identidad estable de “modo 1” nodo por nodo. Abaqus documenta la misma
no unicidad para eigenvalues repetidos en su tratamiento de sensibilidades.

### Restricciones y reducción

Las condiciones del modo son incrementales y homogéneas:

```text
C φ = 0
```

El kernel futuro debe construir una base `Z` del nullspace de `C` y resolver:

```text
[Zᵀ K₀ Z + λ Zᵀ KΔ Z] ψ = 0
φ = Z ψ
```

Esto preserva apoyos directos, apoyos inclinados y vínculos rígidos sin tratar
los multiplicadores de Lagrange como GDL físicos. Un asentamiento no cero puede
crear el estado base, pero el modo conserva condición incremental homogénea.
No se acepta trasladar el sistema KKT estático actual al eigensolver por mera
analogía.

### Releases, offsets y condensación

La condensación estática actual recibe la matriz ya sumada `K_E + K_G(N)`.
En un pencil `K_E + λK_G`, eliminar GDL internos puede introducir dependencia
racional en `λ`; por tanto, no se debe formar dos matrices condensadas por
diferencia y asumir equivalencia. Opciones aceptables para investigación:

1. conservar GDL de conexión internos dentro del eigenproblema;
2. derivar una condensación generalizada y demostrarla analíticamente;
3. excluir releases y offsets del primer slice.

La recomendación R0 es la opción 3. No hay razón para ensanchar el dominio antes
de demostrar el caso prismático sin releases.

## Relación con estabilidad y límites físicos

| Capacidad | Pregunta que responde | Lo que no responde |
|---|---|---|
| Primer orden | Equilibrio elástico en geometría inicial. | Amplificación geométrica o bifurcación. |
| P-Delta actual | Equilibrio aproximado de segundo orden para la carga elegida. | Extracción modal, postpandeo, resistencia normativa. |
| Eigen buckling futuro | ¿Para qué múltiplo del patrón idealizado la rigidez tangente lineal admite un modo no trivial? | Camino real de carga, capacidad con imperfecciones, plasticidad o colapso. |
| GMNIA futura | Respuesta no lineal con imperfecciones y material dentro de su propio contrato. | Verificación normativa automática salvo módulo separado. |

La predicción es razonable sólo cuando el comportamiento prebuckling es casi
lineal y elástico. La guía oficial de
[buckling de vigas de Abaqus](https://docs.software.vt.edu/abaqusv2024/English/SIMACAEBMKRefMap/simabmk-c-beambuckle.htm)
advierte que la carga de colapso puede depender fuertemente de imperfecciones y
que suele requerirse después un análisis carga–desplazamiento. Su ejemplo de
[shell cilíndrico](https://docs.software.vt.edu/abaqusv2025/English/SIMACAEBMKRefMap/simabmk-c-bucklecylshell.htm)
separa explícitamente eigenvalue, convergencia de malla y análisis no lineal con
imperfecciones. StructureCo debe aplicar el mismo límite, incluso en pórticos.

### Primer subconjunto que podría promoverse

- dominio 2D;
- miembros `frame` prismáticos Euler–Bernoulli, material elástico lineal;
- `E`, `A`, `I` positivos y finitos;
- apoyos directos homogéneos suficientes para eliminar mecanismos;
- sin releases, internal hinges, rigid offsets, rigid members, springs ni
  constraints multipunto en el primer slice;
- una combinación de referencia explícita formada por cargas nodales
  conservativas;
- sin self-weight, cargas distribuidas/de barra, initial strain/curvature,
  asentamientos prescritos ni preload independiente;
- análisis lineal de referencia fresco y clasificado `reliable`;
- extracción de los primeros 3–5 eigenvalues positivos finitos, no sólo uno.

Todo lo demás queda `unsupported`, no “estimado con menor precisión”.

## Requisitos de malla, apoyos y carga

1. Cada miembro comprimido debe tener subdivisiones suficientes para representar
   la curvatura del modo. Un miembro gráfico único no equivale a una malla
   validada.
2. Se exige estudio automático 1/2/4/8 o refinamiento equivalente en los
   benchmarks; `λ₁` debe converger y el modo no debe cambiar de familia sin aviso.
3. El modelo debe ser estable en primer orden después de aplicar `Cφ=0`. Un
   mecanismo de `K_E` se reporta como modelo inválido, no como `λ=0` de pandeo.
4. Los apoyos del estado estático y del modo deben tener semántica separada si
   alguna futura fase admite cambios de condición durante la perturbación.
5. La carga de referencia debe ser no nula, finita, conservativa y escalable.
   El resultado debe enumerar sus factores y su hash.
6. Miembros en tensión pueden estabilizar el sistema, pero un modelo sin
   contribución compresiva que no produce eigenvalue positivo debe devolver
   “sin modo compresivo en el rango”, nunca infinito ni PASS.
7. Deben conservarse IDs de nodos/miembros y el vector modal completo en orden
   de GDL explícito para provenance y localización.

## Benchmarks y oráculos independientes

| ID | Caso | Oráculo | Gate propuesto |
|---|---|---|---|
| EB-01 | Columna articulada–articulada | `Pcr = π²EI/L²` congelado fuera del kernel | `λ₁` ≤0.5 % con malla convergida; signo compresivo correcto. |
| EB-02 | Voladizo, fija–articulada y fija–fija | `Pcr = π²EI/(K L)²`, `K={2, 0.699…, 0.5}` | ≤1 % por condición; orden relativo correcto. |
| EB-03 | Refinamiento 1/2/4/8/16 | solución de Euler y tendencia | error no creciente desde 2 elementos; diferencia 8→16 ≤0.25 %. |
| EB-04 | Columna trasladada, rotada y con sistema de unidades equivalente | invariancia analítica/metamórfica | factores iguales dentro de `1e-9`; modos equivalentes tras transformar. |
| EB-05 | Columna en tensión y carga de referencia cero | física/signo | ningún `λ>0` falso; diagnóstico determinista. |
| EB-06 | Pórtico sway de una crujía y dos niveles | Abaqus/Standard y CalculiX versionados | primeros 3 factores ≤1 % y subespacios modales correlacionados. |
| EB-07 | Dos columnas simétricas con eigenvalues repetidos/cercanos | matriz densa independiente + subespacio de referencia | cluster estable; no exigir vector individual idéntico. |
| EB-08 | Modelo con mecanismo, apoyo duplicado y constraint multipunto | auditoría estructural independiente | fail-closed antes de extracción; sin modo espurio de multiplicadores. |
| EB-09 | Releases/offsets (fase posterior) | modelo explícito con GDL internos contra solver externo | bloqueado hasta demostrar equivalencia de la reducción. |
| EB-10 | Portal con nodal gravity y patrón lateral | solver externo + equilibrio del estado de referencia | provenance completo; `K_G` reproduce fuerzas axiales auditadas. |

El corpus externo debe guardar versión del solver, input deck, convención de
signos, factores, modo normalizado y hash. No basta una captura. El ejemplo
oficial de vigas de Abaqus es un oráculo publicado para columnas clásicas; el
procedimiento `*BUCKLE` de CalculiX ofrece un segundo motor reproducible y
documenta que el menor eigenvalue escala la carga de referencia. Los valores
analíticos se calculan en un módulo de test sin importar código del solver.

### Métricas numéricas mínimas

- residuo por modo:
  `||K₀φ + λKΔφ||₂ / (||K₀||₂ + |λ| ||KΔ||₂) ||φ||₂ ≤ 1e-8`;
- violación cinemática: `||Cφ||₂ / ||φ||₂ ≤ 1e-10`;
- orden ascendente de factores positivos, con rechazo explícito de NaN/Inf;
- estabilidad frente a escala de coordenadas y unidades;
- Modal Assurance Criterion sólo para modos aislados;
- ángulos principales/subspace MAC para clusters con separación relativa
  menor a `1e-4`;
- determinismo de eigenvalues; en clusters, determinismo del subespacio y no
  necesariamente de cada vector.

## Contrato de resultado futuro

Un resultado no debe entrar a `AnalysisResult` actual por conveniencia. El
objeto candidato sería efímero y separado:

```ts
interface EigenBucklingResult {
  version: 'eigen-buckling-r0';
  projectId: string;
  projectHash: string;
  referenceScenarioId: string;
  referenceScenarioHash: string;
  baseState: 'unloaded-r0';
  assumptions: string[];
  unsupportedFeatures: string[];
  modes: Array<{
    rank: number;
    loadFactor: number;
    clusterId?: string;
    normalizedDofs: number[];
    residual: number;
    constraintResidual: number;
  }>;
  reliability: 'research' | 'limited' | 'failed';
  issues: Array<{ id: string; severity: 'warning' | 'error'; message: string }>;
}
```

No se persiste en `ProjectModel`, no altera resultados históricos y no alimenta
el módulo normativo. Si alguna fase futura decide persistir expedientes, deberá
versionar matrices/algoritmo, hash del modelo, combinación, unidades y oráculos.

## Copy seguro de producto

### Título

**Pandeo elástico por eigenvalues · Investigación**

### Resumen permitido

> Factor elástico de bifurcación para la combinación de referencia. Multiplica
> el patrón completo de carga; la forma modal está normalizada y no representa
> una deformación real.

### Advertencia persistente

> No es una resistencia de diseño, factor de seguridad ni carga de colapso.
> Supone geometría ideal, material elástico y respuesta prebuckling casi lineal;
> no incluye imperfecciones, plasticidad, postpandeo ni pandeo fuera del plano.

### Estados fail-closed

- **Carga no escalable:** “La combinación contiene acciones fuera del contrato
  de eigen buckling; no se calculó un factor.”
- **Mecanismo:** “El modelo ya tiene un modo cinemático en primer orden; corrige
  apoyos o conexiones antes de estudiar pandeo.”
- **Malla insuficiente:** “El factor cambia con el refinamiento y aún no es
  convergente; no se publica como estimación utilizable.”
- **Sin factor positivo:** “No se encontró un modo compresivo positivo en el
  rango solicitado. Esto no demuestra estabilidad ilimitada.”
- **Cluster modal:** “Estos modos comparten prácticamente el mismo factor; sus
  vectores individuales pueden rotar dentro del mismo subespacio.”

Copy prohibido: “capacidad”, “resistencia”, “cumple”, “seguro”, “factor de
seguridad”, “carga admisible” o “carga última” sin el calificativo negatorio
explícito anterior.

## Gates de validación y promoción

| Gate | Condición para cerrarlo |
|---|---|
| R0 · alcance | Subconjunto inicial y exclusiones aprobados por revisión estructural independiente. |
| R1 · formulación | Derivación de `K₀`, `KΔ`, signo, constraints y tratamiento de GDL internos revisada; sin reutilización accidental del KKT estático. |
| R2 · algoritmo | Spike aislado con eigensolver auditado, licencia compatible, cancelación y límites de memoria; ninguna dependencia entra al producto sin autorización. |
| R3 · oráculos | EB-01…EB-08 verdes en CI, y EB-06 comparado con dos familias independientes: analítica cuando aplica y solver externo versionado. |
| R4 · convergencia | Política de malla y clusters implementada fail-closed; residuos y tolerancias visibles en resultados. |
| R5 · producto | Copy anterior, provenance, hash, unidades, combinación y estados stale cubiertos por tests UI y exportación. |
| R6 · promoción | Revisión estructural externa firma límites; `verify:protected`, focales, build, rendimiento y browser QA pasan sin excepciones. |

Sólo al cerrar R0–R6 debe crearse una issue de implementación de producto. Un
spike de investigación no autoriza campos nuevos en `ProjectModel`, workers,
persistencia, import/export ni `AnalysisResult`.

## Riesgos abiertos

1. **Condensación dependiente de λ:** releases y offsets pueden invalidar una
   separación ingenua de matrices.
2. **Restricciones KKT:** modos de multiplicadores o eigenvalues infinitos si
   no se proyecta al nullspace físico.
3. **Escalado mixto:** traslaciones y rotaciones requieren equilibración que
   preserve el pencil y residuos interpretables.
4. **Eigenvalues próximos:** ordenar vectores no garantiza identidad modal.
5. **Carga stiffness:** acciones seguidoras producen matrices no simétricas;
   Abaqus documenta que su solver simetriza esas contribuciones. El slice R0
   debe excluirlas, no copiar esa aproximación silenciosamente.
6. **Falsa precisión:** un factor con muchos decimales puede estar dominado por
   malla, idealización o imperfecciones ausentes.
7. **Costo web:** una extracción densa escala cúbicamente; tamaño, cancelación y
   worker deben gatearse antes de cualquier interfaz.

## Cierre

**Viabilidad: condicionalmente positiva. Decisión: mantener CRI-49 como
investigación cerrada y no abrir todavía una issue de implementación.**

La oportunidad es real para pórticos elásticos 2D, pero el repositorio sólo
aporta una parte del kernel físico. Promover ahora mezclaría una matriz
geométrica P-Delta con un problema modal que necesita otras restricciones,
algoritmo y evidencia. El próximo acto autorizado, fuera de esta tarea, sería
un spike R0–R2 aislado; no una superficie de usuario.

## Archivos tocados

- `reports/2026-08-24-cri-49-eigen-buckling-research.md` — este RFC/informe.

## Qué no se implementó

No se modificaron solver, ecuaciones, matrices, tipos, ProjectModel, workers,
persistencia, import/export, resultados, UI, dependencias ni tests. Tampoco se
creó una issue de implementación futura: los gates R0–R6 son precondición
explícita para hacerlo.

## Verificación aplicable

```powershell
npm.cmd run verify:docs
npm.cmd run verify:protected
```

No se ejecuta una matriz funcional de eigen buckling porque la capacidad no
existe y esta issue prohíbe implementarla. Los gates sólo deben confirmar que
el informe es documental y que la frontera protegida permanece intacta.
