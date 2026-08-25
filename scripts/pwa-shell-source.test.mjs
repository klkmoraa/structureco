/**
 * Contrato del service worker generado en `dist/sw.js`.
 *
 * La fuente se evalúa contra un `self`/`caches` falso: no hace falta construir
 * la aplicación ni levantar un navegador para demostrar que install precachea
 * el shell, que activate borra las cachés de releases anteriores y sólo esas, y
 * que fetch no intercepta peticiones ajenas al origen.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { CACHE_PREFIX, cacheNameFor, createServiceWorkerSource } from './pwa-shell-source.mjs';

const ORIGIN = 'https://structureco.test';

/** Doble mínimo de CacheStorage: sólo lo que usa el worker. */
const createCacheStorage = (initialNames = [], { failAddAll = false, empty = [] } = {}) => {
  // Una caché instalada tiene contenido; sólo las de un install fallido quedan
  // vacías, y esa diferencia es justo lo que decide a quién conserva el barrido.
  const stores = new Map(initialNames.map((name) => [
    name,
    new Map(empty.includes(name) ? [] : [['./index.html', { ok: true, from: name }]]),
  ]));
  return {
    stores,
    async keys() { return [...stores.keys()]; },
    async has(name) { return stores.has(name); },
    async delete(name) { return stores.delete(name); },
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        // `addAll` es atómico por especificación: si una petición falla no se
        // añade ninguna entrada, y la caché recién abierta queda vacía.
        async addAll(requests) {
          if (failAddAll) throw new Error('red caída a mitad de la instalación');
          for (const request of requests) store.set(request, { ok: true });
        },
        async put(request, response) { store.set(typeof request === 'string' ? request : request.url, response); },
        async match(request) { return store.get(typeof request === 'string' ? request : request.url); },
        async keys() { return [...store.keys()]; },
      };
    },
    async match(request) {
      const key = typeof request === 'string' ? request : request.url;
      for (const store of stores.values()) if (store.has(key)) return store.get(key);
      return undefined;
    },
  };
};

/**
 * Evalúa la fuente y devuelve los oyentes registrados junto con los dobles, de
 * modo que cada prueba dispare el evento que le interesa.
 */
const loadWorker = ({ cacheName, assets = ['./index.html', './assets/app.js'], caches = createCacheStorage(), hasActiveWorker = false, networkFails = false } = {}) => {
  const listeners = new Map();
  const claimed = { count: 0 };
  const skipped = { count: 0 };
  const self = {
    location: { origin: ORIGIN },
    registration: { active: hasActiveWorker ? {} : null },
    clients: { claim: async () => { claimed.count += 1; } },
    skipWaiting: () => { skipped.count += 1; },
    addEventListener: (type, listener) => listeners.set(type, listener),
  };
  const context = vm.createContext({ self, caches, URL, fetch: networkFails ? async () => { throw new Error('sin red'); } : async () => ({ ok: true }), Promise, Boolean, console });
  vm.runInContext(createServiceWorkerSource({ cacheName, assets }), context);
  return { listeners, caches, claimed, skipped };
};

/** `waitUntil`/`respondWith` sólo tienen que retener la promesa para poder esperarla. */
const createEvent = (extra = {}) => {
  const pending = [];
  return {
    ...extra,
    pending,
    waitUntil: (promise) => pending.push(promise),
    respondWith: (promise) => pending.push(promise),
    settle: () => Promise.all(pending),
  };
};

test('la fuente generada es JavaScript válido', () => {
  // La fuente se construye con un template literal, así que un backtick o un
  // `${` dentro de un comentario lo cierra a media línea y publica un worker
  // roto. En el navegador eso sólo se nota cuando el registro falla; aquí
  // `new vm.Script` lo rechaza al construirlo.
  const source = createServiceWorkerSource({ cacheName: cacheNameFor('abc123'), assets: ['./index.html'] });
  assert.doesNotThrow(() => new vm.Script(source));
});

