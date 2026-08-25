/**
 * Fuente del service worker que `vite.config.ts` escribe en `dist/sw.js`.
 *
 * Vive en su propio módulo —y no incrustada en la configuración de build—
 * porque es código de producción que corre en el navegador de cada usuario y
 * hasta ahora no tenía forma de probarse: `scripts/pwa-shell-source.test.mjs`
 * la evalúa contra un `self`/`caches` falso y comprueba install, activate y
 * fetch sin construir la aplicación.
 *
 * ## Por qué el barrido de cachés conserva la release anterior
 *
 * Cada release abre su propia caché porque el nombre lleva el digest del build.
 * Sin barrido, el origen acumula una copia completa del shell (~14 MB) por cada
 * versión instalada, hasta que el navegador desaloja el origen entero —incluida
 * la caché vigente y el shell offline— por cuota.
 *
 * Pero el barrido no puede llegar hasta la vigente. `install` llama a
 * `skipWaiting()` en una actualización, así que el worker nuevo toma el control
 * de pestañas que siguen mostrando el documento anterior. Ese documento pide
 * chunks perezosos con el hash de SU release —las superficies que
 * `WorkspaceShell` importa bajo demanda— y esos archivos ya no están en el
 * servidor, que publica sólo el build vigente. Borrar su caché las deja sin
 * ninguna fuente y la superficie no carga. El `controllerchange` de
 * `PwaUpdateNotice` recarga esas pestañas, pero no de forma instantánea y no si
 * el dispositivo está sin red.
 *
 * Por eso se conserva la release inmediatamente anterior: el crecimiento queda
 * acotado en dos generaciones en vez de ser ilimitado, y una pestaña abierta
 * durante una actualización sigue encontrando sus chunks, porque `caches.match`
 * busca en todas las cachés del origen y no sólo en la vigente. Una pestaña que
 * sobreviva a DOS actualizaciones sin recargar sí pierde su caché; ese es el
 * límite explícito de esta política.
 *
 * «La anterior» es la que se activó más recientemente, no la que se creó
 * después. La diferencia importa en cuanto hay un rollback: volver a publicar
 * una release reutiliza su caché, y `caches.open` no mueve un nombre existente
 * al final de `keys()`. Tras A → B → rollback a A → C, el orden de creación
 * sigue siendo [A, B] mientras que la release que corren las pestañas abiertas
 * es A. Por eso cada caché anota su instante de activación.
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
// caches.open() creates the cache before addAll runs, and addAll is atomic: a
// rejected install therefore leaves an EMPTY cache behind. Delete it, or the next
// sweep would mistake it for the previous release and drop the real one.
//
// Only when WE created it, though. vite.config.ts leaves sw.js out of the release
// digest, so an update that changes nothing but this worker reuses the active
// CACHE_NAME and opens the cache the running release is serving from. Deleting
// that on a failed addAll would destroy the live offline shell.
self.addEventListener('install',event=>event.waitUntil(
  caches.has(CACHE_NAME).then(existed=>caches.open(CACHE_NAME)
    .then(cache=>cache.addAll(SHELL))
    .catch(error=>(existed?Promise.resolve():caches.delete(CACHE_NAME)).then(()=>{throw error;})))
    .then(()=>HAS_ACTIVE_WORKER?self.skipWaiting():undefined)
));
// Each release opens its own cache (the name carries the build digest). Without a
// sweep the origin accumulates one full copy of the shell per installed version.
// The immediately previous release is deliberately kept alive: see the module
// JSDoc in scripts/pwa-shell-source.mjs for why deleting it breaks open tabs.
// Each cache records WHEN it was activated, because creation order is not the
// same thing. Rolling a release back reuses its existing cache: caches.open()
// does not move an existing name to the end of keys(). After A -> B -> rollback
// to A -> C, keys() still reads [A, B] while the release the open tabs actually
// run is A. Picking the last created would keep B and delete A, stranding them.
// During the rollout of the stamp itself the same trap has a second shape: a
// rollback to a PRE-stamp release runs a worker that cannot stamp, so that cache
// stays unstamped while a newer one outranks it. Unstamped caches therefore keep
// one slot of their own until none are left.
const ACTIVATED_AT='./__structureco-activated__';
self.addEventListener('activate',event=>event.waitUntil(
  caches.keys()
    .then(names=>{
      const shells=names.filter(name=>name.startsWith(CACHE_PREFIX)&&name!==CACHE_NAME);
      // An empty cache is a release whose install never completed. It must not be
      // taken for the previous release: doing so would delete the real one and
      // strand the tabs still running it, which is the whole point of retaining one.
      return Promise.all(shells.map(name=>caches.open(name)
        .then(cache=>Promise.all([cache.keys(),cache.match(ACTIVATED_AT)]))
        .then(([entries,stamp])=>Promise.resolve(stamp?stamp.text():'0')
          .then(text=>({name:name,filled:entries.length>0,activatedAt:Number(text)||0})))));
    })
    .then(inspected=>{
      const filled=inspected.filter(entry=>entry.filled);
      // The previous release is the one activated most recently, among those that
      // carry a stamp.
      const stamped=filled.filter(entry=>entry.activatedAt>0)
        .reduce((best,entry)=>!best||entry.activatedAt>=best.activatedAt?entry:best,null);
      // An unstamped cache predates this scheme, and during the rollout it can be
      // the one the open tabs are running: rolling back to such a release runs a
      // worker that cannot stamp anything, so it stays at zero while a NEWER
      // stamped cache outranks it. Keep the last created of them until they are
      // gone — three generations at most while migrating, two from then on.
      const legacy=filled.filter(entry=>entry.activatedAt===0).pop();
      const keep=[stamped,legacy].filter(Boolean);
      return Promise.all(inspected.filter(entry=>keep.indexOf(entry)<0).map(entry=>caches.delete(entry.name)));
    })
    .then(()=>caches.open(CACHE_NAME).then(cache=>cache.put(ACTIVATED_AT,new Response(String(Date.now())))))
    .then(()=>self.clients.claim())
));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
// The current release answers first. A bare caches.match() searches every cache of
// the origin in CREATION order, so the retained previous release —created earlier—
// would win for every stable URL it also holds: index.html, the manifest, the
// favicon, the fonts. Offline navigation would then serve the previous release
// forever. Older caches are still consulted, but only for what the current release
// does not have: the hashed lazy chunks a tab from that release still asks for.
const matchCache=request=>caches.open(CACHE_NAME)
  .then(cache=>cache.match(request,{ignoreVary:true}))
  .then(hit=>hit||caches.match(request,{ignoreVary:true}));
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).then(response=>{
      if(response.ok)event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.put('./index.html',response.clone())));
      return response;
    }).catch(async()=>await matchCache('./index.html')||await matchCache('./')));
    return;
  }
  event.respondWith(matchCache(request).then(cached=>cached||fetch(request).then(response=>{
    if(response.ok)event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.put(request,response.clone())));
    return response;
  })));
});`;
