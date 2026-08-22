import fs from 'node:fs';
import path from 'node:path';
import { chromium, webkit } from 'playwright';
import { preview } from 'vite';
import { clearProjectLibraryOnBoot, openWelcomeStep } from './qa-welcome.mjs';

const root = path.resolve(import.meta.dirname, '..');
const outputDir = path.join(root, 'reports', 'evidence', '2026-08-21-clay-workspace-phase-2');
fs.mkdirSync(outputDir, { recursive: true });
const useWebKit = process.argv.includes('--webkit');
const engine = useWebKit ? 'webkit' : 'chromium';

const server = await preview({
  root,
  preview: { host: '127.0.0.1', port: 4192, strictPort: true },
  logLevel: 'error',
});
const baseURL = 'http://127.0.0.1:4192/';
const browser = await (useWebKit ? webkit : chromium).launch({ headless: true });

const allScenarios = [
  { id: 'desktop', width: 1440, height: 900, shell: 'X2' },
  { id: 'tablet', width: 1024, height: 768, shell: 'M1' },
  { id: 'mobile', width: 390, height: 844, shell: 'K0' },
];
const scenarios = process.argv.includes('--desktop-only') ? allScenarios.slice(0, 1) : allScenarios;

const results = [];

async function placeLoad(page, shortcut, stationRatio) {
  const toolClass = shortcut === 'p' ? 'tool-pointLoad' : 'tool-moment';
  await page.locator(`.desktop-tool-list .${toolClass}`).first().evaluate((element) => element.click());
  await page.locator(`.structural-canvas.${toolClass}`).waitFor({ state: 'attached' });
  const target = page.locator('[data-structure-kind="member"][data-structure-id="M2"]');
  const box = await target.locator('.member-hit').boundingBox();
  if (!box) throw new Error('No se pudo resolver el miembro M2 para colocar la carga.');
  const clickPoint = { x: box.x + box.width * stationRatio, y: box.y + box.height / 2 };
  const receiver = await page.evaluate(({ x, y }) => {
    const object = document.elementFromPoint(x, y)?.closest('[data-structure-object]');
    return object
      ? { kind: object.getAttribute('data-structure-kind'), id: object.getAttribute('data-structure-id') }
      : null;
  }, clickPoint);
  await page.mouse.click(clickPoint.x, clickPoint.y);
  await page.waitForTimeout(180);
  return { clickPoint, receiver };
}

