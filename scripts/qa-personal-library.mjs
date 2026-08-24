/** CRI-40 · Browser oracle for the personal library in X2, M1 and K0. */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { preview } from 'vite';
import { clearProjectLibraryOnBoot, disablePwaUpdateLifecycle } from './qa-welcome.mjs';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'qa-artifacts', 'personal-library');
fs.mkdirSync(outDir, { recursive: true });
const port = 4216;
const baseURL = `http://127.0.0.1:${port}/`;
const scenarios = [
  { id: 'X2', viewport: { width: 1440, height: 900 }, touch: false },
  { id: 'M1', viewport: { width: 1100, height: 768 }, touch: false },
  { id: 'K0', viewport: { width: 390, height: 844 }, touch: true },
];
const report = { phase: 'cri-40-personal-library', generatedAt: new Date().toISOString(), scenarios: [], failures: [] };
const server = await preview({ root, preview: { host: '127.0.0.1', port, strictPort: true }, logLevel: 'error' });
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome' });

const navigateHome = async (page, name) => {
  const desktopNav = page.locator('.sc-home-sidebar .sc-home-nav');
  if (await desktopNav.isVisible().catch(() => false)) {
    const index = { Plantillas: 2, Biblioteca: 3 }[name];
    if (index === undefined) throw new Error(`Unsupported Home destination: ${name}`);
    return desktopNav.getByRole('button').nth(index).click();
  }
  await page.getByRole('button', { name: /abrir navegación/i }).click();
  await page.locator('.sc-home-nav--mobile').getByRole('button', { name }).click();
};

const createFavorite = async (page, { kind, name }) => {
  await page.getByRole('button', { name: 'Crear favorito' }).click();
  await page.getByLabel('Tipo de favorito').selectOption(kind);
  await page.getByLabel('Nombre del favorito').fill(name);
  if (kind === 'pair') {
    await page.getByLabel('Material', { exact: true }).selectOption('steel-a992');
    await page.getByLabel('Sección', { exact: true }).selectOption('ipe-300');
  }
  await page.getByRole('button', { name: 'Guardar favorito' }).click();
  await page.getByText(name, { exact: true }).waitFor({ state: 'visible' });
};

const openInspector = async (page) => {
  if (await page.locator('.member-favorites').isVisible().catch(() => false)) return;
  const compact = page.locator('.mobile-inspector-toggle');
  if (await compact.isVisible().catch(() => false)) {
    await compact.click();
  } else {
    const utilities = page.locator('.utility-more-button');
    if (await utilities.isVisible().catch(() => false)) {
      await utilities.click();
      const action = page.getByRole('button', { name: /mostrar inspector/i });
      if (await action.isVisible().catch(() => false)) await action.click();
    }
  }
  await page.locator('.member-favorites').waitFor({ state: 'visible', timeout: 10_000 });
};

const openViewSurface = async (page) => {
  const desktopLauncher = page.locator('[data-workspace-panels-launcher]:visible').first();
  if (await desktopLauncher.isVisible().catch(() => false)) {
    await desktopLauncher.click();
    const direct = page.locator('[data-workspace-surface-command="open-view-settings"]:visible');
    if (await direct.isVisible().catch(() => false)) await direct.click();
  } else {
    await page.getByRole('button', { name: /^Más herramientas$/ }).click();
    await page.locator('.mobile-tool-palette-more [data-workspace-panels-launcher]').click();
    await page.locator('.mobile-tool-palette-workspace').getByRole('menuitem', { name: 'Vista' }).click();
  }
  await page.locator('.view-favorites:visible').waitFor({ state: 'visible', timeout: 10_000 });
};

