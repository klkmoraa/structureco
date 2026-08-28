# Aula vNext — explicación anclada a resultados reales

**Clasificación:** `REFERENCE`

**Estado:** diseño de producto para implementación futura. CRI-18 no autoriza implementar esta especificación.

## Decisión

Aula vNext será una capa de explicación invocada desde un resultado real. Abrirá la vista `learn` de la superficie densa existente, conservará el contexto del Workspace y explicará el valor seleccionado con tres profundidades: **Lectura**, **Causa** y **Verificación**.

No será un curso lineal obligatorio, un examen, un chat, un sistema de puntos ni un segundo modo de cálculo. Las predicciones, quizzes y conclusiones pueden existir después como actividades optativas, pero nunca bloquean el análisis ni el acceso a resultados.

La experiencia usa el mismo `ProjectModel` y el mismo `AnalysisResult` que Results. Una explicación sólo puede afirmar lo que pueda resolver hacia una fuente concreta del análisis. Cuando no exista evidencia suficiente, muestra esa limitación y una siguiente acción; no completa la historia con inferencias.

## Autoridad y límites

Este documento complementa la especificación visual canónica `2026-08-22-structureco-total-visual-redesign.md`, cuya decisión de aplazar el interior de Aula sigue vigente hasta que se implemente un slice de este diseño. El código y las pruebas actuales siguen siendo la autoridad del comportamiento implementado.

No se modifican con CRI-18:

- solver, formulación, signos, unidades ni resultados;
- IDs, topología, `ProjectModel`, persistencia de proyecto o formatos;
- workers, importación, exportación, undo/redo o selección;
- broker de superficies ni composición X2/M1/K0;
- contenido normativo o reglamentario;
- CRI-39 como feature separada: su pregunta «¿por qué gobierna?» vive dentro de este contrato.

## Brief de producto

### Personas y momentos

1. **Estudiante que está construyendo un modelo.** Necesita saber qué falta para analizar y, después, conectar el diagrama con el miembro y las cargas que ya dibujó.
2. **Persona que ya obtuvo un resultado.** Entiende la magnitud general, pero quiere localizar el valor, confirmar caso/combinación y seguir una explicación verificable.
3. **Docente o revisor.** Quiere recorrer la misma evidencia que ve el estudiante, sin una respuesta opaca ni una calificación automática.
4. **Profesional que vuelve a un concepto.** Entra desde Results a una explicación breve y regresa al punto exacto sin abandonar su tarea.

Los momentos principales son: modelo aún incompleto, análisis fallido, primera lectura de resultados, valor extremo, discontinuidad, cambio de caso/combinación, confiabilidad limitada y revisión del método.

### Problemas que resuelve

- Results puede decir **qué** valor existe, pero la lectura educativa necesita conectar ese valor con objeto, posición, escenario, signo, acciones participantes y evidencia de cálculo.
- El recorrido actual guía construir–definir–analizar–comparar–concluir, pero no parte del dato específico que despertó la duda.
- `LearnView` contiene material valioso, aunque hoy abre un explorador amplio antes de responder «¿qué estoy viendo aquí?».
- La predicción heredada introduce fricción y puede convertir una consulta en examen; no debe ser puerta de acceso.
- Una explicación genérica puede sonar correcta y aun así no corresponder al análisis visible. Aula necesita una referencia verificable, no sólo texto pedagógico.

### Resultado deseado

Una persona puede elegir un valor en Results, abrir **Entender este resultado**, identificar sin ambigüedad qué se calculó y dónde, profundizar hasta la evidencia disponible y volver al mismo contexto del Workspace.

Se considera éxito de producto cuando:

- el primer bloque responde valor, unidad, objeto, posición, escenario y convenio de signo sin pedir otra interacción;
- cada cifra educativa procede del `AnalysisResult` vigente o se marca como no disponible;
- volver conserva selección, cursor de resultado y superficie de origen;
- ninguna actividad educativa impide analizar o leer resultados;
- el lenguaje diferencia dato, interpretación pedagógica, verificación y límite de evidencia.

## Enfoques considerados

