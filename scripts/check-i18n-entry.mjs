#!/usr/bin/env node
/**
 * Vigila que inglés no vuelva al chunk de la primera pintada por accidente.
 * Uso: npm run build && npm run verify:i18n-entry
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SENTINEL = 'structureCo is an educational support tool.';

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  }));
  return nested.flat();
};

try {
  await stat(DIST);
} catch {
  console.error('dist/ no existe; ejecuta npm run build primero.');
  process.exit(1);
}

const html = await readFile(path.join(DIST, 'index.html'), 'utf8');
const files = (await walk(DIST)).filter((file) => /\.(js|mjs)$/.test(file));
const carriers = [];
for (const file of files) {
  const source = await readFile(file, 'utf8');
  if (!source.includes(SENTINEL)) continue;
  const name = path.relative(DIST, file).replaceAll('\\', '/');
  carriers.push({ name, eager: html.includes(path.basename(file)) });
}

if (carriers.length === 0) {
  console.error('No se encontró el centinela del catálogo inglés; actualiza el gate.');
  process.exit(1);
}
const eager = carriers.filter((carrier) => carrier.eager);
if (eager.length) {
  console.error(`El catálogo inglés viaja en la carga inicial: ${eager.map((carrier) => carrier.name).join(', ')}`);
  process.exit(1);
}

console.log(`Chunk de entrada limpio: catálogo inglés diferido en ${carriers.map((carrier) => carrier.name).join(', ')}.`);
