/**
 * Contrato de la decisión del oráculo de tipos.
 *
 * `classifyCandidates` es la única parte del script que concluye algo, y su
 * riesgo es asimétrico igual que el del detector: llamar muerta a una clave viva
 * la borra de producción. Por eso lo que se fija aquí no es sólo qué reparte,
 * sino **cuándo se niega a repartir**.
 *
 * Estas pruebas no compilan nada: describen el resultado de la compilación y
 * comprueban el veredicto, que es justo la parte que un final anormal del
 * compilador puede falsear.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyCandidates } from './audit-i18n-with-types.mjs';

const CANDIDATES = ['bulk.summary.membersOne', 'bulk.scope.nodeOne', 'generator.section.geometry'];

/** Un diagnóstico de `tsc` nombra el literal entre comillas dobles. */
const diagnosticFor = (...shortKeys) => shortKeys
  .map((key) => `src/x.tsx(1,1): error TS2345: Argument of type '"${key}"' is not assignable.`)
  .join('\n');

test('una compilación limpia demuestra que ninguna candidata tiene consumidor', () => {
  const verdict = classifyCandidates(CANDIDATES, { complete: true, clean: true, output: '' });
  assert.deepEqual(verdict.alive, []);
  assert.deepEqual(verdict.dead, CANDIDATES);
});

test('reparte según a quién reclama el compilador', () => {
  const output = diagnosticFor('summary.membersOne', 'scope.nodeOne');
  const verdict = classifyCandidates(CANDIDATES, { complete: true, clean: false, output });
  assert.deepEqual(verdict.alive, ['bulk.summary.membersOne', 'bulk.scope.nodeOne']);
  assert.deepEqual(verdict.dead, ['generator.section.geometry']);
});

test('no concluye si el compilador falla sin nombrar ninguna candidata', () => {
  const output = "src/otro.ts(9,3): error TS2322: Type 'string' is not assignable to type 'number'.";
  const verdict = classifyCandidates(CANDIDATES, { complete: true, clean: false, output });
  assert.ok(verdict.inconclusive);
  assert.equal(verdict.dead, undefined);
});

test('no concluye si la salida se truncó, aunque ya haya reconocido alguna', () => {
  // El caso que motiva esta regla: `tsc` alcanzó a nombrar una candidata y el
  // buffer se llenó. Las que faltan no están decididas, están cortadas — y sin
  // esta guarda se reportarían como muertas.
  const verdict = classifyCandidates(CANDIDATES, {
    complete: false, clean: false, truncated: true, signal: null, exitCode: 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER',
    output: diagnosticFor('summary.membersOne'),
  });
  assert.match(verdict.inconclusive, /truncó/);
  assert.equal(verdict.dead, undefined);
});

test('no concluye si al compilador lo mató una señal a media lista', () => {
  const verdict = classifyCandidates(CANDIDATES, {
    complete: false, clean: false, truncated: false, signal: 'SIGKILL', exitCode: null,
    output: diagnosticFor('summary.membersOne'),
  });
  assert.match(verdict.inconclusive, /SIGKILL/);
  assert.equal(verdict.dead, undefined);
});

test('no concluye ante un código de salida fuera del conjunto conocido', () => {
  // 0, 1 y 2 son terminaciones completas de `tsc`; 3 y 4 son problemas de
  // configuración que no dicen nada sobre las claves.
  const verdict = classifyCandidates(CANDIDATES, {
    complete: false, clean: false, truncated: false, signal: null, exitCode: 4,
    output: 'error TS5083: Cannot read file tsconfig.json.',
  });
  assert.match(verdict.inconclusive, /código 4/);
  assert.equal(verdict.dead, undefined);
});

test('reconoce la clave tanto por su forma corta como por la completa', () => {
  const corta = classifyCandidates(['bulk.scope.nodeOne'], { complete: true, clean: false, output: diagnosticFor('scope.nodeOne') });
  assert.deepEqual(corta.alive, ['bulk.scope.nodeOne']);
  const completa = classifyCandidates(['bulk.scope.nodeOne'], {
    complete: true, clean: false, output: 'error: Argument of type \'"bulk.scope.nodeOne"\' is not assignable.',
  });
  assert.deepEqual(completa.alive, ['bulk.scope.nodeOne']);
});
