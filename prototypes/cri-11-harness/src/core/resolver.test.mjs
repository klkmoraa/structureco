/**
 * El gate barato que CRI-9 §17 riesgo 6 pedía: una prueba que afirme QUÉ
 * composición está activa sin construir la app ni abrir un navegador.
 *
 *   node --test src/core/resolver.test.mjs
 *
 * Si este port se desviara del modelo publicado por CRI-9, esta prueba falla.
 * Los números esperados no se inventan aquí: son las cifras publicadas en el
 * informe CRI-9 §12 y §0, y las once mediciones de CRI-7 §2.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  calibrate,
  denseDockAffordable,
  expandedBoundary,
  resolveComposition,
  resolveWithHysteresis,
  safeRect,
} from './resolver.mjs';

test('reproduce las once mediciones de CRI-7 dentro de 0.5 puntos porcentuales', () => {
  const rows = calibrate();
  assert.equal(rows.length, 11);
  const worst = Math.max(...rows.map((row) => Math.abs(row.delta)));
  assert.ok(worst <= 0.5, `error máximo ${worst.toFixed(2)} pp; el modelo no debe usarse para decidir nada`);
});

/** Tabla «Lo que el modelo predice», CRI-9 §12. */
const CRI9_PREDICTIONS = [
  { width: 390, height: 844, composition: 'K0', rest: 87.4, detail: 35.0, sheetSide: 'bottom' },
  { width: 844, height: 390, composition: 'K0', rest: 83.6, detail: 51.9, sheetSide: 'side' },
  { width: 768, height: 1024, composition: 'K0', rest: 88.1, detail: 35.3, sheetSide: 'bottom' },
  { width: 900, height: 1000, composition: 'M1', rest: 83.3, detail: 53.0, sheetSide: null },
  { width: 1024, height: 768, composition: 'M1', rest: 81.7, detail: 55.9, sheetSide: null },
  { width: 1112, height: 834, composition: 'X2', rest: 76.1, detail: 50.4, sheetSide: null },
  { width: 1280, height: 800, composition: 'X2', rest: 77.4, detail: 55.2, sheetSide: null },
  { width: 1440, height: 900, composition: 'X2', rest: 79.8, detail: 59.8, sheetSide: null },
  { width: 1920, height: 1080, composition: 'X2', rest: 83.8, detail: 68.6, sheetSide: null },
];

for (const expected of CRI9_PREDICTIONS) {
  test(`${expected.width}×${expected.height} resuelve ${expected.composition} con el lienzo que CRI-9 publicó`, () => {
    const verdict = resolveComposition({ width: expected.width, height: expected.height });
    assert.equal(verdict.composition, expected.composition);
    assert.equal(+(verdict.restShare * 100).toFixed(1), expected.rest);
    assert.equal(+(verdict.detailShare * 100).toFixed(1), expected.detail);
    assert.equal(verdict.sheetSide, expected.sheetSide);
  });
}

test('la frontera Expanded↔Medium depende de la altura y nadie la escribe', () => {
  // CRI-9 §12: un umbral que depende de la altura no cabe en un @media.
  assert.equal(expandedBoundary(768), 1117);
  assert.equal(expandedBoundary(900), 1089);
  assert.equal(expandedBoundary(1080), 1065);
  assert.equal(expandedBoundary(1366), 1042);
});

test('el 1024×768 de F-01 deja de ser Expanded al 24.6% de lienzo', () => {
  const verdict = resolveComposition({ width: 1024, height: 768 });
  assert.equal(verdict.composition, 'M1');
  assert.ok(verdict.restShare > 0.7, 'CB-2 · suelo de reposo');
  assert.ok(verdict.detailShare > 0.5, 'CB-1 · suelo de coexistencia');
});

test('ninguna superficie de resultados es residente por debajo de ~1700 px', () => {
  assert.equal(denseDockAffordable({ width: 1440, height: 900 }), false);
  assert.equal(denseDockAffordable({ width: 1920, height: 1080 }), true);
});

test('T-INV-5 · la histéresis impide la cascada de recomposiciones al estrechar', () => {
  const boundary = expandedBoundary(900);
  const justBelow = { width: boundary - 8, height: 900 };
  assert.equal(resolveComposition(justBelow).composition, 'M1');
  const held = resolveWithHysteresis(justBelow, 'X2', { bandPx: 24 });
  assert.equal(held.composition, 'X2');
  assert.equal(held.heldByHysteresis, true);
  // Fuera de la banda, la composición sí cambia: la histéresis retrasa, no anula.
  const released = resolveWithHysteresis({ width: boundary - 40, height: 900 }, 'X2', { bandPx: 24 });
  assert.equal(released.composition, 'M1');
  assert.equal(released.heldByHysteresis, false);
});

test('T-INV-5 · ensanchar nunca se retiene: más sitio no rompe ninguna regla CB', () => {
  const verdict = resolveWithHysteresis({ width: 1440, height: 900 }, 'M1', { bandPx: 24 });
  assert.equal(verdict.composition, 'X2');
  assert.equal(verdict.heldByHysteresis, false);
});

test('el rectángulo seguro se reduce bajo el inset sin recomponer el lienzo (D-01)', () => {
  const viewport = { width: 1024, height: 768 };
  const verdict = resolveComposition(viewport);
  const rest = safeRect(verdict, viewport, { detailPresent: false });
  const withDetail = safeRect(verdict, viewport, { detailPresent: true });
  assert.equal(verdict.detailMode, 'overlay-inset');
  assert.equal(rest.width - withDetail.width, verdict.detailWidth);
  assert.equal(rest.height, withDetail.height, 'un inset no puede robar altura');
  assert.equal(rest.left, verdict.railWidth);
});

test('en apaisado la hoja llega por el lado, no por abajo (CB-6)', () => {
  const verdict = resolveComposition({ width: 844, height: 390 });
  assert.equal(verdict.sheetSide, 'side');
  const portrait = resolveComposition({ width: 390, height: 844 });
  assert.equal(portrait.sheetSide, 'bottom');
});

test('toda composición resuelta cumple sus reglas CB o es el repliegue declarado', () => {
  for (let width = 320; width <= 2560; width += 7) {
    for (const height of [390, 568, 768, 900, 1024, 1366]) {
      const verdict = resolveComposition({ width, height });
      if (!verdict.passes) {
        assert.equal(verdict.composition, 'K0', `${width}×${height} sólo puede caer al repliegue K0`);
      }
    }
  }
});
