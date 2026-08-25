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
 * texto literal no aparece en ningún archivo Y ninguna forma dinámica la
 * alcanza. Un falso positivo borraría una etiqueta viva y la dejaría en blanco
 * en producción; un falso negativo sólo conserva unos bytes de más.
 *
 * ## Su límite, y cuál es el respaldo
 *
 * Esto es una heurística textual, no un análisis de tipos, y no puede ser
 * completa: reconoce la clave literal, el prefijo terminal de `` t(`x.${y}`) ``,
 * el prefijo de tipo que sólo antepone, y el sufijo literal de
 * `` t(`${x}One`) ``. Cualquier otra forma de componer una clave se le escapa,
 * y cuando se le escapa **borra una etiqueta viva**.
 *
 * El respaldo que sí es sólido es `npm run typecheck`: `TranslationKey` se
 * deriva del catálogo, así que retirar una clave que alguna llamada todavía
 * pide es un error de tipos, no un fallo silencioso. Ese respaldo ya actuó una
 * vez —las siete claves `…One` del resumen de edición múltiple— y por eso la
 * regla del sufijo existe. Antes de retirar lo que este gate reporte, ejecuta
 * el typecheck: él es la autoridad y esto sólo el detector.
 *
 * Y para la dirección contraria —lo que estas reglas dejan pasar— está
 * `npm run audit:i18n`, que somete al compilador las claves que sólo sobreviven
 * por una regla floja en vez de intentar afinar el regex una vez más.
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
 * Se distinguen dos clases, porque no significan lo mismo:
 *
 * - **Terminal** — el template es el argumento de `` t(`option.${id}.${value}`) ``.
 *   Todo lo que sigue al prefijo se interpola en tiempo de ejecución, así que
 *   el espacio de nombres entero es alcanzable y no hay más que comprobar.
 * - **De tipo** — el template vive en una posición de tipo, como el
 *   `` Key extends `generator.${infer Rest}` `` del copy del generador o el
 *   `` Record<GeneratorSpacingField, `spacing.${…}`> `` de su panel. Ahí el
 *   prefijo sólo se **antepone**: las llamadas reales usan la clave corta
 *   (`t('section.placement')`), así que dar por viva toda la familia
 *   `generator.*` acepta 94 claves sin comprobar ninguna. Se quita el prefijo
 *   y se vuelve a comprobar lo que queda.
 *
 * Un template que sea argumento de **otra** llamada no cuenta en ninguna clase,
 * porque eso ya no es una clave (`` throw new Error(`properties.${key} …`) ``).
 */
export const dynamicPrefixes = (source) => {
  const terminal = [];
  const stripping = [];
  const suffixes = [];
  if (!PARTICIPATES_IN_TRANSLATION.test(source)) return { terminal, stripping, suffixes };
  for (const match of source.matchAll(/(\w*)\(\s*`([A-Za-z0-9_.]*?)\$\{|`([A-Za-z0-9_.]*?)\$\{/g)) {
    const prefix = match[2] ?? match[3];
    if (!prefix?.includes('.')) continue;
    if (match[1] === 't') terminal.push(prefix);
    else if (match[1] === undefined || match[1] === '') stripping.push(prefix);
  }
  // `` t(`${plural}One`) `` interpola al principio y concatena un sufijo literal:
  // la clave `summary.membersOne` no aparece nunca entera y su prefijo tampoco es
  // constante. Se recoge el sufijo para poder recortarlo y comprobar el resto.
  for (const match of source.matchAll(/\bt\(\s*`\$\{[^`]*?\}([A-Za-z][A-Za-z0-9_]*)`/g)) suffixes.push(match[1]);
  return { terminal, stripping, suffixes };
};

/**
 * Una clave es alcanzable si aparece completa, si cae bajo un prefijo terminal,
 * o si un prefijo de tipo la acorta hasta algo que sí lo es.
 *
 * La recursión existe porque una clave puede pasar por dos prefijos:
 * `bulk.option.member.type.frame` pierde `bulk.` en el tipo del módulo de copy y
 * lo que queda, `option.member.type.frame`, cae bajo el `` t(`option.${id}.${value}`) ``
 * de `bulkEditPresentation.ts`. El tope de profundidad sólo evita que un prefijo
 * degenerado haga girar la búsqueda.
 */
export const isReachable = (haystack, key, prefixes, depth = 0) => {
  if (isReferenced(haystack, key)) return true;
  if (prefixes.terminal.some((prefix) => key.startsWith(prefix))) return true;
  if (depth >= MAX_PREFIX_DEPTH) return false;
  if (prefixes.stripping.some((prefix) => (
    key.startsWith(prefix) && prefix !== key && isReachable(haystack, key.slice(prefix.length), prefixes, depth + 1)
  ))) return true;
  return (prefixes.suffixes ?? []).some((suffix) => (
    key.endsWith(suffix) && key !== suffix && isReachable(haystack, key.slice(0, -suffix.length), prefixes, depth + 1)
  ));
};

/** Dos saltos cubren el caso real (`bulk.` y luego `option.`); el tercero es holgura. */
const MAX_PREFIX_DEPTH = 3;

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
  const collected = sources.map(dynamicPrefixes);
  const prefixes = {
    terminal: [...new Set(collected.flatMap((entry) => entry.terminal))],
    stripping: [...new Set(collected.flatMap((entry) => entry.stripping))],
    suffixes: [...new Set(collected.flatMap((entry) => entry.suffixes))],
  };

  const orphans = keys.filter((key) => !isReachable(haystack, key, prefixes));

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

  console.log(`Catálogo i18n: ${keys.length} clave(s) declaradas, todas alcanzables desde ${files.length} archivo(s); ${prefixes.terminal.length} prefijo(s) terminal(es), ${prefixes.stripping.length} de tipo y ${prefixes.suffixes.length} sufijo(s).`);
};

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) await main();
