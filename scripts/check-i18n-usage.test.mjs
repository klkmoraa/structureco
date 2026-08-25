/**
 * Contrato del detector de claves de traducción sin consumidor.
 *
 * El detector es una heurística textual y su único riesgo real es asimétrico:
 * ser demasiado generoso deja claves muertas en el chunk de entrada, pero ser
 * demasiado estricto **borra una etiqueta viva** y la deja en blanco en
 * producción. Estas pruebas fijan las dos direcciones con los casos reales del
 * repositorio que motivaron cada regla.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { IS_TEST, declaredKeys, dynamicPrefixes, isReferenced } from './check-i18n-usage.mjs';

const withI18n = (body) => `import { useI18n } from '../../i18n/useI18n';\n${body}`;

test('el pajar excluye archivos de prueba', () => {
  // El contrato es alcanzabilidad desde el producto: una clave que sólo cita
  // una prueba se sigue enviando a cada usuario sin que nada la muestre.
  assert.ok(IS_TEST.test('src/i18n/catalogs.test.ts'));
  assert.ok(IS_TEST.test('scripts/check-i18n-usage.test.mjs'));
  assert.ok(IS_TEST.test('src/features/canvas/canvas.spec.tsx'));
  assert.ok(!IS_TEST.test('src/features/topbar/TopBar.tsx'));
  assert.ok(!IS_TEST.test('src/data/latest.ts'));
});

test('una clave sólo cuenta si aparece completa, no como prefijo de otra', () => {
  // `includes` daba por viva toda clave que fuera prefijo de una referenciada:
  // así sobrevivían `inspector.selection` dentro de `inspector.selectionSummary`
  // y otras cinco.
  assert.ok(!isReferenced("t('inspector.selectionSummary')", 'inspector.selection'));
  assert.ok(!isReferenced("t('inspector.endConnectionsDescription')", 'inspector.end'));
  assert.ok(!isReferenced("t('datasheet.error.notANumber')", 'datasheet.error'));
  assert.ok(isReferenced("t('inspector.selection')", 'inspector.selection'));
  assert.ok(isReferenced('{t("inspector.end")}', 'inspector.end'));
  assert.ok(isReferenced('const k = `inspector.end`;', 'inspector.end'));
});

test('lee las claves del catálogo español y se detiene antes del inglés', () => {
  const source = [
    'export const es = {',
    "  'app.name': 'structureCo',",
    "  'welcome.title': 'Hola',",
    '};',
    'export const en = {',
    "  'app.name': 'structureCo',",
    "  'welcome.title': 'Hi',",
    '};',
  ].join('\n');
  assert.deepEqual(declaredKeys(source), ['app.name', 'welcome.title']);
});

test('un archivo que no traduce no dona prefijos', () => {
  // Caso real: las rutas de procedencia de `revisionComparison.ts` marcaban
  // `project.*` y `analysis.*` enteros como alcanzables sin traducir nada.
  const source = 'const path = `project.settings.${field}`;\nconst other = `analysis.${kind}`;';
  assert.deepEqual(dynamicPrefixes(source), []);
});

test('un archivo que traduce dona el prefijo de una llamada directa a t', () => {
  assert.deepEqual(dynamicPrefixes(withI18n('t(`role.${role}`)')), ['role.']);
  assert.deepEqual(dynamicPrefixes(withI18n('ctx.t(`datasheet.error.${code}` as TranslationKey)')), ['datasheet.error.']);
});

test('dona también el prefijo que sólo aparece en posición de tipo', () => {
  // Caso real: 194 claves `generator.*` se alcanzan a través de estos tipos y
  // nunca como argumento literal de `t(`. Exigir la llamada directa las
  // marcaría como muertas.
  assert.deepEqual(dynamicPrefixes(withI18n('type Key = Record<Field, `spacing.${Field}`>;')), ['spacing.']);
  assert.deepEqual(dynamicPrefixes(withI18n('type Strip<K> = K extends `generator.${infer R}` ? R : never;')), ['generator.']);
});

test('no dona el prefijo de un template que es argumento de otra llamada', () => {
  // Caso real: `throw new Error(`properties.${key} …`)` no es una clave.
  assert.deepEqual(dynamicPrefixes(withI18n('throw new Error(`properties.${key} no coincide.`);')), []);
});

test('ignora los templates sin punto, que no pueden ser un espacio de nombres', () => {
  assert.deepEqual(dynamicPrefixes(withI18n('const label = `${count} nudos`;')), []);
});
