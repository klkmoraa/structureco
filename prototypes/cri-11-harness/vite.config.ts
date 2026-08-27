import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * El harness vive fuera de `src/**` y no comparte build con la aplicación real.
 *
 * Lo único que cruza la frontera es la lectura de dos hojas de estilo de
 * producción — `src/design-system/tokens.css` y `src/design-system/components/ui.css` —
 * importadas SIN modificarlas. Es deliberado: el Brandbook manda, y copiar los
 * tokens crearía una paleta paralela, que es justamente lo que CRI-10 y CRI-11
 * prohíben. Por eso `server.fs.allow` incluye la raíz del repositorio.
 */
const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5211,
    host: true,
    fs: { allow: [repositoryRoot] },
  },
  preview: { port: 5211, host: true },
});
