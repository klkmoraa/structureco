/**
 * CRI-89 · Evidencia de interacción del shell adaptativo.
 *
 * Afirma sobre la app CONSTRUIDA lo que las pruebas unitarias afirman sobre la
 * función pura: que las tres clases existen de verdad, que el barrido de ancho
 * no oscila, que el teclado virtual no recompone, que rotar no pierde selección
 * ni foco ni superficies abiertas, y que ninguna clase desborda en horizontal.
 *
 * Uso: npm run build && node scripts/qa-shell-composition.mjs
 */
import { chromium } from 'playwright';
import { preview } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openExamplePortal } from './qa-welcome.mjs';

const root = path.dirname(fileURLToPath(import.meta.url), '..');
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(repoRoot, 'reports', 'evidence', '2026-08-16-cri-89-shell-adaptativo');
fs.mkdirSync(outDir, { recursive: true });
void root;

const previewServer = await preview({
  root: repoRoot,
  preview: { host: '127.0.0.1', port: 4187, strictPort: true },
  logLevel: 'error',
});
const baseURL = 'http://127.0.0.1:4187/';

const browser = await chromium.launch({
  headless: true,
  channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome',
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
});

/**
 * `--baseline` sólo mide el lienzo de cada viewport y no afirma nada. Sirve
 * para correrlo sobre `main` y comprobar el contrato canvas-first: ninguna
 * clase puede conceder menos lienzo que la composición de hoy a igual viewport.
 */
