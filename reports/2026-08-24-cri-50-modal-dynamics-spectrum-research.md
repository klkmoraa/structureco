# CRI-50 — RFC de viabilidad para modal, dinámica y espectro

**Fecha:** 2026-08-24
**Agente:** Codex
**Rama:** `codex/linear-queue-execution-20260824`
**SHA auditado:** `ddca324069833d3e3d4c33929a4cf92d5163f0ae`
**Tipo:** investigación P3; no implementación

## Decisión ejecutiva

| Capacidad | Viabilidad | Decisión |
|---|---|---|
| Modal elástico 2D | **Positiva con precondiciones.** `K` existe, pero faltan fuente de masa, matriz `M`, constraints modales y eigensolver. | Primera capacidad candidata, sólo después de aprobar un contrato de masa y un spike aislado. |
| Historia temporal lineal | **Positiva, posterior a modal.** Requiere `M`, `C`, integrador, series con unidades, base excitation, control de paso y almacenamiento. | Mantener en investigación; no iniciar antes de validar modal y amortiguamiento. |
| Espectro de respuesta modal | **Positiva, posterior a modal.** Requiere participación modal, espectro versionado, combinación modal y semántica de picos sin signo/fase. | Mantener en investigación; no tratar como una combinación estática ni como diseño normativo. |
| Dinámica no lineal | **Fuera de este RFC.** | Capacidad futura independiente; no inferirla de un integrador lineal. |
| Dinámica/torción de edificio 3D | **Fuera de alcance.** Space 3D sigue experimental y no hay diaphragms ni fuente de masa 3D. | No anunciar uso sísmico integral del edificio desde el modelo 2D. |

**Recomendación:** conservar CRI-50 como investigación cerrada y no crear aún
issues de implementación. La secuencia obligatoria es `masa → modal → dinámica
lineal → espectro`, con promoción independiente por etapa. Un botón común de
“Dinámica” ocultaría diferencias físicas, datos y evidencia que deben quedar
separadas.

## Evidencia del repositorio actual

| Evidencia | Ruta y líneas | Implicación |
|---|---|---|
| `NodeModel` contiene geometría y apoyo, pero no masa traslacional ni rotacional. | `src/types.ts:47-54` | No puede definirse una fuente de inercia completa. |
| `MemberModel.density` es opcional y usa kg/m³. | `src/types.ts:64-83` | Sólo ofrece masa propia potencial de barras; no representa losas, fachada, equipos ni masa tributaria. |
| `LoadCase.selfWeightFactor` pertenece al contrato estático. | `src/types.ts:109-117` | Peso gravitatorio y masa inercial no son la misma selección de datos. |
| `ProjectModel` no contiene mass source, damping, histories ni spectra. | `src/types.ts:204-220` | Cualquier capacidad exigiría antes un RFC de datos/versionado; esta tarea prohíbe añadirlo. |
| Los modos de análisis persistentes sólo son primer orden y P-Delta. | `src/types.ts:196-201` | Modal/dinámica no existen como ruta escondida. |
| La densidad se convierte en una carga de peso `ρgA` para el solve estático. | `src/engine/solver.ts:863-877` | Ese cálculo no ensambla una matriz de masa. |
| El ensamblaje central crea sólo `K` y `F`. | `src/engine/solver.ts:1301-1302` | No existe `M` ni `C`. |
| El solve actual es un sistema lineal KKT equilibrado. | `src/engine/solver.ts:1528-1561` | Reutilizar el factorization ayuda a futuro, pero no resuelve eigenvalues ni tiempo. |
| El kernel numérico público sólo resuelve sistemas lineales. | `src/engine/math.ts:586-712`, `package.json:45-63` | Falta elegir un eigensolver y no hay dependencia autorizada. |
| Space 3D declara modal y dinámica fuera de alcance. | `reports/2026-08-24-cri-23-space3d-madurez.md:27-30`, `reports/2026-08-24-cri-46-space3d-roadmap.md:60-63` | Este RFC no puede ampliar indirectamente S3D-1. |

El campo `density` es útil, pero **no constituye una fuente de masa**. Inferir
automáticamente masa desde todas las cargas permanentes mezclaría peso e
inercia, duplicaría masa propia y atribuiría distribución espacial ausente. La
primera decisión de dominio debe ser explícita y auditable.

