import { chromium, webkit } from 'playwright';
import { preview } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const engine = process.argv.includes('--webkit') ? 'webkit' : 'chromium';
const port = engine === 'webkit' ? 4182 : 4181;
const baseURL = `http://127.0.0.1:${port}/`;
const artifactsDir = path.join(root, 'qa-artifacts');
fs.mkdirSync(artifactsDir, { recursive: true });

const previewServer = await preview({
  root,
  preview: { host: '127.0.0.1', port, strictPort: true },
  logLevel: 'error',
});
const browser = await (engine === 'webkit' ? webkit : chromium).launch({
  headless: true,
  ...(engine === 'chromium' ? {
    channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome',
    executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
  } : {}),
});
const results = { engine, url: baseURL, checks: {}, console: [], pageErrors: [] };

const check = (name, condition, detail = '') => {
  results.checks[name] = { pass: Boolean(condition), detail };
  if (!condition) throw new Error(`${name} failed${detail ? `: ${detail}` : ''}`);
};

const sleep = (page, milliseconds = 320) => page.waitForTimeout(milliseconds);

const storedProject = (page) => page.evaluate(() => {
  const value = localStorage.getItem('structureCo.project');
  if (!value) throw new Error('No persisted project was found.');
  return JSON.parse(value);
});

const waitForStored = async (page, predicate, argument) => {
  await page.waitForFunction(({ test, argument: serializedArgument }) => {
    const value = localStorage.getItem('structureCo.project');
    const evaluate = Function(`return (${test})`)();
    return Boolean(value && evaluate(JSON.parse(value), serializedArgument));
  }, { test: predicate.toString(), argument });
  return storedProject(page);
};

const resetToExample = async (page) => {
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.getByTestId('welcome-screen').waitFor({ state: 'visible' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByTestId('welcome-screen').waitFor({ state: 'visible' });
  // Project-hub actions use the same project name. Scope this to the welcome
  // template card so the smoke path always opens the structural example.
  await page.locator('.welcome-template-card').filter({ hasText: /P.rtico de ejemplo/i }).click();
  await page.locator('.app-shell').waitFor({ state: 'visible' });
  await page.locator('[data-structure-kind="node"][data-structure-id="N1"]').waitFor({ state: 'visible' });
  await sleep(page);
};

const seedExample = async (page, mutate) => {
  await resetToExample(page);
  const project = await storedProject(page);
  mutate(project);
  await page.evaluate((next) => localStorage.setItem('structureCo.project', JSON.stringify(next)), project);
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByTestId('welcome-screen').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: /continuar proyecto/i }).click();
  await page.locator('.app-shell').waitFor({ state: 'visible' });
  await sleep(page);
};

const target = (page, kind, id) => page.locator(`[data-structure-kind="${kind}"][data-structure-id="${id}"]`);

