// Todo lo "dibujado a mano": trazos temblorosos, piezas-personaje, marcas, doodles e íconos.
// Cada dibujo se hornea en 3 frames con temblor distinto; CSS los alterna (animación "boil").

export const INK = { w: '#1f3a93', b: '#a4161a' };
export const TINT = { w: '#d6e0f5', b: '#f6d3cb' };
export const PAPER = '#fffcf3';
export const PENCIL = '#555';
const FRAMES = 3;

// PRNG con semilla: el mismo dibujo sale igual en cada render
function rng(seed) {
  let s = (seed % 2147483646) + 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
const hash = str => [...str].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 1e9, 7);
const f = n => Math.round(n * 10) / 10;

// mueve cada número del path un poquito → nunca líneas perfectas
function wob(d, r, amt = 1.1) {
  return d.replace(/-?\d*\.?\d+/g, n => f(+n + (r() - 0.5) * 2 * amt));
}

// Catmull-Rom → Bézier
function smooth(p) {
  let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

// círculo hecho a mano; over > 0 = se pasa del inicio como cuando uno cierra un círculo con pluma
export function blob(cx, cy, rx, ry, r, amt = 0.06, over = 0, n = 9) {
  const a0 = r() * Math.PI * 2, ks = Array.from({ length: n }, () => 1 + (r() - 0.5) * 2 * amt), pts = [];
  const total = n + Math.round(n * over);
  for (let i = 0; i <= total; i++) {
    const a = a0 + (i / n) * Math.PI * 2, k = ks[i % n] * (1 + (over ? 0.05 * i / n : 0));
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return smooth(pts);
}

export function line(x1, y1, x2, y2, r, amt = 1.5) {
  const j = () => (r() - 0.5) * 2 * amt;
  return `M${f(x1 + j())} ${f(y1 + j())}Q${f((x1 + x2) / 2 + j() * 1.5)} ${f((y1 + y2) / 2 + j() * 1.5)} ${f(x2 + j())} ${f(y2 + j())}`;
}

function star(cx, cy, R) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, k = i % 2 ? R * 0.45 : R;
    d += `${i ? 'L' : 'M'}${f(cx + Math.cos(a) * k)} ${f(cy + Math.sin(a) * k)}`;
  }
  return d + 'Z';
}

function petal(cx, cy, len, w, ang) {
  const c = Math.cos(ang), s = Math.sin(ang), P = (u, v) => `${f(cx + u * c - v * s)} ${f(cy + u * s + v * c)}`;
  return `M${P(0, 0)}C${P(len * 0.3, -w)} ${P(len, -w * 0.9)} ${P(len, 0)}C${P(len, w * 0.9)} ${P(len * 0.3, w)} ${P(0, 0)}Z`;
}

const dots = pts => pts.map(([x, y]) => `M${x} ${y}l0.1 0`).join('');

