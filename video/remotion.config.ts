import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setConcurrency(3);

/*
 * Las piezas son CSS y SVG con sombras y desenfoques pesados. Un fotograma a
 * 1080p tarda del orden de un segundo, y con varias pestañas compitiendo por 4
 * núcleos una recién abierta puede tardar bastante más de los 28 s que Remotion
 * espera por defecto antes de dar por muerto un delayRender() — que es lo que
 * hace la carga de tipografías. El margen ancho evita que un render largo se
 * caiga por congestión en lugar de por un error real.
 */
Config.setDelayRenderTimeoutInMilliseconds(120000);

/**
 * Remotion descarga su propio Chrome Headless Shell la primera vez que
 * renderiza. En entornos que ya traen uno instalado (contenedores de CI, la
 * imagen de Playwright, etc.) esa descarga es innecesaria y a veces imposible:
 * basta apuntar a la que ya existe.
 *
 *   REMOTION_BROWSER_EXECUTABLE=/ruta/a/headless_shell npm run render:all
 */
const navegador = process.env.REMOTION_BROWSER_EXECUTABLE;
if (navegador) {
  Config.setBrowserExecutable(navegador);
}

export {};
