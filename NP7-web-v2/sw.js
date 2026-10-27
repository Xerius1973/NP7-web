/* NP7 — service worker v17 : fonctionnement hors ligne */
const CACHE = 'np7-v17';
const CORE = ['./', './index.html', './np7.css', './np7-ui.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/favicon.svg',
  './public/data/ciqual2025.json', './public/data/restaurants_france.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return; // API (Supabase, Open Food Facts) : réseau uniquement
  const isData = url.pathname.includes('/data/');
  if (isData) { // données volumineuses : cache d'abord
    e.respondWith(caches.match(req).then(c => c || fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(x => x.put(req, cp)); return r; })));
    return;
  }
  // pages, CSS, JS : réseau d'abord (mises à jour immédiates), cache en secours hors ligne
  e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(x => x.put(req, cp)); return r; })
    .catch(() => caches.match(req).then(c => c || caches.match('./index.html'))));
});
