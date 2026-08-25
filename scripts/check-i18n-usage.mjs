#!/usr/bin/env node
/**
 * Detecta claves de traducción declaradas que ningún archivo del producto puede
 * alcanzar.
 *
 * Los dos catálogos viajan enteros en el chunk de entrada, así que una clave
 * muerta no es sólo ruido de mantenimiento: son bytes que descarga cada
 * usuario en el arranque. `catalogs.test.ts` ya comprueba que `es` y `en`
 * declaren lo mismo y que interpolen igual; lo que faltaba era la dirección
 * contraria —que lo declarado siga teniendo un consumidor—.
 *
 * El análisis es deliberadamente conservador: una clave sólo se reporta si su
 * texto literal no aparece en ningún archivo Y ningún prefijo dinámico la
 * cubre. Un falso positivo borraría una etiqueta viva y la dejaría en blanco
 * en producción; un falso negativo sólo conserva unos bytes de más.
 *
 * Uso: node scripts/check-i18n-usage.mjs [--json]
 */
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const CATALOGS = path.join('src', 'i18n', 'catalogs.ts');
const SCANNED_ROOTS = ['src', 'scripts', 'qa.mjs', 'qa-webkit.mjs'];
const SCANNED_EXTENSIONS = /\.(ts|tsx|mjs|js)$/;

const collect = async (relative) => {
  const absolute = path.join(ROOT, relative);
  const entries = await readdir(absolute, { withFileTypes: true }).catch(() => null);
  if (!entries) return SCANNED_EXTENSIONS.test(relative) ? [relative] : [];
  const nested = await Promise.all(entries.map((entry) => collect(path.join(relative, entry.name))));
  return nested.flat();
};

/**
 * Claves declaradas en el catálogo español, que `catalogs.test.ts` ya obliga a
 * ser idéntico en estructura al inglés. Se lee sólo hasta `export const en`
 * para no contar dos veces la misma clave.
 */
const declaredKeys = (source) => {
  const spanish = source.slice(0, source.indexOf('export const en'));
  return [...spanish.matchAll(/^ {2}'([^']+)':/gm)].map((match) => match[1]);
};

/**
 * Prefijos de claves compuestas en tiempo de ejecución, del estilo
 * `` t(`role.${role}`) ``. Cualquier clave que empiece por uno de ellos se
 * considera alcanzable: el script no intenta resolver la expresión.
 */
const dynamicPrefixes = (source) => [...source.matchAll(/`([A-Za-z0-9_.]*?)\$\{/g)]
  .map((match) => match[1])
  .filter((prefix) => prefix.includes('.'));

const main = async () => {
  const catalogSource = await readFile(path.join(ROOT, CATALOGS), 'utf8');
  const keys = declaredKeys(catalogSource);
  if (!keys.length) {
    console.error(`No se pudo leer ninguna clave de ${CATALOGS}; el formato del catálogo cambió.`);
    process.exit(1);
  }

  const files = (await Promise.all(SCANNED_ROOTS.map(collect))).flat().filter((file) => file !== CATALOGS);
  const sources = await Promise.all(files.map((file) => readFile(path.join(ROOT, file), 'utf8')));
  const haystack = sources.join('\n');
  const prefixes = [...new Set(sources.flatMap(dynamicPrefixes))];

  const orphans = keys.filter((key) => !haystack.includes(key) && !prefixes.some((prefix) => key.startsWith(prefix)));

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ declared: keys.length, scannedFiles: files.length, dynamicPrefixes: prefixes, orphans }, null, 2));
    return;
  }

  if (orphans.length) {
    console.error(`Claves de traducción sin consumidor: ${orphans.length} de ${keys.length} declaradas.\n`);
    for (const key of orphans) console.error(`  ${key}`);
    console.error('\nBórralas de `es` y de `en` en src/i18n/catalogs.ts, o usa la clave donde corresponda.');
    console.error('Si la clave se compone en tiempo de ejecución, el prefijo debe aparecer literalmente en un template string.');
    process.exit(1);
  }

  console.log(`Catálogo i18n: ${keys.length} clave(s) declaradas, todas alcanzables desde ${files.length} archivo(s); ${prefixes.length} prefijo(s) dinámico(s) reconocido(s).`);
};

await main();