| Enfoque | Ventaja | Riesgo | Decisión |
|---|---|---|---|
| Explicación anclada al resultado | Responde la duda en contexto, reutiliza `dense/learn` y permite rastrear la fuente | Requiere un contrato estricto para posiciones y escenarios | **Elegido** |
| Lección lineal construir → predecir → resolver | Da estructura a principiantes y reutiliza el recorrido actual | Puede sentirse como examen y obliga a recorrer contenido no solicitado | Se conserva sólo como journey alterno y optativo |
| Biblioteca de cursos y temas | Escala a contenido editorial independiente | Separa la teoría del modelo real y exige gobierno de contenido prematuro | Futuro, fuera del flujo principal |

La elección es una arquitectura **result-first** con dos entradas secundarias: Aula desde Home para iniciar un ejercicio y la guía de Workspace cuando aún no existe un análisis utilizable.

## Modelo de experiencia

### Tres profundidades, no tres niveles de dificultad

1. **Lectura.** Qué valor es, dónde ocurre, en qué escenario, con qué unidad y convenio de signo. Es la vista inicial.
2. **Causa.** Qué entidades y acciones del modelo participan y qué pasos de `AnalysisResult.explanation` están relacionados. No asigna porcentajes causales si el motor no los produce.
3. **Verificación.** Calidad numérica, equilibrio, compatibilidad, procedencia exacta y, bajo demanda, `EducationTrace`.

Cambiar profundidad no califica, desbloquea ni modifica el modelo. La etiqueta de progreso será descriptiva —por ejemplo, «Lectura · 1 de 3 vistas»— y no una puntuación.

### Separación de capacidades

| Capacidad | Responsabilidad | No debe hacer |
|---|---|---|
| Entrada Aula | Crear o abrir un ejercicio y llevar al Workspace | Mantener un catálogo curricular dentro de `ProjectModel` |
| Explicación de resultado | Resolver y presentar un ancla del análisis vigente | Recalcular, copiar resultados o inventar causalidad |
| Contenido educativo futuro | Aportar conceptos, ejemplos atribuidos y práctica opcional | Sobrescribir datos, signos o evidencia del modelo |
| Guía del Workspace | Indicar el siguiente paso para lograr un análisis legible | Bloquear herramientas con una secuencia didáctica |

## Journey principal: desde Results

1. La persona analiza el proyecto y abre Results.
2. En una tarjeta extrema o lectura fijada elige **Entender este resultado**. El control incluye la misma referencia que ya usa procedencia.
3. El Workspace emite `open-dense-results` con `view: 'learn'`, el elemento que lo abrió y un ancla transitoria.
4. La superficie densa abre como `drawer` en X2/M1 y `fullscreen` en K0, según el broker vigente.
5. **Lectura** muestra la identidad completa del valor. El objeto permanece resaltado en el canvas mediante la autoridad de selección existente.
6. La persona puede abrir **Causa** y **Verificación**. La traza matricial sólo se solicita al entrar a contenido que la necesita.
7. **Volver al resultado** cierra la superficie y devuelve foco al lanzador. Results conserva miembro, cantidad, caso/combinación y cursor fijado.

Cambiar de caso/combinación o editar el modelo invalida el ancla anterior. Aula no conserva una explicación contra un análisis obsoleto: muestra «Este resultado cambió. Analiza de nuevo para continuar» y ofrece la acción existente de análisis.

## Journeys alternos

### Desde Home

1. Aula conserva su entrada propia y sus casos preparados.
2. Abrir un caso crea el mismo proyecto 2D con `calculationMode: 'classroom'` y entra al Workspace.
3. La guía vigente ayuda a completar geometría, apoyos, cargas y análisis.
4. Cuando hay resultados, la guía lleva a Results; desde ahí comienza el journey principal.

### Desde el Workspace sin resultados

- La guía muestra un siguiente paso basado en el modelo real.
- **Entender** no aparece como una promesa vacía.
- Si el análisis falló, la ruta principal es abrir Avisos/Model Doctor. Aula puede explicar el estado, pero no presenta números no utilizables como resultados ordinarios.

### Desde una explicación general

`LearnView` puede abrirse sin ancla desde Results para recorrer modelo, grados de libertad, elemento, ensamble y verificación. En ese caso el encabezado dice **Explorar el método** y no simula una respuesta específica.

