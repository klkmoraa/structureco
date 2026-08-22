/** Fase 5 · Paneles compactos, resultados móviles y propiedades opcionales. */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { preview } from 'vite';
import { clearProjectLibraryOnBoot, openWelcomeStep } from './qa-welcome.mjs';

const root = path.resolve(import.meta.dirname, '..');
const outputDir = path.join(root, 'reports', 'evidence', '2026-08-21-clay-mobile-density-phase-5');
fs.mkdirSync(outputDir, { recursive: true });
const server = await preview({ root, preview: { host: '127.0.0.1', port: 4195, strictPort: true }, logLevel: 'error' });
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome' });
const baseURL = 'http://127.0.0.1:4195/';
const scenarios = [
  { id: 'desktop-day', viewport: { width: 1440, height: 900 }, theme: 'light', shell: 'X2' },
  { id: 'tablet-night', viewport: { width: 1024, height: 768 }, theme: 'dark', shell: 'M1' },
  { id: 'mobile-day', viewport: { width: 390, height: 844 }, theme: 'light', shell: 'K0' },
  { id: 'mobile-night', viewport: { width: 390, height: 844 }, theme: 'dark', shell: 'K0', hideMetrics: true },
];
const report = { phase: 'clay-mobile-density-phase-5', scenarios: [], failures: [] };

async function enterWorkspace(page) {
  const shell = page.locator('.app-shell');
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await openWelcomeStep(page, 'Por dónde');
    const example = page.locator('.welcome-template-card').filter({ hasText: /Pórtico de ejemplo|Example frame/i }).first();
    try {
      await example.waitFor({ state: 'visible', timeout: 5_000 });
      await example.evaluate((element) => element.click());
      await shell.waitFor({ state: 'visible', timeout: 5_000 });
      return;
    } catch (error) {
      if (attempt === 5) throw error;
      await page.waitForTimeout(400);
    }
  }
}

async function openResults(page, shell) {
  let panelItemCount = 0;
  if (shell === 'K0') {
    await page.getByRole('button', { name: /más herramientas/i }).click();
    await page.getByRole('menuitem', { name: 'Paneles de trabajo' }).click();
    panelItemCount = await page.getByRole('menu', { name: 'Paneles de trabajo' }).getByRole('menuitem').count();
    await page.getByRole('menuitem', { name: 'Resultados' }).click();
  } else {
    await page.getByRole('button', { name: 'Abrir paneles de trabajo' }).click();
    panelItemCount = await page.getByRole('menu', { name: 'Paneles de trabajo' }).getByRole('menuitem').count();
    await page.getByRole('menuitem', { name: 'Resultados' }).click();
  }
  const results = page.locator('[data-workspace-surface="results"]');
  await results.waitFor({ state: 'visible', timeout: 8_000 });
  const analyze = results.getByRole('button', { name: /analizar estructura/i });
  if (await analyze.count()) {
    const globalAnalyze = page.locator('.topbar .analyze-button');
    if (await globalAnalyze.count()) await globalAnalyze.click();
    else await analyze.click();
  }
  await results.locator('[data-testid="diagram-chart"]').waitFor({ state: 'visible', timeout: 8_000 });
  return { results, panelItemCount };
}