// ---------- piezas: cada parte = [path o fn(r), relleno, grosor] ----------
// rellenos: t = tinta clara del bando, i = tinta, p = papel, n = sin relleno
const PIECES = {
  p: { // renacuajo
    parts: [
      ['M62 60C70 52 70 44 80 37C84 34 89 32 92 27C91 38 84 41 79 47C74 53 76 62 66 68Z', 't', 3.2],
      [r => blob(48, 65, 22, 20, r, 0.04), 't', 3.4],
      ['M38 83Q36 90 31 90M57 84Q59 90 64 90', 'n', 2.8],
    ],
    face: { eyes: [[41, 61], [55, 61]], mouth: [48, 71], s: 1 },
  },
  r: { // castillo de arena
    parts: [
      ['M31 88L35 50L65 50L69 88Z', 't', 3.4],
      ['M31 53L31 36L40 36L40 43L46 43L46 36L54 36L54 43L60 43L60 36L69 36L69 53Z', 't', 3.4],
      ['M50 36L50 21', 'n', 2.8],
      ['M50 21L62 25L50 30Z', 'i', 2.4],
      ['M45 88L45 80Q50 73 55 80L55 88', 'n', 2.6],
      [dots([[38, 82], [62, 78], [40, 56], [61, 58], [35, 72]]), 'n', 3],
    ],
    face: { eyes: [[44, 61], [56, 61]], mouth: [50, 69], s: 0.95 },
  },
  n: { // caballito con crin loca
    parts: [
      ['M34 89C35 78 40 70 38 64C32 64 24 62 19 58C15 55 15 49 19 46C24 40 30 34 36 30L38 19L45 27C56 25 66 32 68 46C70 60 66 74 68 89Z', 't', 3.4],
      ['M46 25C53 16 60 28 54 30C63 24 68 37 61 37C71 35 71 47 65 47C75 48 72 59 67 59C77 62 72 71 68 71C77 75 73 84 69 84', 'n', 3],
      ['M40 28C35 21 45 18 42 26', 'n', 2.6],
      [dots([[21, 52]]), 'n', 3.4],
    ],
    face: { eyes: [[29, 42], [38, 40]], mouth: [26, 58], s: 0.85 },
  },
  b: { // mago con gorro
    parts: [
      [r => blob(50, 72, 17, 13, r, 0.04), 't', 3.4],
      ['M38 78C40 90 46 94 50 95C54 94 60 90 62 78C56 82 44 82 38 78Z', 'p', 2.8],
      ['M34 60C40 48 46 36 52 22C55 18 60 19 63 15C60 22 58 26 59 32C61 42 63 50 66 60Z', 't', 3.4],
      ['M26 62C38 56 62 56 74 62C62 67 38 67 26 62Z', 't', 3.2],
      [star(51, 45, 6), 'i', 1.6],
      [dots([[66, 26], [70, 34]]), 'n', 3],
    ],
    face: { eyes: [[44, 70], [56, 70]], mouth: [50, 77], s: 0.85 },
  },
  q: { // flor con corona
    parts: [
      ['M50 90C48 80 52 72 50 62', 'n', 3.4],
      ['M49 81C40 75 32 77 28 71C36 67 44 71 49 79Z', 't', 2.8],
      ['M51 75C58 69 66 71 70 65C64 61 56 65 51 73Z', 't', 2.8],
      ['M33 90Q50 87 67 90', 'n', 2.6],
      [r => wob([0, 1, 2, 3, 4, 5, 6].map(i => petal(50, 46, 25, 8.5, i * 0.9 + 0.3)).join(''), r, 1), 't', 3],
      [r => blob(50, 46, 13.5, 13, r, 0.04), 'p', 3],
      ['M39 27L36 13L44 20L50 9L56 20L64 13L61 27Z', 'p', 3],
      [dots([[36, 12], [50, 8], [64, 12]]), 'n', 4],
    ],
    face: { eyes: [[45, 43], [55, 43]], mouth: [50, 50], s: 0.8 },
  },
  k: { // sol con bigote y corona
    parts: [
      [r => [20, 50, 80, 135, 160, 185, 200, 340, 355].map(a => {
        const t = a * Math.PI / 180;
        return line(50 + Math.cos(t) * 25, 52 + Math.sin(t) * 25, 50 + Math.cos(t) * 33, 52 + Math.sin(t) * 33, r, 1);
      }).join(''), 'n', 3],
      [r => blob(50, 52, 21, 21, r, 0.04), 't', 3.4],
      ['M38 34L35 18L43 25L50 12L57 25L65 18L62 34Z', 'p', 3],
      ['M50 12L50 3M46 7L54 7', 'n', 2.8],
      ['M50 59C46 55 39 56 36 61C34 64 37 66 39 63C42 60 46 62 50 62C54 62 58 60 61 63C63 66 66 64 64 61C61 56 54 55 50 59Z', 'i', 1.8],
      ['M29 89C24 84 30 77 37 80C39 73 50 72 53 78C57 73 67 75 67 81C73 81 75 88 69 89Z', 'p', 3],
    ],
    face: { eyes: [[43, 49], [57, 49]], mouth: [50, 66], s: 0.9 },
  },
};

