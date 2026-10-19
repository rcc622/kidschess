// Offline: guarda todo al instalar; luego sirve de la caché y actualiza en segundo plano.
const CACHE = 'garabato-v6';
const FILES = [
  './', 'index.html', 'manifest.json', 'css/paper.css', 'fonts/patrick-hand.woff2', 'fonts/kalam-bold.woff2',
  'js/app.js', 'js/art.js', 'js/ink.js', 'js/animals.js', 'js/board.js', 'js/bot.js', 'js/chess.js', 'js/learn.js', 'js/sound.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  // voz de Lápiz, voces de personajes y música (ElevenLabs)
  'audio/voz/casi.mp3', 'audio/voz/como_b.mp3', 'audio/voz/como_k.mp3', 'audio/voz/como_n.mp3',
  'audio/voz/como_p.mp3', 'audio/voz/como_q.mp3', 'audio/voz/como_r.mp3', 'audio/voz/coronar.mp3',
  'audio/voz/dormido.mp3', 'audio/voz/guia_cuidado.mp3', 'audio/voz/guia_hola.mp3', 'audio/voz/guia_mate.mp3',
  'audio/voz/hola.mp3', 'audio/voz/ilegal_camino.mp3', 'audio/voz/ilegal_diagonal.mp3',
  'audio/voz/ilegal_enfrente.mp3', 'audio/voz/ilegal_enroque.mp3', 'audio/voz/ilegal_jaque.mp3',
  'audio/voz/ilegal_peligro.mp3', 'audio/voz/jaque_bot.mp3', 'audio/voz/jaque_tu.mp3', 'audio/voz/lec_0.mp3',
  'audio/voz/lec_0_bosque.mp3', 'audio/voz/lec_0_bosque_x.mp3', 'audio/voz/lec_0_dinos.mp3',
  'audio/voz/lec_0_dinos_x.mp3', 'audio/voz/lec_0_espacio.mp3', 'audio/voz/lec_0_espacio_x.mp3',
  'audio/voz/lec_0_mar.mp3', 'audio/voz/lec_0_mar_x.mp3', 'audio/voz/lec_0_robots.mp3',
  'audio/voz/lec_0_robots_x.mp3', 'audio/voz/lec_0_x.mp3', 'audio/voz/lec_1.mp3', 'audio/voz/lec_10.mp3',
  'audio/voz/lec_11.mp3', 'audio/voz/lec_1_bosque.mp3', 'audio/voz/lec_1_bosque_x.mp3',
  'audio/voz/lec_1_dinos.mp3', 'audio/voz/lec_1_dinos_x.mp3', 'audio/voz/lec_1_espacio.mp3',
  'audio/voz/lec_1_espacio_x.mp3', 'audio/voz/lec_1_mar.mp3', 'audio/voz/lec_1_mar_x.mp3',
  'audio/voz/lec_1_robots.mp3', 'audio/voz/lec_1_robots_x.mp3', 'audio/voz/lec_1_x.mp3',
  'audio/voz/lec_2.mp3', 'audio/voz/lec_2_bosque.mp3', 'audio/voz/lec_2_bosque_x.mp3',
  'audio/voz/lec_2_espacio.mp3', 'audio/voz/lec_2_espacio_x.mp3', 'audio/voz/lec_2_mar.mp3',
  'audio/voz/lec_2_mar_x.mp3', 'audio/voz/lec_2_robots.mp3', 'audio/voz/lec_2_robots_x.mp3',
  'audio/voz/lec_2_x.mp3', 'audio/voz/lec_3.mp3', 'audio/voz/lec_3_espacio.mp3',
  'audio/voz/lec_3_espacio_x.mp3', 'audio/voz/lec_3_mar.mp3', 'audio/voz/lec_3_mar_x.mp3',
  'audio/voz/lec_3_robots.mp3', 'audio/voz/lec_3_robots_x.mp3', 'audio/voz/lec_3_x.mp3',
  'audio/voz/lec_4.mp3', 'audio/voz/lec_4_bosque.mp3', 'audio/voz/lec_4_bosque_x.mp3',
  'audio/voz/lec_4_dinos.mp3', 'audio/voz/lec_4_dinos_x.mp3', 'audio/voz/lec_4_mar.mp3',
  'audio/voz/lec_4_mar_x.mp3', 'audio/voz/lec_4_robots.mp3', 'audio/voz/lec_4_robots_x.mp3',
  'audio/voz/lec_4_x.mp3', 'audio/voz/lec_5.mp3', 'audio/voz/lec_5_bosque.mp3',
  'audio/voz/lec_5_bosque_x.mp3', 'audio/voz/lec_5_mar.mp3', 'audio/voz/lec_5_mar_x.mp3',
  'audio/voz/lec_5_robots.mp3', 'audio/voz/lec_5_robots_x.mp3', 'audio/voz/lec_5_x.mp3',
  'audio/voz/lec_6.mp3', 'audio/voz/lec_6_x.mp3', 'audio/voz/lec_7.mp3', 'audio/voz/lec_8.mp3',
  'audio/voz/lec_9.mp3', 'audio/voz/mate_azul.mp3', 'audio/voz/mate_bot.mp3', 'audio/voz/mate_ganaste.mp3',
  'audio/voz/mate_rojo.mp3', 'audio/voz/nam.mp3', 'audio/voz/pista.mp3', 'audio/voz/solo_rey_bot.mp3',
  'audio/voz/solo_rey_pareja.mp3', 'audio/voz/solo_rey_tu.mp3', 'audio/voz/tablas.mp3',
  'audio/voz/tablas_jugadas.mp3', 'audio/voz/te_toca.mp3', 'audio/voz/tema_bosque.mp3',
  'audio/voz/tema_dinos.mp3', 'audio/voz/tema_espacio.mp3', 'audio/voz/tema_garabato.mp3',
  'audio/voz/tema_mar.mp3', 'audio/voz/tema_robots.mp3', 'audio/voz/turno_azul.mp3',
  'audio/voz/turno_rojo.mp3', 'audio/voz/win_castle.mp3', 'audio/voz/win_check.mp3', 'audio/voz/win_eat.mp3',
  'audio/voz/win_ep.mp3', 'audio/voz/win_mate.mp3', 'audio/voz/win_promote.mp3', 'audio/sfx/ay.mp3',
  'audio/sfx/b.mp3', 'audio/sfx/bosque_b.mp3', 'audio/sfx/bosque_k.mp3', 'audio/sfx/bosque_p.mp3',
  'audio/sfx/bosque_q.mp3', 'audio/sfx/bosque_r.mp3', 'audio/sfx/k.mp3', 'audio/sfx/mar_b.mp3',
  'audio/sfx/mar_k.mp3', 'audio/sfx/mar_n.mp3', 'audio/sfx/mar_p.mp3', 'audio/sfx/mar_q.mp3',
  'audio/sfx/mar_r.mp3', 'audio/sfx/n.mp3', 'audio/sfx/p.mp3', 'audio/sfx/q.mp3', 'audio/sfx/r.mp3',
  'audio/sfx/robots_k.mp3', 'audio/musica/calma.mp3', 'audio/musica/tension.mp3', 'audio/musica/victoria.mp3',
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
