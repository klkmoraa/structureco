# CRI-24 — madurez, límites y promoción de P-Delta 2D

**Fecha:** 2026-08-24 11:12 CST
**Agente:** Codex
**Rama:** `codex/linear-queue-execution-20260824`
**SHA auditado:** `f21cc35f8a089fc1d6b2389204e092a010bc79be`

## Qué cambió

Se auditó la capacidad P-Delta 2D existente sin modificar ecuaciones ni solver.
El informe inventaría entradas, salidas, estados de error, casos validados,
hipótesis, cobertura de interfaz y gates de promoción. No apareció un defecto
funcional reproducible; las ausencias encontradas quedan como límites y gates,
no como aprobación implícita.

## Contrato implementado

| Área | Estado actual |
|---|---|
| Activación | Opt-in por proyecto: `settings.analysisMode = 'p-delta'`; ausencia o `first-order` conserva exactamente el análisis lineal. |
| Configuración | Defaults: 12 pasos, 30 iteraciones/paso, tolerancias axial y de desplazamiento `1e-6`, reducción `0.5`, paso mínimo `1/64`. Caps internos: 200 pasos, 500 iteraciones/paso y 10,000 solves combinados. |
| Cargas y combinaciones | El target seleccionado se resuelve con `selectedFactors`; factores de cargas nodales/de barra, peso propio, efectos iniciales y desplazamientos prescritos ligados a casos escalan con `lambda`. Un `support.prescribed` absoluto permanece condición de frontera y no escala. |
| Elementos | Sólo miembros `frame` aportan fuerza axial a la rigidez geométrica. Trusses, vínculos y resortes siguen en el análisis lineal base, pero no reciben una formulación geométrica propia. |
| Iteración | Aproximaciones sucesivas sobre la fuerza axial promedio de los dos extremos, constante por elemento. Se intenta `lambda=1`; al fallar se reduce el paso. Cada corrida fuerza LU denso para aislarla del backend sparse experimental. |
| Convergencia | Exige al menos dos iteraciones, cambio axial relativo y cambio de desplazamiento relativo dentro de tolerancia, y residual lineal finito. El residual del sistema lineal congelado se reporta pero no se usa como falsa condición no lineal. |
| Estabilidad | Rechaza falla del solve, inversión postcrítica del GDL más afectado y divergencia creciente. Estima `lambda_cr = B2/(B2-1)` sólo si la amplificación es significativa; avisa desde `lambda_cr <= 1.25`. No calcula eigenvalues. |
| Resultado | Publica `experimental: true`, convergencia, pasos/iteraciones, cambios finales, residual, historia compacta, fuerzas axiales, amplificación, factor crítico estimado, warning/failure y backend lineal. |
| Persistencia/exportación | Modo y configuración viven en ProjectModel; cambiarlos invalida un resultado previo. El expediente portable marca `analysisMode` y `pDeltaExperimental`; la portada PDF declara P-Delta experimental. |

## Matriz de casos

| Caso | Cobertura | Evidencia / límite |
|---|---|---|
| Sin fuerza axial | **Validado** | Coincide con primer orden y no inventa factor crítico. |
| Compresión `0.1 Pcr`, `0.5 Pcr`, `0.9–0.95 Pcr` | **Validado contra formas cerradas** | Amplificación, warning, discretización y estimación crítica cubiertas. Cerca de crítica un elemento por miembro subestima flecha aproximadamente 5.6 % y sobrestima la crítica aproximadamente 0.75 %. |
| Tensión axial | **Validado** | No se trata como pandeo y no activa warning crítico. |
| Voladizo con carga lateral/axial y con momento de punta | **Validado** | Comparación con solución cerrada y equilibrio/reacciones. |
| Pórtico plano con gravedad y carga lateral | **Validado localmente** | Una crujía y un pórtico de 10 niveles; el presupuesto exige menos de 15× primer orden, no una latencia absoluta portable. |
| Miembro inclinado / modelo trasladado | **Validado** | Invariancia por rotación y traslación. |
| Asentamiento prescrito absoluto | **Validado** | Converge, no escala el asentamiento y no depende del stepping final. |
| Estado sobre `Pcr` / iteración divergente | **Validado como rechazo** | No devuelve un resultado utilizable postcrítico; publica motivo accionable. |
| Modelo sin frames | **Validado como primer orden efectivo** | No relaja checks de equilibrio bajo una etiqueta P-Delta cuando la rigidez geométrica es nula. |
| Combinaciones multicaso P-Delta | **Implementado por la ruta compartida, no benchmarkeado de forma dedicada** | Falta una matriz que pruebe factores positivos/negativos, self-weight y múltiples patrones con referencia independiente. |
| Cargas de barra, initial effects y self-weight en P-Delta | **Parcial** | Fluyen por `selectedFactors`; sólo carga distribuida aparece en una regresión focal. No hay corpus independiente completo. |
| Releases, springs, rigid offsets y Timoshenko bajo P-Delta | **No validados específicamente** | El solver base los admite, pero los benchmarks P-Delta no demuestran la combinación y la matriz geométrica publicada es la consistente de beam-column prismático. No deben declararse maduros por transitividad. |
| Plasticidad, grandes rotaciones, P-Delta 3D, eigen buckling y GMNIA | **Fuera de alcance** | No están implementados por esta capacidad y no pueden inferirse del factor crítico experimental. |

## Estados de error y advertencia

