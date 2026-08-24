/** CRI-48 · Browser oracle for explicit revision comparison in X2/M1/K0. */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { preview } from 'vite';
import {
  clearProjectLibraryOnBoot,
  continueStoredProject,
  disablePwaUpdateLifecycle,
  openExamplePortal,
  openResultsSurface,
} from './qa-welcome.mjs';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'qa-artifacts', 'revision-comparison');
fs.mkdirSync(outDir, { recursive: true });
const port = 4218;
const baseURL = `http://127.0.0.1:${port}/`;
const scenarios = [
  { id: 'X2', viewport: { width: 1440, height: 900 }, language: 'es', touch: false, presentation: 'drawer' },
  { id: 'M1', viewport: { width: 1100, height: 768 }, language: 'es', touch: false, presentation: 'drawer' },
  { id: 'K0', viewport: { width: 390, height: 844 }, language: 'en', touch: true, presentation: 'fullscreen' },
].filter((scenario) => !process.env.QA_SCENARIO || scenario.id === process.env.QA_SCENARIO);
const report = { phase: 'cri-48-revision-comparison', generatedAt: new Date().toISOString(), checks: [], failures: [] };

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

const seedProject = (source, language) => ({
  ...source,
  id: 'P-REVISION-QA',
  name: language === 'es' ? 'Viga revisión QA' : 'Revision QA beam',
  nodes: [
    { id: 'N1', x: 0, y: 0, support: { type: 'pin' } },
    { id: 'N2', x: 4, y: 0, support: { type: 'roller' } },
  ],
  members: [{
    id: 'F1', i: 'N1', j: 'N2', type: 'frame', E: 200_000_000,
    A: 0.00538, I: 0.0000836, density: 7850,
    materialId: 'steel-a992', materialOrigin: 'catalog', sectionId: 'ipe-300', sectionOrigin: 'catalog',
  }],
  loadCases: [{ id: 'LC1', name: 'Servicio', category: 'variable', active: true }],
  combinations: [{ id: 'C1', name: 'Combinación 1', factors: { LC1: 1 } }],
  nodalLoads: [{ id: 'L1', nodeId: 'N2', caseId: 'LC1', fx: 0, fy: -10, mz: 0 }],
  prescribedDisplacements: [],
  memberLoads: [],
  memberInitialEffects: [],
  settings: { ...source.settings, language, calculationMode: 'complete', analysisMode: 'first-order' },
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
  await page.evaluate((next) => localStorage.setItem('structureCo.project', JSON.stringify(next)), seedProject(project, language));
  await page.reload({ waitUntil: 'networkidle' });
  await continueStoredProject(page);
  await page.locator('[data-structure-kind="node"][data-structure-id="N2"]').waitFor({ state: 'visible', timeout: 15_000 });
};

const analyzeAndOpenSummary = async (page) => {
  await page.getByRole('button', { name: /analizar|analyze/i }).first().click({ timeout: 10_000 });
  await page.waitForTimeout(900);
  const results = await openResultsSurface(page);
  const summaryTab = results.getByRole('tab', { name: /^(Resumen|Summary)$/ }).first();
  if (await summaryTab.count()) await summaryTab.click();
  await page.locator('.result-summary-workspace').waitFor({ state: 'visible', timeout: 20_000 });
  return results;
};

const closeResults = async (page) => {
  const compactClose = page.locator('.results-mobile-close:visible');
  if (await compactClose.count()) await compactClose.click();
  else await page.locator('.results-launcher:visible').first().click();
  await page.locator('.results-panel:visible').waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => undefined);
};

