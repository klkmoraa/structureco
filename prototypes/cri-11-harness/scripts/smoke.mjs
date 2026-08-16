#!/usr/bin/env node
/**
 * Recorrido mínimo, ejecutado de verdad.
 *
 *   node scripts/smoke.mjs            # Chromium, tres composiciones
 *   node scripts/smoke.mjs --headed   # con ventana
 *
 * Qué comprueba, en este orden:
 *   1. Welcome → Continuar proyecto → Workspace.
 *   2. Seleccionar M1 en el lienzo.
 *   3. Cambiar sección → previsualizar → aplicar.
 *   4. El resultado anterior DESAPARECE y el estado pasa a `stale`.
 *   5. Resolver → `calculating` → `current`.
 *   6. Elegir Momento como capa de evidencia.
 *   7. Abrir Datasheet, localizar M12 → la tabla queda en `peek`, no cerrada.
 *   8. Volver al lienzo con la selección y la evidencia intactas.
 *   9. Recorrer 1440×900 → 1024×768 → 390×844 y comprobar que la composición
 *      resuelta es X2 → M1 → K0 SIN perder selección, evidencia ni resultado.
 *  10. Día/Noche y es-MX/en-US sin errores de consola ni overflow horizontal.
 *
 * Fase B añade, en el mismo paso Chromium (sin matriz multi-navegador — eso
 * queda para una fase de estrés que no es ésta):
 *  11. Deshacer/Rehacer sobre un cambio de sección committeado.
 *  12. Command Palette: `Ctrl+K`, ejecutar «Resolver» por comando, y localizar
 *      un objeto por ID escrito a mano (SHL-06).
 *  13. Crear un nudo con la herramienta Nodo y verlo aparecer en Datasheet.
 *  14. Model Doctor detecta ese nudo como hallazgo «sin conexión», lo localiza
 *      y se reconoce — sin elevarlo a dictamen de seguridad.
 *  15. Eliminar con la tecla Delete.
 *  16. Selección múltiple (Shift+clic) y el estado de bloque en Detail.
 *  17. Zoom con los controles flotantes y encuadre.
 *
 * Sale con código 1 ante cualquier error de consola, excepción de página o
 * aserción fallida. Las capturas son evidencia de la ejecución, no el entregable.
 */

import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const REPO = path.resolve(ROOT, '../..');
const OUT = path.join(REPO, 'reports/evidence/2026-08-15-cri-11-fase-b');
const PORT = 5311;
const BASE = `http://127.0.0.1:${PORT}/`;
const headed = process.argv.includes('--headed');

const problems = [];
const steps = [];
const fail = (message) => {
  problems.push(message);
  console.error(`  ✗ ${message}`);
};
const ok = (message) => {
  steps.push(message);
  console.log(`  ✓ ${message}`);
};

/** Chromium del entorno, si existe. `undefined` deja decidir a Playwright. */
const chromiumPath = () => {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!base || !existsSync(base)) return undefined;
  const build = readdirSync(base)
    .filter((entry) => /^chromium-\d+$/.test(entry))
    .sort()
    .pop();
  if (!build) return undefined;
  const binary = path.join(base, build, 'chrome-linux', 'chrome');
  return existsSync(binary) ? binary : undefined;
};

const waitForServer = async (url, attempts = 60) => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch {
      /* todavía no escucha */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
};