function face({ eyes, mouth: [mx, my], s }, mood, ink, r) {
  const st = (d, w = 2.4, fill = 'none') => `<path d="${d}" fill="${fill}" stroke="${ink}" stroke-width="${w}"/>`;
  let out = '';
  for (const [ex, ey] of eyes) {
    if (mood === 'happy') out += st(wob(`M${ex - 3 * s} ${ey + 1}Q${ex} ${ey - 4 * s} ${ex + 3 * s} ${ey + 1}`, r, 0.4));
    else if (mood === 'scared') out += st(blob(ex, ey, 3.8 * s, 4.2 * s, r, 0.05), 1.8, PAPER) + st(blob(ex, ey + 0.5, 1.2, 1.2, r, 0), 1.8, ink);
    else if (mood === 'dead') out += st(wob(`M${ex - 3} ${ey - 3}L${ex + 3} ${ey + 3}M${ex + 3} ${ey - 3}L${ex - 3} ${ey + 3}`, r, 0.4));
    else if (mood === 'sleepy') out += st(wob(`M${ex - 3 * s} ${ey}Q${ex} ${ey + 3 * s} ${ex + 3 * s} ${ey}`, r, 0.3));
    else out += st(blob(ex, ey, 2.3 * s, 2.6 * s, r, 0.05), 1.2, ink);
  }
  if (mood === 'happy') {
    out += st(wob(`M${mx - 6 * s} ${my - 1}Q${mx} ${my + 8 * s} ${mx + 6 * s} ${my - 1}Z`, r, 0.4), 2, PAPER);
    out += eyes.map(([ex, ey], i) => `<path d="${blob(ex + (i ? 4 : -4) * s, ey + 6 * s, 2.6 * s, 1.8 * s, r)}" fill="#e88" opacity=".55"/>`).join('');
  } else if (mood === 'scared') {
    out += st(wob(`M${mx - 5 * s} ${my + 1}Q${mx - 2.5 * s} ${my - 2} ${mx} ${my + 1}Q${mx + 2.5 * s} ${my + 4} ${mx + 5 * s} ${my + 1}`, r, 0.3), 2);
    const [ex, ey] = eyes[eyes.length - 1];
    out += st(wob(`M${ex + 9} ${ey - 9}Q${ex + 6} ${ey - 3} ${ex + 9} ${ey - 2}Q${ex + 12} ${ey - 3} ${ex + 9} ${ey - 9}Z`, r, 0.3), 1.4, '#cfe3ff');
  } else if (mood === 'dead') {
    out += st(wob(`M${mx - 5 * s} ${my}L${mx + 5 * s} ${my + 1}`, r, 0.5));
  } else if (mood === 'sleepy') {
    out += st(blob(mx, my + 1, 1.8 * s, 2.2 * s, r, 0.05), 1.8);
  } else {
    out += st(wob(`M${mx - 4.5 * s} ${my}Q${mx} ${my + 4 * s} ${mx + 4.5 * s} ${my}`, r, 0.4));
  }
  return out;
}

const pieceCache = new Map();
// SVG (sin <svg>) de una pieza en caja 100×100, con sus 3 frames
export function pieceArt(type, color, mood = 'idle') {
  const key = type + color + mood;
  if (pieceCache.has(key)) return pieceCache.get(key);
  const P = PIECES[type], ink = INK[color], fills = { t: TINT[color], i: ink, p: PAPER, n: 'none' };
  let out = '';
  for (let fr = 0; fr < FRAMES; fr++) {
    const r = rng(hash(type) + fr * 977), rf = rng(hash(type + 'fill') + fr * 311), rm = rng(hash(mood) + fr * 131);
    let g = '';
    for (const [shape, fill, w] of P.parts) {
      const d = typeof shape === 'function' ? shape(r) : wob(shape, r);
      // relleno "coloreado" un poco fuera de la línea, luego el trazo
      if (fill !== 'n') g += `<path d="${typeof shape === 'function' ? shape(rf) : wob(shape, rf, 1.6)}" fill="${fills[fill]}"/>`;
      g += `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${w}"/>`;
    }
    out += `<g class="v${fr}">${g}${face(P.face, mood, ink, rm)}</g>`;
  }
  out = `<g class="art" stroke-linecap="round" stroke-linejoin="round">${out}</g>`;
  pieceCache.set(key, out);
  return out;
}

export const pieceSVG = (type, color, mood) =>
  `<svg viewBox="0 0 100 100" aria-hidden="true">${pieceArt(type, color, mood)}</svg>`;

