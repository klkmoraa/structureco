/**
 * Renderiza las cuatro piezas a MP4 en `out/`.
 *
 *   npm run render:all
 *
 * Si el entorno ya tiene un Chrome Headless Shell, apúntalo con
 * `REMOTION_BROWSER_EXECUTABLE` para que Remotion no descargue el suyo.
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(aqui, '..');

const PIEZAS = [
  { id: 'Manifiesto', archivo: 'structureco-manifiesto-1920x1080.mp4' },
  { id: 'Analisis2D', archivo: 'structureco-analisis-2d-1080x1920.mp4' },
  { id: 'Aula', archivo: 'structureco-aula-1080x1350.mp4' },
  { id: 'Space3D', archivo: 'structureco-space3d-1920x1080.mp4' },
];

mkdirSync(resolve(raiz, 'out'), { recursive: true });

const soloPedidas = process.argv.slice(2);
const seleccion = soloPedidas.length
  ? PIEZAS.filter((p) => soloPedidas.includes(p.id))
  : PIEZAS;

if (!seleccion.length) {
  console.error(`Ninguna pieza coincide. Disponibles: ${PIEZAS.map((p) => p.id).join(', ')}`);
  process.exit(1);
}

for (const pieza of seleccion) {
  console.log(`\n▸ ${pieza.id} → out/${pieza.archivo}`);
  const inicio = Date.now();
  const proceso = spawnSync(
    'npx',
    ['remotion', 'render', pieza.id, `out/${pieza.archivo}`, '--log=error'],
    { cwd: raiz, stdio: 'inherit', env: process.env },
  );
  if (proceso.status !== 0) {
    console.error(`  falló el render de ${pieza.id}`);
    process.exit(proceso.status ?? 1);
  }
  console.log(`  listo en ${((Date.now() - inicio) / 1000).toFixed(1)} s`);
}

console.log('\nTodas las piezas renderizadas en out/.');
