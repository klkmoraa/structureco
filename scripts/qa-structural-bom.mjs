/** CRI-47 · Browser oracle for the traceable structural BOM in X2/M1/K0. */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { preview } from 'vite';
import {
  clearProjectLibraryOnBoot,
  continueStoredProject,
  disablePwaUpdateLifecycle,
  openExamplePortal,
} from './qa-welcome.mjs';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'qa-artifacts', 'structural-bom');
fs.mkdirSync(outDir, { recursive: true });
const port = 4217;
const baseURL = `http://127.0.0.1:${port}/`;
const scenarios = [
  { id: 'X2', viewport: { width: 1440, height: 900 }, language: 'es', touch: false, presentation: 'drawer' },
  { id: 'M1', viewport: { width: 1100, height: 768 }, language: 'es', touch: false, presentation: 'drawer' },
  { id: 'K0', viewport: { width: 390, height: 844 }, language: 'en', touch: true, presentation: 'fullscreen' },
];
const report = { phase: 'cri-47-structural-bom', generatedAt: new Date().toISOString(), checks: [], failures: [] };

const server = await preview({ root, preview: { host: '127.0.0.1', port, strictPort: true }, logLevel: 'error' });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
    : { channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome' }),
});

const check = (scenario, name, condition, detail = undefined) => {
  const entry = { scenario, name, pass: Boolean(condition), detail };
  report.checks.push(entry);
  console.log(`${entry.pass ? 'OK  ' : 'FAIL'}  ${scenario} · ${name}${detail === undefined ? '' : `  ${JSON.stringify(detail)}`}`);
  if (!entry.pass) throw new Error(`${scenario} · ${name}${detail === undefined ? '' : `: ${JSON.stringify(detail)}`}`);
};

const seedBomProject = (project, language) => ({
  ...project,
  name: language === 'es' ? 'Pórtico BOM QA' : 'BOM QA frame',
  nodes: [
    { id: 'N1', x: 0, y: 0, support: { type: 'pin' } },
    { id: 'N2', x: 3, y: 4, support: { type: 'none' } },
    { id: 'N3', x: 6, y: 4, support: { type: 'none' } },
    { id: 'N4', x: 9, y: 4, support: { type: 'roller' } },
  ],
  members: [
    {
      id: 'F1', i: 'N1', j: 'N2', type: 'frame', E: 200000000,
      A: 0.0017290288, I: 0.00000682619537984, density: 7850,
      materialId: 'steel-a992', materialOrigin: 'catalog', sectionId: 'w6x9', sectionOrigin: 'catalog',
    },
    {
      id: 'F2', i: 'N1', j: 'N2', type: 'frame', E: 200000000,
      A: 0.0017290288, I: 0.00000682619537984, density: 7850,
      materialId: 'steel-a992', materialOrigin: 'catalog', sectionId: 'w6x9', sectionOrigin: 'catalog',
    },
    {
      id: 'T1', i: 'N2', j: 'N3', type: 'truss', E: 200000000,
      A: 0.0017290288, I: 0, density: 7850,
      materialId: 'steel-a992', materialOrigin: 'catalog', sectionId: 'w6x9', sectionOrigin: 'catalog',
    },
    {
      id: 'U1', i: 'N3', j: 'N4', type: 'frame', E: 25000000,
      A: 0.01, I: 0.00008, density: 2400, materialOrigin: 'custom', sectionOrigin: 'custom',
    },
    {
      id: 'R1', i: 'N1', j: 'N2', type: 'rigid', E: 1, A: 1, I: 1, density: 1,
      materialOrigin: 'custom', sectionOrigin: 'custom',
    },
  ],
  loadCases: [],
  combinations: [],
  nodalLoads: [],
  memberLoads: [],
  memberInitialEffects: [],
  settings: { ...project.settings, language },
});

