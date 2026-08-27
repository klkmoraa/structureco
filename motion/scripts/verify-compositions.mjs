import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const motionDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const compositionNames = (await readdir(motionDir, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && /^\d{2}-/.test(entry.name))
  .map((entry) => entry.name)
  .sort();

if (compositionNames.length !== 10) {
  throw new Error(`expected 10 compositions, found ${compositionNames.length}`);
}

for (const name of compositionNames) {
  const compositionDir = path.join(motionDir, name);
  const htmlPath = path.join(compositionDir, 'index.html');
  const metadataPath = path.join(compositionDir, 'meta.json');
  const [html, metadataText] = await Promise.all([
    readFile(htmlPath, 'utf8'),
    readFile(metadataPath, 'utf8'),
  ]);
  const metadata = JSON.parse(metadataText);

  if (metadata.id !== name || metadata.name !== name) {
    throw new Error(`${name}: meta.json id and name must match the directory`);
  }

  const localReferences = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((reference) => !/^(?:[a-z]+:|\/|#)/i.test(reference));

  for (const reference of localReferences) {
    const pathname = decodeURIComponent(reference.split(/[?#]/, 1)[0]);
    await access(path.resolve(compositionDir, pathname));
  }

  const audioReferences = [...html.matchAll(/<audio\b[^>]*\bsrc=["']([^"']+)["']/gi)];
  if (audioReferences.length === 0) {
    throw new Error(`${name}: index.html has no audio references`);
  }

  console.log(`${name}: HTML, ${audioReferences.length} audio files, metadata and local references OK`);
}
