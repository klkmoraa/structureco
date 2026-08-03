# Contexto: análisis P-Delta (segundo orden)

Sesión del 2026-08-03 · rama `main` · versión `0.8.2` · **sin push**

## Alcance

Nuevo modo opcional de análisis elástico de **segundo orden geométrico (P-Delta)**
para pórticos 2D, seleccionable junto al primer orden (que sigue siendo el
modo por defecto, sin cambios). Excluido explícitamente, como se pidió: material
no lineal, plasticidad, dinámica, grandes deformaciones, placas/cascarones, 3D.

## Formulación implementada

- **Rigidez geométrica**: matriz consistente estándar viga-columna 6×6 (`src/engine/solver.ts`,
  `geometricStiffness(L, N)`), local `[ui,vi,θi,uj,vj,θj]`, filas/columnas axiales
  en cero. `N` seguido tensión-positivo (la convención ya existente del motor).
  Solo se aplica a miembros `frame` (no `truss`, no `rigid` — decisión documentada
  como limitación, ver abajo).
- **Matriz tangente**: `K_total = K_elástica + K_geométrica(N)`, ensamblada e
  invertida con el **mismo** sistema KKT/restricciones/escalamiento/factorización/
  refinamiento existente — cero solucionadores nuevos, cero inversa explícita.
- **Iteración**: punto fijo (aproximación sucesiva) sobre `N`: se resuelve con la
  `N` de la iteración anterior, se extrae la nueva `N` de `localEndForces`
  (promedio de los dos extremos, por si el miembro tiene carga axial distribuida),
  se repite hasta convergencia.
- **Aplicación incremental de carga**: adaptativa — cada intento primero prueba
  llegar a la combinación completa (`λ=1`) en un solo paso; solo subdivide
  cuando una iteración falla o se detecta inestabilidad, reduciendo `λ` por
  `stepReductionFactor` hasta `minimumStep`.
- **Detección de pérdida de estabilidad**: dos mecanismos independientes, sin
  extraer autovalores ni tocar la factorización LU compartida:
  1. La estimación de condición `κ₁` ya existente (`conditionEstimate > 1e10`)
     se reporta como `stabilityWarning` en el resultado convergido.
  2. **Inversión de dirección respecto al primer orden**: por encima de la
     carga crítica, el sistema deja de ser positivo-definido y puede converger
     a un punto fijo autoconsistente pero físicamente absurdo — una carga
     lateral hacia la derecha produce un desplazamiento hacia la izquierda.
     Se detecta con un producto punto entre el vector de desplazamientos
     actual y el de primer orden (`respondsAgainstFirstOrder`, `pDelta.ts`):
     un producto no positivo rechaza la iteración. Verificado numéricamente:
     a P=3·Pcr sin este chequeo el motor convergía en 3 iteraciones a un
     resultado con el desplazamiento lateral **de signo invertido**; con el
     chequeo, se rechaza correctamente.

## Fallo silencioso encontrado y corregido en el camino

Al inyectar rigidez geométrica, la auditoría de "equilibrio global no cierra"
del motor (que sirve para primer orden) empezó a rechazar **todo** resultado
P-Delta con efecto real: esa auditoría suma momentos usando la geometría
**sin deformar**, y un análisis P-Delta correctamente convergido conserva un
momento adicional P·Δ que esa contabilidad de primer orden nunca esperó ver.
Se corrigió en `solver.ts` (el residuo se reporta como `info`, no `error`,
cuando la rigidez geométrica está activa) y en `reliability.ts` (los checks
`equilibrium`/`load-audit`/`diagram-closure`/`compatibility` se marcan "no
aplicable" para un resultado P-Delta, reemplazados por un nuevo check
`p-delta-convergence` que sí entiende la proximidad a pandeo). Sin este
arreglo, P-Delta habría rechazado prácticamente cualquier caso con
compresión real — se descubrió con las pruebas, no se dedujo de antemano.

## Benchmarks (referencia analítica independiente)