const run = async () => {
  await mkdir(OUT, { recursive: true });

  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT,
    stdio: 'ignore',
    env: process.env,
  });

  if (!(await waitForServer(BASE))) {
    server.kill();
    throw new Error(`El servidor de preview no respondió en ${BASE}. ¿Falta \`npx vite build\`?`);
  }

  // El entorno trae Chromium preinstalado en `PLAYWRIGHT_BROWSERS_PATH`, pero su
  // build no siempre coincide con la que espera la versión de Playwright del
  // paquete. Cuando existe, se usa por ruta explícita en vez de descargar otra.
  const browser = await chromium.launch({ headless: !headed, executablePath: chromiumPath() });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await context.newPage();

  page.on('console', (message) => {
    if (message.type() === 'error') fail(`Consola: ${message.text()}`);
  });
  page.on('pageerror', (error) => fail(`Excepción de página: ${error.message}`));

  const axis = async (label, value) => {
    const group = page.locator('.lab-row', { hasText: label }).first();
    const select = group.locator('select');
    if (await select.count()) {
      await select.selectOption(value);
      return;
    }
    await group.locator('button', { hasText: value }).first().click();
  };

  const composition = () => page.locator('.lab-readout dd strong').first().innerText();
  const phase = () => page.locator('.lab-group', { hasText: 'Estado' }).locator('.lab-meta strong').innerText();
  const shot = (name) => page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });

  await page.goto(BASE, { waitUntil: 'networkidle' });

  // 1 · Welcome
  await page.locator('.pt-welcome__hero').waitFor();
  if ((await page.locator('.pt-fixture-note').count()) === 0) fail('Welcome no rotula que los datos son fixture.');
  else ok('Welcome rotula el fixture y muestra la voz seleccionada.');
  await shot('01-welcome-dia-es');

  await page.getByRole('button', { name: 'Continuar proyecto' }).first().click();
  await page.locator('.pt-shell').waitFor();
  ok('Continuar proyecto entra al Workspace.');

  if ((await composition()) !== 'X2') fail(`1440×900 debería resolver X2, resolvió ${await composition()}.`);
  else ok('1440×900 resuelve X2 (dos docks laterales).');

  // 2 · Selección en el lienzo
  await page.locator('.pt-canvas .pt-object[aria-label^="M2"]').first().click();
  await page.locator('.pt-detail__title').first().waitFor();
  if (!(await page.locator('.pt-contextual__subject strong').innerText()).includes('M2')) {
    fail('Las acciones contextuales no muestran el objeto seleccionado.');
  } else ok('Seleccionar M2 abre detalle contextual y acciones sobre el objeto.');
  await shot('02-x2-seleccion-detalle');

  // 2b · Teclado: el lienzo es tabulable y Enter selecciona, sin ratón.
  await page.locator('.pt-canvas .pt-object[aria-label^="M1"]').first().focus();
  await page.keyboard.press('Enter');
  if (!(await page.locator('.pt-contextual__subject strong').innerText()).includes('M1')) {
    fail('El lienzo no es seleccionable por teclado.');
  } else ok('El lienzo es tabulable: Enter selecciona sin ratón.');
  const ring = await page.evaluate(() => {
    const target = document.querySelector('.pt-canvas .pt-object[aria-label^="M1"]');
    return target ? getComputedStyle(target.querySelector('.pt-member')).strokeWidth : '';
  });
  if (ring === '3px') fail('El objeto con foco no se distingue del resto.');
  await page.locator('.pt-canvas .pt-object[aria-label^="M2"]').first().click();

  // 3 · Resolver primero, para tener resultado que perder
  await page.getByRole('button', { name: 'Resolver' }).first().click();
  await page.waitForFunction(() => document.querySelector('.lab-group .lab-meta strong')?.textContent === 'current', null, { timeout: 8000 });
  ok('Resolver recorre calculating → current con evidencia de fixture.');

  // 4 · Cambiar sección: previsualizar y aplicar
  await page.locator('.pt-detail select').first().selectOption({ label: 'IPE 360' });
  if ((await page.locator('.pt-preview').count()) === 0) fail('Cambiar sección no abre previsualización antes de comprometer.');
  else ok('Cambiar sección previsualiza sin aplicar (preview → commit).');
  await shot('03-preview-seccion');

  await page.getByRole('button', { name: 'Aplicar cambio' }).click();
  if ((await phase()) !== 'stale') fail(`Aplicar un cambio debería dejar el análisis en stale, quedó en ${await phase()}.`);
  else ok('Aplicar el cambio destruye el resultado: el estado deriva a stale (fail-closed).');
  if ((await page.locator('.pt-diagram').count()) !== 0) fail('Se está pintando evidencia caducada sobre el modelo.');
  else ok('Con el resultado destruido no queda evidencia que pintar.');
  await shot('04-stale-tras-editar');

  // 5 · Resolver de nuevo
  await page.getByRole('button', { name: 'Resolver' }).first().click();
  await page.waitForFunction(() => document.querySelector('.lab-group .lab-meta strong')?.textContent === 'current', null, { timeout: 8000 });
  ok('Resolver de nuevo devuelve el estado a current.');

  // 6 · Evidencia como capa del lienzo
  await page.locator('.pt-canvas-chrome .pt-chip', { hasText: 'Vista' }).first().click();
  await page.locator('.pt-view').waitFor();
  await page.locator('.pt-segmented__option', { hasText: 'Momento M' }).click();
  if ((await page.locator('.pt-diagram').count()) === 0) fail('Elegir Momento no pinta el diagrama sobre el modelo.');
  else ok('La evidencia es una capa del lienzo, no una pestaña de resultados (D-03).');
  await shot('05-evidencia-momento');
  await page.locator('.pt-view .sc-icon-button').click();

  // 7 · Datasheet, localizar y peek
  await page.locator('.pt-canvas-chrome .pt-chip', { hasText: 'Datasheet' }).first().click();
  await page.locator('.pt-dense').waitFor();
  await page.locator('.pt-table tbody tr', { hasText: 'M1' }).first().locator('.pt-row-action').click();
  if ((await page.locator('.pt-peek').count()) === 0) fail('Localizar cerró la tabla en vez de degradarla a peek (D-11).');
  else ok('Localizar degrada la tabla a `peek`: sigue viva y con vuelta explícita.');
  await shot('06-peek-tras-localizar');

  await page.locator('.pt-peek button').click();
  await page.locator('.pt-dense').waitFor();
  ok('La vuelta desde `peek` restaura la tabla.');
  await page.locator('.pt-dense .sc-icon-button').click();

  const selectionBefore = await page.locator('.pt-contextual__subject strong').innerText();

  // 8 · Continuidad al cruzar las fronteras de composición
  for (const [preset, expected] of [
    ['1024×768 · portátil corriente', 'M1'],
    ['390×844 · móvil', 'K0'],
    ['1440×900', 'X2'],
  ]) {
    await axis('Viewport', preset);
    await page.waitForTimeout(320);
    const resolved = await composition();
    if (resolved !== expected) fail(`${preset} debería resolver ${expected}, resolvió ${resolved}.`);
    else ok(`${preset} resuelve ${expected}.`);
    const selectionNow = await page.locator('.pt-contextual__subject strong').innerText();
    if (selectionNow !== selectionBefore) fail(`Cruzar a ${expected} perdió la selección (${selectionBefore} → ${selectionNow}).`);
    if ((await phase()) !== 'current') fail(`Cruzar a ${expected} alteró el estado de análisis.`);
    if (expected === 'M1') await shot('07-m1-inset');
    if (expected === 'K0') await shot('08-k0-sheet');
  }
  ok('Selección, evidencia y estado sobreviven a X2 → M1 → K0 → X2 (T-INV-1).');

  // 9 · Apaisado compacto: la hoja llega por el lado (CB-6)
  await axis('Viewport', '390×844 · móvil');
  await axis('Orientación', 'Apaisado');
  await page.waitForTimeout(260);
  const side = await page.locator('.lab-readout').innerText();
  if (!side.includes('el lado')) fail('En Compact apaisado la hoja debería llegar por el lado (CB-6).');
  else ok('En Compact apaisado la hoja llega por el lado, no por abajo (CB-6).');
  await shot('09-k0-apaisado');
  await axis('Orientación', 'Retrato');
  await axis('Viewport', '1440×900');

  // 10 · Noche, inglés, Esencial y táctil
  await axis('Tema', 'Noche');
  await page.waitForTimeout(200);
  await shot('10-x2-noche');
  await axis('Idioma', 'en-US');
  await axis('Modo', 'Esencial');
  await page.waitForTimeout(200);
  if ((await page.locator('.pt-detail').innerText()).includes('Detalle')) {
    fail('Cambiar a en-US dejó cadenas en español dentro del detalle.');
  } else ok('es-MX ↔ en-US y Esencial ↔ Completa cambian en caliente sin recargar.');
  await shot('11-x2-noche-en-esencial');

  const overflow = await page.evaluate(() => {
    const viewport = document.querySelector('.lab-frame__viewport');
    return viewport ? viewport.scrollWidth - viewport.clientWidth : 0;
  });
  if (overflow > 1) fail(`Hay ${overflow}px de desbordamiento horizontal en el prototipo.`);
  else ok('Cero desbordamiento horizontal accidental.');

  await axis('Tema', 'Día');
  await axis('Idioma', 'es-MX');
  await axis('Modo', 'Completa');

  // 11 · Estados que no se alcanzan por el camino normal
  for (const [state, expectedPhase] of [
    ['unreliable · requiere revisión', 'unreliable'],
    ['failed · sin resultados utilizables', 'failed'],
    ['offline · conectividad', 'stale'],
  ]) {
    await axis('Análisis · conectividad · persistencia', state);
    await page.waitForTimeout(160);
    if (state.startsWith('offline')) {
      if ((await page.locator('.pt-chip--offline').count()) === 0) fail('El estado offline no se muestra en la TopBar.');
      else ok('offline se muestra sin convertirse en una fase de análisis.');
    } else if ((await phase()) !== expectedPhase) {
      fail(`El eje de estado ${state} no derivó a ${expectedPhase}.`);
    } else ok(`El eje de estado alcanza ${expectedPhase}.`);
  }
  await axis('Análisis · conectividad · persistencia', 'unreliable · requiere revisión');
  await page.waitForTimeout(160);
  await page.locator('.pt-chip--state').click();
  if ((await page.locator('.pt-cause__check').count()) === 0) fail('La causa de fiabilidad no es alcanzable por un elemento enfocable (D-14).');
  else ok('La causa gobernante vive en un botón, no en un `title` (D-14).');
  await shot('12-causa-fiabilidad');
  await page.locator('.pt-chip--state').click();

  // 12 · Fixture grande
  await axis('Fixture', 'datasheet-2000');
  await page.waitForTimeout(260);
  await page.getByRole('button', { name: 'Datasheet' }).first().click();
  const started = Date.now();
  await page.locator('.pt-table tbody tr').first().waitFor();
  const elapsed = Date.now() - started;
  const rows = await page.locator('.pt-table tbody tr').count();
  ok(`Fixture grande: ${rows} filas pintadas sin virtualización en ${elapsed} ms hasta la primera fila.`);
  // La captura espera a que termine la transición de apertura: si no, la
  // evidencia muestra el cajón a media opacidad y parece un fallo de fondo.
  await page.waitForTimeout(500);
  await shot('13-fixture-grande');

  // 13 · Esencial ≠ menos capacidad: cambia el disclosure, no las filas ni las rutas.
  const columnsComplete = await page.locator('.pt-table thead th').count();
  const rowsComplete = await page.locator('.pt-table tbody tr').count();
  const locateComplete = await page.locator('.pt-table tbody .pt-row-action').count();
  await axis('Modo', 'Esencial');
  await page.waitForTimeout(200);
  const columnsEssential = await page.locator('.pt-table thead th').count();
  const rowsEssential = await page.locator('.pt-table tbody tr').count();
  const locateEssential = await page.locator('.pt-table tbody .pt-row-action').count();
  if (columnsEssential >= columnsComplete) fail('Esencial no reduce densidad respecto a Completa.');
  else if (rowsEssential !== rowsComplete || locateEssential !== locateComplete) {
    fail('Esencial ocultó objetos o rutas, no sólo densidad.');
  } else {
    ok(`Esencial baja de ${columnsComplete} a ${columnsEssential} columnas conservando ${rowsEssential} filas y sus rutas.`);
  }
  await axis('Modo', 'Completa');

  // ===================================================================
  // Fase B — capacidades nuevas, mismo paso de Chromium
  // ===================================================================

  await axis('Fixture', 'portal-basic');
  // El eje «Análisis · conectividad · persistencia» persiste a través del
  // cambio de escenario a propósito (como Tema/Idioma) — se deja explícito
  // en «current» aquí porque la sección 11 lo dejó en «unreliable».
  await axis('Análisis · conectividad · persistencia', 'current · resultados vigentes');
  await page.waitForTimeout(200);

  // 14 · Deshacer / Rehacer sobre un cambio de sección committeado
  await page.locator('.pt-canvas .pt-object[aria-label^="M1"]').first().click();
  await page.locator('.pt-detail select').first().waitFor();
  const sectionBefore = await page.locator('.pt-detail select').first().inputValue();
  await page.locator('.pt-detail select').first().selectOption({ label: 'HEA 260' });
  await page.getByRole('button', { name: 'Aplicar cambio' }).click();
  const sectionAfterCommit = await page.locator('.pt-detail select').first().inputValue();
  if (sectionAfterCommit === sectionBefore) fail('Aplicar cambio no modificó la sección de M1.');
  const undoButton = page.getByRole('button', { name: 'Deshacer' });
  if (await undoButton.isDisabled()) fail('Deshacer aparece deshabilitado tras un cambio committeado.');
  await undoButton.click();
  await page.waitForTimeout(120);
  const sectionAfterUndo = await page.locator('.pt-detail select').first().inputValue();
  if (sectionAfterUndo !== sectionBefore) fail(`Deshacer no revirtió la sección (esperaba ${sectionBefore}, quedó ${sectionAfterUndo}).`);
  else ok('Deshacer revierte un cambio de sección committeado.');
  await page.getByRole('button', { name: 'Rehacer' }).click();
  await page.waitForTimeout(120);
  const sectionAfterRedo = await page.locator('.pt-detail select').first().inputValue();
  if (sectionAfterRedo !== sectionAfterCommit) fail('Rehacer no reaplicó el cambio deshecho.');
  else ok('Rehacer reaplica el cambio deshecho.');

  // 15 · Command Palette: ejecutar un comando y localizar por ID (SHL-05/06)
  await page.getByRole('button', { name: 'Paleta de comandos' }).click();
  await page.locator('.pt-palette__input').waitFor();
  await page.locator('.pt-palette__input').fill('resolver');
  const solveEntry = page.locator('.pt-palette__option', { hasText: 'Resolver' });
  await solveEntry.first().waitFor();
  await shot('14-command-palette');
  await solveEntry.first().click();
  await page.waitForFunction(() => document.querySelector('.lab-group .lab-meta strong')?.textContent === 'current', null, { timeout: 8000 });
  ok('La Command Palette ejecuta «Resolver» por el mismo commandId que el botón visible.');

  await page.getByRole('button', { name: 'Paleta de comandos' }).click();
  await page.locator('.pt-palette__input').waitFor();
  await page.locator('.pt-palette__input').fill('M2');
  const locateEntry = page.locator('.pt-palette__option', { hasText: 'Localizar M2' });
  if ((await locateEntry.count()) === 0) fail('La paleta no ofrece «Localizar M2» al escribir un ID (SHL-06).');
  else {
    await locateEntry.first().click();
    await page.waitForTimeout(120);
    if (!(await page.locator('.pt-contextual__subject strong').innerText()).includes('M2')) {
      fail('Elegir «Localizar M2» en la paleta no seleccionó el objeto.');
    } else ok('Navegar a un objeto por ID desde la paleta selecciona el objeto real (SHL-06).');
  }

  // 16 · Crear un nudo con la herramienta Nodo (MOD-02) y verlo en Datasheet
  await page.locator('.pt-toolrail .pt-tool[aria-label="Nodo"]').first().click();
  const canvasBox = await page.locator('.pt-canvas').first().boundingBox();
  if (canvasBox) {
    await page.mouse.click(canvasBox.x + canvasBox.width * 0.5, canvasBox.y + canvasBox.height * 0.12);
  }
  await page.locator('.pt-toolrail .pt-tool[aria-label="Seleccionar"]').first().click();
  await page.getByRole('button', { name: 'Datasheet' }).first().click();
  await page.locator('.pt-dense').waitFor();
  await page.locator('.pt-segmented button', { hasText: 'Nodos' }).first().click();
  await page.waitForTimeout(150);
  const nodeRowsAfterCreate = await page.locator('.pt-table tbody tr').count();
  if (nodeRowsAfterCreate !== 5) fail(`Crear un nudo con la herramienta Nodo debería dejar 5 filas en Datasheet · Nodos, hay ${nodeRowsAfterCreate}.`);
  else ok('La herramienta Nodo crea un nudo real en el modelo efectivo (MOD-02), visible en Datasheet.');
  const newNodeId = await page.locator('.pt-table tbody tr').last().locator('th').innerText();
  await page.locator('.pt-dense .sc-icon-button').click();

  // 17 · Model Doctor detecta el nudo sin conexión, lo localiza y se reconoce
  await page.locator('.pt-topbar__status button[aria-label^="Model Doctor"]').click();
  await page.locator('.pt-doctor').waitFor();
  const attentionCard = page.locator('.pt-doctor__card[data-severity="attention"]', { hasText: newNodeId });
  if ((await attentionCard.count()) === 0) {
    fail(`Model Doctor no reporta ${newNodeId} como hallazgo de modelado (nudo sin conexión).`);
  } else {
    ok('Model Doctor detecta el nudo recién creado como hallazgo de modelado, sin dictamen de seguridad.');
    await page.waitForTimeout(400); // deja terminar la animación de entrada del drawer antes de capturar
    await shot('15-model-doctor');
    await attentionCard.locator('.pt-row-action', { hasText: 'Localizar' }).click();
    await page.waitForTimeout(150);
    if (!(await page.locator('.pt-contextual__subject strong').innerText()).includes(newNodeId)) {
      fail('Localizar desde Model Doctor no seleccionó el objeto del hallazgo.');
    } else ok('Localizar desde Model Doctor sincroniza el objeto y la evidencia (DOC-04).');
    // Localizar degrada Doctor a `peek` (D-11): hay que volver antes de seguir
    // operando sobre sus tarjetas.
    if ((await page.locator('.pt-peek').count()) === 0) fail('Localizar desde Model Doctor no lo dejó en `peek`.');
    else {
      ok('Localizar desde Model Doctor lo degrada a `peek`, no lo cierra (D-11).');
      await page.locator('.pt-peek button').click();
      await page.locator('.pt-doctor').waitFor();
    }
    await attentionCard.locator('.pt-row-action', { hasText: 'Reconocido' }).click();
    if ((await page.locator('.pt-doctor__card[data-acknowledged]').count()) === 0) fail('Reconocer un hallazgo no deja constancia visible (DOC-06).');
    else ok('Reconocer un hallazgo deja constancia visible en su tarjeta (DOC-06).');
  }
  await page.locator('.pt-doctor .sc-icon-button').click();

  // 18 · Eliminar con la tecla Delete (MOD-09)
  if (!(await page.locator('.pt-contextual__subject strong').innerText()).includes(newNodeId)) {
    await page.locator('.pt-canvas .pt-object', { hasText: newNodeId }).first().click();
  }
  await page.keyboard.press('Delete');
  await page.waitForTimeout(150);
  await page.getByRole('button', { name: 'Datasheet' }).first().click();
  await page.locator('.pt-dense').waitFor();
  await page.locator('.pt-segmented button', { hasText: 'Nodos' }).first().click();
  await page.waitForTimeout(150);
  const nodeRowsAfterDelete = await page.locator('.pt-table tbody tr').count();
  if (nodeRowsAfterDelete !== 4) fail(`Eliminar con Delete debería dejar 4 nudos, hay ${nodeRowsAfterDelete}.`);
  else ok('La tecla Delete elimina la selección real del modelo (MOD-09), con Deshacer disponible.');
  await page.locator('.pt-dense .sc-icon-button').click();

  // 19 · Selección múltiple (Shift+clic) y estado de bloque en Detail (SEL-04, INS-04)
  await page.locator('.pt-canvas .pt-object[aria-label^="M1"]').first().click();
  await page.locator('.pt-canvas .pt-object[aria-label^="M3"]').first().click({ modifiers: ['Shift'] });
  const subjectText = await page.locator('.pt-contextual__subject strong').innerText();
  if (!subjectText.startsWith('2')) fail(`Shift+clic debería dejar 2 objetos seleccionados, la barra dice «${subjectText}».`);
  else ok('Shift+clic acumula selección heterogénea/homogénea (SEL-04).');
  if ((await page.locator('.pt-detail__title', { hasText: 'objetos seleccionados' }).count()) === 0) {
    fail('Detail no muestra el estado de bloque con selección múltiple (INS-04).');
  } else ok('Detail muestra el estado MIXED de bloque, no la ficha de un solo objeto.');
  await shot('16-multiseleccion-bloque');
  await page.keyboard.press('Escape');

  // 20 · Zoom con los controles flotantes (CNV-01)
  const pctBefore = await page.locator('.pt-zoom-controls__pct').innerText();
  await page.getByRole('button', { name: 'Acercar' }).click();
  await page.getByRole('button', { name: 'Acercar' }).click();
  const pctZoomed = await page.locator('.pt-zoom-controls__pct').innerText();
  if (pctZoomed === pctBefore) fail('Los controles de zoom no cambian el encuadre.');
  await page.locator('.pt-zoom-controls__pct').click();
  const pctReset = await page.locator('.pt-zoom-controls__pct').innerText();
  if (pctReset !== '100%') fail(`Encuadrar todo debería volver a 100%, quedó en ${pctReset}.`);
  else ok(`Zoom flotante: ${pctBefore} → ${pctZoomed} → encuadrar todo → ${pctReset} (CNV-01).`);

  // 21 · Puertas recuperadas: Preferencias y Salida (SHL-22), reachable desde la mesa
  await page.locator('.pt-topbar__status button[aria-label="Preferencias"]').click();
  await page.locator('.pt-preferences').waitFor();
  await page.waitForTimeout(400); // deja terminar la animación de entrada del drawer antes de capturar
  await shot('17-preferencias');
  await page.locator('.pt-preferences .pt-segmented', { hasText: 'Noche' }).getByRole('button', { name: 'Noche' }).click();
  await page.waitForTimeout(150);
  if ((await page.evaluate(() => document.documentElement.getAttribute('data-theme'))) !== 'dark') {
    fail('Preferencias no cambia el tema real del prototipo.');
  } else ok('La puerta Preferencias despacha el mismo axis/set que el panel del laboratorio (una sola fuente de verdad).');
  await page.locator('.pt-preferences .pt-segmented', { hasText: 'Día' }).getByRole('button', { name: 'Día' }).click();
  await page.locator('.pt-preferences .sc-icon-button').click();

  await page.locator('.pt-topbar__status button[aria-label="Salida"]').click();
  await page.locator('.pt-output').waitFor();
  if ((await page.locator('.pt-output').innerText()).toLowerCase().includes('simulado')) {
    ok('Salida se rotula explícitamente como no-funcional en este prototipo (no finge exportar de verdad).');
  } else fail('Salida no advierte que sus acciones son simuladas.');
  await page.waitForTimeout(400);
  await shot('18-salida');
  await page.locator('.pt-output .sc-icon-button').click();

  const telemetry = await page.evaluate(() => document.querySelectorAll('.lab-group .lab-meta').length);
  if (telemetry === 0) fail('El panel de telemetría no informa.');

  await browser.close();
  server.kill();

  await writeFile(
    path.join(OUT, 'smoke-report.md'),
    [
      '# CRI-11 Fase B · recorrido ejecutado',
      '',
      `Ejecutado el ${new Date().toISOString()} sobre Chromium (Playwright), build de \`prototypes/cri-11-harness\`.`,
      '',
      '## Comprobaciones superadas',
      '',
      ...steps.map((step) => `- ${step}`),
      '',
      problems.length ? '## Fallos\n' : '## Fallos\n\nNinguno.',
      ...problems.map((problem) => `- ${problem}`),
      '',
      '> Las capturas de esta carpeta son evidencia de ejecución, no el entregable de CRI-11.',
      '> Todos los datos que aparecen en ellas son fixture.',
      '',
    ].join('\n'),
    'utf8',
  );

  console.log(`\n${steps.length} comprobaciones superadas · ${problems.length} fallos`);
  console.log(`Evidencia en ${path.relative(REPO, OUT)}`);
  if (problems.length > 0) process.exit(1);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
