import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectGlobalCss, MAX_GLOBAL_CSS_BYTES } from './check-global-css.mjs';

test('acepta únicamente contratos globales dentro del presupuesto', () => {
  assert.deepEqual(inspectGlobalCss(':root { color-scheme: light; }\n.sr-only { position:absolute; }'), []);
});

test('rechaza hojas globales sobredimensionadas', () => {
  assert.match(inspectGlobalCss('x'.repeat(MAX_GLOBAL_CSS_BYTES + 1))[0], /pesa/);
});

test('rechaza selectores propietarios conocidos', () => {
  for (const selector of ['.welcome-screen', '.topbar', '.workspace', '.canvas-host', '.structural-canvas', '.inspector-panel', '.results-panel', '.result-card']) {
    assert.match(inspectGlobalCss(`${selector} { display:block; }`).join('\n'), /selector de feature/);
  }
});
