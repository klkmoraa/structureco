# CRI-43 — combinaciones de carga versionadas y trazables

**Fecha:** 2026-08-24 11:33 CST
**Agente:** Codex
**Rama:** `codex/linear-queue-execution-20260824`
**SHA base auditado:** `3d98062093e05bbb2faca9e8b2e5ca1a63adaa46`

## Qué cambió

Se creó un módulo de datos normativos separado del `Analysis Engine`. El primer
dataset genera borradores reproducibles y trazables para un alcance deliberado
de la NTC CDMX 2023. No inserta combinaciones en el proyecto, no analiza y no
certifica seguridad.

## Decisiones previas obligatorias

| Decisión | Contrato adoptado |
|---|---|
| Norma, edición y jurisdicción | Norma Técnica Complementaria sobre Criterios y Acciones para el Diseño Estructural de las Edificaciones, Ciudad de México, edición publicada el 6 de noviembre de 2023. |
| Razón de selección | Slice de producto explícito: el ejemplo actual ya presenta una plantilla NTC CDMX y existe fuente oficial pública verificable. No se infirió la norma por el país del usuario. |
| Materiales y familias | Material-agnostic; sólo edificaciones clasificadas por un profesional como Grupo B. |
| Acciones incluidas | Exactamente un caso permanente desfavorable y un caso variable con intensidad máxima. |
| Falla | Factores 1.3 permanente y 1.5 variable; referencias 2.3.1(a) y 3.4.1(a). |
| Servicio | Factores unitarios; referencias 2.3.1(a), 3.3.2 y 3.4.1(d). |
| Convención | Factores adimensionales aplicados a efectos ya expresados en las unidades consistentes del proyecto. No hay conversión de unidades. |
| Nombre/identidad | Dataset y receta tienen IDs estables; cada borrador incluye revisión del dataset, receta y IDs de casos en `draftId`. |
| Primer slice | Sólo genera borradores puros e inspeccionables. No presenta una UI nueva, no aplica a `ProjectModel` y no invoca el solver. |

## Fuente normativa

Fuente primaria permitida:

- **Gaceta Oficial de la Ciudad de México · Normas Técnicas Complementarias
  2023**.
- URL oficial:
  `https://data.consejeria.cdmx.gob.mx/portal_old/uploads/gacetas/b3c4f4ff37241d0a93cc6742a8b0bf2f.pdf`
- SHA-256 del PDF recuperado el 2026-08-24:
  `293f22316a59ec2ec64d1f64f0749f49ba8849ded15b289cd88cc171c55ae62a`.
- Publicación: 2023-11-06; revisión del dataset: 2026-08-24.
- Secciones usadas: 2.3.1(a), 3.3.2, 3.4.1(a) y 3.4.1(d).

La publicación oficial establece las categorías permanente, variable y
accidental; para permanente más variable exige considerar las permanentes y la
variable más desfavorable con intensidad máxima. Para Grupo B fija 1.3 y 1.5
en falla, mientras que servicio usa factor unitario.

## Dataset versionado

`ntc-cdmx-2023-criteria-actions-group-b-pv` usa esquema 1 y revisión
`2026-08-24.1`. Conserva:

- jurisdicción, edición, fecha de publicación y revisión;
- título, URL y hash de la fuente;
- grupo, familia, materiales, cardinalidad e intensidad cubierta;
- receta, estado límite, factores y secciones de procedencia;
- exclusiones explícitas.

El objeto y todos sus descendientes quedan congelados en runtime. Una corrección
normativa no debe sobrescribir una revisión consumida: debe crear una revisión
nueva, conservar la anterior para reproducibilidad y documentar fuente, hash,
motivo y fecha. Si la autoridad publica una fe de erratas, reforma o edición
nueva, el dataset anterior no cambia silenciosamente.

## Borrador frente a combinación aplicada

El resultado del generador es `normative-combination-draft`, no
`LoadCombination`. Incluye factores por ID de caso, procedencia completa y tres
banderas invariantes:

- `requiresProfessionalReview: true`;
- `appliedToProject: false`;
- `safetyCertification: false`.

