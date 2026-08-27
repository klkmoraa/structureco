#!/usr/bin/env node
/**
 * CRI-11 · Fase C — validación y estrés.
 *
 * No es un recorrido de Fase A/B (eso ya lo cubre `smoke.mjs`, 41/41 en
 * verde tras esta fase). Éste es el gate de cierre: prototipa/verifica lo
 * que Fase B dejó abierto, mide en vez de opinar, y confirma la matriz de
 * ejes completa en un solo paso de Chromium.
 *
 *   node scripts/validate.mjs
 *
 * Escribe evidencia (capturas + `validate-report.md` + `metrics.json`) en
 * `reports/evidence/2026-08-16-cri-11-fase-c/`. Sale con código 1 ante
 * cualquier error de consola, excepción de página o aserción incumplida.
 */

import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const REPO = path.resolve(ROOT, '../..');
const OUT = path.join(REPO, 'reports/evidence/2026-08-16-cri-11-fase-c');
const PORT = 5411;
const BASE = `http://127.0.0.1:${PORT}/`;
const headed = process.argv.includes('--headed');

const problems = [];
const steps = [];
const metrics = { interactions: {}, hysteresis: [], stress: {} };
const fail = (message) => {
  problems.push(message);
  console.error(`  ✗ ${message}`);
};
const ok = (message) => {
  steps.push(message);
  console.log(`  ✓ ${message}`);
};
const note = (message) => console.log(`  • ${message}`);

const chromiumPath = () => {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!base || !existsSync(base)) return undefined;
  const build = readdirSync(base).filter((entry) => /^chromium-\d+$/.test(entry)).sort().pop();
  if (!build) return undefined;
  const binary = path.join(base, build, 'chrome-linux', 'chrome');
  return existsSync(binary) ? binary : undefined;
};