for (const scenario of scenarios) {
  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({
      viewport: { width: scenario.width, height: scenario.height },
      colorScheme: theme,
      reducedMotion: 'no-preference',
    });
    await clearProjectLibraryOnBoot(context);
    await context.addInitScript((nextTheme) => {
      localStorage.setItem('structureCo.theme', nextTheme);
    }, theme);
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));

    await page.goto(baseURL, { waitUntil: 'networkidle' });
    await openWelcomeStep(page, 'Por dónde');
    const shell = page.locator('.app-shell');
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const example = page.locator('.welcome-template-card').filter({ hasText: /Pórtico de ejemplo|Example frame/i }).first();
      try {
        await example.waitFor({ state: 'visible', timeout: 5_000 });
        await example.evaluate((element) => element.click());
        if (await shell.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true, () => false)) break;
      } catch (error) {
        if (attempt === 5) throw error;
      }
      await page.waitForTimeout(400);
      await openWelcomeStep(page, 'Por dónde');
    }
    await shell.waitFor({ state: 'visible' });
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('structureco:fit-canvas')));
    await page.waitForTimeout(220);

    const before = await page.locator('[data-structure-kind="memberLoad"]').count();
    const momentPlacement = await placeLoad(page, 'o', 0.5);
    const afterMoment = await page.locator('[data-structure-kind="memberLoad"]').count();
    await page.keyboard.press('Escape');
    const pointPlacement = await placeLoad(page, 'p', 0.5);
    const afterPoint = await page.locator('[data-structure-kind="memberLoad"]').count();

    if (scenario.shell === 'K0') {
      await page.keyboard.press('Escape');
      await page.keyboard.press('v');
      await page.locator('.canvas-host').click({ position: { x: 22, y: 22 }, force: true });
    }
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('structureco:fit-canvas')));
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.canvas-feedback').waitFor({ state: 'detached', timeout: 3_000 });

    const metrics = await page.evaluate(() => {
      const rootStyle = getComputedStyle(document.documentElement);
      const shell = document.querySelector('.app-shell');
      const point = document.querySelector('[data-structure-kind="memberLoad"].load-symbol--point[data-load-lane="point-outer"]');
      const distributed = document.querySelector('[data-structure-kind="memberLoad"].load-symbol--distributed');
      const moment = document.querySelector('[data-structure-kind="memberLoad"].load-symbol--moment');
      const inspector = document.querySelector('.inspector-panel:not([hidden])');
      const targets = [...document.querySelectorAll('.tool-rail button')]
        .map((item) => {
          const rect = item.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        })
        .filter((rect) => rect.width > 0 && rect.height > 0);
      return {
        shellClass: shell?.getAttribute('data-shell-class'),
        theme: document.documentElement.dataset.theme,
        pointStroke: point ? getComputedStyle(point).stroke : null,
        distributedStroke: distributed ? getComputedStyle(distributed).stroke : null,
        momentStroke: moment ? getComputedStyle(moment).stroke : null,
        pointLane: point?.getAttribute('data-load-lane') ?? null,
        inspectorPresentation: inspector?.getAttribute('data-surface-presentation') ?? null,
        actionPrimary: rootStyle.getPropertyValue('--sc-color-action-primary').trim(),
        actionForeground: rootStyle.getPropertyValue('--sc-color-action-foreground').trim(),
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        minToolWidth: targets.length ? Math.min(...targets.map((item) => item.width)) : 0,
        minToolHeight: targets.length ? Math.min(...targets.map((item) => item.height)) : 0,
      };
    });

    const file = useWebKit ? null : `${scenario.id}-${theme}.png`;
    if (file) await page.screenshot({ path: path.join(outputDir, file), fullPage: false });
    results.push({
      scenario: scenario.id,
      theme,
      viewport: { width: scenario.width, height: scenario.height },
      expectedShell: scenario.shell,
      counts: { before, afterMoment, afterPoint },
      placements: { moment: momentPlacement, point: pointPlacement },
      metrics,
      consoleErrors,
      screenshot: file,
    });
    await context.close();
  }
}

await browser.close();
await server.close();

const failures = results.flatMap((result) => {
  const messages = [];
  if (result.metrics.shellClass !== result.expectedShell) messages.push('shell class');
  if (result.metrics.theme !== result.theme) messages.push('theme');
  if (result.counts.afterMoment !== result.counts.before + 1) messages.push('moment placement');
  if (result.counts.afterPoint !== result.counts.afterMoment + 1) messages.push('point placement');
  if (result.metrics.pointLane !== 'point-outer') messages.push('point overlap lane');
  if (result.metrics.horizontalOverflow) messages.push('horizontal overflow');
  if (result.metrics.minToolWidth < 44 || result.metrics.minToolHeight < 44) messages.push('touch target');
  if (result.consoleErrors.length) messages.push('console errors');
  return messages.map((message) => `${result.scenario}-${result.theme}: ${message}`);
});

const summaryFile = useWebKit ? 'qa-summary-webkit.json' : 'qa-summary.json';
fs.writeFileSync(path.join(outputDir, summaryFile), `${JSON.stringify({ engine, failures, results }, null, 2)}\n`);
if (failures.length) throw new Error(`QA Clay Workspace falló:\n${failures.join('\n')}`);
console.log(`QA Clay Workspace PASS · ${engine} · ${results.length} escenarios · ${outputDir}`);
