#!/usr/bin/env node
/**
 * Oráculo de tipos para las claves que el detector textual no puede decidir.
 *
 * `check-i18n-usage.mjs` es una heurística: reconoce cuatro formas de pedir una
 * clave y no puede ser completa. Sus reglas más flojas —sobre todo la del sufijo
 * literal, que se aplica a todo el catálogo— dejan pasar claves muertas, y
 * endurecerlas a ojo es justo lo que borra etiquetas vivas.
 *
 * Este script no adivina: usa el compilador. `TranslationKey` se deriva del
 * catálogo, así que retirar una clave que alguna llamada todavía pide es un
 * error de tipos con nombre y apellido. El procedimiento es
 *
 *   1. comprobar que el árbol compila **antes** de tocar nada;
 *   2. retirar de golpe todas las candidatas de `es` y de `en`;
 *   3. ejecutar `tsc -b --noEmit` una sola vez;
 *   4. leer de los errores qué literales reclama el compilador — ésas están
 *      vivas — y dar por muertas las demás;
 *   5. restaurar el catálogo intacto, pase lo que pase.
 *
 * Los pasos 1 y 5 no son ceremonia. Sin el baseline verde, un fallo del
 * compilador por cualquier otra causa —tsconfig roto, dependencia ausente, el
 * proceso muerto por memoria— no nombra ninguna clave, y leer esa ausencia como
 * «ninguna tiene consumidor» recomendaría borrar el catálogo entero. Por eso un
 * fallo que no nombre ninguna candidata se reporta **sin concluir**, nunca como
 * prueba — y lo mismo cualquier final anormal del compilador (una señal, la
 * salida truncada), porque un diagnóstico cortado a media lista no dice nada
 * sobre las claves que no llegó a nombrar. Y la restauración se apoya en una
 * copia en disco más un lock con el PID de su dueño, no en un `finally`: ante
 * Ctrl+C el proceso termina sin ejecutarlo, y dos auditorías simultáneas no
 * pueden pisarse la copia la una a la otra.
 *
 * Es lento (una compilación completa) y por eso no entra en `npm run verify`.
 * Se ejecuta a mano cuando el detector reporte cero huérfanas y aun así se
 * sospeche que una regla floja está tapando algo.
 *
 * Uso: node scripts/audit-i18n-with-types.mjs
 */
import { execFile } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { declaredKeys, dynamicPrefixes, isReachable, IS_TEST } from './check-i18n-usage.mjs';
import { readdir } from 'node:fs/promises';

const run = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, '..');
const CATALOGS = path.join(ROOT, 'src', 'i18n', 'catalogs.ts');
const SELF_DETECTOR = path.join('scripts', 'check-i18n-usage.mjs');

/**
 * Copia de seguridad en disco, no sólo en memoria.
 *
 * Este script retira claves del catálogo real para preguntarle al compilador, y
 * la compilación dura lo bastante como para que cancelarla con Ctrl+C sea
 * normal. Un `finally` no cubre eso: ante SIGINT el proceso termina sin
 * ejecutarlo, y el catálogo se quedaría mutilado — con la trampa añadida de que
 * un borrado así parece trabajo intencionado. La copia vive en disco durante
 * toda la ventana peligrosa, se restaura también en las señales, y si el
 * proceso muere de forma que no admite handler (SIGKILL, corte de luz), la
 * siguiente ejecución la encuentra y restaura antes de hacer nada.
 */
const BACKUP = path.join(ROOT, 'src', 'i18n', '.catalogs.audit-backup');

/**
 * El lock lleva el PID de quien lo tomó, no sólo su existencia.
 *
 * Sin esa marca, una segunda auditoría lanzada mientras la primera compila
 * confundiría su copia viva con la de una corrida muerta: restauraría el
 * catálogo bajo los pies del primer compilador —que entonces vería el catálogo
 * completo, no encontraría ningún error y concluiría que TODAS las candidatas
 * están muertas— y le borraría además su copia de recuperación.
 */
const LOCK = path.join(ROOT, 'src', 'i18n', '.catalogs.audit-lock');

const processAlive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
};

