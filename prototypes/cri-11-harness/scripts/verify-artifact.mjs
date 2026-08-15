#!/usr/bin/env node
/**
 * Verifica el bundle de un solo archivo (`npm run build:artifact`) antes de
 * publicarlo como preview fuera de este entorno.
 *
 * Por qué existe separado de `smoke.mjs`: ese script fija el viewport EXTERNO
 * del navegador en 1600×1000 y sólo cambia el marco SIMULADO dentro del
 * laboratorio — nunca prueba cómo se comporta el propio panel del harness
 * cuando el navegador que lo abre es realmente angosto. Éste sí: abre
 * `dist-artifact/index.html` con el viewport EXTERNO en tamaño de escritorio y
 * en tamaño de móvil, porque quien reciba el enlace de preview puede abrirlo
 * desde cualquiera de los dos.
 *
 *   node scripts/verify-artifact.mjs
 *
 * Sale con código 1 ante cualquier error de consola, excepción de página o
 * request fallida (el bundle es de un solo archivo: cualquier request fallida
 * significaría que algo no quedó inlineado).
 */

import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const REPO = path.resolve(ROOT, '../..');
const BUNDLE = path.join(ROOT, 'dist-artifact', 'index.html');
const OUT = path.join(REPO, 'reports/evidence/2026-08-15-cri-11-fase-a');

if (!existsSync(BUNDLE)) {
  console.error(`No existe ${path.relative(REPO, BUNDLE)}. Ejecuta \`npm run build:artifact\` primero.`);
  process.exit(1);
}

const chromiumPath = () => {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!base || !existsSync(base)) return undefined;
  const build = readdirSync(base).filter((entry) => /^chromium-\d+$/.test(entry)).sort().pop();
  if (!build) return undefined;
  const binary = path.join(base, build, 'chrome-linux', 'chrome');
  return existsSync(binary) ? binary : undefined;
};

const errors = [];
mkdirSync(OUT, { recursive: true });

const run = async () => {
  const browser = await chromium.launch({ headless: true, executablePath: chromiumPath() });
  const file = pathToFileURL(BUNDLE).href;

  for (const [label, viewport] of [
    ['desktop', { width: 1440, height: 900 }],
    ['mobile', { width: 390, height: 844 }],
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`[${label}] consola: ${message.text()}`);
    });
    page.on('pageerror', (error) => errors.push(`[${label}] excepción: ${error.message}`));
    page.on('requestfailed', (request) => errors.push(`[${label}] request fallida: ${request.url()}`));

    await page.goto(file, { waitUntil: 'networkidle' });
    await page.locator('.pt-welcome__hero').waitFor({ timeout: 5000 });
    await page.screenshot({ path: path.join(OUT, `artifact-${label}-welcome.png`) });

    await page.getByRole('button', { name: 'Continuar proyecto' }).first().click();
    await page.locator('.pt-shell').waitFor({ timeout: 5000 });
    await page.locator('.pt-canvas .pt-object').first().click();
    await page.locator('.pt-detail__title').first().waitFor({ timeout: 5000 });
    await page.screenshot({ path: path.join(OUT, `artifact-${label}-workspace.png`) });

    await context.close();
    console.log(`✓ ${label} (${viewport.width}×${viewport.height}): Welcome → Workspace → selección, sin errores.`);
  }

  await browser.close();

  if (errors.length > 0) {
    console.error('\nErrores:\n' + errors.join('\n'));
    process.exit(1);
  }
  console.log('\nSin errores de consola, excepciones ni requests fallidas en desktop ni en móvil.');
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