try {
  for (const scenario of scenarios) {
    const context = await browser.newContext({ viewport: scenario.viewport, hasTouch: scenario.touch, colorScheme: 'light' });
    await clearProjectLibraryOnBoot(context);
    await disablePwaUpdateLifecycle(context);
    await context.addInitScript(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('structureCo.theme', 'light'); });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    const failures = [];

    await page.goto(baseURL, { waitUntil: 'networkidle' });
    await page.getByTestId('welcome-screen').waitFor({ state: 'visible', timeout: 20_000 });
    await navigateHome(page, 'Biblioteca');
    await page.getByRole('heading', { name: 'Biblioteca personal' }).waitFor({ state: 'visible' });
    const projectBeforeSave = await page.evaluate(() => localStorage.getItem('structureCo.project'));
    await createFavorite(page, { kind: 'pair', name: 'Par QA A992 + IPE' });
    await createFavorite(page, { kind: 'view', name: 'Vista QA' });
    await page.getByRole('button', { name: 'Nueva sección' }).click();
    await page.getByLabel('Nombre de la sección').fill('Rectangular QA 30 × 50');
    await page.getByLabel('Ancho b (m)').fill('0.3');
    await page.getByLabel('Peralte h (m)').fill('0.5');
    const editorMetrics = await page.evaluate(() => ({
      overflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      smallTargets: [...document.querySelectorAll('.section-builder__editor button, .section-builder__editor input, .section-builder__editor select')]
        .filter((element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0; })
        .map((element) => { const box = element.getBoundingClientRect(); return { label: element.getAttribute('aria-label') || element.textContent?.trim(), width: Math.round(box.width), height: Math.round(box.height) }; })
        .filter(({ width, height }) => width < 44 || height < 44),
    }));
    if (editorMetrics.overflow > 1) failures.push(`editorOverflow=${editorMetrics.overflow}`);
    if (scenario.touch && editorMetrics.smallTargets.length) failures.push(`editorSmallTargets=${JSON.stringify(editorMetrics.smallTargets)}`);
    await page.screenshot({ path: path.join(outDir, `${scenario.id}-section-editor.png`), fullPage: true });
    await page.getByRole('button', { name: 'Guardar sección' }).click();
    await page.getByRole('listitem', { name: /Rectangular QA 30 × 50/ }).waitFor({ state: 'visible' });
    const saveBoundary = await page.evaluate((before) => ({
      projectUnchanged: localStorage.getItem('structureCo.project') === before,
      library: JSON.parse(localStorage.getItem('structureCo.personal-library.v1') ?? '{}'),
      sections: JSON.parse(localStorage.getItem('structureCo.personal-sections.v1') ?? '{}'),
    }), projectBeforeSave);
    if (!saveBoundary.projectUnchanged) failures.push('savingFavoriteMutatedProject');
    if (saveBoundary.library?.favorites?.length !== 2) failures.push(`savedFavorites=${saveBoundary.library?.favorites?.length ?? 0}`);
    if (saveBoundary.sections?.sections?.length !== 1) failures.push(`savedSections=${saveBoundary.sections?.sections?.length ?? 0}`);

    const homeMetrics = await page.evaluate(() => ({
      overflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      smallTargets: [...document.querySelectorAll('.personal-library button, .personal-library input, .personal-library select, .section-builder button, .section-builder input:not([type="file"]), .section-builder select, .section-builder__import')]
        .filter((element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0; })
        .map((element) => { const box = element.getBoundingClientRect(); return { label: element.getAttribute('aria-label') || element.textContent?.trim(), width: Math.round(box.width), height: Math.round(box.height) }; })
        .filter(({ width, height }) => width < 44 || height < 44),
    }));
    if (homeMetrics.overflow > 1) failures.push(`homeOverflow=${homeMetrics.overflow}`);
    if (scenario.touch && homeMetrics.smallTargets.length) failures.push(`homeSmallTargets=${JSON.stringify(homeMetrics.smallTargets)}`);
    await page.screenshot({ path: path.join(outDir, `${scenario.id}-home.png`), fullPage: true });

    await navigateHome(page, 'Plantillas');
    const template = page.locator('.sc-home-template-grid > button').filter({ hasText: /p.rtico de ejemplo/i }).first();
    await template.click({ force: true });
    const shell = page.locator('.app-shell');
    await shell.waitFor({ state: 'visible', timeout: 20_000 });
    await page.waitForTimeout(500);
    const memberTarget = page.locator('[data-structure-kind="member"]').last();
    const memberId = await memberTarget.getAttribute('data-structure-id');
    await memberTarget.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
    await openInspector(page);
    const apply = page.locator('.member-favorites').getByRole('button', { name: 'Aplicar favorito' });
    if (await apply.isDisabled()) failures.push('structuralApplyDisabled');
    else {
      await apply.click();
      await page.waitForFunction(({ id }) => {
        const project = JSON.parse(localStorage.getItem('structureCo.project') ?? '{}');
        const member = project.members?.find((item) => item.id === id);
        return member?.materialId === 'steel-a992' && member?.sectionId === 'ipe-300';
      }, { id: memberId }, { timeout: 10_000 });
    }

    await openViewSurface(page);
    await page.locator('.view-favorites:visible').getByRole('button', { name: 'Aplicar vista' }).click();
    const workspaceMetrics = await page.evaluate(() => {
      const shellElement = document.querySelector('.app-shell');
      const targets = [...document.querySelectorAll('.member-favorites button, .member-favorites input, .member-favorites select')]
        .filter((element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0; })
        .map((element) => { const box = element.getBoundingClientRect(); return { label: element.getAttribute('aria-label') || element.textContent?.trim(), width: Math.round(box.width), height: Math.round(box.height) }; })
        .filter(({ width, height }) => width < 44 || height < 44);
      return {
        shellClass: shellElement?.getAttribute('data-shell-class'),
        overflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
        smallTargets: targets,
      };
    });
    if (workspaceMetrics.shellClass !== scenario.id) failures.push(`shellClass=${workspaceMetrics.shellClass}`);
    if (workspaceMetrics.overflow > 1) failures.push(`workspaceOverflow=${workspaceMetrics.overflow}`);
    if (scenario.touch && workspaceMetrics.smallTargets.length) failures.push(`workspaceSmallTargets=${JSON.stringify(workspaceMetrics.smallTargets)}`);
    failures.push(...consoleErrors.map((error) => `console=${error}`));
    await page.screenshot({ path: path.join(outDir, `${scenario.id}-workspace.png`), fullPage: true });
    report.scenarios.push({ ...scenario, editorMetrics, homeMetrics, workspaceMetrics, saveBoundary: { projectUnchanged: saveBoundary.projectUnchanged, favoriteCount: saveBoundary.library?.favorites?.length ?? 0, sectionCount: saveBoundary.sections?.sections?.length ?? 0 }, consoleErrors, failures });
    report.failures.push(...failures.map((failure) => `${scenario.id}: ${failure}`));
    await context.close();
  }
} finally {
  await browser.close();
  await server.close();
}

fs.writeFileSync(path.join(outDir, 'qa-summary.json'), `${JSON.stringify(report, null, 2)}\n`);
if (report.failures.length) throw new Error(`Personal library QA failed:\n${report.failures.join('\n')}`);
console.log(`Personal library QA PASS · ${report.scenarios.length} classes · qa-artifacts/personal-library`);
