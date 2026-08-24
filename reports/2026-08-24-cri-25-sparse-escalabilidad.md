# CRI-25 — escalabilidad y límites del backend sparse híbrido

**Fecha:** 2026-08-24 11:18 CST
**Agente:** Codex
**Rama:** `codex/linear-queue-execution-20260824`
**SHA auditado:** `55f0ab5a8c0d6cb7adbd89b88a4662ad4dc472fa`

## Qué cambió

Se midió el backend sparse híbrido sin cambiar algoritmos, umbrales ni
resultados. Tres corridas aisladas del profiler existente cuantificaron
assembly, solve, deformada, memoria y degradación para vigas continuas de
100/500/1000 miembros. La auditoría también verificó paridad con LU denso,
fallbacks y presupuestos vigentes.

## Entorno de medición

| Campo | Valor |
|---|---|
| SO | Windows 11 Home Single Language 10.0.22631, build 22631 |
| CPU | AMD Ryzen 5 3500U with Radeon Vega Mobile Gfx, 8 procesadores lógicos |
| RAM visible | 6.9 GiB |
| Node / V8 | Node v24.18.0 / V8 13.6.233.17-node.50 |
| Vitest | 4.1.10, un worker, pool threads, sin paralelismo de archivos |
| Playwright instalado | 1.61.1; **no usado para estas cifras** |
| Modelo | Viga continua, 3 GDL por nudo, `includeEducationTrace: false`, backend `auto` |

No existe hoy un harness browser equivalente para el worker real. Por ello las
cifras son evidencia Node/Windows de esta máquina, no una promesa para Chromium,
WebKit, móviles ni otros procesadores.

## Rutas identificadas

| Ruta | Condición y comportamiento |
|---|---|
| Dense | Política `dense`, sistema menor de 60 ecuaciones, sistema reducido menor de 60, restricciones no reducibles a un GDL, fill >25 % o pivote no positivo. Usa LU con pivoteo y publica el motivo de fallback. |
| Sparse | Política `auto`, restricciones de un GDL eliminables, bloque reducido >=60, fill <=25 % y LDLT con pivotes positivos. Usa RCM + CSR + LDLT. |
| Híbrida real | La factorización puede ser sparse, pero recibe un sistema que ya fue ensamblado y escalado como matrices densas. Residual y estimación de condición operan contra esa matriz completa. |

El solver 2D crea `K = zeros(ndof, ndof)`, después `A = zeros(naug, naug)` y
después `scaledA = A.map(row.map(...))`. Así, escoger `sparse-ldlt` evita la
factorización LU cúbica en casos calificables, pero no elimina assembly,
escalado, residual y diagnóstico densos.

## Mediciones crudas

Todos los casos usaron `sparse-ldlt` y conservaron residual finito. Tiempos en
milisegundos; heap delta en MiB.

| Corrida | Miembros | Total | Assembly | Solve | Deformada | Heap delta | Residual |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 100 | 617.6 | 85.90 | 37.98 | 233.36 | 68.7 | `6.298e-18` |
| 1 | 500 | 3,174.5 | 1,261.86 | 337.51 | 733.03 | 229.0 | `5.897e-18` |
| 1 | 1000 | 14,266.2 | 8,995.22 | 1,234.17 | 2,385.36 | 818.4 | `5.897e-18` |
| 2 | 100 | 421.6 | 50.07 | 28.92 | 139.66 | 72.2 | `6.298e-18` |
| 2 | 500 | 3,253.7 | 1,376.53 | 362.79 | 762.97 | 225.4 | `5.897e-18` |
| 2 | 1000 | 11,140.7 | 6,836.53 | 1,199.32 | 1,837.83 | 806.7 | `5.897e-18` |
| 3 | 100 | 430.8 | 58.31 | 35.75 | 150.31 | 73.0 | `6.298e-18` |
| 3 | 500 | 2,748.5 | 1,017.78 | 375.97 | 641.75 | 283.2 | `5.897e-18` |
| 3 | 1000 | 10,931.9 | 6,745.97 | 1,437.25 | 1,682.05 | 788.8 | `5.897e-18` |

## Medianas y variación

| Miembros | Total mediano (rango) | Assembly mediano | Solve mediano | Deformada mediana | Heap mediano (rango) | Assembly / total mediano |
|---:|---:|---:|---:|---:|---:|---:|
| 100 | 430.8 (421.6–617.6), spread 46.5 % | 58.31 | 35.75 | 150.31 | 72.2 (68.7–73.0) | 13.5 % |
| 500 | 3,174.5 (2,748.5–3,253.7), spread 18.4 % | 1,261.86 | 362.79 | 733.03 | 229.0 (225.4–283.2) | 39.8 % |
| 1000 | 11,140.7 (10,931.9–14,266.2), spread 30.5 % | 6,836.53 | 1,234.17 | 1,837.83 | 806.7 (788.8–818.4) | 61.4 % |

El primer caso pequeño y la primera corrida de 1000 muestran warm-up/ruido
visible; por eso la decisión usa medianas y conserva los rangos, no selecciona
la muestra más rápida.

