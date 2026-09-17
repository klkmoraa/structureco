# Five Next Major Improvements · Studio Control Loop

**Clasificación:** `REFERENCE`

**Fecha:** 2026-09-16  
**Estado:** autorizado para implementación por el encargo de producto  
**Alcance:** superficies de revisión, composición del lienzo y estudios analíticos bajo demanda

## Objetivo

Cerrar el ciclo entre modelar, validar, comparar y revisar una estructura sin
crear una segunda autoridad de datos. La entrega añade cinco capacidades
visibles que reutilizan `ProjectModel`, `AnalysisResult`, Model Doctor,
`editorLayers` y los workers actuales. El explorador de sensibilidad es el
único cálculo nuevo: resuelve copias efímeras del modelo y nunca escribe en el
proyecto ni altera el solver.

## Decisiones de producto

### 1. Radar de salud del modelo

El lienzo mostrará un beacon compacto con tres estados: listo, atención y
bloqueado. El estado se deriva de `buildModelDoctorReport(project)` y, cuando
existe una corrida, de `resolveReliability(analysis)`. El beacon incluirá la
cantidad de hallazgos críticos y advertencias, será accesible por teclado y
abrirá el Model Doctor mediante `open-model-doctor`. No duplicará reglas de
validación ni permitirá reparar automáticamente una condición.

### 2. Modos rápidos del lienzo

`CanvasFocusModes` ofrecerá Modelar, Cargas, Resultados y Revisión. Cada modo
aplica un estado completo de `EditorLayerState`, no una lista de toggles
acumulativos: así una persona puede volver a una composición conocida. El modo
Revisión mostrará modelo, cargas, resultados, etiquetas y diagnósticos; los
modos no tocan coordenadas ni propiedades del modelo. La tira será horizontal
en tablet/móvil y seguirá la dirección visual Studio.

### 3. Navegador de escenarios

La comparación de casos y combinaciones pasará de una hilera de tarjetas a un
navegador compacto con estado, cobertura y valores gobernantes N/V/M. Los
escenarios fallidos conservarán su causa visible; nunca contribuirán a una
envolvente. Las combinaciones tendrán una acción `Usar` que actualiza el
escenario elegido y lanza el análisis principal existente. Los casos de carga
se mostrarán como evidencia comparativa, pero no fingirán que son la corrida
activa del panel principal.

### 4. Explorador de sensibilidad

Después de un análisis, la tarjeta permitirá seleccionar un miembro y E, A o I.
Al ejecutar, resolverá tres copias: valor base, −10% y +10%. Publicará el
máximo absoluto de momento, cortante, axial y desplazamiento vertical cuando
estén disponibles, además del porcentaje de cambio. Un miembro con I=0 no
estará disponible para la sensibilidad de I. El estudio se ejecutará en un
worker propio de la superficie, con fallback diferido para entornos sin
Worker. Un fallo de una variante será visible como “no disponible”; no se
rellenará con interpolación.

### 5. Tablero de preparación para revisión

`ReviewReadinessCard` reunirá cuatro comprobaciones: salud del modelo, resultado
actual, cobertura de escenarios y comprobación numérica. Cada fila será
`ready`, `attention`, `blocked` o `pending`, con su razón y acción existente
cuando corresponda. El tablero no certificará seguridad ni cumplimiento
normativo, no creará un formato portable nuevo y no guardará una revisión por
su cuenta.

## Arquitectura y flujo de datos

```text
ProjectModel ───────────────┐
                            ├─ buildModelHealth ── beacon + review card
Model Doctor report ────────┘

AnalysisResult ── summarize / reliability ── scenario navigator + review card
       │
       └─ SensitivityCard ── sensitivity.worker ── ephemeral study result

EditorLayerState ── CanvasFocusModes ── CanvasChrome ── StructuralCanvas
```

- Los nuevos view-models se mantendrán en `src/features/**` y leerán contratos
  existentes. No se modifica `src/types.ts`, `src/store/ProjectContext.tsx`,
  `src/engine/**` ni `src/workers/**`.
- `SensitivityCard` usará `analyzeProject` sólo dentro de las copias creadas
  por `runSensitivityStudy`; el worker se invalida al cambiar la firma del
  proyecto o la combinación.
- Las cadenas nuevas tendrán entradas equivalentes en español e inglés y
  pasarán los verificadores de i18n.
- Los modos del lienzo son estado de presentación persistido en la preferencia
  de capas existente; no forman parte de `ProjectModel`.

## Archivos y límites

### Crear

- `src/features/model-health/modelHealth.ts` y `ModelHealthBeacon.tsx`.
- `src/features/canvas/CanvasFocusModes.tsx`.
- `src/features/results/scenarioNavigator.ts` y `ScenarioNavigator.tsx`.
- `src/features/sensitivity/sensitivity.ts`, `sensitivity.worker.ts`,
  `useSensitivityStudy.ts`, `SensitivityCard.tsx` y `sensitivity.css`.
- `src/features/review/reviewReadiness.ts`, `ReviewReadinessCard.tsx` y
  `reviewReadiness.css`.
- Pruebas unitarias y de componente junto a cada superficie.

### Modificar

- `CanvasChrome.tsx`, `StructuralCanvas.tsx` y `editorLayers.ts` para conectar
  beacon, modos y preset de revisión.
- `ResultSummary.tsx`, `results.css` y catálogos `es/en-results.ts` para
  integrar navegador, sensibilidad y tablero.
- Catálogo de workspace/canvas si los textos se comparten con la tira del
  lienzo.
- `reports/2026-09-16-five-next-major-improvements.md` con evidencia de la
  entrega.

## Manejo de errores

- Hallazgos de Model Doctor siguen siendo la fuente de verdad y respetan sus
  niveles; un error crítico bloquea la lectura de “listo”.
- El navegador conserva escenarios no resolubles y muestra la causa del motor
  sin traducirla de forma engañosa; el fallback inglés usa el copy existente.
- El explorador distingue worker no disponible, variante no resoluble y estudio
  cancelado. Una respuesta vieja se descarta comparando un contador de petición
  y la firma del modelo.
- El tablero nunca convierte “pendiente” o “no verificable” en “aprobado”.

## Verificación y aceptación

- Pruebas primero para los view-models y componentes nuevos.
- `pnpm run typecheck`, `pnpm run build`, `pnpm run lint`, `pnpm run verify:styles`,
  `pnpm run verify:i18n`, `pnpm run verify:protected` y las pruebas focalizadas
  de canvas/resultados/model-health/sensitivity/review.
- Revisión visual puntual del workspace en Chromium en escritorio y móvil para
  comprobar beacon, modos, navegador y tarjetas sin overflow.
- La suite completa queda fuera de esta entrega salvo que el gate remoto la
  ejecute; no se afirma que fue corrida localmente.
- GitHub se actualiza mediante fast-forward/no-force en `main`. GitHub Pages se
  publica por el workflow existente al recibir `main`; se verifica el SHA de
  `main`, el SHA de `gh-pages` y el resultado del deployment.

## No objetivos

- Cambiar ecuaciones, resultados numéricos, unidades, signos, topología,
  workers existentes, persistencia, import/export o undo/redo.
- Introducir buckling/dinámica/shells adicionales, colaboración, cuentas,
  backend, firma de identidad o un paquete de revisión portable nuevo.
- Añadir dependencias o telemetría del contenido del proyecto.
