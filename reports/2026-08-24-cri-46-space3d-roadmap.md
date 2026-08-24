# CRI-46 — hoja de ruta de madurez de Space 3D

**Fecha:** 2026-08-24
**Agente:** Codex
**Rama:** `codex/linear-queue-execution-20260824`
**SHA auditado:** `17f19d50589c8e98255f0428ceddc8258ca6e410`

## Qué cambió

Se convirtió la auditoría S3D-1 de CRI-23 en una secuencia ejecutable de
endurecimiento. El orden distingue defectos observables, gates necesarios para
promover el alcance actual y capacidades futuras. No se amplió el dominio ni
se modificaron solver, worker, protocolo, store, códec, persistencia, UI o
resultados.

Los bloqueos de esta hoja de ruta están cerrados en Linear: CRI-22 y CRI-23
figuran `Done`. El corte de Space 3D auditado por CRI-23 no recibió cambios de
código entre `8f1b760` y este SHA.

## Evidencia fresca

`npm run verify:space3d` pasó en el SHA auditado:

- **20 archivos PASS; 214 pruebas PASS y 5 skip declarados**. Los cinco skip
  siguen siendo las corridas Frame3DD `NOT_RUN`; no se convierten en PASS.
- **10/10 pruebas de política de capacidad PASS**.
- Capacidad declarada y aprobada: **150 nudos / 300 barras**.
- Escalón máximo: **261.254 ms**, **18.42 MiB**, residual
  **1.5199881831821008e-16**, resultados finitos.
- La advertencia de `HTMLCanvasElement.getContext` pertenece al entorno jsdom;
  confirma precisamente que la corrida unitaria no sustituye un gate WebGL en
  navegador real.

La evidencia numérica independiente vigente permanece en el corpus versionado:
OpenSees 3.8.0 y PyNiteFEA 3.0.0 reproducen 5/5 casos cada uno; Frame3DD no se
ha ejecutado. Esta tarea no volvió a presentar esas corridas históricas como
evidencia nueva.

## Capacidad objetivo acotada

La única capacidad candidata a promoción es **S3D-1 endurecido**:

- marco espacial elástico lineal Euler–Bernoulli, prismático, de seis GDL;
- cargas nodales, restricciones homogéneas, casos y combinaciones lineales;
- reacciones, acciones locales y deformada para el resultado vigente;
- proyecto, historial, códec, import/export y almacenamiento propios;
- worker real cancelable y protocolo versionado;
- límite publicado de 150 nudos / 300 barras, sujeto a la matriz portable;
- mismas convenciones de ejes, signos y unidades ya documentadas.

Promover este alcance significaría que su contrato operativo y de datos pasó
todos los gates siguientes. **No significaría certificación estructural,
cumplimiento normativo ni autorización para modelos fuera de ese sobre.**

## Clasificación antes de ordenar trabajo

| Clase | Estado actual | Tratamiento |
|---|---|---|
| Defecto reproducible del dominio | No apareció ninguno en la corrida focal actual. | Si un gate posterior revela uno, abrir un arreglo mínimo con regresión y cerrarlo antes de continuar ese gate. |
| Gate de producción | S3D-P1 a P6 siguen pendientes o parciales según CRI-23. | Ejecutar en el orden R1–R6; un PASS local no permite saltarse evidencia externa. |
| Capacidad futura | Cargas de barra, releases, springs, apoyos inclinados, asentamientos, cortante, alabeo y no linealidad. | Congelada hasta una decisión posterior y un ADR propio. |
| Capacidad expresamente excluida | Shells, placas, dinámica, modal y certificación. | No diseñar ni implementar dentro de esta hoja de ruta. |

## Hoja de ruta ordenada