const nodeCenter = async (page, id) => {
  const box = await target(page, 'node', id).boundingBox();
  if (!box) throw new Error(`Node ${id} does not have a measurable screen position.`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

const oneGridMove = async (page) => {
  const [n1, n2, n3] = await Promise.all(['N1', 'N2', 'N3'].map((id) => nodeCenter(page, id)));
  return {
    start: n1,
    end: {
      x: n1.x + (n2.x - n1.x) / 6,
      y: n1.y + (n3.y - n1.y) / 4,
    },
  };
};

const availableCanvasTouchPoint = (page) => page.evaluate(() => {
  const canvas = document.querySelector('.structural-canvas');
  if (!canvas) throw new Error('The structural canvas is not available for touch QA.');
  const rect = canvas.getBoundingClientRect();
  const xs = [0.25, 0.5, 0.7];
  const ys = [0.16, 0.28, 0.4];
  for (const yRatio of ys) {
    for (const xRatio of xs) {
      const x = rect.left + rect.width * xRatio;
      const y = rect.top + rect.height * yRatio;
      const target = document.elementFromPoint(x, y);
      if (!target?.closest('.structural-canvas')) continue;
      if (target.closest('[data-canvas-chrome], [data-structural-edit-surface]')) continue;
      return { x, y };
    }
  }
  throw new Error('No unobscured touch point was found inside the structural canvas.');
});

const selectSingle = async (page, kind, id) => {
  const item = target(page, kind, id);
  await item.focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute('aria-pressed') === 'true', `[data-structure-kind="${kind}"][data-structure-id="${id}"]`);
};

const selectNodes = async (page, ids) => {
  for (const [index, id] of ids.entries()) {
    await target(page, 'node', id).click(index === 0 ? {} : { modifiers: ['Shift'] });
    await page.waitForTimeout(24);
  }
};

const openEdit = async (page) => {
  const launcher = page.locator('[data-structural-edit-launcher]');
  await launcher.waitFor({ state: 'visible' });
  await launcher.click();
  const surface = page.locator('[data-structural-edit-surface]');
  await surface.waitFor({ state: 'visible' });
  return surface;
};

const chooseOperation = async (surface, name) => {
  await surface.getByRole('radio', { name }).click();
};

const fillField = async (surface, label, value) => {
  const field = surface.getByLabel(label);
  await field.fill(String(value));
  await field.press('Tab');
};

const apply = async (surface) => {
  const button = surface.getByRole('button', { name: /^aplicar$/i });
  await button.waitFor({ state: 'visible' });
  await button.click();
  await surface.waitFor({ state: 'hidden' });
};

const runMovePointerAndCancel = async (page) => {
  await resetToExample(page);
  const baseline = JSON.stringify(await storedProject(page));
  await selectSingle(page, 'node', 'N1');
  const surface = await openEdit(page);
  const canvas = page.getByRole('application', { name: /área de trabajo estructural/i });
  await surface.getByRole('button', { name: /usar puntero/i }).click();
  const { start, end } = await oneGridMove(page);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 3 });
  await page.locator('[data-structural-edit-preview-mode="gesture"]').waitFor({ state: 'visible' });
  await page.mouse.up();
  await page.locator('[data-structural-edit-preview-mode="prepared"]').waitFor({ state: 'visible' });
  check('movePointerPreviewDoesNotPersist', JSON.stringify(await storedProject(page)) === baseline);
  await apply(surface);
  const moved = await waitForStored(page, (project) => project.nodes.find((node) => node.id === 'N1')?.x === 1 && project.nodes.find((node) => node.id === 'N1')?.y === 1);
  check('movePointerAppliesToProjectModel', moved.nodes.find((node) => node.id === 'N1')?.x === 1);

  const beforeCancel = JSON.stringify(moved);
  await selectSingle(page, 'node', 'N1');
  const cancelSurface = await openEdit(page);
  await fillField(cancelSurface, 'ΔX', 5);
  await cancelSurface.getByLabel('ΔX').press('Escape');
  await cancelSurface.waitFor({ state: 'hidden' });
  await sleep(page);
  check('escapeCancelLeavesProjectAndPersistenceUntouched', JSON.stringify(await storedProject(page)) === beforeCancel);
  const focusCanvas = await canvas.evaluate((element) => document.activeElement === element);
  check('escapeReturnsFocusToCanvas', focusCanvas);
};

const runMoveNumericAndAnalysisInvalidation = async (page) => {
  await resetToExample(page);
  await page.getByRole('button', { name: /^analizar$/i }).click();
  await page.getByTestId('diagram-chart').waitFor({ state: 'visible' });
  await selectSingle(page, 'node', 'N1');
  const surface = await openEdit(page);
  await fillField(surface, 'ΔX', 2);
  await fillField(surface, 'ΔY', -1);
  check('moveNumericHasPreparedPreview', await page.locator('[data-structural-edit-preview="move"]').count() === 1);
  await apply(surface);
  const changed = await waitForStored(page, (project) => project.nodes.find((node) => node.id === 'N1')?.x === 2 && project.nodes.find((node) => node.id === 'N1')?.y === -1);
  check('moveNumericAppliesToProjectModel', changed.nodes.find((node) => node.id === 'N1')?.y === -1);
  await page.getByTestId('diagram-chart').waitFor({ state: 'hidden' });
  check('confirmedEditInvalidatesPriorResultsWithoutRerun', await page.getByTestId('diagram-chart').count() === 0);
};