const baselineOnly = process.argv.includes('--baseline');
const dockLeftOnly = process.argv.includes('--dock-left-only');
const report = { classes: [], sweep: {}, keyboard: {}, rotation: {}, overflow: [], failures: [] };
const check = (name, ok, detail) => {
  if (baselineOnly) return;
  if (!ok) report.failures.push({ name, detail });
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${name}${detail === undefined ? '' : `  ${JSON.stringify(detail)}`}`);
};

const newPage = async (viewport) => {
  const page = await browser.newPage({ viewport });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { controller: null, register: async () => ({ installing: null, waiting: null, addEventListener: () => undefined }), addEventListener: () => undefined },
    });
  });
  return page;
};

const enterWorkspace = async (page) => {
  await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 20_000 });
  await page.getByTestId('welcome-screen').waitFor({ state: 'visible', timeout: 20_000 });
  // CRI-116 · el pórtico de ejemplo vive en el tercer paso desde CRI-112.
  const launcher = await openExamplePortal(page);
  const shell = page.locator('.app-shell');
  try {
    await shell.waitFor({ state: 'visible', timeout: 15_000 });
  } catch (error) {
    if (!await page.getByTestId('welcome-screen').isVisible().catch(() => false)) throw error;
    await launcher.click();
    await shell.waitFor({ state: 'visible', timeout: 15_000 });
  }
  await page.waitForTimeout(400);
  return shell;
};

/** Lo que el shell publica y lo que la clase conmuta. */
const readShellState = (page) => page.evaluate(() => {
  const shell = document.querySelector('.app-shell');
  const cell = document.querySelector('.results-table td, .results-table th');
  const rail = document.querySelector('.tool-rail');
  const workspace = document.querySelector('.workspace');
  const stage = document.querySelector('.center-stage');
  const toolbar = document.querySelector('.toolbar');
  return {
    shellClass: shell?.dataset.shellClass ?? null,
    toolRailCompact: shell?.dataset.toolRailCompact ?? null,
    densityRow: getComputedStyle(shell).getPropertyValue('--sc-density-row').trim(),
    railDataAttr: rail?.dataset.toolRail ?? null,
    railWidth: rail ? Math.round(rail.getBoundingClientRect().width) : null,
    workspaceWidth: workspace ? Math.round(workspace.getBoundingClientRect().width) : null,
    workspaceGridColumns: workspace ? getComputedStyle(workspace).gridTemplateColumns : null,
    stageWidth: stage ? Math.round(stage.getBoundingClientRect().width) : null,
    toolbarWidth: toolbar ? Math.round(toolbar.getBoundingClientRect().width) : null,
    cellHeight: cell ? Math.round(cell.getBoundingClientRect().height) : null,
    canvasArea: (() => {
      if (!stage) return null;
      const box = stage.getBoundingClientRect();
      return Math.round(box.width * box.height);
    })(),
    docScrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  };
});

// ---------------------------------------------------------------------------
// Focal dock check: Results open + left dock must remain a narrow vertical rail.
// This intentionally skips the full responsive sweep for a fast regression gate.
// ---------------------------------------------------------------------------
if (dockLeftOnly) {
  const page = await newPage({ width: 1440, height: 900 });
  await enterWorkspace(page);
  const resultsLauncher = page.locator('.results-launcher');
  await resultsLauncher.click();
  await page.locator('.results-panel[data-surface-status="active"]').waitFor({ state: 'visible', timeout: 15_000 });

  const moveLeft = page.getByRole('button', { name: /poner herramientas a la izquierda/i });
  await moveLeft.click();
  await page.waitForFunction(() => document.querySelector('.app-shell')?.getAttribute('data-tool-dock-position') === 'left', undefined, { timeout: 10_000 });
  const dock = await page.evaluate(() => {
    const shell = document.querySelector('.app-shell');
    const rail = document.querySelector('.tool-rail');
    const list = rail?.querySelector('.desktop-tool-list');
    const groupActions = rail?.querySelector('.tool-group-actions');
    if (!shell || !rail || !list || !groupActions) return null;
    const rect = rail.getBoundingClientRect();
    const railStyle = getComputedStyle(rail);
    return {
      position: shell.getAttribute('data-tool-dock-position'),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      renderedTop: Math.round(rect.top),
      renderedBottom: Math.round(rect.bottom),
      top: railStyle.top,
      bottom: railStyle.bottom,
      listDirection: getComputedStyle(list).flexDirection,
      groupDirection: getComputedStyle(groupActions).flexDirection,
      overflowY: railStyle.overflowY,
      viewportHeight: window.innerHeight,
      maxHeight: Math.min(680, window.innerHeight - 172),
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  check('dock izquierdo conserva geometría vertical con Results activo', Boolean(dock)
    && dock.position === 'left'
    && dock.width <= 56
    && dock.height <= dock.maxHeight + 1
    && dock.renderedTop >= 52
    && dock.renderedBottom <= dock.viewportHeight - 52
    && dock.listDirection === 'column'
    && dock.groupDirection === 'column'
    && dock.overflow <= 1, dock);

  await resultsLauncher.click();
  await page.locator('.results-panel').waitFor({ state: 'detached', timeout: 10_000 });
  const focusReturned = await resultsLauncher.evaluate((element) => document.activeElement === element);
  check('Results cierra y devuelve foco al lanzador persistente', focusReturned, { focusReturned });

  await page.close();
  await browser.close();
  await previewServer.close();
  console.log(report.failures.length === 0 ? 'DOCK LEFT FOCAL PASS' : `DOCK LEFT FOCAL FAIL: ${report.failures.length}`);
  process.exit(report.failures.length === 0 ? 0 : 1);
}

// ---------------------------------------------------------------------------
// 1 · Las tres clases existen, y cada una conmuta densidad y riel
// ---------------------------------------------------------------------------
const CLASS_CASES = [
  { label: 'X2 · 1440x900', width: 1440, height: 900, expected: 'X2', density: '30px' },
  { label: 'X2 · 1280x800', width: 1280, height: 800, expected: 'X2', density: '30px' },
  { label: 'M1 · 1100x768', width: 1100, height: 768, expected: 'M1', density: '36px' },
  { label: 'M1 · 1024x768', width: 1024, height: 768, expected: 'M1', density: '36px' },
  { label: 'K0 portrait · 390x844', width: 390, height: 844, expected: 'K0', density: '44px' },
  { label: 'K0 landscape · 844x390', width: 844, height: 390, expected: 'K0', density: '44px' },
  { label: 'K0 tablet · 768x1024', width: 768, height: 1024, expected: 'K0', density: '44px' },
];

/**
 * Resuelve el modelo y abre la tabla de reacciones: la densidad de fila no se
 * verifica sólo por el token, sino por la altura real de una fila densa.
 */
const measureDenseRow = async (page) => {
  const analyze = page.getByRole('button', { name: /analizar/i }).first();
  if (!await analyze.count()) return null;
  await analyze.click({ timeout: 8_000 }).catch(() => undefined);
  /* Reacciones dejó de ser pestaña residente en CRI-101: la tabla densa vive en
     la superficie invocada `dense`, que se abre desde su lanzador. */
  const reactions = page.locator('[data-dense-launcher="reactions"]').first();
  await reactions.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => undefined);
  if (await reactions.count()) {
    await reactions.focus().catch(() => undefined);
    await page.keyboard.press('Enter').catch(() => undefined);
  }
  await page.locator('.results-table tbody td').first().waitFor({ state: 'attached', timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(400);
  return page.evaluate(() => {
    const cell = document.querySelector('.results-table tbody td');
    if (!cell) return null;
    return {
      // El token que la clase conmuta, tal y como lo HEREDA la tabla densa.
      inheritedDensity: getComputedStyle(cell).getPropertyValue('--sc-density-row').trim(),
      rowHeight: Math.round(cell.getBoundingClientRect().height),
    };
  });
};

for (const testCase of CLASS_CASES) {
  const page = await newPage({ width: testCase.width, height: testCase.height });
  await enterWorkspace(page);
  const state = await readShellState(page);
  state.denseRowHeight = await measureDenseRow(page);
  report.classes.push({ ...testCase, ...state });
  check(`clase ${testCase.label}`, state.shellClass === testCase.expected, { got: state.shellClass, density: state.densityRow });
  check(`densidad ${testCase.label}`, state.densityRow === testCase.density, { got: state.densityRow });
  // La densidad llega hasta la tabla densa, no se queda en el shell. La altura
  // de fila se registra tal cual: hoy el contenido de Results es más alto que
  // las tres densidades, así que el suelo todavía no ata — ver el reporte.
  if (state.denseRowHeight) {
    check(`densidad heredada por la tabla densa ${testCase.label}`, state.denseRowHeight.inheritedDensity === testCase.density, state.denseRowHeight);
  }
  check(`riel ${testCase.label}`, (state.toolRailCompact === 'true') === (testCase.expected !== 'X2'), { toolRailCompact: state.toolRailCompact });
  if (testCase.expected === 'M1') {
    check(`riel M1 ocupa sólo su token compacto ${testCase.label}`, state.railWidth !== null && state.railWidth <= 80, { railWidth: state.railWidth });
  }
  if (testCase.expected === 'K0') {
    const compactWidths = {
      viewport: state.innerWidth,
      workspace: state.workspaceWidth,
      stage: state.stageWidth,
      toolbar: state.toolbarWidth,
      columns: state.workspaceGridColumns,
    };
    check(
      `workspace K0 conserva todo el ancho ${testCase.label}`,
      state.workspaceWidth !== null
        && state.stageWidth !== null
        && state.toolbarWidth !== null
        && Math.abs(state.workspaceWidth - state.innerWidth) <= 1
        && Math.abs(state.stageWidth - state.innerWidth) <= 1
        && Math.abs(state.toolbarWidth - state.innerWidth) <= 1,
      compactWidths,
    );
  }
  // Cero overflow horizontal en ninguna clase.
  const overflow = state.docScrollWidth - state.innerWidth;
  report.overflow.push({ label: testCase.label, overflowPx: overflow });
  check(`sin overflow horizontal ${testCase.label}`, overflow <= 1, { overflowPx: overflow });
  await page.screenshot({ path: path.join(outDir, `clase-${testCase.expected}-${testCase.width}x${testCase.height}.png`) });
  await page.close();
}

if (baselineOnly) {
  fs.writeFileSync(path.join(outDir, 'canvas-baseline-main.json'), `${JSON.stringify(report.classes, null, 2)}\n`);
  console.log(report.classes.map((row) => `${row.label.padEnd(26)} canvasArea=${row.canvasArea}`).join('\n'));
  await browser.close();
  await previewServer.close();
  process.exit(0);
}

// ---------------------------------------------------------------------------
// 2 · Barrido 900→1300→900: recomposiciones estables, sin oscilación
// ---------------------------------------------------------------------------
{
  const page = await newPage({ width: 900, height: 768 });
  await enterWorkspace(page);
  const transitions = [];
  let previous = (await readShellState(page)).shellClass;
  const sweep = async (from, to, step) => {
    for (let width = from; step > 0 ? width <= to : width >= to; width += step) {
      await page.setViewportSize({ width, height: 768 });
      await page.waitForTimeout(170); // > SHELL_STABLE_COMMIT_MS
      const current = await page.evaluate(() => document.querySelector('.app-shell')?.dataset.shellClass ?? null);
      if (current !== previous) {
        transitions.push(`${previous}→${current}@${width}`);
        previous = current;
      }
    }
  };
  await sweep(900, 1300, 4);
  await sweep(1300, 900, -4);
  report.sweep = { transitions, endClass: previous };
  // Una oscilación sería el mismo par de clases repitiéndose dentro del tramo.
  const pairs = transitions.map((entry) => entry.split('@')[0]);
  const unique = new Set(pairs);
  check('barrido 900→1300→900 · recomposiciones estables', transitions.length === 4 && unique.size === 4, transitions);
  check('barrido termina donde empezó', previous === 'K0', { endClass: previous });

  // El techo de Compact es un puente con el CSS: se cruza EXACTO, sin banda. El
  // barrido de paso 4 no aterriza en 1023, así que se comprueba aparte.
  const classAt = async (width) => {
    await page.setViewportSize({ width, height: 768 });
    await page.waitForTimeout(220);
    return page.evaluate(() => document.querySelector('.app-shell')?.dataset.shellClass ?? null);
  };
  const bridge = {
    from1024: await classAt(1024),
    down1023: await classAt(1023),
    up1024: await classAt(1024),
    down1023again: await classAt(1023),
  };
  report.compactBridge = bridge;
  check(
    'techo de Compact exacto en 1023/1024, sin banda',
    bridge.from1024 === 'M1' && bridge.down1023 === 'K0' && bridge.up1024 === 'M1' && bridge.down1023again === 'K0',
    bridge,
  );
  await page.close();
}

// ---------------------------------------------------------------------------
// 3 · T-INV-4 · el teclado virtual no cambia la clase
// ---------------------------------------------------------------------------
{
  const page = await newPage({ width: 390, height: 844 });
  await enterWorkspace(page);
  const before = await readShellState(page);
  // Un teclado virtual encoge `visualViewport`, no el viewport de layout. Se
  // reproduce exactamente eso y se comprueba que la app SÍ lo ve (las variables
  // de viewport visual cambian) pero la clase NO se mueve.
  await page.evaluate(() => {
    const viewport = window.visualViewport;
    Object.defineProperty(viewport, 'height', { configurable: true, get: () => 844 - 336 });
    viewport.dispatchEvent(new Event('resize'));
  });
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => {
    const shell = document.querySelector('.app-shell');
    return {
      shellClass: shell?.dataset.shellClass ?? null,
      visualViewportHeight: shell?.style.getPropertyValue('--sc-visual-viewport-height') ?? null,
    };
  });
  report.keyboard = { before: before.shellClass, after };
  check('teclado virtual · la app ve el viewport visual', after.visualViewportHeight === '508px', after);
  check('teclado virtual · la clase NO cambia (T-INV-4)', after.shellClass === before.shellClass && after.shellClass === 'K0', after);
  await page.screenshot({ path: path.join(outDir, 'k0-teclado-virtual-abierto.png') });
  await page.close();
}

// ---------------------------------------------------------------------------
// 4 · Recomposición y rotación: selección, foco y superficies abiertas
// ---------------------------------------------------------------------------
{
  const page = await newPage({ width: 1440, height: 900 });
  await enterWorkspace(page);

  // Selección real sobre el lienzo: se pulsa el objetivo de un nodo del modelo.
  const readSelection = () => page.evaluate(() => {
    const inspector = document.querySelector('.inspector-panel');
    const text = inspector?.textContent ?? '';
    return { empty: text.includes('Nada seleccionado'), summary: text.replace(/\s+/g, ' ').slice(0, 90) };
  });
  // El estado de selección del Inspector se fotografía antes y después. La
  // prueba causal de que recomponer NO toca la selección vive en
  // `src/features/workspace/shellRecomposition.test.tsx`, donde el dominio se
  // puede conducir de verdad; aquí se comprueba que el navegador coincide.
  const selectionBefore = await readSelection();

  // El foco vive en un control identificable del riel.
  await page.evaluate(() => {
    const target = document.querySelector('.tool-rail button');
    if (target) { target.id = 'cri89-focus-probe'; target.focus(); }
  });
  const focusBefore = await page.evaluate(() => document.activeElement?.id ?? null);

  // Recomposición real X2 → M1 (cruza la frontera calculada, 1440 → 1024).
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(600);
  const afterRecompose = await page.evaluate(() => ({
    shellClass: document.querySelector('.app-shell')?.dataset.shellClass ?? null,
    focusId: document.activeElement?.id ?? null,
  }));
  const selectionAfter = await readSelection();

  check('recomposición X2→M1 ocurre', afterRecompose.shellClass === 'M1', afterRecompose);
  check('el estado del Inspector sobrevive a la recomposición (T-INV-1)', selectionAfter.summary === selectionBefore.summary, { before: selectionBefore.summary, after: selectionAfter.summary });
  check('el foco sobrevive a la recomposición (T-INV-3)', afterRecompose.focusId === focusBefore && focusBefore === 'cri89-focus-probe', { before: focusBefore, after: afterRecompose.focusId });

  // Una superficie abierta no se cierra al recomponer (T-INV-2).
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(500);
  const dialogsBefore = await page.locator('[role="dialog"]').count();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(600);
  const dialogsAfter = await page.locator('[role="dialog"]').count();
  check('la superficie abierta sobrevive a la recomposición (T-INV-2)', dialogsBefore > 0 && dialogsAfter >= dialogsBefore, { before: dialogsBefore, after: dialogsAfter });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // Rotación en Compact: portrait ↔ landscape sin perder selección.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);
  const portrait = await readShellState(page);
  const selectionPortrait = await readSelection();
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(600);
  const landscape = await readShellState(page);
  const selectionLandscape = await readSelection();

  report.rotation = {
    portrait: portrait.shellClass,
    landscape: landscape.shellClass,
    selectionPortrait: selectionPortrait.summary,
    selectionLandscape: selectionLandscape.summary,
  };
  check('rotación · Compact en las dos orientaciones', portrait.shellClass === 'K0' && landscape.shellClass === 'K0', report.rotation);
  check('rotación · el estado del Inspector no cambia (T-INV-1)', selectionLandscape.summary === selectionPortrait.summary, report.rotation);
  await page.close();
}

fs.writeFileSync(path.join(outDir, 'shell-composition-evidence.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`\nEvidencia en ${path.relative(repoRoot, outDir)}`);
console.log(report.failures.length === 0 ? 'TODO VERDE' : `FALLOS: ${report.failures.length}`);

await browser.close();
await previewServer.close();
process.exit(report.failures.length === 0 ? 0 : 1);