const enterSeededWorkspace = async (page, language) => {
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.getByTestId('welcome-screen').waitFor({ state: 'visible', timeout: 20_000 });
  const launcher = await openExamplePortal(page);
  const shell = page.locator('.app-shell');
  try {
    await shell.waitFor({ state: 'visible', timeout: 15_000 });
  } catch (error) {
    if (!await page.getByTestId('welcome-screen').isVisible().catch(() => false)) throw error;
    await launcher.click();
    await shell.waitFor({ state: 'visible', timeout: 15_000 });
  }
  const project = await page.evaluate(() => JSON.parse(localStorage.getItem('structureCo.project')));
  await page.evaluate((next) => localStorage.setItem('structureCo.project', JSON.stringify(next)), seedBomProject(project, language));
  await page.reload({ waitUntil: 'networkidle' });
  await continueStoredProject(page);
  await page.locator('[data-structure-kind="member"][data-structure-id="F1"]').waitFor({ state: 'visible', timeout: 15_000 });
};

const openBom = async (page) => {
  const desktopLauncher = page.locator('.topbar-export-trigger');
  if (await desktopLauncher.isVisible().catch(() => false)) {
    await desktopLauncher.click();
    await page.locator('.export-menu:visible').getByRole('menuitem', { name: /BOM estructural|Structural BOM/i }).click();
    return desktopLauncher;
  }
  const compactLauncher = page.locator('.utility-more-button');
  await compactLauncher.click();
  await page.locator('.topbar-utilities-panel:visible').getByRole('button', { name: /BOM estructural|Structural BOM/i }).click();
  return compactLauncher;
};