test('install precachea el shell completo en la caché de esta release', async () => {
  const cacheName = cacheNameFor('abc123');
  const { listeners, caches } = loadWorker({ cacheName, assets: ['./index.html', './assets/app.js'] });
  const event = createEvent();
  listeners.get('install')(event);
  await event.settle();
  assert.deepEqual([...caches.stores.get(cacheName).keys()], ['./index.html', './assets/app.js']);
});

test('la primera instalación espera y una actualización toma el control', async () => {
  for (const [hasActiveWorker, expected] of [[false, 0], [true, 1]]) {
    const { listeners, skipped } = loadWorker({ cacheName: cacheNameFor('abc123'), hasActiveWorker });
    const event = createEvent();
    listeners.get('install')(event);
    await event.settle();
    assert.equal(skipped.count, expected);
  }
});

test('activate borra las releases viejas y conserva la vigente y la anterior', async () => {
  // La anterior se conserva a propósito: `install` hace `skipWaiting()`, así que
  // este worker controla pestañas que siguen mostrando el documento previo y que
  // aún pedirán chunks perezosos con el hash de esa release. Borrar su caché las
  // dejaría sin ninguna fuente, porque el servidor ya sólo publica el build nuevo.
  const cacheName = cacheNameFor('nueva');
  const anterior = cacheNameFor('anterior');
  // El orden de `keys()` es el de creación: `anterior` es la última que no es la vigente.
  const caches = createCacheStorage([cacheNameFor('vieja1'), cacheNameFor('vieja2'), anterior, cacheName]);
  const { listeners, claimed } = loadWorker({ cacheName, caches });
  const event = createEvent();
  listeners.get('activate')(event);
  await event.settle();
  assert.deepEqual((await caches.keys()).sort(), [anterior, cacheName].sort());
  assert.equal(claimed.count, 1);
});

test('la caché conservada sigue sirviendo los chunks de la release anterior', async () => {
  const cacheName = cacheNameFor('nueva');
  const anterior = cacheNameFor('anterior');
  const caches = createCacheStorage([anterior, cacheName]);
  const chunkViejo = `${ORIGIN}/assets/WorkspaceShell-VIEJO.js`;
  (await caches.open(anterior)).put(chunkViejo, { ok: true, deLaAnterior: true });
  const { listeners } = loadWorker({ cacheName, caches });

  const activate = createEvent();
  listeners.get('activate')(activate);
  await activate.settle();

  const fetchEvent = createEvent({ request: { method: 'GET', url: chunkViejo, mode: 'cors' } });
  listeners.get('fetch')(fetchEvent);
  const [response] = await fetchEvent.settle();
  assert.equal(response.deLaAnterior, true);
});

test('con una sola release instalada no se borra nada', async () => {
  const cacheName = cacheNameFor('unica');
  const caches = createCacheStorage([cacheName]);
  const { listeners } = loadWorker({ cacheName, caches });
  const event = createEvent();
  listeners.get('activate')(event);
  await event.settle();
  assert.deepEqual(await caches.keys(), [cacheName]);
});

test('activate no toca cachés que no son del shell', async () => {
  const cacheName = cacheNameFor('nueva');
  const ajena = 'otra-app-v1';
  const caches = createCacheStorage([ajena, cacheNameFor('vieja1'), cacheNameFor('vieja2'), cacheName]);
  const { listeners } = loadWorker({ cacheName, caches });
  const event = createEvent();
  listeners.get('activate')(event);
  await event.settle();
  // `vieja2` sobrevive por ser la anterior; `ajena` por no llevar el prefijo.
  assert.deepEqual((await caches.keys()).sort(), [cacheName, cacheNameFor('vieja2'), ajena].sort());
  assert.ok(cacheName.startsWith(CACHE_PREFIX));
});