### Evidencia insuficiente

Si falta el miembro, la posición almacenada, el componente o la relación con un paso explicativo:

- conserva la identidad disponible;
- muestra «No hay evidencia suficiente para explicar esta relación»;
- nombra el dato ausente en lenguaje humano;
- permite volver, localizar el objeto o elegir otro resultado;
- nunca interpola una posición ni atribuye una carga por cercanía visual.

### «¿Por qué gobierna?»

La respuesta depende del significado comprobable de *gobierna*:

- **Escenario gobernante:** sólo se afirma cuando una envolvente identifica explícitamente el caso/combinación que produce el mínimo o máximo en la posición consultada.
- **Chequeo gobernante de calidad:** usa `analysis.reliability.governing` y sus umbrales/mensaje.
- **Extremo de un escenario:** explica por qué es máximo o mínimo dentro del diagrama disponible, pero no lo llama combinación gobernante.
- Si ninguna de esas evidencias existe, la respuesta es estado insuficiente. `loadAudit` acredita ensamblaje/equilibrio; no es una descomposición de contribución por carga.

## Wireframes de los flujos críticos

### X2 · Results → explicación

```text
┌──────────────────────── Workspace / canvas ────────────────────────┬──────── Results ────────┐
│ Miembro M4 resaltado · diagrama M · cursor fijado x=3.20 m        │ Momento máximo          │
│                                                                   │ -86.42 kN·m             │
│                                                                   │ M4 · x 3.20 m · COMB-2  │
│                                                                   │ Confiabilidad: estable  │
│                                                                   │ [Localizar] [Entender]  │
└───────────────────────────────────────────────────────────────────┴──────────────────────────┘

                                  ↓ Entender

┌──────────────────── canvas retenido ─────────────┬──── Entender este resultado · drawer ────┐
│ M4 y x=3.20 m siguen visibles y seleccionados    │ [Lectura] [Causa] [Verificación]         │
│                                                  │ -86.42 kN·m                               │
│                                                  │ M4 · x 3.20 m · COMB-2                    │
│                                                  │ Signo: convenio de momento vigente        │
│                                                  │ Fuente: memberResults…criticalPoints[…]    │
│                                                  │ [Volver al resultado]                      │
└──────────────────────────────────────────────────┴────────────────────────────────────────────┘
```

### M1 · explicación y canvas

```text
┌────────────────────── Workspace ────────────────────┐┌──── Drawer Aula ────┐
│ canvas visible; el drawer puede usar peek para      ││ Lectura 1 de 3      │
│ localizar el objeto sin perder la explicación       ││ valor + contexto     │
│                                                     ││ [Ver en el modelo]   │
└─────────────────────────────────────────────────────┘└──────────────────────┘
```

### K0 · flujo de pantalla completa

```text
┌─────────────────────────────────────┐
│ ‹ Resultados   Entender             │
│                                     │
│ -86.42 kN·m                         │
│ M4 · x 3.20 m · COMB-2              │
│ Confiabilidad: estable              │
│                                     │
│ [ Lectura ] [ Causa ] [ Verificar ] │
│                                     │
│ Explicación en bloques apilados     │
│ con objetivos táctiles de 44 px     │
│                                     │
│ [Volver al resultado]               │
└─────────────────────────────────────┘
```

En K0 no se añade navegación inferior persistente. El cierre usa el contrato del broker y restaura foco. En landscape se conserva el mismo contenido con una sola región desplazable; no se crean dos scrolls anidados.

## Contrato de datos

### Fuentes existentes

- `ProjectModel`: objetos, propiedades, cargas, casos, combinaciones y unidades configuradas.
- `AnalysisResult`: resultados nodales/de miembro, puntos críticos, confiabilidad, auditorías y `explanation`.
- `ResultRef` + `resolveExplanationAnchor`: identidad de cantidad, entidad, componente, escenario, signo y posición; resuelven valor y fuente.
- `EducationTrace`: detalle de grados de libertad, matrices, ensamble y elemento; se obtiene bajo demanda.
- `Selection`, `resultCursor` y `learningFocus`: contexto visual transitorio, no datos de dominio.

