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
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';
import { busyLockMessage, classifyCandidates, LOCK, swapCatalogForAudit, withLock } from './audit-i18n-with-types.mjs';

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

test('no confunde una clave parecida con la que reclama el compilador', () => {
  const verdict = classifyCandidates(['bulk.scope.nodeOne'], {
    complete: true,
    clean: false,
    output: diagnosticFor('scope.nodeOneExtra'),
  });
  assert.ok(verdict.inconclusive);
  assert.equal(verdict.dead, undefined);
});

test('el lock se suelta cuando la corrida acaba sin candidatas que someter', (t) => {
  // La salida temprana que motiva esta regla: el catálogo no tiene ninguna
  // clave que dependa de una regla floja, así que no hay nada que compilar.
  // Es una corrida que termina BIEN, y aun así dejaba el lock en disco: la
  // siguiente lo tomaba por huérfano de una corrida muerta y se negaba a
  // arrancar pidiendo un reintento que no hacía falta.
  if (existsSync(LOCK)) return t.skip('hay una auditoría real en curso');
  t.after(() => rmSync(LOCK, { force: true }));
  writeFileSync(LOCK, String(process.pid), { flag: 'wx' });
  return withLock(() => undefined).then(() => {
    assert.equal(existsSync(LOCK), false);
  });
});

test('el lock se suelta también si la corrida lanza', async (t) => {
  if (existsSync(LOCK)) return t.skip('hay una auditoría real en curso');
  t.after(() => rmSync(LOCK, { force: true }));
  writeFileSync(LOCK, String(process.pid), { flag: 'wx' });
  await assert.rejects(withLock(() => { throw new Error('tsc no arrancó'); }), /tsc no arrancó/);
  assert.equal(existsSync(LOCK), false);
});

test('la mutación del catálogo llega al disco antes de retornar', () => {
  // Lo que se fija aquí es que no queda ninguna escritura en vuelo. Un
  // manejador de SIGINT corre entre ticks: si la mutación fuese asíncrona,
  // podría restaurar la copia y salir mientras la escritura original sigue
  // pendiente, y ésta aterrizaría DESPUÉS, dejando en disco justo el catálogo
  // mutilado del que la copia protege. Por eso se comprueba en el mismo tick.
  const dir = mkdtempSync(path.join(tmpdir(), 'audit-i18n-'));
  const file = path.join(dir, 'catalogs.ts');
  const backup = path.join(dir, '.catalogs.audit-backup');
  writeFileSync(file, 'original', 'utf8');

  swapCatalogForAudit(file, backup, 'mutado');

  assert.equal(readFileSync(file, 'utf8'), 'mutado');
  assert.equal(readFileSync(backup, 'utf8'), 'original');
  rmSync(dir, { recursive: true, force: true });
});

test('el aviso de lock ocupado no afirma lo que el PID no demuestra', () => {
  // Un PID vivo no prueba que sea el nuestro: el sistema puede haberlo
  // reutilizado tras una muerte sin limpieza, y entonces la reparación —que
  // sólo actúa sobre un lock huérfano— nunca llega. El aviso tiene que decir
  // cómo salir de ahí, no dejar a quien lo lee esperando a nadie.
  const mensaje = busyLockMessage(4578, false);
  assert.match(mensaje, /PID 4578/);
  assert.match(mensaje, /no demuestra/);
  assert.match(mensaje, /\.catalogs\.audit-lock/);
});

test('el aviso nombra la copia cuando el catálogo está intercambiado', () => {
  const mensaje = busyLockMessage(4578, true);
  assert.match(mensaje, /intercambiado/);
  assert.match(mensaje, /\.catalogs\.audit-backup/);
});