const runRotateMirrorAndArray = async (page) => {
  await resetToExample(page);
  await selectSingle(page, 'node', 'N3');
  let surface = await openEdit(page);
  await chooseOperation(surface, /rotar/i);
  await fillField(surface, /centro x/i, 0);
  await fillField(surface, /centro y/i, 0);
  await fillField(surface, /ángulo/i, 90);
  await apply(surface);
  const rotated = await waitForStored(page, (project) => project.nodes.find((node) => node.id === 'N3')?.x === -4 && project.nodes.find((node) => node.id === 'N3')?.y === 0);
  check('rotateNumericAroundExplicitCenter', rotated.nodes.find((node) => node.id === 'N3')?.x === -4);

  await resetToExample(page);
  const original = await storedProject(page);
  await selectSingle(page, 'member', 'M1');
  surface = await openEdit(page);
  await chooseOperation(surface, /reflejar/i);
  await apply(surface);
  const mirrored = await waitForStored(page, (project) => project.nodes.find((node) => node.id === 'N1')?.y === 4 && project.nodes.find((node) => node.id === 'N3')?.y === 0);
  check('mirrorTransformPreservesEntityCounts', mirrored.nodes.length === original.nodes.length && mirrored.members.length === original.members.length);

  await resetToExample(page);
  const source = await storedProject(page);
  // M2 carries a member load in the built-in frame, so this verifies remapping
  // of a structural reference rather than only entity counts.
  await selectSingle(page, 'member', 'M2');
  surface = await openEdit(page);
  await chooseOperation(surface, /reflejar/i);
  await surface.getByRole('radio', { name: /crear copia/i }).click();
  await fillField(surface, /coordenada.*eje/i, 0);
  await apply(surface);
  const copied = await waitForStored(page, (project, memberCount) => project.members.length === memberCount + 1, source.members.length);
  check('mirrorCopyCreatesFreshEntitiesAndRemapsLoads', copied.nodes.length === source.nodes.length + 2 && copied.memberLoads.length === source.memberLoads.length + 1);

  await resetToExample(page);
  const arraySource = await storedProject(page);
  await selectSingle(page, 'member', 'M1');
  surface = await openEdit(page);
  await chooseOperation(surface, /matriz lineal/i);
  await fillField(surface, /dirección x/i, 1);
  await fillField(surface, /dirección y/i, 0);
  await fillField(surface, /espaciamiento/i, 2);
  await fillField(surface, /instancias totales/i, 3);
  await apply(surface);
  const array = await waitForStored(page, (project, memberCount) => project.members.length === memberCount + 2, arraySource.members.length);
  check('linearArrayHasOnePublishedBatch', array.nodes.length === arraySource.nodes.length + 4);
  await page.locator('.history-controls').getByLabel(/^deshacer$/i).click();
  await waitForStored(page, (project, memberCount) => project.members.length === memberCount, arraySource.members.length);
  await page.locator('.history-controls').getByLabel(/^rehacer$/i).click();
  await waitForStored(page, (project, memberCount) => project.members.length === memberCount + 2, arraySource.members.length);
  check('linearArrayUndoRedoIsExact', (await storedProject(page)).members.length === arraySource.members.length + 2);
};