// ---------- tablero ----------
export function boardArt() {
  const r = rng(42);
  let hatch = '', grid = '';
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    if ((row + col) % 2 === 0) continue;
    const x = col * 100, y = row * 100;
    for (let k = 1; k <= 8; k++) { // rayado a lápiz en diagonal
      const c = k * 22;
      const [x1, y1, x2, y2] = c <= 100 ? [0, c, c, 0] : [c - 100, 100, 100, c - 100];
      hatch += line(x + x1 + 3, y + y1 - 3, x + x2 - 3, y + y2 + 3, r, 2);
    }
  }
  for (let i = 0; i <= 8; i++) {
    grid += line(-4, i * 100, 804, i * 100, r, 2.5) + line(i * 100, -4, i * 100, 804, r, 2.5);
  }
  const border = wob('M-14 -14L814 -14L814 814L-14 814Z', r, 3);
  return `<path d="${wob('M-14 -14L814 -14L814 814L-14 814Z', r, 3)}" fill="#fbf8ee"/>
    <path class="hatch" pathLength="1" d="${hatch}" stroke="${PENCIL}" stroke-width="2.2" opacity=".42" fill="none"/>
    <path pathLength="1" d="${grid}" stroke="${PENCIL}" stroke-width="2.6" opacity=".75" fill="none"/>
    <path pathLength="1" d="${border}" stroke="${INK.w}" stroke-width="4" fill="none" stroke-linejoin="round"/>
    <path d="${TAPE}" transform="translate(4 4) rotate(-38)" fill="${TAPE_FILL}"/>
    <path d="${TAPE}" transform="translate(796 4) rotate(36)" fill="${TAPE_FILL}"/>`;
}

// cinta adhesiva con puntas rasgadas
const TAPE = 'M-55 -15L55 -15L52 -9L56 -3L52 3L56 9L55 15L-55 15L-52 9L-56 3L-52 -3L-56 -9Z';
const TAPE_FILL = 'rgba(246, 222, 150, .8)';

// ---------- marco a pluma para botones y tarjetas ----------
// se dibuja en píxeles reales del elemento: el temblor es igual en un botón chico o en una tarjeta grande
export function frame(w, h, seed) {
  let out = '';
  const bow = len => Math.min(3, len * 0.012);
  for (let fr = 0; fr < FRAMES; fr++) {
    const r = rng(seed + fr * 101), j = a => (r() - 0.5) * 2 * a;
    const P = [[3, 3], [w - 3, 2.5], [w - 2.5, h - 3], [2.5, h - 2.5]].map(([x, y]) => [x + j(1.5), y + j(1.5)]);
    let d = `M${f(P[0][0])} ${f(P[0][1])}`;
    for (let i = 1; i <= 4; i++) {
      const a = P[i - 1], b = P[i % 4], k = bow(Math.hypot(b[0] - a[0], b[1] - a[1]));
      d += `Q${f((a[0] + b[0]) / 2 + j(k))} ${f((a[1] + b[1]) / 2 + j(k))} ${f(b[0])} ${f(b[1])}`;
    }
    d += `L${f(P[0][0] + Math.min(16, w * 0.12))} ${f(P[0][1] + j(1.2))}`; // se pasa del inicio, como al cerrar con pluma
    out += `<g class="v${fr}"><path class="fill" d="${wob(d, r, 1.5)}"/><path class="ink" d="${d}"/></g>`;
  }
  return `<svg class="frame" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">${out}</svg>`;
}