## Casos de uso y usuarios

### Modal

1. Periodos y frecuencias naturales de pórticos/vigas 2D elásticos.
2. Formas modales normalizadas para docencia y diagnóstico.
3. Participación y masa modal efectiva por dirección global.
4. Detección de modos rígidos o masa desconectada.
5. Base común, validada, para historia temporal y espectro futuros.

### Historia temporal lineal

1. Respuesta firmada frente a fuerza nodal variable en el tiempo.
2. Respuesta relativa frente a aceleración uniforme de base.
3. Curvas `u(t)`, `v(t)`, `a(t)`, reacciones y acciones internas.
4. Comparación directa contra soluciones SDOF/MDOF y registros didácticos.
5. Envolventes y tiempo del pico, sin pretender material no lineal.

### Espectro de respuesta

1. Estimar picos elásticos modales para un espectro y damping definidos.
2. Mostrar participación, masa acumulada y sensibilidad al número de modos.
3. Comparar alternativas con la misma fuente, edición, dirección y unidades.
4. Enseñar por qué SRSS/CQC producen magnitudes máximas sin simultaneidad.

### Usos que deben bloquearse

- diseño sísmico normativo sin jurisdicción, edición, sitio y módulo normativo;
- torsión accidental, dos direcciones horizontales o edificio 3D desde un plano;
- diafragma rígido/flexible, interacción suelo–estructura o múltiples apoyos;
- historia no lineal, yielding, gaps, isolators o colapso;
- convertir una carga estática en masa sin selección/provenance;
- sumar con signo un pico espectral a una combinación estática;
- presentar una única acelerografía como demanda representativa del sitio;
- interpretar una forma modal normalizada como deformación real.

## Contrato de masa — precondición M0

### Fuente propuesta

Una futura `MassSource` debe ser separada de `LoadCombination` y declarar:

```ts
interface MassSourceDraft {
  id: string;
  name: string;
  memberSelfMass: boolean;
  nodalMasses: Array<{
    nodeId: string;
    mx: number;
    my: number;
    mrz?: number;
  }>;
  loadContributions: Array<{
    caseId: string;
    factor: number;
    distribution: 'nodal-only';
  }>;
  gravity: 9.80665;
  assumptions: string[];
}
```

Este objeto es sólo una propuesta del RFC; **no se agregó al código**.

- `memberSelfMass` usa `density × A × L` una sola vez.
- masas nodales representan componentes tributarios que no viven como barras.
- una contribución de carga sólo puede convertir cargas nodales verticales
  identificadas; cargas de barra, momentos, temperatura y asentamientos quedan
  fuera del primer slice.
- el producto muestra masa total por fuente, masa libre por dirección y objetos
  sin densidad.
- masa negativa, NaN o masa en un GDL sin rigidez se bloquea.
- masa cero no significa “ignorar dinámica”: invalida el problema.

### Unidades internas

El motor estático usa kN, m y s implícito. Para compatibilidad dimensional:

```text
1 kg = 0.001 kN·s²/m
m_member = ρ A L / 1000        [kN·s²/m]
m_from_weight = W / g          [kN·s²/m]
```

La UI puede recibir kg o t, pero el hash y los resultados deben registrar la
unidad original y la conversión. `g = 9.80665 m/s²` sólo se usa al convertir un
peso explícitamente elegido; no se usa para densidad, que ya es masa/volumen.

### Matriz de masa

El primer slice debería ensamblar **masa consistente** del frame
Euler–Bernoulli, incluyendo axial y flexión, más masa nodal explícita. La masa
lumped puede existir después como estrategia versionada, nunca como cambio
silencioso. Se excluyen inicialmente:

- Timoshenko hasta validar rotary inertia y shear deformation;
- rigid offsets, releases, internal hinges y constraints multipunto;
- masa de rigid links, springs, trusses con masa transversal no derivada y
  cualquier matriz singular no clasificada;
- conversión automática de self-weight o de combinaciones normativas.

## Formulación modal

Con restricciones incrementales homogéneas `Cφ=0`, una base `Z` del subespacio
admisible produce:

