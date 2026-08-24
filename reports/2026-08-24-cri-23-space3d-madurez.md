# CRI-23 — madurez, límites y gates de Space 3D S3D-1

**Fecha:** 2026-08-24 11:07 CST
**Agente:** Codex
**Rama:** `codex/linear-queue-execution-20260824`
**SHA auditado:** `8f1b760808fb29cbac30d71911b2d232d2bc7a69`

## Qué cambió

Se auditó S3D-1 contra el código, las pruebas, el corpus versionado y corridas
externas nuevas. No se amplió el dominio ni se modificó el solver. El resultado
clasifica cada contrato como reproducible, local solamente, parcial, pendiente
o fuera de alcance, y fija los gates que faltan antes de cualquier promoción.

## Clasificación vigente

| Contrato | Clasificación | Evidencia actual | Límite o riesgo |
|---|---|---|---|
| Dominio separado bajo `src/space3d/**` y `src/features/space3d/**` | **Reproducible** | Tipos discriminados, proyecto por defecto, validación fail-closed y carga lazy desde `App.tsx`; el store 2D no es el store 3D. | La separación evita contaminación del 2D, pero no certifica la física 3D. |
| Nudos espaciales y seis GDL `[ux, uy, uz, rx, ry, rz]` | **Reproducible** | Tests de defaults, validación, orientación, elemento, solver e invariantes; coordenadas no finitas/fuera de rango y orden de GDL fallan cerrado. | Ejes globales fijados con `Y` vertical y unidades internas `m`, `kN`, `kN·m`; no hay cambio de convención por proyecto. |
| Frame Euler–Bernoulli 12×12, transformación, ensamblaje y solver lineal | **Reproducible para el subconjunto declarado** | Casos cerrados de axil, torsión, flexión `Iy/Iz` y marco inclinado; invariantes de rotación, renumeración, linealidad y energía; equilibrio 6D y combinaciones lineales. | Un solo frame prismático; sin cortante, alabeo, releases, springs, offsets, cargas de barra, peso propio, térmicas ni no linealidad. |
| Worker, protocolo, cancelación y store | **Local solamente** | Protocolo versionado, respuestas obsoletas, errores, cancelación real por terminación, reemplazo de corrida y cleanup pasan con worker controlado; provider pasa bajo StrictMode. | No existe una corrida browser end-to-end dedicada que demuestre el worker real bajo presión, suspensión móvil o cierre de pestaña. |
| Comandos, undo/redo, códec y persistencia propios | **Reproducible localmente** | CRUD inmutable, límites, round-trip estricto, rechazo de campos/versiones desconocidos, primary+backup, recuperación de corrupción y aislamiento por namespace. | Sólo schema S3D-1; falta un gate de restauración/migración entre versiones futuras y almacenamiento restringido del navegador. |
| Bridge explícito 2D→3D de una dirección | **Reproducible** | Conserva identidad, nombre, unidades, topología plana, apoyos mapeables, cargas nodales, casos y combinaciones; no muta el origen y publica diagnósticos bloqueantes. | `G`, `Iy` y `J` desconocidos no se inventan. Trusses, releases, springs, apoyos inclinados, cargas de barra, asentamientos y efectos iniciales requieren resolución/reconocimiento; no hay retorno 3D→2D. |
| Viewport Three.js, picking, capas, caso/combinación y deformada | **Parcial** | Unit tests montan/actualizan/liberan escena y WebGL, limitan DPR, prueban resize, picking por ID, presets, target, capas, deformada sólo vigente y escala explícita acotada. Component tests prueban selección de objetivo y controles. | La mayoría usa renderer/viewport controlado. Falta QA en navegadores reales para WebGL, contexto perdido, selección táctil, densidad visual y rendimiento de escena. |
| Estados responsive | **Parcial** | CSS declara safe areas, objetivos táctiles, reduced motion y cortes `<600`, `600–959`, `≥960`, `≥1440`; componentes prueban disclosures compactos y navegación accesible. | No hay gate browser dedicado X2/M1/K0 ni prueba con tecnologías de asistencia. Un media query existente no equivale a usabilidad verificada. |
| Capacidad 150 nudos / 300 barras | **Local solamente, con política reproducible** | `verify:space3d` aprobó 25/50, 50/100, 100/200 y 150/300. En esta máquina el máximo resolvió en 238.631 ms, estimó 18.42 MiB y dio residual `1.52e-16`; política: 2 s y 256 MiB. | La cifra depende de hardware/runtime y mide el caso canónico, no todas las topologías. No es una garantía universal de latencia. |
| Validación independiente | **Parcial** | Se regeneraron OpenSees 3.8.0 y PyNiteFEA 3.0.0: 10/10 corridas OK. `build-manifest.py` produjo cero diff; la comparación posterior dio 17 PASS. | Cinco casos son una base fuerte pero estrecha. Frame3DD permanece `NOT_RUN`; no hay ejecutable ni toolchain local. Ningún motor externo se trata como verdad única. |
| Shells, placas, dinámica, modal, P-Delta 3D y material no lineal | **Fuera de alcance** | No hay tipos, comandos ni solver que los afirmen; el contrato canónico termina en S3D-1. | No deben aparecer en UI, documentación o marketing como capacidad disponible. Requieren ADR y tareas de dominio independientes. |

