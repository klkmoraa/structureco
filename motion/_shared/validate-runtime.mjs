#!/usr/bin/env node

import { access, readFile, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const sharedDir = dirname(fileURLToPath(import.meta.url));
const motionDir = dirname(sharedDir);
const expectedSource = "../_shared/vendor/gsap.min.js";
const entries = (await readdir(motionDir, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && /^\d{2}-/.test(entry.name))
  .sort((a, b) => a.name.localeCompare(b.name));

if (entries.length !== 10) {
  throw new Error(`Expected 10 motion entries, found ${entries.length}`);
}

for (const entry of entries) {
  const indexPath = join(motionDir, entry.name, "index.html");
  const html = await readFile(indexPath, "utf8");
  const sources = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)]
    .map((match) => match[1])
    .filter((source) => /gsap(?:\.min)?\.js(?:[?#].*)?$/.test(source));

  if (sources.length !== 1 || sources[0] !== expectedSource) {
    throw new Error(`${relative(motionDir, indexPath)} must load exactly ${expectedSource}`);
  }

  const runtimePath = resolve(dirname(indexPath), sources[0]);
  await access(runtimePath, constants.R_OK);
  if (runtimePath !== join(sharedDir, "vendor", "gsap.min.js")) {
    throw new Error(`${relative(motionDir, indexPath)} resolves GSAP outside the canonical vendor path`);
  }
}

console.log(`Validated ${entries.length} entries against ${expectedSource}`);
