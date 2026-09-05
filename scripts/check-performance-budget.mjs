#!/usr/bin/env node
/**
 * Reports the initial download using the same measurement source as the performance report.
 *
 * El presupuesto protege la primera pintada. Medimos el artefacto real de
 * `dist/`, no una estimación de dependencias: una importación estática o un
 * cambio de splitting que entra al HTML deja de ser una regresión silenciosa.
 *
 * Usage: npm run build && node scripts/check-performance-budget.mjs
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');

/**
 * Línea base renovada el 2026-09-05: 1 350 929 bytes / 370 461 gzip. El margen
 * protege contra dependencias accidentales o fugas en el chunk de entrada inicial.
 * Cambiar estos valores exige justificar el cambio y documentarlo en el reporte.
 */
const BUDGET = {
  eagerBytes: 1_400_000,
  eagerGzip: 380_000,
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
const displayLimit = (limit) => (Number.isFinite(limit) ? String(limit) : 'sin límite');
const failures = [];

if (Number.isFinite(BUDGET.eagerBytes) && eagerBytes > BUDGET.eagerBytes) {
  failures.push(`  carga inicial: ${eagerBytes} bytes supera el techo de ${BUDGET.eagerBytes} (+${percent(eagerBytes, BUDGET.eagerBytes)})`);
}
if (Number.isFinite(BUDGET.eagerGzip) && eagerGzip > BUDGET.eagerGzip) {
  failures.push(`  carga inicial: ${eagerGzip} gzip supera el techo de ${BUDGET.eagerGzip} (+${percent(eagerGzip, BUDGET.eagerGzip)})`);
}

if (failures.length) {
  console.error('Presupuesto de rendimiento excedido:\n');
  console.error(failures.join('\n'));
  console.error('\nRevisa que ninguna dependencia nueva haya entrado al chunk de entrada.');
  console.error('Los archivos marcados "inicial" en `node scripts/measure-performance.mjs` son los que se descargan antes del primer pintado.');
  process.exit(1);
}

console.log(`Presupuesto de entrada aprobado: ${eagerBytes} bytes / ${eagerGzip} gzip (límite ${displayLimit(BUDGET.eagerBytes)} / ${displayLimit(BUDGET.eagerGzip)}).`);