### Adaptador transitorio propuesto

```ts
type AulaEntryPoint = 'result-card' | 'diagram-cursor' | 'provenance' | 'learn-explorer';

type AulaSourceLocator =
  | { kind: 'node-result'; nodeId: string; component: 'ux' | 'uy' | 'rz' | 'rx' | 'ry' | 'rm' }
  | { kind: 'diagram-point'; memberId: string; pointIndex: number; quantity: 'N' | 'V' | 'M' }
  | { kind: 'critical-point'; memberId: string; pointIndex: number; quantity: 'N' | 'V' | 'M' };

interface AulaExplanationRequest {
  entryPoint: AulaEntryPoint;
  analysisSignature: string; // derivada en runtime del proyecto que vio el solver
  ref: ResultRef;
  sourceLocator: AulaSourceLocator;
  scenarioEvidence?: {
    kind: 'envelope';
    scenarioId: string;
    branch: 'minimum' | 'maximum';
    source: string;
  };
  trigger: HTMLElement | null; // sólo para retorno de foco; nunca se persiste
}
```

`AulaExplanationRequest` vive en estado de UI asociado a la superficie densa. No entra a `ProjectModel`, historial, exportación ni almacenamiento del proyecto. El payload de `open-dense-results` puede transportar el request opcional cuando `view === 'learn'`.

El `sourceLocator` se construye desde el elemento almacenado que originó la acción. El índice es válido sólo para la identidad del `AnalysisResult` vigente; `analysisSignature` obliga a descartar el request después de cualquier cambio que el solver pueda observar. `x` y `side` siguen siendo información visible de `ResultRef`, pero no se busca una selección por aproximación de punto flotante.

### Resolución de la vista

Un adaptador puro recibe `{ project, analysis, request }` y produce un view model sin autoridad de dominio:

```ts
interface AulaExplanationViewModel {
  status: 'resolved' | 'stale-analysis' | 'insufficient-evidence' | 'unusable-analysis';
  anchor: ExplanationAnchor;
  objectLabel: string;
  scenarioLabel: string;
  participatingActionIds: string[];
  explanationStepIds: string[];
  governingEvidence:
    | { kind: 'scenario'; scenarioId: string; source: string }
    | { kind: 'reliability-check'; checkId: string; source: string }
    | { kind: 'none'; reason: string };
}
```

Reglas:

1. El adaptador vuelve a leer el valor desde `AnalysisResult` en cada resolución. No persiste una copia numérica.
2. Las conversiones de unidades ocurren sólo al presentar, mediante las utilidades vigentes.
3. `participatingActionIds` se obtiene por IDs de caso/combinación y relaciones explícitas del proyecto. Significa *participa en el escenario*, no *aporta este porcentaje*.
4. `explanationStepIds` sólo incluye pasos relacionados por `relatedNodeIds`/`relatedMemberIds`.
5. El cálculo de escenario gobernante consume `scenarioEvidence` ya producido por la envolvente. No vuelve a ejecutar un solver dentro de Aula ni copia el valor extremo.
6. `EducationTrace` continúa lazy; no forma parte del request y no se serializa.

## Arquitectura de componentes

- `ResultExplanationLauncher`: acción accesible en tarjeta extrema y lectura fijada; construye el request desde su dato fuente.
- `resolveAulaExplanation`: adaptador puro, testeable sin React y sin mutaciones.
- `AulaExplanationHeader`: valor, unidad, objeto, posición, escenario, signo y calidad.
- `AulaDepthNavigation`: tabs de Lectura/Causa/Verificación con patrón de teclado roving ya usado en `DenseResultsSurface`.
- `AulaReadingView`: resumen inmediato y localización.
- `AulaCauseView`: acciones participantes y pasos explicativos relacionados; estados de evidencia insuficiente.
- `AulaVerificationView`: procedencia, confiabilidad, equilibrio y acceso bajo demanda al explorador vigente.
- `AulaReturnAction`: cierra mediante el broker y no administra foco por su cuenta.

La composición sigue siendo autoridad de CRI-94: una sola superficie lógica `dense`, invocada y no residente. Aula no crea un panel paralelo ni duplica estado de selección, Resultados o shell.

