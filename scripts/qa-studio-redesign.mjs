/** Studio: browser-level regression coverage for discovery and responsive layout. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { chromium, webkit } from 'playwright';
import { preview } from 'vite';
import { disablePwaUpdateLifecycle } from './qa-welcome.mjs';

const engine = process.argv.includes('--chromium') ? 'chromium' : 'webkit';
const output = process.env.STUDIO_QA_OUTPUT ?? path.join(os.tmpdir(), `structureco-studio-${engine}`);
await fs.mkdir(output, { recursive: true });
const server = await preview({ preview: { host: '127.0.0.1', port: 4187, strictPort: true }, logLevel: 'error' });
const browser = await (engine === 'chromium' ? chromium : webkit).launch();
const report = [];
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 834, height: 1112 }, { width: 390, height: 844 }]) {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport, colorScheme: theme, hasTouch: viewport.width < 1000, reducedMotion: 'reduce' });
      await disablePwaUpdateLifecycle(context);
      await context.addInitScript((value) => localStorage.setItem('structureCo.theme', value), theme);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto('http://127.0.0.1:4187/', { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: 'Tu próximo modelo empieza aquí.' }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      const geometry = await page.evaluate(() => ({ viewport: innerWidth, document: document.body.scrollWidth, content: document.querySelector('.sc-home-main').scrollWidth }));
      assert.ok(geometry.document <= viewport.width, JSON.stringify(geometry));
      await page.screenshot({ path: path.join(output, `home-${theme}-${viewport.width}.png`) });
      await page.getByRole('button', { name: /Buscar herramientas/ }).click();
      await page.getByRole('combobox', { name: 'Buscar herramientas' }).fill('plantillas');
      await page.getByRole('combobox', { name: 'Buscar herramientas' }).press('Enter');
      await page.getByRole('heading', { name: 'Elige una estructura de partida' }).waitFor();
      await page.getByRole('button', { name: 'Armaduras', exact: true }).click();
      assert.equal(await page.locator('.welcome-template-card').count(), 2);
      await page.getByRole('textbox', { name: 'Buscar plantillas' }).fill('sin coincidencias');
      assert.equal(await page.locator('.welcome-template-card').count(), 0);
      await page.getByRole('button', { name: 'Restablecer filtros' }).click();
      assert.equal(await page.locator('.welcome-template-card').count(), 6);
      await page.getByRole('button', { name: 'Pórticos', exact: true }).click();
      await page.locator('.welcome-template-card').click();
      await page.getByRole('button', { name: 'Analizar', exact: true }).waitFor();
      const focus = page.getByRole('button', { name: 'Activar concentración', exact: true });
      await focus.click();
      assert.equal(await page.getByRole('button', { name: 'Ir al inicio', exact: true }).isVisible(), true);
      assert.equal(await page.getByRole('button', { name: 'Analizar', exact: true }).isVisible(), true);
      await page.getByRole('button', { name: 'Salir de concentración', exact: true }).click();
      await page.getByRole('button', { name: 'Analizar', exact: true }).click();
      await page.getByLabel('Análisis actualizado', { exact: true }).waitFor({ timeout: 20000 });
      if (viewport.width === 390) {
        const results = await page.locator('.results-panel').boundingBox();
        const analyze = await page.getByRole('button', { name: 'Analizar', exact: true }).boundingBox();
        assert.ok(results && results.height <= 360, 'Mobile results must preserve canvas space');
        assert.ok(analyze && analyze.width === 44, 'Mobile Analyze must keep its compact touch target');
        const bar = await page.locator('.topbar').boundingBox();
        const status = await page.locator('.topbar-health-zone').boundingBox();
        assert.ok(bar && status && status.y + status.height <= bar.y + bar.height + 1, 'Status must stay inside the topbar');
        for (const name of ['Ir al inicio', 'Resultados', 'Activar concentración', 'Herramientas del espacio de trabajo']) {
          const target = await page.getByRole('button', { name, exact: true }).boundingBox();
          assert.ok(target && target.width >= 44 && target.height >= 44, `${name} must keep a 44px touch target`);
        }
      }
      await page.screenshot({ path: path.join(output, `editor-${theme}-${viewport.width}.png`) });
      assert.deepEqual(errors, []);
      report.push({ viewport, theme, geometry, search: 'passed', filters: 'passed', focusMode: 'passed', analysis: 'passed', errors });
      await context.close();
    }
  }
} finally {
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
  await server.httpServer.close();
}
console.log(JSON.stringify({ engine, output, scenarios: report.length, report }, null, 2));