const editNodeXThroughDatasheet = async (page, language) => {
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('structureco:open-datasheet')));
  const datasheet = page.locator('[data-workspace-surface="datasheet"]');
  await datasheet.waitFor({ state: 'visible', timeout: 15_000 });
  await datasheet.getByRole('button', { name: /^(Nudos|Nodes)\b/ }).click();
  await page.waitForTimeout(150);
  const marked = await page.evaluate(() => {
    const row = [...document.querySelectorAll('.datasheet-grid tbody tr')]
      .find((candidate) => candidate.querySelector('th')?.textContent?.includes('N2'));
    row?.setAttribute('data-qa-revision-row', 'N2');
    return Boolean(row);
  });
  if (!marked) throw new Error('Datasheet did not expose the N2 row.');
  const xCell = datasheet.locator('[data-qa-revision-row="N2"] [aria-colindex="2"]');
  await xCell.dblclick();
  const editor = datasheet.locator('.datasheet-cell-editor');
  await editor.fill('4.5');
  await editor.press('Enter');
  await page.waitForTimeout(250);
  const committed = await xCell.textContent();
  await datasheet.getByRole('button', { name: language === 'es' ? 'Cerrar hoja de datos' : 'Close datasheet' }).click();
  await datasheet.waitFor({ state: 'detached' });
  return committed;
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
      await analyzeAndOpenSummary(page);
      const revisionLauncher = page.locator('.results-revision-comparison-launcher:visible');
      await revisionLauncher.waitFor({ state: 'visible', timeout: 10_000 });
      await revisionLauncher.click();

      const surface = page.locator('[data-workspace-surface="comparison"]');
      await surface.waitFor({ state: 'visible', timeout: 15_000 });
      const capture = surface.getByRole('button', { name: /Capturar revisión base|Capture baseline revision/i });
      await capture.waitFor({ state: 'visible' });
      await capture.click();
      await surface.getByText(scenario.language === 'es' ? 'Correlación, no causalidad' : 'Correlation, not causality').waitFor({ state: 'visible', timeout: 15_000 });

      const initial = await page.evaluate(() => ({
        shellClass: document.querySelector('.app-shell')?.getAttribute('data-shell-class'),
        presentation: document.querySelector('[data-workspace-surface="comparison"]')?.classList.contains('sc-modal-surface--fullscreen') ? 'fullscreen' : 'drawer',
        input: document.querySelector('[data-testid="revision-comparison"]')?.getAttribute('data-input-changes'),
        result: document.querySelector('[data-testid="revision-comparison"]')?.getAttribute('data-result-changes'),
      }));
      check(scenario.id, 'baseline capture starts from the identical fresh revision',
        initial.shellClass === scenario.id && initial.presentation === scenario.presentation && initial.input === '0' && initial.result === '0', initial);

      await surface.getByRole('button', { name: /Cerrar comparación de revisiones|Close revision comparison/i }).click();
      await surface.waitFor({ state: 'detached' });
      await closeResults(page);

      const committedX = await editNodeXThroughDatasheet(page, scenario.language);
      check(scenario.id, 'real Datasheet edit commits the current revision', /4[.,]5/.test(committedX ?? ''), committedX);

      await analyzeAndOpenSummary(page);
      const currentLauncher = page.locator('.results-revision-comparison-launcher:visible');
      await currentLauncher.click();
      await surface.waitFor({ state: 'visible', timeout: 15_000 });
      await surface.getByText(scenario.language === 'es' ? 'Correlación, no causalidad' : 'Correlation, not causality').waitFor({ state: 'visible', timeout: 15_000 });
      // Motion has a finite entry transform; geometry is measured only after
      // the surface reaches its settled, interactive size.
      await page.waitForTimeout(350);
      const panel = surface.getByTestId('revision-comparison');
      const comparison = {
        input: Number(await panel.getAttribute('data-input-changes')),
        result: Number(await panel.getAttribute('data-result-changes')),
        text: (await surface.textContent()) ?? '',
      };
      check(scenario.id, 'same-project rerun exposes input and result deltas without causal wording',
        comparison.input >= 1 && comparison.result >= 1
        && comparison.text.includes('project.nodes[N2].x')
        && comparison.text.includes('analysis.memberResults[F1].length')
        && !/causó|caused/.test(comparison.text),
        { input: comparison.input, result: comparison.result });

      const domainLabel = scenario.language === 'es' ? 'Dominio' : 'Domain';
      await surface.getByLabel(domainLabel).selectOption('result');
      check(scenario.id, 'domain filter removes input paths while retaining result provenance',
        await surface.getByText('project.nodes[N2].x').count() === 0
        && await surface.getByText('analysis.memberResults[F1].length').count() === 1);

      const overflow = await page.evaluate(() => {
        const node = document.querySelector('[data-workspace-surface="comparison"]');
        const box = node?.getBoundingClientRect();
        return {
          document: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
          surface: box ? { left: Math.round(box.left), right: Math.round(box.right), viewport: window.innerWidth } : null,
        };
      });
      check(scenario.id, 'comparison stays inside the viewport without page overflow',
        overflow.document <= 1 && overflow.surface && overflow.surface.left >= -1 && overflow.surface.right <= overflow.surface.viewport + 1, overflow);

      if (scenario.touch) {
        const smallTargets = await surface.locator('button, select, input').evaluateAll((elements) => elements
          .filter((element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0; })
          .map((element) => { const box = element.getBoundingClientRect(); return { name: element.getAttribute('aria-label') || element.textContent?.trim(), width: Math.round(box.width), height: Math.round(box.height) }; })
          .filter(({ width, height }) => width < 44 || height < 44));
        check(scenario.id, 'all visible controls meet the 44px touch floor', smallTargets.length === 0, smallTargets);
      }

      await page.screenshot({ path: path.join(outDir, `${scenario.id}-comparison.png`), fullPage: true });
      await surface.getByRole('button', { name: /Localizar miembro F1|Locate member F1/i }).first().click();
      await page.waitForTimeout(200);
      const localized = await page.evaluate(() => ({
        extent: document.querySelector('[data-workspace-surface="comparison"]')?.getAttribute('data-surface-extent'),
        selected: document.querySelector('[data-structure-kind="member"][data-structure-id="F1"]')?.getAttribute('aria-pressed'),
        inert: document.querySelector('.app-shell')?.inert ?? null,
      }));
      check(scenario.id, 'result provenance locates the exact member and degrades to peek',
        localized.extent === 'peek' && localized.selected === 'true' && localized.inert === false, localized);

      await surface.getByRole('button', { name: /Restaurar comparación de revisiones|Restore revision comparison/i }).click();
      await surface.getByRole('button', { name: /Cerrar comparación de revisiones|Close revision comparison/i }).click();
      await surface.waitFor({ state: 'detached' });
      await page.waitForTimeout(150);
      check(scenario.id, 'close restores focus to the Results launcher', await currentLauncher.evaluate((node) => document.activeElement === node));
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

console.log(`Revision comparison QA PASS · ${report.checks.length} checks · ${scenarios.map((item) => item.id).join('/')}`);
