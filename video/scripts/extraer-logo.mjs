/**
 * Transcribe la geometría de `brand/logo.svg` a `src/components/logoPath.ts`.
 *
 * `brand/**` es la fuente protegida de identidad y no se edita ni se adapta.
 * Este script sólo lee de ahí, para que el video pinte el logotipo exacto en
 * lugar de una versión redibujada a ojo. Ejecutar tras cualquier cambio
 * autorizado del logotipo:
 *
 *   node scripts/extraer-logo.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const origen = resolve(aqui, '../../brand/logo.svg');
const destino = resolve(aqui, '../src/components/logoPath.ts');

const svg = readFileSync(origen, 'utf8');

const path = svg.match(/<path d="([\s\S]*?)"/);
const grupo = svg.match(/<g transform="([^"]+)"/);
const caja = svg.match(/viewBox="([^"]+)"/);

if (!path || !grupo || !caja) {
  throw new Error(`No se pudo leer la geometría de ${origen}: el SVG no tiene la forma esperada.`);
}

const d = path[1].replace(/\s+/g, ' ').trim();

writeFileSync(
  destino,
  `/**
 * Geometría del logotipo oficial.
 *
 * GENERADO por \`node scripts/extraer-logo.mjs\` a partir de \`brand/logo.svg\`.
 * No editar a mano: \`brand/**\` es la fuente protegida y este archivo sólo la
 * transcribe para poder pintarla con los materiales Clay del video.
 */

export const LOGO_VIEW_BOX = ${JSON.stringify(caja[1])};
export const LOGO_TRANSFORM = ${JSON.stringify(grupo[1])};
export const LOGO_PATH =
  ${JSON.stringify(d)};
`,
);

console.log(`logoPath.ts actualizado desde ${origen} (${d.length} caracteres de path).`);
