// Flujo de la app: menú → opciones → partida → fin. Guardado en localStorage.
import { Chess } from './chess.js';
import { createBoard } from './board.js';
import { pieceSVG, doodle, icon, startBoil } from './art.js';
import * as sound from './sound.js';
import { initLearn } from './learn.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const other = c => (c === 'w' ? 'b' : 'w');
const NAME = { w: 'Azul', b: 'Rojo' };
const LEVEL = { 1: 'fácil', 2: 'medio', 3: 'difícil' };
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const PIECE_NAME = { q: 'Reina', r: 'Torre', b: 'Alfil', n: 'Caballo' };
const HELPS = {
  muchas: { moves: true, undo: Infinity, hints: Infinity, danger: true, note: 'Se ve a dónde puede ir cada pieza, las piezas ponen cara de susto si están en peligro, y hay deshacer y pistas sin límite.' },
  algunas: { moves: true, undo: 3, hints: 3, danger: false, note: 'Se ve a dónde puede ir cada pieza. 3 deshacer y 3 pistas por partida.' },
  pocas: { moves: false, undo: 0, hints: 0, danger: false, note: 'Sin marcas, sin deshacer y sin pistas. ¡Como los grandes!' },
};

// ---------- guardado ----------
const KEY = 'ajedrez-garabato-v1';
const store = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })();
store.opts = { mode: 'bot', level: '1', color: 'w', helps: 'muchas', spin: '0', ...store.opts };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* modo privado o sin espacio */ } };
sound.setOn(store.sound !== false);

let G = null; // partida en curso: datos guardables + chess, thinking, hint...
const persist = () => {
  const { chess, thinking, hinting, hint, spinSide, ...data } = G;
  store.game = data;
  save();
};

// ---------- pantallas ----------
function show(id) {
  for (const s of $$('.screen')) s.hidden = s.id !== id;
  if (id === 'menu') paintMenu();
}

function paintMenu() {
  const g = store.game, btn = $('[data-go="resume"]');
  let live = false;
  if (g?.moves?.length) {
    const c = new Chess();
    try { g.moves.forEach(m => c.move(m)); live = !c.isGameOver(); } catch { live = false; }
  }
  btn.hidden = !live;
  if (live) $('#resume-info').textContent = `${g.mode === 'bot' ? `contra el bot ${LEVEL[g.level]}` : 'en pareja'} · jugada ${Math.ceil(g.moves.length / 2)}`;
}

function openSetup(mode) {
  store.opts.mode = mode;
  $('#setup-title').textContent = mode === 'bot' ? 'Contra el bot' : 'En pareja';
  paintSetup();
  show('setup');
}

function paintSetup() {
  const o = store.opts;
  for (const el of $$('.bot-only')) el.hidden = o.mode !== 'bot';
  for (const el of $$('.pair-only')) el.hidden = o.mode !== 'pair';
  for (const seg of $$('.seg')) for (const b of $$('button', seg)) b.setAttribute('aria-pressed', b.dataset.val === o[seg.dataset.opt]);
  $('#helps-note').textContent = HELPS[o.helps].note;
}

function paintSound() {
  for (const b of $$('[data-act="sound"]')) {
    b.innerHTML = icon(sound.on ? 'sound' : 'mute') + (b.classList.contains('icon') ? '' : `<span>Sonido: ${sound.on ? 'sí' : 'no'}</span>`);
    b.setAttribute('aria-pressed', sound.on);
  }
}

// ---------- partida ----------
const humanTurn = () => G.mode === 'pair' || G.chess.turn() === G.human;
const flipped = () => (G.mode === 'bot' ? G.human === 'b' : G.spin === '1' && G.spinSide === 'b') !== G.flip;

function newGame() {
  const o = store.opts;
  const human = o.mode === 'bot' ? (o.color === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : o.color) : 'w';
  loadGame({ mode: o.mode, level: o.level, helps: o.helps, spin: o.spin, human, moves: [], undos: 0, hints: 0, flip: false });
  persist();
}

function loadGame(data) {
  const chess = new Chess();
  try { data.moves.forEach(m => chess.move(m)); } catch { data.moves = chess.history({ verbose: true }).map(m => m.lan); }
  G = { ...data, chess, thinking: false, hinting: false, hint: null, spinSide: chess.turn() };
  $('#dialog').hidden = true;
  show('game');
  render();
  if (!chess.isGameOver() && !humanTurn()) botTurn();
}

