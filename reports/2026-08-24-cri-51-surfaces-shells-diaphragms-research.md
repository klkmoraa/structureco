# CRI-51 — RFC de viabilidad para surfaces, plates, shells y diaphragms

**Fecha:** 2026-08-24
**Agente:** Codex
**Rama:** `codex/linear-queue-execution-20260824`
**SHA auditado:** `a0929a58845f2f346caf2ec87d1fe7c985ec88d2`
**Tipo:** investigación P3; no implementación

## Decisión ejecutiva

| Pregunta | Decisión |
|---|---|
| ¿Las capacidades actuales cubren elementos de superficie? | **No.** Los dominios 2D y Space 3D ensamblan elementos lineales entre dos nodos; no tienen caras, secciones de espesor, malla 2D ni resultantes de superficie. |
| ¿Plate, shell y diaphragm son una sola familia? | **No.** Plate modela flexión transversal; membrane modela acciones en el plano; shell combina ambas; rigid diaphragm es una restricción cinemática, no un elemento. |
| ¿Dónde vivirían? | **Sólo en un dominio espacial versionado**, nunca dentro del solver plano 2D. Un diaphragm de piso necesita geometría en planta y conectividad 3D que el modelo 2D no posee. |
| ¿Los 6 GDL de S3D-1 bastan? | **Son compatibles, no suficientes.** Faltan formulación, drilling stabilization, secciones, integración, cargas, malla, postproceso y sparse solve. |
| ¿Se abre iniciativa o prototipo ahora? | **No. Mantener fuera del alcance actual.** Space 3D aún tiene gates de producción pendientes y su matriz densa no escala a una malla de superficie útil. |
| ¿Qué podría reconsiderarse después? | Un **prototipo aislado de membrane/diaphragm semirrígido lineal**, sólo tras cerrar Space 3D R1–R6 y disponer de ensamblaje/solve sparse auditado. |

La oportunidad de producto es real, pero la decisión vigente es **mantener
plates, shells y diaphragms fuera de alcance**. No se crea iniciativa ni
prototipo en esta tarea. El primer experimento futuro, si se habilitan sus
precondiciones, debe validar superficie/malla y conexión frame–membrane antes
de intentar un shell general.

## Por qué no lo cubre StructureCo actual

| Evidencia | Ruta y líneas | Consecuencia |
|---|---|---|
| El solver 2D fija tres GDL por nudo: `Ux`, `Uy`, `Rz`. | `src/engine/solver.ts:1297-1302` | No existe desplazamiento transversal a una superficie en planta ni geometría 3D para un diaphragm. |
| `ProjectModel` 2D sólo contiene nodos, miembros lineales y cargas nodales/de barra. | `src/types.ts:204-217` | No hay loops de cara, holes, thickness, mesh, pressure ni surface section. |
| Space 3D sí fija `[ux,uy,uz,rx,ry,rz]` y una triada espacial. | `src/space3d/model/types.ts:1-19`, `src/space3d/model/types.ts:42-60` | Es la única base geométrica compatible con shells y frames compartiendo nudos. |
| El único elemento espacial persistente es `Space3DFrameMember` de dos nodos con `E,G,A,Iy,Iz,J`. | `src/space3d/model/types.ts:69-86` | Un surface section necesita al menos `E,ν,h`, orientación y constitutiva de plane stress. |
| `Space3DProjectV1` sólo almacena frame members y cargas nodales. | `src/space3d/model/types.ts:118-129` | No existe una migración compatible implícita a caras o presión. |
| Los resultados espaciales sólo tienen nodos y acciones de extremo de barras. | `src/space3d/model/types.ts:169-212` | Faltan fuerzas/momentos por unidad de longitud, stresses por cara/capa y puntos de integración. |
| El ensamblaje recorre únicamente frames 12×12 en una matriz densa. | `src/space3d/engine/solver.ts:31`, `src/space3d/engine/solver.ts:128-150` | Un shell Q4 sería 24×24 y una malla útil multiplicaría nudos/GDL muy por encima del límite actual. |
| S3D-1 limita 150 nudos/300 barras y publica 900 GDL como techo medido. | `src/space3d/model/types.ts:27-38`, `docs/architecture/structureco-space-3d-s3d1.md:93-104` | Una superficie no debe entrar hasta reemplazar la estrategia densa y medir un presupuesto propio. |
| La hoja de ruta actual excluye shells y placas. | `reports/2026-08-24-cri-46-space3d-roadmap.md:60-62`, `reports/2026-08-24-cri-46-space3d-roadmap.md:123-126` | CRI-51 puede investigar, no saltarse los gates ni ampliar S3D-1. |

