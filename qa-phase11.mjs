import { chromium, webkit } from 'playwright';
import { preview } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const artifactsDir = path.join(root, 'qa-artifacts', 'phase11');
fs.mkdirSync(artifactsDir, { recursive: true });

const previewServer = await preview({
  root,
  preview: { host: '127.0.0.1', port: 4181, strictPort: true },
  logLevel: 'error',
});
const baseURL = 'http://127.0.0.1:4181/';

const matrix = [
  { id: 'desktop-large', width: 1536, height: 960, touch: false, theme: 'light' },
  { id: 'laptop', width: 1366, height: 768, touch: false, theme: 'dark' },
  { id: 'tablet-landscape', width: 1194, height: 834, touch: true, theme: 'light' },
  { id: 'tablet-portrait', width: 834, height: 1194, touch: true, theme: 'dark' },
  { id: 'mobile', width: 430, height: 932, touch: true, theme: 'light' },
  { id: 'mobile-compact', width: 390, height: 844, touch: true, theme: 'dark' },
  { id: 'zoom-200-equivalent', width: 683, height: 384, touch: false, theme: 'light' },
];

const output = { generatedAt: new Date().toISOString(), browsers: {}, errors: [] };

const isInside = (box, viewport, tolerance = 1) => Boolean(box)
  && box.x >= -tolerance
  && box.y >= -tolerance
  && box.x + box.width <= viewport.width + tolerance
  && box.y + box.height <= viewport.height + tolerance;

