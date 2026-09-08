import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveMinTestsForFiles } from './test-focused.mjs';

test('resolveMinTestsForFiles: árbol limpio', () => {
  const result = resolveMinTestsForFiles([]);
  assert.equal(result.type, 'clean');
  assert.deepEqual(result.targets, []);
});

test('resolveMinTestsForFiles: solo documentación', () => {
  const result = resolveMinTestsForFiles([
    'docs/product/overview.md',
    'reports/2026-09-07-report.md',
    'README.md',
  ]);
  assert.equal(result.type, 'docs');
  assert.deepEqual(result.targets, []);
});

test('resolveMinTestsForFiles: solo estilos CSS', () => {
  const result = resolveMinTestsForFiles([
    'src/styles.css',
    'src/features/results/results.css',
  ]);
  assert.equal(result.type, 'styles');
  assert.deepEqual(result.targets, []);
});

test('resolveMinTestsForFiles: solo configuración', () => {
  const result = resolveMinTestsForFiles([
    'package.json',
    'tsconfig.app.json',
    '.oxlintrc.json',
    '.github/workflows/ci.yml',
  ]);
  assert.equal(result.type, 'config');
  assert.deepEqual(result.targets, []);
});

test('resolveMinTestsForFiles: archivo de test directo', () => {
  const result = resolveMinTestsForFiles(['src/features/canvas/useCanvasCamera.test.ts']);
  assert.equal(result.type, 'tests');
  assert.deepEqual(result.targets, ['src/features/canvas/useCanvasCamera.test.ts']);
});

test('resolveMinTestsForFiles: archivo con test adyacente', () => {
  const result = resolveMinTestsForFiles(['src/features/canvas/useCanvasCamera.ts']);
  assert.equal(result.type, 'tests');
  assert.ok(result.targets.includes('src/features/canvas/useCanvasCamera.test.ts'));
});

test('resolveMinTestsForFiles: deduplica archivos de test si su directorio padre está incluido', () => {
  const result = resolveMinTestsForFiles([
    'src/features/canvas/useCanvasCamera.test.ts',
    'src/features/canvas',
  ]);
  assert.equal(result.type, 'tests');
  assert.ok(result.targets.includes('src/features/canvas'));
  assert.ok(!result.targets.includes('src/features/canvas/useCanvasCamera.test.ts'));
});
