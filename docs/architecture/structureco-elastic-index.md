# Índice elástico estimado (η) — contrato vigente

**Clasificación:** `CANONICAL`

Contrato de la lectura de demanda elástica de StructureCo (`src/features/results/elasticDemand.ts`)
tras CRI-42. Recoge qué significa η, qué **no** significa, cuándo puede publicarse
y por qué las tres superficies que lo muestran —Resumen, Inspector y lienzo— no
pueden contradecirse.

## Qué es η

η es una **estimación orientativa y trazable** de cuánta tensión normal elástica
tiene un miembro respecto del límite elástico declarado de su material:

```text
N*  →  A  →  M*  →  W  →  σ*  →  Fy  →  η

σ* = |N*| / A + |M*| / W
η  = σ* / Fy
```

- `N*` y `M*` son los **máximos absolutos de la envolvente** del miembro
  (`max(|maxAxial|, |minAxial|)` y `max(|maxMoment|, |minMoment|)`).
- `A` es el área del miembro tal y como la usa el solver.
- `W` es `sectionModulusX` del perfil de catálogo identificado.
- `Fy` es `yieldStrength` del material de catálogo identificado.

Todas las magnitudes viven en las unidades base internas (kN, m ⇒ kN/m²). El
sistema de unidades visible es presentación pura y **no puede alterar η**.

## Qué NO es η

- **No es una verificación normativa.** No hay φ ni Ω, ni AISC/LRFD/ASD, ni
  pandeo, ni LTB, ni interacción P-M de código, ni resistencia de sección. Eso
  pertenece al futuro módulo de diseño por norma (CRI-45), separado del Analysis
  Engine.
- **No es un factor de seguridad.** Se publica η, nunca 1/η: un «factor» invita a
  leerse como el coeficiente de una norma.
- **No es una declaración de seguridad estructural.** No existe el estado `safe`
  ni copy equivalente («seguro», «aprobado», «pasa», «salud»).
- **η = 1 no es «falla».** Significa exactamente que la estimación alcanza el Fy
  declarado del material, y nada más.

## Cuándo se publica η

Regla dura: **η sólo se publica cuando cada dato que lo forma es verificable.**
Un dato ausente produce `unavailable` con el nombre exacto de lo que falta;
nunca un ratio fabricado.

| Requisito | Fuente admitida | Si falta |
|---|---|---|
| `Fy` | `materialId` con `materialOrigin === 'catalog'` | `gap: 'yield-strength'` |
| `W` | `sectionId` con `sectionOrigin === 'catalog'` | `gap: 'section-modulus'` |
| Sección utilizable | miembro no rígido con `A > 0` | `gap: 'section-geometry'` |
| Confiabilidad | `reliability.level` ∈ {`reliable`, `limited`} | `blocker: 'unreliable'` |

Lo que se eliminó en CRI-42 y **no debe volver**:

- **`Fy = 250 MPa` de reserva.** Publicaba un η con apariencia de medida sobre un
  material que el producto no reconocía.
- **`W` del rectángulo equivalente `h = √(12·I/A)`.** Deducía un módulo elástico
  que el usuario no podía rastrear hasta ningún perfil real.
- **Inferencia por coincidencia numérica.** Igualar en `E`, `A` o `I` con una
  entrada del catálogo no es identidad; sólo el id explícito lo es (CRI-34).

## `success ≠ reliable ≠ safe`

Tres preguntas distintas, tres respuestas separadas por construcción:

- `analysis.success` — ¿terminó el cálculo?
- `reliability.level` — ¿cuánto puede confiarse en los números? (`src/engine/reliability.ts`)
- η — ¿cuánta demanda elástica estimada hay? **Nunca** ¿es seguro?

`elasticDemandGate` es la única puerta:

- `reliable` → η se publica como lectura ordinaria.
- `limited` → η se publica **marcada como limitada**, con su nota visible. No es
  un resultado ordinario.
- `unreliable` / `failed` → η **no se publica**; la superficie muestra el estado
  «No disponible» y el motivo.

## Umbrales y escala

- **No hay umbral en 0,85.** El corte anterior no tenía derivación técnica
  documentada y funcionaba como un umbral de aviso normativo que esta lectura no
  puede sostener.
- La única referencia con significado propio es **η = 1**, y sólo significa
  «alcanza el Fy declarado».
- `elasticIndexBand` produce `low` / `moderate` / `high` / `at-reference`. Son
  **bins de magnitud** en tercios exactos de la referencia, existen para nombrar
  en texto lo que el color dice de forma continua, y **no son umbrales de
  aceptación**.
- `elasticIndexColor` es una **rampa secuencial** de una sola familia
  (`--sc-color-demand-base` → `--sc-color-demand-peak`), más un tono aparte para
  la referencia (`--sc-color-demand-reference`). El semáforo verde/ámbar/rojo
  anterior codificaba un juicio de seguridad y desapareció.

## Envolvente conservadora

`N*` y `M*` pueden proceder de **secciones distintas** del mismo miembro.
Sumarlos es el caso más desfavorable posible, no la tensión real de ningún punto,
y así se etiqueta en todas las superficies. La lectura de un corte concreto
(`sectionElasticIndex`) sí usa los `N` y `M` de esa estación.

## Una sola fuente para tres superficies

```text
elasticDemand.ts
├── elasticDemandView(project, analysis)      → Resumen (ElasticDemandCard) + lienzo (mapa de demanda)
├── memberElasticIndexView(member, result, …) → Inspector (InspectorNarrativeCard)
└── sectionElasticIndex(member, N, M)         → corte contextual del lienzo
```

Ninguna superficie define umbrales, colores ni semántica propios. Un miembro sin
η publicable no entra en el mapa de demanda: conserva su trazo técnico en lugar
de recibir un color inventado.

## Accesibilidad

- El riel de magnitud es **decorativo** (`aria-hidden="true"`). No usa
  `role="meter"`: η puede superar 1 y el contrato ARIA de `meter` exige
  `aria-valuenow ≤ aria-valuemax`, así que el medidor anterior publicaba un
  contrato imposible.
- El valor (`η 0.52 · 52 % de Fy de referencia`) y la banda van en **texto**, de
  modo que no hay información que dependa sólo del color.
- La banda se redunda además en forma: estilo de borde en la píldora, textura del
  relleno al alcanzar la referencia y `stroke-dasharray` en el lienzo.
- Los tres tokens de la rampa cumplen ≥ 3:1 contra el lienzo en Día y Noche,
  verificado en `src/design-system/tokens.test.ts`.

## Qué falta

Una comprobación por norma real —con criterio, código y estado «no evaluado»
cuando el check no puede ejecutarse— es CRI-45 y **no pertenece a este módulo**.

## Verificación

```bash
npx vitest run src/features/results src/features/inspector src/design-system --maxWorkers=1
```
