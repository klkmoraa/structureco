/**
 * Fase 3 · Results Clay: evidencia visual real en los tres shells.
 *
 * Uso: npm run build && node scripts/qa-clay-results-phase3.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { preview } from 'vite';
import { clearProjectLibraryOnBoot, openWelcomeStep, openResultsSurface } from './qa-welcome.mjs';

const root = path.resolve(import.meta.dirname, '..');
const outputDir = path.join(root, 'reports', 'evidence', '2026-08-21-clay-results-phase-3');
fs.mkdirSync(outputDir, { recursive: true });

const server = await preview({
  root,
  preview: { host: '127.0.0.1', port: 4193, strictPort: true },
  logLevel: 'error',
});
const browser = await chromium.launch({ headless: true });
const baseURL = 'http://127.0.0.1:4193/';
const scenarios = [
  { id: 'desktop-day-summary', viewport: { width: 1440, height: 900 }, theme: 'light', expectedShell: 'X2', tab: /^(Resumen|Summary)$/i },
  { id: 'tablet-night-moment', viewport: { width: 1024, height: 768 }, theme: 'dark', expectedShell: 'M1', tab: /^(Momento|Moment)/i },
  { id: 'mobile-day-summary', viewport: { width: 390, height: 844 }, theme: 'light', expectedShell: 'K0', tab: /^(Resumen|Summary)$/i },
];
const report = { phase: 'clay-results-phase-3', scenarios: [], failures: [] };

async function enterExampleWorkspace(page) {
  const shell = page.locator('.app-shell');
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await openWelcomeStep(page, 'Por dónde');
    const example = page.locator('.welcome-template-card').filter({ hasText: /Pórtico de ejemplo|Example frame/i }).first();
    try {
      await example.waitFor({ state: 'visible', timeout: 5_000 });
      await example.click();
      await shell.waitFor({ state: 'visible', timeout: 5_000 });
      return;
    } catch (error) {
      if (attempt === 5) throw error;
      await page.waitForTimeout(400);
    }
  }
}

try {
  for (const scenario of scenarios) {
    const context = await browser.newContext({
      viewport: scenario.viewport,
      colorScheme: scenario.theme,
      reducedMotion: 'no-preference',
    });
    await clearProjectLibraryOnBoot(context);
    await context.addInitScript((theme) => localStorage.setItem('structureCo.theme', theme), scenario.theme);
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', (error) => consoleErrors.push(error.message));

    await page.goto(baseURL, { waitUntil: 'networkidle' });
    await enterExampleWorkspace(page);
    await page.getByRole('button', { name: /analizar|analyze/i }).first().click().catch(() => undefined);
    await page.waitForTimeout(850);
    const panel = await openResultsSurface(page);
    const collapsed = panel.locator('.results-mobile-toggle').first();
    if (await panel.evaluate((node) => node.classList.contains('mobile-collapsed'))) await collapsed.click();
    const tab = panel.getByRole('tab', { name: scenario.tab }).first();
    await tab.click({ timeout: 10_000 });
    const keySurface = scenario.expectedShell === 'K0'
      ? panel
      : scenario.id.includes('moment') ? panel.locator('[data-testid="diagram-chart"]') : panel.locator('.result-extreme-card').first();
    await keySurface.waitFor({ state: 'visible', timeout: 15_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);

    const metrics = await page.evaluate(() => {
      const panel = document.querySelector('.results-panel');
      const chart = document.querySelector('.results-panel .diagram-chart');
      const table = document.querySelector('.results-panel .results-table');
      const selectedTab = document.querySelector('.results-panel .result-tabs button[aria-selected="true"]');
      const style = panel ? getComputedStyle(panel) : null;
      return {
        shell: document.querySelector('.app-shell')?.getAttribute('data-shell-class'),
        theme: document.documentElement.dataset.theme,
        presentation: panel?.getAttribute('data-surface-presentation'),
        panelShadow: style?.boxShadow ?? null,
        panelFilter: style?.backdropFilter ?? null,
        technicalShadows: [chart, table].filter(Boolean).map((node) => getComputedStyle(node).boxShadow),
        selectedTabShadow: selectedTab ? getComputedStyle(selectedTab).boxShadow : null,
        actionForeground: getComputedStyle(document.documentElement).getPropertyValue('--sc-color-action-foreground').trim(),
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });
    const screenshot = `${scenario.id}.png`;
    await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: false });
    const failures = [];
    if (metrics.shell !== scenario.expectedShell) failures.push(`shell=${metrics.shell}`);
    if (metrics.theme !== scenario.theme) failures.push(`theme=${metrics.theme}`);
    if (!metrics.panelShadow || metrics.panelShadow === 'none') failures.push('panel without tactile shadow');
    if (metrics.panelFilter && metrics.panelFilter !== 'none') failures.push(`panel backdrop filter=${metrics.panelFilter}`);
    if (metrics.technicalShadows.some((shadow) => shadow !== 'none')) failures.push(`technical shadow=${metrics.technicalShadows.join(',')}`);
    if (metrics.selectedTabShadow === 'none') failures.push('selected tab without pressed shadow');
    if (metrics.actionForeground.toLowerCase() !== '#fff' && metrics.actionForeground.toLowerCase() !== '#ffffff') failures.push(`cta foreground=${metrics.actionForeground}`);
    if (metrics.horizontalOverflow) failures.push('horizontal overflow');
    if (consoleErrors.length) failures.push(`console=${consoleErrors.join(' | ')}`);
    report.scenarios.push({ ...scenario, metrics, screenshot, consoleErrors, failures });
    report.failures.push(...failures.map((failure) => `${scenario.id}: ${failure}`));
    await context.close();
  }
} finally {
  await browser.close();
  await server.close();
}

fs.writeFileSync(path.join(outputDir, 'qa-summary.json'), `${JSON.stringify(report, null, 2)}\n`);
if (report.failures.length) throw new Error(`QA Results Clay falló:\n${report.failures.join('\n')}`);
console.log(`QA Results Clay PASS · ${report.scenarios.length} escenarios · ${path.relative(root, outputDir)}`);