Cantiléver fijo-libre, L=4 m, E=200 000 000 kN/m², I=8×10⁻⁵ m⁴ (EI=16 000 kN·m²),
H=10 kN lateral en la punta. Solución cerrada viga-columna: `δ = H(tan(kL)−kL)/(Pk)`,
`k=√(P/EI)`; `Pcr` exacta (fijo-libre) = 2467.40 kN. Deducida independientemente
por un subagente y auto-verificada (recupera el primer orden en `P→0`, coincide
con el factor de amplificación B1 de Timoshenko/AISC dentro de 0.7 %).

| P/Pcr | structureCo (m) | Exacta (m) | Diferencia | Conclusión |
| --- | --- | --- | --- | --- |
| 0 | 0.013333 | 0.013333 | 0.00 % | coincide exactamente con primer orden |
| 0.1 | 0.014794 | 0.014795 | 0.01 % | dentro de tolerancia |
| 0.5 | 0.026392 | 0.026484 | 0.35 % | dentro de tolerancia |
| 0.9 | 0.124265 | 0.131616 | 5.59 % | error crece cerca de la crítica (ver limitación) |

Tensión axial T=0.5·Pcr (misma columna): structureCo=0.008935 m, exacta=0.008944 m,
diferencia 0.10 % — confirma que la tensión **reduce** el desplazamiento en vez
de amplificarlo, sin ningún caso especial en el código (el signo de `N` en la
matriz geométrica ya lo resuelve).

Por encima de la crítica (P=1.2·Pcr): `success=false`,
`pDelta.converged=false`, rechazado con
`pdelta-not-converged` en vez de devolver un número — requisito cumplido.

**Nota honesta sobre la exactitud cerca de la crítica**: el error crece con
P/Pcr (0.01 %→5.6 % entre 0.1 y 0.9) porque la rigidez geométrica de UN solo
elemento por columna estima su propia carga crítica ~0.7 % por encima de la
exacta (verificado a mano resolviendo el problema de autovalores 2×2 reducido
del elemento). Es la limitación conocida y documentada de este método
(consistente con la literatura de análisis matricial), no un error de signo o
de ensamblaje — mitigable subdividiendo columnas críticas en varios elementos,
que el motor ya soporta sin cambios (cada elemento recibe su propia N).

## Pruebas ejecutadas

`src/engine/pDelta.test.ts` — 17 pruebas dirigidas, escritas primero (fallaron
contra la implementación incompleta antes de cada arreglo), cubriendo los 15
requisitos pedidos: coincidencia sin fuerza axial, acercamiento con compresión
pequeña, amplificación creciente, tensión no amplifica, voladizo con carga
axial+lateral, pórtico simple con cargas gravitacionales y laterales,
convergencia estable ante distintas políticas de paso, reducción automática de
paso, caso cercano a la crítica, rechazo por encima de la crítica, conservación
de equilibrio (residuo algebraico) y de restricciones, compatibilidad de
primer orden sin cambios, determinismo. Más `geometricStiffness` (matriz
verificada término a término).

## Resultado de la verificación

```bash
npm run typecheck && npm run lint && npm run verify:protected && npm test && npm run build
```

| Comprobación | Resultado |
| --- | --- |
| typecheck | ✅ |
| lint (oxlint) | ✅ |
| verify:protected | ✅ 26 archivos (línea base refrescada — expansión autorizada) |
| suite completa | ✅ **86 archivos / 600 pruebas** tras la revisión independiente (línea base de la sesión anterior: 85/578; primera pasada de esta sesión: 86/595) |
| build | ✅ |

Verificación manual en navegador (dev server propio):
- Ejemplo "Pórtico de ejemplo" (6×4 m), modo P-Delta → **"Convergió · 1 pasos de
  carga · 4 iteraciones · Amplificación ×1.034 respecto a primer orden"**, sin
  errores en consola.
- Mismo modelo en primer orden → sin bloque P-Delta (correcto, no se muestra
  cuando no aplica).