const view = createBoard($('#board'), {
  pick(sq) {
    if (!G || G.thinking || G.hinting || G.chess.isGameOver() || !humanTurn()) return false;
    return G.chess.get(sq)?.color === G.chess.turn();
  },
  targets: sq => G.chess.moves({ square: sq, verbose: true }).map(m => ({ to: m.to, capture: !!m.captured })),
  move: humanMove,
  showTargets: () => HELPS[G.helps].moves,
  sound: sound.play,
});

async function humanMove(from, to, dragged) {
  const p = G.chess.get(from);
  let promotion;
  if (p.type === 'p' && (to[1] === '8' || to[1] === '1')) {
    promotion = await pickPromotion(p.color);
    if (!promotion) return render();
  }
  play({ from, to, promotion }, dragged);
}

function play(m, dragged = false) {
  const g = G, c = g.chess;
  let mv;
  try { mv = c.move(m); } catch { return render(); }
  g.hint = null;
  g.moves.push(mv.lan);
  const castle = mv.isKingsideCastle() || mv.isQueensideCastle();
  const anim = { moves: dragged ? [] : [{ from: mv.from, to: mv.to }] };
  if (castle) {
    const ks = mv.isKingsideCastle(), r = mv.from[1];
    anim.moves.push({ from: (ks ? 'h' : 'a') + r, to: (ks ? 'f' : 'd') + r });
  }
  if (mv.captured) anim.captured = { type: mv.captured, color: other(mv.color), sq: mv.isEnPassant() ? mv.to[0] + mv.from[1] : mv.to };
  sound.play(c.inCheck() && !c.isCheckmate() ? 'check' : mv.captured ? 'capture' : castle ? 'castle' : mv.promotion ? 'promote' : 'move');
  persist();
  render(anim);
  if (g.mode === 'pair' && g.spin === '1') {
    setTimeout(() => { if (G === g && g.spinSide !== c.turn()) { g.spinSide = c.turn(); render(); } }, 800);
  }
  if (c.isGameOver()) setTimeout(() => G === g && gameOver(), 900);
  else if (!humanTurn()) botTurn();
}

// ---------- bot (Web Worker) ----------
let worker = null, reqId = 0;
function askBot(level) {
  worker ??= new Worker(new URL('./bot.js', import.meta.url), { type: 'module' });
  const id = ++reqId;
  return new Promise(res => {
    worker.onmessage = ({ data }) => data.id === id && res(data);
    worker.postMessage({ id, moves: G.moves, level });
  });
}

async function botTurn() {
  const g = G;
  g.thinking = true;
  render();
  const t0 = Date.now(), m = await askBot(g.level);
  await new Promise(r => setTimeout(r, Math.max(0, 700 - (Date.now() - t0)))); // que se note que "piensa"
  if (G !== g || !g.thinking) return; // se deshizo o se fue al menú con otra partida
  g.thinking = false;
  play(m);
}

const helps = () => HELPS[G.helps];
const humanMoved = () => G.moves.length > (G.mode === 'bot' && G.human === 'b' ? 1 : 0);
const canUndo = () => G.undos < helps().undo && humanMoved() && !G.hinting;
const canHint = () => G.hints < helps().hints && humanTurn() && !G.thinking && !G.hinting && !G.chess.isGameOver();

function undo() {
  if (!canUndo()) return;
  const c = G.chess;
  G.thinking = false;
  c.undo(); G.moves.pop();
  if (G.mode === 'bot') while (c.turn() !== G.human && G.moves.length) { c.undo(); G.moves.pop(); }
  G.undos++;
  G.hint = null;
  G.spinSide = c.turn();
  sound.play('select');
  persist();
  render();
  if (!humanTurn()) botTurn();
}

async function hint() {
  if (!canHint()) return;
  const g = G, n = g.moves.length;
  g.hints++;
  g.hinting = true;
  render();
  const m = await askBot('hint');
  g.hinting = false;
  if (G !== g || g.moves.length !== n) return;
  g.hint = m;
  persist();
  render();
}

function inDanger(c, p) {
  const att = c.attackers(p.square, other(p.color));
  if (!att.length) return false;
  if (!c.isAttacked(p.square, p.color)) return true; // nadie la defiende
  return Math.min(...att.map(s => VAL[c.get(s).type])) < VAL[p.type]; // la ataca alguien que vale menos
}