test('un install fallido de la MISMA release conserva la caché ya poblada', async () => {
  // `vite.config.ts` deja `sw.js` fuera del digest, así que una actualización que
  // sólo cambia este worker reutiliza `CACHE_NAME` y abre la caché desde la que
  // está sirviendo la release activa. Borrarla ante un `addAll` fallido destruiría
  // el shell offline vivo.
  const cacheName = cacheNameFor('misma');
  const caches = createCacheStorage([cacheName], { failAddAll: true });
  const { listeners } = loadWorker({ cacheName, caches, hasActiveWorker: true });
  const event = createEvent();
  listeners.get('install')(event);
  await assert.rejects(event.settle(), /red caída/);
  assert.deepEqual(await caches.keys(), [cacheName]);
  assert.deepEqual([...caches.stores.get(cacheName).keys()], ['./index.html']);
});

test('un install fallido no deja su caché vacía atrás', async () => {
  const cacheName = cacheNameFor('fallida');
  const caches = createCacheStorage([], { failAddAll: true });
  const { listeners, skipped } = loadWorker({ cacheName, caches, hasActiveWorker: true });
  const event = createEvent();
  listeners.get('install')(event);
  await assert.rejects(event.settle(), /red caída/);
  // La caché se retira y el install sigue fallando: el worker no debe activarse.
  assert.deepEqual(await caches.keys(), []);
  assert.equal(skipped.count, 0);
});

test('una caché vacía no cuenta como la release anterior', async () => {
  // Si un install intermedio falló y su caché sobrevive —por ejemplo porque el
  // navegador se cerró antes del `catch`—, tomarla por la anterior borraría la
  // release real y dejaría sin chunks a las pestañas que siguen en ella.
  const cacheName = cacheNameFor('nueva');
  const real = cacheNameFor('anterior-real');
  const fallida = cacheNameFor('install-fallido');
  const caches = createCacheStorage([cacheNameFor('vieja'), real, fallida, cacheName], { empty: [fallida] });
  const { listeners } = loadWorker({ cacheName, caches });
  const event = createEvent();
  listeners.get('activate')(event);
  await event.settle();
  assert.deepEqual((await caches.keys()).sort(), [cacheName, real].sort());
});

test('la release vigente responde antes que la conservada en una URL estable', async () => {
  // `caches.match` global recorre las cachés en orden de CREACIÓN, así que la
  // anterior —creada antes— ganaría para index.html, el manifiesto, el favicon y
  // las fuentes, y una navegación sin red serviría la release anterior para siempre.
  const cacheName = cacheNameFor('nueva');
  const anterior = cacheNameFor('anterior');
  const caches = createCacheStorage([anterior, cacheName]);
  (await caches.open(anterior)).put('./index.html', { ok: true, from: 'anterior' });
  (await caches.open(cacheName)).put('./index.html', { ok: true, from: 'nueva' });
  const { listeners } = loadWorker({ cacheName, caches, networkFails: true });

  const event = createEvent({ request: { method: 'GET', url: `${ORIGIN}/index.html`, mode: 'navigate' } });
  listeners.get('fetch')(event);
  // La navegación es network-first; el doble de `fetch` falla para forzar el respaldo.
  const [response] = await event.settle();
  assert.equal(response.from, 'nueva');
});

test('fetch ignora otros orígenes y los métodos que no son GET', () => {
  const { listeners } = loadWorker({ cacheName: cacheNameFor('abc123') });
  for (const request of [
    { method: 'POST', url: `${ORIGIN}/api`, mode: 'cors' },
    { method: 'GET', url: 'https://otro.test/x.js', mode: 'cors' },
  ]) {
    const event = createEvent({ request });
    listeners.get('fetch')(event);
    assert.equal(event.pending.length, 0);
  }
});

test('fetch responde una petición del origen desde la caché del shell', async () => {
  const cacheName = cacheNameFor('abc123');
  const caches = createCacheStorage();
  const { listeners } = loadWorker({ cacheName, caches });
  const install = createEvent();
  listeners.get('install')(install);
  await install.settle();
  (await caches.open(cacheName)).put(`${ORIGIN}/assets/app.js`, { ok: true, cached: true });

  const event = createEvent({ request: { method: 'GET', url: `${ORIGIN}/assets/app.js`, mode: 'cors' } });
  listeners.get('fetch')(event);
  const [response] = await event.settle();
  assert.equal(response.cached, true);
});
