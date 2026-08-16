# CRI-89 · Shell adaptativo: resolutor X2/M1/K0 como fuente única de clase

**Fecha:** 2026-08-16 15:00
**Agente:** Claude Code
**Rama:** `claude/cri-89-shell-adaptativo-trqkcx`
**Clasificación:** `AUDIT/TEMPORARY`
**Baseline:** `origin/main` = `7fb927fb6d118925e63365d1a2bb2813f8795385` (revalidado al empezar; sin drift)

## Qué cambió

La clase de composición del editor deja de ser un booleano de riel compacto y cinco `matchMedia`
de ancho repartidos por la app, y pasa a ser la salida de **un resolutor puro** —`X2` | `M1` |
`K0`— que vive fuera de React y se prueba sin navegador. `AppShellLayout` recibe esa clase y la
publica en `data-shell-class`; la densidad de fila y la compacidad del riel se derivan de ella.
Los cuatro consumidores (`WorkspaceShell`, `ToolBar`, `ResultsPanel`, `ModelDoctor`) leen la
clase de un contexto propio y estrecho en vez de consultar el ancho cada uno por su cuenta.

**La frontera Expanded↔Medium no está escrita en ninguna parte**: se calcula desde las reglas de
canvas-budget CB-1..CB-4 y depende de la altura — 1130 px a 720 de alto, 1117 a 768, 1089 a 900,
1042 a 1366. Es exactamente la tabla que publicó CRI-9 §12, y una prueba unitaria la reproduce.

## Por qué

CRI-89 (`Urgent`, primera issue ejecutable de CRI-88, once issues dependen de ella). Hasta ahora
el tier 1024–1439 estaba declarado en `styles.css` y no lo activaba nada — el hallazgo F-01 de
CRI-9 — porque ninguna prueba podía afirmar qué composición estaba activa. Con un resolutor puro
esa aserción cuesta una prueba unitaria, y con una sola fuente de clase dos componentes ya no
pueden discrepar de composición.

## Cómo funciona

### El resolutor (`src/features/workspace/shellComposition.ts`)

Port literal del modelo geométrico de CRI-9
(`reports/evidence/2026-08-15-cri-9-adaptive-architecture/canvas-budget-model.mjs`), cuyas
constantes de chrome están despejadas de las mediciones reales de CRI-7 §2 y reproducen las once
cifras publicadas con un error máximo de 0.24 puntos porcentuales. Elige la composición **más
rica que el presupuesto de lienzo permite**: primero `X2` (dos docks laterales), luego `M1` (un
dock + detalle superpuesto sin reflow), y si ninguna paga, `K0`.

### Histéresis (T-INV-5, `bandPx = 24` — decisión CRI-12B #6)

El commit evalúa la banda entera: se resuelve el viewport en los dos extremos (±12 px).

- Si los tres coinciden, el tamaño está limpiamente fuera de cualquier frontera → se commitea.
- Si no coinciden, estamos sobre una frontera → se conserva lo anterior, **pero sólo si sigue
  siendo alcanzable dentro de la banda**. Un valor anterior que ya no aparece en ningún extremo
  no es histéresis, es un salto que dejó atrás esa frontera (redimensionar 1440→1024 de una vez,
  o rotar): retenerlo dejaría el shell en una clase imposible. Este caso lo detectó el harness de
  navegador, no las pruebas unitarias — se corrigió y se añadió su prueba.

Resultado: 24 px exactos de zona muerta alrededor de cada frontera, independientes de la
dirección y de dónde esté la frontera, cosa que importa porque la frontera se mueve con la altura.

### Commit sobre tamaño estable

`ShellCompositionProvider` no commitea hasta que el tamaño lleva 120 ms quieto. Un arrastre
continuo genera decenas de `resize` por segundo y ninguno recompone. El proveedor devuelve la
misma identidad de objeto cuando nada cambió, así que React corta el re-render: **sólo emite
cuando la composición cambia**, no en cada resize.

### La frontera M1↔K0 — decisión declarada, no calculada

La frontera que CRI-89 exige calculada es la de Medium (X2↔M1), y lo está. La de Compact **no**:
`COMPACT_CEILING_PX = 1023` es un techo declarado y documentado en el propio resolutor.