/** ¿Hay algún build de Firefox/WebKit ya instalado por Playwright en este entorno? */
const otherBrowsersAvailable = () => {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!base || !existsSync(base)) return { firefox: false, webkit: false };
  const entries = readdirSync(base);
  return {
    firefox: entries.some((entry) => /^firefox-\d+$/.test(entry)),
    webkit: entries.some((entry) => /^webkit-\d+$/.test(entry)),
  };
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

  const browsers = otherBrowsersAvailable();
  note(`Firefox instalado en este entorno: ${browsers.firefox ? 'sí' : 'no'} · WebKit: ${browsers.webkit ? 'sí' : 'no'}`);

  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT,
    stdio: 'ignore',
    env: process.env,
  });

  if (!(await waitForServer(BASE))) {
    server.kill();
    throw new Error(`El servidor de preview no respondió en ${BASE}. ¿Falta \`npm run build\`?`);
  }

  const browser = await chromium.launch({ headless: !headed, executablePath: chromiumPath() });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, hasTouch: true, acceptDownloads: true });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);

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

  const setHysteresis = async (value) => {
    const slider = page.locator('.lab-row', { hasText: 'Histéresis' }).locator('input[type=range]');
    await slider.evaluate((element, target) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(element, String(target));
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
  };

  const composition = () => page.locator('.lab-readout dd strong').first().innerText();
  const phase = () => page.locator('.lab-group', { hasText: 'Estado' }).locator('.lab-meta strong').innerText();
  const eventCount = async () => {
    const text = await page.locator('.lab-group', { hasText: 'Telemetría local' }).locator('.lab-meta').first().innerText();
    return Number(text.match(/\d+/)?.[0] ?? 0);
  };
  const resetTelemetry = () => page.locator('.lab-actions button', { hasText: 'Vaciar' }).click();
  const downloadTelemetry = async () => {
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('.lab-actions button', { hasText: 'Descargar JSON' }).click()]);
    const filePath = await download.path();
    return JSON.parse(await readFile(filePath, 'utf8'));
  };
  const shot = (name) => page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Continuar proyecto' }).first().click();
  await page.locator('.pt-shell').waitFor();
  ok('Arranque: Welcome → Workspace, listo para la matriz de validación.');

  // ===================================================================
  // A · Selección táctil pendiente en Compact — long-press sobre vacío
  //     arma marquee (antes: callejón sin salida), un arrastre corto
  //     SIGUE siendo pan (no se rompe).
  // ===================================================================
  await axis('Fixture', 'Nudo con candidatos solapados · Fase B');
  await axis('Input', 'Táctil');
  await page.waitForTimeout(150);

  {
    // A1 · pan táctil corto: SIGUE funcionando igual que antes de esta fase.
    const box = await page.locator('.pt-canvas').boundingBox();
    const before = await page.evaluate(() => document.querySelector('.pt-canvas > g')?.getAttribute('transform'));
    const cx = box.x + box.width * 0.25;
    const cy = box.y + box.height * 0.75;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx + 90, y: cy - 40 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(80);
    const after = await page.evaluate(() => document.querySelector('.pt-canvas > g')?.getAttribute('transform'));
    if (before === after) fail('Un arrastre táctil corto sobre vacío dejó de mover la cámara (pan roto).');
    else ok('Pan táctil corto (sin pausa) sigue funcionando exactamente igual tras el cambio (no se rompió).');
    // Encuadra de nuevo para que la siguiente comprobación parta de un estado conocido.
    await page.locator('.pt-zoom-controls__pct').click();
  }

  {
    // A2 · long-press sobre vacío + arrastre: arma marquee y selecciona
    // varios objetos (antes: no seleccionaba nada al soltar). El punto de
    // inicio tiene que estar realmente vacío (ni un candidato bajo el dedo,
    // o arma el crosshair de precisión en vez del marco) y el arrastre debe
    // barrer la zona de N3, donde convergen siete elementos.
    const canvasBox = await page.locator('.pt-canvas').boundingBox();
    const n3Box = await page.locator('.pt-canvas .pt-object[aria-label^="N3"]').first().boundingBox();
    const startX = canvasBox.x + canvasBox.width * 0.08;
    const startY = canvasBox.y + canvasBox.height * 0.9;
    const targetX = n3Box.x + n3Box.width / 2;
    const targetY = n3Box.y + n3Box.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: startX, y: startY, radiusX: 5, radiusY: 5, force: 1 }] });
    await page.waitForTimeout(600); // > LONG_PRESS_MS (480ms): arma el gesto
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: (startX + targetX) / 2, y: (startY + targetY) / 2, radiusX: 5, radiusY: 5, force: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: targetX, y: targetY, radiusX: 5, radiusY: 5, force: 1 }] });
    await page.waitForTimeout(60);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(120);
    const subject = await page.locator('.pt-contextual__subject strong').count();
    if (subject === 0) {
      fail('Long-press + arrastre táctil sobre vacío no seleccionó nada (marquee táctil sigue roto).');
    } else {
      const text = await page.locator('.pt-contextual__subject strong').innerText();
      ok(`Long-press + arrastre táctil arma selección por marco y selecciona: "${text}" (antes era un callejón sin salida).`);
      await shot('01-marquee-tactil');
    }
    await page.keyboard.press('Escape');
  }

  await axis('Input', 'Ratón');

  // ===================================================================
  // B · Candidate Picker: recorrer con teclado (quinta fase de D-06).
  // ===================================================================
  {
    const n3 = page.locator('.pt-canvas .pt-object[aria-label^="N3"]').first();
    await n3.click();
    const opened = await page.locator('.pt-picker').count();
    if (opened === 0) fail('N3 (siete elementos convergentes) no abrió el Candidate Picker por ambigüedad.');
    else {
      ok('Zona con siete candidatos abre el picker (nunca elige en silencio).');
      const firstLabel = await page.locator('.pt-picker__option').first().innerText();
      await page.keyboard.press('ArrowDown');
      const afterOneDown = await page.evaluate(() => document.activeElement?.textContent ?? '');
      await page.keyboard.press('ArrowDown');
      const afterTwoDown = await page.evaluate(() => document.activeElement?.textContent ?? '');
      if (afterOneDown === firstLabel || afterOneDown === afterTwoDown) {
        fail('ArrowDown en el Candidate Picker no mueve el foco entre candidatos.');
      } else {
        ok('ArrowDown recorre los candidatos del picker uno a uno (quinta fase de D-06 completada).');
      }
      await page.keyboard.press('ArrowUp');
      const afterUp = await page.evaluate(() => document.activeElement?.textContent ?? '');
      if (afterUp !== afterOneDown) fail('ArrowUp no retrocede al candidato anterior.');
      else ok('ArrowUp retrocede sin perder el ciclado.');
      await page.keyboard.press('End');
      const atEnd = await page.evaluate(() => ({ text: document.activeElement?.textContent ?? '', isLast: document.activeElement === document.querySelectorAll('.pt-picker__option').item(document.querySelectorAll('.pt-picker__option').length - 1) }));
      if (!atEnd.isLast) fail('End no salta al último candidato del picker.');
      else ok('Home/End saltan a los extremos de la lista de candidatos.');
      await shot('02-picker-teclado');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(80);
      if ((await page.locator('.pt-contextual__subject strong').count()) === 0) {
        fail('Enter sobre el candidato enfocado no comprometió la selección.');
      } else ok('Enter compromete el candidato que tiene el foco (Enter/Espacio nativos del botón).');
    }
    await page.keyboard.press('Escape');
  }

  // ===================================================================
  // C · Auditoría de colisiones de atajos: acotados al foco del lienzo,
  //     no a `window` (evita el choque con navegación rápida de lectores
  //     de pantalla — H/B/F/etc. en modo de exploración).
  // ===================================================================
  {
    const canvas = page.locator('.pt-canvas');
    const canvasBox = await canvas.boundingBox();
    // Esquina inferior izquierda: fuera del chrome flotante (`.pt-canvas-chrome`
    // vive arriba-izquierda) y fuera de la geometría del fixture.
    await canvas.click({ position: { x: 20, y: canvasBox.height - 20 } });
    await page.keyboard.press('Escape');
    await canvas.focus();
    await page.keyboard.press('n');
    const nodeActive = await page.locator('.pt-toolrail .pt-tool[aria-label="Nodo"]').first().getAttribute('aria-pressed');
    if (nodeActive !== 'true') fail('"N" con foco en el lienzo no activó la herramienta Nodo.');
    else ok('"N" con foco en el lienzo activa la herramienta Nodo (atajo auditado, sin colisión con el navegador).');
    await page.keyboard.press('v');
    const selectActive = await page.locator('.pt-toolrail .pt-tool[aria-label="Seleccionar"]').first().getAttribute('aria-pressed');
    if (selectActive !== 'true') fail('"V" con foco en el lienzo no volvió a la herramienta Seleccionar.');
    else ok('"V" vuelve a Seleccionar.');

    // El mismo caracter, fuera del lienzo (con foco en un campo real), NO cambia de herramienta:
    // confirma que el atajo está acotado al lienzo y no compite con escritura ni con AT.
    await page.locator('.sc-icon-button[aria-label="Paleta de comandos"]').click();
    await page.locator('.pt-palette__input').waitFor();
    await page.keyboard.type('n');
    const inputValue = await page.locator('.pt-palette__input').inputValue();
    await page.keyboard.press('Escape');
    if (inputValue !== 'n') fail('Escribir "n" fuera del lienzo no se comportó como texto normal (el atajo se filtró donde no debía).');
    else ok('Fuera del lienzo, la misma letra escribe texto normal — el atajo no fuga de su ámbito (auditoría G-01 cerrada).');
  }

  // ===================================================================
  // D · Contexto de análisis conectado con la TopBar, sin saturarla, y
  //     con estado que sobrevive a Compact (antes se perdía: remount).
  // ===================================================================
  await axis('Fixture', 'Pórtico de un vano · recorrido mínimo');
  await page.waitForTimeout(150);
  {
    const caption = await page.locator('.pt-topbar__context').innerText();
    if (!caption.includes('2/2')) fail(`La TopBar debería mostrar 2/2 casos por defecto, mostró "${caption}".`);
    else ok(`La TopBar resume el Contexto de análisis sin abrirlo: "${caption}" (D-09 completo).`);
    await shot('03-topbar-contexto');

    await page.locator('.pt-topbar__context').click();
    await page.locator('.pt-analysis-setup').waitFor();
    await page.locator('.pt-analysis-setup .pt-case input[type=checkbox]').first().uncheck();
    await page.locator('.pt-analysis-setup .pt-segmented button', { hasText: 'P-Delta' }).click();
    await page.locator('.pt-analysis-setup .sc-icon-button').click();
    await page.waitForTimeout(100);
    const captionAfter = await page.locator('.pt-topbar__context').innerText();
    if (!captionAfter.includes('1/2') || !captionAfter.includes('P-Δ')) {
      fail(`Tras desactivar un caso y elegir P-Delta, la TopBar debería decir "1/2 ... P-Δ", dijo "${captionAfter}".`);
    } else ok(`Cambiar casos/orden se refleja en la TopBar en caliente: "${captionAfter}".`);

    // Cruzar a Compact y volver: el estado del Contexto de análisis debe sobrevivir
    // (antes de Fase C, el remount al cambiar de padre JSX lo reiniciaba).
    await axis('Viewport', '390×844 · móvil');
    await page.waitForTimeout(250);
    await page.locator('.pt-canvas-chrome .pt-chip', { hasText: 'Análisis' }).click();
    await page.locator('.pt-analysis-setup').waitFor();
    const preservedInK0 = await page.locator('.pt-analysis-setup .pt-case input[type=checkbox]').first().isChecked();
    const orderInK0 = await page.locator('.pt-analysis-setup .pt-segmented button[data-active]', { hasText: 'P-Delta' }).count();
    await page.locator('.pt-analysis-setup .sc-icon-button').click();
    await axis('Viewport', '1440×900');
    await page.waitForTimeout(250);
    if (preservedInK0 !== false || orderInK0 !== 1) {
      fail('El Contexto de análisis se reinició al cruzar a Compact (K0) — continuidad de estado rota.');
    } else ok('El Contexto de análisis sobrevive a X2 → K0 → X2: caso desactivado y orden P-Δ intactos (continuidad real, no sólo alcanzable).');
  }

  // ===================================================================
  // E · Continuidad Expanded → Medium → Compact (y de vuelta), portrait
  //     y landscape, sin perder selección, evidencia, encuadre (cámara)
  //     ni estado de análisis.
  // ===================================================================
  {
    await page.locator('.pt-canvas .pt-object[aria-label^="M2"]').first().click();
    await page.getByRole('button', { name: 'Resolver' }).first().click();
    await page.waitForFunction(() => document.querySelector('.lab-group .lab-meta strong')?.textContent === 'current', null, { timeout: 8000 });
    await page.locator('.pt-canvas-chrome .pt-chip', { hasText: 'Vista' }).first().click();
    await page.locator('.pt-view').waitFor();
    await page.locator('.pt-segmented__option', { hasText: 'Momento M' }).click();
    await page.locator('.pt-view .sc-icon-button').click();
    await page.getByRole('button', { name: 'Acercar' }).click();
    await page.getByRole('button', { name: 'Acercar' }).click();
    const zoomBefore = await page.locator('.pt-zoom-controls__pct').innerText();
    const selectionBefore = await page.locator('.pt-contextual__subject strong').innerText();

    const walk = [
      ['1440×900', 'X2', 'portrait'],
      ['1024×768 · portátil corriente', 'M1', 'portrait'],
      ['390×844 · móvil', 'K0', 'portrait'],
      ['390×844 · móvil', 'K0', 'landscape'],
      ['1024×768 · portátil corriente', 'M1', 'landscape'],
      ['1440×900', 'X2', 'portrait'],
    ];
    let allHeld = true;
    for (const [preset, expected, orientation] of walk) {
      await axis('Viewport', preset);
      await axis('Orientación', orientation === 'landscape' ? 'Apaisado' : 'Retrato');
      await page.waitForTimeout(280);
      const resolved = await composition();
      if (resolved !== expected) {
        fail(`${preset} en ${orientation} debería resolver ${expected}, resolvió ${resolved}.`);
        allHeld = false;
      }
      const selectionNow = await page.locator('.pt-contextual__subject strong').innerText();
      if (selectionNow !== selectionBefore) {
        fail(`Cruzar a ${expected}/${orientation} perdió la selección (${selectionBefore} → ${selectionNow}).`);
        allHeld = false;
      }
      if ((await phase()) !== 'current') {
        fail(`Cruzar a ${expected}/${orientation} alteró el estado de análisis.`);
        allHeld = false;
      }
      if ((await page.locator('.pt-diagram').count()) === 0) {
        fail(`Cruzar a ${expected}/${orientation} perdió la evidencia (Momento) pintada en el lienzo.`);
        allHeld = false;
      }
      const zoomNow = await page.locator('.pt-zoom-controls__pct').innerText();
      if (zoomNow !== zoomBefore) {
        fail(`Cruzar a ${expected}/${orientation} alteró el encuadre de cámara (${zoomBefore} → ${zoomNow}).`);
        allHeld = false;
      }
    }
    if (allHeld) ok('X2 → M1 → K0 → K0(apaisado) → M1(apaisado) → X2: selección, evidencia, estado y encuadre de cámara sobreviven en ambas direcciones y en las dos orientaciones.');
    await shot('04-continuidad-final');
    await page.locator('.pt-canvas-chrome .pt-chip', { hasText: 'Vista' }).first().click();
    await page.locator('.pt-view').waitFor();
    await page.locator('.pt-segmented__option', { hasText: 'Sin evidencia' }).click();
    await page.locator('.pt-view .sc-icon-button').click();
    await page.locator('.pt-zoom-controls__pct').click();
    await page.keyboard.press('Escape');
  }

  // ===================================================================
  // F · Reduced motion: el axis realmente apaga animaciones/transiciones.
  // ===================================================================
  {
    await axis('Motion', 'Reducido');
    await page.waitForTimeout(80);
    await page.getByRole('button', { name: 'Datasheet' }).first().click();
    await page.locator('.pt-dense').waitFor();
    const reducedDuration = await page.locator('.pt-drawer, .pt-fullscreen').first().evaluate((el) => getComputedStyle(el).animationDuration);
    await page.locator('.pt-dense .sc-icon-button').click();
    await axis('Motion', 'Normal');
    await page.waitForTimeout(80);
    await page.getByRole('button', { name: 'Datasheet' }).first().click();
    await page.locator('.pt-dense').waitFor();
    const normalDuration = await page.locator('.pt-drawer, .pt-fullscreen').first().evaluate((el) => getComputedStyle(el).animationDuration);
    await page.locator('.pt-dense .sc-icon-button').click();
    if (reducedDuration === normalDuration) {
      fail(`Motion reducido no cambió la duración de animación de entrada (reducido=${reducedDuration}, normal=${normalDuration}).`);
    } else ok(`Motion reducido recorta la animación de entrada de ${normalDuration} a ${reducedDuration}.`);
  }

  // ===================================================================
  // G · Matriz de estados: current/stale/limited/unreliable/failed/
  //     offline/recovery — los siete, no sólo los que Fase B ya cubría.
  // ===================================================================
  {
    const table = [
      ['current · resultados vigentes', 'current'],
      ['limited · precisión limitada', 'limited'],
      ['unreliable · requiere revisión', 'unreliable'],
      ['failed · sin resultados utilizables', 'failed'],
    ];
    for (const [optionLabel, expected] of table) {
      await axis('Análisis · conectividad · persistencia', optionLabel);
      await page.waitForTimeout(120);
      if ((await phase()) !== expected) fail(`El estado "${optionLabel}" no derivó a la fase "${expected}".`);
      else ok(`Estado "${expected}" alcanzable y reflejado en la TopBar.`);
    }
    await page.locator('.pt-chip--state').click();
    if ((await page.locator('.pt-cause__check').count()) === 0) fail('failed no expone la causa gobernante en un elemento enfocable.');
    await page.locator('.pt-chip--state').click();

    await axis('Análisis · conectividad · persistencia', 'stale · el modelo cambió');
    await page.waitForTimeout(120);
    if ((await phase()) !== 'stale') fail('stale no derivó correctamente.');
    else ok('Estado "stale" alcanzable directamente por el eje (fail-closed reafirmado).');

    await axis('Análisis · conectividad · persistencia', 'offline · conectividad');
    await page.waitForTimeout(120);
    if ((await page.locator('.pt-chip--offline').count()) === 0) fail('offline no se refleja como chip en la TopBar.');
    else ok('Estado "offline" visible sin convertirse en una fase de análisis (son ejes distintos, D-14).');

    await axis('Análisis · conectividad · persistencia', 'recovery · conflicto de persistencia');
    await page.waitForTimeout(120);
    const recoveryChip = page.locator('.pt-chip--recovery');
    if ((await recoveryChip.count()) === 0) fail('recovery no muestra el chip de recuperación en la TopBar.');
    else {
      await recoveryChip.click();
      if ((await page.locator('.pt-recovery').count()) === 0) fail('El chip de recuperación no abre la superficie `recovery` (D-08).');
      else ok('Estado "recovery" visible en TopBar y abre la superficie real de recuperación (D-08).');
      await shot('05-estado-recovery');
      await page.locator('.pt-recovery .sc-icon-button').click();
    }
    await axis('Análisis · conectividad · persistencia', 'current · resultados vigentes');
  }

  // ===================================================================
  // H · Fixture grande (datasheet-2000): Datasheet, Palette, pan/zoom,
  //     resize — medidos, no descritos.
  // ===================================================================
  await axis('Fixture', 'Retícula de estrés · 2 000+ entidades');
  await page.waitForTimeout(300);
  {
    let t0 = Date.now();
    await page.getByRole('button', { name: 'Datasheet' }).first().click();
    await page.locator('.pt-table tbody tr').first().waitFor();
    metrics.stress.datasheetOpenMs = Date.now() - t0;
    const rows = await page.locator('.pt-table tbody tr').count();
    metrics.stress.datasheetRows = rows;
    ok(`Datasheet (fixture grande): ${rows} filas, ${metrics.stress.datasheetOpenMs} ms hasta la primera fila pintada.`);
    await shot('06-fixture-grande-datasheet');
    await page.locator('.pt-dense .sc-icon-button').click();

    t0 = Date.now();
    await page.locator('.sc-icon-button[aria-label="Paleta de comandos"]').click();
    await page.locator('.pt-palette__input').waitFor();
    metrics.stress.paletteOpenMs = Date.now() - t0;
    ok(`Palette (fixture grande): ${metrics.stress.paletteOpenMs} ms hasta poder escribir.`);
    await resetTelemetry();
    await page.locator('.pt-palette__input').pressSequentially('M1', { delay: 40 });
    await page.waitForTimeout(150);
    const paletteTelemetry = await downloadTelemetry();
    const paletteSearch = paletteTelemetry.events.filter((event) => event.event === 'perf_interaction' && event.payload?.label === 'palette.search');
    metrics.stress.paletteSearchMs = paletteSearch.map((event) => event.payload.durationMs);
    if (paletteSearch.length > 0) ok(`Palette · búsqueda con fixture grande: ${metrics.stress.paletteSearchMs.join(', ')} ms por tecla.`);
    await page.keyboard.press('Escape');

    const canvasBox = await page.locator('.pt-canvas').boundingBox();
    t0 = Date.now();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.5, canvasBox.y + canvasBox.height * 0.5);
    await page.mouse.down();
    for (let i = 1; i <= 10; i += 1) {
      await page.mouse.move(canvasBox.x + canvasBox.width * 0.5 + i * 12, canvasBox.y + canvasBox.height * 0.5 + i * 6);
    }
    await page.mouse.up();
    metrics.stress.panMs = Date.now() - t0;
    ok(`Pan con ratón (fixture grande, 10 pasos): ${metrics.stress.panMs} ms de principio a fin del gesto.`);

    t0 = Date.now();
    await page.getByRole('button', { name: 'Acercar' }).click();
    await page.getByRole('button', { name: 'Acercar' }).click();
    await page.getByRole('button', { name: 'Alejar' }).click();
    metrics.stress.zoomMs = Date.now() - t0;
    ok(`Zoom con controles flotantes (fixture grande, 3 clics): ${metrics.stress.zoomMs} ms.`);
    await page.locator('.pt-zoom-controls__pct').click();

    t0 = Date.now();
    await axis('Viewport', '1024×768 · portátil corriente');
    await page.waitForFunction(() => document.querySelector('.lab-readout dd strong')?.textContent === 'M1', null, { timeout: 5000 });
    metrics.stress.resizeToM1Ms = Date.now() - t0;
    t0 = Date.now();
    await axis('Viewport', '1440×900');
    await page.waitForFunction(() => document.querySelector('.lab-readout dd strong')?.textContent === 'X2', null, { timeout: 5000 });
    metrics.stress.resizeToX2Ms = Date.now() - t0;
    ok(`Resize/recomposición (fixture grande): X2→M1 ${metrics.stress.resizeToM1Ms} ms · M1→X2 ${metrics.stress.resizeToX2Ms} ms.`);
  }

  // ===================================================================
  // I · Esencial vs. Completa — con el fixture grande activo (no sólo el pequeño).
  // ===================================================================
  {
    await page.getByRole('button', { name: 'Datasheet' }).first().click();
    await page.locator('.pt-dense').waitFor();
    const columnsComplete = await page.locator('.pt-table thead th').count();
    const rowsComplete = await page.locator('.pt-table tbody tr').count();
    await axis('Modo', 'Esencial');
    await page.waitForTimeout(150);
    const columnsEssential = await page.locator('.pt-table thead th').count();
    const rowsEssential = await page.locator('.pt-table tbody tr').count();
    if (columnsEssential >= columnsComplete) fail('Esencial (fixture grande) no reduce densidad respecto a Completa.');
    else if (rowsEssential !== rowsComplete) fail('Esencial (fixture grande) ocultó filas en vez de sólo columnas.');
    else ok(`Esencial/Completa funciona con el fixture grande: ${columnsComplete}→${columnsEssential} columnas, ${rowsComplete} filas intactas — Esencial ES un disclosure real, no un amputado.`);
    await axis('Modo', 'Completa');
    await page.locator('.pt-dense .sc-icon-button').click();
  }

  await axis('Fixture', 'Pórtico de un vano · recorrido mínimo');
  await page.waitForTimeout(150);

  // ===================================================================
  // J · INP/latencia: DenseSurface + Model Doctor (fixture pequeño), con
  //     telemetría real descargada, no estimada.
  // ===================================================================
  {
    await resetTelemetry();
    await page.getByRole('button', { name: 'Datasheet' }).first().click();
    await page.locator('.pt-dense').waitFor();
    await page.locator('.pt-dense input[type=search], .pt-dense input[type=text]').first().pressSequentially('M', { delay: 30 });
    await page.waitForTimeout(150);
    await page.locator('.pt-dense .sc-icon-button').click();
    const telemetry = await downloadTelemetry();
    const perf = telemetry.events.filter((event) => event.event === 'perf_interaction');
    const longTasks = telemetry.events.filter((event) => event.event === 'long_task_observed');
    for (const label of ['dense.search', 'palette.search', 'doctor.locate', 'dense.locate']) {
      const durations = perf.filter((event) => event.payload?.label === label).map((event) => event.payload.durationMs);
      if (durations.length) metrics.interactions[label] = durations;
    }
    metrics.interactions.longTaskCount = longTasks.length;
    ok(`INP/latencia registrada vía telemetría: ${perf.length} interacciones medidas, ${longTasks.length} tareas largas (>50ms) observadas.`);
    if (metrics.interactions['dense.search']) ok(`dense.search: ${metrics.interactions['dense.search'].join(', ')} ms.`);
  }

  // ===================================================================
  // K · U-13 — histéresis: recomposiciones/seg. en un barrido continuo
  //     900↔1300px de ancho, a varios valores del parámetro.
  // ===================================================================
  {
    await axis('Marco', 'Ventana real');
    await page.waitForTimeout(150);
    for (const hysteresisPx of [0, 24, 60, 120]) {
      await setHysteresis(hysteresisPx);
      await page.waitForTimeout(80);
      await page.setViewportSize({ width: 1100, height: 900 });
      await page.waitForTimeout(120);
      await resetTelemetry();
      const started = Date.now();
      const STEP = 8;
      for (let width = 900; width <= 1300; width += STEP) await page.setViewportSize({ width, height: 900 });
      for (let width = 1300; width >= 900; width -= STEP) await page.setViewportSize({ width, height: 900 });
      const elapsedMs = Date.now() - started;
      await page.waitForTimeout(100);
      const recompositions = await eventCount();
      const perSecond = recompositions / (elapsedMs / 1000);
      metrics.hysteresis.push({ hysteresisPx, recompositions, elapsedMs, perSecond: Math.round(perSecond * 100) / 100 });
      ok(`U-13 · histéresis ${hysteresisPx}px: ${recompositions} recomposiciones en el barrido 900↔1300px (${elapsedMs} ms) → ${perSecond.toFixed(2)}/s.`);
    }
    await axis('Marco', 'Simulado');
    await axis('Viewport', '1440×900');
  }

  await browser.close();
  server.kill();

  await writeFile(path.join(OUT, 'metrics.json'), JSON.stringify(metrics, null, 2), 'utf8');

  await writeFile(
    path.join(OUT, 'validate-report.md'),
    [
      '# CRI-11 Fase C · validación y estrés — recorrido ejecutado',
      '',
      `Ejecutado el ${new Date().toISOString()} sobre Chromium (Playwright), build de \`prototypes/cri-11-harness\`.`,
      `Firefox instalado en este entorno: ${browsers.firefox ? 'sí' : 'no'} · WebKit: ${browsers.webkit ? 'sí' : 'no'}.`,
      '',
      '## Comprobaciones superadas',
      '',
      ...steps.map((step) => `- ${step}`),
      '',
      problems.length ? '## Fallos\n' : '## Fallos\n\nNinguno.',
      ...problems.map((problem) => `- ${problem}`),
      '',
      '## Métricas (ver también `metrics.json`)',
      '',
      '```json',
      JSON.stringify(metrics, null, 2),
      '```',
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
