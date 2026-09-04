#!/usr/bin/env node
/**
 * Genera los iconos de aplicación a partir de `public/favicon.svg`.
 *
 * Por qué hacen falta PNG cuando ya hay un SVG: iOS **no** lee SVG en
 * `apple-touch-icon`. Un iPhone que añade structureCo a la pantalla de inicio
 * con sólo el SVG declarado se queda sin icono y pinta una miniatura de la
 * página. Android sí lo lee, pero el manifiesto con un único icono `any
 * maskable` en SVG tampoco supera la comprobación de instalabilidad de Chrome.
 *
 * Los tamaños son los mínimos con consumidor real:
 *   180  apple-touch-icon (iPhone @3x; iOS reescala el resto)
 *   192  manifiesto, icono normal
 *   512  manifiesto, splash y tiendas
 *   512  manifiesto, `maskable` con la zona segura del 80 %
 *
 * Uso: node scripts/generate-app-icons.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUBLIC = path.join(ROOT, 'public');

/** `maskable` recorta hasta un 20 % por lado: el glifo se encoge para sobrevivirlo. */
const TARGETS = [
  { file: 'apple-touch-icon.png', size: 180, inset: 0 },
  { file: 'icon-192.png', size: 192, inset: 0 },
  { file: 'icon-512.png', size: 512, inset: 0 },
  { file: 'icon-maskable-512.png', size: 512, inset: 0.1 },
];

const svg = await readFile(path.join(PUBLIC, 'favicon.svg'), 'utf8');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

try {
  for (const { file, size, inset } of TARGETS) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    const pad = Math.round(size * inset);
    await page.setContent(`<!doctype html><html><body style="margin:0;width:${size}px;height:${size}px;display:grid;place-items:center;background:#007d61">
      <div style="width:${size - pad * 2}px;height:${size - pad * 2}px">${svg.replace('<svg ', '<svg style="width:100%;height:100%" ')}</div>
    </body></html>`);
    const buffer = await page.screenshot({ omitBackground: false });
    await writeFile(path.join(PUBLIC, file), buffer);
    await page.close();
    console.log(`${file} · ${size}×${size}${inset ? ` (zona segura ${Math.round((1 - inset * 2) * 100)} %)` : ''}`);
  }
} finally {
  await browser.close();
}