En el documento canónico de Space 3D, “superficie propia” significa una
**superficie de interfaz**; no afirma elementos finitos de superficie. S3D-1
es un marco espacial Euler–Bernoulli 12×12, no un shell solver.

## Taxonomía obligatoria

### Membrane

- Resiste `Nxx`, `Nyy`, `Nxy` en su plano.
- No aporta rigidez de flexión fuera del plano.
- Es el candidato físico para un diaphragm semirrígido idealizado.
- Puede compartir traslaciones con frames, pero no transmite momentos fuera del
  plano sin otra idealización.

### Plate

- Resiste flexión transversal y twisting: `Mxx`, `Myy`, `Mxy`, además de
  cortantes `Qx`, `Qy` en Reissner–Mindlin.
- No representa por sí sola la acción membrane.
- Una plate delgada Kirchhoff y una plate thick/shear-deformable no son
  intercambiables.

### Shell

- Combina membrane + plate sobre una midsurface espacial.
- En un elemento convencional tiene tres traslaciones, dos rotations físicas de
  la normal y, para compatibilidad de seis GDL, una drilling rotation estabilizada.
- Puede ser plana, facetada o curvada; la geometría y normal local son parte del
  contrato, no sólo presentación.

### Diaphragm

- **Rigid diaphragm:** multi-point constraint; conserva tres movimientos rígidos
  en su plano —dos traslaciones y giro sobre la normal— y no produce stresses
  locales del diaphragm.
- **Semirigid diaphragm:** membrane/shell con rigidez en el plano y malla; sí
  distribuye deformación y fuerzas internas.
- **Flexible diaphragm:** clasificación/idealización de ingeniería, no un nuevo
  tipo algebraico automático.