// ---------- marcas sobre el tablero (x,y = esquina de la casilla) ----------
export const marks = {
  dot: (x, y, color, seed) => `<path d="${blob(x + 50, y + 50, 11, 11, rng(seed), 0.08, 0.3)}" fill="none" stroke="${color}" stroke-width="4.5" opacity=".8"/>`,
  ring: (x, y, color, seed) => `<path d="${blob(x + 50, y + 52, 44, 42, rng(seed), 0.05, 0.25)}" fill="none" stroke="${color}" stroke-width="4" opacity=".85"/>`,
  check: (x, y, seed) => {
    const r = rng(seed);
    return `<path d="${blob(x + 50, y + 52, 46, 44, r, 0.06, 0.6)}${blob(x + 50, y + 52, 42, 40, r, 0.06, 0.4)}" fill="none" stroke="#d9534f" stroke-width="4"/>`;
  },
  hi: (x, y, seed) => { // resaltador amarillo en zigzag
    const r = rng(seed);
    let d = `M${x + 14} ${y + 16}`;
    for (let i = 0; i < 5; i++) d += `L${f(x + (i % 2 ? 14 : 86) + (r() - 0.5) * 6)} ${f(y + 18 + i * 16 + (r() - 0.5) * 4)}`;
    return `<path d="${d}" fill="none" stroke="#ffd43b" stroke-width="22" opacity=".42" stroke-linecap="round" stroke-linejoin="round"/>`;
  },
  sel: (x, y, color, seed) => { // corchetes en las esquinas
    const r = rng(seed), a = 6, b = 94, l = 22;
    const d = [[a, a + l, a, a, a + l, a], [b - l, a, b, a, b, a + l], [b, b - l, b, b, b - l, b], [a + l, b, a, b, a, b - l]]
      .map(([x1, y1, x2, y2, x3, y3]) => wob(`M${x + x1} ${y + y1}L${x + x2} ${y + y2}L${x + x3} ${y + y3}`, r, 1.5)).join('');
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
  },
  arrow: (x1, y1, x2, y2, seed) => {
    const r = rng(seed), ang = Math.atan2(y2 - y1, x2 - x1), len = Math.hypot(x2 - x1, y2 - y1);
    const ex = x1 + Math.cos(ang) * (len - 8), ey = y1 + Math.sin(ang) * (len - 8);
    const h = (da) => `M${f(ex)} ${f(ey)}L${f(ex - Math.cos(ang + da) * 26)} ${f(ey - Math.sin(ang + da) * 26)}`;
    return `<path d="${line(x1, y1, ex, ey, r, 4)}${h(0.5)}${h(-0.5)}" fill="none" stroke="#f08c00" stroke-width="9" opacity=".85" stroke-linecap="round" stroke-linejoin="round"/>`;
  },
  trail: (x1, y1, x2, y2, color, knight) => { // puntitos por donde pasó la pieza (en L si es caballo)
    const a = [x1 + 50, y1 + 50], b = [x2 + 50, y2 + 50];
    const pts = knight ? [a, Math.abs(b[1] - a[1]) > Math.abs(b[0] - a[0]) ? [a[0], b[1]] : [b[0], a[1]], b] : [a, b];
    let d = '';
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / 26));
      for (let k = i ? 0 : 1; k < n; k++) d += `M${f(ax + (bx - ax) * k / n)} ${f(ay + (by - ay) * k / n)}l0.1 0`;
    }
    return `<path d="${d}" stroke="${color}" stroke-width="9" stroke-linecap="round" opacity=".4" fill="none"/>`;
  },
  emote: (x, y, kind, seed) => { // globito arriba a la derecha de la casilla
    const r = rng(seed), cx = x + 80, cy = y + 18;
    const E = {
      z: [`M${cx - 6} ${cy + 4}L${cx + 1} ${cy + 4}L${cx - 6} ${cy + 11}L${cx + 1} ${cy + 11}M${cx + 4} ${cy - 8}L${cx + 13} ${cy - 8}L${cx + 4} ${cy + 1}L${cx + 13} ${cy + 1}`, PENCIL, 'none', 3],
      '!': [`M${cx} ${cy - 14}L${cx + 1} ${cy + 4}M${cx + 1} ${cy + 13}l0.1 0`, '#d9534f', 'none', 6],
      '?': [`M${cx - 7} ${cy - 7}Q${cx - 7} ${cy - 16} ${cx} ${cy - 16}Q${cx + 8} ${cy - 16} ${cx + 8} ${cy - 9}Q${cx + 8} ${cy - 4} ${cx} ${cy}L${cx} ${cy + 4}M${cx} ${cy + 13}l0.1 0`, PENCIL, 'none', 5],
      heart: [`M${cx} ${cy + 12}C${cx - 16} ${cy + 2} ${cx - 14} ${cy - 12} ${cx - 6} ${cy - 12}C${cx - 2} ${cy - 12} ${cx} ${cy - 8} ${cx} ${cy - 6}C${cx} ${cy - 8} ${cx + 2} ${cy - 12} ${cx + 6} ${cy - 12}C${cx + 14} ${cy - 12} ${cx + 16} ${cy + 2} ${cx} ${cy + 12}Z`, '#a4161a', '#f2a0a0', 3],
    }[kind];
    return `<path class="emote" d="${wob(E[0], r, 0.8)}" stroke="${E[1]}" fill="${E[2]}" stroke-width="${E[3]}" stroke-linecap="round" stroke-linejoin="round"/>`;
  },
  poof: (x, y, seed) => { // espiral + polvito de captura
    const r = rng(seed), cx = x + 50, cy = y + 50;
    let pts = [];
    for (let i = 0; i < 26; i++) { const a = i * 0.7, k = 4 + i * 1.5; pts.push([cx + Math.cos(a) * k, cy + Math.sin(a) * k]); }
    const puffs = [0, 1, 2, 3, 4, 5].map(i => blob(cx + Math.cos(i) * 40, cy + Math.sin(i) * 40, 7, 6, r, 0.1, 0.2)).join('');
    return `<path d="${smooth(pts)}${puffs}" fill="none" stroke="${PENCIL}" stroke-width="3" stroke-linecap="round"/>`;
  },
};

