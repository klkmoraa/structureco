import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * Build alterno, sólo para publicar un preview temporal fuera de este entorno
 * (Artifact hosting, ya que Netlify/Vercel/Surge están bloqueados por la
 * política de red de este contenedor). No sustituye `vite.config.ts`: el dev
 * server, `npm run build` y `npm run smoke` siguen igual.
 *
 * Inlinea JS y CSS en un único `index.html` porque el destino no sirve
 * archivos adicionales — todo tiene que llegar en un solo documento
 * autocontenido, sin llamadas de red externas.
 */
const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './',
  server: { fs: { allow: [repositoryRoot] } },
  build: {
    outDir: 'dist-artifact',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 4000,
  },
});