| Orden | Slice | Dependencia | Entregable y criterio de cierre | Riesgo que reduce | Decisión al fallar |
|---|---|---|---|---|---|
| **R1** | **Contrato visible + smoke Chromium del flujo existente** | CRI-23 Done | QA dedicado que use el worker y WebGL reales en X2/M1/K0. Debe cargar el ejemplo, mostrar el estado experimental antes de analizar/exportar, analizar y cancelar, seleccionar por `{kind,id}`, cambiar caso/combinación y tabla de resultados, guardar/reabrir, exportar/importar y comprobar cero errores de consola u overflow. | Evita confundir cobertura jsdom con producto ejecutable y prueba juntos worker, selección, resultados y datos sin cambiar física. | Todo hallazgo se separa como defecto focal. No se relaja el gate ni se amplía el dominio. |
| **R2** | **WebKit, interacción y accesibilidad** | R1 verde | Repetir el flujo crítico en WebKit; touch, teclado, foco, nombres accesibles, reduced motion, contraste, densidad K0 y recuperación de pérdida de contexto WebGL. Cero trampas de foco, controles inaccesibles o acciones sólo-hover. | Cierra S3D-P3 y evita promover una superficie usable sólo en Chromium de escritorio. | Mantener experimental; corregir únicamente presentación/interacción demostrada por el fallo. |
| **R3** | **Durabilidad y recuperación de datos** | R1 verde; contrato de códec S3D-1 congelado | Pruebas de integración para primary corrupto + backup válido, almacenamiento denegado/cuota, exportación recuperable y restore real. Publicar un plan de migración fail-closed antes de definir schema S3D-2, sin cambiar todavía el schema. | Reduce pérdida silenciosa y separa recuperación comprobada de round-trips unitarios. | No promover autoría/persistencia; conservar copia exportable y mensajes accionables. |
| **R4** | **Validación numérica ampliada** | R1 verde; convenciones S3D-1 congeladas | Añadir casos independientes multimiembro y combinaciones que cubran equilibrio, orientación y signos. Ejecutar Frame3DD o emitir una decisión técnica revisada que justifique por qué OpenSees + PyNite son suficientes para el sobre exacto. Cero outputs huérfanos y manifest reproducible. | Reduce el riesgo de que cinco casos de un miembro oculten errores de ensamblaje o transformación. | Mantener análisis experimental; no cambiar tolerancias para hacer pasar el corpus. |
| **R5** | **Capacidad portable** | R1 estable; runner de capacidad inmutable | Matriz declarada de navegador/runtime/hardware con 25/50/100/150 nudos, varias repeticiones, percentiles, memoria estimada y degradación segura. Publicar el mínimo común probado; nunca extrapolar 150/300 desde una sola PC. | Convierte una medición local en un contrato operativo portable. | Bajar el límite visible al último escalón portable o mantenerlo experimental por dispositivo; no ocultar la degradación. |
| **R6** | **Revisión independiente y decisión de promoción** | R1–R5 verdes | Revisión externa de alcance, convenciones, fixtures, resultados, mensajes y límites. Resolver hallazgos y emitir una tabla PASS/PARTIAL/FAIL de S3D-P1…P6. Sólo un PASS completo puede promover el sobre S3D-1 endurecido. | Evita que la misma implementación se auto-certifique y fija un límite público auditable. | Mantener toda la superficie experimental; el cierre administrativo no sustituye el gate técnico. |

## Siguiente slice pequeño y reversible

Ejecutar **R1** como una tarea de QA del comportamiento existente. Su primer
commit debe contener únicamente el runner browser, fixtures no persistentes y
aserciones; no cambia componentes de producto. Esto permite observar la app
real antes de diagnosticar o corregir nada. Si el runner demuestra un defecto,
el arreglo va en un commit y reporte separados, con la regresión que lo hizo
visible.

Presupuesto de R1:

1. Chromium, 1440×900, 834×1112 y 390×844.
2. Worker real: una corrida completada y una cancelada sin respuesta obsoleta.
3. WebGL real: escena inicial, picking de nudo y barra, cambio de resultado y
   deformada; la selección siempre conserva `{kind,id}`.
4. Datos: guardar/reabrir, exportar/importar y comprobar igualdad semántica sin
   tocar el proyecto 2D origen.
5. Contrato: aviso experimental y ausencias visibles antes de analizar y antes
   de exportar.
6. Consola, overflow y targets táctiles registrados como artefactos ignorados.

R1 no autoriza corregir de antemano hipótesis sobre WebGL, CSS o worker. Primero
debe producir el fallo reproducible.

## Dependencias y reglas de avance

```text
CRI-22 + CRI-23
        │
        ▼
       R1 ──────► R2
        │
        ├──────► R3
        ├──────► R4
        └──────► R5
                    \
R2 + R3 + R4 + R5 ─► R6 ─► decisión sobre S3D-1 endurecido
```

- R2–R5 pueden prepararse por separado después de R1, pero R6 consume todos.
- Un defecto bloquea sólo el gate que lo reprodujo y se corrige con el menor
  radio posible.
- Ningún gate modifica por implicación solver, unidades, signos, topología,
  worker/protocolo, persistencia o formatos; esos cambios requieren una tarea
  explícita y evidencia propia.
- La promoción es del sobre completo descrito arriba, no de una etiqueta
  genérica “3D listo para producción”.

## Qué no se hará

- No agregar shells, placas, dinámica, modal, P-Delta 3D ni material no lineal.
- No añadir cargas de barra, releases, springs, apoyos inclinados, asentamientos
  o nuevas teorías dentro de los gates.
- No cambiar el límite 150/300 con una sola medición.
- No inferir identidad, ejes o resultados por coincidencia numérica.
- No llamar certificación a la revisión independiente ni a la coincidencia con
  oráculos.
- No crear schema S3D-2 hasta tener probado el plan de migración de R3.

## Archivos tocados

- `reports/2026-08-24-cri-46-space3d-roadmap.md` — capacidad objetivo,
  dependencias, orden, riesgos, gates, siguiente slice y exclusiones.

## Cómo verificar

```powershell
npm.cmd run verify:space3d
npm.cmd run verify:docs
git diff --check
```

## Pendiente / siguiente paso

CRI-46 queda lista para cierre documental. La siguiente tarea de la cola
vigente es CRI-45. La ejecución de R1 pertenece a una tarea posterior: esta
issue define la ruta y no implementa silenciosamente sus slices.
