// Offline: guarda todo al instalar; luego sirve de la caché y actualiza en segundo plano.
const CACHE = 'garabato-v3';
const FILES = [
  './', 'index.html', 'manifest.json', 'css/paper.css', 'fonts/patrick-hand.woff2', 'fonts/kalam-bold.woff2',
  'js/app.js', 'js/art.js', 'js/board.js', 'js/bot.js', 'js/chess.js', 'js/learn.js', 'js/sound.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  // voz de Lápiz, voces de personajes y música (ElevenLabs)
  'audio/voz/casi.mp3', 'audio/voz/como_b.mp3', 'audio/voz/como_k.mp3', 'audio/voz/como_n.mp3',
  'audio/voz/como_p.mp3', 'audio/voz/como_q.mp3', 'audio/voz/como_r.mp3', 'audio/voz/coronar.mp3',
  'audio/voz/dormido.mp3', 'audio/voz/hola.mp3', 'audio/voz/ilegal_camino.mp3',
  'audio/voz/ilegal_diagonal.mp3', 'audio/voz/ilegal_enfrente.mp3', 'audio/voz/ilegal_enroque.mp3',
  'audio/voz/ilegal_jaque.mp3', 'audio/voz/ilegal_peligro.mp3', 'audio/voz/jaque_bot.mp3',
  'audio/voz/jaque_tu.mp3', 'audio/voz/lec_0.mp3', 'audio/voz/lec_1.mp3', 'audio/voz/lec_10.mp3',
  'audio/voz/lec_11.mp3', 'audio/voz/lec_2.mp3', 'audio/voz/lec_3.mp3', 'audio/voz/lec_4.mp3',
  'audio/voz/lec_5.mp3', 'audio/voz/lec_6.mp3', 'audio/voz/lec_7.mp3', 'audio/voz/lec_8.mp3',
  'audio/voz/lec_9.mp3', 'audio/voz/mate_azul.mp3', 'audio/voz/mate_bot.mp3', 'audio/voz/mate_ganaste.mp3',
  'audio/voz/mate_rojo.mp3', 'audio/voz/nam.mp3', 'audio/voz/pista.mp3', 'audio/voz/tablas.mp3',
  'audio/voz/te_toca.mp3', 'audio/voz/turno_azul.mp3', 'audio/voz/turno_rojo.mp3',
  'audio/voz/win_castle.mp3', 'audio/voz/win_check.mp3', 'audio/voz/win_eat.mp3', 'audio/voz/win_ep.mp3',
  'audio/voz/win_mate.mp3', 'audio/voz/win_promote.mp3', 'audio/sfx/ay.mp3', 'audio/sfx/b.mp3',
  'audio/sfx/k.mp3', 'audio/sfx/n.mp3', 'audio/sfx/p.mp3', 'audio/sfx/q.mp3', 'audio/sfx/r.mp3',
  'audio/musica/calma.mp3', 'audio/musica/tension.mp3', 'audio/musica/victoria.mp3',
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