## Evidencia reproducida

- `npm run verify:space3d` — **20 archivos PASS; 214 PASS y 5 skip
  explícitos; política 10/10 PASS; capacidad 150/300 aprobada**.
- `py -3.12 validation/space3d/run-oracles.py` — **OpenSees/PyNite
  10/10 OK**.
- `py -3.12 validation/space3d/build-manifest.py` — manifiesto con 5 casos
  manuales y 15 corridas externas; **cero diff** frente al corpus versionado.
- `npx vitest run src/space3d/engine/oracleComparison.test.ts
  --maxWorkers=1 --pool=threads --no-file-parallelism --reporter=verbose` —
  **17 PASS y 5 skip Frame3DD con razón declarada**.

## Qué significa “experimental”

Significa que el subconjunto lineal declarado funciona, falla cerrado dentro de
sus contratos y tiene evidencia local más dos oráculos independientes para
cinco casos. No significa:

- certificación de seguridad estructural ni cumplimiento normativo;
- cobertura de toda carga, conexión, apoyo o comportamiento 3D;
- que 150/300 vaya a cumplir la misma latencia en cualquier dispositivo;
- que la UI esté validada con todos los navegadores o ayudas técnicas;
- que un resultado convergido sea suficiente para aceptar un modelo real.

## Gates restantes para producción

| Gate | Criterio mínimo de cierre | Estado |
|---|---|---|
| S3D-P1 · contrato visible | Alcance/ausencias y estado experimental visibles antes de analizar y exportar. | **Pendiente de auditoría UI real**. |
| S3D-P2 · validación numérica ampliada | Casos independientes multimiembro y combinaciones; ejecutar un tercer motor o documentar formalmente por qué dos son suficientes para el subconjunto. | **Parcial**; OpenSees/PyNite 10/10, Frame3DD pendiente. |
| S3D-P3 · browser y accesibilidad | Gate X2/M1/K0 en Chromium y WebKit: navegación, worker real, WebGL/context loss, touch, teclado, reduced motion, contraste y screen reader smoke. | **Pendiente**. |
| S3D-P4 · capacidad portable | Repetir escalones en una matriz declarada de hardware/runtime; publicar percentiles y degradación segura, no una cifra de una sola PC. | **Pendiente**. |
| S3D-P5 · datos y recuperación | Restore real desde backup, fallo de cuota/almacenamiento y plan probado de migración antes de schema S3D-2. | **Parcial**; unit tests verdes. |
| S3D-P6 · revisión independiente | Revisión estructural externa del alcance, convenciones, fixtures y mensajes; resolver hallazgos sin llamar a eso certificación. | **Pendiente**. |

## Decisión

**Mantener toda la superficie S3D-1 como experimental.** No se promueve todavía
un subconjunto numérico: los gates browser/accesibilidad, capacidad portable y
revisión independiente siguen abiertos. La siguiente inversión correcta es
endurecer esos gates, no agregar shells, dinámica, modal ni más teoría.

La autoría/persistencia aislada podría convertirse después en el primer
subconjunto promovible, pero sólo junto con S3D-P3 y S3D-P5; separarla hoy
crearía una etiqueta de madurez que la UI actual no distingue.

## Por qué

CRI-23 pide decidir con evidencia qué existe y qué falta. Mantener la etiqueta
experimental protege al usuario de interpretar tests verdes o coincidencia con
oráculos como certificación de modelos fuera del subconjunto S3D-1.

## Archivos tocados

- `reports/2026-08-24-cri-23-space3d-madurez.md` — clasificación, evidencia,
  riesgos, gates y decisión.

## Cómo verificar

Ejecutar los cuatro comandos de evidencia en el orden indicado. OpenSeesPy y
PyNiteFEA son herramientas de validación locales, no dependencias del bundle.

## Pendiente / siguiente paso

CRI-23 queda documentalmente cerrada. CRI-46 debe consumir estos gates para la
hoja de ruta, sin ampliar análisis antes de cerrarlos. La siguiente posición de
la cola vigente es CRI-24. No se modificaron solver, worker, modelo, resultados,
persistencia ni formatos.
