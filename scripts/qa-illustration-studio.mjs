import fs from 'node:fs';
import path from 'node:path';
import { chromium, webkit } from 'playwright';
import { createServer } from 'vite';

const root = path.resolve(import.meta.dirname, '..');
const outputDir = path.join(root, 'reports', 'evidence', '2026-08-22-illustration-studio');
fs.mkdirSync(outputDir, { recursive: true });
const useWebkit = process.argv.includes('--webkit');
const engine = useWebkit ? webkit : chromium;
const scenarios = [
  { id: 'desktop-day', viewport: { width: 1440, height: 900 }, theme: 'light', hasTouch: false },
  { id: 'desktop-night', viewport: { width: 1440, height: 900 }, theme: 'dark', hasTouch: false },
  { id: 'mobile-day', viewport: { width: 390, height: 844 }, theme: 'light', hasTouch: true },
  { id: 'mobile-night', viewport: { width: 390, height: 844 }, theme: 'dark', hasTouch: true },
];
const report = { phase: 'illustration-studio', engine: useWebkit ? 'webkit' : 'chromium', generatedAt: new Date().toISOString(), scenarios: [], exports: [], presetActions: null, failures: [] };
const server = await createServer({ root, server: { host: '127.0.0.1', port: 4211, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await engine.launch({ headless: true, ...(useWebkit ? {} : { channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome' }) });
try {
  for (const scenario of scenarios) {
    const context = await browser.newContext({ viewport: scenario.viewport, colorScheme: scenario.theme, hasTouch: scenario.hasTouch });
    await context.addInitScript(() => localStorage.removeItem('structureCo.structural-asset-presets.v1'));
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    await page.goto(`http://127.0.0.1:4211/__illustration-studio?theme=${scenario.theme}`, { waitUntil: 'networkidle' });
    await page.getByRole('dialog', { name: 'Estudio de ilustraciones' }).waitFor();
    await page.locator('canvas[data-structural-render="three-live"]').waitFor();
    await page.waitForTimeout(250);
    const metrics = await page.evaluate(() => {
      const visible = (element) => { const style = getComputedStyle(element); const rect = element.getBoundingClientRect(); return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0; };
      const smallTargets = [...document.querySelectorAll('.illustration-studio button,.illustration-studio select,.illustration-studio input')].filter(visible).map((element) => { const rect = element.getBoundingClientRect(); return { label: element.getAttribute('aria-label') || element.textContent?.trim().slice(0,40), width: Math.round(rect.width), height: Math.round(rect.height) }; }).filter(({ width, height }) => width < 44 || height < 44);
      const canvas = document.querySelector('canvas[data-structural-render="three-live"]');
      const rgb = (value) => (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
      const luminance = (value) => { const channels = rgb(value).map((channel) => { const linear = channel / 255; return linear <= .04045 ? linear / 12.92 : ((linear + .055) / 1.055) ** 2.4; }); return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2]; };
      const contrast = (foreground, background) => { const a = luminance(foreground); const b = luminance(background); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); };
      const lowContrastControls = [...document.querySelectorAll('.illustration-studio select,.illustration-studio input:not([type=range])')].filter(visible).map((element) => { const style = getComputedStyle(element); return { label: element.getAttribute('aria-label') || element.parentElement?.textContent?.trim(), ratio: contrast(style.color, style.backgroundColor), color: style.color, background: style.backgroundColor }; }).filter(({ ratio }) => ratio < 4.5);
      const payload = JSON.parse(localStorage.getItem('structureCo.structural-asset-presets.v1') || '{"presets":[]}');
      return { horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth), smallTargets, lowContrastControls, personalPresets: Array.isArray(payload.presets) ? payload.presets.length : -1, rootTheme: document.querySelector('.illustration-studio')?.getAttribute('data-studio-theme'), previewTheme: document.querySelector('[data-testid="studio-preview-shell"]')?.getAttribute('data-preview-theme'), realWebgl: canvas instanceof HTMLCanvasElement && canvas.dataset.threeReady === 'true', fallback: Boolean(document.querySelector('.illustration-studio__fallback')) };
    });
    const failures = [];
    if (metrics.horizontalOverflow > 1) failures.push(`horizontalOverflow=${metrics.horizontalOverflow}`);
    if (metrics.smallTargets.length) failures.push(`smallTargets=${JSON.stringify(metrics.smallTargets)}`);
    if (metrics.lowContrastControls.length) failures.push(`lowContrastControls=${JSON.stringify(metrics.lowContrastControls)}`);
    if (metrics.personalPresets !== 0) failures.push(`scenarioStorageLeak=${metrics.personalPresets}`);
    if (metrics.rootTheme !== scenario.theme || metrics.previewTheme !== scenario.theme) failures.push(`theme=${metrics.rootTheme}/${metrics.previewTheme}`);
    if (!metrics.realWebgl || metrics.fallback) failures.push('realThreePreviewUnavailable');
    failures.push(...consoleErrors.map((error) => `console=${error}`));
    await page.evaluate(() => { window.scrollTo(0, 0); document.querySelectorAll('.illustration-studio *').forEach((element) => { if (element instanceof HTMLElement) { element.scrollTop = 0; element.scrollLeft = 0; } }); });
    const screenshot = `${scenario.id}${useWebkit ? '-webkit' : ''}.png`;
    await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: false });
    if (scenario.id === 'desktop-day' && !useWebkit) {
      const exports = await page.evaluate(async () => {
        const module = await import('/src/features/structural-assets/studio/studioScene.ts');
        const presets = await import('/src/features/structural-assets/studio/presetRepository.ts');
        const parameters = presets.createFactoryStudioParameters('portal:two-story');
        const png = [];
        for (const scale of [1, 2, 4]) {
          const url = await module.renderStudioPng(parameters, scale);
          const image = new Image(); image.src = url; await image.decode();
          const probe = document.createElement('canvas'); probe.width = image.width; probe.height = image.height;
          const context = probe.getContext('2d'); context.drawImage(image, 0, 0);
          png.push({ scale, width: image.width, height: image.height, cornerAlpha: context.getImageData(0, 0, 1, 1).data[3] });
        }
        const svg = module.serializeStudioSvg(parameters);
        return { png, svgTransparent: !/background(?:-color)?\s*:/i.test(svg) && !/<rect[^>]+(?:fill|style)=/i.test(svg), svgSize: /width="900"/.test(svg) && /height="600"/.test(svg) };
      });
      report.exports.push(exports);
      for (const item of exports.png) if (item.width !== 900 * item.scale || item.height !== 600 * item.scale || item.cornerAlpha !== 0) failures.push(`png${item.scale}x=${JSON.stringify(item)}`);
      if (!exports.svgTransparent || !exports.svgSize) failures.push(`svg=${JSON.stringify(exports)}`);
    }
    report.scenarios.push({ ...scenario, screenshot, metrics, consoleErrors, failures });
    report.failures.push(...failures.map((failure) => `${scenario.id}: ${failure}`));
    await context.close();
  }
  if (!useWebkit) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
    await context.addInitScript(() => localStorage.removeItem('structureCo.structural-asset-presets.v1'));
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4211/__illustration-studio?theme=dark', { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: 'Material' }).click();
    await page.getByRole('button', { name: 'Acero' }).click();
    await page.getByRole('button', { name: 'Duplicar' }).click();
    await page.getByRole('button', { name: 'Restaurar' }).click();
    const result = await page.evaluate(() => {
      const payload = JSON.parse(localStorage.getItem('structureCo.structural-asset-presets.v1') || '{"presets":[]}');
      const input = document.querySelector('.illustration-studio__preset-actions input');
      const style = input ? getComputedStyle(input) : null;
      return { count: payload.presets?.length ?? -1, inputColor: style?.color, inputBackground: style?.backgroundColor };
    });
    report.presetActions = result;
    if (result.count !== 2 || result.inputColor === result.inputBackground) report.failures.push(`presetActions=${JSON.stringify(result)}`);
    await context.close();
  }
} finally { await browser.close(); await server.close(); }
fs.writeFileSync(path.join(outputDir, `qa-summary${useWebkit ? '-webkit' : ''}.json`), `${JSON.stringify(report, null, 2)}\n`);
if (report.failures.length) throw new Error(`Illustration Studio QA failed:\n${report.failures.join('\n')}`);
console.log(`Illustration Studio QA PASS · ${report.engine} · ${report.scenarios.length} captures`);