La razón: la composición Compact que hoy se **renderiza** no es la `K0` del modelo de CRI-9
(banda de herramientas + hoja con detents), sino la que `src/styles.css` describe en sus bloques
`@media (max-width:1023px)` — grid de una columna, dock de herramientas absoluto, Results como
hoja inferior. El presupuesto de lienzo por sí solo pondría esa frontera entre ~810 y ~1075 px
según la altura; si el resolutor la moviera por su cuenta mientras el CSS sigue siendo el dueño
de esa composición, JS y CSS discreparían y una superficie se renderizaría en una composición y
se comportaría en otra. Levantar el techo es migrar esos bloques a selectores por clase — trabajo
del broker de presentación (CRI-94/CRI-95), no de este slice. `canvasBudgetClass()` se exporta
aparte, con su prueba, para que el modelo se pueda auditar sin el puente.

### `toolRailCompact`

Deja de ser preferencia y pasa a derivarse de la clase (`isToolRailCompact`: sólo `X2` paga un
riel con etiquetas). Como consecuencia, su conmutador de la Cinta —que ya estaba oculto por CSS
por debajo de 1440 px— desaparece: una preferencia que no gobierna nada no puede tener control.
La clave `structureco:workspace-layout:v1` **no sube de versión** y un `toolRailCompact`
almacenado se **ignora sin borrarse**: la escritura ahora hace merge sobre lo que hubiera, así
que revertir el slice devuelve al usuario su preferencia intacta. `inspectorWidth`,
`inspectorDetent`, `inspectorCollapsed` y `fullCanvas` se siguen honrando igual.

## Archivos tocados

**Nuevos**

- `src/features/workspace/shellComposition.ts` — resolutor puro: CB-1..CB-4, fronteras,
  histéresis, `isToolRailCompact`. Sin React, sin DOM, sin `matchMedia`.
- `src/features/workspace/useShellComposition.ts` — contexto estrecho + hook + lectura del
  viewport de layout.
- `src/features/workspace/ShellCompositionProvider.tsx` — máquina de estados: `resize` /
  `orientationchange`, commit sobre tamaño estable, emisión sólo al cambiar.
- `src/features/workspace/shellComposition.test.ts` — 14 pruebas: fronteras publicadas por CRI-9,
  tres clases sobre viewports reales, techo de Compact, sub-umbral de teléfono, histéresis,
  barrido 900→1300→900, salto fuera de banda, T-INV-4, canvas-first, pureza.
- `src/features/workspace/shellCompositionProvider.test.tsx` — 7 pruebas: emisión sólo al cambiar,
  commit sobre tamaño estable, no oscilación en la banda, teclado virtual, rotación.
- `src/features/workspace/shellRecomposition.test.tsx` — 2 pruebas: selección, borrador sin
  aplicar, foco y superficie abierta sobreviven a X2→M1→K0→M1→X2 (T-INV-1/2/3) y al teclado.
- `scripts/qa-shell-composition.mjs` — harness de evidencia sobre la app construida.
- `reports/evidence/2026-08-16-cri-89-shell-adaptativo/` — capturas de las tres clases, Compact
  con teclado virtual, JSON de resultados y línea base de lienzo medida sobre `main`.

**Modificados**

- `src/features/workspace/AppShellLayout.tsx` — recibe `shellClass`, publica `data-shell-class`,
  deriva `data-tool-rail-compact`. Pierde la prop `toolRailCompact`.
- `src/features/workspace/WorkspaceShell.tsx` — envuelve la mesa en `ShellCompositionProvider`;
  sus tres `matchMedia` pasan a leer la clase; el riel recibe la compacidad derivada.
- `src/features/workspace/useWorkspaceLayoutPreferences.ts` — `toolRailCompact` sale del tipo;
  lectura tolerante y escritura con merge para no borrar lo heredado.
- `src/features/canvas/ToolBar.tsx` — su `matchMedia` de 1023 px pasa a ser el cambio de clase.
- `src/features/results/ResultsPanel.tsx` — `isMobile`/`isPhone` dejan de ser estado local y se
  derivan de la clase; caen `MOBILE_RESULTS_QUERY`, `PHONE_RESULTS_QUERY` y sus dos efectos.
- `src/features/model-doctor/ModelDoctor.tsx` — cae `useCompactDoctor`; el lado del cajón lo
  decide la composición (R-3).
- `src/features/topbar/TopBar.tsx` — `TopBarLayoutActions` pierde `toolRailCompact` y
  `onToggleToolRail`; desaparece el botón de contraer el riel.
- `src/design-system/tokens.css` — `--sc-density-row` y su conmutación por `data-shell-class`.
- `src/styles.css` — la tabla densa de Results consume `--sc-density-row` como suelo de fila.
- Pruebas de `ResultsPanel`, `TopBar`, `AppShellLayout` y `useWorkspaceLayoutPreferences`
  actualizadas al nuevo contrato.

## Cómo verificar

