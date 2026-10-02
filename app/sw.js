/* Service worker: funciona sin conexión tras la primera visita. */
const VERSION = 'cronica-v1';
const SHELL = [
  './', 'index.html', 'css/style.css', 'data/gamedata.js', 'js/calc.js', 'js/effects.js',
  'js/model.js', 'js/advisor.js', 'js/app.js', 'manifest.webmanifest', 'icons/icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== 'cronica-img').map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'api.anthropic.com') return;
  // Iconos del juego y fuentes: caché primero.
  if (req.destination === 'image' || url.hostname.includes('fonts.g')) {
    e.respondWith(caches.open('cronica-img').then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    }).catch(() => fetch(req)));
    return;
  }
  // Archivos de la app: red primero, caché si no hay conexión.
  if (url.origin === location.origin) {
    e.respondWith(fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req)));
  }
});
