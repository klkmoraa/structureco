# CRI-22 — matriz vigente de capacidades experimentales

**Fecha:** 2026-08-24 11:01 CST
**Agente:** Codex
**Rama:** `codex/linear-queue-execution-20260824`
**SHA auditado:** `74bb066e1fb1986475691e60c89c111f4e80e20e`

## Qué cambió

Se auditó el código y los gates ejecutables actuales de Space 3D, P-Delta 2D,
el backend sparse híbrido y la importación DXF. La evidencia de esta matriz
proviene del checkout y de corridas locales nuevas; el texto histórico de
Linear sólo se usó para respetar el orden de las subtareas.

La auditoría detectó además que el gate de capacidad de Space 3D fijaba el CLI
de Vitest a `worktree/node_modules`, aunque la instalación válida podía estar
en el checkout principal. Se corrigió únicamente la resolución del ejecutable
y se añadió la regresión correspondiente; no cambió ninguna política de
capacidad ni código matemático.

## Matriz de madurez

| Capacidad | Existe y alcance real | Evidencia reproducida en este SHA | Límites y riesgo | Siguiente gate | Decisión vigente |
|---|---|---|---|---|---|
| Space 3D · S3D-1 | Sí. Dominio separado con frame espacial elástico lineal de 6 GDL, worker/protocolo/store/códec propios, bridge 2D→3D de una dirección, historial, persistencia y viewport Three.js. | `npm run verify:space3d`: 20 archivos, 214 PASS y 5 `skip` declarados; política 10/10 PASS. Capacidad medida de 150 nudos/300 barras: 238.631 ms, 18.42 MiB y residual `1.52e-16` en el escalón máximo. Comparaciones versionadas OpenSees/PyNite pasan; los cinco `skip` corresponden a Frame3DD `NOT_RUN`. | No incluye cargas de barra/térmicas/peso propio, liberaciones, muelles, apoyos inclinados, asentamientos, cortante, alabeo ni no linealidad. Accesibilidad de la superficie no está probada. Frame3DD y certificación externa siguen pendientes. Riesgo medio-alto si se presenta como producción. | CRI-23: clasificar cada superficie y evidencia, ejecutar/registrar los oráculos disponibles y convertir los límites en gates explícitos de promoción. | **Mantener experimental y endurecer.** No ampliar a shells, dinámica o modal. Sólo promover más adelante un subconjunto lineal si todos sus gates cierran. |
| P-Delta 2D | Sí y opt-in por proyecto. Iteración por rigidez geométrica, stepping adaptativo, combinaciones escaladas, configuración acotada, diagnósticos de convergencia y proximidad crítica. Fuerza LU denso para aislarse del sparse. | Parte de la corrida focal 71/71 PASS: `pDelta.test.ts` y `pDeltaBenchmarks.test.ts` cubren fórmulas cerradas, convergencia espacial, invariancias, asentamientos, estados postcríticos, presupuesto y configuración inválida. El resultado conserva `experimental: true`. | Sólo miembros frame aportan rigidez geométrica; fuerza axial constante promedio por elemento; la estimación crítica por amplificación no es eigen buckling ni verificación normativa; interfaz permite parámetros avanzados sin contrato de casos soportados visible al usuario. Riesgo alto cerca de inestabilidad o fuera de los benchmarks. | CRI-24: matriz de entradas/combinaciones/errores, límites físicos frente a numéricos, casos independientes mínimos y criterios de promoción. | **Mantener experimental y endurecer.** No promover hasta documentar el dominio válido y validarlo independientemente. |
| Sparse híbrido 2D | Sí, en política `auto`: elimina restricciones de un GDL, reordena, factoriza LDLT en CSR y vuelve a LU denso si el sistema no califica. Umbral actual: 60 ecuaciones reducidas; fill máximo 25 %. | Parte de la corrida focal 71/71 PASS: paridad con LU denso, determinismo, residual, recuperación de restricciones y fallbacks por tamaño, fill, pivote no positivo o restricciones no reducibles. Existe un profiler opt-in para 100/500/1000 miembros. | El solver aún ensambla `K`, el sistema aumentado `A` y `scaledA` como `number[][]` densos; por tanto assembly y memoria siguen siendo cuadráticos. Los tests de paridad no sustituyen medición de escalabilidad. Riesgo alto de prometer tamaños grandes por observar sólo el tiempo de factorización. | CRI-25: ejecutar el profiler aislado por entorno, medir assembly/solve/memoria/degradación y fijar contrato de no regresión numérica sin mover umbrales. | **Mantener y medir antes de promover.** Congelar cualquier promesa de 5k+ hasta eliminar o acotar el assembly denso con evidencia. |
| DXF ASCII experimental | Sí, como importación explícita y reversible de `LINE` y `LWPOLYLINE` recta/planar en model space. Convierte seis unidades soportadas, conserva capas en la inspección, exige miembro plantilla, crea recovery y publica un solo comando undoable. | Parte de la corrida focal 71/71 PASS: parser y diálogo cubren unidades, preview, confirmación, recovery, importación atómica y bloqueo de entidades incompatibles. Límites: 5,000,000 caracteres, 200,000 pares y 20,000 entidades. | Rechaza curvas, `CIRCLE`, bloques/`INSERT`, polilínea clásica, paper space, 3D, ancho/espesor/extrusión y cualquier archivo con al menos un error; no hay importación parcial. Deduplica sólo por coordenada exacta después de escalar, sin tolerancia geométrica. No es CAD completo. | CRI-26: fixtures reales de versiones/unidades/capas/bloques y tolerancias, matriz de pérdida de información y decisión explícita entre subconjunto estricto o importación parcial segura. | **Mantener limitado y experimental.** No promover hasta validar fixtures reales y definir tolerancia/deduplicación y política de parcialidad. |

