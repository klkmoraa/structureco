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
 *   1. retirar de golpe todas las candidatas de `es` y de `en`;
 *   2. ejecutar `tsc -b --noEmit` una sola vez;
 *   3. leer de los errores qué literales reclama el compilador — ésas están
 *      vivas — y dar por muertas las demás;
 *   4. restaurar el catálogo intacto, pase lo que pase.
 *
 * Es lento (una compilación completa) y por eso no entra en `npm run verify`.
 * Se ejecuta a mano cuando el detector reporte cero huérfanas y aun así se
 * sospeche que una regla floja está tapando algo.
 *
 * Uso: node scripts/audit-i18n-with-types.mjs
 */
import { execFile } from 'node:child_process';
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

const main = async () => {
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

  console.log(`${candidates.length} clave(s) viven sólo por una regla floja. Preguntando al compilador…\n`);
  let output = '';
  try {
    await writeFile(CATALOGS, withoutKeys(original, new Set(candidates)), 'utf8');
    await run(process.execPath, [path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc'), '-b', '--noEmit'], { cwd: ROOT });
  } catch (error) {
    output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
  } finally {
    // El catálogo se restaura siempre: este script audita, nunca edita.
    await writeFile(CATALOGS, original, 'utf8');
  }

  const alive = candidates.filter((key) => output.includes(`"${key.slice(key.indexOf('.') + 1)}"`) || output.includes(`"${key}"`));
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