```text
K_r = Zᵀ K Z
M_r = Zᵀ M Z
K_r ψ_i = ω_i² M_r ψ_i
φ_i = Z ψ_i
```

Para cada modo físico:

```text
ω_i = sqrt(λ_i)                 [rad/s]
f_i = ω_i / (2π)               [Hz]
T_i = 2π / ω_i                 [s]
φ_iᵀ M φ_j = δ_ij              normalización de masa
Γ_i,d = (φ_iᵀ M r_d) / (φ_iᵀ M φ_i)
M_eff,i,d = (φ_iᵀ M r_d)² / (φ_iᵀ M φ_i)
```

`r_d` selecciona la traslación rígida de la dirección `d`. Frecuencias cero o
negativas se clasifican como modos rígidos, mecanismos o errores de masa; no se
ordenan junto a modos vibratorios. Los eigenvectors de un cluster repetido no
tienen identidad individual estable: se compara el subespacio.

La documentación oficial de
[OpenSees `modalProperties`](https://opensees.github.io/OpenSeesDocumentation/user/manual/analysis/modalProperties.html)
confirma la dependencia directa de `M`, distingue mass-normalization de
displacement-normalization y calcula participación/masa efectiva desde masas
nodales y distribuidas. Ese es el nivel mínimo de provenance que StructureCo
debe igualar antes de mostrar un periodo.

## Formulación de historia temporal lineal

### Fuerza aplicada

```text
M ü(t) + C u̇(t) + K u(t) = p(t)
```

### Excitación uniforme de base

```text
M ü_rel(t) + C u̇_rel(t) + K u_rel(t) = -M r a_g(t)
u_abs = u_rel + r u_g
```

El resultado debe distinguir siempre respuesta relativa y absoluta. La guía de
[Uniform Excitation de OpenSees](https://opensees.github.io/OpenSeesDocumentation/user/manual/model/pattern/uniformExcitationPattern.html)
expone la misma ecuación y advierte que las respuestas nodales de ese patrón
son relativas.

### Integración propuesta

El primer candidato es Newmark average acceleration:

```text
γ = 1/2
β = 1/4
K_eff = K + γ/(βΔt) C + 1/(βΔt²) M
```

Es incondicionalmente estable para el sistema lineal ideal, pero estabilidad
no garantiza exactitud. Se requieren convergencia al reducir `Δt`, resolución
de la frecuencia máxima retenida y respeto al muestreo del registro. La
documentación oficial de
[Newmark en OpenSees](https://opensees.github.io/OpenSeesDocumentation/user/manual/analysis/integrator/Newmark.html)
documenta las ecuaciones, los parámetros y la diferencia entre exactitud de
segundo orden y damping numérico.

Cada corrida necesita:

- `dt` original, `dt` de integración y política de resampling explícitos;
- unidades de tiempo y aceleración/fuerza;
- baseline correction/filtering como provenance externo, no una caja negra;
- escala, dirección, hash SHA-256 y fuente del registro;
- estado inicial `u₀`, `v₀` y compatibilidad de `a₀`;
- cancelación real, progreso y presupuesto de muestras;
- energía cinética, deformación, damping y trabajo externo como auditoría.

## Amortiguamiento

### Modal

Para superposición modal lineal, cada modo puede usar `ξ_i`. El default de
investigación no debe inventar 5 %: el usuario o la fuente espectral lo declara.
Un único porcentaje sólo es válido si el contrato dice que aplica a todos los
modos retenidos.

### Rayleigh

```text
C = α M + β K
ξ(ω) = α/(2ω) + βω/2
```

`α` y `β` se derivan de dos frecuencias objetivo y dos ratios declarados. La UI
futura debe graficar `ξ(ω)` en el rango modal para mostrar sobreamortiguamiento
fuera de los puntos de ajuste. No se permite que “5 % Rayleigh” sea un valor
opaco.

[OpenSees](https://opensees.github.io/OpenSeesDocumentation/user/manual/model/damping/rayleigh.html)
distingue masa, rigidez actual, inicial y committed en su matriz de Rayleigh y
advierte riesgos en análisis no lineal. El primer slice de StructureCo sería
lineal y usaría únicamente la `K` inicial; dinámica no lineal sigue fuera.

### Espectro

El damping es metadata del espectro. No se aplica además una matriz `C`. Si la
curva es de 5 % y el modelo solicita otra razón, el análisis se bloquea salvo
que la fuente defina una transformación explícita y versionada.

## Espectro de respuesta modal

Una entrada mínima contiene pares `(T, S_a)`, unidad de `S_a`, damping,
dirección, fuente, jurisdicción/edición cuando aplique, interpolación y hash.
No se extrapola fuera del rango tabulado. La interpolación debe venir de la
fuente o quedar seleccionada/versionada (`linear-T` o `log-log`).

Para cada modo `i`:

```text
q_i,max = Γ_i S_a(T_i) / ω_i²
u_i,max = φ_i q_i,max
```

La formulación coincide con el comando oficial
[Response Spectrum Analysis de OpenSees](https://opensees.github.io/OpenSeesDocumentation/user/manual/analysis/responseSpectrumAnalysis.html),
que exige eigenvalues y propiedades modales antes de evaluar el espectro.

Cada respuesta escalar —desplazamiento, reacción o acción de miembro— se
recupera por modo y después se combina:

- **SRSS** sólo para modos suficientemente separados dentro del contrato;
- **CQC** para modos cercanos, con fórmula, damping y tolerancias versionadas;
- suma algebraica de vectores modales: prohibida;
- signo del resultado combinado: no disponible;
- tiempo del pico: no disponible;
- equilibrio de un estado instantáneo: no aplicable.

La masa modal acumulada se reporta por dirección. Un umbral como 90 % puede ser
un warning de cobertura, pero **no una declaración universal de cumplimiento**:
la norma/jurisdicción elegida gobierna modos mínimos, combinación, escalado y
direcciones. La literatura pública de FEMA/NIST documenta SRSS/CQC y cobertura
modal en contextos normativos concretos; StructureCo no debe generalizar esos
valores fuera de la fuente seleccionada.

## Combinaciones y escenarios

| Resultado | Combinación admisible | Regla |
|---|---|---|
| Modal | No usa load combination en el slice inicial. | Depende sólo de `K`, `M`, constraints y mass source. |
| Historia por fuerza | Series temporales simultáneas con factor y unidad. | Conserva signo y tiempo; superposición sólo dentro del sistema lineal. |
| Historia por base | Una dirección uniforme 2D en el primer slice. | Respuesta relativa/absoluta explícita; múltiples apoyos fuera. |
| Espectro | Modos de una dirección con SRSS/CQC. | Los picos modales no son simultáneos ni firmados. |
| Estático + espectro | No usar `LoadCombination.factors`. | Requiere regla normativa separada sobre magnitudes/envelopes. |
| Dos direcciones sísmicas | Fuera del 2D inicial. | No inventar 100/30, SRSS direccional ni torsión accidental. |

Un `ResponseSpectrumResult` no puede entrar al pipeline de diagramas como si
fuera un `AnalysisResult` estático: reacciones y fuerzas combinadas son
magnitudes pico y no forman un único estado equilibrado con signo. El módulo
normativo, si algún día las consume, debe conocer edición y regla de combinación.

## Estrategia de resultados futura

Tres objetos separados, todos efímeros y con hashes:

```text
ModalResult
├─ massSourceHash, K/M strategy, constraints hash
├─ ω, f, T, φ por modo
└─ participación, masa efectiva, residuos y clusters

TimeHistoryResult
├─ history hash, units, dt, scale, direction
├─ integrator + damping + initial state
├─ series seleccionadas y envelopes con tiempo del pico
└─ energía, residuos, convergencia y truncamiento

ResponseSpectrumResult
├─ spectrum hash/source/damping/interpolation
├─ modalResultHash y modos retenidos
├─ respuestas por modo
└─ combinación SRSS/CQC, cobertura modal y magnitudes sin signo
```

Ninguno muta `ProjectModel`, sustituye `AnalysisResult` ni alimenta
automáticamente diseño. El resultado queda stale ante cualquier cambio de
geometría, apoyo, E/A/I, mass source, damping, history, spectrum, units o
algoritmo. Para series largas, el worker transmite progreso y conserva
envelopes/probes; no clona matrices ni todas las muestras hacia React.

## Copy seguro

### Modal

> Periodos y formas naturales del modelo elástico idealizado con la fuente de
> masa indicada. Las formas están normalizadas y no son desplazamientos reales.

### Historia temporal

> Respuesta lineal al registro seleccionado. Los resultados dependen de sus
> unidades, escala, dirección, damping, paso y condiciones iniciales; no
> representan por sí solos la demanda de diseño del sitio.

### Espectro

> Estimación de picos modales para este espectro y damping. Los picos combinados
> no ocurren necesariamente al mismo tiempo y no conservan signo.

### Advertencia común

> Capacidad de investigación. No verifica una norma, no incluye comportamiento
> no lineal y no sustituye selección de registros, espectro de sitio ni revisión
> profesional.

Copy prohibido sin módulo normativo explícito: “cortante de diseño”, “demanda
sísmica aprobada”, “cumple”, “seguro”, “respuesta real del edificio” o “carga
equivalente” sin calificación.

## Benchmarks y oráculos independientes

### Modal

| ID | Caso | Oráculo | Gate |
|---|---|---|---|
| MD-01 | SDOF `k-m` | `ω=sqrt(k/m)` | frecuencia y periodo ≤`1e-10` relativo. |
| MD-02 | 2DOF shear model | eigenvalues/vectors cerrados | dos frecuencias ≤`1e-8`; ortogonalidad en `M`. |
| MD-03 | Viga uniforme simply-supported | `ω_n=n²π² sqrt(EI/(ρAL⁴))` | primeros 3 modos convergen ≤0.5 %. |
| MD-04 | Voladizo uniforme | raíces `1.875104…`, `4.694091…` | primeros 2 modos ≤0.5 % con malla convergida. |
| MD-05 | Invariancia por unidades/traslación/rotación | transformación analítica | frecuencias invariantes; modos transformables. |
| MD-06 | Pórtico 2D con masa nodal y distribuida | OpenSees versionado | frecuencias, masa efectiva y clusters ≤1 %. |
| MD-07 | Mecanismo, masa cero y GDL masivo sin rigidez | clasificación independiente | fail-closed; ningún Hz ficticio. |

### Historia temporal

| ID | Caso | Oráculo | Gate |
|---|---|---|---|
| TH-01 | vibración libre SDOF sin damping | solución sinusoidal | amplitud/fase convergen; deriva de energía acotada. |
| TH-02 | vibración libre amortiguada | solución exponencial cerrada | envelope y frecuencia amortiguada ≤0.25 %. |
| TH-03 | fuerza armónica SDOF | respuesta estacionaria cerrada | amplitud/fase ≤0.5 % fuera y cerca de resonancia. |
| TH-04 | pulso/base acceleration SDOF | integral de Duhamel independiente | historia relativa, pico y tiempo ≤0.5 %. |
| TH-05 | MDOF 2D | Newmark de OpenSees versionado | probes y envelopes ≤1 % con mismo `dt`/damping. |
| TH-06 | convergencia `dt`, escala y unidades | refinamiento/metamórfico | orden esperado; escala lineal exacta. |
| TH-07 | registro truncado/corrupto/cancelación | contrato de I/O | fail-closed o cancelado, sin resultado parcial usable. |

### Espectro

| ID | Caso | Oráculo | Gate |
|---|---|---|---|
| RS-01 | SDOF en periodo tabulado | `Sd=Sa/ω²` | desplazamiento exacto e interpolación nula. |
| RS-02 | 2DOF con modos separados | cálculo manual SRSS | cada respuesta ≤`1e-8`. |
| RS-03 | 2DOF con modos cercanos | CQC independiente | correlación y combinación ≤`1e-6`. |
| RS-04 | espectro generado de una historia SDOF | integración independiente | pico espectral reproduce historia dentro de discretización. |
| RS-05 | truncamiento modal | suma de masa efectiva | warning determinista y convergencia al agregar modos. |
| RS-06 | damping/rango/unidades incompatibles | validación de input | bloqueado, sin extrapolación silenciosa. |
| RS-07 | pórtico 2D | OpenSees `responseSpectrumAnalysis` | respuestas por modo y combinadas ≤1 %. |

El corpus externo debe guardar input, versión, outputs crudos, unidades y
SHA-256. Las fórmulas cerradas viven fuera del kernel. OpenSees se usa como
oráculo independiente, no como definición de verdad única.

Para uso sísmico real, la selección/escalado de registros es otra capa. La
guía pública de
[NIST sobre selección y escalado](https://www.nist.gov/publications/selecting-and-scaling-earthquake-ground-motions-performing-response-history-analyses)
muestra que magnitud, distancia, sitio, directividad y espectro objetivo forman
parte de la decisión profesional; subir un archivo no satisface ese contrato.

## Gates de promoción

| Gate | Condición |
|---|---|
| D0 · masa | `MassSource` y unidades aprobados; inventario y no duplicación demostrados. |
| D1 · modal kernel | `K/M`, constraints, normalización, clusters y eigensolver revisados; licencia/dependencia autorizada. |
| D2 · modal validation | MD-01…MD-07 verdes y revisión estructural independiente. Sólo entonces se puede abrir una issue de modal. |
| D3 · damping/time | `C`, Newmark, energía, `dt`, base excitation e I/O congelados; TH-01…TH-07 verdes. |
| D4 · spectrum | Fuente, units, damping, interpolation, participation y SRSS/CQC congelados; RS-01…RS-07 verdes. |
| D5 · performance | Worker cancelable, límites de memoria/muestras/modos y benchmark portable sin bloquear UI. |
| D6 · results | Objetos separados, stale hashes, copy seguro, export y accesibilidad cubiertos. |
| D7 · normative boundary | Ningún resultado se presenta como diseño; toda regla jurisdiccional vive en módulo versionado aparte. |

Promoción secuencial:

```text
D0 + D1 + D2  → issue futura de Modal 2D
Modal validado + D3 + D5 + D6 → issue futura de Historia temporal lineal
Modal validado + D4 + D5 + D6 + D7 → issue futura de Espectro
```

## Riesgos abiertos

1. **Masa falsa o duplicada:** `density`, peso propio y cargas permanentes pueden
   representar el mismo componente.
2. **Matriz singular:** lumping sin masa rotacional y constraints generales
   pueden producir eigenvalues infinitos/espurios.
3. **Alta frecuencia:** una malla suficiente para estática puede ser insuficiente
   para modos o para un paso temporal dado.
4. **Damping opaco:** Rayleigh puede sobreamortiguar fuera de sus dos puntos.
5. **Registro sin provenance:** unidades g/m/s², baseline, filtering y escala
   cambian materialmente la respuesta.
6. **Volumen de resultados:** `nDOF × nSteps` no debe copiarse íntegro a la UI.
7. **Picos espectrales:** perder signo/fase impide tratarlos como un estado
   estático equilibrado.
8. **Falsa cobertura de edificio:** 2D no cubre torsión, diaphragms, dos
   direcciones ni interacción entre marcos.
9. **Norma cambiante:** espectros, factores y combinaciones requieren fuente,
   jurisdicción y edición separadas del solver.

## Cierre

**Modal, historia temporal lineal y espectro son viables como tres capacidades
separadas, pero ninguna está lista para implementación.** El primer cuello de
botella no es la interfaz ni el integrador: es un contrato de masa físicamente
auditable. Después, modal debe demostrar `Kφ=ω²Mφ`, participación y malla antes
de que dinámica o espectro puedan consumirlo.

Se mantiene investigación y no se abren nuevas issues hoy. Abrirlas antes de
D0–D2 convertiría una hipótesis en backlog ejecutable sin los datos mínimos.

## Archivos tocados

- `reports/2026-08-24-cri-50-modal-dynamics-spectrum-research.md` — este
  RFC/informe.

## Qué no se implementó

No se agregaron botones, tipos, mass source, matriz `M`, damping, eigensolver,
integrador, series temporales, espectros, workers, persistencia, import/export,
resultados ni dependencias. No se modificó solver 2D, Space 3D ni módulo
normativo.

## Verificación aplicable

```powershell
npm.cmd run verify:docs
npm.cmd run verify:protected
```

No se ejecutan benchmarks funcionales MD/TH/RS porque son gates de una capacidad
futura que esta issue no autoriza implementar. La evidencia de cierre es el RFC,
la exactitud de sus referencias y la frontera protegida intacta.
