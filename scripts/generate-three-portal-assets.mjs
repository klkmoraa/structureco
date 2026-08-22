/** Generate transparent PNG portal thumbnails from editable Three.js scenes. */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const root = path.resolve(import.meta.dirname, '..');
const assetIds = [
  'portal:single-bay', 'portal:two-bay', 'portal:two-story', 'portal:industrial-pitched',
  'beam:simply-supported', 'beam:two-span', 'beam:three-span', 'beam:overhang',
  'cantilever:wall', 'cantilever:double', 'cantilever:stepped', 'cantilever:balcony',
  'truss:pratt', 'truss:howe', 'truss:warren', 'truss:king-post',
  'slab:one-way', 'slab:two-way', 'slab:waffle', 'slab:flat-slab',
];
const themes = ['day', 'night'];
const outputRoot = path.join(root, 'public', 'assets', 'structural');
const server = await createServer({ root, server: { host: '127.0.0.1', port: 4211, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome' });

try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  await page.goto('http://127.0.0.1:4211/__three-assets', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => typeof window.__STRUCTURECO_RENDER_ASSET__ === 'function');
  for (const theme of themes) {
    for (const assetId of assetIds) {
      const dataUrl = await page.evaluate(async ({ assetId, theme }) => window.__STRUCTURECO_RENDER_ASSET__(assetId, theme), { assetId, theme });
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
      const [family, variant] = assetId.split(':');
      const familyDir = path.join(outputRoot, theme, family);
      fs.mkdirSync(familyDir, { recursive: true });
      fs.writeFileSync(path.join(familyDir, `${variant}.png`), Buffer.from(base64, 'base64'));
    }
  }
} finally {
  await browser.close();
  await server.close();
}

console.log(`Generated ${assetIds.length * themes.length} transparent Three.js structural renders in ${path.relative(root, outputRoot)}`);
