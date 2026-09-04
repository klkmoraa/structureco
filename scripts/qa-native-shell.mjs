#!/usr/bin/env node
/**
 * QA del camino nativo, sin necesitar un Mac.
 *
 * El shell iOS no se puede compilar aquí, pero lo que de verdad puede romperse
 * en silencio no es Swift: es el lado web del puente. Un `postMessage` que deja
 * de emitirse, un inset que ya no llega a `--sc-safe-*`, un modal que olvida
 * bloquear el desplazamiento del anfitrión — nada de eso lo nota una prueba de
 * navegador, porque en un navegador ese código simplemente no se ejecuta.
 *
 * Este guion levanta el build sobre un origen HTTP real (equivalente al esquema
 * propio del shell) y suplanta `window.webkit.messageHandlers.structureco`
 * antes de que cargue la aplicación. A partir de ahí la web se cree nativa y se
 * comprueba el contrato de verdad, en los dos sentidos.
 *
 *   npm run build && node scripts/qa-native-shell.mjs
 */
import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');

if (!existsSync(path.join(DIST, 'index.html'))) {
  console.error('No hay build en dist/. Ejecuta `npm run build` primero.');
  process.exit(1);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer(async (request, response) => {
  const requested = decodeURIComponent((request.url ?? '/').split('?')[0]);
  const relative = requested === '/' ? '/index.html' : requested;
  const target = path.join(DIST, relative);
  if (!target.startsWith(DIST)) { response.writeHead(403).end(); return; }
  try {
    const info = await stat(target);
    if (!info.isFile()) throw new Error('not a file');
    response.writeHead(200, { 'Content-Type': MIME[path.extname(target)] ?? 'application/octet-stream' });
    createReadStream(target).pipe(response);
  } catch {
    response.writeHead(404).end();
  }
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const origin = `http://127.0.0.1:${port}/`;

const failures = [];
const check = (label, condition, detail = '') => {
  if (condition) { console.log(`  ✓ ${label}`); return; }
  failures.push(detail ? `${label} — ${detail}` : label);
  console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });

  // Suplantación del anfitrión. Va como init script para que exista antes de
  // que el módulo de entrada pregunte por él: `isNativeHost()` se evalúa en el
  // primer efecto de `App`, y llegar tarde daría un falso negativo.
  await context.addInitScript(() => {
    const received = [];
    Object.defineProperty(window, '__nativeMessages', { value: received, writable: false });
    window.webkit = {
      messageHandlers: {
        structureco: { postMessage: (body) => { received.push(body); } },
      },
    };
  });

  const page = await context.newPage();
  const consoleErrors = [];
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });

  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  console.log('\nPuente instalado');
  check('window.StructureCoNative expuesto', await page.evaluate(() => typeof window.StructureCoNative?.receive === 'function'));
  check(
    'app.ready enviado al anfitrión',
    await page.evaluate(() => window.__nativeMessages.some((m) => m.kind === 'app.ready' && typeof m.version === 'string')),
  );
  check('data-native = true', (await page.getAttribute('html', 'data-native')) === 'true');
  check('data-standalone = true dentro del shell', (await page.getAttribute('html', 'data-standalone')) === 'true');
  check('data-pointer = coarse', (await page.getAttribute('html', 'data-pointer')) === 'coarse');
  check(
    'barra de estado teñida al arrancar',
    await page.evaluate(() => window.__nativeMessages.some((m) => m.kind === 'statusBar.style')),
  );

  console.log('\nAnfitrión → web');
  await page.evaluate(() => window.StructureCoNative.receive({
    kind: 'safeArea',
    insets: { top: 59, right: 0, bottom: 34, left: 0 },
  }));
  const insets = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      top: style.getPropertyValue('--sc-safe-top').trim(),
      bottom: style.getPropertyValue('--sc-safe-bottom').trim(),
    };
  });
  check('insets reales sobrescriben env()', insets.top === '59px' && insets.bottom === '34px', JSON.stringify(insets));

  await page.evaluate(() => window.StructureCoNative.receive({ kind: 'keyboard', height: 336 }));
  const keyboard = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--sc-keyboard-inset').trim());
  check('alto del teclado publicado', keyboard === '336px', keyboard);

  console.log('\nSuperficies');
  await page.getByRole('button', { name: /Continuar proyecto/i }).first().click();
  await page.waitForTimeout(2600);
  await page.evaluate(() => { window.__nativeMessages.length = 0; });
  await page.getByRole('button', { name: 'Model Doctor' }).first().click();
  await page.waitForTimeout(1200);
  check(
    'una hoja bloquea el desplazamiento del anfitrión',
    await page.evaluate(() => window.__nativeMessages.some((m) => m.kind === 'scroll.lock' && m.locked === true)),
  );
  check('la hoja se presenta con asa', (await page.locator('.sc-modal-surface__grabber').count()) === 1);

  await page.locator('.sc-modal-surface__close').first().click();
  await page.waitForTimeout(700);
  check(
    'al cerrarla lo devuelve',
    await page.evaluate(() => window.__nativeMessages.some((m) => m.kind === 'scroll.lock' && m.locked === false)),
  );

  console.log('\nConsola');
  const relevant = consoleErrors.filter((message) => !/favicon|sw\.js|ServiceWorker/i.test(message));
  check('sin errores de consola', relevant.length === 0, relevant.slice(0, 3).join(' | '));

  await context.close();
} finally {
  await browser.close();
  server.close();
}

if (failures.length > 0) {
  console.error(`\nQA del shell nativo: ${failures.length} fallo(s).`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log('\nQA del shell nativo: el puente responde en los dos sentidos.');
