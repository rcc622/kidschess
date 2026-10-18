// Bot: alpha-beta + tablas pieza-casilla + quiescence. Corre en un Web Worker.
// ponytail: usa la API interna de chess.js (_moves/_makeMove/_undoMove/_board) porque la
// pública genera SAN en cada jugada (lentísimo). Es seguro porque chess.js está copiado local (1.4.0).
import { Chess } from './chess.js';

const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const ORD = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 20 };
const MATE = 100000;

// vista desde las blancas, índice 0 = a8
const PST = {
  p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
  b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
  r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
  q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
  k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
  e: [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50],
};

export const LEVELS = {
  1: { depth: 1, qs: false, noise: 80, blunder: 0.25, time: 1000 }, // a veces "se equivoca"
  2: { depth: 2, qs: true, noise: 25, blunder: 0.04, time: 2000 },
  3: { depth: 6, qs: true, noise: 0, blunder: 0, time: 1600 },
  hint: { depth: 5, qs: true, noise: 0, blunder: 0, time: 1200 },
};

const idx = (sq, white) => (white ? sq >> 4 : 7 - (sq >> 4)) * 8 + (sq & 7);
const centerDist = sq => Math.max(3 - (sq & 7), (sq & 7) - 4) + Math.max(3 - (sq >> 4), (sq >> 4) - 4);
const kingDist = (a, b) => Math.max(Math.abs((a & 7) - (b & 7)), Math.abs((a >> 4) - (b >> 4)));

// puntaje desde el lado que mueve
function evaluate(g) {
  const B = g._board;
  let s = 0, np = 0, wk = -1, bk = -1;
  for (let sq = 0; sq < 120; sq++) {
    if (sq & 0x88) { sq += 7; continue; }
    const p = B[sq];
    if (!p) continue;
    if (p.type === 'k') { if (p.color === 'w') wk = sq; else bk = sq; continue; }
    if (p.type !== 'p') np += VAL[p.type];
    const v = VAL[p.type] + PST[p.type][idx(sq, p.color === 'w')];
    s += p.color === 'w' ? v : -v;
  }
  const end = np <= 2600, kt = end ? PST.e : PST.k;
  if (wk >= 0) s += kt[idx(wk, true)];
  if (bk >= 0) s -= kt[idx(bk, false)];
  // final ganado: empujar al rey rival a la orilla y acercar el propio
  if (end && Math.abs(s) > 300 && wk >= 0 && bk >= 0) {
    const lose = s > 0 ? bk : wk, win = s > 0 ? wk : bk;
    const m = 10 * centerDist(lose) + 4 * (7 - kingDist(win, lose));
    s += s > 0 ? m : -m;
  }
  return g._turn === 'w' ? s : -s;
}

function order(moves) {
  for (const m of moves) m.s = (m.captured ? 100 * ORD[m.captured] - ORD[m.piece] + 1000 : 0) + (m.promotion ? 900 : 0);
  return moves.sort((a, b) => b.s - a.s);
}

let nodes = 0, deadline = Infinity, stopped = false;
const tick = () => { if ((++nodes & 1023) === 0 && Date.now() > deadline) stopped = true; return stopped; };

function qsearch(g, alpha, beta, qd) {
  if (tick()) return 0;
  const stand = evaluate(g);
  if (stand >= beta) return beta;
  if (stand > alpha) alpha = stand;
  if (qd <= 0) return alpha;
  const us = g._turn;
  for (const m of order(g._moves({ legal: false }).filter(m => m.captured || m.promotion))) {
    g._makeMove(m);
    if (g._isKingAttacked(us)) { g._undoMove(); continue; }
    const sc = -qsearch(g, -beta, -alpha, qd - 1);
    g._undoMove();
    if (stopped) return 0;
    if (sc >= beta) return beta;
    if (sc > alpha) alpha = sc;
  }
  return alpha;
}

function search(g, depth, alpha, beta, ply, cfg) {
  if (tick()) return 0;
  if (g._getPositionCount(g._hash) > 0 || g._halfMoves >= 100) return 0; // repetir = tablas
  if (depth <= 0) return cfg.qs ? qsearch(g, alpha, beta, 6) : evaluate(g);
  const moves = g._moves({ legal: true });
  if (!moves.length) return g._isKingAttacked(g._turn) ? -MATE + ply : 0;
  for (const m of order(moves)) {
    g._makeMove(m);
    const sc = -search(g, depth - 1, -beta, -alpha, ply + 1, cfg);
    g._undoMove();
    if (stopped) return 0;
    if (sc >= beta) return beta;
    if (sc > alpha) alpha = sc;
  }
  return alpha;
}

const sqName = sq => 'abcdefgh'[sq & 7] + (8 - (sq >> 4));

// moves = jugadas en LAN desde la posición inicial (así el bot conoce las repeticiones)
export function think(moves, level) {
  const g = new Chess();
  for (const m of moves) g.move(m);
  const cfg = LEVELS[level];
  const root = g._moves({ legal: true });
  for (let i = root.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [root[i], root[j]] = [root[j], root[i]]; }
  let pick = root[0];
  if (Math.random() < cfg.blunder) {
    pick = root[Math.floor(Math.random() * root.length)];
  } else {
    nodes = 0; stopped = false; deadline = Date.now() + cfg.time;
    let best = order(root).map(m => ({ m, s: 0 }));
    for (let d = 1; d <= cfg.depth; d++) {
      const scored = [];
      let alpha = -MATE * 2;
      for (const { m } of best) {
        g._makeMove(m);
        // con ruido hace falta el puntaje exacto de cada jugada; sin ruido basta la mejor
        const s = -search(g, d - 1, -MATE * 2, cfg.noise ? MATE * 2 : -alpha, 1, cfg);
        g._undoMove();
        if (stopped) break;
        scored.push({ m, s });
        if (s > alpha) alpha = s;
      }
      if (stopped && d > 1) break;
      best = scored.sort((a, b) => b.s - a.s);
      if (best[0].s > MATE - 100) break;
    }
    pick = best.map(x => ({ m: x.m, s: x.s + (Math.random() - 0.5) * 2 * cfg.noise })).reduce((a, b) => (b.s > a.s ? b : a)).m;
  }
  return { from: sqName(pick.from), to: sqName(pick.to), promotion: pick.promotion };
}

if (typeof WorkerGlobalScope !== 'undefined') {
  self.onmessage = ({ data: { id, moves, level } }) => self.postMessage({ id, ...think(moves, level) });
}
