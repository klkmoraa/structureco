import fs from 'node:fs';
import path from 'node:path';
import { collectStructuralPngs, inspectStructuralPng } from './structural-png-contract.mjs';

const root = path.resolve(import.meta.dirname, '..');
const assetRoot = path.join(root, 'public', 'assets', 'structural');
const files = collectStructuralPngs(assetRoot);
const failures = [];

if (files.length !== 80) failures.push(`expected 80 PNG files, found ${files.length}`);

for (const theme of ['day', 'night']) {
  const themeFiles = files.filter((file) => path.relative(assetRoot, file).split(path.sep)[0] === theme);
  if (themeFiles.length !== 40) failures.push(`${theme}: expected 40 files, found ${themeFiles.length}`);
  const families = new Map();
  for (const file of themeFiles) {
    const [, family] = path.relative(assetRoot, file).split(path.sep);
    families.set(family, (families.get(family) ?? 0) + 1);
  }
  if (families.size !== 10) failures.push(`${theme}: expected 10 families, found ${families.size}`);
  for (const [family, count] of families) if (count !== 4) failures.push(`${theme}/${family}: expected 4 files, found ${count}`);
}

for (const file of files) {
  const metadata = inspectStructuralPng(fs.readFileSync(file));
  const relative = path.relative(root, file);
  if (metadata.width !== 900 || metadata.height !== 600) failures.push(`${relative}: ${metadata.width}x${metadata.height}`);
  if (!metadata.hasAlpha) failures.push(`${relative}: missing alpha channel`);
}

if (failures.length) throw new Error(`Three.js structural render contract failed:\n${failures.join('\n')}`);
console.log('Three.js structural render contract PASS · 80 PNG · 40 Day + 40 Night · 900×600 · alpha');
