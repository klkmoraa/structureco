# CRI-52 — RFC de plasticidad, P-δ local y GMNIA

**Fecha:** 2026-08-24
**Agente:** Codex
**Rama:** `codex/linear-queue-execution-20260824`
**SHA auditado:** `5b614bfa1c3dfdf6e829b9c6b0e60a52caced21c`
**Tipo:** investigación P3; no implementación

## Decisión ejecutiva

| Pregunta | Decisión |
|---|---|
| ¿P-Delta actual ya es un solver no lineal general? | **No.** Es una capacidad elástica experimental, de pequeñas deformaciones, que itera una matriz geométrica con fuerza axial constante promedio por elemento. |
| ¿Plasticidad, P-δ local y GMNIA son sinónimos? | **No.** Material nonlinearity, geometric nonlinearity e imperfections son contratos distintos; GMNIA exige combinarlos de forma consistente y dependiente de trayectoria. |
| ¿Puede ampliarse el enum `analysisMode` y reutilizarse el loop actual? | **No.** Faltan estado trial/committed, tangent consistente, historia de carga, rollback, kinematics actualizada, control de desplazamiento/arc-length y resultados por sección. |
| ¿La `yieldStrength` del catálogo habilita plasticidad? | **No.** Es metadata de catálogo. El miembro persistente entrega al solver `E,A,I` y no define yield surface, hardening, fibras, hinge length ni variables internas. |
| ¿Es viable como programa futuro? | **Sí, por etapas aisladas.** Primero kernels y prototipos separados de material y geometría; sólo después un acoplamiento GMNIA. |
| ¿Se promueve o implementa algo ahora? | **No. Mantener fuera del producto actual.** No se agrega teoría, solver, resultado, modo, migración ni issue de implementación desde CRI-52. |

La conclusión de viabilidad es **positiva pero condicional**. StructureCo podría
investigar análisis no lineal 2D en el futuro, pero no como una extensión
nominal del P-Delta vigente. Debe existir un programa de tres capacidades con
gates independientes:

1. `NL-M` — material no lineal e historia constitutiva;
2. `NL-G` — geometría no lineal, P-δ local e imperfecciones;
3. `NL-C` — acoplamiento GMNIA, sólo tras promover las dos anteriores.

El diseño normativo sería una cuarta capacidad, `NL-D`, fuera del solver. Un
análisis GMNIA convergido no constituye por sí mismo una verificación de código.

## Frontera exacta del producto actual

| Evidencia | Ruta y líneas | Consecuencia |
|---|---|---|
| `MemberModel` persiste `E,A,I` y propiedades elásticas/geométricas, no una ley constitutiva ni estado plástico. | `src/types.ts:64-91` | No hay yield surface, hardening, plastic strain, backstress, fibers ni plastic hinge state. |
| El catálogo sí conoce `yieldStrength`, pero esa propiedad no forma parte del miembro que consume el solver. | `src/data/standardMaterials.ts:16-28`, `src/types.ts:64-91` | La identidad de catálogo no puede reinterpretarse silenciosamente como modelo plástico. |
| Los únicos modos persistentes son `first-order` y `p-delta`. | `src/types.ts:196-201` | No existe identidad, configuración, protocolo ni resultado no lineal general. |
| El diagnóstico P-Delta declara `experimental: true` y sólo conserva incrementos, equilibrio, amplificación y axiales por miembro. | `src/types.ts:493-548` | No hay historia de material, sección, curvatura plástica, path ni imperfection provenance. |
| La matriz geométrica actual es la consistente 6×6 de un beam-column prismático, con `N` constante y pequeñas deformaciones. | `src/engine/solver.ts:168-185` | Captura softening elástico dentro de ese contrato; no actualiza la configuración ni integra curvatura/inelasticidad a lo largo del miembro. |
| Sólo frames reciben `K_G`; se suma a la rigidez elástica antes de condensar conexiones. | `src/engine/solver.ts:1340-1369` | No existe una formulación no lineal para truss, spring, rigid ni una sección material. |
| El hook `pDeltaAxialForces` es interno y conserva intacta la ruta lineal ordinaria. | `src/engine/solver.ts:1252-1263` | No es una API de tangent/residual general. |
| P-Delta extrae el axial promedio de los extremos y lo trata constante por elemento. | `src/engine/pDelta.ts:91-108` | La variación local y la curvatura entre extremos sólo pueden aproximarse por discretización; no hay P-δ independiente. |
| La iteración es fixed-point sobre `N` y fuerza solve denso. | `src/engine/pDelta.ts:225-315`, `src/engine/pDelta.ts:373-385` | No es Newton sobre el residual total ni tiene tangent material/geométrica consistente. |
| El stepping escala todos los factores del target con un único `lambda`. | `src/engine/pDelta.ts:77-88`, `src/engine/pDelta.ts:433-464` | Sirve a un patrón proporcional elástico; no representa secuencias, descarga, cyclic history ni paths no proporcionales. |
| La auditoría de madurez excluye plasticidad, grandes rotaciones, P-δ local, eigen buckling y GMNIA. | `reports/2026-08-24-cri-24-pdelta-madurez.md:65-75` | CRI-52 no puede ampliar el significado del resultado actual. |
| Eigen buckling ya quedó separado de P-Delta y GMNIA. | `reports/2026-08-24-cri-49-eigen-buckling-research.md:169-184` | Un modo propio puede sembrar una imperfección futura, nunca sustituir el load–displacement path. |