/** `wx` falla si el archivo existe: la toma del lock es atómica. */
const acquireLock = () => {
  try {
    writeFileSync(LOCK, String(process.pid), { flag: 'wx' });
    return { ok: true };
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const owner = Number.parseInt(readFileSync(LOCK, 'utf8').trim(), 10);
    if (Number.isInteger(owner) && processAlive(owner)) return { ok: false, owner };
    return { ok: false, owner: null };
  }
};

const releaseLock = () => rmSync(LOCK, { force: true });

const restoreFromBackup = () => {
  if (!existsSync(BACKUP)) return false;
  copyFileSync(BACKUP, CATALOGS);
  rmSync(BACKUP, { force: true });
  return true;
};

const collect = async (relative) => {
  const entries = await readdir(path.join(ROOT, relative), { withFileTypes: true }).catch(() => null);
  if (!entries) return /\.(ts|tsx|mjs|js)$/.test(relative) ? [relative] : [];
  return (await Promise.all(entries.map((entry) => collect(path.join(relative, entry.name))))).flat();
};

/**
 * Las candidatas: las que sólo sobreviven porque alguna regla floja las alcanza.
 * Una clave que aparece literalmente, o que cae bajo un prefijo terminal, no
 * necesita al compilador para nada.
 */
const looseCandidates = (keys, haystack, prefixes) => {
  const strict = { ...prefixes, suffixes: [] };
  return keys.filter((key) => isReachable(haystack, key, prefixes) && !isReachable(haystack, key, strict));
};

const withoutKeys = (source, doomed) => source
  .split('\n')
  .filter((line) => {
    const match = line.match(/^ {2}'([^']+)':/);
    return !(match && doomed.has(match[1]));
  })
  .join('\n');

/**
 * Ejecuta el compilador y describe **cómo terminó**, no sólo qué imprimió.
 *
 * `tsc` sale 0 si compila, y 1 o 2 si encuentra errores de tipos —2 es el que
 * usa el modo `-b` que corre aquí—: las tres son terminaciones completas.
 * Cualquier otra cosa —una señal, un código fuera de ese conjunto, la salida
 * truncada por `maxBuffer`— significa que el diagnóstico puede estar
 * incompleto, y un diagnóstico incompleto no prueba nada sobre las claves que
 * no aparecen en él.
 */
