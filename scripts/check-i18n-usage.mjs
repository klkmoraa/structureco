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

/**
 * La maquinaria del propio gate no cuenta como consumidor.
 *
 * Este módulo cita claves reales en sus comentarios para explicar cada regla, y
 * sus diagnósticos las imprimen. Escanearse a sí mismo bastaría para mantener
 * viva cualquier clave con sólo nombrarla aquí — de hecho `inspector.selection`
 * e `inspector.end` sobrevivieron exactamente así mientras se escribía esta
 * corrección.
 */
const SELF = path.join('scripts', 'check-i18n-usage.mjs');

/**
 * Las pruebas no cuentan como consumidor.
 *
 * El contrato del gate es alcanzabilidad **desde el producto**: una clave que
 * sólo cita una prueba se sigue enviando en el chunk de entrada a cada usuario
 * sin que nada la muestre. `app.name` vivía exactamente así, sostenida por una
 * fixture de `catalogs.test.ts`. Excluirlas cubre también las fixtures de la
 * prueba de este mismo detector, que citan prefijos (`role.`, `generator.`)
 * como datos y mantendrían vivo cualquier espacio de nombres con sólo
 * nombrarlo.
 */
export const IS_TEST = /\.(test|spec)\.[cm]?[jt]sx?$/;
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
export const declaredKeys = (source) => {
  const spanish = source.slice(0, source.indexOf('export const en'));
  return [...spanish.matchAll(/^ {2}'([^']+)':/gm)].map((match) => match[1]);
};

/**
 * Un archivo sólo puede donar prefijos dinámicos si participa de la traducción.
 *
 * Sin esta condición, cualquier template literal del repositorio ensancha el
 * catálogo alcanzable: las rutas de procedencia `` `project.settings.${field}` ``
 * y `` `analysis.${kind}` `` de `revisionComparison.ts`, o la ruta de validación
 * `` `restraints.${dof}` `` de Space 3D, marcaban espacios de nombres enteros
 * como vivos aunque ninguno de esos archivos traduzca nada.
 */
const PARTICIPATES_IN_TRANSLATION = /\buseI18n\b|\busePhase2I18n\b|\bTranslationKey\b|from '[^']*i18n/;

/**
 * Prefijos de claves compuestas en tiempo de ejecución, del estilo
 * `` t(`role.${role}`) ``. Cualquier clave que empiece por uno de ellos se
 * considera alcanzable: el script no intenta resolver la expresión.
 *
 * No basta con exigir que el template sea el argumento literal de `t(`: hay
 * claves que se alcanzan indirectamente a través de un tipo —el
 * `` Record<GeneratorSpacingField, `spacing.${…}`> `` del generador, o el
 * `` Key extends `generator.${…}` `` de su copy— y restringirlo a la llamada
 * directa marcaría como muertas 194 claves vivas. La regla es la contraria:
 * se descarta el template que sea argumento de **otra** llamada, porque eso ya
 * no es una clave (`` throw new Error(`properties.${key} …`) ``).
 */
export const dynamicPrefixes = (source) => {
  if (!PARTICIPATES_IN_TRANSLATION.test(source)) return [];
  return [...source.matchAll(/(\w*)\(\s*`([A-Za-z0-9_.]*?)\$\{|`([A-Za-z0-9_.]*?)\$\{/g)]
    .filter((match) => match[1] === undefined || match[1] === '' || match[1] === 't')
    .map((match) => match[2] ?? match[3])
    .filter((prefix) => prefix?.includes('.'));
};

/**
 * Una clave está referenciada sólo si aparece completa, no como prefijo de otra.
 *
 * `includes` daba por viva cualquier clave que fuera prefijo de una referenciada:
 * `inspector.selection` sobrevivía dentro de `inspector.selectionSummary`, y con
 * ella otras cinco. Los delimitadores excluyen los caracteres con los que puede
 * continuar un identificador o una clave —letras, dígitos, `_`, `.`, `$` y `-`—
 * de modo que `inspector.end` no se da por usada dentro de
 * `inspector.endConnectionsDescription` ni `datasheet.error` dentro de
 * `datasheet.error.notANumber`.
 *
 * Extraer literales de cadena y comparar por igualdad sería más estricto todavía,
 * pero se midió sobre este árbol y produce 725 falsos positivos: la clave viaja
 * en atributos JSX, argumentos y expresiones que ese recorte no reconoce. Un
 * falso positivo aquí borra una etiqueta viva, así que la frontera es el límite.
 */
export const isReferenced = (haystack, key) => new RegExp(
  `(?<![\\w.$-])${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w.$-])`,
).test(haystack);

const main = async () => {
  const catalogSource = await readFile(path.join(ROOT, CATALOGS), 'utf8');
  const keys = declaredKeys(catalogSource);
  if (!keys.length) {
    console.error(`No se pudo leer ninguna clave de ${CATALOGS}; el formato del catálogo cambió.`);
    process.exit(1);
  }

  const files = (await Promise.all(SCANNED_ROOTS.map(collect))).flat().filter((file) => file !== CATALOGS && file !== SELF && !IS_TEST.test(file));
  const sources = await Promise.all(files.map((file) => readFile(path.join(ROOT, file), 'utf8')));
  const haystack = sources.join('\n');
  const prefixes = [...new Set(sources.flatMap(dynamicPrefixes))];

  const orphans = keys.filter((key) => !isReferenced(haystack, key) && !prefixes.some((prefix) => key.startsWith(prefix)));

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

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) await main();
