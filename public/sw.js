const CACHE = 'candelaria-v4';
const BASE = '/Candelaria/';
const INICIALES = [BASE, `${BASE}manifest.webmanifest`, `${BASE}icono-candelaria.svg`, `${BASE}icono-candelaria-maskable.svg`];

async function guardarVersionActual() {
  const cache = await caches.open(CACHE);
  const respuestaHtml = await fetch(BASE, { cache: 'reload' });
  await cache.put(BASE, respuestaHtml.clone());
  const html = await respuestaHtml.text();
  const version = await fetch(`${BASE}recursos-pwa.json`, { cache: 'reload' });
  await cache.put(`${BASE}recursos-pwa.json`, version.clone());
  const empaquetados = await version.json();
  const recursos = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((coincidencia) => new URL(coincidencia[1], self.location.origin))
    .filter((url) => url.origin === self.location.origin && url.pathname.startsWith(BASE))
    .map((url) => url.href);
  const locales = empaquetados.filter((ruta) => /^assets\/[\w.-]+\.(js|css|woff2)$/.test(ruta)).map((ruta) => `${BASE}${ruta}`);
  await cache.addAll([...new Set([...INICIALES.slice(1), ...recursos, ...locales])]);
}

self.addEventListener('install', (evento) => {
  evento.waitUntil(guardarVersionActual());
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then((claves) => Promise.all(claves.filter((clave) => clave !== CACHE).map((clave) => caches.delete(clave)))),
  ]));
});

self.addEventListener('message', (evento) => {
  if (evento.data?.tipo === 'ACTIVAR_ACTUALIZACION') self.skipWaiting();
});

self.addEventListener('fetch', (evento) => {
  if (evento.request.method !== 'GET') return;
  if (new URL(evento.request.url).origin !== self.location.origin) return;
  evento.respondWith(fetch(evento.request).then((respuesta) => {
    const copia = respuesta.clone(); caches.open(CACHE).then((cache) => cache.put(evento.request, copia)); return respuesta;
  }).catch(() => caches.match(evento.request).then((respuesta) => respuesta ?? caches.match(BASE))));
});