try {
  for (const scenario of scenarios) {
    const context = await browser.newContext({
      viewport: scenario.viewport,
      hasTouch: scenario.touch,
      locale: scenario.language === 'es' ? 'es-MX' : 'en-US',
      colorScheme: 'light',
    });
    await clearProjectLibraryOnBoot(context);
    await disablePwaUpdateLifecycle(context);
    await context.addInitScript(() => localStorage.setItem('structureCo.theme', 'light'));
    const page = await context.newPage();
    const runtimeErrors = [];
    page.on('console', (message) => { if (message.type() === 'error') runtimeErrors.push(message.text()); });
    page.on('pageerror', (error) => runtimeErrors.push(error.message));

    try {
      await enterSeededWorkspace(page, scenario.language);
      const launcher = await openBom(page);
      const surface = page.locator('.structural-bom-surface');
      await surface.waitFor({ state: 'visible', timeout: 15_000 });
      const panel = surface.getByTestId('structural-bom');
      await page.waitForTimeout(250);

      const expectedTitle = scenario.language === 'es' ? 'BOM estructural' : 'Structural BOM';
      check(scenario.id, 'title and explicit commercial boundary are visible',
        await surface.getByRole('heading', { name: expectedTitle }).isVisible()
        && await surface.getByText(scenario.language === 'es' ? /No es una estimación de compra/ : /not a purchase estimate/).isVisible());

      const composition = await page.evaluate(() => ({
        shellClass: document.querySelector('.app-shell')?.getAttribute('data-shell-class'),
        presentation: document.querySelector('.structural-bom-surface')?.classList.contains('sc-modal-surface--fullscreen') ? 'fullscreen' : 'drawer',
        extent: document.querySelector('.structural-bom-surface')?.getAttribute('data-surface-extent'),
        rows: document.querySelector('[data-testid="structural-bom"]')?.getAttribute('data-row-count'),
        body: document.querySelector('.structural-bom-surface')?.textContent ?? '',
      }));
      check(scenario.id, 'broker owns the expected responsive presentation',
        composition.shellClass === scenario.id && composition.presentation === scenario.presentation && composition.extent === 'default', composition);
      check(scenario.id, 'duplicate and discontinuous members produce three traceable rows',
        composition.rows === '3' && /F1/.test(composition.body) && /F2/.test(composition.body) && /T1/.test(composition.body) && /U1/.test(composition.body), composition.rows);

      const overflow = await page.evaluate(() => ({
        document: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
        surface: (() => {
          const node = document.querySelector('.structural-bom-surface');
          if (!node) return null;
          const box = node.getBoundingClientRect();
          return { left: Math.round(box.left), right: Math.round(box.right), viewport: window.innerWidth };
        })(),
      }));
      check(scenario.id, 'surface stays inside the viewport without page overflow',
        overflow.document <= 1 && overflow.surface && overflow.surface.left >= -1 && overflow.surface.right <= overflow.surface.viewport + 1, overflow);

      if (scenario.touch) {
        const smallTargets = await surface.locator('button, select').evaluateAll((elements) => elements
          .filter((element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0; })
          .map((element) => { const box = element.getBoundingClientRect(); return { name: element.getAttribute('aria-label') || element.textContent?.trim(), width: Math.round(box.width), height: Math.round(box.height) }; })
          .filter(({ width, height }) => width < 44 || height < 44));
        check(scenario.id, 'all visible controls meet the 44px touch floor', smallTargets.length === 0, smallTargets);
      }

      const trussLabel = scenario.language === 'es' ? 'Armaduras' : 'Trusses';
      const identityLabel = scenario.language === 'es' ? 'Identidad' : 'Identity';
      await surface.getByRole('button', { name: trussLabel }).click();
      check(scenario.id, 'family filter rebuilds the current projection', await panel.getAttribute('data-row-count') === '2');
      await surface.getByLabel(identityLabel).selectOption('unresolved');
      check(scenario.id, 'identity filter isolates the unresolved member',
        await panel.getAttribute('data-row-count') === '1' && await surface.getByRole('button', { name: /U1/ }).isVisible());
      await surface.getByLabel(identityLabel).selectOption('all');
      await surface.getByRole('button', { name: trussLabel }).click();
      check(scenario.id, 'restoring filters restores the stable row set', await panel.getAttribute('data-row-count') === '3');

      const downloadPromise = page.waitForEvent('download');
      await surface.getByRole('button', { name: /Exportar CSV|Export CSV/i }).click();
      const download = await downloadPromise;
      const downloadedPath = await download.path();
      const bytes = fs.readFileSync(downloadedPath);
      const csv = bytes.toString('utf8');
      const expectedFilename = scenario.language === 'es' ? 'portico-bom-qa-bom-estructural.csv' : 'bom-qa-frame-bom-estructural.csv';
      check(scenario.id, 'real CSV download is byte-stable and traceable',
        download.suggestedFilename() === expectedFilename
        && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf
        && csv.includes('schema_version,row_id,identity_status')
        && csv.includes('F1:N1-N2:5|F2:N1-N2:5')
        && !/cost|price|waste|allowance/i.test(csv),
        { filename: download.suggestedFilename(), bytes: bytes.length });

      await page.screenshot({ path: path.join(outDir, `${scenario.id}-bom.png`), fullPage: true });
      await surface.getByRole('button', { name: /Localizar barra F1|Locate member F1/i }).click();
      await surface.waitFor({ state: 'visible' });
      await page.waitForTimeout(250);
      const localized = await page.evaluate(() => ({
        extent: document.querySelector('.structural-bom-surface')?.getAttribute('data-surface-extent'),
        selected: document.querySelector('[data-structure-kind="member"][data-structure-id="F1"]')?.getAttribute('aria-pressed'),
        backgroundInert: document.querySelector('.app-shell')?.inert ?? null,
      }));
      check(scenario.id, 'provenance locates the exact member and degrades to peek',
        localized.extent === 'peek' && localized.selected === 'true' && localized.backgroundInert === false, localized);

      await surface.getByRole('button', { name: /Restaurar BOM estructural|Restore structural BOM/i }).click();
      await page.waitForTimeout(200);
      check(scenario.id, 'restore preserves the filtered surface',
        await surface.getAttribute('data-surface-extent') === 'default'
        && await panel.getAttribute('data-row-count') === '3');

      await surface.getByRole('button', { name: /Cerrar BOM estructural|Close structural BOM/i }).click();
      await surface.waitFor({ state: 'detached' });
      await page.waitForTimeout(100);
      check(scenario.id, 'close returns focus to the persistent launcher', await launcher.evaluate((node) => document.activeElement === node));
      check(scenario.id, 'runtime console stays clean', runtimeErrors.length === 0, runtimeErrors);
    } catch (error) {
      report.failures.push({ scenario: scenario.id, error: error instanceof Error ? error.stack ?? error.message : String(error) });
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  await server.close();
  fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
}

if (report.failures.length) {
  console.error(JSON.stringify(report.failures, null, 2));
  process.exit(1);
}

console.log(`Structural BOM QA PASS · ${report.checks.length} checks · ${scenarios.map((item) => item.id).join('/')}`);
