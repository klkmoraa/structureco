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
const createCacheStorage = (initialNames = []) => {
  const stores = new Map(initialNames.map((name) => [name, new Map()]));
  return {
    stores,
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); },
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        async addAll(requests) { for (const request of requests) store.set(request, { ok: true }); },
        async put(request, response) { store.set(typeof request === 'string' ? request : request.url, response); },
        async match(request) { return store.get(typeof request === 'string' ? request : request.url); },
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
const loadWorker = ({ cacheName, assets = ['./index.html', './assets/app.js'], caches = createCacheStorage(), hasActiveWorker = false } = {}) => {
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
  const context = vm.createContext({ self, caches, URL, fetch: async () => ({ ok: true }), Promise, Boolean, console });
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

test('activate borra las cachés de releases anteriores y conserva la vigente', async () => {
  const cacheName = cacheNameFor('nueva');
  const caches = createCacheStorage([cacheNameFor('vieja1'), cacheNameFor('vieja2'), cacheName]);
  const { listeners, claimed } = loadWorker({ cacheName, caches });
  const event = createEvent();
  listeners.get('activate')(event);
  await event.settle();
  assert.deepEqual(await caches.keys(), [cacheName]);
  assert.equal(claimed.count, 1);
});

test('activate no toca cachés que no son del shell', async () => {
  const cacheName = cacheNameFor('nueva');
  const ajena = 'otra-app-v1';
  const caches = createCacheStorage([ajena, cacheNameFor('vieja'), cacheName]);
  const { listeners } = loadWorker({ cacheName, caches });
  const event = createEvent();
  listeners.get('activate')(event);
  await event.settle();
  assert.deepEqual((await caches.keys()).sort(), [cacheName, ajena].sort());
  assert.ok(cacheName.startsWith(CACHE_PREFIX));
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