// ---------- doodles de los márgenes ----------
const DOODLES = {
  cloud: r => wob('M10 40C2 40 2 26 12 26C12 14 28 12 32 20C36 8 56 10 56 22C66 20 70 34 62 40Z', r, 1.2),
  plane: r => wob('M2 30L64 8L40 52L30 36ZM30 36L64 8M30 36L28 50L36 42', r, 1) + wob('M0 44Q-14 52 -26 46M-34 42Q-44 38 -50 44', r, 1),
  spiral: r => { const p = []; for (let i = 0; i < 30; i++) { const a = i * 0.6, k = 2 + i * 1.1; p.push([30 + Math.cos(a) * k, 30 + Math.sin(a) * k]); } return smooth(p); },
  stars: r => star(14, 14, 11) + star(44, 30, 7) + star(20, 46, 5),
  snail: r => { const p = []; for (let i = 0; i < 22; i++) { const a = -i * 0.55, k = 18 - i * 0.75; p.push([30 + Math.cos(a) * k, 26 + Math.sin(a) * k]); } return smooth(p) + wob('M12 34Q4 44 20 44L58 44Q66 44 64 34Q62 26 56 30L54 40M60 30L62 18M56 30L52 18', r, 0.8); },
  heart: r => wob('M30 50C10 36 6 24 14 16C22 8 30 14 30 22C30 14 38 8 46 16C54 24 50 36 30 50Z', r, 1),
  rocket: r => wob('M30 4C42 14 44 34 40 50L20 50C16 34 18 14 30 4ZM20 40L10 54L20 50M40 40L50 54L40 50M24 56Q30 70 36 56', r, 1) + blob(30, 26, 5, 5, r),
};

export function doodle(name, scale = 1) {
  let out = '';
  for (let fr = 0; fr < FRAMES; fr++) out += `<path class="v${fr}" d="${DOODLES[name](rng(hash(name) + fr * 53))}"/>`;
  return `<g transform="scale(${scale})" fill="none" stroke="${PENCIL}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${out}</g>`;
}