Esta frontera impide que importar el módulo altere un proyecto o que un factor
generado se presente como revisión reglamentaria. Una tarea posterior deberá
mostrar el borrador, sus supuestos y exclusiones, permitir corregir nombre,
mapeo y factores y obtener confirmación antes de materializar una combinación
mediante el comando reversible vigente.

## Validación independiente

Caso escalar con efecto permanente `P=100` y variable `V=40`:

| Receta | Cálculo independiente | Esperado | Resultado |
|---|---:|---:|---:|
| Falla Grupo B | `1.3×100 + 1.5×40` | 190 | 190 |
| Servicio | `1.0×100 + 1.0×40` | 140 | 140 |

Las pruebas también verifican que:

- el dataset y los borradores sean inmutables;
- la generación no mute los casos de origen;
- los casos permanente y variable existan, sean distintos y tengan la categoría correcta;
- todo efecto referenciado exista y sea finito;
- la procedencia y la revisión sobrevivan completas en cada borrador.

## Alcance excluido

No se cubren:

- edificaciones Grupo A;
- múltiples permanentes o variables, ni intensidades instantáneas/medias;
- acciones favorables o factores 0.9;
- acciones accidentales o factor 1.1;
- viento, sismo, granizo, inundación, incendio, explosión o cimentación;
- combinaciones y verificaciones específicas por material;
- selección de intensidades de carga viva;
- resistencia, servicio detallado, clasificación reglamentaria o certificación;
- UI de aplicación, persistencia o modificación automática del proyecto.

Estos casos no pueden obtenerse por extrapolación de las dos recetas. Cada
ampliación necesita fuente, variables, supuestos y validación propios.

## Política de actualización

1. Aceptar sólo publicación oficial o corrección emitida por la autoridad de la jurisdicción.
2. Descargar la fuente, registrar fecha y SHA-256 y revisar las secciones exactas.
3. Crear una revisión nueva e inmutable del dataset.
4. Añadir un caso independiente con aritmética esperada calculada fuera del generador.
5. Someter contenido y alcance a revisión profesional antes de exponerlo como opción aplicable.
6. Mantener la revisión anterior para que proyectos y expedientes sigan siendo reproducibles.

## Evidencia ejecutada

- TDD focal: RED por módulo ausente; después **1 archivo, 5/5 PASS**.
- Combinaciones/migración/envolventes: **4 archivos, 25/25 PASS**.
- TypeScript: `tsc -b --noEmit` **PASS**.
- Lint: salida 0; conserva 6 warnings preexistentes fuera de los archivos CRI-43.
- Documentación: `verify:docs` **PASS**.
- Hash de la fuente oficial: SHA-256 calculado localmente sobre 55,709,147 bytes.

## Por qué

El modelo vigente ya puede almacenar procedencia y el inspector deja editar
factores. El riesgo real no era añadir más campos al solver, sino separar una
receta normativa identificable de una combinación aceptada por el usuario. El
nuevo módulo fija esa separación sin inventar cobertura.

## Archivos tocados

- `src/data/loadCombinationStandards.ts` — dataset, borradores puros y evaluador de validación.
- `src/data/loadCombinationStandards.test.ts` — fuente, inmutabilidad, mapeo y casos independientes.
- `reports/2026-08-24-cri-43-combinaciones-normativas.md` — decisión, alcance, procedencia y política.

## Cómo verificar

```powershell
npm.cmd exec -- vitest run src/data/loadCombinationStandards.test.ts src/data/migrate.test.ts src/engine/scenarioCoverage.test.ts src/engine/envelope.test.ts --maxWorkers=1 --pool=threads --no-file-parallelism --reporter=verbose
npm.cmd run typecheck
npm.cmd run verify:docs
git diff --check
```

## Pendiente / siguiente paso

CRI-43 entrega dataset y generación, no aplicación. CRI-44 sigue en la cola
vigente y no fue iniciada durante este cambio. CRI-45, que está bloqueada por
CRI-43, podrá consumir estos borradores en una superficie separada del motor,
pero deberá conservar la revisión humana y la confirmación explícita.

No se modificaron `ProjectModel`, migraciones, persistencia, import/export,
workers, Analysis Engine, solver, signos, unidades, resultados ni undo/redo.
