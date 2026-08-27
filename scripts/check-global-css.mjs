#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

export const MAX_GLOBAL_CSS_BYTES = 8_000;
export const FEATURE_SELECTOR_PATTERNS = [
  /\.(?:welcome|sc-home)(?:[-_]|\b)/,
  /\.topbar(?:[-_]|\b)/,
  /\.(?:workspace|toolbar|center-stage)(?:[-_]|\b)/,
  /\.(?:canvas|structural-canvas)(?:[-_]|\b)/,
  /\.inspector(?:[-_]|\b)/,
  /\.(?:results|result)(?:[-_]|\b)/,
];

export function inspectGlobalCss(source) {
  const errors = [];
  const bytes = Buffer.byteLength(source);
  if (bytes > MAX_GLOBAL_CSS_BYTES) errors.push(`src/styles.css pesa ${bytes} bytes; máximo ${MAX_GLOBAL_CSS_BYTES}.`);
  for (const pattern of FEATURE_SELECTOR_PATTERNS) {
    if (pattern.test(source)) errors.push(`src/styles.css contiene un selector de feature prohibido: ${pattern}.`);
  }
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = path.resolve(import.meta.dirname, '..');
  const source = await readFile(path.join(root, 'src/styles.css'), 'utf8');
  const errors = inspectGlobalCss(source);
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
  }
  console.log(`Contrato CSS global correcto: ${Buffer.byteLength(source)}/${MAX_GLOBAL_CSS_BYTES} bytes y sin selectores de features.`);
}