## Copy

### Principios

- Primero el dato: «Momento en M4, x = 3.20 m».
- Después la relación comprobable: «Este valor pertenece a COMB-2 y usa el convenio de signo mostrado».
- Separar observación de interpretación: «El diagrama alcanza aquí su mínimo» no equivale a «esta carga causa el 72 %».
- Nombrar el límite: «El análisis identifica el escenario gobernante, pero no descompone el valor por carga».
- Evitar voz de sistema, felicitaciones, puntajes, «correcto/incorrecto» y códigos internos.

### Ejemplos

| Estado | Copy |
|---|---|
| Resuelto | «M = −86.42 kN·m en M4, x = 3.20 m, para COMB-2.» |
| Calidad limitada | «El análisis terminó, pero este valor tiene confiabilidad limitada. Revisa el chequeo que gobierna antes de usarlo.» |
| Ancla obsoleta | «El modelo cambió desde este resultado. Analiza de nuevo para continuar.» |
| Relación ausente | «No hay evidencia suficiente para vincular este valor con una causa específica.» |
| Sin traza | «El detalle del método todavía no está cargado. Abrir verificación lo prepara sin cambiar el resultado.» |

## Responsive, temas y accesibilidad

- **X2:** drawer derecho; el canvas y Results pueden conservar contexto visual según la política del broker.
- **M1:** drawer invocado con capacidad de `peek`; no reserva una columna permanente.
- **K0:** fullscreen; una sola región de scroll, cabecera y acción de retorno visibles, safe areas y objetivos táctiles de al menos 44 px.
- **Día/Noche:** mismas jerarquías y colores técnicos; Aula usa el token de experiencia, nunca para codificar signo, confiabilidad o respuesta correcta.
- **Teclado:** lanzador alcanzable; tabs con flechas/Home/End; Escape y cierre obedecen al broker; foco vuelve al control exacto que abrió la explicación.
- **Lector de pantalla:** el encabezado anuncia valor y contexto una vez; tabs tienen nombre/estado; ecuaciones incluyen texto equivalente; procedencia no depende de `title`, hover ni color.
- **Reduced motion:** cambios de profundidad y localización son instantáneos; no hay auto-scroll animado ni transición esencial.
- **Zoom/reflow:** a 200 % no hay pérdida de contenido ni doble scroll horizontal. Español e inglés conservan significado, aunque no longitud.

## Estados de error y continuidad

| Estado | Presentación | Acción primaria |
|---|---|---|
| Sin análisis | No se abre una explicación específica | Analizar estructura |
| Análisis fallido/no utilizable | Calidad visible; ningún número se trata como ordinario | Abrir Avisos |
| Firma obsoleta | Se conserva sólo la identidad del request para explicar qué cambió | Analizar de nuevo |
| Objeto eliminado | Estado insuficiente, sin búsqueda por nombre parecido | Volver a Results |
| Posición no almacenada | Se muestra miembro/escenario y se omite valor causal | Elegir punto almacenado |
| Traza cargando | Estado `role=status`; Lectura sigue disponible | Esperar o volver |
| Traza no disponible | Explicación básica permanece; limitación explícita | Volver |

## Criterios de explicación correcta, clara y verificable

### Correcta

- La cifra, unidad, signo, entidad, posición y escenario coinciden con la fuente indicada del `AnalysisResult` vigente.
- Los resultados de Aula y modo Completo permanecen byte-for-byte iguales para el mismo modelo.
- No se presenta análisis `unreliable`/`failed` como resultado ordinario.
- Una carga sólo se denomina participante si su `caseId` entra al escenario; no se afirma causalidad cuantitativa sin evidencia del motor.
- «Gobierna» siempre indica escenario, extremo o chequeo de calidad; nunca mezcla significados.

### Clara

- Lectura responde el dato principal sin abrir acordeones.
- Cada bloque contiene una idea, una fuente y una acción como máximo.
- Los términos técnicos se conservan; la primera aparición aporta contexto humano.
- La navegación de profundidad no sugiere nota, examen ni obligación.

### Verificable

