import { loadFont } from '@remotion/fonts';
import { continueRender, delayRender, staticFile } from 'remotion';

/**
 * IBM Plex Sans + IBM Plex Mono, servidas desde `video/public/fonts`, que son
 * copia de las que ya usa la aplicación (`public/fonts`). Se cargan por
 * archivo local para que el render no dependa de la red.
 */

const espera = delayRender('Cargando IBM Plex', { timeoutInMilliseconds: 120000 });

const familias = [
  { family: 'IBM Plex Sans', archivo: 'ibm-plex-sans-400.woff2', weight: '400' },
  { family: 'IBM Plex Sans', archivo: 'ibm-plex-sans-500.woff2', weight: '500' },
  { family: 'IBM Plex Sans', archivo: 'ibm-plex-sans-600.woff2', weight: '600' },
  { family: 'IBM Plex Sans', archivo: 'ibm-plex-sans-700.woff2', weight: '700' },
  { family: 'IBM Plex Mono', archivo: 'ibm-plex-mono-400.woff2', weight: '400' },
  { family: 'IBM Plex Mono', archivo: 'ibm-plex-mono-500.woff2', weight: '500' },
];

Promise.all(
  familias.map(({ family, archivo, weight }) =>
    loadFont({ family, url: staticFile(`fonts/${archivo}`), weight, format: 'woff2' }),
  ),
)
  .then(() => continueRender(espera))
  .catch((error) => {
    // Si una variante falta, se continúa con la pila de respaldo del sistema
    // antes que dejar el render colgado indefinidamente.
    console.error('No se pudieron cargar las tipografías Plex', error);
    continueRender(espera);
  });
