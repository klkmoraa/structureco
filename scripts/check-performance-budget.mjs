#!/usr/bin/env node
/**
 * Fails the build when the initial download grows past its declared ceiling.
 *
 * `measure-performance.mjs` has always been able to report bundle composition, but nothing
 * ever *asserted* on it: the numbers were printed, read once, written into
 * `docs/releases/0.8.1/PERFORMANCE.md`, and then drifted silently. That is exactly how the
 * animation library landed in the entry chunk and pushed the initial download from
 * 148 531 gzip to 195 360 gzip without a single check going red.
 *
 * This script closes that hole. It re-uses the measurement script as the single source of
 * truth (spawned with `--json`) rather than re-implementing the walk, so the budget can
 * never be checked against a different definition of "initial load" than the one the
 * performance document reports.
 *
 * Usage: npm run build && node scripts/check-performance-budget.mjs
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');

/**
 * Ceilings for what the browser must download before first paint.
 *
 * Provenance — these are NOT aspirational targets, they are the measured value plus a
 * deliberate 3 % of headroom so that ordinary content edits (a few translation keys, a CSS
 * rule) do not fail the gate, while a new library or an eagerly-imported feature does.
 *
 * Measured 2026-08-03 after moving the animation feature bundle out of the entry chunk
 * (`LazyMotion` + `m` components): 629 337 bytes, 169 132 gzip.
 *
 * KNOWN DEBT: this is still above the 0.8.1 baseline of 556 000 bytes / 148 531 gzip. The
 * gap is the animation core (`m` + `AnimatePresence` + `LazyMotion`) that the welcome
 * screen pulls into the entry chunk. Lowering this ceiling requires moving the welcome
 * screen's animations back to CSS; until that decision is made, the ceiling holds the line
 * where it is instead of letting it drift further.
 */
const BUDGET = {
  eagerBytes: 648_000,
  eagerGzip: 174_000,
};

let report;
try {
  const raw = execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'measure-performance.mjs'), '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  report = JSON.parse(raw);
} catch (error) {
  console.error(`No se pudo medir el bundle: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}

if (report.bundle?.error) {
  console.error(report.bundle.error);
  process.exit(1);
}

const { eagerBytes, eagerGzip } = report.bundle;
const percent = (actual, ceiling) => `${((actual / ceiling - 1) * 100).toFixed(1)}%`;
const failures = [];

if (eagerBytes > BUDGET.eagerBytes) {
  failures.push(`  carga inicial: ${eagerBytes} bytes supera el techo de ${BUDGET.eagerBytes} (+${percent(eagerBytes, BUDGET.eagerBytes)})`);
}
if (eagerGzip > BUDGET.eagerGzip) {
  failures.push(`  carga inicial: ${eagerGzip} gzip supera el techo de ${BUDGET.eagerGzip} (+${percent(eagerGzip, BUDGET.eagerGzip)})`);
}

if (failures.length) {
  console.error('Presupuesto de rendimiento excedido:\n');
  console.error(failures.join('\n'));
  console.error('\nRevisa que ninguna dependencia nueva haya entrado al chunk de entrada.');
  console.error('Los archivos marcados "inicial" en `node scripts/measure-performance.mjs` son los que se descargan antes del primer pintado.');
  process.exit(1);
}

console.log(`Presupuesto de rendimiento respetado: ${eagerBytes} bytes / ${eagerGzip} gzip (techo ${BUDGET.eagerBytes} / ${BUDGET.eagerGzip}).`);