- Selector "Orden del análisis" y configuración avanzada plegable (6 campos:
  pasos máximos, iteraciones máximas, tolerancias de equilibrio/desplazamiento,
  factor de reducción, paso mínimo) verificados interactivamente — edición
  persiste en `project.settings.pDeltaConfig`.

## Archivos principales modificados

| Archivo | Cambio |
| --- | --- |
| `src/engine/pDelta.ts` | Nuevo · orquestación P-Delta completa |
| `src/engine/pDelta.test.ts` | Nuevo · 17 pruebas dirigidas |
| `src/engine/solver.ts` | `geometricStiffness`, inyección vía `options.pDeltaAxialForces`, ajuste del check de equilibrio global bajo P-Delta |
| `src/engine/reliability.ts` | Nuevo check `p-delta-convergence`; los checks de primer orden se marcan no aplicables bajo P-Delta |
| `src/engine/reliability.test.ts` | Actualizado con el nuevo id de check |
| `src/engine/projectSignature.ts` | Incluye `analysisMode`/`pDeltaConfig` en la firma |
| `src/engine/analysisWorkerProtocol.ts`, `src/store/ProjectContext.tsx` | Usan `analyzeProjectAuto` (despacha por `analysisMode`) |
| `src/types.ts` | `PDeltaConfig`, `PDeltaDiagnostics`, `PDeltaStepIteration`; `ProjectSettings.analysisMode`/`pDeltaConfig`; `AnalysisResult.pDelta` |
| `src/features/topbar/TopBar.tsx` | Selector primer orden/P-Delta + configuración avanzada plegable |
| `src/features/results/ResultSummary.tsx` | Bloque de estado P-Delta (convergencia, iteraciones, amplificación, advertencia) |
| `src/i18n/catalogs.ts` | Claves `analysis.order*`, `pdelta.*` (es/en) |

## Commits locales

```
a178a9f chore(release): refrescar la línea base protegida tras la ampliación P-Delta
e0199e7 feat(ui): agregar selector de orden de análisis y diagnóstico P-Delta
b3e1e0c feat(engine): implementar análisis P-Delta de segundo orden para pórticos 2D
```

## Limitaciones reales

- **Precisión cerca de la carga crítica**: un solo elemento por columna tiene
  ~0.7 % de error en su propia carga crítica frente a la teoría exacta,
  amplificado a ~5.6 % de error en desplazamiento a P/Pcr=0.9. Mitigable
  subdividiendo el miembro en 2-4 elementos (ya soportado, no probado en un
  benchmark dedicado esta sesión).
- **Rigidez geométrica solo en miembros `frame`**: los miembros `truss` y
  `rigid` no reciben corrección P-Delta (decisión de alcance: el efecto
  P-Delta de barras puramente axiales -tipo cable/pandeo lateral de armadura-
  es un fenómeno distinto, fuera de lo pedido).
- **Envolventes y líneas de influencia** (`analyzeProjectScenarios`,
  `useInfluenceAnalysis`) siguen usando primer orden exclusivamente — no se
  extendieron a P-Delta esta sesión (multiplicaría el costo por escenario sin
  que se pidiera explícitamente).
- **Timoshenko**: la rigidez geométrica usa la formulación Euler-Bernoulli
  estándar incluso si el miembro tiene `beamTheory:'timoshenko'` (corrección
  por cortante en el término geométrico omitida — simplificación común y
  aceptada en la práctica, el efecto es de segundo orden sobre un efecto de
  segundo orden).
- **Mensajes de diagnóstico** (`pDelta.ts`) son siempre en español,
  igual que el resto de mensajes del motor (`ValidationIssue`) — no pasan por
  el catálogo i18n, consistente con la convención ya existente.

## Revisión independiente (subagente) y hallazgos reales corregidos

Se usó el tercer subagente previsto en el plan original (revisión adversarial
del diff completo, sin contexto de la sesión). Encontró 5 hallazgos; 4 eran
reales y se corrigieron, uno quedó documentado como limitación no confirmada:

1. **(Bloqueante, corregido)** `analyzeProject` sella `reliability` en el
   resultado *antes* de que `pDelta` exista en el objeto, así que todo
   resultado P-Delta real leía como `unreliable` por el mismo residuo de
   equilibrio de primer orden que ya se había relajado en `solver.ts` — el
   arreglo de `reliability.ts` de esta sesión nunca se activaba. Se corrigió
   recalculando `reliability` en `pDelta.ts` después de adjuntar `pDelta`.
2. **(Bloqueante, corregido)** `respondsAgainstFirstOrder` rechazaba cualquier
   modelo con desplazamiento nulo en ambos vectores (producto punto = 0 ≤ 0)
   — es decir, **cualquier modelo completamente restringido o sin carga**,
   el estado exacto en que está un proyecto recién cambiado a P-Delta. Se
   corrigió con una guarda de magnitud (si el vector de referencia de primer
   orden es ~0, el chequeo no aplica) y, adicionalmente, usando como
   referencia el primer orden de *cada paso de carga* en vez de uno fijo en
   λ=1 (evita también la premisa rota de que la dirección de primer orden es
   independiente de λ cuando hay asentamientos absolutos).
3. **(Corregido)** El umbral absoluto de `conditionEstimate > 1e10` para la
   advertencia de estabilidad nunca se activaba en la práctica — medido: solo
   ~1.4×10⁶ incluso a 0.99·Pcr. Se reemplazó por la razón contra la condición
   de primer orden del mismo modelo (`> 20`), calibrada empíricamente
   (razón≈1 lejos de la crítica, ≈100+ cerca de ella).
4. **(Corregido)** `pDeltaActive` en `solver.ts` era verdadero para un `Map`
   vacío (proyecto sin miembros `frame`), relajando checks de equilibrio que
   no tenían nada que ver con P-Delta. Ahora exige `.size > 0`.
5. **(No confirmado, no instanciado)** Posible interacción entre
   asentamientos prescritos por caso de carga y el escalado por λ — mitigada
   como efecto colateral del punto 2 (referencia de primer orden por paso),
   no se construyó un caso de prueba dedicado.

5 pruebas nuevas en `pDelta.test.ts` (sección "hallazgos de la revisión
independiente") demuestran cada corrección con un caso que fallaba antes del
arreglo. Suite completa tras los arreglos: **86 archivos / 600 pruebas**
(22 en `pDelta.test.ts`, antes 17).

## Instrucciones para que Codex revise el trabajo

1. Punto de entrada único: `analyzeProjectPDelta` en `src/engine/pDelta.ts`.
   Revisar primero `geometricStiffness` en `solver.ts` (la única fórmula
   matemática nueva) contra cualquier referencia de análisis matricial
   (Przemieniecki, McGuire/Gallagher/Ziemian) — es la matriz consistente
   estándar, sin variaciones.
2. El punto más delicado del cambio es el ajuste a `global-equilibrium` en
   `solver.ts` y a los checks de `reliability.ts`: confirmar que **solo**
   se relajan cuando `options.pDeltaAxialForces`/`result.pDelta?.enabled` es
   verdadero — un análisis de primer orden ordinario no debe verse afectado
   (cubierto por el requisito 14, "compatibilidad del modo de primer orden
   existente", que compara dos corridas de `analyzeProject` sin la opción y
   exige igualdad exacta).
3. `respondsAgainstFirstOrder` en `pDelta.ts` es el chequeo de estabilidad
   más importante del PR — sin él, el motor converge silenciosamente a
   soluciones post-pandeo con el desplazamiento invertido de signo (se
   verificó manualmente antes de implementarlo, ver arriba). Revisar que el
   producto punto se calcula contra el vector de primer orden correcto.
4. Ejecutar `npm run verify` completo; no se tocó ninguna otra parte del
   motor de primer orden salvo lo listado arriba.

**No se hizo push.** Todos los cambios de esta sesión están commiteados
localmente en `main`, pendientes de confirmación explícita del usuario para
subir a GitHub.