| Estado | Respuesta |
|---|---|
| Configuración no finita, fuera de rango o presupuesto >10,000 solves | Abortado `pdelta-invalid-config` antes de iterar. |
| Primer orden inválido | Conserva issues base y explica que debe corregirse antes de P-Delta. |
| Mecanismo/inestabilidad durante un paso | Reduce paso o aborta con diagnóstico; no conserva un resultado engañoso. |
| Inversión postcrítica o incremento divergente | Abortado como equilibrio inestable/posible pandeo. |
| Máximo de pasos, mínimo de paso o máximo de iteraciones | Abortado `pdelta-not-converged` con fracción alcanzada o causa concreta. |
| Convergencia cerca de crítica | Resultado disponible con `pdelta-near-critical`, factor estimado, nota de discretización y confiabilidad limitada. |

## Tres planos de madurez

### Estabilidad numérica

**Fuerte dentro del corpus actual.** Hay criterios relativos a la escala del
modelo, caps anti-loop, aislamiento en dense LU, stepping adaptativo,
determinismo, rechazo postcrítico, invariancias y trazabilidad de iteraciones.
No equivale a robustez para cualquier topología ni a estabilidad de un método
Newton completo: la implementación es fixed-point sobre `N`.

### Validez física

**Parcial y acotada.** La evidencia cubre elasticidad 2D y una matriz geométrica
consistente con fuerza axial constante por elemento. La estimación crítica
supone un modo dominante y hereda la discretización. No demuestra plasticidad,
imperfecciones, grandes desplazamientos/rotaciones, P-delta local independiente,
eigen buckling, GMNIA ni cumplimiento de una norma de diseño.

### Interfaz y trazabilidad

**Parcialmente madura.** El usuario elige el modo, puede editar todos los
parámetros, el resultado muestra badge experimental, convergencia, warnings,
amplificación y límites de la estimación, y exportaciones preservan procedencia.
Sin embargo, el selector previo dice sólo “P-Delta”: el alcance y la advertencia
experimental aparecen después del análisis, no en el momento de activación. No
hay test dedicado del bloque visual completo de `ResultSummary`.

## Validación independiente mínima pendiente

1. Voladizo axial+lateral en `0`, `0.1`, `0.5`, `0.9` y `>1.0 Pcr`, con mallas
   de 1/2/4/8 elementos y solución cerrada congelada fuera del solver.
2. Voladizo con momento de punta y miembro inclinado, comparado contra un motor
   independiente con convención/signos documentados.
3. Pórtico sway multínivel con patrón gravitatorio+lateral y dos combinaciones,
   comparando desplazamientos, reacciones, axiales y rechazo postcrítico.
4. Asentamiento prescrito más carga, verificando qué escala y qué no.
5. Casos separados de releases, springs, offsets y Timoshenko; hasta entonces,
   excluirlos del subconjunto promovible.
6. Repetición en Chromium/WebKit y hardware declarado, incluyendo cancelación,
   edición de configuración, stale result y exportación portable.

## Criterios de promoción

P-Delta sólo puede dejar de ser experimental para un **subconjunto explícito**
cuando todos estos gates pasen:

- corpus independiente anterior con tolerancias y signos auditados;
- límites de elementos/cargas visibles antes de activar el modo;
- error de discretización mostrado o gateado cerca de crítica;
- matriz de rendimiento portable y cancelación real en browser;
- tests UI del selector, configuración, resumen, warning y exportación;
- revisión estructural independiente que confirme hipótesis y lenguaje;
- fallas fuera del subconjunto bloqueadas, no aceptadas con advertencia.

## Decisión

**Mantener P-Delta 2D como capacidad experimental opt-in.** La estabilidad
numérica local merece inversión y conservación; la validación física y el
contrato previo de interfaz todavía no justifican promoción. No se abre una
issue de bug porque esta auditoría no reprodujo un defecto funcional; las
ausencias son gates de madurez que deben alimentar la investigación posterior,
no cambios encubiertos de ecuaciones.

## Evidencia ejecutada

- P-Delta, benchmarks y exportación: **3 archivos, 52/52 PASS**.
- TopBar, ProjectContext, portable y confiabilidad: **5 archivos, 57/57 PASS**.
- `verify:docs`: se ejecuta al cierre documental.

## Por qué

CRI-24 requiere separar “converge” de “es físicamente válido” y de “el usuario
entiende el alcance”. Esta matriz evita promover una estimación B2 como eigen
buckling o verificación normativa.

## Archivos tocados

- `reports/2026-08-24-cri-24-pdelta-madurez.md` — inventario, matrices, límites,
  gates y decisión.

## Cómo verificar

```powershell
npx.cmd vitest run src/engine/pDelta.test.ts src/engine/pDeltaBenchmarks.test.ts src/features/topbar/portableExportAnalysis.test.ts --maxWorkers=1 --pool=threads --no-file-parallelism
npx.cmd vitest run src/features/topbar/TopBar.test.tsx src/store/ProjectContext.test.tsx src/utils/portable.test.ts src/features/results/reliabilityCopy.test.ts src/features/topbar/portableExportAnalysis.test.ts --maxWorkers=1 --pool=threads --no-file-parallelism
```

## Pendiente / siguiente paso

CRI-24 queda documentalmente cerrada. CRI-49 y CRI-52 deben tratar eigen
buckling y GMNIA como capacidades futuras independientes, no como una extensión
nominal de este índice. La siguiente posición vigente es CRI-25. No se
modificaron solver, ecuaciones, ProjectModel, resultados ni interfaz.