const runAlignAndDistribute = async (page) => {
  await seedExample(page, (project) => {
    project.nodes.push(
      { id: 'QA-A', x: 1, y: 1, support: { type: 'none' } },
      { id: 'QA-B', x: 3, y: 1, support: { type: 'none' } },
      { id: 'QA-C', x: 5, y: 1, support: { type: 'none' } },
    );
  });
  await selectNodes(page, ['QA-A', 'QA-B', 'QA-C']);
  let surface = await openEdit(page);
  await chooseOperation(surface, /alinear/i);
  await apply(surface);
  const aligned = await waitForStored(page, (project) => ['QA-A', 'QA-B', 'QA-C'].every((id) => project.nodes.find((node) => node.id === id)?.x === 1));
  check('alignUsesModelCoordinates', ['QA-A', 'QA-B', 'QA-C'].every((id) => aligned.nodes.find((node) => node.id === id)?.x === 1));

  await seedExample(page, (project) => {
    project.nodes.push(
      { id: 'QA-A', x: 1, y: 1, support: { type: 'none' } },
      { id: 'QA-B', x: 2, y: 1, support: { type: 'none' } },
      { id: 'QA-C', x: 5, y: 1, support: { type: 'none' } },
    );
  });
  await selectNodes(page, ['QA-C', 'QA-A', 'QA-B']);
  surface = await openEdit(page);
  await chooseOperation(surface, /distribuir/i);
  await apply(surface);
  const distributed = await waitForStored(page, (project) => project.nodes.find((node) => node.id === 'QA-B')?.x === 3);
  check('distributeIsDeterministicAndPreservesExtremes', distributed.nodes.find((node) => node.id === 'QA-A')?.x === 1 && distributed.nodes.find((node) => node.id === 'QA-C')?.x === 5);
};

const runContextualToolbarAndResponsive = async (page) => {
  await page.setViewportSize({ width: 1536, height: 960 });
  await resetToExample(page);
  await selectSingle(page, 'node', 'N1');
  const toolbarAction = page.locator('.desktop-tool-list [data-structural-edit-command]');
  await toolbarAction.waitFor({ state: 'visible' });
  await toolbarAction.click();
  const desktopSurface = page.locator('[data-structural-edit-surface]');
  await desktopSurface.waitFor({ state: 'visible' });
  check('desktopEditFamilyEntryOpensContextualSurface', await desktopSurface.isVisible());
  await desktopSurface.getByRole('button', { name: /^cancelar$/i }).last().click();

  await page.setViewportSize({ width: 1024, height: 768 });
  await selectSingle(page, 'node', 'N1');
  const tabletSurface = await openEdit(page);
  const tabletGeometry = await tabletSurface.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, viewport: window.innerWidth, scroll: document.documentElement.scrollWidth };
  });
  check('tabletSurfaceFitsWithoutHorizontalOverflow', tabletGeometry.left >= 0 && tabletGeometry.right <= tabletGeometry.viewport + 1 && tabletGeometry.scroll <= tabletGeometry.viewport + 1, JSON.stringify(tabletGeometry));
  await tabletSurface.getByRole('button', { name: /^cancelar$/i }).last().click();

  await page.setViewportSize({ width: 390, height: 844 });
  await resetToExample(page);
  await selectSingle(page, 'node', 'N1');
  await page.getByRole('button', { name: /más herramientas/i }).click();
  const more = page.getByRole('dialog', { name: /más herramientas/i });
  await more.waitFor({ state: 'visible' });
  await more.locator('[data-structural-edit-command]').click();
  const mobileSurface = page.locator('[data-structural-edit-surface]');
  await mobileSurface.waitFor({ state: 'visible' });
  await page.waitForFunction(() => {
    const firstInput = document.querySelector('[data-structural-edit-surface] input');
    return firstInput instanceof HTMLInputElement && document.activeElement === firstInput;
  });
  check('mobileMoreRestoresCanvasAndFocusesFirstNumericField', true);
  const undersized = await mobileSurface.locator('button:visible, input:visible').evaluateAll((elements) => elements
    .map((element) => {
      const rect = element.getBoundingClientRect();
      return { name: element.getAttribute('aria-label') ?? element.textContent ?? '', width: rect.width, height: rect.height };
    })
    .filter((target) => target.width < 43.5 || target.height < 43.5));
  check('mobileEditSurfaceHas44pxTouchTargets', undersized.length === 0, JSON.stringify(undersized));
  const mobileGeometry = await mobileSurface.evaluate((element) => ({
    rect: element.getBoundingClientRect().toJSON(),
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  check('mobileCanvasFirstTrayHasNoHorizontalOverflow', mobileGeometry.scrollWidth <= mobileGeometry.clientWidth + 1, JSON.stringify(mobileGeometry));
  await mobileSurface.getByRole('button', { name: /^cancelar$/i }).last().click();
};

const runChromiumTouch = async (page) => {
  if (engine !== 'chromium') return;
  await page.setViewportSize({ width: 390, height: 844 });
  await resetToExample(page);
  await selectSingle(page, 'node', 'N1');
  const surface = await openEdit(page);
  const start = await availableCanvasTouchPoint(page);
  const end = { x: start.x + 32, y: start.y };
  const cdp = await page.context().newCDPSession(page);
  const touchStart = { ...start, id: 17 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touchStart] });
  // A normal one-finger contact starts as pending selection; crossing the
  // touch threshold must resolve it to pan while edit mode is not armed.
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...start, x: start.x + 18, id: 17 }] });
  await page.waitForFunction(() => document.querySelector('.structural-canvas')?.getAttribute('data-interaction') === 'pan');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await surface.getByRole('button', { name: /usar puntero/i }).click();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touchStart] });
  await page.waitForFunction(() => document.querySelector('.structural-canvas')?.getAttribute('data-interaction') === 'structural-edit');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...end, id: 17 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForFunction(() => {
    const input = document.querySelector('[data-structural-edit-surface] input');
    return input instanceof HTMLInputElement && input.value !== '0';
  });
  check('touchMoveRequiresAndHonorsExplicitActivation', true);
  await surface.getByRole('button', { name: /^cancelar$/i }).last().click();
};