```bash
npm run lint                        # sin regresión sobre main (2 avisos preexistentes)
npx vitest run src/features/workspace
npm run typecheck
npm run verify:protected
npm run build
npm run build && node scripts/qa-shell-composition.mjs        # evidencia de navegador
node scripts/qa-shell-composition.mjs --baseline              # línea base de lienzo
# Ningún matchMedia de ancho fuera del resolutor:
grep -rn "matchMedia" src/ --include=*.ts --include=*.tsx | grep -v "\.test\."
```

### Evidencia de navegador (`TODO VERDE`)

| Viewport | Clase | `--sc-density-row` | Riel compacto | Overflow horizontal |
|---|---|---|---|---|
| 1440×900 | `X2` | 30px | no | 0 px |
| 1280×800 | `X2` | 30px | no | 0 px |
| 1100×768 | `M1` | 36px | sí | 0 px |
| 1024×768 | `M1` | 36px | sí | 0 px |
| 390×844 (retrato) | `K0` | 44px | sí | 0 px |
| 844×390 (apaisado) | `K0` | 44px | sí | 0 px |
| 768×1024 (tablet) | `K0` | 44px | sí | 0 px |

- **Barrido 900→1300→900** (paso de 4 px, con la ventana de quietud en cada paso):
  `K0→M1@1036`, `M1→X2@1132`, `X2→M1@1104`, `M1→K0@1008`. Cuatro recomposiciones, ninguna
  repetida, y el barrido termina en la misma clase en la que empezó. La prueba unitaria repite el
  barrido con paso de 1 px y da los umbrales exactos: 1036 / 1129 subiendo, 1104 / 1011 bajando.
- **Teclado virtual en Compact**: al encoger `visualViewport` a 508 px la app **sí** lo ve
  (`--sc-visual-viewport-height: 508px`) y la clase **no** se mueve — sigue `K0` (T-INV-4).
- **Recomposición X2→M1**: el foco sigue en el mismo elemento (`cri89-focus-probe`), la
  superficie abierta sigue abierta y el estado del Inspector es idéntico antes y después.
- **Canvas-first**: el área de lienzo medida sobre `main` y sobre esta rama es **idéntica** en
  los siete viewports (774360, 565160, 417648, 366120, 287820, 268128, 692736 px²). El slice
  cambia quién decide la composición, no la geometría.

## Riesgos y pendientes

1. **La densidad de fila cambia con la clase, pero todavía no se ve en una tabla densa.** El
   token conmuta y la tabla de Results lo hereda (30/36/44 px medidos en la propia celda), pero
   el contenido de esa celda mide hoy 47 px de alto con su relleno actual, así que el suelo no
   ata en ninguna clase. Hacerlo visible exige tocar el relleno de Results, que CRI-89 pone
   explícitamente fuera de alcance. Queda como cableado listo para cuando CRI-100/CRI-101
   descompongan Results.
2. **La frontera M1↔K0 sigue siendo un techo declarado** (`COMPACT_CEILING_PX = 1023`), no
   calculada. Es una decisión consciente y documentada: ver arriba. Se levanta cuando el broker
   migre los bloques `@media (max-width:1023px)` a selectores por clase.
3. **`normalizeInspectorDetent` conserva su propio listener** de `resize`/`orientationchange`/
   `visualViewport`. No es un `matchMedia` de ancho y no entraba en la lista de migración; se
   deja intacto a propósito porque cambiar sus entradas cambiaría el comportamiento del detent
   con el teclado abierto. Es un listener duplicado, no una segunda fuente de clase.
4. **El conmutador de riel de la Cinta desaparece.** Es la consecuencia directa del rollout que
   la propia issue ordena ("`toolRailCompact` deja de ser preferencia"), no un rediseño: estaba
   oculto por CSS por debajo de 1440 px y por encima la clase es siempre `X2`, así que habría
   quedado permanentemente apagado.
5. **La selección sobre el lienzo no se pudo conducir desde el harness de navegador** (los
   clicks sintéticos sobre `.node-hit` no seleccionan en Chromium headless). La prueba causal de
   que recomponer no toca la selección vive en `shellRecomposition.test.tsx`, con el dominio real
   de `ProjectProvider`; el harness sólo confirma que el estado del Inspector no cambia.
6. **Sin tocar**: solver, modelo, schema (`verify:protected` verde, 38 archivos), ToolRail,
   Results, Inspector, Cinta, colores, Clay y Brandbook.

## Pendiente / siguiente paso

Nada pendiente dentro de CRI-89. Desbloquea CRI-94 y CRI-95 (capa 1 del backlog de CRI-12E). No
se empezó ninguna otra issue.