### Lo que P-Delta actual sí hace

- análisis elástico 2D opt-in;
- `K_e + K_G(N)` en miembros frame;
- stepping adaptativo proporcional;
- fixed-point sobre el axial promedio;
- criterios acotados de incremento y equilibrio;
- rechazo de estados postcríticos observables;
- factor crítico **estimado**, no eigenvalue;
- resultado explícitamente experimental.

### Lo que no hace

- grandes desplazamientos o rotations finitas;
- configuración actualizada/corotational;
- P-δ local sobre una forma inicialmente curva;
- initial crookedness o residual stress;
- plastic hinges o distributed plasticity;
- interacción axial–momento inelástica;
- unloading/reloading ni path dependency;
- Newton–Raphson sobre un residual total;
- displacement control, line search o arc-length;
- bifurcation switching o postbuckling;
- capacidad resistente o verificación normativa.

Por tanto, el modo vigente conserva su nombre, schema, tests y lenguaje. Ningún
prototipo futuro debe cambiar sus resultados históricos ni “promoverlo” por
haber agregado otra teoría.

## Fenómenos físicos y casos de uso

### `NL-M` · Material no lineal

Pregunta: ¿cómo evoluciona la fuerza de sección cuando una historia de
deformación rebasa el dominio elástico?

Fenómenos posibles, que deben declararse por separado:

- yielding monotónico;
- hardening isotrópico;
- hardening cinemático y Bauschinger;
- unloading/reloading;
- interacción `P-M` de sección;
- plastic hinge concentrada;
- distributed plasticity por integration points/fibers;
- degradación, daño, fracture, concrete cracking/crushing y cyclic pinching.

El primer programa futuro **no** debe mezclar todos ellos. El menor contrato
defendible sería acero 2D, small strain, ley uniaxial bilineal versionada,
sección de fibras conocida y loading monotónico. Concrete, timber, fracture,
fatigue, cyclic degradation y connection failure quedan fuera.

### `NL-G` · Geometría no lineal y P-δ local

Pregunta: ¿cómo cambia el equilibrio cuando la geometría deformada altera
direcciones, brazos, curvatura y rigidez?

Debe distinguir:

- `P-Δ` global: axial/gravity sobre el sway entre extremos/niveles;
- `P-δ` local: axial sobre la curvatura/bowing del miembro entre sus extremos;
- grandes rotations con strains pequeñas;
- large strain, fuera del primer programa;
- load stiffness de follower forces, fuera del primer programa;
- initial crookedness/imperfection como geometría real versionada;
- residual stress, que es estado material inicial, no geometría.

El menor contrato futuro sería un beam-column corotational 2D elástico,
conservative nodal loads, rotations grandes/strains pequeñas, malla explícita e
imperfección geométrica nodal. No debe afirmar P-δ local si un miembro recto de
dos nodos sólo rota como cuerda sin interpolation/segmentación suficiente para
representar su bowing.

