# CRI-45 — módulo de diseño normativo separado

**Fecha:** 2026-08-24
**Agente:** Codex
**Rama:** `codex/linear-queue-execution-20260824`
**SHA base auditado:** `4af69519b736a5a8891731e1fc84b1405493a627`

## Resultado

Se incorporó el primer slice del Design Module como una función pura y
versionada que lee `ProjectModel` + `AnalysisResult` y produce un
`DesignResult` efímero. El resultado de diseño no se agrega al resultado de
análisis, no se persiste, no se despacha al worker y no cambia el solver.

T1 evalúa exclusivamente el componente de fluencia en la sección total de
una barra `truss` a tensión axial, conforme a NTC Acero CDMX 2023 §5.3.1.a:

```text
Rt,y = FR · Fy · A
FR = 0.90
Pu ≤ Rt,y
```

El estado global permanece siempre `incomplete` / “No concluyente”. La norma
exige tomar la menor resistencia entre fluencia total y fractura neta; el
catálogo vigente no contiene `Fu`, área neta efectiva, agujeros ni geometría de
conexión. Por ello este slice nunca declara cumplimiento, seguridad o
aprobación del miembro.

## Fuente normativa fijada

| Campo | Evidencia |
|---|---|
| Jurisdicción | Ciudad de México |
| Documento | Norma Técnica Complementaria para Diseño y Construcción de Estructuras de Acero, edición 2023 |
| Fuente | <https://www.obras.cdmx.gob.mx/storage/app/media/Normas%20tecnicas/NTC-2023.pdf> |
| SHA-256 | `293f22316a59ec2ec64d1f64f0749f49ba8849ded15b289cd88cc171c55ae62a` |
| Ubicación | página PDF 325; página impresa 84; §5.1, §5.2 y §5.3.1 |
| Dataset | `ntc-cdmx-2023-steel-tension-gross-yielding` |
| Revisión | `2026-08-24.1` |

La revisión local descargó el compendio oficial completo: 55,709,147 bytes,
1,972 páginas y el hash indicado. El RFC conserva el hash, la ubicación y la
interpretación aplicada; el PDF temporal no se versiona.

## Arquitectura y contrato

```text
ProjectModel ──────────────┐
                           │ identidad explícita y combinación elegida
Analysis Engine            │
  └─ AnalysisResult ──────┼─► Design Module versionado ─► DesignResult
Catálogos versionados ─────┘
```

- `AnalysisResult ≠ DesignResult`; el índice elástico `η` no se reutiliza
  como ratio de diseño.
- `DesignResult` publica schema, módulo/versión, fuente/hash/página/cláusula,
  identidad de miembro/material/sección/combinación, ecuación, desigualdad,
  variables con unidades y procedencia, sustitución, demanda, resistencia,
  ratio, estado del componente, supuestos, limitaciones y checks ausentes.
- Cambiar ecuación, factor, alcance, cláusula o interpretación exige una
  revisión nueva. Una edición futura convive con la actual; no reinterpreta
  resultados anteriores silenciosamente.
- El RFC canónico está en
  `docs/architecture/structureco-design-module-rfc.md`.

## Alcance fail-closed

T1 sólo calcula ratio cuando coinciden todas estas condiciones:

1. `AnalysisResult` exitoso y `reliable`;
2. combinación seleccionada `ultimate`, CDMX, edición 2023 y con fuente/URL;
3. miembro `truss` con demanda axial positiva y sin cortante/momento relevante;
4. `materialOrigin='catalog'` y `materialId='steel-a992'`;
5. `sectionOrigin='catalog'`, sección AISC tipo I y ID conocido;
6. el área numérica del miembro coincide con la sección identificada.

La coincidencia numérica de `E`, `A`, `I` o `Fy` nunca inventa identidad. Un
frame, una combinación de servicio, análisis limitado, compresión, propiedades
divergentes o identidad custom quedan `unavailable` sin ratio.

## Casos independientes

El caso manual no invoca el solver:

```text
A = 5380 mm²
Fy = 345 MPa
Rt,y = 0.90 × 345 MPa × 5380 mm² = 1670.49 kN
```

- `Pu = 835.245 kN` → ratio `0.50`, componente dentro, global `incomplete`.
- `Pu = 2000 kN` → ratio `1.197253...`, componente fuera, global
  `incomplete`.
