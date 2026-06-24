/**
 * service-worker.js
 * Cachea el "app shell" para que la herramienta funcione sin conexión.
 * Los audios y metadatos viven en IndexedDB (no aquí), así que no hace
 * falta cachearlos: ya persisten en el dispositivo.
 */

const CACHE_NAME = 'ashes-audio-studio-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/taxonomy.js',
  './js/db.js',
  './js/recorder.js',
  './js/store.js',
  './js/export.js',
  './js/ui.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // Cachea silenciosamente recursos same-origin nuevos (p. ej. fuentes ya resueltas) y la lib externa JSZip,
        // para que la exportación también funcione sin conexión tras el primer uso.
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
    })
  );
});