const typecheck = async () => {
  try {
    await run(
      process.execPath,
      [path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc'), '-b', '--noEmit'],
      { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 },
    );
    return { complete: true, clean: true, output: '' };
  } catch (error) {
    const output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    const truncated = error.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER';
    const complete = !truncated && !error.signal && (error.code === 1 || error.code === 2);
    return { complete, clean: false, output, truncated, signal: error.signal ?? null, exitCode: error.code };
  }
};

/**
 * Reparte las candidatas entre vivas y muertas, o se declara sin concluir.
 *
 * Está aislada de la ejecución a propósito: es la única parte del script que
 * decide algo, y `audit-i18n-with-types.test.mjs` la ejercita sin compilar.
 */
export const classifyCandidates = (candidates, result) => {
  const mentions = (key) => result.output.includes(`"${key.slice(key.indexOf('.') + 1)}"`)
    || result.output.includes(`"${key}"`);
  const alive = candidates.filter(mentions);

  // Una compilación limpia demuestra que ninguna candidata tiene consumidor.
  if (result.clean) return { alive: [], dead: [...candidates] };

  // Un final anormal puede haber cortado el diagnóstico a media lista, así que
  // la ausencia de una clave en la salida no dice nada. Da igual que ya se
  // hayan reconocido algunas: las que faltan siguen sin estar decididas.
  if (!result.complete) {
    const cause = result.truncated ? 'la salida del compilador se truncó'
      : result.signal ? `el compilador terminó por la señal ${result.signal}`
        : `el compilador salió con código ${result.exitCode}`;
    return { inconclusive: `${cause}; el diagnóstico puede estar incompleto` };
  }

  // Terminación completa con errores, pero ninguno nombra una candidata:
  // entonces el fallo es otro y tampoco prueba nada.
  if (!alive.length) return { inconclusive: 'el compilador falló sin nombrar ninguna candidata' };

  return { alive, dead: candidates.filter((key) => !alive.includes(key)) };
};

const main = async () => {
  const lock = acquireLock();
  if (!lock.ok && lock.owner !== null) {
    console.error(`Ya hay una auditoría en curso (PID ${lock.owner}). Espera a que termine.`);
    process.exitCode = 1;
    return;
  }
  if (!lock.ok) {
    // Lock huérfano: su dueño ya no existe, así que la corrida murió sin poder
    // limpiar. Se repara el catálogo con su copia y se pide reintentar.
    const repaired = restoreFromBackup();
    releaseLock();
    console.error(repaired
      ? 'Una ejecución anterior murió a medias; el catálogo se restauró con su copia. Vuelve a ejecutar.'
      : 'Se encontró el rastro de una ejecución anterior sin copia pendiente; se limpió. Vuelve a ejecutar.');
    process.exitCode = 1;
    return;
  }

  const original = await readFile(CATALOGS, 'utf8');
  const keys = declaredKeys(original);
  const files = (await Promise.all(['src', 'scripts', 'qa.mjs', 'qa-webkit.mjs'].map(collect))).flat()
    .filter((file) => file !== path.join('src', 'i18n', 'catalogs.ts') && file !== SELF_DETECTOR && !IS_TEST.test(file));
  const sources = await Promise.all(files.map((file) => readFile(path.join(ROOT, file), 'utf8')));
  const collected = sources.map(dynamicPrefixes);
  const prefixes = {
    terminal: [...new Set(collected.flatMap((entry) => entry.terminal))],
    stripping: [...new Set(collected.flatMap((entry) => entry.stripping))],
    suffixes: [...new Set(collected.flatMap((entry) => entry.suffixes))],
  };

  const candidates = looseCandidates(keys, sources.join('\n'), prefixes);
  if (!candidates.length) {
    console.log('Ninguna clave depende de una regla floja; no hay nada que someter al compilador.');
    return;
  }

  // Una compilación limpia ANTES de tocar nada. Sin ella, un fallo posterior no
  // demuestra nada sobre las claves: podría venir de un tsconfig roto, de una
  // dependencia ausente o de que al compilador lo mató el sistema por memoria.
  console.log('Comprobando que el árbol compila antes de tocar el catálogo…');
  const baseline = await typecheck();
  if (!baseline.clean) {
    console.error('El árbol no compila tal cual está; la auditoría no puede concluir nada.\n');
    console.error(baseline.output.trim().split('\n').slice(0, 20).join('\n'));
    releaseLock();
    process.exitCode = 1;
    return;
  }

  console.log(`${candidates.length} clave(s) viven sólo por una regla floja. Preguntando al compilador…\n`);
  let result;
  const onSignal = () => { restoreFromBackup(); releaseLock(); process.exit(130); };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);
  try {
    copyFileSync(CATALOGS, BACKUP);
    await writeFile(CATALOGS, withoutKeys(original, new Set(candidates)), 'utf8');
    result = await typecheck();
  } finally {
    restoreFromBackup();
    releaseLock();
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
  }

  const verdict = classifyCandidates(candidates, result);
  if (verdict.inconclusive) {
    console.error(`Auditoría sin concluir: ${verdict.inconclusive}.\n`);
    console.error(result.output.trim().split('\n').slice(0, 20).join('\n'));
    process.exitCode = 1;
    return;
  }

  const { alive, dead } = verdict;

  if (alive.length) {
    console.log(`Vivas según el compilador (${alive.length}):`);
    for (const key of alive) console.log(`  ${key}`);
    console.log('');
  }
  if (dead.length) {
    console.log(`Sin consumidor según el compilador (${dead.length}):`);
    for (const key of dead) console.log(`  ${key}`);
    console.log('\nRetíralas de `es` y de `en` en src/i18n/catalogs.ts y vuelve a ejecutar `npm run typecheck`.');
    process.exitCode = 1;
    return;
  }
  console.log('Todas las candidatas tienen consumidor: el compilador las reclama.');
};

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) await main();
