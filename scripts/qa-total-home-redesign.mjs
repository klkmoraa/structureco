/** Total visual redesign · Home browser oracle (X2 / M1 / K0, Day / Night). */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { preview } from 'vite';
import { clearProjectLibraryOnBoot } from './qa-welcome.mjs';

const root = path.resolve(import.meta.dirname, '..');
const outputDir = path.join(root, 'reports', 'evidence', '2026-08-22-total-home-redesign');
fs.mkdirSync(outputDir, { recursive: true });

const scenarios = [
  { id: 'desktop-day', viewport: { width: 1440, height: 960 }, theme: 'light', hasTouch: false },
  { id: 'tablet-night', viewport: { width: 1024, height: 900 }, theme: 'dark', hasTouch: true },
  { id: 'mobile-day', viewport: { width: 390, height: 844 }, theme: 'light', hasTouch: true },
  { id: 'mobile-night', viewport: { width: 390, height: 844 }, theme: 'dark', hasTouch: true },
];

const report = { phase: 'total-home-redesign', generatedAt: new Date().toISOString(), scenarios: [], failures: [] };
const server = await preview({ root, preview: { host: '127.0.0.1', port: 4209, strictPort: true }, logLevel: 'error' });
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome' });

try {
  for (const scenario of scenarios) {
    const context = await browser.newContext({
      viewport: scenario.viewport,
      colorScheme: scenario.theme,
      hasTouch: scenario.hasTouch,
      reducedMotion: 'no-preference',
    });
    await clearProjectLibraryOnBoot(context);
    await context.addInitScript((theme) => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('structureCo.theme', theme);
    }, scenario.theme);

    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    await page.goto('http://127.0.0.1:4209/', { waitUntil: 'networkidle' });
    await page.getByTestId('welcome-screen').waitFor({ state: 'visible', timeout: 30_000 });
    await page.locator('.sc-home-hero').waitFor({ state: 'visible' });
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.three-structural-image').evaluate(async (image) => {
      if (image instanceof HTMLImageElement && !image.complete) await new Promise((resolve) => image.addEventListener('load', resolve, { once: true }));
      if (image instanceof HTMLImageElement && typeof image.decode === 'function') await image.decode().catch(() => undefined);
    });
    await page.evaluate(async () => {
      await Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => undefined)));
    });

    const metrics = await page.evaluate(() => {
      const visible = (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };
      const rectOf = (selector) => {
        const element = document.querySelector(selector);
        if (!element || !visible(element)) return null;
        const rect = element.getBoundingClientRect();
        return { width: Math.round(rect.width), height: Math.round(rect.height), top: Math.round(rect.top), bottom: Math.round(rect.bottom) };
      };
      const smallTargets = [...document.querySelectorAll('.sc-home button, .sc-home select')]
        .filter(visible)
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return { label: element.getAttribute('aria-label') || element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 60), width: Math.round(rect.width), height: Math.round(rect.height) };
        })
        .filter(({ width, height }) => width < 44 || height < 44);
      const translucent = [...document.querySelectorAll('.sc-home *')]
        .filter(visible)
        .map((element) => ({ className: element.className, backdrop: getComputedStyle(element).backdropFilter }))
        .filter(({ backdrop }) => backdrop && backdrop !== 'none');
      const primary = document.querySelector('.sc-home-continue');
      const hero = document.querySelector('.sc-home-hero');
      return {
        theme: document.documentElement.dataset.theme ?? null,
        horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
        sidebar: rectOf('.sc-home-sidebar'),
        mobileHeader: rectOf('.sc-home-mobile-header'),
        hero: rectOf('.sc-home-hero'),
        heroAsset: rectOf('.sc-home-hero-asset'),
        quickActions: document.querySelectorAll('.sc-home-quick-row > button').length,
        recentLimit: document.querySelectorAll('.sc-home-recents .project-hub__row').length,
        assetId: document.querySelector('.sc-home-hero-asset [data-structural-asset-id]')?.getAttribute('data-structural-asset-id') ?? null,
        oldStepRail: Boolean(document.querySelector('.welcome-steps')),
        oldPortal: Boolean(document.querySelector('.portal-hero')),
        smallTargets,
        translucent,
        primaryColor: primary ? getComputedStyle(primary).color : null,
        primaryText: primary?.textContent?.trim().replace(/\s+/g, ' ') ?? null,
        primaryTextOpacity: primary?.querySelector('span') ? getComputedStyle(primary.querySelector('span')).opacity : null,
        heroShadow: hero ? getComputedStyle(hero).boxShadow : null,
      };
    });

    const failures = [];
    if (metrics.theme !== scenario.theme) failures.push(`theme=${metrics.theme}`);
    if (metrics.horizontalOverflow > 1) failures.push(`horizontalOverflow=${metrics.horizontalOverflow}`);
    if (!metrics.hero || !metrics.heroAsset || !metrics.assetId) failures.push('missingHeroOrStructuralAsset');
    if (metrics.assetId && !metrics.assetId.startsWith('portal:')) failures.push(`nonPortalHero=${metrics.assetId}`);
    if (metrics.quickActions !== 3) failures.push(`quickActions=${metrics.quickActions}`);
    if (metrics.recentLimit > 3) failures.push(`recentLimit=${metrics.recentLimit}`);
    if (metrics.oldStepRail || metrics.oldPortal) failures.push('legacyHomeSurfaceVisible');
    if (scenario.viewport.width <= 760 && (!metrics.mobileHeader || metrics.sidebar)) failures.push('mobileCompositionMismatch');
    if (scenario.viewport.width > 760 && (!metrics.sidebar || metrics.mobileHeader)) failures.push('desktopCompositionMismatch');
    if (scenario.hasTouch && metrics.smallTargets.length) failures.push(`smallTargets=${JSON.stringify(metrics.smallTargets)}`);
    if (metrics.translucent.length) failures.push(`backdropFilters=${metrics.translucent.length}`);
    if (metrics.primaryColor !== 'rgb(255, 255, 255)') failures.push(`primaryColor=${metrics.primaryColor}`);
    if (!metrics.primaryText || metrics.primaryTextOpacity !== '1') failures.push(`primaryText=${metrics.primaryText}/${metrics.primaryTextOpacity}`);
    if (!metrics.heroShadow || metrics.heroShadow === 'none') failures.push('missingHeroDepth');
    failures.push(...consoleErrors.map((error) => `console=${error}`));

    const screenshot = `${scenario.id}.png`;
    await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });
    report.scenarios.push({ ...scenario, screenshot, metrics, consoleErrors, failures });
    report.failures.push(...failures.map((failure) => `${scenario.id}: ${failure}`));
    await context.close();
  }
} finally {
  await browser.close();
  await server.close();
}

fs.writeFileSync(path.join(outputDir, 'qa-summary.json'), `${JSON.stringify(report, null, 2)}\n`);
if (report.failures.length) throw new Error(`Home redesign QA failed:\n${report.failures.join('\n')}`);
console.log(`Home redesign QA PASS · ${report.scenarios.length} captures · ${path.relative(root, outputDir)}`);
