/**
 * Exporta un fotograma representativo de cada pieza a `out/stills/`.
 *
 *   npm run still:all
 *
 * Sirve para revisar composición y tipografía sin esperar un render completo,
 * y para tener portadas de las piezas.
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(aqui, '..');

const PORTADAS = [
  { id: 'Manifiesto', frame: 240, archivo: 'manifiesto.png' },
  { id: 'Analisis2D', frame: 540, archivo: 'analisis-2d.png' },
  { id: 'Aula', frame: 400, archivo: 'aula.png' },
  { id: 'Space3D', frame: 300, archivo: 'space3d.png' },
];

mkdirSync(resolve(raiz, 'out/stills'), { recursive: true });

for (const portada of PORTADAS) {
  console.log(`▸ ${portada.id} · frame ${portada.frame}`);
  const proceso = spawnSync(
    'npx',
    [
      'remotion',
      'still',
      portada.id,
      `out/stills/${portada.archivo}`,
      `--frame=${portada.frame}`,
      '--log=error',
    ],
    { cwd: raiz, stdio: 'inherit', env: process.env },
  );
  if (proceso.status !== 0) process.exit(proceso.status ?? 1);
}

console.log('\nPortadas en out/stills/.');
