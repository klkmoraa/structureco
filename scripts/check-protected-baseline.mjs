#!/usr/bin/env node
/**
 * Verifies that the protected mathematical boundary has not changed.
 *
 * The baseline is `docs/releases/0.8.1/PROTECTED_BASELINE.sha256`, produced at the
 * start of the 0.8.1 program. Any visual, export or documentation slice must leave
 * these files byte-identical. A genuine engine change requires explicit user
 * authorization and a deliberate baseline refresh (`--update`).
 */
import { createHash } from 'node:crypto';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const BASELINE = path.join(ROOT, 'docs', 'releases', '0.8.1', 'PROTECTED_BASELINE.sha256');
const PROTECTED = [
  'src/engine',
  'src/workers',
  'src/data',
  'src/store/ProjectContext.tsx',
  'src/types.ts',
];

const collect = async (relative) => {
  const absolute = path.join(ROOT, relative);
  const info = await stat(absolute);
  if (!info.isDirectory()) return [relative];
  const entries = await readdir(absolute, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => collect(`${relative}/${entry.name}`)));
  return nested.flat();
};

const hashFile = async (relative) => {
  const bytes = await readFile(path.join(ROOT, relative));
  return createHash('sha256').update(bytes).digest('hex');
};

const currentDigest = async () => {
  const files = (await Promise.all(PROTECTED.map(collect))).flat().sort();
  const lines = await Promise.all(files.map(async (file) => `${await hashFile(file)}  ${file}`));
  return lines;
};

const parse = (text) => new Map(text
  .split(/\r?\n/)
  .filter((line) => line.trim() !== '')
  .map((line) => {
    const [hash, ...rest] = line.split(/\s+/);
    return [rest.join(' '), hash];
  }));

const lines = await currentDigest();

if (process.argv.includes('--update')) {
  await writeFile(BASELINE, `${lines.join('\n')}\n`, 'utf8');
  console.log(`Baseline actualizado con ${lines.length} archivos protegidos.`);
  process.exit(0);
}

const expected = parse(await readFile(BASELINE, 'utf8'));
const actual = parse(lines.join('\n'));
const problems = [];

for (const [file, hash] of expected) {
  if (!actual.has(file)) problems.push(`ELIMINADO   ${file}`);
  else if (actual.get(file) !== hash) problems.push(`MODIFICADO  ${file}`);
}
for (const file of actual.keys()) {
  if (!expected.has(file)) problems.push(`AGREGADO    ${file}`);
}

if (problems.length > 0) {
  console.error('Frontera matemática protegida alterada:\n');
  for (const problem of problems) console.error(`  ${problem}`);
  console.error('\nSi el cambio es intencional y está autorizado, ejecuta:');
  console.error('  node scripts/check-protected-baseline.mjs --update');
  process.exit(1);
}

console.log(`Frontera protegida intacta: ${actual.size} archivos verificados.`);
