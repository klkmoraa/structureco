/** Structural illustration atlas visual oracle · 40 assets · Day/Night. */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const root = path.resolve(import.meta.dirname, '..');
const outputDir = path.join(root, 'reports', 'evidence', '2026-08-22-structural-assets');
fs.mkdirSync(outputDir, { recursive: true });

const server = await createServer({ root, server: { host: '127.0.0.1', port: 4210, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome' });
const report = { phase: 'structural-assets', generatedAt: new Date().toISOString(), captures: [], failures: [] };

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:4210/__assets', { waitUntil: 'networkidle' });
  await page.getByTestId('structural-asset-studio').waitFor({ state: 'visible' });
  await page.evaluate(() => document.fonts.ready);

  for (const section of await page.locator('[data-asset-family]').all()) {
    const family = await section.getAttribute('data-asset-family');
    await section.screenshot({ path: path.join(outputDir, `family-${family}-light.png`) });
  }

  for (const theme of ['light', 'dark']) {
    if (theme === 'dark') await page.getByRole('button', { name: 'Ver modo Noche' }).click();
    const metrics = await page.evaluate(() => {
      const studio = document.querySelector('[data-testid="structural-asset-studio"]');
      const svgs = [...document.querySelectorAll('svg[data-structural-asset-id]')];
      return {
        theme: studio?.getAttribute('data-theme'),
        cards: document.querySelectorAll('[data-asset-card]').length,
        families: document.querySelectorAll('.asset-studio__family').length,
        uniqueAssets: new Set(svgs.map((svg) => svg.getAttribute('data-structural-asset-id'))).size,
        transparentSvgs: svgs.filter((svg) => getComputedStyle(svg).backgroundColor === 'rgba(0, 0, 0, 0)').length,
        rasterNodes: document.querySelectorAll('.asset-studio__canvas image, .asset-studio__canvas canvas, .asset-studio__canvas foreignObject').length,
        filters: document.querySelectorAll('.asset-studio__canvas filter, .asset-studio__canvas linearGradient, .asset-studio__canvas radialGradient').length,
        horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      };
    });
    const failures = [];
    if (metrics.theme !== theme) failures.push(`theme=${metrics.theme}`);
    if (metrics.cards !== 40 || metrics.uniqueAssets !== 40) failures.push(`assets=${metrics.cards}/${metrics.uniqueAssets}`);
    if (metrics.families !== 10) failures.push(`families=${metrics.families}`);
    if (metrics.transparentSvgs !== 40) failures.push(`transparent=${metrics.transparentSvgs}`);
    if (metrics.rasterNodes || metrics.filters) failures.push(`rasterOrFilters=${metrics.rasterNodes}/${metrics.filters}`);
    if (metrics.horizontalOverflow > 1) failures.push(`horizontalOverflow=${metrics.horizontalOverflow}`);
    const screenshot = `atlas-${theme}.png`;
    await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });
    report.captures.push({ theme, screenshot, metrics, failures });
    report.failures.push(...failures.map((failure) => `${theme}: ${failure}`));
  }
  report.failures.push(...errors.map((error) => `console=${error}`));
} finally {
  await browser.close();
  await server.close();
}

fs.writeFileSync(path.join(outputDir, 'qa-summary.json'), `${JSON.stringify(report, null, 2)}\n`);
if (report.failures.length) throw new Error(`Structural assets QA failed:\n${report.failures.join('\n')}`);
console.log(`Structural assets QA PASS · 40 SVG × 2 themes · ${path.relative(root, outputDir)}`);
