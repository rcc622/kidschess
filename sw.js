// Offline: guarda todo al instalar; luego sirve de la caché y actualiza en segundo plano.
const CACHE = 'garabato-v2';
const FILES = [
  './', 'index.html', 'manifest.json', 'css/paper.css', 'fonts/patrick-hand.woff2', 'fonts/kalam-bold.woff2',
  'js/app.js', 'js/art.js', 'js/board.js', 'js/bot.js', 'js/chess.js', 'js/learn.js', 'js/sound.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(res => {
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    }).catch(() => hit);
    if (hit) { e.waitUntil(net); return hit; }
    return net;
  }));
});
