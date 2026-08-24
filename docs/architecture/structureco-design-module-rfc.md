# RFC — módulo de diseño normativo separado

**Clasificación:** `CANONICAL`

**Estado:** aceptado para el slice NTC-Acero-2023-T1
**Fecha:** 2026-08-24
**Decisión:** `ProjectModel → Analysis Engine → AnalysisResult → Design Module → DesignResult`

## Problema

El análisis elástico produce fuerzas, desplazamientos y evidencia de calidad
numérica. No verifica por sí mismo estados límite normativos. El índice
elástico estimado `η` compara una tensión de Navier con un `Fy` de referencia,
pero deliberadamente no contiene factores de resistencia, estados límite,
conexiones ni cláusulas de una norma.

Un módulo de diseño no puede cambiar el significado de `AnalysisResult`,
recalcular dentro del solver ni presentar una lectura parcial como seguridad
estructural. Debe producir un objeto separado, versionado y trazable.

## Decisiones normativas del primer slice

| Decisión | Valor fijado |
|---|---|
| Jurisdicción | Ciudad de México, México |
| Norma | Norma Técnica Complementaria para Diseño y Construcción de Estructuras de Acero |
| Edición | 2023; Gaceta Oficial del 6 de noviembre de 2023 |
| Fuente | Compendio oficial de Normas Técnicas Complementarias de Obras CDMX |
| SHA-256 | `293f22316a59ec2ec64d1f64f0749f49ba8849ded15b289cd88cc171c55ae62a` |
| Ubicación | página PDF 325; página impresa 84; §5.1, §5.2 y §5.3.1 |
| Primera familia | barra `truss`, material catálogo `steel-a992`, sección catálogo AISC tipo I |
| Demanda | envolvente axial positiva de una combinación última con metadata CDMX/2023 |
| Check implementado | componente de fluencia en la sección total, §5.3.1.a |
| Unidades internas | `kN`, `m²`, `kN/m²`; factores adimensionales |
| Estado global | siempre `incomplete` en T1 |

La fuente oficial está en:
<https://www.obras.cdmx.gob.mx/storage/app/media/Normas%20tecnicas/NTC-2023.pdf>.

La NTC limita el capítulo 5 a tensión axial a lo largo del eje centroidal. En
§5.2 exige considerar tanto fluencia en la sección total como fractura en la
sección neta. §5.3.1 define la resistencia del miembro como la menor de ambos
estados y, para el componente de fluencia, establece:

```text
Rt,y = FR · Fy · A
FR = 0.90
```

T1 calcula únicamente ese componente. El catálogo actual no contiene `Fu`,
área neta efectiva, agujeros ni geometría de la conexión; por ello T1 nunca
emite una conclusión de cumplimiento del miembro, aunque el componente de
fluencia quede dentro de su resistencia.

## Arquitectura aceptada

```text
ProjectModel ───────────────┐
                           │ identidad explícita y combinación elegida
Analysis Engine            │
  └─ AnalysisResult ───────┼─► Design Module versionado
                           │     ├─ lee; nunca muta
Catálogos versionados ─────┘     └─ DesignResult efímero

AnalysisResult ≠ DesignResult
η elástico    ≠ ratio de diseño
```

- `AnalysisResult` y `ProjectModel` no incorporan campos de diseño.
- El módulo es una función pura. No persiste, no despacha comandos y no entra a
  workers.
- `materialId`, `sectionId` y sus orígenes deben ser explícitos. Coincidencias
  de `E`, `A`, `I` o `Fy` nunca crean identidad.
- Las propiedades de resistencia salen del dataset normativo y de los catálogos
  identificados. Una divergencia entre el área numérica del miembro y el área
  de su sección identificada bloquea el check.
- Sólo un `AnalysisResult` clasificado `reliable` puede alimentar diseño. Un
  resultado `limited`, `unreliable` o `failed` queda bloqueado, no degradado a
  una conclusión más débil.

## Contrato de `DesignResult`

Cada resultado publicará, como mínimo:

