// CRI-10 — Renderiza los conceptos a PNG, uno por lámina.
//
// Uso:  node reports/evidence/2026-08-15-cri-10-ux-system/render-concepts.mjs
//
// No construye la app y no lee `src/**` salvo `tokens.css` y `fonts.css`, que
// carga la propia página por enlace relativo desde un servidor estático efímero.
//
// EL TEMA SE RESUELVE COMO EN EL PRODUCTO. `tokens.css` declara la noche bajo
// `:root[data-theme='dark']`, así que un tema por marco sería mentira: el
// producto escribe SIEMPRE un `data-theme` explícito en la raíz
// (`ProjectContext.tsx`). Por eso este script hace dos pasadas sobre la misma
// página — una con la raíz en claro y otra en oscuro — y en cada pasada captura
// sólo las láminas declaradas para ese tema. Es la única forma de que el PNG
// nocturno demuestre de verdad la cascada nocturna.

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..', '..');
const outDir = path.join(here, 'shots');
fs.mkdirSync(outDir, { recursive: true });

// Servidor estático mínimo sobre la raíz del repo.
//
// No es un capricho: la página de conceptos usa módulos ES (`type="module"`), y
// Chromium los bloquea por CORS sobre `file://`. Servir desde la raíz del repo
// además mantiene vivo el enlace relativo a `src/design-system/tokens.css`, que
// es justo lo que hace que estos conceptos usen los tokens reales.
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const server = http.createServer((request, response) => {
  const relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\/+/, '');
  // `fonts.css` pide `/fonts/*.woff2`, que en la app sirve Vite desde `public/`.
  // Sin este mapeo las láminas se renderizarían con la tipografía de reserva del
  // sistema y no probarían nada sobre la tipografía real del producto.
  const file = path.resolve(repoRoot, relative.startsWith('fonts/') ? `public/${relative}` : relative);
  if (!file.startsWith(repoRoot) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    response.writeHead(404).end('not found');
    return;
  }
  response.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(response);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const pageUrl = `${origin}/reports/evidence/2026-08-15-cri-10-ux-system/concepts/concepts.html`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });

const errors = [];
page.on('pageerror', (error) => errors.push(String(error)));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

await page.goto(pageUrl, { waitUntil: 'load' });
await page.waitForFunction(() => document.documentElement.dataset.ready === 'true', null, { timeout: 15000 });
await page.waitForFunction(() => document.fonts.status === 'loaded', null, { timeout: 15000 }).catch(() => {});

if (errors.length > 0) {
  console.error('\n✗ La página de conceptos lanzó errores:\n' + errors.map((e) => `   ${e}`).join('\n'));
  await browser.close(); server.close();
  process.exit(1);
}

const frames = await page.$$eval('.frame', (nodes) => nodes.map((node) => ({
  name: node.dataset.name,
  theme: node.getAttribute('data-theme-scope'),
  w: node.offsetWidth,
  h: node.offsetHeight,
})));

if (frames.length === 0) {
  console.error('\n✗ No se generó ninguna lámina.');
  await browser.close(); server.close();
  process.exit(1);
}

let written = 0;
for (const theme of ['light', 'dark']) {
  await page.evaluate((t) => { document.documentElement.setAttribute('data-theme', t); }, theme);
  await page.waitForTimeout(120);
  for (const frame of frames.filter((f) => f.theme === theme)) {
    const element = await page.$(`.frame[data-name="${frame.name}"][data-theme-scope="${theme}"]`);
    await element.screenshot({ path: path.join(outDir, `${frame.name}.png`) });
    written += 1;
    console.log(`  ${String(frame.w).padStart(4)}×${String(frame.h).padStart(4)}  ${theme === 'dark' ? 'noche' : 'día  '}  ${frame.name}.png`);
  }
}

await browser.close();
server.close();
console.log(`\n${written} láminas escritas en reports/evidence/2026-08-15-cri-10-ux-system/shots/\n`);
if (written !== frames.length) {
  console.error(`✗ Se declararon ${frames.length} láminas y se escribieron ${written}.`);
  process.exit(1);
}
