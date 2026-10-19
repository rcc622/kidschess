// Offline: guarda todo al instalar; luego sirve de la caché y actualiza en segundo plano.
const CACHE = 'garabato-v7';
const FILES = [
  './', 'index.html', 'manifest.json', 'css/paper.css', 'fonts/patrick-hand.woff2', 'fonts/kalam-bold.woff2',
  'js/app.js', 'js/art.js', 'js/ink.js', 'js/animals.js', 'js/board.js', 'js/bot.js', 'js/chess.js', 'js/learn.js', 'js/sound.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  // voces de personajes y música
  'audio/sfx/ay.mp3', 'audio/sfx/b.mp3', 'audio/sfx/bosque_b.mp3', 'audio/sfx/bosque_k.mp3',
  'audio/sfx/bosque_p.mp3', 'audio/sfx/bosque_q.mp3', 'audio/sfx/bosque_r.mp3', 'audio/sfx/k.mp3',
  'audio/sfx/mar_b.mp3', 'audio/sfx/mar_k.mp3', 'audio/sfx/mar_n.mp3', 'audio/sfx/mar_p.mp3',
  'audio/sfx/mar_q.mp3', 'audio/sfx/mar_r.mp3', 'audio/sfx/n.mp3', 'audio/sfx/p.mp3', 'audio/sfx/q.mp3',
  'audio/sfx/r.mp3', 'audio/sfx/robots_k.mp3', 'audio/musica/calma.mp3', 'audio/musica/tension.mp3',
  'audio/musica/victoria.mp3',
];

// frases de Lápiz (audio/voz/<mujer|hombre>/<clave>.mp3): solo se guarda la voz elegida, la app avisa cuál
const VOZ = [
  'casi', 'clasico_hola', 'como_b', 'como_k', 'como_n', 'como_p', 'como_q', 'como_r', 'coronar', 'dormido',
  'guia_cuidado', 'guia_hola', 'guia_mate', 'hola', 'ilegal_camino', 'ilegal_diagonal', 'ilegal_enfrente',
  'ilegal_enroque', 'ilegal_jaque', 'ilegal_peligro', 'jaque_bot', 'jaque_tu', 'lec_0', 'lec_0_bosque',
  'lec_0_bosque_x', 'lec_0_clasicas', 'lec_0_clasicas_x', 'lec_0_dinos', 'lec_0_dinos_x', 'lec_0_espacio',
  'lec_0_espacio_x', 'lec_0_mar', 'lec_0_mar_x', 'lec_0_robots', 'lec_0_robots_x', 'lec_0_x', 'lec_1',
  'lec_10', 'lec_11', 'lec_1_bosque', 'lec_1_bosque_x', 'lec_1_clasicas', 'lec_1_clasicas_x', 'lec_1_dinos',
  'lec_1_dinos_x', 'lec_1_espacio', 'lec_1_espacio_x', 'lec_1_mar', 'lec_1_mar_x', 'lec_1_robots',
  'lec_1_robots_x', 'lec_1_x', 'lec_2', 'lec_2_bosque', 'lec_2_bosque_x', 'lec_2_clasicas',
  'lec_2_clasicas_x', 'lec_2_dinos', 'lec_2_dinos_x', 'lec_2_espacio', 'lec_2_espacio_x', 'lec_2_mar',
  'lec_2_mar_x', 'lec_2_robots', 'lec_2_robots_x', 'lec_2_x', 'lec_3', 'lec_3_clasicas', 'lec_3_clasicas_x',
  'lec_3_dinos', 'lec_3_dinos_x', 'lec_3_espacio', 'lec_3_espacio_x', 'lec_3_mar', 'lec_3_mar_x',
  'lec_3_robots', 'lec_3_robots_x', 'lec_3_x', 'lec_4', 'lec_4_bosque', 'lec_4_bosque_x', 'lec_4_clasicas',
  'lec_4_clasicas_x', 'lec_4_dinos', 'lec_4_dinos_x', 'lec_4_espacio', 'lec_4_espacio_x', 'lec_4_mar',
  'lec_4_mar_x', 'lec_4_robots', 'lec_4_robots_x', 'lec_4_x', 'lec_5', 'lec_5_bosque', 'lec_5_bosque_x',
  'lec_5_clasicas', 'lec_5_clasicas_x', 'lec_5_dinos', 'lec_5_dinos_x', 'lec_5_espacio', 'lec_5_espacio_x',
  'lec_5_mar', 'lec_5_mar_x', 'lec_5_robots', 'lec_5_robots_x', 'lec_5_x', 'lec_6', 'lec_6_x', 'lec_7',
  'lec_8', 'lec_9', 'mate_azul', 'mate_blancas', 'mate_bot', 'mate_ganaste', 'mate_morado', 'mate_naranja',
  'mate_negras', 'mate_rojo', 'nam', 'pista', 'poco_tiempo', 'solo_rey_bot', 'solo_rey_pareja', 'solo_rey_tu',
  'tablas', 'tablas_jugadas', 'te_toca', 'tema_bosque', 'tema_clasicas', 'tema_dinos', 'tema_espacio',
  'tema_garabato', 'tema_mar', 'tema_robots', 'tiempo_azul', 'tiempo_blancas', 'tiempo_bot', 'tiempo_ganaste',
  'tiempo_morado', 'tiempo_naranja', 'tiempo_negras', 'tiempo_rojo', 'tiempo_tablas', 'turno_azul',
  'turno_blancas', 'turno_morado', 'turno_naranja', 'turno_negras', 'turno_rojo', 'win_castle', 'win_check',
  'win_eat', 'win_ep', 'win_mate', 'win_promote',
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

self.addEventListener('message', e => {
  const voz = e.data?.voz;
  if (voz !== 'mujer' && voz !== 'hombre') return;
  e.waitUntil(caches.open(CACHE).then(async cache => {
    for (const k of VOZ) {
      const url = `audio/voz/${voz}/${k}.mp3`;
      if (!(await cache.match(url))) await cache.add(url).catch(() => {});
    }
  }));
});