try {
  for (const scenario of scenarios) {
    const context = await browser.newContext({ viewport: scenario.viewport, colorScheme: scenario.theme, reducedMotion: 'no-preference' });
    await clearProjectLibraryOnBoot(context);
    await context.addInitScript((theme) => localStorage.setItem('structureCo.theme', theme), scenario.theme);
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    await page.goto(baseURL, { waitUntil: 'networkidle' });
    await enterWorkspace(page);
    const { results, panelItemCount } = await openResults(page, scenario.shell);

    if (scenario.hideMetrics) await results.getByRole('button', { name: 'Ocultar tarjetas de resultados' }).click();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);

    const metrics = await page.evaluate(() => {
      const appShell = document.querySelector('.app-shell');
      const resultsPanel = document.querySelector('[data-workspace-surface="results"]');
      const metricRail = document.querySelector('[data-testid="results-mobile-metrics"]');
      const dock = document.querySelector('.mobile-tool-dock');
      const directWorkspaceButtons = [...document.querySelectorAll('[data-workspace-surface-command]')]
        .filter((element) => element.closest('[data-workspace-panels-launcher]') === null).length;
      return {
        shell: appShell?.getAttribute('data-shell-class'),
        theme: document.documentElement.dataset.theme,
        resultPresentation: resultsPanel?.getAttribute('data-surface-presentation'),
        resultHeightRatio: resultsPanel ? resultsPanel.getBoundingClientRect().height / window.innerHeight : null,
        hasPanelLauncher: Boolean(document.querySelector('[data-workspace-panels-launcher]')),
        directWorkspaceButtons,
        metricRail: metricRail ? {
          visible: metricRail.getAttribute('data-mobile-metrics-visible'),
          hidden: metricRail.hidden,
          horizontal: metricRail.querySelector('.result-extreme-grid')?.classList.contains('is-mobile-rail') ?? false,
          cards: metricRail.querySelectorAll('.result-extreme-card').length,
        } : null,
        chart: Boolean(resultsPanel?.querySelector('[data-testid="diagram-chart"]')),
        dock: dock ? { width: dock.getBoundingClientRect().width, viewportWidth: window.innerWidth } : null,
        noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
        resultsBackdropFilter: resultsPanel ? getComputedStyle(resultsPanel).backdropFilter : null,
        actionForeground: getComputedStyle(document.documentElement).getPropertyValue('--sc-color-action-foreground').trim(),
      };
    });
    metrics.panelItemCount = panelItemCount;
    const failures = [];
    if (metrics.shell !== scenario.shell) failures.push(`shell=${metrics.shell}`);
    if (metrics.theme !== scenario.theme) failures.push(`theme=${metrics.theme}`);
    if (!metrics.hasPanelLauncher) failures.push('missing workspace panels launcher');
    if (metrics.directWorkspaceButtons !== 0) failures.push(`direct workspace buttons=${metrics.directWorkspaceButtons}`);
    if (metrics.panelItemCount !== 3) failures.push(`panel items=${metrics.panelItemCount}`);
    if (!metrics.chart) failures.push('missing diagram chart');
    if (scenario.shell === 'K0') {
      if (!metrics.metricRail?.horizontal) failures.push('mobile metrics are not a horizontal rail');
      if ((metrics.metricRail?.cards ?? 0) < 2) failures.push(`mobile metric cards=${metrics.metricRail?.cards ?? 0}`);
      if (!metrics.dock || metrics.dock.width >= metrics.dock.viewportWidth) failures.push(`dock width=${metrics.dock?.width ?? 'none'}`);
      if ((metrics.resultHeightRatio ?? 0) < 0.54) failures.push(`result height ratio=${metrics.resultHeightRatio ?? 'none'}`);
      if (scenario.hideMetrics && (!metrics.metricRail?.hidden || metrics.metricRail.visible !== 'false')) failures.push('mobile metrics did not hide');
    }
    if (!metrics.noHorizontalOverflow) failures.push('horizontal overflow');
    if (metrics.resultsBackdropFilter && metrics.resultsBackdropFilter !== 'none') failures.push(`backdrop filter=${metrics.resultsBackdropFilter}`);
    if (!['#fff', '#ffffff'].includes(metrics.actionForeground.toLowerCase())) failures.push(`cta foreground=${metrics.actionForeground}`);
    failures.push(...consoleErrors.map((error) => `console=${error}`));
    const screenshot = `${scenario.id}.png`;
    await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: false });
    report.scenarios.push({ ...scenario, metrics, consoleErrors, screenshot, failures });
    report.failures.push(...failures.map((failure) => `${scenario.id}: ${failure}`));
    await context.close();
  }
} finally {
  await browser.close();
  await server.close();
}

fs.writeFileSync(path.join(outputDir, 'qa-summary.json'), `${JSON.stringify(report, null, 2)}\n`);
if (report.failures.length) throw new Error(`QA Fase 5 falló:\n${report.failures.join('\n')}`);
console.log(`QA Fase 5 PASS · ${report.scenarios.length} escenarios · ${path.relative(root, outputDir)}`);