- `schemaVersion`, id y versión del módulo;
- norma, edición, jurisdicción, fecha, URL, hash, página y cláusula;
- miembro, `materialId`, `sectionId` y combinación fuente;
- ecuación y desigualdad evaluada;
- variables con símbolo, valor, unidad y procedencia;
- demanda, resistencia, ratio y estado del componente;
- estado global separado;
- supuestos, limitaciones y checks que faltan.

Para T1:

```text
componentStatus = within-component | outside-component
status          = incomplete
```

`within-component` sólo dice que `Pu ≤ Rt,y` para §5.3.1.a. No significa que
el miembro cumpla la NTC. `outside-component` sí identifica que ese componente
aislado rebasa su resistencia, aunque los demás checks sigan ausentes.

## Puertas de entrada fail-closed

T1 no produce ratio si falla cualquiera de estas condiciones:

1. análisis inexistente o calidad distinta de `reliable`;
2. combinación inexistente, no última o sin metadata CDMX/2023;
3. miembro inexistente o distinto de `truss`;
4. demanda sin tensión positiva o con cortante/momento incompatible;
5. material sin origen/ID de catálogo o distinto de `steel-a992`;
6. sección sin origen/ID de catálogo, no AISC o no tipo I;
7. área de miembro no finita/positiva o divergente del perfil identificado.

No hay selección por cercanía numérica ni valores de reserva.

## Separación de interfaz

Resultados conserva sus lecturas de análisis e índice elástico. Debajo aparece
una región independiente con:

- rótulo “Diseño normativo separado”;
- identidad de `DesignResult`, norma y cláusula;
- estado global “No concluyente” siempre visible;
- componente, sustitución y ratio sólo cuando todas las puertas pasan;
- lista visible de checks ausentes;
- mensaje accionable cuando el alcance inicial no aplica.

La interfaz no usa “cumple”, “seguro” ni “aprobado”. Tampoco reutiliza `η` como
ratio normativo.

## Casos independientes mínimos

Con `A = 5380 mm²`, `Fy = 345 MPa` y `FR = 0.90`:

```text
Rt,y = 0.90 × 345 MPa × 5380 mm² = 1670.49 kN
```

- `Pu = 835.245 kN` produce ratio `0.50` y componente dentro.
- `Pu = 2000 kN` produce ratio `1.197253...` y componente fuera.
- ambos conservan estado global `incomplete`.
- identidad numéricamente coincidente pero `custom` queda bloqueada.
- combinación de servicio, frame, análisis no confiable o área divergente
  quedan bloqueados sin ratio.

Los casos manuales no invocan el solver. Las pruebas de integración entregan un
`AnalysisResult` fixture y comprueban que permanece byte a byte igual.

## Versionado y actualización

- Dataset: `ntc-cdmx-2023-steel-tension-gross-yielding`.
- Revisión inicial: `2026-08-24.1`.
- Cualquier cambio de ecuación, factor, alcance, cláusula o interpretación crea
  una revisión nueva y nuevos casos de referencia.
- Correcciones editoriales que no cambian resultados también registran revisión
  y motivo.
- Una edición normativa nueva convive con la anterior; nunca reinterpreta un
  `DesignResult` existente en silencio.
- La fecha de revisión profesional y el hash de fuente son parte del dataset,
  no texto suelto de la UI.

## Fuera de alcance

- fractura de sección neta efectiva y block shear;
- agujeros, conexiones, excentricidad y flexotensión;
- compresión, pandeo, flexión, cortante o interacciones;
- secciones personales, importadas, legacy o catálogo no AISC-I;
- materiales distintos de `steel-a992`;
- combinaciones de servicio, viento, sismo o accidentales;
- certificación, seguridad global o revisión profesional automática.

Agregar cualquiera de estos puntos exige otro slice con fuente, variables,
casos independientes y estados globales propios.

## Gates de cierre de T1

1. Casos manuales y puertas fail-closed en verde.
2. `DesignResult` reproducible y distinto de `AnalysisResult`.
3. UI bilingüe y responsive que conserve “No concluyente”.
4. Prueba de que el solver, workers, `ProjectModel`, persistencia y formatos no
   cambiaron.
5. `verify:protected`, typecheck, lint, build y QA focal de resultados.