- Toda cifra muestra una ruta de procedencia legible y resoluble.
- Localizar selecciona el ID exacto y la posición almacenada.
- Las ecuaciones derivan de `AnalysisResult.explanation` o `EducationTrace`; contenido editorial adicional declara fuente y versión.
- Los estados insuficientes son testeables como resultados válidos del resolver, no excepciones ocultas.
- Las pruebas cubren caso, combinación, punto continuo, ambos lados de un salto, reacción, desplazamiento, análisis obsoleto y confiabilidad limitada.

## Backlog de implementación por slices

Estos slices son un plan futuro; CRI-18 no los implementa ni crea nuevas issues automáticamente.

1. **AULA-A1 · contrato puro del ancla.** Añadir tipos feature-locales, `resolveAulaExplanation` y pruebas RED/GREEN para nodo, miembro, salto, firma obsoleta y evidencia insuficiente. Sin UI.
2. **AULA-A2 · lanzador desde tarjeta extrema.** Construir `sourceLocator` desde el punto real, extender el comando denso y probar retorno de foco. Sin pantalla de causa.
3. **AULA-A3 · Lectura en `dense/learn`.** Encabezado contextual, valor/unidad/posición/escenario/signo, localización y estados de análisis. Reutilizar `ProvenanceCard`.
4. **AULA-A4 · lectura fijada del diagrama.** Añadir el mismo launcher al cursor fijado, preservando `side` en discontinuidades y sin comparación flotante para selección.
5. **AULA-A5 · Causa comprobable.** Relacionar acciones participantes, pasos explicativos y escenarios. Implementar explícitamente el estado sin descomposición causal.
6. **AULA-A6 · «¿por qué gobierna?».** Consumir escenario explícito de envolvente y `reliability.governing`; pruebas que impidan usar la palabra cuando no exista evidencia.
7. **AULA-A7 · Verificación progresiva.** Integrar confiabilidad, equilibrio y explorador/`EducationTrace` lazy sin duplicar matrices ni resultados.
8. **AULA-A8 · continuidad y accesibilidad.** Gates X2/M1/K0, Día/Noche, ES/EN, WebKit/Chromium, teclado, lector de pantalla, 200 % zoom y reduced motion.
9. **AULA-A9 · retirar la puerta de predicción heredada.** Eliminar estado y copy sin consumidores sólo después de pruebas de migración de `localStorage`; conservar conclusiones optativas si tienen un journey vigente.
10. **AULA-A10 · contenido educativo futuro.** Definir un manifiesto atribuido/versionado separado de `ProjectModel`. No incluir normativa sin fuente y revisión explícitas.

Dependencias: A1 → A2 → A3; A4 depende de A2; A5 depende de A3; A6 depende de A5 y evidencia de envolvente; A7 depende de A3; A8 cierra A3–A7; A9 sólo después de paridad; A10 es independiente del flujo de resultados.

## Gates de aceptación para los slices futuros

- Pruebas unitarias del resolver y del payload antes de componentes.
- Invariancia numérica Aula/Completo y `verify:protected`.
- Pruebas de `DenseResultsSurface`, `ResultsPanel`, broker/composición y retorno de foco.
- Oráculo de navegador focal X2/M1/K0, Día/Noche, ES/EN, touch y WebKit/Chromium.
- Sin overflow horizontal; targets táctiles de 44 px; reduced motion y navegación sólo con teclado.
- Revisión de copy contra estados `resolved`, `stale`, `insufficient` y `unusable`.
- Ningún cambio a solver, `ProjectModel`, persistencia o formatos salvo una petición posterior explícita con sus propios gates.

## Decisiones diferidas

- Gobierno editorial, autoría y versionado de una biblioteca de contenido.
- Sincronización entre dispositivos o perfiles de estudiante.
- Analítica de aprendizaje, calificaciones y colaboración docente.
- Descomposición cuantitativa por carga; requeriría una capacidad matemática explícita y no se infiere de `loadAudit`.
- Contenido reglamentario; cada fuente necesitaría jurisdicción, edición, revisión y vigencia.

Ninguna decisión diferida bloquea A1–A8.

El desglose técnico para A1–A8 está en el [plan de implementación](aula-vnext-implementation-plan.md). Ese plan tampoco autoriza ejecutar los slices dentro de CRI-18.
