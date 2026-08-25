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
 * prueba. Y la restauración se apoya en una copia en disco, no en un `finally`:
 * ante Ctrl+C el proceso termina sin ejecutarlo.
 *
 * Es lento (una compilación completa) y por eso no entra en `npm run verify`.
 * Se ejecuta a mano cuando el detector reporte cero huérfanas y aun así se
 * sospeche que una regla floja está tapando algo.
 *
 * Uso: node scripts/audit-i18n-with-types.mjs
 */
import { execFile } from 'node:child_process';
import { copyFileSync, existsSync, rmSync } from 'node:fs';
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

const typecheck = () => run(
  process.execPath,
  [path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc'), '-b', '--noEmit'],
  { cwd: ROOT },
);

const main = async () => {
  if (restoreFromBackup()) {
    console.error('Se encontró una copia de una ejecución interrumpida; el catálogo se restauró. Vuelve a ejecutar.');
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
  try {
    await typecheck();
  } catch (error) {
    console.error('El árbol no compila tal cual está; la auditoría no puede concluir nada.\n');
    console.error(`${error.stdout ?? ''}${error.stderr ?? ''}`.trim().split('\n').slice(0, 20).join('\n'));
    process.exitCode = 1;
    return;
  }

  console.log(`${candidates.length} clave(s) viven sólo por una regla floja. Preguntando al compilador…\n`);
  let output = '';
  let compiled = false;
  const onSignal = () => { restoreFromBackup(); process.exit(130); };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);
  try {
    copyFileSync(CATALOGS, BACKUP);
    await writeFile(CATALOGS, withoutKeys(original, new Set(candidates)), 'utf8');
    await typecheck();
    compiled = true;
  } catch (error) {
    output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
  } finally {
    restoreFromBackup();
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
  }

  const mentions = (key) => output.includes(`"${key.slice(key.indexOf('.') + 1)}"`) || output.includes(`"${key}"`);
  const alive = candidates.filter(mentions);

  // Con el baseline en verde, la única explicación admisible de un fallo es que
  // el compilador reclame una de las candidatas. Un error que no nombra ninguna
  // significa que pasó otra cosa, y entonces la ausencia de diagnóstico no
  // prueba que las demás estén muertas: la auditoría queda sin concluir.
  if (!compiled && !alive.length) {
    console.error('El compilador falló sin nombrar ninguna candidata; la auditoría no concluye.\n');
    console.error(output.trim().split('\n').slice(0, 20).join('\n'));
    process.exitCode = 1;
    return;
  }

  const dead = candidates.filter((key) => !alive.includes(key));

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

await main();