function result() {
  const c = G.chess;
  if (c.isCheckmate()) {
    const win = other(c.turn());
    if (G.mode === 'pair') return { title: `¡Gana ${NAME[win]}!`, text: '¡Jaque mate!', win, happy: true };
    return win === G.human
      ? { title: '¡Ganaste!', text: '¡Jaque mate al bot!', win, happy: true }
      : { title: 'Ganó el bot', text: 'Jaque mate. ¡La próxima le ganas!', win, happy: false };
  }
  const text = c.isStalemate() ? 'Ahogado: el rey no está en jaque, pero no tiene ninguna jugada.'
    : c.isInsufficientMaterial() ? 'Quedan muy pocas piezas para poder dar jaque mate.'
      : c.isThreefoldRepetition() ? 'La misma posición se repitió tres veces.'
        : 'Pasaron 50 jugadas sin capturas ni movimientos de peón.';
  return { title: 'Tablas', text, win: null, happy: false };
}

function render(anim) {
  const c = G.chess, turn = c.turn(), over = c.isGameOver(), check = c.inCheck(), h = helps();
  const hist = c.history({ verbose: true }), last = hist[hist.length - 1], mine = humanTurn();
  const mood = p => {
    if (over) return !c.isCheckmate() ? 'idle' : p.color === turn ? (p.type === 'k' ? 'dead' : 'scared') : 'happy';
    if (p.type === 'k' && p.color === turn && check) return 'scared';
    if (last && last.to === p.square && last.captured) return 'happy';
    if (h.danger && mine && p.color === turn && p.type !== 'k' && inDanger(c, p)) return 'scared';
    return 'idle';
  };
  const pieces = {};
  let kingSq = null;
  for (const row of c.board()) for (const p of row) {
    if (!p) continue;
    pieces[p.square] = { type: p.type, color: p.color, mood: mood(p) };
    if (p.type === 'k' && p.color === turn) kingSq = p.square;
  }
  view.draw({ pieces, flipped: flipped(), last: last && { from: last.from, to: last.to }, check: check ? kingSq : null, hint: G.hint, anim });

  let s;
  if (over) s = result().title;
  else if (G.thinking) s = 'El bot está pensando<span class="dots"></span>';
  else if (G.hinting) s = 'Buscando una pista<span class="dots"></span>';
  else if (G.mode === 'bot') s = 'Te toca';
  else s = `Turno de <b class="ink-${turn}">${NAME[turn]}</b>`;
  if (check && !over) s += ' <b class="alert">¡Jaque!</b>';
  $('#status').innerHTML = s;

  const bottom = flipped() ? 'b' : 'w';
  for (const [el, color] of [[$('#p-bottom'), bottom], [$('#p-top'), other(bottom)]]) {
    const name = G.mode === 'bot' ? (color === G.human ? 'Tú' : `Bot ${LEVEL[G.level]}`) : NAME[color];
    const caps = hist.filter(m => m.captured && m.color === color).map(m => m.captured).sort((a, b) => VAL[b] - VAL[a]);
    el.className = `player ink-${color}${turn === color && !over ? ' on' : ''}`;
    el.innerHTML = `<span class="who">${pieceSVG('k', color)}<span>${name}</span></span><span class="caps">${caps.map(t => pieceSVG(t, other(color))).join('')}</span>`;
  }

  const undoBtn = $('[data-act="undo"]'), hintBtn = $('[data-act="hint"]');
  undoBtn.disabled = !canUndo();
  undoBtn.hidden = h.undo === 0;
  $('span', undoBtn).textContent = h.undo === Infinity ? 'Deshacer' : `Deshacer (${Math.max(0, h.undo - G.undos)})`;
  hintBtn.hidden = h.hints === 0;
  hintBtn.disabled = !canHint();
  $('span', hintBtn).textContent = h.hints === Infinity ? 'Pista' : `Pista (${Math.max(0, h.hints - G.hints)})`;
  $('[data-act="again"]').hidden = !over;
}

function gameOver() {
  if (!G.chess.isGameOver()) return;
  const r = result();
  sound.play(!r.win ? 'draw' : r.happy ? 'win' : 'lose');
  if (r.happy) confetti();
  dialog({
    title: r.title,
    text: r.text,
    art: pieceSVG('k', r.win || 'w', r.happy ? 'happy' : 'idle'),
    buttons: [['Otra vez', newGame, 'red'], ['Ver tablero'], ['Menú', () => show('menu')]],
  });
}

