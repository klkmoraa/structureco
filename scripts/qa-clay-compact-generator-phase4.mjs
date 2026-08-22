/** Fase 4 · Compact útil, navegación Clay y Generator sin superposición. */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { preview } from 'vite';
import { clearProjectLibraryOnBoot, openWelcomeStep } from './qa-welcome.mjs';

const root = path.resolve(import.meta.dirname, '..');
const outputDir = path.join(root, 'reports', 'evidence', '2026-08-21-clay-compact-generator-phase-4');
fs.mkdirSync(outputDir, { recursive: true });
const server = await preview({ root, preview: { host: '127.0.0.1', port: 4194, strictPort: true }, logLevel: 'error' });
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome' });
const baseURL = 'http://127.0.0.1:4194/';
const scenarios = [
  { id: 'desktop-day', viewport: { width: 1440, height: 900 }, theme: 'light', shell: 'X2', presentation: 'floating' },
  { id: 'tablet-night', viewport: { width: 1024, height: 768 }, theme: 'dark', shell: 'M1', presentation: 'inset' },
  { id: 'mobile-day', viewport: { width: 390, height: 844 }, theme: 'light', shell: 'K0', presentation: 'sheet' },
];
const report = { phase: 'clay-compact-generator-phase-4', scenarios: [], failures: [] };

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

    if (scenario.shell === 'K0') {
      await page.getByRole('button', { name: /más herramientas/i }).click();
      await page.locator('.mobile-tool-palette-more [data-structure-generator-command]').click();
    } else {
      await page.locator('.desktop-tool-list [data-structure-generator-command]').click();
    }
    const generator = page.locator('[data-workspace-surface="generator"]');
    await generator.waitFor({ state: 'visible', timeout: 10_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);

    const metrics = await page.evaluate(() => {
      const generator = document.querySelector('[data-workspace-surface="generator"]');
      const detail = document.querySelector('[data-workspace-surface="detail"]');
      const rail = document.querySelector('.tool-rail');
      const dock = document.querySelector('.mobile-tool-dock');
      const launcher = document.querySelector('.workspace-surface-launcher');
      const rect = generator?.getBoundingClientRect();
      const dockRect = dock?.getBoundingClientRect();
      const style = generator ? getComputedStyle(generator) : null;
      return {
        shell: document.querySelector('.app-shell')?.getAttribute('data-shell-class'),
        theme: document.documentElement.dataset.theme,
        presentation: generator?.getAttribute('data-surface-presentation'),
        status: generator?.getAttribute('data-surface-status'),
        detailStatus: detail?.getAttribute('data-surface-status'),
        railWidth: rail?.getBoundingClientRect().width ?? null,
        familyCards: generator?.querySelectorAll('[data-generator-family]').length ?? 0,
        familyPreviews: generator?.querySelectorAll('.generator-family-preview').length ?? 0,
        shadow: style?.boxShadow ?? null,
        backdropFilter: style?.backdropFilter ?? null,
        noDockOverlap: !rect || !dockRect || dockRect.height === 0 || rect.bottom <= dockRect.top + 1,
        noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
        floatingNativeTextButtons: launcher?.querySelectorAll('button:not(.mobile-inspector-toggle)').length ?? 0,
        actionForeground: getComputedStyle(document.documentElement).getPropertyValue('--sc-color-action-foreground').trim(),
      };
    });
    const failures = [];
    if (metrics.shell !== scenario.shell) failures.push(`shell=${metrics.shell}`);
    if (metrics.theme !== scenario.theme) failures.push(`theme=${metrics.theme}`);
    if (metrics.presentation !== scenario.presentation) failures.push(`presentation=${metrics.presentation}`);
    if (metrics.status !== 'active') failures.push(`generator status=${metrics.status}`);
    if (scenario.shell !== 'X2' && metrics.detailStatus !== 'suspended') failures.push(`detail status=${metrics.detailStatus}`);
    if (scenario.shell === 'M1' && (metrics.railWidth === null || metrics.railWidth > 80)) failures.push(`rail width=${metrics.railWidth}`);
    if (metrics.familyCards !== 5 || metrics.familyPreviews !== 5) failures.push(`family cards=${metrics.familyCards}/${metrics.familyPreviews}`);
    if (!metrics.shadow || metrics.shadow === 'none') failures.push('generator without tactile shadow');
    if (metrics.backdropFilter && metrics.backdropFilter !== 'none') failures.push(`backdrop filter=${metrics.backdropFilter}`);
    if (!metrics.noDockOverlap) failures.push('generator overlaps mobile dock');
    if (!metrics.noHorizontalOverflow) failures.push('horizontal overflow');
    if (metrics.floatingNativeTextButtons !== 0) failures.push(`native floating buttons=${metrics.floatingNativeTextButtons}`);
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
if (report.failures.length) throw new Error(`QA Fase 4 falló:\n${report.failures.join('\n')}`);
console.log(`QA Fase 4 PASS · ${report.scenarios.length} escenarios · ${path.relative(root, outputDir)}`);
