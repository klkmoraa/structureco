/**
 * Fuente del service worker que `vite.config.ts` escribe en `dist/sw.js`.
 *
 * Vive en su propio módulo —y no incrustada en la configuración de build—
 * porque es código de producción que corre en el navegador de cada usuario y
 * hasta ahora no tenía forma de probarse: `scripts/pwa-shell-source.test.mjs`
 * la evalúa contra un `self`/`caches` falso y comprueba install, activate y
 * fetch sin construir la aplicación.
 */

/**
 * Prefijo compartido por todas las cachés del shell. El nombre completo lleva
 * además el digest del build, así que `activate` puede distinguir las cachés de
 * releases anteriores —que hay que borrar— de cualquier otra caché del origen,
 * que no es nuestra y no se toca.
 */
export const CACHE_PREFIX = 'structureco-shell-';

export const cacheNameFor = (release) => `${CACHE_PREFIX}${release}`;

/**
 * @param {{ cacheName: string, assets: readonly string[] }} options
 * @returns {string} el contenido de `dist/sw.js`
 */
export const createServiceWorkerSource = ({ cacheName, assets }) => `const CACHE_NAME=${JSON.stringify(cacheName)};
const CACHE_PREFIX=${JSON.stringify(CACHE_PREFIX)};
const SHELL=${JSON.stringify([...assets])};
// An existing active worker means this is an update, not a first install. Activate
// updates immediately so an old PWA client cannot keep serving an earlier CSS/JS
// shell indefinitely. The first install still waits normally and avoids a reload
// while the app is being added to the home screen.
const HAS_ACTIVE_WORKER=Boolean(self.registration.active);
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(SHELL)).then(()=>HAS_ACTIVE_WORKER?self.skipWaiting():undefined)));
// Cada release abre una caché nueva porque su nombre lleva el digest del build.
// Sin este barrido las anteriores nunca se borran y el origen acumula una copia
// completa del shell por cada versión instalada, hasta que el navegador desaloja
// el origen entero —incluida la caché vigente— por cuota.
self.addEventListener('activate',event=>event.waitUntil(
  caches.keys()
    .then(names=>Promise.all(names.filter(name=>name.startsWith(CACHE_PREFIX)&&name!==CACHE_NAME).map(name=>caches.delete(name))))
    .then(()=>self.clients.claim())
));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).then(response=>{
      if(response.ok)event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.put('./index.html',response.clone())));
      return response;
    }).catch(async()=>await caches.match('./index.html',{ignoreVary:true})||await caches.match('./',{ignoreVary:true})));
    return;
  }
  event.respondWith(caches.match(request,{ignoreVary:true}).then(cached=>cached||fetch(request).then(response=>{
    if(response.ok)event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.put(request,response.clone())));
    return response;
  })));
});`;
