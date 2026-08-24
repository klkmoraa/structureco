# CRI-44 — Section Builder paramétrico

**Fecha:** 2026-08-24 12:06 CST
**Agente:** Codex
**Rama:** `codex/linear-queue-execution-20260824`
**SHA base auditado:** `bd2140d39d70e03d478de5a25d24eea9b7c2f30a`

## Qué cambió

Biblioteca incorpora un Section Builder bilingüe para crear, revisar,
previsualizar, duplicar, borrar, exportar e importar secciones personales. La
geometría, propiedades, identidad, revisión y versión de fórmulas viven en un
almacenamiento separado del catálogo y de los proyectos.

El builder no aplica todavía una sección a miembros. Esa frontera conserva el
contrato vigente: `sectionId` sigue significando exclusivamente una identidad
seleccionada del catálogo integrado; una sección personal nunca se hace pasar
por perfil comercial mediante coincidencia de números.

## Contrato adoptado

| Tema | Decisión |
|---|---|
| Familias iniciales | Rectangular sólida, circular sólida, I doblemente simétrica y caja rectangular de espesor uniforme. |
| Simetría | Todas las familias iniciales son simétricas respecto de sus ejes centroidales X/Y. No se calculan centroides desplazados ni ejes principales rotados. |
| Unidades internas | Metros, m², m³ y m⁴. |
| Entrada/presentación | Longitudes en la unidad activa del proyecto; propiedades convertidas con el contrato existente de `units.ts`. |
| Límites generales | Cada dimensión debe ser finita y estar entre 0.001 m y 10 m. |
| Límites I | `tw < b` y `2tf < h`. |
| Límites caja | `2t < min(b,h)`; el hueco interior debe ser positivo. |
| Propiedades | `A`, `Ix`, `Iy`, `Wx`, `Wy`, `rx`, `ry`. |
| No calculado | Torsión `J`, alabeo, propiedades plásticas, cortante, pandeo local, radios de esquina, soldaduras, material, masa o capacidad. |
| Fórmulas | `section-properties-v1`, guardada y verificada en cada registro. |
| Identidad | `personal-section:<uuid>` estable, `revision` incremental y `kind=personal-parametric-section`. |
| Catálogo | `standardSections` permanece inmutable e independiente. El registro personal no contiene `sectionId`. |
| Persistencia | Envelope `structureCo.personal-sections.v1`, separado de `structureCo.project` y de favoritos. |
| Import/export | JSON schema 1; la importación rechaza IDs/nombres repetidos, familias/versiones futuras, geometría inválida y propiedades derivadas manipuladas. |

## Ecuaciones versionadas

Con `b` ancho, `h` peralte, `d` diámetro, `tw` alma, `tf` patín y `t`
espesor uniforme:

### Rectangular sólida

- `A = b h`
- `Ix = b h³ / 12`
- `Iy = h b³ / 12`

### Circular sólida

- `A = π d² / 4`
- `Ix = Iy = π d⁴ / 64`

### I simétrica

- `hw = h - 2tf`
- `A = 2b tf + hw tw`
- `Ix = [b h³ - (b - tw) hw³] / 12`
- `Iy = 2(tf b³ / 12) + hw tw³ / 12`

### Caja rectangular

- `bi = b - 2t`, `hi = h - 2t`
- `A = b h - bi hi`
- `Ix = (b h³ - bi hi³) / 12`
- `Iy = (h b³ - hi bi³) / 12`

Para todas las familias: `Wx=Ix/(h/2)`, `Wy=Iy/(b/2)`,
`rx=√(Ix/A)` y `ry=√(Iy/A)`; para el círculo `b=h=d`.

## Identidad y reproducibilidad

Crear produce revisión 1. Editar conserva el ID, incrementa revisión y vuelve
a calcular propiedades. Duplicar crea un ID y revisión nuevos. La exportación
conserva definición y propiedades resueltas. Al importar, las propiedades se
recalculan con la versión declarada y deben coincidir con el expediente; el
builder no corrige silenciosamente un JSON manipulado.

La separación explícita es:

- catálogo: `sectionOrigin='catalog'` + `sectionId` conocido;
- personal: `kind='personal-parametric-section'` + `id` + `revision`;
- números manuales del miembro: `sectionOrigin='custom'`, sin identidad inventada.

