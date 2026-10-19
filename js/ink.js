// Ayudantes de trazo a mano: temblor con semilla, curvas suaves, círculos, estrellas, patas y tentáculos.

// PRNG con semilla: el mismo dibujo sale igual en cada render
export function rng(seed) {
  let s = (seed % 2147483646) + 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
export const hash = str => [...str].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 1e9, 7);
export const f = n => Math.round(n * 10) / 10;

// mueve cada número del path un poquito → nunca líneas perfectas (no usar con arcos "A")
export function wob(d, r, amt = 1.1) {
  return d.replace(/-?\d*\.?\d+/g, n => f(+n + (r() - 0.5) * 2 * amt));
}

// Catmull-Rom → Bézier (abierta)
export function smooth(p) {
  let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

// igual, pero cerrada y sin pico en la unión
export function smoothClosed(p) {
  const n = p.length, at = i => p[(i + n) % n];
  let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + 'Z';
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

export function star(cx, cy, R, inner = 0.45) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, k = i % 2 ? R * inner : R;
    d += `${i ? 'L' : 'M'}${f(cx + Math.cos(a) * k)} ${f(cy + Math.sin(a) * k)}`;
  }
  return d + 'Z';
}

// estrella gordita de puntas redondas (estrella de mar)
export function roundStar(cx, cy, R, inner, rot = 0) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + rot + i * Math.PI / 5, k = i % 2 ? inner : R;
    pts.push([cx + Math.cos(a) * k, cy + Math.sin(a) * k]);
  }
  return smoothClosed(pts);
}

export function petal(cx, cy, len, w, ang) {
  const c = Math.cos(ang), s = Math.sin(ang), P = (u, v) => `${f(cx + u * c - v * s)} ${f(cy + u * s + v * c)}`;
  return `M${P(0, 0)}C${P(len * 0.3, -w)} ${P(len, -w * 0.9)} ${P(len, 0)}C${P(len, w * 0.9)} ${P(len * 0.3, w)} ${P(0, 0)}Z`;
}

export const dots = pts => pts.map(([x, y]) => `M${x} ${y}l0.1 0`).join('');

// pata, cola o tentáculo: sigue los puntos y se adelgaza de w0 a w1
export function limb(pts, w0, w1) {
  const L = [], R = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    const w = (w0 + (w1 - w0) * i / (n - 1)) / 2, nx = -dy / len * w, ny = dx / len * w;
    L.push([pts[i][0] + nx, pts[i][1] + ny]);
    R.push([pts[i][0] - nx, pts[i][1] - ny]);
  }
  return smoothClosed([...L, ...R.reverse()]);
}

// melena o nube: círculo de "chichones" hacia afuera
export function bumps(cx, cy, rx, ry, n, out) {
  let d = '';
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + i * 2 * Math.PI / n, P = [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
    if (!i) { d = `M${f(P[0])} ${f(P[1])}`; continue; }
    const m = a - Math.PI / n, C = [cx + Math.cos(m) * (rx + out), cy + Math.sin(m) * (ry + out)];
    d += `Q${f(C[0])} ${f(C[1])} ${f(P[0])} ${f(P[1])}`;
  }
  return d + 'Z';
}
