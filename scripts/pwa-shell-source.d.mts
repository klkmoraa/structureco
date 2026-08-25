/** Declaraciones para el módulo JS que comparten `vite.config.ts` y su prueba. */
export const CACHE_PREFIX: string;
export function cacheNameFor(release: string): string;
export function createServiceWorkerSource(options: { cacheName: string; assets: readonly string[] }): string;