// ---------- sol y luna del mundo (despierto = le toca a ese bando) ----------
export function skySVG(kind, awake) {
  const sun = kind === 'sun', ink = sun ? INK.w : INK.b, fill = sun ? '#fff1c4' : '#f3e6f0';
  let out = '';
  for (let fr = 0; fr < FRAMES; fr++) {
    const r = rng(hash(kind) + fr * 37);
    let g = '';
    if (sun) for (let i = 0; i < 12; i++) {
      const t = i * Math.PI / 6;
      g += `<path d="${line(50 + Math.cos(t) * 31, 50 + Math.sin(t) * 31, 50 + Math.cos(t) * 41, 50 + Math.sin(t) * 41, r, 1.2)}" stroke="${ink}" stroke-width="3"/>`;
    }
    g += `<path d="${blob(50, 50, 25, 25, r, 0.04)}" fill="${fill}" stroke="${ink}" stroke-width="3.2"/>`;
    if (!sun) g += `<path d="${blob(62, 38, 4, 3.5, r)}${blob(36, 62, 3, 3, r)}" fill="none" stroke="${ink}" stroke-width="1.8" opacity=".6"/>`;
    g += face({ eyes: [[42, 47], [58, 47]], mouth: [50, 60], s: 1.1 }, awake ? 'happy' : 'sleepy', ink, r);
    out += `<g class="v${fr}">${g}</g>`;
  }
  const z = awake ? '' : marks.emote(-10, -8, 'z', 3);
  return `<svg viewBox="-5 -15 110 115" class="sky${awake ? ' awake' : ''}" aria-hidden="true"><g fill="none" stroke-linecap="round" stroke-linejoin="round">${out}</g>${z}</svg>`;
}

// palitos de conteo (grupos de 5 tachados), como en un cuaderno
export function tallySVG(n) {
  n = Math.min(n, 30);
  const r = rng(n * 17 + 3);
  let d = '';
  for (let i = 0; i < n; i++) {
    const g = Math.floor(i / 5), k = i % 5, x = g * 34 + k * 6 + 4;
    d += k < 4 ? line(x, 5, x, 27, r, 1) : line(g * 34 + 1, 22, g * 34 + 26, 9, r, 1);
  }
  const w = Math.ceil(n / 5) * 34;
  return `<svg class="tally" viewBox="0 0 ${w} 32" width="${w * 0.8}" height="26" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>`;
}

// ---------- Lápiz: la mascota que habla, explica y da pistas ----------
const LAPIZ = [
  ['M35 16Q35 4 50 4Q65 4 65 16Z', '#f4a3a8', 3],                // borrador
  ['M33 16L67 16L67 25L33 25Z', '#cdd2de', 3],                     // casquillo
  ['M34 25L66 25L66 70L34 70Z', '#ffd86b', 3.2],                    // cuerpo
  ['M44 26L44 69M56 26L56 69', 'none', 1.6],                        // aristas
  ['M34 70L66 70L50 95Z', '#f3d3a0', 3],                            // madera
  ['M45 87L55 87L50 95Z', PENCIL, 2],                               // punta
  ['M34 47Q24 46 19 37M66 47Q76 48 81 41', 'none', 3],              // bracitos
];
const lapizCache = new Map();
export function lapizSVG(mood = 'idle') {
  if (lapizCache.has(mood)) return lapizCache.get(mood);
  const ink = INK.w;
  let out = '';
  for (let fr = 0; fr < FRAMES; fr++) {
    const r = rng(hash('lapiz') + fr * 59), rf = rng(hash('lapiz-fill') + fr * 7), rm = rng(hash('lapiz' + mood) + fr * 3);
    let g = '';
    for (const [d, fill, w] of LAPIZ) {
      if (fill !== 'none') g += `<path d="${wob(d, rf, 1.4)}" fill="${fill}"/>`;
      g += `<path d="${wob(d, r, 0.9)}" fill="none" stroke="${ink}" stroke-width="${w}"/>`;
    }
    const f = { eyes: [[43, 41], [57, 41]], mouth: [50, 52], s: 1 };
    g += `<g class="m-rest">${face(f, mood, ink, rm)}</g>`;
    // boca abierta para cuando habla (CSS la alterna)
    g += `<g class="m-talk">${face({ ...f, mouth: [50, 200] }, mood === 'sleepy' ? 'sleepy' : 'idle', ink, rm)}<path class="jaw" d="${blob(50, 53.5, 5, 4, rm, 0.08)}" fill="${ink}"/></g>`;
    out += `<g class="v${fr}">${g}</g>`;
  }
  const svg = `<svg class="lapiz" viewBox="0 0 100 100" aria-hidden="true"><g stroke-linecap="round" stroke-linejoin="round">${out}</g></svg>`;
  lapizCache.set(mood, svg);
  return svg;
}

