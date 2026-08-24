/**
 * CRI-101 · Evidencia de las tarjetas de Results y de la superficie `dense`.
 *
 * Afirma sobre la app CONSTRUIDA lo que las pruebas unitarias afirman sobre los
 * componentes: que un resultado favorable y uno desfavorable salen con la misma
 * materia medida (fondo, borde y sombra calculados), que la fiabilidad se
 * distingue sin color, que una tabla dentro de una tarjeta va plana, que
 * `dense` se invoca y se cierra en las tres clases, que DesignResult queda
 * separado e inconcluso cuando no existe una combinación normativa trazable, y
 * que el Datasheet NO se cardificó.
 *
 * Uso: npm run build && node scripts/qa-results-cards.mjs
 */
import { chromium } from 'playwright';
import { preview } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openExamplePortal, openResultsSurface } from './qa-welcome.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(repoRoot, 'reports', 'evidence', '2026-08-17-cri-101-results-cards-dense');
fs.mkdirSync(outDir, { recursive: true });

const previewServer = await preview({
  root: repoRoot,
  preview: { host: '127.0.0.1', port: 4191, strictPort: true },
  logLevel: 'error',
});
const baseURL = 'http://127.0.0.1:4191/';

const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
    : { channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome' }),
});

const report = { checks: [], failures: [], shots: [] };
const check = (name, ok, detail) => {
  if (!ok) report.failures.push({ name, detail });
  report.checks.push({ name, ok, detail });
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${name}${detail === undefined ? '' : `  ${JSON.stringify(detail)}`}`);
};

const shoot = async (target, name) => {
  const file = path.join(outDir, `${name}.png`);
  await target.screenshot({ path: file });
  report.shots.push(path.relative(repoRoot, file));
};

const CLASSES = {
  X2: { width: 1440, height: 900 },
  M1: { width: 1100, height: 768 },
  K0: { width: 390, height: 844 },
  'K0-landscape': { width: 844, height: 390 },
};

const newPage = async (viewport, options = {}) => {
  const page = await browser.newPage({
    viewport,
    colorScheme: options.colorScheme ?? 'light',
    reducedMotion: options.reducedMotion,
    hasTouch: options.hasTouch,
    locale: 'es-ES',
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { controller: null, register: async () => ({ installing: null, waiting: null, addEventListener: () => undefined }), addEventListener: () => undefined },
    });
  });
  return page;
};

const enterWorkspace = async (page) => {
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.getByTestId('welcome-screen').waitFor({ state: 'visible', timeout: 20_000 });
  // CRI-116 · el pórtico de ejemplo vive en el tercer paso desde CRI-112.
  const launcher = await openExamplePortal(page);
  const shell = page.locator('.app-shell');
  try {
    await shell.waitFor({ state: 'visible', timeout: 15_000 });
  } catch (error) {
    if (!await page.getByTestId('welcome-screen').isVisible().catch(() => false)) throw error;
    await launcher.click();
    await shell.waitFor({ state: 'visible', timeout: 15_000 });
  }
  await page.waitForTimeout(400);
  return shell;
};

/** Resuelve y deja el panel de Results abierto en el resumen. */
const openSummary = async (page) => {
  await page.getByRole('button', { name: /analizar|analyze/i }).first().click({ timeout: 10_000 }).catch(() => undefined);
  await page.waitForTimeout(900);
  await openResultsSurface(page);
  await page.waitForTimeout(400);
  const summaryTab = page.getByRole('tab', { name: /^(Resumen|Summary)$/ }).first();
  if (await summaryTab.count()) await summaryTab.click({ timeout: 8_000 }).catch(() => undefined);
  await page.locator('.result-extreme-card').first().waitFor({ state: 'visible', timeout: 20_000 });
  await page.waitForTimeout(300);
};

const horizontalOverflow = (page) => page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  innerWidth: window.innerWidth,
}));

const FORBIDDEN = ['Análisis OK', 'Cumple con los criterios de diseño', 'Verificación global', 'No conforme'];
const forbiddenInDom = (page, phrases) => page.evaluate((list) => {
  const text = document.body.innerText;
  const hits = list.filter((phrase) => text.includes(phrase));
  if (/\d\s*%[^\n]{0,16}\bOK\b/i.test(text) || /\bOK\b[^\n]{0,16}\d\s*%/i.test(text)) hits.push('porcentaje con OK');
  const controlled = [...document.querySelectorAll('.result-extreme-card, .numeric-quality-card, .elastic-demand, .ntc-design-card')]
    .filter((card) => /\bControlado\b/.test(card.textContent ?? ''));
  if (controlled.length) hits.push('Controlado');
  return hits;
}, phrases);

// ---------------------------------------------------------------------------
// 1 · Tarjeta de extremo completa, procedencia, Día/Noche y escala de grises
// ---------------------------------------------------------------------------
for (const colorScheme of ['light', 'dark']) {
  const page = await newPage(CLASSES.X2, { colorScheme });
  await enterWorkspace(page);
  await openSummary(page);

  const card = page.locator('.result-extreme-card').first();
  const fields = await card.evaluate((node) => ({
    label: node.querySelector('.result-extreme-card__label')?.textContent ?? '',
    value: node.querySelector('.result-extreme-card__value strong')?.textContent ?? '',
    unit: node.querySelector('.result-extreme-card__unit')?.textContent ?? '',
    position: node.querySelectorAll('.result-extreme-card__facts dd')[0]?.textContent ?? '',
    reliability: node.querySelector('.result-extreme-card__reliability dd')?.textContent ?? '',
    provenance: node.querySelector('.provenance-card summary')?.textContent ?? '',
    provenanceLevel: node.querySelector('.provenance-card')?.getAttribute('data-level') ?? null,
  }));
  check(`extremo · cinco datos a la vez (${colorScheme})`,
    Boolean(fields.label && fields.value && fields.unit && fields.position && fields.reliability && fields.provenance),
    fields);
  check(`extremo · procedencia dentro de la tarjeta es plana (${colorScheme})`, fields.provenanceLevel === 'flat', fields.provenanceLevel);

  await shoot(card, `extreme-card-x2-${colorScheme === 'dark' ? 'night' : 'day'}`);

  // Procedencia desplegada: el número tiene de dónde sale, sin salir de la tarjeta.
  await card.locator('.provenance-card summary').click();
  await page.waitForTimeout(250);
  await shoot(card, `provenance-open-x2-${colorScheme === 'dark' ? 'night' : 'day'}`);
  await shoot(page.locator('.result-extreme-grid').first(), `extreme-grid-x2-${colorScheme === 'dark' ? 'night' : 'day'}`);

  if (colorScheme === 'light') {
    // Escala de grises: la fiabilidad tiene que seguir leyéndose sin color.
    await page.addStyleTag({ content: 'html { filter: grayscale(1) !important; }' });
    await page.waitForTimeout(200);
    await shoot(page.locator('.result-extreme-grid').first(), 'extreme-grid-x2-grayscale');
    await shoot(page.locator('.result-summary-workspace').first(), 'summary-x2-grayscale');
  }

  const forbidden = await forbiddenInDom(page, FORBIDDEN);
  check(`copy prohibido ausente (${colorScheme})`, forbidden.length === 0, forbidden);

  const design = await page.locator('[data-testid="ntc-steel-design-card"]').evaluate((node) => ({
    resultKind: node.getAttribute('data-result-kind'),
    status: node.getAttribute('data-status'),
    text: node.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    overflow: node.scrollWidth > node.clientWidth + 1,
  }));
  check(`DesignResult separado y fail-closed (${colorScheme})`,
    design.resultKind === 'design'
      && design.status === 'unavailable'
      && /Diseño normativo separado/.test(design.text)
      && /No concluyente/.test(design.text)
      && !/Ratio del componente/.test(design.text)
      && !design.overflow,
    design);
  await shoot(page.locator('[data-testid="ntc-steel-design-card"]'), `design-card-x2-${colorScheme === 'dark' ? 'night' : 'day'}`);

  const overflow = await horizontalOverflow(page);
  check(`sin overflow horizontal X2 (${colorScheme})`, overflow.scrollWidth <= overflow.innerWidth, overflow);
  await page.close();
}

// ---------------------------------------------------------------------------
// 2 · Favorable vs desfavorable: misma materia medida
// ---------------------------------------------------------------------------
{
  const page = await newPage(CLASSES.X2);
  await enterWorkspace(page);
  await openSummary(page);

  const materias = await page.evaluate(() => [...document.querySelectorAll('.result-extreme-card')].map((card) => {
    const style = getComputedStyle(card);
    const value = card.querySelector('.result-extreme-card__value strong');
    return {
      value: value?.textContent ?? '',
      negative: (value?.textContent ?? '').trim().startsWith('-'),
      background: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      border: `${style.borderTopWidth} ${style.borderTopStyle} ${style.borderTopColor}`,
      boxShadow: style.boxShadow,
      valueColor: value ? getComputedStyle(value).color : null,
      level: card.getAttribute('data-level'),
    };
  }));
  const favourable = materias.find((entry) => !entry.negative);
  const unfavourable = materias.find((entry) => entry.negative);
  const same = favourable && unfavourable
    && favourable.background === unfavourable.background
    && favourable.backgroundImage === unfavourable.backgroundImage
    && favourable.border === unfavourable.border
    && favourable.boxShadow === unfavourable.boxShadow
    && favourable.valueColor === unfavourable.valueColor
    && favourable.level === unfavourable.level;
  check('favorable y desfavorable · misma materia medida', Boolean(same), { favourable, unfavourable });
  await shoot(page.locator('.result-extreme-grid').first(), 'favourable-vs-unfavourable-x2-day');

  // Tabla dentro de tarjeta: la tarjeta es el marco, la tabla va plana.
  const framed = await page.evaluate(() => {
    const table = document.querySelector('.result-table-card .results-table');
    if (!table) return null;
    const frame = table.closest('[data-level]');
    const row = table.querySelector('tbody tr');
    const cell = table.querySelector('tbody td');
    const wrap = table.parentElement;
    return {
      frameLevel: frame?.getAttribute('data-level') ?? null,
      frameShadow: getComputedStyle(frame).boxShadow,
      wrapShadow: getComputedStyle(wrap).boxShadow,
      wrapBorder: getComputedStyle(wrap).borderTopWidth,
      rowShadow: getComputedStyle(row).boxShadow,
      cellShadow: getComputedStyle(cell).boxShadow,
      cellRadius: getComputedStyle(cell).borderRadius,
      greenChecksPerRow: table.querySelectorAll('tbody tr svg').length,
    };
  });
  check('tabla BASE dentro de tarjeta RAISED', Boolean(framed)
    && framed.frameLevel === 'raised'
    && framed.frameShadow !== 'none'
    && framed.wrapShadow === 'none'
    && framed.rowShadow === 'none'
    && framed.cellShadow === 'none'
    && framed.cellRadius === '0px'
    && framed.greenChecksPerRow === 0, framed);
  await shoot(page.locator('.result-table-card').first(), 'flat-table-inside-raised-card-x2-day');
  await page.close();
}

// ---------------------------------------------------------------------------
// 3 · `dense` invocada en X2 / M1 / K0, con foco de vuelta y sin animación
// ---------------------------------------------------------------------------
for (const [label, viewport] of Object.entries(CLASSES)) {
  const page = await newPage(viewport, { reducedMotion: 'reduce', hasTouch: label.startsWith('K0') });
  await enterWorkspace(page);
  await openSummary(page);

  const resident = await page.locator('[data-workspace-surface="dense"]').count();
  check(`dense no es residente en ${label}`, resident === 0, { resident });

  const designBoundary = await page.locator('[data-testid="ntc-steel-design-card"]').evaluate((node) => ({
    resultKind: node.getAttribute('data-result-kind'),
    status: node.getAttribute('data-status'),
    overflow: node.scrollWidth > node.clientWidth + 1,
  }));
  check(`DesignResult visible y sin desborde en ${label}`,
    designBoundary.resultKind === 'design'
      && ['unavailable', 'incomplete'].includes(designBoundary.status)
      && !designBoundary.overflow,
    designBoundary);

  const denseOverflow = page.locator('.results-dense-overflow__trigger').first();
  if (await denseOverflow.count()) await denseOverflow.click();
  const launcher = page.locator('[data-dense-launcher="reactions"]').first();
  await launcher.waitFor({ state: 'visible', timeout: 10_000 });
  await launcher.focus();
  await page.keyboard.press('Enter');
  const surface = page.locator('[data-workspace-surface="dense"]');
  await surface.waitFor({ state: 'visible', timeout: 15_000 });
  await page.locator('.dense-reactions .results-table tbody td').first().waitFor({ state: 'visible', timeout: 15_000 });
  await page.waitForTimeout(300);

  const presentation = await page.evaluate(() => {
    const node = document.querySelector('[data-workspace-surface="dense"]');
    return {
      kind: node?.closest('[data-surface-presentation]')?.getAttribute('data-surface-presentation') ?? null,
      level: node?.getAttribute('data-level') ?? null,
      modal: node?.getAttribute('aria-modal') ?? null,
    };
  });
  const expected = label === 'X2' || label === 'M1' ? 'drawer' : 'fullscreen';
  check(`dense se presenta como ${expected} en ${label}`, presentation.kind === expected, presentation);

  await shoot(page, `dense-${label.toLowerCase()}-reactions`);
  const overflow = await horizontalOverflow(page);
  check(`sin overflow horizontal con dense abierta en ${label}`, overflow.scrollWidth <= overflow.innerWidth, overflow);

  const forbidden = await forbiddenInDom(page, FORBIDDEN);
  check(`copy prohibido ausente en dense (${label})`, forbidden.length === 0, forbidden);

  // Cierra por teclado y comprueba que el foco vuelve al lanzador que la pidió.
  await page.keyboard.press('Escape');
  await surface.waitFor({ state: 'detached', timeout: 10_000 }).catch(() => undefined);
  await page.waitForTimeout(400);
  const focusReturned = await page.evaluate(() => document.activeElement?.classList.contains('results-dense-overflow__trigger') ? 'results-overflow' : null);
  check(`dense devuelve el foco al lanzador en ${label}`, focusReturned === 'results-overflow', focusReturned);
  await page.close();
}

// ---------------------------------------------------------------------------
// 3.bis · EN en Compact: las etiquetas de extremo y procedencia no desbordan
// ---------------------------------------------------------------------------
{
  const page = await newPage(CLASSES.K0);
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.getByTestId('welcome-screen').waitFor({ state: 'visible', timeout: 20_000 });
  /* En K0 el selector de idioma del welcome está oculto por composición, así
     que se cambia el idioma sobre el control real —el mismo `select`— sin
     depender de su visibilidad; lo que se mide aquí es el ancho del texto en
     inglés, no cómo se llega a él. */
  await page.locator('.sc-home-topline select').selectOption('en', { force: true });
  await page.waitForTimeout(400);
  await openExamplePortal(page);
  await page.locator('.app-shell').waitFor({ state: 'visible', timeout: 15_000 });
  await page.waitForTimeout(400);
  await openSummary(page);

  const english = await page.evaluate(() => document.body.innerText.includes('Position') || document.body.innerText.includes('Reliability'));
  check('EN en K0 · la interfaz está realmente en inglés', english === true, { english });
  const clipping = await page.evaluate(() => [...document.querySelectorAll('.result-extreme-card')].map((card) => {
    const label = card.querySelector('.result-extreme-card__label');
    const value = card.querySelector('.result-extreme-card__value');
    const provenance = card.querySelector('.provenance-card summary');
    const overflows = (node) => node ? node.scrollWidth > node.clientWidth + 1 : false;
    return {
      label: label?.textContent ?? '',
      labelOverflow: overflows(label),
      valueOverflow: overflows(value),
      provenanceOverflow: overflows(provenance),
      cardOverflow: card.scrollWidth > card.clientWidth + 1,
    };
  }));
  check('EN en K0 · etiquetas de extremo y procedencia sin desbordar',
    clipping.length > 0 && clipping.every((entry) => !entry.labelOverflow && !entry.valueOverflow && !entry.provenanceOverflow && !entry.cardOverflow),
    clipping);
  const englishDesign = await page.locator('[data-testid="ntc-steel-design-card"]').evaluate((node) => ({
    text: node.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    overflow: node.scrollWidth > node.clientWidth + 1,
  }));
  check('EN en K0 · DesignResult separado, inconcluso y sin desbordar',
    /Separate code design/.test(englishDesign.text)
      && /Inconclusive/.test(englishDesign.text)
      && !englishDesign.overflow,
    englishDesign);
  const overflow = await horizontalOverflow(page);
  check('EN en K0 · sin overflow horizontal', overflow.scrollWidth <= overflow.innerWidth, overflow);
  await shoot(page, 'summary-k0-english');
  await shoot(page.locator('[data-testid="ntc-steel-design-card"]'), 'design-card-k0-english');
  await page.close();
}

// ---------------------------------------------------------------------------
// 4 · El Datasheet NO se cardificó
// ---------------------------------------------------------------------------
{
  const page = await newPage(CLASSES.X2);
  await enterWorkspace(page);
  /* Se abre por el propio bus del workspace: el Datasheet no es objeto de este
     slice, aquí sólo se comprueba que sigue intacto. */
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('structureco:open-datasheet')));
  await page.waitForTimeout(1_200);
  const grid = page.locator('.datasheet-grid').first();
  const visible = await grid.isVisible().catch(() => false);
  if (visible) {
    const gridMateria = await page.evaluate(() => {
      const cell = document.querySelector('.datasheet-grid tbody td');
      const row = document.querySelector('.datasheet-grid tbody tr');
      return {
        cellShadow: getComputedStyle(cell).boxShadow,
        cellRadius: getComputedStyle(cell).borderRadius,
        rowShadow: getComputedStyle(row).boxShadow,
        cardsInsideGrid: document.querySelectorAll('.datasheet-grid [data-level="raised"], .datasheet-grid .result-extreme-card').length,
      };
    });
    check('Datasheet sin cardificar: celdas planas y sin tarjetas por fila',
      gridMateria.cellShadow === 'none' && gridMateria.cellRadius === '0px' && gridMateria.rowShadow === 'none' && gridMateria.cardsInsideGrid === 0,
      gridMateria);
    await shoot(page.locator('.datasheet-grid-scroll').first(), 'datasheet-not-cardified-x2-day');
  } else {
    check('Datasheet sin cardificar: celdas planas y sin tarjetas por fila', false, 'no se pudo abrir el Datasheet');
  }
  await page.close();
}

fs.writeFileSync(path.join(outDir, 'qa-results-cards.json'), `${JSON.stringify(report, null, 2)}\n`);
await browser.close();
await previewServer.close();

console.log(`\n${report.failures.length === 0 ? 'TODO OK' : `${report.failures.length} FALLOS`} · evidencia en ${path.relative(repoRoot, outDir)}`);
if (report.failures.length) process.exitCode = 1;
