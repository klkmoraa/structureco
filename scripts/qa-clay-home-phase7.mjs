/** Fase 7 · Inicio Clay: jerarquía editorial y densidad real X2/M1/K0. */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { preview } from 'vite';
import { clearProjectLibraryOnBoot } from './qa-welcome.mjs';

const root = path.resolve(import.meta.dirname, '..');
const outputDir = path.join(root, 'reports', 'evidence', '2026-08-21-clay-home-phase-7');
fs.mkdirSync(outputDir, { recursive: true });

const server = await preview({ root, preview: { host: '127.0.0.1', port: 4197, strictPort: true }, logLevel: 'error' });
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome' });
const baseURL = 'http://127.0.0.1:4197/';
const report = { phase: 'clay-home-phase-7', scenarios: [], failures: [] };

const scenarios = [
  { id: 'desktop-day', viewport: { width: 1440, height: 960 }, theme: 'light' },
  { id: 'tablet-night', viewport: { width: 1024, height: 900 }, theme: 'dark' },
  { id: 'mobile-day', viewport: { width: 390, height: 844 }, theme: 'light' },
  { id: 'mobile-night', viewport: { width: 390, height: 844 }, theme: 'dark' },
];

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
    await page.locator('.home-dashboard').waitFor({ state: 'visible' });
    await page.locator('.project-hub, .welcome-hub-band').waitFor({ state: 'visible' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(220);

    const metrics = await page.evaluate(() => {
      const rectOf = (selector) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return { width: Math.round(rect.width), height: Math.round(rect.height), top: Math.round(rect.top), bottom: Math.round(rect.bottom) };
      };
      const quickActions = [...document.querySelectorAll('.home-quick-actions > button')];
      const actionStyles = quickActions.map((button) => {
        const style = getComputedStyle(button);
        return { height: Math.round(button.getBoundingClientRect().height), backdrop: style.backdropFilter };
      });
      return {
        theme: document.documentElement.dataset.theme ?? null,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        dashboard: rectOf('.home-dashboard'),
        resume: rectOf('.welcome-resume-card'),
        portal: rectOf('.home-dashboard .welcome-portal'),
        hub: rectOf('.project-hub, .welcome-hub-band'),
        quickActionCount: quickActions.length,
        actionStyles,
        stepRailVisible: Boolean(document.querySelector('.welcome-steps')),
      };
    });

    const failures = [];
    if (metrics.theme !== scenario.theme) failures.push(`theme=${metrics.theme}`);
    if (metrics.overflow > 1) failures.push(`overflow=${metrics.overflow}`);
    if (!metrics.dashboard || !metrics.resume || !metrics.portal || !metrics.hub) failures.push('missing-home-surface');
    if (metrics.quickActionCount !== 4) failures.push(`quickActionCount=${metrics.quickActionCount}`);
    if (metrics.stepRailVisible) failures.push('stepRailVisible=true');
    if (metrics.actionStyles.some((action) => action.backdrop && action.backdrop !== 'none')) failures.push('actionBackdrop=true');
    if (scenario.viewport.width <= 700 && metrics.resume && metrics.resume.height > 232) failures.push(`mobileResumeHeight=${metrics.resume.height}`);
    failures.push(...consoleErrors.map((error) => `console=${error}`));

    const screenshot = `${scenario.id}.png`;
    await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });
    report.scenarios.push({ ...scenario, metrics, screenshot, consoleErrors, failures });
    report.failures.push(...failures.map((failure) => `${scenario.id}: ${failure}`));
    await context.close();
  }
} finally {
  await browser.close();
  await server.close();
}

fs.writeFileSync(path.join(outputDir, 'qa-summary.json'), `${JSON.stringify(report, null, 2)}\n`);
if (report.failures.length) throw new Error(`QA Fase 7 falló:\n${report.failures.join('\n')}`);
console.log(`QA Fase 7 PASS · ${report.scenarios.length} capturas · ${path.relative(root, outputDir)}`);
