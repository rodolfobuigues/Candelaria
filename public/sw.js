const CACHE = 'candelaria-v1';
const BASE = '/candelaria/';

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.add(BASE)));
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (evento) => {
  if (evento.request.method !== 'GET') return;
  evento.respondWith(fetch(evento.request).then((respuesta) => {
    const copia = respuesta.clone(); caches.open(CACHE).then((cache) => cache.put(evento.request, copia)); return respuesta;
  }).catch(() => caches.match(evento.request).then((respuesta) => respuesta ?? caches.match(BASE))));
});