### `NL-C` · GMNIA

GMNIA significa aquí:

```text
Geometrically and Materially Nonlinear Analysis
+ declared Imperfections
+ incremental equilibrium path
+ auditable constitutive/element state
```

Responde por un load–displacement path dentro de un modelo y unas imperfecciones
concretas. Puede investigar limit points y redistribución inelástica. No
responde automáticamente:

- la resistencia de diseño de una norma;
- una combinación lineal de resultados;
- la imperfección más desfavorable;
- local plate/shell buckling no modelado;
- fracture, low-cycle fatigue o connection failure;
- robustez frente a acciones no declaradas;
- probabilidad de colapso.

### `NL-D` · Diseño normativo

Debe vivir fuera del solver como un módulo de reglas con:

- norma, edición, anexo/país y alcance;
- partial/resistance factors;
- patrón de imperfections y residual stresses exigidos;
- requisitos de sección/clase/local buckling;
- criterios de aceptación y reporting;
- revisión profesional.

`NL-D` puede consumir resultados promovidos de `NL-C`, pero jamás se infiere
de que Newton haya convergido.

## Variables internas y contrato de estado

### Estado global por step/increment

```text
AnalysisPath
├─ pathId + version
├─ orderedSteps[]
│  ├─ referenceLoads + fixedLoads
│  ├─ control: load | displacement | arc-length
│  ├─ target/limits
│  └─ stopCriteria
└─ provenance

NonlinearState
├─ committed { u, lambda, elementStates[] }
├─ trial     { u, lambda, elementStates[] }
├─ tangentSignature
└─ iterationAudit[]
```

El equilibrio incremental es:

```text
R(u, q, λ) = λ P_ref + P_fixed - f_int(u, q) = 0
K_T Δu = R
```

donde `q` reúne variables internas. El solver necesita dos estados:

- **trial**, mutable durante una iteración;
- **committed**, último incremento convergido.

Un fallo debe descartar todo el trial state antes de reducir el paso. Sin
rollback exacto, un intento fallido contamina plastic strain y hace el resultado
dependiente de la política de cutback.

### Estado material mínimo

Para una ley uniaxial elastoplástica:

```text
MaterialState
├─ totalStrain ε
├─ plasticStrain εp
├─ accumulatedPlasticStrain κ
├─ backstress α?             (sólo si hardening cinemático)
├─ stress σ
├─ consistentTangent Et
└─ yielded + dissipation
```

Una integración por return mapping debe entregar stress, estado trial y tangent
algorítmico consistente. Los tests separan elastic predictor, yield check,
plastic corrector, unloading y energía disipada.

### Estado de sección/elemento

```text
SectionState
├─ generalizedDeformation { ε0, κz }
├─ generalizedForce       { N, Mz }
├─ tangent2x2
├─ integrationPoint/fiber states[]
└─ plasticDeformation + energy

ElementState
├─ corotational basis/current chord
├─ basic deformation/forces
├─ section states by integration point
├─ end hinge states? + hinge length/provenance
└─ compatibility/equilibrium residuals
```

Dos formulaciones no deben compartir el mismo nombre de resultado:

| Formulación | Ventaja | Riesgo/contrato |
|---|---|---|
| Plastic hinge concentrada | Slice menor y resultados intuitivos. | Hinge length, `P-M` surface y localización son inputs; puede volver la respuesta mesh-dependent. |
| Distributed plasticity/fiber | Captura propagación e interacción desde geometría/material. | Requiere fibras, integration rule, nested element iteration y mucho más estado. |