- La integración usa fixtures de `AnalysisResult` y comprueba que proyecto y
  resultado de análisis quedan byte a byte iguales.

## Interfaz

Resultados conserva sus lecturas de análisis e índice elástico. Debajo se
presenta una tarjeta independiente con `data-result-kind="design"`, identidad
de norma/cláusula, sustitución y ratio cuando aplica, y “No concluyente” siempre
visible. Cuando falta una puerta de entrada, la tarjeta explica la acción
necesaria y no publica ratio.

La UI está en español e inglés y no usa “cumple”, “seguro”, “aprobado” ni `η`
como conclusión normativa.

## Evidencia ejecutada

- RED inicial: los dos suites focales fallaron porque el módulo y la tarjeta
  todavía no existían.
- Núcleo + UI: **2 archivos, 11/11 PASS**.
- Integración ampliada de resultados, combinaciones y migración:
  **7 archivos, 99 PASS y 3 skip declarados**.
- TypeScript: `tsc -b --noEmit` **PASS**.
- Lint: salida 0; conserva 6 warnings preexistentes fuera de CRI-45.
- Documentación: `verify:docs` **PASS**, 5 documentos canónicos.
- Frontera protegida: `verify:protected` **PASS**, 40 archivos.
- Build productivo: **PASS**, 2,650 módulos.
- Browser oracle `qa:results-cards`: **X2 light/dark, M1, K0,
  K0-landscape e inglés K0 PASS**; tarjeta separada, fail-closed, sin overflow
  y sin regresiones en dense, foco o Datasheet.
- Captura focal K0:
  `reports/evidence/2026-08-17-cri-101-results-cards-dense/design-card-k0-english.png`.

`verify:protected` detectó que la baseline todavía no registraba dos módulos
ya publicados por CRI-43 y CRI-44. Se auditó el diff protegido contra
`origin/main`, que fue vacío, y se agregaron exactamente los hashes de
`src/data/loadCombinationStandards.ts` y `src/data/personalSections.ts`; ningún
hash existente se cambió.

## Archivos tocados

- `docs/architecture/structureco-design-module-rfc.md` — decisión canónica,
  fuente, versionado, alcance, casos y gates.
- `docs/README.md` y `docs/architecture/README.md` — índices del RFC.
- `src/design/types.ts` — contrato separado de `DesignResult`.
- `src/design/ntcSteel2023.ts` — dataset inmutable, evaluador puro, puertas de
  integración y resumen.
- `src/design/ntcSteel2023.test.ts` — casos manuales, inmutabilidad e identidad.
- `src/features/design/NtcSteelDesignCard.tsx` y
  `src/features/design/ntcSteelDesignCard.css` — presentación bilingüe y
  responsive.
- `src/features/design/NtcSteelDesignCard.test.tsx` — copy, estados y
  separación.
- `src/features/results/ResultSummary.tsx` — composición de la región separada.
- `scripts/qa-results-cards.mjs` — oracle X2/M1/K0 y captura focal.
- `scripts/protected-baseline.sha256` — registro de dos archivos protegidos ya
  publicados, sin modificar sus contenidos.
- `reports/2026-08-24-cri-45-design-module.md` — este expediente.

## Cómo verificar

```powershell
npm.cmd exec -- vitest run src/design/ntcSteel2023.test.ts src/features/design/NtcSteelDesignCard.test.tsx src/features/results/ElasticDemandCard.test.tsx src/features/results/elasticDemand.test.ts src/features/results/ResultsPanel.test.tsx src/data/loadCombinationStandards.test.ts src/data/migrate.test.ts --maxWorkers=1 --pool=threads --no-file-parallelism --reporter=verbose
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run qa:results-cards
npm.cmd run verify:docs
npm.cmd run verify:protected
git diff --check
```

## Pendiente y exclusiones

El cierre de CRI-45 no implementa fractura neta, block shear, conexiones,
excentricidad, flexotensión, compresión, pandeo, flexión, cortante,
interacciones, secciones personales ni materiales fuera del slice. Esos
estados requieren fuente, variables y casos propios antes de ampliar el
módulo.

No se modificaron solver, matrices, signos, unidades base, topología,
`ProjectModel`, workers/protocolo, persistencia, projectRepository,
import/export, undo/redo ni formatos de resultado. La siguiente tarea vigente
es CRI-47; no se inició dentro de este cambio.
