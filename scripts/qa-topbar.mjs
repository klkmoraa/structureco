import { chromium } from 'playwright';
import { preview } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const previewServer = await preview({ root, preview: { host: '127.0.0.1', port: 4177, strictPort: true }, logLevel: 'error' });
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome' });
const page = await browser.newPage({ viewport: { width: 1536, height: 960 }, deviceScaleFactor: 1 });
const checkedWidths = [1024, 1100, 1180, 1280, 1366, 1440, 1536, 1920];
const continuousWidths = Array.from({ length: 37 }, (_, index) => 1024 + index * 16);

const intersects = (first, second) => first.left < second.right && second.left < first.right && first.top < second.bottom && second.top < first.bottom;

async function enterWorkspace() {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('http://127.0.0.1:4177/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /continuar proyecto/i }).click();
  await page.locator('.app-shell').waitFor({ state: 'visible' });
}

async function assertTopBarGeometry(width) {
  await page.setViewportSize({ width, height: 960 });
  await page.waitForTimeout(32);
  const result = await page.locator('.topbar').evaluate((bar) => {
    const rect = (element) => {
      const { left, right, top, bottom } = element.getBoundingClientRect();
      return { left, right, top, bottom };
    };
    const zones = [...bar.querySelectorAll('[data-topbar-zone]')].map((zone) => ({ name: zone.getAttribute('data-topbar-zone'), rect: rect(zone) }));
    const controls = [...bar.querySelectorAll('button, input, select')]
      .filter((control) => {
        const style = getComputedStyle(control);
        return style.display !== 'none' && style.visibility !== 'hidden';
      })
      .map((control) => ({ zone: control.closest('[data-topbar-zone]')?.getAttribute('data-topbar-zone'), rect: rect(control) }));
    return { zones, controls, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth };
  });
  const pairs = [['document', 'context'], ['document', 'actions'], ['context', 'actions']];
  for (const [firstName, secondName] of pairs) {
    const first = result.zones.find((zone) => zone.name === firstName);
    const second = result.zones.find((zone) => zone.name === secondName);
    if (!first || !second || intersects(first.rect, second.rect)) throw new Error(`TopBar zones overlap at ${width}px: ${firstName}/${secondName}`);
    for (const firstControl of result.controls.filter((control) => control.zone === firstName)) {
      for (const secondControl of result.controls.filter((control) => control.zone === secondName)) {
        if (intersects(firstControl.rect, secondControl.rect)) throw new Error(`TopBar controls overlap at ${width}px: ${firstName}/${secondName}`);
      }
    }
  }
  if (result.scrollWidth > result.clientWidth + 1) throw new Error(`TopBar causes horizontal overflow at ${width}px`);
}

try {
  await enterWorkspace();
  for (const width of continuousWidths) await assertTopBarGeometry(width);
  for (const width of checkedWidths) await assertTopBarGeometry(width);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(32);
  if (!(await page.getByLabel('Más acciones').isVisible())) throw new Error('Mobile More actions is no longer reachable');
  console.log(`TopBar browser geometry passed: ${checkedWidths.join(', ')}px; continuous 1024-1600px.`);
} finally {
  await browser.close();
  await previewServer.close();
}