const runViewport = async (browserName, browser, spec) => {
  const context = await browser.newContext({
    viewport: { width: spec.width, height: spec.height },
    hasTouch: spec.touch,
    isMobile: spec.width <= 700,
    locale: 'es-MX',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) errors.push(`console ${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`page: ${String(error)}`));

  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.welcome-example-card').first().click();
  await page.locator('.app-shell').waitFor({ state: 'visible' });
  await page.evaluate((theme) => { document.documentElement.dataset.theme = theme; }, spec.theme);

  const shellMetrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollHeight: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight,
  }));
  const checks = {
    noHorizontalOverflow: shellMetrics.scrollWidth <= shellMetrics.clientWidth + 1,
    noPageScrollTrap: shellMetrics.scrollHeight <= shellMetrics.clientHeight + 1,
    canvasVisible: await page.locator('svg.structural-canvas').isVisible(),
    primaryToolSurfaceVisible: spec.width >= 1024
      ? await page.locator('.desktop-tool-list').isVisible()
      : await page.locator('.mobile-tool-dock').isVisible(),
  };

  if (spec.width >= 1024) {
    const resize = page.locator('.inspector-resize-handle');
    checks.persistentInspector = await page.locator('.inspector-panel').isVisible();
    checks.inspectorResizeVisible = await resize.isVisible();
    const before = await page.locator('.app-shell').evaluate((element) => getComputedStyle(element).getPropertyValue('--inspector-w').trim());
    await resize.focus();
    await page.keyboard.press('ArrowLeft');
    const after = await page.locator('.app-shell').evaluate((element) => getComputedStyle(element).getPropertyValue('--inspector-w').trim());
    checks.inspectorKeyboardResize = before !== after;
    checks.inspectorWidthPersisted = await page.evaluate(() => {
      const stored = JSON.parse(localStorage.getItem('structureco:workspace-layout:v1') ?? '{}');
      return typeof stored.inspectorWidth === 'number' && stored.inspectorWidth >= 280 && stored.inspectorWidth <= 480;
    });
  } else {
    const inspectorLauncher = page.locator('.mobile-inspector-toggle');
    await inspectorLauncher.click();
    const inspector = page.locator('.inspector-panel.mobile-open');
    await inspector.waitFor({ state: 'visible' });
    checks.inspectorDialog = await inspector.getAttribute('role') === 'dialog';
    checks.inspectorWithinViewport = isInside(await inspector.boundingBox(), spec);
    const frequentTargets = await page.locator('.inspector-tabs button:visible, .mobile-tool-dock button:visible, .mobile-inspector-close:visible').evaluateAll((elements) => elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }));
    checks.touchTargetsAtLeast44 = frequentTargets.length > 0
      && frequentTargets.every(({ width, height }) => width >= 44 && height >= 44);
    await page.keyboard.press('Escape');
    checks.inspectorEscapeCloses = await inspector.isHidden();
    await page.waitForFunction(() => document.activeElement?.classList.contains('mobile-inspector-toggle'));
    checks.inspectorFocusReturns = await inspectorLauncher.evaluate((element) => element === document.activeElement);

    const resultLauncher = page.locator('.results-mobile-toggle');
    await resultLauncher.click();
    const results = page.locator('.results-panel[role="dialog"]');
    await results.waitFor({ state: 'visible' });
    await page.waitForTimeout(420);
    const resultBox = await results.boundingBox();
    const resultLayout = await page.evaluate(() => {
      const panel = document.querySelector('.results-panel[role="dialog"]')?.getBoundingClientRect();
      const canvas = document.querySelector('.canvas-host')?.getBoundingClientRect();
      if (!panel || !canvas) return null;
      const exposedTop = Math.max(0, canvas.top);
      const exposedBottom = Math.min(canvas.bottom, panel.top);
      const visibleModelObjectCount = [...document.querySelectorAll('.member-object, .node-object')]
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0
            && rect.height > 0
            && rect.right > canvas.left
            && rect.left < canvas.right
            && rect.bottom > exposedTop
            && rect.top < exposedBottom;
        }).length;
      return {
        exposedCanvasHeight: Math.max(0, exposedBottom - exposedTop),
        visibleModelObjectCount,
      };
    });
    checks.resultsDialog = await results.getAttribute('aria-modal') === 'true';
    checks.resultsWithinViewport = isInside(resultBox, spec);
    checks.resultsPresentation = spec.width <= 700
      ? Boolean(resultBox
        && resultBox.width >= spec.width - 1
        && resultBox.height >= Math.min(180, spec.height * 0.42)
        && resultBox.height < spec.height * 0.75)
      : Boolean(resultBox && resultBox.height < spec.height * 0.8 && resultBox.height >= 220);
    checks.resultsLeaveModelVisible = Boolean(
      resultLayout && resultLayout.exposedCanvasHeight >= Math.min(180, spec.height * 0.24),
    );
    checks.resultsShowModelGeometry = Boolean(resultLayout && resultLayout.visibleModelObjectCount > 0);
    await page.keyboard.press('Escape');
    checks.resultsEscapeCloses = await results.isHidden();
    checks.resultsFocusReturns = await resultLauncher.evaluate((element) => element === document.activeElement);
  }

  checks.safeAreaRules = await page.evaluate(() => {
    const css = [...document.styleSheets].flatMap((sheet) => {
      try { return [...sheet.cssRules].map((rule) => rule.cssText); } catch { return []; }
    }).join('\n');
    return css.includes('safe-area-inset-top') && css.includes('safe-area-inset-bottom');
  });

  await page.screenshot({
    path: path.join(artifactsDir, `${browserName}-${spec.id}-${spec.theme}.png`),
    fullPage: false,
  });
  await context.close();
  return { viewport: `${spec.width}x${spec.height}`, touch: spec.touch, theme: spec.theme, checks, errors };
};

for (const [browserName, browserType, specs, launchOptions] of [
  ['chromium', chromium, matrix, {
    headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome',
    executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
  }],
  ['webkit', webkit, matrix.filter(({ id }) => ['tablet-portrait', 'mobile', 'zoom-200-equivalent'].includes(id)), { headless: true }],
]) {
  const browser = await browserType.launch(launchOptions);
  output.browsers[browserName] = {};
  for (const spec of specs) {
    output.browsers[browserName][spec.id] = await runViewport(browserName, browser, spec);
  }
  await browser.close();
}

await previewServer.close();
const failures = [];
for (const [browserName, rows] of Object.entries(output.browsers)) {
  for (const [viewportName, row] of Object.entries(rows)) {
    for (const [check, value] of Object.entries(row.checks)) {
      if (value !== true) failures.push(`${browserName}/${viewportName}: ${check}`);
    }
    failures.push(...row.errors.map((error) => `${browserName}/${viewportName}: ${error}`));
  }
}
fs.writeFileSync(path.join(artifactsDir, 'phase11-results.json'), JSON.stringify(output, null, 2));
console.log(JSON.stringify(output, null, 2));
if (failures.length) throw new Error(`QA Fase 11 fallida: ${failures.join('; ')}`);