## Degradación observada

| Salto | Total | Assembly | Solve | Heap |
|---|---:|---:|---:|---:|
| 100→500 miembros (5×) | 7.37× | 21.64× | 10.15× | 3.17× |
| 500→1000 miembros (2×) | 3.51× | 5.42× | 3.40× | 3.52× |

En 1000 miembros el assembly mediano consume aproximadamente 5.5 veces el
solve mediano. El cuello de botella medido es la representación/procesamiento
denso previo y posterior a LDLT, no una hipótesis sobre el algoritmo sparse.

El heap delta es indicativo, no peak RSS: depende del GC y cada tamaño corre en
el mismo proceso. Aun con esa limitación, 788.8–818.4 MiB en 1000 miembros es
consistente y material; no puede ocultarse detrás del tiempo de factorización.

## Contrato de no regresión numérica

Cualquier optimización posterior debe conservar simultáneamente:

1. Paridad auto vs LU denso de desplazamientos, reacciones, esfuerzos y
   diagramas dentro de las tolerancias actuales.
2. Determinismo exacto entre dos corridas auto del mismo modelo.
3. Residual lineal <=`1e-10`, equilibrio <=`1e-8` y load audit <=`1e-10` en el
   corpus sparse.
4. Estimación de condición del sistema completo y refinamiento iterativo; no
   sustituirlos por métricas del bloque reducido sin declarar el cambio.
5. Fallback denso explícito para tamaño, restricciones, fill y pivote no
   positivo, con el mismo diagnóstico de singularidad.
6. P-Delta continúa forzando dense hasta que una tarea matemática separada
   demuestre compatibilidad; CRI-25 no autoriza mezclar backends.
7. No mover `SPARSE_MIN_SIZE=60` ni el techo de fill de 25 % para obtener un
   gate verde.

## Gate recomendado

Primero convertir el profiler opt-in en un artefacto JSON reproducible que:

- caliente una corrida, mida tres y publique mediana/rango;
- registre Node/V8, SO, CPU, RAM y backend;
- cubra 100/500/1000 en Node y el worker real de Chromium/WebKit;
- separe assembly, solve, residual/condición, deformada y peak RSS/heap;
- ejecute el contrato numérico antes de aceptar el dato de rendimiento.

No se recomienda todavía un hard ceiling universal de milisegundos: una sola
PC no basta. Sí se recomienda un gate estructural inmediato: **1000 miembros
deben usar sparse, conservar residual <=`1e-10`, reportar todas las fases y no
superar la baseline de memoria del entorno por más de un margen acordado tras
obtener CI/browser baselines**.

## Optimización justificada por los datos

La siguiente tarea de arquitectura debería eliminar la triple materialización
densa antes de intentar micro-optimizar LDLT:

1. ensamblar rigidez y restricciones en triplets/CSR;
2. escalar y calcular residual/normas mediante un operador sparse;
3. evitar construir `K`, `A` y `scaledA` densas a la vez;
4. preservar un adaptador/fallback dense explícito;
5. medir de nuevo antes y después con el contrato anterior.

Los datos justifican esa inversión: a 1000 miembros assembly domina 61.4 % y
el heap mediano llega a 806.7 MiB. No justifican prometer 5k+ ni cambiar el
backend en esta auditoría.

## Decisión

**Mantener el backend sparse híbrido experimental y activado sólo por política
`auto`; priorizar un assembly sparse end-to-end antes de ampliar capacidad.**
La vía actual aporta valor real frente a LU denso, pero su envolvente de memoria
y tiempo sigue limitada por matrices densas.

## Evidencia ejecutada

- Profiler F3 opt-in: **3/3 corridas PASS** para 100/500/1000.
- Math + sparse + performance: **3 archivos, 20/20 PASS**.
- Presupuesto vigente de 300 miembros: 3.306 s, bajo su ceiling de 20 s.

## Por qué

CRI-25 exige separar un cuello medido de una intuición. La instrumentación
muestra que el solve sparse no es el costo dominante a escala y que memoria es
ya una frontera concreta.

## Archivos tocados

- `reports/2026-08-24-cri-25-sparse-escalabilidad.md` — entorno, datos crudos,
  variación, contrato, gate y recomendación.

## Cómo verificar

```powershell
$env:STRUCTURECO_PROFILE_PHASE3='1'
npx.cmd vitest run src/engine/benchmarks.test.ts -t "F3 mide assembly" --maxWorkers=1 --pool=threads --no-file-parallelism --reporter=verbose
npx.cmd vitest run src/engine/sparseBackend.test.ts src/engine/math.test.ts src/engine/performance.test.ts --maxWorkers=1 --pool=threads --no-file-parallelism --reporter=verbose
```

## Pendiente / siguiente paso

CRI-25 queda cerrada como auditoría. La optimización propuesta requiere una
tarea de arquitectura separada y sus propios gates; no se implementó aquí. La
siguiente posición vigente es CRI-26. No se modificaron algoritmos, umbrales,
solver ni resultados.