## Orden de subtareas

1. **CRI-23 — Space 3D.** CRI-14, su único bloqueo registrado, está Done; por
   ello vuelve a ser ejecutable y conserva la posición siguiente de Linear.
2. **CRI-24 — P-Delta 2D.** Define el contrato físico/numérico antes de cualquier
   investigación futura de eigen buckling o GMNIA.
3. **CRI-25 — sparse híbrido.** Mide sobre el contrato de primer orden vigente;
   no debe mezclarse con P-Delta, que fuerza LU denso deliberadamente.
4. **CRI-26 — DXF.** Cierra el alcance de entrada antes de tareas posteriores de
   dominio y trazabilidad.

## Evidencia ejecutable y frontera externa

- `npx vitest run src/engine/pDelta.test.ts src/engine/pDeltaBenchmarks.test.ts src/engine/sparseBackend.test.ts src/engine/math.test.ts src/import/dxf/dxfParser.test.ts src/import/dxf/DxfImportDialog.test.tsx --maxWorkers=1 --pool=threads --no-file-parallelism` — **71/71 PASS**.
- `npm run verify:space3d` — **214 PASS, 5 skip justificados; 10/10 política PASS; capacidad 150/300 aprobada**.
- Ejecutable localmente: solver/tests, profiler opt-in, fixtures versionados y
  comparación contra outputs OpenSees/PyNite ya auditables.
- Requiere entorno externo o evidencia adicional: ejecutar Frame3DD, repetir
  motores externos desde instalaciones limpias, variación de rendimiento por
  navegador/hardware y corpus DXF proveniente de CAD reales.

Funcional significa que el flujo existe y pasa sus gates actuales; no significa
certificado, normativamente verificado ni listo para producción.

## Recon de riesgo del repositorio

El historial auditado contiene 433 commits (2026-07-17 a 2026-08-24), cinco de
cinco contribuidores activos y un revert en todo el periodo. Los hotspots que
también son imanes de fixes son las superficies visuales compartidas
`src/styles.css`, `src/i18n/catalogs.ts`, `src/features/topbar/TopBar.tsx`,
`src/features/canvas/StructuralCanvas.tsx` y CSS de workspace/tokens. Ninguna se
modificó para esta matriz: las auditorías siguientes deben empezar por los
módulos focales y evitar ampliar el radio hacia esas autoridades compartidas.

## Por qué

CRI-22 exige distinguir capacidad existente, soporte real, evidencia,
limitaciones, riesgo y decisión antes de invertir en promoción o expansión. La
matriz evita convertir un test verde o una medición aislada en una afirmación de
madurez estructural.

## Archivos tocados

- `scripts/check-space3d-capacity.mjs` — resuelve el CLI de Vitest desde el grafo de módulos.
- `scripts/space3d-capacity-policy.mjs` — helper puro e inyectable para esa resolución.
- `scripts/check-space3d-capacity.test.mjs` — regresión para ejecución desde worktree.
- `reports/2026-08-24-cri-22-matriz-madurez-experimental.md` — matriz, decisiones y evidencia.

## Cómo verificar

Ejecutar los dos comandos de la sección de evidencia desde un checkout o
worktree con las dependencias instaladas en cualquiera de sus ancestros de
módulos.

## Pendiente / siguiente paso

La matriz coordinadora queda cerrada. Continúa CRI-23, seguida por CRI-24,
CRI-25 y CRI-26. No se modificaron solver, ecuaciones, resultados, unidades,
signos, topología, ProjectModel, persistencia ni formatos.
