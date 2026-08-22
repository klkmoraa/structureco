/** Fase 6 · Barra superior Clay: evidencia visual, Día/Noche y tres composiciones. */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { preview } from 'vite';
import { clearProjectLibraryOnBoot, openWelcomeStep } from './qa-welcome.mjs';

const root = path.resolve(import.meta.dirname, '..');
const outputDir = path.join(root, 'reports', 'evidence', '2026-08-21-clay-topbar-phase-6');
fs.mkdirSync(outputDir, { recursive: true });

const server = await preview({ root, preview: { host: '127.0.0.1', port: 4196, strictPort: true }, logLevel: 'error' });
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome' });
const baseURL = 'http://127.0.0.1:4196/';
const report = { phase: 'clay-topbar-phase-6', scenarios: [], failures: [] };

const scenarios = [
  { id: 'desktop-day', viewport: { width: 1440, height: 900 }, theme: 'light', shell: 'X2' },
  { id: 'tablet-night', viewport: { width: 1100, height: 768 }, theme: 'dark', shell: 'M1' },
  { id: 'mobile-day-project', viewport: { width: 390, height: 844 }, theme: 'light', shell: 'K0', panel: 'project' },
  { id: 'mobile-night-utilities', viewport: { width: 390, height: 844 }, theme: 'dark', shell: 'K0', panel: 'utilities' },
];

async function enterWorkspace(page) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await openWelcomeStep(page, 'Por dónde');
    const example = page.locator('.welcome-template-card').filter({ hasText: /Pórtico de ejemplo|Example frame/i }).first();
    try {
      await example.waitFor({ state: 'visible', timeout: 5_000 });
      await example.evaluate((element) => element.click());
      await page.locator('.app-shell').waitFor({ state: 'visible', timeout: 5_000 });
      await page.waitForTimeout(280);
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
    await context.addInitScript((theme) => {
      localStorage.clear();
      localStorage.setItem('structureCo.theme', theme);
    }, scenario.theme);
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    await page.goto(baseURL, { waitUntil: 'networkidle' });
    await enterWorkspace(page);

    if (scenario.panel === 'project') {
      await page.getByRole('button', { name: /proyecto actual|current project/i }).click();
      await page.getByRole('dialog', { name: /proyecto actual|current project/i }).waitFor({ state: 'visible' });
    }
    if (scenario.panel === 'utilities') {
      await page.getByRole('button', { name: /herramientas del espacio de trabajo|workspace tools/i }).click();
      await page.getByRole('dialog', { name: /herramientas del espacio de trabajo|workspace tools/i }).waitFor({ state: 'visible' });
    }

    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(220);
    const metrics = await page.evaluate(() => {
      const shell = document.querySelector('.app-shell');
      const topbar = document.querySelector('.topbar');
      const analyze = document.querySelector('.topbar .analyze-button');
      const panel = document.querySelector('.topbar-project-panel, .topbar-utilities-panel');
      const style = analyze ? getComputedStyle(analyze) : null;
      return {
        shell: shell?.getAttribute('data-shell-class') ?? null,
        theme: document.documentElement.dataset.theme ?? null,
        topbarHeight: topbar ? Math.round(topbar.getBoundingClientRect().height) : null,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        analyzeForeground: style?.color ?? null,
        analyzeBackdrop: style?.backdropFilter ?? null,
        panelBounds: panel ? (() => {
          const rect = panel.getBoundingClientRect();
          return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
        })() : null,
        visibleProjectTrigger: (() => {
          const trigger = document.querySelector('.topbar-project-trigger');
          return trigger ? getComputedStyle(trigger).display !== 'none' : false;
        })(),
      };
    });
    const failures = [];
    if (metrics.shell !== scenario.shell) failures.push(`shell=${metrics.shell}`);
    if (metrics.theme !== scenario.theme) failures.push(`theme=${metrics.theme}`);
    if (metrics.overflow > 1) failures.push(`overflow=${metrics.overflow}`);
    if (metrics.panelBounds && (metrics.panelBounds.left < -1 || metrics.panelBounds.right > scenario.viewport.width + 1)) failures.push(`panelBounds=${JSON.stringify(metrics.panelBounds)}`);
    if (!['rgb(255, 255, 255)', '#fff', '#ffffff'].includes((metrics.analyzeForeground ?? '').toLowerCase())) failures.push(`analyzeForeground=${metrics.analyzeForeground}`);
    if (metrics.analyzeBackdrop && metrics.analyzeBackdrop !== 'none') failures.push(`analyzeBackdrop=${metrics.analyzeBackdrop}`);
    failures.push(...consoleErrors.map((error) => `console=${error}`));

    const screenshot = `${scenario.id}.png`;
    await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: false });
    report.scenarios.push({ ...scenario, metrics, screenshot, consoleErrors, failures });
    report.failures.push(...failures.map((failure) => `${scenario.id}: ${failure}`));
    await context.close();
  }
} finally {
  await browser.close();
  await server.close();
}

fs.writeFileSync(path.join(outputDir, 'qa-summary.json'), `${JSON.stringify(report, null, 2)}\n`);
if (report.failures.length) throw new Error(`QA Fase 6 falló:\n${report.failures.join('\n')}`);
console.log(`QA Fase 6 PASS · ${report.scenarios.length} capturas · ${path.relative(root, outputDir)}`);