La documentación oficial de
[OpenSees `forceBeamColumn`](https://opensees.github.io/OpenSeesDocumentation/user/manual/model/elements/forceBeamColumn.html)
muestra que distributed plasticity y plastic-hinge integration son opciones
distintas y que un elemento force-based itera compatibilidad de secciones. Es
evidencia de arquitectura; no es una formulación para copiar sin derivación.

### Geometría e imperfecciones

```text
ImperfectionDefinition
├─ kind: measured | analytic | eigenmode | explicit
├─ sourceId/sourceHash
├─ coordinateSystem
├─ components[] { shapeId, amplitude, normalization }
├─ appliedNodeCoordinatesHash
└─ units + sign convention
```

Reglas:

- la geometría nominal nunca se sobrescribe;
- las coordenadas imperfectas del análisis son derivadas y reproducibles;
- la amplitud no se infiere de tolerancias visuales;
- un eigenvector no tiene amplitud física hasta declarar normalization/scale;
- combinaciones de modos preservan signs y provenance;
- residual stresses no se guardan como crookedness;
- cambiar imperfection invalida resultados;
- el reporte muestra forma, amplitude y fuente.

La opción oficial
[`*IMPERFECTION` de Abaqus](https://docs.software.vt.edu/abaqusv2024/English/SIMACAEKEYRefMap/simakey-r-imperfection.htm)
permite una geometría explícita o superposición escalada de modos/estados
previos. Ese nivel de provenance es el mínimo conceptual para una GMNIA.

## Historia de carga: no hay superposición

En material o geometría no lineal:

```text
response(A + B) ≠ response(A) + response(B)
```

y, en general:

```text
path(A → B) ≠ path(B → A)
```

Consecuencias:

- `LoadCombination.factors` no basta como expediente de análisis;
- un target proporcional puede seguir existiendo, pero como un `AnalysisPath`
  de un step;
- gravity/preload, lateral push, unloading y reversal son steps ordenados;
- prescribed displacements se clasifican como control o boundary history;
- no se combinan diagramas no lineales después de resolver;
- cada resultado conserva todos los increments aceptados o un resumen firmado
  por hash, además de probes/checkpoints;
- undo/redo edita la definición del path, no el state interno de una corrida.

## Estrategia de solución y convergencia

### Newton incremental

El baseline futuro sería full Newton–Raphson:

1. formar predictor del incremento;
2. actualizar trial kinematics;
3. integrar material/secciones en trial;
4. ensamblar `f_int` y tangent consistente `K_T`;
5. resolver corrección;
6. evaluar criterios múltiples;
7. commit si converge; rollback/cutback si falla.

Modified Newton puede existir sólo como alternativa medida. El fixed-point P-
Delta actual no se reutiliza como kernel de `NL-M/NL-G/NL-C`.

### Line search

Una line search controla la longitud de una buena dirección Newton cuando el
residual es áspero. La documentación de
[OpenSees NewtonLineSearch](https://opensees.github.io/OpenSeesDocumentation/user/manual/analysis/algorithm/NewtonLineSearch.html)
explicita que cambia `u_{n+1}=u_n+ηΔu` y normalmente reforma el tangent en cada
iteración. Debe ser algoritmo seleccionable/auditado, no un “retry” oculto.

### Controles de trayectoria

| Control | Uso permitido | Límite |
|---|---|---|
| Load control | Rama estable, patrón proporcional. | No atraviesa bien un limit point con negative tangent. |
| Displacement control | Pushover y respuesta monotónica con un DOF que sigue moviéndose. | Puede fallar si el DOF elegido se estanca/revierte o no parametriza la rama. |
| Arc-length/Riks | Limit points y rama con descenso de load factor. | Supone un path/referencia bien definidos; branch switching y bifurcaciones requieren tratamiento explícito. |

[OpenSees ArcLength](https://opensees.github.io/OpenSeesDocumentation/user/manual/analysis/integrator/ArcLength.html)
y la teoría oficial del
[modified Riks de Abaqus](https://docs.software.vt.edu/abaqusv2024/English/SIMACAETHERefMap/simathe-c-modifiedriks.htm)
confirman que el parámetro de carga pasa a ser incógnita y que la rama inestable
necesita otra ecuación de constraint. Reducir `lambda` en el loop P-Delta no
equivale a path-following.

### Criterios simultáneos

Una iteración sólo converge si todos los criterios requeridos están dentro de
una escala absoluta+relativa declarada:

```text
force:        ||R|| / max(Fref, Ffloor)
displacement: ||Δu|| / max(||u||, Uref, Ufloor)
energy:       |Δuᵀ R| / max(Eref, Efloor)
element:      max(section compatibility/equilibrium)
constraints:  ||C u - d||
```

Además:

- todos los valores deben ser finitos;
- el trial material debe ser admissible;
- plastic dissipation no puede ser negativa para el modelo elegido;
- el balance externo–interno se verifica sobre la configuración consistente;
- `converged` no se infiere de un solo incremento pequeño;
- los norms, referencias, tolerancias e iteraciones se publican por increment;
- tolerancias en distintas unidades se normalizan, no se comparan directamente.

### Cutback, crecimiento y presupuesto

- al fallar: rollback exacto, reducir step/arc length y reintentar;
- al converger rápido: crecimiento limitado y determinista;
- máximos de increments, iterations y factorizations;
- cancelación cooperativa dentro de Newton y de integration points;
- checkpoint sólo de estados committed;
- no devolver el último trial como resultado parcial utilizable;
- distinguir `not-converged`, `limit-point-reached`, `bifurcation-suspected`,
  `material-failure-out-of-model` y `resource-budget`.

### Tangent y álgebra

Un tangent geométrico/material puede perder positive definiteness cerca de un
limit point. El kernel futuro necesita:

- sparse assembly;
- solver para symmetric indefinite con pivoting auditado;
- ruta nonsymmetric separada si algún día hay follower loads;
- condition/pivot diagnostics como advertencia, no sustituto de equilibrio;
- reproducibilidad de ordering y constraints;
- no materializar historias densas completas.

## Interacción con P-Delta existente

| Tema | P-Delta actual | Futuro `NL-G/NL-C` |
|---|---|---|
| Configuración | Inicial; pequeñas deformaciones. | Actualizada/corotational; rotations finitas dentro del scope. |
| Elemento | `K_e + K_G(Nprom)` prismático. | Internal force/tangent desde estado actual y sections. |
| Iteración | Fixed-point sobre `N`. | Newton sobre `R(u,q,λ)`. |
| Carga | Un target proporcional escalado. | Ordered analysis path. |
| Estado | Axial por miembro e historial compacto. | Trial/committed por material, sección, elemento e increment. |
| Inestabilidad | Rechaza postcrítico observable. | Control de trayectoria puede seguir limit points dentro de gates. |
| Resultado | Elástico experimental. | Familias nuevas con schema/provenance propios. |

Compatibilidad obligatoria:

1. `first-order` y `p-delta` no cambian numéricamente;
2. el nuevo motor vive en un módulo/worker/protocol/schema separados;
3. `ProjectModel` actual no recibe estado iterativo;
4. modelos antiguos migran agregando cero `analysisPaths`, nunca plasticidad;
5. `NL-G` debe tender al resultado P-Delta dentro del régimen común y con mesh
   convergida, pero una diferencia no se “arregla” calibrando constantes;
6. `NL-C` no reutiliza `criticalLoadFactor` como collapse load;
7. resultados de motores diferentes no comparten badge ni export name.

## Benchmarks y oráculos

### Kernel material y sección

| ID | Caso | Oráculo | Gate futuro |
|---|---|---|---|
| NM-01 | Barra uniaxial elastic–perfectly plastic monotónica | Solución cerrada `σ=sign(ε) min(E|ε|,fy)` | Stress/tangent/state a precisión numérica; yield exacto. |
| NM-02 | Bilinear isotropic hardening, load–unload–reload | Return mapping independiente | Path, residual de yield y dissipation; rollback bit-exacto. |
| NM-03 | Kinematic hardening reversal | Solución uniaxial/Bauschinger | Backstress y yield en reversal dentro de tolerancia. |
| NM-04 | Sección rectangular en curvatura pura | `My=fy S`, `Mp=fy Zp` y moment–curvature | Fibers/integration convergen ≤0.5 %. |
| NM-05 | `P-M` de sección | Integración de fibras independiente | Yield surface convexa, simetría/signos e interacción ≤1 %. |
| NM-06 | Frames plásticos básicos | Abaqus FRAME2D | Hinges en ubicaciones previstas y plastic deformation trazable. |

La verificación oficial de
[plastic frame elements de Abaqus](https://docs.software.vt.edu/abaqusv2024/English/SIMACAEVERRefMap/simaver-c-plasticframe.htm)
incluye axial/moment interaction y hinges predichas para geometrías 2D/3D. Se
usa como corpus externo, no como único oráculo.

### Geometría no lineal

| ID | Caso | Oráculo | Gate futuro |
|---|---|---|---|
| NG-01 | Régimen infinitesimal sin axial | Primer orden StructureCo | Coincidencia al tender load/rotation a cero. |
| NG-02 | Régimen común de columna elástica | P-Delta actual + solución cerrada | Convergencia de mesh; diferencia explicada y acotada. |
| NG-03 | Cantilever con tip moment | Arco circular: `θ=ML/EI` y coordenadas analíticas | Grandes rotations, small strain ≤0.5 %. |
| NG-04 | Columna inicialmente curva bajo `P+H` | Secant solution independiente | P-δ local, amplitude/sign y mesh ≤1 %. |
| NG-05 | Rigid-body rotation/translation | Objectivity/metamórfico | Cero stress/force parasitaria a tolerancia. |
| NG-06 | Shallow arch/toggle frame | Rama publicada y segundo motor | Limit point y rama reproducibles por displacement/arc-length. |
| NG-07 | NAFEMS 3DNLG-1 | Tabla publicada + segundo motor | Tip displacement/moment y mesh ≤1 %. |
| NG-08 | Follower-load negative control | Debe bloquearse | No tratar una carga no conservativa como fija global/local. |

### Acoplamiento GMNIA

| ID | Caso | Qué prueba | Gate futuro |
|---|---|---|---|
| NC-01 | Cantilever `P-M` elastoplástico | Geometría+yield y path | Load–displacement, hinge/fiber history, energy. |
| NC-02 | Portal frame con mechanism plástico | Redistribución y limit load | Teoremas plástico estático/cinemático + segundo motor ≤1 %. |
| NC-03 | Columna imperfecta elastoplástica | Sensibilidad a amplitude | Curvas para 3 amplitudes; mesh/step/tol convergence. |
| NC-04 | Imperfecciones modales 1/2/combinadas | Mode normalization/provenance | Resultados y signs reproducibles; no asumir sólo modo 1. |
| NC-05 | Carga–descarga | Historia y rollback | Estado final depende del path correcto, no de retries fallidos. |
| NC-06 | Limit point con material softening permitido | Arc-length | Rama sin retracing; force/displacement/energy convergen. |
| NC-07 | Modified NAFEMS 3DNLG-1 plástico | Geometric+material history | Tabla externa, mesh y path dentro de tolerancia. |
| NC-08 | Modelo fuera de scope | Fail closed | Concrete damage, local buckling o fracture bloqueados. |

El benchmark oficial
[NAFEMS 3DNLG-1 modificado de Abaqus](https://docs.software.vt.edu/abaqusv2024/English/SIMACAEBMKRefMap/simabmk-c-dsa3dnlg.htm)
combina large deflection, plastic yielding y descarga, y muestra por qué una
formulación incremental importa en un problema history-dependent.

### Matriz de convergencia obligatoria

Cada benchmark cruza:

- 1/2/4/8 elementos por miembro;
- 3/5/7/… integration points o hinge refinement pertinente;
- step/arc length base, mitad y cuarto;
- tolerancias base y una década más estricta;
- load, displacement y arc-length donde correspondan;
- orientación, translation, rotation, renumbering y unit scaling;
- dos motores externos versionados;
- Chromium/WebKit y hardware declarado para presupuesto/cancelación.

Se reporta la curva completa, no sólo peak load. Dos corridas que llegan al
mismo máximo por ramas distintas no son equivalentes.

## Seguridad y lenguaje de producto

### Nombres permitidos antes de promoción

- “Prototipo de material no lineal — laboratorio”
- “Geometría no lineal 2D — experimental”
- “Trayectoria GMNIA — investigación”
- “El solver no alcanzó equilibrio dentro de los límites declarados”
- “Limit point detectado dentro de este path”

### Nombres prohibidos

- “Diseño plástico aprobado”
- “Carga de colapso segura”
- “Cumple AISC/Eurocódigo/NTC”
- “GMNIA certificada”
- “Factor de seguridad”
- “Postpandeo real”
- “La estructura falla en…”

sin un `NL-D` separado, revisión normativa y alcance promovido.

### Mensaje mínimo en todo resultado experimental

> Resultado experimental y dependiente de trayectoria. Válido sólo para el
> modelo material, geometría, imperfecciones, secuencia y tolerancias
> declaradas. Convergencia numérica no implica verificación normativa ni
> capacidad segura. Requiere revisión profesional independiente.

### Fail-closed

Bloquear antes de resolver cuando:

- material/section no pertenece al subset soportado;
- falta geometry para fibras o hinge data;
- imperfection carece de amplitude/unidades/provenance;
- hay load combination que pretende superposición no lineal;
- el path no define control suficiente;
- follower loads/contact/local buckling/fracture están presentes;
- una sección cambia de normal/ejes sin migración explícita;
- el presupuesto excede memoria/increments/factorizations;
- el schema/protocol/kernel version no coincide.

Durante/después:

- no hay resultado utilizable si no converge el target solicitado;
- un limit point es evento, no failure/capacity automático;
- un state parcial se marca checkpoint diagnóstico, nunca resultado de diseño;
- la sensibilidad a imperfections se muestra como familia de curvas;
- “no converge” no se traduce a “colapsa”.

## Resultados y provenance futuros

```text
NonlinearAnalysisResultV1
├─ capability: material | geometric | gmnia
├─ experimental: true
├─ model/path/imperfection/kernel hashes
├─ supportedScope + exclusions
├─ status + stopReason
├─ increments[]
│  ├─ lambda/controlValue
│  ├─ iterations + norms
│  ├─ nodal state/probes
│  ├─ element/section summary
│  └─ energies + equilibrium
├─ events { firstYield, limitPoint, hinge, warning }
├─ convergence studies?
└─ externalOracleEvidence?
```

Por costo, los fields completos pueden persistir en checkpoints/result chunks,
pero los hashes, events, probes, extrema, energy y audit trail no se omiten. Un
`peakLambda` sin la rama, imperfection y stop reason no es un resultado
defendible.

## Rendimiento y arquitectura

El costo no es “un solve”:

```text
steps × retries × Newton iterations
× element compatibility iterations
× section integration points
× material fibers
```

Precondiciones:

- worker dedicado, cancelable dentro de loops anidados;
- sparse tangent assembly incremental;
- factorization diagnosable;
- state arrays tipados, no object graphs por fibra;
- trial/committed copy-on-write o double buffer auditado;
- checkpoints acotados;
- streaming de curva/probes sin bloquear UI;
- memoria presupuestada antes de generar fibers;
- deterministic seeds si alguna estrategia futura introduce perturbación;
- ningún fallback silencioso a elasticidad.

Un resultado de cientos de increments no se guarda dentro de `ProjectModel`.
Proyecto, configuración de análisis y resultado permanecen artefactos separados
con firmas propias.

## Programa y criterios de promoción independientes

### Fase R0 · contratos, sin solver

Gates:

- ADR de path/state/provenance;
- convención de signos y energía;
- schemas separados para material, section, imperfection y result;
- rollback/cancelación especificados;
- corpus congelado y dos motores externos;
- revisión estructural y numérica.

### Fase R1 · `NL-M` kernel aislado

Alcance: material uniaxial bilinear steel con load/unload de verificación y
sección de fibras 2D limitada a paths monotónicos.

Promoción de kernel sólo si:

- NM-01, NM-02, NM-04 y NM-05 pasan;
- consistent tangent coincide con finite-difference/automatic check;
- rollback y substepping son deterministas;
- balance de energía/dissipation;
- unit/metamorphic tests;
- ninguna integración con producto.

### Fase R2 · `NL-G` prototipo aislado

Alcance: beam-column corotational 2D elástico, imperfection explícita, loads
conservativas.

Promoción de prototipo sólo si:

- NG-01…NG-07 pasan;
- objectivity y rigid-body motion;
- mesh/step/tolerance convergence;
- P-Delta vigente queda bit-exacto;
- displacement y arc-length control auditados;
- limit/failure language revisado.

### Fase R3 · elemento material no lineal

Elegir **una** formulación: hinge concentrada o distributed fiber. No ofrecer
ambas antes de promover una.

Gates:

- element compatibility/equilibrium;
- section/result provenance;
- localization/mesh sensitivity declarada;
- NM-06, NC-01 y NC-02;
- performance/cancelación en browser;
- UI de path/result en laboratorio, no workspace principal.

### Fase R4 · `NL-C` GMNIA

Sólo tras promover R1–R3:

- imperfection program con amplitudes múltiples;
- NC-03…NC-08;
- branch/limit-point behavior con path-following;
- estudios mesh/step/tolerance/integration;
- dos motores externos y revisión independiente;
- fail-closed de fenómenos no modelados;
- schema/worker/export versionados.

R4 promociona un **subconjunto experimental explícito**, no “GMNIA general”.

### Fase R5 · producto experimental

Requiere además:

- onboarding con exclusions antes de activar;
- editor de ordered path e imperfections;
- audit trail/curvas/probes descargables;
- stale-result e invalidación por cualquier cambio relevante;
- a11y y browser QA;
- hardware matrix y budgets;
- soporte de archivos/migración;
- docs que separen analysis, stability y design.

### Fase R6 · `NL-D` normativo

Es una iniciativa independiente:

- norma/edición/anexo explícitos;
- requisitos normativos implementados y citables;
- corpus de ejemplos publicados;
- revisión de calculista responsable;
- versionado y changelog de reglas;
- ningún claim fuera de la jurisdicción/subset validado.

## Riesgos abiertos

1. **Path dependence:** una combinación lineal puede dar una rama imposible.
2. **Rollback corrupto:** retries cambian permanentemente el material state.
3. **Tangent inconsistente:** Newton aparenta robustez sólo con pasos diminutos.
4. **Localization:** plastic hinges/fibers producen respuesta mesh-dependent.
5. **Imperfection sensitivity:** peak load depende de forma y amplitude elegidas.
6. **Branch ambiguity:** arc-length puede seguir o retrazar la rama equivocada.
7. **Bifurcation:** un solver perfecto no cambia de rama sin perturbación/estrategia.
8. **Missing physics:** local buckling, residual stress, fracture o connection
   failure dominan aunque el frame idealizado converja.
9. **Follower loads:** un tangent simétrico puede ser incorrecto.
10. **False collapse:** no convergencia puede ser algoritmo, budget o model error.
11. **False safety:** convergencia no demuestra código ni reliability.
12. **Schema inflation:** state de millones de fibras no pertenece a ProjectModel.
13. **Performance:** loops anidados pueden congelar browser sin cancelación interna.
14. **Oracle dependence:** dos programas pueden coincidir por compartir la misma
    idealización equivocada.
15. **Language drift:** “GMNIA” puede convertirse en marketing antes que evidencia.

## Cierre

**Decisión: mantener plasticidad, P-δ local y GMNIA fuera del producto actual,
pero reconocer viabilidad como programa futuro por etapas `NL-M → NL-G → NL-C`.**
No se abre implementación desde esta investigación. El primer trabajo
admisible sería un kernel material aislado y, en paralelo contractual pero no
integrado, un prototipo geométrico corotational. El acoplamiento sólo procede
cuando ambos demuestren convergencia, invariancia, rollback, path y oráculos
independientes.

P-Delta 2D permanece intacto y experimental. Su factor crítico estimado no es
collapse load; su fixed-point no es Newton; su `lambda` proporcional no es
historia; su convergencia no demuestra plasticidad, P-δ local, postbuckling,
GMNIA ni diseño normativo.

## Archivos tocados

- `reports/2026-08-24-cri-52-nonlinear-gmnia-research.md` — este RFC/informe.

## Qué no se implementó

No se modificaron `ProjectModel`, tipos persistentes, material/section catalogs,
solver 2D/3D, P-Delta, ecuaciones, signos, unidades, elementos, matrices,
workers, protocolos, persistencia, import/export, undo/redo, resultados, UI,
dependencias ni tests funcionales. No se agregó plasticidad, corotational
kinematics, P-δ local, imperfections, Newton, line search, displacement control,
arc-length, postbuckling, GMNIA ni verificación normativa.

## Verificación aplicable

```powershell
npm.cmd run verify:docs
npm.cmd run verify:protected
```

No se ejecutan NM/NG/NC porque son gates de capacidades futuras que CRI-52
prohíbe implementar. El cierre requiere el RFC, referencias exactas y la
frontera protegida intacta.