// ---------- diálogos ----------
let onCancel = null;
function dialog({ title, text = '', art = '', buttons = [], pieces = false, cancel = null }) {
  const d = $('#dialog'), box = $('.dlg-btns', d);
  $('#dlg-title').textContent = title;
  $('#dlg-text').textContent = text;
  $('.dlg-art', d).innerHTML = art;
  box.className = 'dlg-btns' + (pieces ? ' pieces' : '');
  box.innerHTML = '';
  for (const [label, fn, cls] of buttons) {
    const b = document.createElement('button');
    b.className = `btn ${cls || ''}`;
    b.innerHTML = label;
    b.onclick = () => { d.hidden = true; onCancel = null; fn?.(); };
    box.append(b);
  }
  onCancel = cancel;
  d.hidden = false;
}
function closeDialog() {
  const d = $('#dialog');
  if (d.hidden) return;
  d.hidden = true;
  const fn = onCancel;
  onCancel = null;
  fn?.();
}
$('#dialog').addEventListener('click', e => { if (e.target.id === 'dialog') closeDialog(); });
addEventListener('keydown', e => { if (e.key === 'Escape') closeDialog(); });

function pickPromotion(color) {
  return new Promise(res => dialog({
    title: '¡Llegaste al final!',
    text: '¿En qué se convierte tu peón?',
    pieces: true,
    buttons: Object.entries(PIECE_NAME).map(([t, n]) => [pieceSVG(t, color, 'happy') + n, () => res(t)]),
    cancel: () => res(null),
  }));
}

function confetti() {
  const colors = ['#1f3a93', '#a4161a', '#f08c00', '#2b8a3e'];
  for (let i = 0; i < 26; i++) {
    const s = document.createElement('div');
    s.className = 'confetti';
    s.innerHTML = `<svg viewBox="-5 -5 70 70">${doodle(i % 2 ? 'stars' : 'heart')}</svg>`;
    s.style.cssText = `left:${Math.random() * 100}%;color:${colors[i % 4]};animation-duration:${2.2 + Math.random() * 1.8}s;animation-delay:${Math.random()}s`;
    document.body.append(s);
    setTimeout(() => s.remove(), 5200);
  }
}

// ---------- doodles de los márgenes ----------
function drawDoodles() {
  const w = innerWidth, h = innerHeight, svg = $('#doodles');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const spots = [['cloud', 44, 14], ['plane', w - 96, 24], ['spiral', 44, h * 0.42], ['stars', w - 72, h * 0.46], ['snail', 46, h - 74], ['heart', w - 78, h - 84], ['rocket', w * 0.5 - 30, h - 70]];
  svg.innerHTML = spots.map(([n, x, y], i) => `<g transform="translate(${x | 0} ${y | 0})"><g class="float f${i % 3}">${doodle(n)}</g></g>`).join('');
}

// ---------- arranque ----------
const learn = initLearn({ show, pickPromotion, sound });

const actions = {
  sound() { sound.setOn(!sound.on); store.sound = sound.on; save(); paintSound(); sound.play('select'); },
  start: newGame,
  undo,
  hint,
  again: newGame,
  flip() { G.flip = !G.flip; persist(); render(); },
  lessons: () => learn.open(),
  'lesson-reset': () => learn.reset(),
  'lesson-next': () => learn.next(),
};

document.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  const go = b.dataset.go, seg = b.closest('.seg');
  if (go === 'menu') show('menu');
  else if (go === 'resume') loadGame(store.game);
  else if (go === 'bot' || go === 'pair') openSetup(go);
  else if (go === 'learn') learn.open();
  if (b.dataset.act) actions[b.dataset.act]?.();
  if (seg) { store.opts[seg.dataset.opt] = b.dataset.val; save(); paintSetup(); sound.play('select'); }
});

for (const i of $$('[data-icon]')) i.outerHTML = icon(i.dataset.icon);
for (const b of $$('[data-art]')) b.insertAdjacentHTML('afterbegin', pieceSVG(b.dataset.art, 'w'));
$('.hero').innerHTML = pieceSVG('k', 'w', 'happy') + pieceSVG('p', 'b') + pieceSVG('q', 'b', 'happy');
paintSound();
drawDoodles();
addEventListener('resize', drawDoodles);
startBoil();
show('menu');

if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