Datasheet, Inspector y generadores siguen usando sólo las dos rutas vigentes de
miembro: identidad de catálogo explícita o números custom. CRI-44 valida esa
frontera, pero no modifica esas superficies ni materializa una sección personal
en `ProjectModel`.

## UI y mensajes

El editor presenta campos por familia, unidad visible, preview SVG a proporción
y propiedades derivadas mientras se escribe. Geometría no finita, fuera de
rango o autointersectada produce un error con ruta de campo y no se persiste.

Mensajes de guardado, revisión, duplicado, borrado, importación y fallo de
storage dicen explícitamente que el proyecto no cambió. La biblioteca personal
conserva su flujo anterior y el builder aparece como bloque separado.

## Evidencia ejecutada

- Núcleo + UI + biblioteca existente: **4 archivos, 22/22 PASS**.
- Contratos Datasheet/generadores/migración dentro de la corrida focal ampliada:
  **7 archivos, 62/62 PASS**.
- Inspector + comandos de identidad/reversibilidad: **2 archivos, 26/26 PASS**.
- TypeScript: `tsc -b --noEmit` **PASS**.
- Lint: salida 0; conserva 6 warnings preexistentes fuera de CRI-44.
- Build productivo: **PASS**, 2,647 módulos.
- Browser oracle `qa:personal-library`: **X2/M1/K0 PASS**, sin errores de
  consola ni overflow; en K0, editor y biblioteca tienen 0 targets menores de
  44 px.
- En los tres presets, guardar favoritos y una sección dejó
  `structureCo.project` exactamente igual; conteos: 2 favoritos + 1 sección.

Durante la verificación el primer oracle K0 encontró controles de 38 px; se
subieron a 44 px. La inspección visual posterior encontró que un selector SVG
escalaba también los iconos de acciones; se limitó al preview directo. El oracle
final y las capturas posteriores corresponden al estado corregido.

## Por qué

El criterio de cierre exige propiedades verificables e identidad estable sin
reescribir proyectos. Guardar la definición y las propiedades calculadas en un
envelope personal versionado permite reproducir y detectar manipulación, a la
vez que evita convertir una coincidencia `A/I` en un perfil comercial falso.

## Archivos tocados

- `src/data/personalSections.ts` — contrato, ecuaciones, validación, identidad y envelope.
- `src/data/personalSections.test.ts` — propiedades independientes, límites y round-trip.
- `src/features/library/SectionBuilder.tsx` — editor, previews, propiedades y lifecycle.
- `src/features/library/SectionBuilder.test.tsx` — UI bilingüe, revisión, errores e import/export.
- `src/features/library/PersonalLibraryView.tsx` — composición del builder en Biblioteca.
- `src/features/library/personalLibrary.css` — layouts X2/M1/K0 y targets táctiles.
- `scripts/qa-personal-library.mjs` — oracle del editor, persistencia separada y responsive.
- `reports/2026-08-24-cri-44-section-builder.md` — contrato y evidencia.

## Cómo verificar

```powershell
npm.cmd exec -- vitest run src/data/personalSections.test.ts src/features/library/SectionBuilder.test.tsx src/features/library/PersonalLibraryView.test.tsx src/features/library/personalLibrary.test.ts src/features/datasheet/datasheetEditApply.test.ts src/data/generators/generatorProperties.test.ts src/data/migrate.test.ts --maxWorkers=1 --pool=threads --no-file-parallelism --reporter=verbose
npm.cmd exec -- vitest run src/features/inspector/SectionViewer2D.test.tsx src/commands/projectCommand.test.ts --maxWorkers=1 --pool=threads --no-file-parallelism --reporter=verbose
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run qa:personal-library
npm.cmd run verify:docs
git diff --check
```

## Pendiente / siguiente paso

CRI-44 cierra el builder y su biblioteca, no la aplicación a miembros. Una
tarea futura de dominio deberá decidir cómo una revisión personal se incrusta o
referencia de forma portable antes de tocar Datasheet, Inspector, generadores o
proyectos existentes.

La siguiente posición vigente es CRI-46. No se inició CRI-45 durante este
cambio aunque ya está desbloqueada, porque el orden canónico coloca CRI-46
primero.

No se modificaron catálogo integrado, `ProjectModel`, projectRepository,
migraciones, import/export de proyecto, workers, Analysis Engine, solver,
signos, unidades base, topología, resultados ni undo/redo.
