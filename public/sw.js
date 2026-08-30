/* Service worker Crowdfunding Tracker — cache du shell + assets (jamais l'API).
   Sur LAN HTTP (pas de HTTPS), le navigateur ne l'enregistre pas : l'app fonctionne
   normalement sans lui ; il prend vie si l'app est servie en HTTPS. */
const CACHE = 'ct-shell-v1';
const SHELL = '/shell-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(['/', '/manifest.json', '/icon-192.png', '/icon-512.png',
        'https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.pathname.startsWith('/api/')) return; // jamais de cache sur l'API
  if (e.request.mode === 'navigate') {
    // navigation : réseau d'abord (toujours la dernière version), cache en secours
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(SHELL, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(SHELL))
    );
    return;
  }
  // assets : cache d'abord, réseau en secours puis mise en cache
  e.respondWith(
    caches.match(e.request).then(
      (hit) =>
        hit ||
        fetch(e.request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          return res;
        })
    )
  );
});