// araña que baja de su hilo mientras el bot piensa
export function spiderSVG() {
  let out = '';
  for (let fr = 0; fr < FRAMES; fr++) {
    const r = rng(77 + fr * 13);
    const legs = [-1, 1].map(sd => [0, 1, 2, 3].map(i => wob(`M${30 + sd * 6} ${52 + i * 4}Q${30 + sd * 16} ${44 + i * 6} ${30 + sd * 20} ${54 + i * 7}`, r, 1)).join('')).join('');
    out += `<g class="v${fr}"><path d="${legs}" stroke="${PENCIL}" stroke-width="2.4" fill="none"/><path d="${blob(30, 58, 9, 10, r, 0.06)}" fill="${PENCIL}"/><path d="${blob(26.5, 55, 2, 2.2, r)}${blob(33.5, 55, 2, 2.2, r)}" fill="${PAPER}"/></g>`;
  }
  return `<svg class="spider" viewBox="0 -100 60 180" aria-hidden="true"><path d="M30 -100L30 48" stroke="${PENCIL}" stroke-width="1.4"/>${out}</svg>`;
}

// hormiguitas que cargan a la pieza comida hasta su siesta
export function antsSVG() {
  let out = '';
  for (let fr = 0; fr < FRAMES; fr++) {
    const r = rng(31 + fr * 17);
    let d = '';
    for (const x of [14, 46, 78]) {
      d += blob(x, 14, 3.4, 2.6, r) + blob(x + 6, 14, 2.6, 2.3, r) + blob(x - 6, 13, 2.2, 2, r);
      for (const k of [-4, 0, 4]) d += wob(`M${x + k} 15L${x + k + (fr - 1) * 2.5} 22`, r, 0.6);
    }
    out += `<path class="v${fr}" d="${d}" fill="${PENCIL}" stroke="${PENCIL}" stroke-width="1.6"/>`;
  }
  return `<svg class="ants" viewBox="0 0 92 24" aria-hidden="true">${out}</svg>`;
}

// ---------- íconos de botones ----------
const ICONS = {
  menu: 'M6 9L26 8M6 16L26 16M6 23L26 24',
  undo: 'M10 7L4 13L11 18M4 13C14 12 26 12 27 20C28 26 20 28 14 26',
  bulb: 'M16 3C9 3 6 9 8 14C9 17 12 18 12 22L20 22C20 18 23 17 24 14C26 9 23 3 16 3ZM12 26L20 26M13 29L19 29',
  flip: 'M6 13C8 6 20 3 25 10L26 5M26 19C24 26 12 29 7 22L6 27M25 10L20 10M7 22L12 22',
  sound: 'M4 12L9 12L16 6L16 26L9 20L4 20ZM21 11C24 14 24 18 21 21M24 7C30 12 30 20 24 25',
  mute: 'M4 12L9 12L16 6L16 26L9 20L4 20ZM21 12L28 20M28 12L21 20',
  back: 'M14 7L5 16L14 25M5 16L27 16',
  board: 'M5 5L27 5L27 27L5 27ZM5 16L27 16M16 5L16 27',
  voice: 'M5 8Q5 4 9 4L24 4Q28 4 28 8L28 17Q28 21 24 21L14 21L8 27L9 21Q5 21 5 17ZM11 12L22 12M11 15L18 15',
  music: 'M7 25C7 21 14 21 14 24C14 28 7 29 7 25ZM14 24L14 7L26 4L26 20M26 20C26 16 19 16 19 19C19 23 26 24 26 20ZM14 11L26 8',
  again: 'M26 16C26 23 21 27 16 27C10 27 5 22 5 16C5 10 10 5 16 5C20 5 23 7 25 10M25 3L25 10L18 10',
};

export function icon(name) {
  let out = '';
  for (let fr = 0; fr < FRAMES; fr++) out += `<path class="v${fr}" d="${wob(ICONS[name], rng(hash(name) + fr * 7), 0.5)}"/>`;
  return `<svg class="ico" viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${out}</svg>`;
}

// alterna los frames de todo lo dibujado (~4 fps, como lápiz vivo)
export function startBoil() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let fr = 0;
  setInterval(() => { if (!document.hidden) document.documentElement.dataset.f = fr = (fr + 1) % FRAMES; }, 240);
}