La documentación oficial de
[OpenSees `rigidDiaphragm`](https://opensees.github.io/OpenSeesDocumentation/user/manual/model/mp_constraint/rigidDiaphragm.html)
lo define precisamente como un conjunto de constraints con pequeña rotación,
no como shell. StructureCo debe conservar esa separación en modelo, resultados
y copy.

## Alcance inicial futuro — sólo después de precondiciones

### S0 · constraint de diaphragm rígido

No necesita mesh, pero sí un sistema general de constraints espaciales
auditado. Contrato mínimo:

- plano por origen, normal unitaria y ejes locales;
- un retained/reference node o GDL maestros internos explícitos;
- lista de nodos secundarios coplanares dentro de tolerancia;
- relación cinemática derivada de sus coordenadas, no pares “equal DOF”;
- pequeñas rotaciones y solapes/conflictos bloqueados;
- reacciones/resultantes del constraint, sin stresses de diaphragm.

S0 no se implementa hasta que Space 3D soporte constraints multipunto fuera de
los apoyos directos de S3D-1.

### S1 · prototipo membrane/diaphragm semirrígido

Si se reabre la investigación, el menor slice coherente sería:

- estática lineal elástica isotrópica;
- cara plana cuadrilateral Q4, cuatro nodos counter-clockwise;
- plane stress con `E`, `ν`, thickness `h` y density opcional;
- respuesta sólo membrane; sin bending, transverse shear ni drilling stiffness;
- malla explícita pequeña, sin holes ni auto-meshing de producción;
- cargas nodales y traction/pressure **en el plano**;
- nodos compartidos con frames sólo para traslaciones;
- postproceso `Nxx`, `Nyy`, `Nxy`, strains/stresses en ejes locales;
- proyecto/protocolo de laboratorio aislado, nunca `Space3DProjectV1`.

Este slice valida identidad, orientación, integración, malla, coupling y
sparse assembly sin fingir que ya existe una plate o un shell.

### S2 · shell lineal general-purpose

Sólo después de S1:

- quadrilateral de cuatro nodos con kinematics Reissner–Mindlin/MITC4-like;
- seis GDL por nudo para conectar con Space 3D;
- membrane, bending/twisting y transverse shear;
- drilling stabilization explícita, versionada y sometida a sensibilidad;
- flat/warped geometry dentro de límites declarados;
- material isotrópico homogéneo y small strain/small rotation;
- triangles sólo como elemento separado y con benchmarks propios;
- sin composites, layers, plasticity, buckling, geometric nonlinearity ni
  contact en el primer shell slice.

[OpenSees ASDShellQ4](https://opensees.github.io/OpenSeesDocumentation/user/manual/model/elements/ASDShellQ4.html)
muestra por qué un “Q4 shell” no es una matriz obvia: combina membrane enhanced,
MITC4 para evitar shear locking, drilling stabilization, integración Gauss y
orientación local. Se usa aquí como evidencia de complejidad y futuro oráculo,
no como diseño para copiar a ciegas.

## Formulación mínima

### Membrane isotrópica plane stress

En ejes locales `(x,y)`:

```text
εm = [εx, εy, γxy]ᵀ
Nm = [Nxx, Nyy, Nxy]ᵀ = A εm

A = E h/(1-ν²) · [[1, ν, 0],
                   [ν, 1, 0],
                   [0, 0, (1-ν)/2]]
```

`Nxx`, `Nyy`, `Nxy` se reportan en kN/m. Para el elemento, `B_m` deriva de la
geometría isoparamétrica y:

```text
K_m = ∫Aₑ B_mᵀ A B_m dA
```

### Plate/shell Reissner–Mindlin

```text
κ  = [κx, κy, κxy]ᵀ
Mb = [Mxx, Myy, Mxy]ᵀ = D κ
D  = E h³/[12(1-ν²)] · isotropic_matrix

γs = [γxz, γyz]ᵀ
Qs = [Qx, Qy]ᵀ = S γs
S  = κs G h I
```

Los ocho resultants del shell son:

```text
[Nxx, Nyy, Nxy, Mxx, Myy, Mxy, Qx, Qy]
```

con unidades kN/m para `N,Q` y kN·m/m para `M`. Top/bottom stresses de un
material homogéneo pueden recuperarse de membrane ± bending, siempre
identificando cara, `z`, local axes y método de extrapolación.

La guía oficial de
[Abaqus sobre thin/thick shells](https://docs.software.vt.edu/abaqusv2025/English/SIMACAEGSARefMap/simagsa-c-shlform.htm)
distingue precisamente si transverse shear es despreciable o relevante. Un
ratio geométrico puede orientar, pero la selección debe verificarse; no se
convierte en una heurística silenciosa del producto.

### Drilling rotation

La rotación sobre la normal no tiene rigidez física en la teoría shell básica,
pero el nudo de Space 3D tiene seis GDL y los frames pueden transferir torsión o
momento. Una penalización mal calibrada puede:

- crear zero-energy modes si es insuficiente;
- sobre-rigidizar membrane/frame coupling si es excesiva;
- contaminar reacciones y modos;
- volver resultados dependientes de mesh/units.

El parámetro y su energía deben aparecer en diagnostics y en un estudio de
sensibilidad; no puede ser una constante mágica oculta.

## Modelo conceptual y malla

La geometría editable y el mesh de análisis necesitan identidades distintas:

```text
SurfaceRegion
├─ id, outerLoop, holes[]
├─ sectionId, localAxis, normalPolicy
└─ meshControlId

SurfaceMesh
├─ generator + version + sourceHash
├─ meshNodes[] { id, xyz, provenance }
├─ elements[] { id, surfaceId, type, nodeIds, orientation }
└─ boundaryEdges[] { id, sourceEdgeId, nodeIds }
```

- no se persiste un mesh regenerable sin generator/version/hash;
- un mesh importado sí conserva IDs y provenance como autoridad explícita;
- holes, openings, intersections y non-manifold edges se validan antes de
  reservar matrices;
- la normal sale del orden de nodos y debe visualizarse/revertirse de forma
  explícita;
- elementos con Jacobian no positivo se bloquean;
- aspect ratio, skew, warp, minimum angle y gradients se muestran como quality,
  pero ningún umbral único sustituye convergencia;
- refinamiento en supports, openings, point loads y frame connections es parte
  del caso, no sólo de la imagen.

Un solo polígono dibujado no es un elemento finito confiable. La UI futura debe
mostrar geometría, mesh y resultados como capas diferentes.

## Conexión con frames

### Nodo compartido

Un frame y un shell pueden usar el mismo `Space3DNode` de seis GDL. Aun así:

- la centerline del frame y la midsurface deben coincidir o declarar offset;
- la triada del frame y los local axes/normal del shell deben ser compatibles;
- el drilling DOF del shell no puede transmitir artificialmente torsión;
- una conexión puntual puede producir stress singular y distribución irreal.

### Conexión de borde

Una beam/slab connection real suele requerir que una línea de frame coincida
con múltiples mesh nodes. El modelo necesita:

- conforming edge o tie/MPC versionado;
- transfer de force/moment auditado por longitud;
- eccentricity/rigid offset explícito;
- no duplicar nudos coincidentes desconectados;
- no “soldar” automáticamente toda intersección visual.

### Transiciones

Cambios de mesh density, T-junctions y edge releases requieren tests propios.
Hasta entonces se bloquean. La auditoría mínima reconcilia fuerzas y momentos
globales, boundary resultants del surface y acciones de frame.

## Cargas y condiciones

| Carga/condición | Unidad | Primer soporte posible |
|---|---|---|
| Nodal force/moment | kN, kN·m | Compartida con nodos espaciales. |
| Surface traction global/local | kN/m² | Integración consistente sobre la cara. |
| Pressure normal | kN/m² | Signo ligado a la normal visible; small-rotation en slice lineal. |
| Edge line load | kN/m | Integración consistente y edge ID explícito. |
| Self-weight | kN/m² | `ρ h g`, una sola vez y con dirección global. |
| Prescribed displacement/rotation | m, rad | En nodos/edges con compatibilidad. |
| Thermal membrane/gradient | — | Fuera del primer slice. |
| Follower pressure | — | Fuera del lineal; requiere load stiffness/no linealidad. |
| Area mass/diaphragm inertia | kg/m² | Depende del contrato de masa de CRI-50; no inferir aquí. |

El pressure normal debe invertir signo al invertir la normal; los resultants
locales también cambian conforme a su convención documentada. Tests
metamórficos fijan esa transformación.

## Postproceso

### Shell/membrane

- desplazamientos/rotations nodales globales;
- strains y stress resultants en Gauss points y local axes;
- membrane `N`, bending `M`, transverse shear `Q`;
- top/bottom stresses por cara para sección homogénea;
- principal resultants/stresses con convención y ángulo local;
- nodal forces del elemento sólo para equilibrio, no como “stress en nodo”;
- energy por membrane/bending/shear/drilling;
- extrapolation/averaging como metadata.

No se promedian resultados a través de material, thickness, normal u
orientación discontinuos. Stress singular cerca de point supports/loads se
marca como no convergente hasta estudio de mesh.

### Diaphragm rígido

- desplazamiento/rotación de referencia;
- fuerzas del constraint y su distribución a nodos conectados;
- resultante y equilibrio;
- **sin** `N/M/Q`, stress, strain ni “capacidad del diaphragm”.

### Diaphragm semirrígido

- deformación in-plane, shear strain/resultant y distribución a frames;
- drift/relative displacement en probes explícitos;
- malla y convergencia visibles;
- sin clasificación automática de flexible/rigid ni diseño de collectors.

## Rendimiento y arquitectura numérica

Un Q4 shell sobre cuatro nodos espaciales tiene 24 GDL de elemento. El problema
global crece por mesh nodes, no por regiones dibujadas:

| Mesh regular | Nodos | GDL globales | Una densa `Float64` ideal |
|---|---:|---:|---:|
| 20×20 elementos | 441 | 2,646 | ≈53.4 MiB |
| 50×50 elementos | 2,601 | 15,606 | ≈1.81 GiB |

Esas cifras son sólo los valores crudos de **una** matriz; `number[][]`, copias,
factorización y traces consumen más. El cap actual es 900 GDL y 18.42 MiB
medidos para frames. Por tanto, son precondición:

- sparse matrix assembly sin `number[][]` global;
- solver sparse simétrico auditado y estrategia de constraints compatible;
- no materializar traces completas;
- worker cancelable con progreso y presupuesto antes de mesh generation;
- streaming de resultados por surface/probe;
- mesh/result caches por hash y version;
- benchmarks separados de generación, assembly, solve y postprocess;
- límites por GDL/nonzeros/memoria, no sólo número de faces.

No se autoriza reducir calidad del mesh para caber en el solver denso ni subir
el cap de Space 3D sin evidencia.

## Validación y oráculos independientes

| ID | Caso | Qué prueba | Gate propuesto |
|---|---|---|---|
| SF-01 | Membrane patch test | constant strain, plane stress, node ordering | stress/resultants analíticos a precisión de máquina. |
| SF-02 | Plate bending patch | constant curvature y zero-energy modes | exactitud y energía no negativa. |
| SF-03 | Rectangular plate simply-supported con pressure uniforme | bending y convergencia h/L | displacement/moments ≤1 % con mesh convergido. |
| SF-04 | Thick plate | transverse shear y ausencia de locking | solución cerrada/referencia ≤1 %. |
| SF-05 | NAFEMS LE6 skew plate | mesh distortion y principal stress | converge a 0.802 MPa en el punto/cara definidos. |
| SF-06 | Scordelis–Lo roof | membrane/bending shell action | displacement de referencia y convergencia. |
| SF-07 | Pinched cylinder with diaphragms | curved shell, rigid-body/membrane modes | referencia publicada y mesh study. |
| SF-08 | Hemispherical shell with hole | inextensional bending y locking | referencia publicada y orientation invariance. |
| SF-09 | Rigid diaphragm | MPC con offset y rotation | cinemática exacta, reacciones/equilibrio. |
| SF-10 | Semirigid diaphragm membrane | in-plane shear distribution | solución plane-stress y OpenSees. |
| SF-11 | Frame–shell shared edge | coupling y local/global axes | global equilibrium, energy y external solver. |
| SF-12 | Normal reversal/renumber/rigid rotation | signs e invariancia | transformaciones exactas de `N/M/Q`. |
| SF-13 | Distorted/warped/inverted elements | quality y fail-closed | no NaN; Jacobian inválido bloqueado. |
| SF-14 | Mesh refinement at point load/opening | singularity awareness | no falsa convergencia de peak stress. |

El benchmark oficial
[Abaqus/NAFEMS LE6](https://docs.software.vt.edu/abaqusv2024/English/SIMACAEBMKRefMap/simabmk-c-le6.htm)
publica geometría, material, meshes y el target de principal stress. Los
[patch tests de Abaqus](https://docs.software.vt.edu/abaqusv2024/English/SIMACAEVERRefMap/simaver-m-PatchTests-sb.htm)
aportan otra familia de referencia. OpenSees ASDShellQ4 y un segundo motor
versionado —Abaqus o CalculiX— deben compararse sin tratar ninguno como verdad
única.

Además se ejecutan:

- simetría de `K`, eigenvalues de energía y rigid body modes correctos;
- invariancia por unidades, traslación, rotación y renumeración;
- equilibrium global y boundary resultants por surface;
- estudios thickness/span, element aspect/skew/warp y regular/irregular mesh;
- sensitivity a drilling stabilization;
- guardas de mutación de signos, local axes, `ν`, thickness e integración.

## UX futura

No debe existir un botón genérico “Plate/Shell”. El flujo mínimo sería:

```text
Definir región
→ elegir membrane/plate/shell + sección/espesor
→ confirmar normal y eje local
→ definir openings/conexiones/cargas
→ previsualizar mesh y quality
→ confirmar generación
→ validar
→ analizar
→ revisar resultants por cara/capa y convergencia
```

Requisitos:

- selección explícita de `surface`, `meshElement`, `edge` y `meshNode` sin
  confundirlos con geometry vertices;
- normals/local axes visibles y reversibles;
- mesh overlay, quality heatmap y legend;
- top/bottom/local/global controls persistentes en resultados;
- probe por Gauss point/element, sin fingir precisión nodal;
- reportes de disconnected edges, duplicate nodes, inverted elements y ties;
- generación/cancelación con progreso antes de reservar memoria;
- mobile sólo para inspección/edición simple hasta validar una interacción de
  mesh completa; no comprimir todo en el Inspector existente.

## Migración y compatibilidad

`Space3DProjectV1` permanece inmutable. Una futura expansión necesitaría V2 o
un dominio experimental separado, por ejemplo:

```text
Space3DProjectV2
├─ nodes[], frameMembers[]                 (V1 preservado)
├─ surfaceRegions[], surfaceSections[]
├─ meshControls[], explicitMeshes[]?
├─ multipointConstraints[]
├─ nodalLoads[], surfaceLoads[], edgeLoads[]
└─ loadCases[], loadCombinations[]
```

Reglas:

1. migración V1→V2 sólo agrega arrays vacíos; no infiere slabs de loops cerrados;
2. el puente 2D→3D nunca inventa surfaces, thickness, ν, normal, mesh o diaphragm;
3. IDs de frames/nodes existentes se preservan sin remap;
4. mesh regenerable lleva generator/version/hash; mesh importado conserva sus
   IDs y provenance;
5. archivos V2 no se degradan a V1 silenciosamente;
6. ProjectModel 2D no recibe campos de surfaces;
7. worker/protocol/result versionan por separado y fallan ante campos desconocidos;
8. undo/redo actúa sobre geometría/mesh controls, no sobre millones de valores
   de resultado.

## Gates para reconsiderar el alcance

| Gate | Condición |
|---|---|
| S0 · producto | Caso de uso y decisión membrane/plate/shell/diaphragm aprobados; sin botón genérico. |
| S1 · Space 3D | Gates R1–R6 de la hoja de ruta cerrados y S3D-1 promovible en su subconjunto. |
| S2 · numérico | Sparse assembly/solve, constraints y presupuesto por nonzeros/GDL verificados en browser. |
| S3 · membrane | SF-01, SF-09, SF-10, SF-11, SF-12 y SF-13 verdes en prototipo aislado. |
| S4 · shell | Formulación, drilling, locking, integration y local axes revisados; SF-02…SF-08 verdes. |
| S5 · mesh | Geometry/mesh identity, quality, deterministic generation, holes y convergence aprobados. |
| S6 · loads/results | Pressure/traction/edge loads y `N/M/Q` con equilibrium, units y provenance. |
| S7 · migration/UX | Codec V2, no-inference bridge, worker, undo/redo, a11y y mobile inspection validados. |
| S8 · revisión | Revisión estructural independiente y corpus de dos motores externos firmado. |

Sólo después de S0–S3 tendría sentido abrir un prototipo membrane/diaphragm.
Una iniciativa de shell requiere además S4–S8. Ningún gate se satisface por el
hecho de que Space 3D ya tenga seis GDL.

## Riesgos abiertos

1. **Shear/membrane locking:** una formulación aparente puede converger al valor
   incorrecto al adelgazar o distorsionar mesh.
2. **Hourglass/zero-energy modes:** reduced integration exige stabilization y
   energy tracking.
3. **Drilling stiffness artificial:** puede contaminar frame coupling.
4. **Normals/signos:** cambiar node order altera caras y local resultants.
5. **Stress singularities:** point supports/loads y re-entrant corners no tienen
   un peak mesh-independent.
6. **Mesh explosion:** el solver denso actual no soporta densidad útil.
7. **Frame/shell eccentricity:** coincidir visualmente no define transfer real.
8. **Diaphragm confusion:** rigid constraint no entrega stress ni capacity.
9. **Schema inflation:** mezclar surfaces en ProjectModel 2D rompería el límite
   que mantiene separados ambos productos.
10. **Falsa madurez:** un patch test es necesario, nunca suficiente.

## Cierre

**Decisión: mantener plates, shells y diaphragms fuera del alcance actual.** No
se crea prototipo ni iniciativa hoy. La opción más pequeña para una futura
reapertura es un laboratorio membrane/diaphragm semirrígido, después de la
madurez de Space 3D y de un kernel sparse; un shell general requiere una fase
posterior y oráculos mucho más amplios.

Esto no descarta la familia. Evita introducir en el producto una superficie
que sólo se vea como shell, pero no tenga malla, locking control, coupling,
resultants o convergencia defendibles.

## Archivos tocados

- `reports/2026-08-24-cri-51-surfaces-shells-diaphragms-research.md` — este
  RFC/informe.

## Qué no se implementó

No se modificaron `ProjectModel`, `Space3DProjectV1`, solver 2D/3D, elementos,
matrices, workers, protocolos, persistencia, import/export, resultados, UI,
mesh, dependencias ni tests funcionales. No se agregó ningún botón, tipo de
surface, diaphragm constraint ni migración.

## Verificación aplicable

```powershell
npm.cmd run verify:docs
npm.cmd run verify:protected
```

No se ejecuta el corpus SF-01…SF-14 porque son gates de una capacidad futura
que esta issue prohíbe implementar. El cierre requiere el RFC, referencias
exactas y fronteras protegidas intactas.