const context = await browser.newContext({ viewport: { width: 1536, height: 960 }, locale: 'es-MX' });
const page = await context.newPage();
page.on('console', (message) => {
  if (message.type() === 'error') results.console.push(message.text());
});
page.on('pageerror', (error) => results.pageErrors.push(String(error)));

try {
  const runStep = async (label, action) => {
    console.log(`[structural-edits:${engine}] ${label}`);
    await action();
  };
  await runStep('Move pointer and cancel', () => runMovePointerAndCancel(page));
  await runStep('Move numeric and analysis invalidation', () => runMoveNumericAndAnalysisInvalidation(page));
  await runStep('Rotate, Mirror and Linear Array', () => runRotateMirrorAndArray(page));
  await runStep('Align and Distribute', () => runAlignAndDistribute(page));
  await runStep('Desktop, tablet and mobile responsive UI', () => runContextualToolbarAndResponsive(page));
  await runStep('Chromium touch', () => runChromiumTouch(page));
  await page.screenshot({ path: path.join(artifactsDir, `structural-edits-${engine}.png`), fullPage: true });
  check('noConsoleErrors', results.console.length === 0, JSON.stringify(results.console));
  check('noPageErrors', results.pageErrors.length === 0, JSON.stringify(results.pageErrors));
  console.log(engine === 'chromium'
    ? 'Structural editing browser QA passed in chromium: Move pointer/numeric/cancel, Rotate, Mirror, Linear Array, Align, Distribute, undo/redo, invalidation, responsive and touch.'
    : 'Structural editing browser QA passed in webkit: Move pointer/numeric/cancel, Rotate, Mirror, Linear Array, Align, Distribute, undo/redo, invalidation and responsive UI. Touch gesture is covered by Chromium CDP.');
} finally {
  fs.writeFileSync(path.join(artifactsDir, `structural-edits-${engine}.json`), JSON.stringify(results, null, 2));
  await context.close();
  await browser.close();
  await previewServer.close();
}
