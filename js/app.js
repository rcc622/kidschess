// Flujo de la app: menú → opciones → partida → fin. Guardado en localStorage.
import { Chess } from './chess.js';
import { createBoard } from './board.js';
import { pieceSVG, pieceArt, boardArt, frame, doodle, icon, skySVG, tallySVG, startBoil } from './art.js';
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
  const { chess, thinking, hinting, hint, spinSide, sleepy, say, oops, ...data } = G;
  store.game = data;
  save();
};

// ---------- pantallas ----------
function show(id) {
  for (const s of $$('.screen')) s.hidden = s.id !== id;
  document.body.dataset.screen = id;
  if (id === 'menu') paintMenu();
}

function paintMenu() {
  const g = store.game, btn = $('[data-go="resume"]');
  const c = new Chess();
  let live = false;
  if (g?.moves?.length) {
    try { g.moves.forEach(m => c.move(m)); live = !c.isGameOver(); } catch { live = false; }
  }
  const wins = (store.results || []).filter(x => x.r === 'w').length;
  $('#bot-wins').innerHTML = wins ? `${tallySVG(wins)}<span>${wins === 1 ? 'ganada' : 'ganadas'}</span>` : '';
  btn.hidden = !live;
  if (!live) return;
  $('#resume-art').innerHTML = miniBoard(c, g.mode === 'bot' && g.human === 'b');
  $('#resume-info').textContent = `${g.mode === 'bot' ? `Contra el bot ${LEVEL[g.level]}` : 'En pareja'} · jugada ${Math.ceil(g.moves.length / 2)}`;
}

// foto chiquita de la partida guardada
function miniBoard(c, flip) {
  let p = '';
  for (const row of c.board()) for (const q of row) {
    if (!q) continue;
    let x = q.square.charCodeAt(0) - 97, y = 8 - +q.square[1];
    if (flip) { x = 7 - x; y = 7 - y; }
    p += `<g transform="translate(${x * 100} ${y * 100})">${pieceArt(q.type, q.color)}</g>`;
  }
  return `<svg viewBox="-30 -30 860 860" aria-hidden="true">${boardArt()}${p}</svg>`;
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
  loadGame({ mode: o.mode, level: o.level, helps: o.helps, spin: o.spin, human, moves: [], undos: 0, hints: 0, flip: false }, true);
  persist();
}

function loadGame(data, intro = false) {
  const chess = new Chess();
  try { data.moves.forEach(m => chess.move(m)); } catch { data.moves = chess.history({ verbose: true }).map(m => m.lan); }
  G = { ...data, chess, thinking: false, hinting: false, hint: null, spinSide: chess.turn() };
  $('#dialog').hidden = true;
  show('game');
  render(intro ? { intro: true } : undefined);
  if (!chess.isGameOver() && !humanTurn()) setTimeout(botTurn, intro ? 1400 : 0);
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
  miss(from, to) {
    sound.play('bonk');
    const g = G;
    g.say = whyIllegal(g.chess, from, to);
    g.oops = { sq: from, kind: '?' };
    render();
    clearTimeout(g.sayTimer);
    g.sayTimer = setTimeout(() => { g.say = g.oops = null; if (G === g) render(); }, 2800);
  },
});

// explica con palabras de niño por qué esa jugada no vale
const HOW = {
  p: 'El peón camina derecho y solo come en diagonal.',
  n: 'El caballo salta en forma de L.',
  b: 'El alfil solo va en diagonal.',
  r: 'La torre solo va en línea recta.',
  q: 'La reina va en línea recta o en diagonal.',
  k: 'El rey camina de una en una casilla.',
};
function whyIllegal(c, from, to) {
  const p = c.get(from);
  if (!p) return '';
  const sqName = n => 'abcdefgh'[n & 15] + (8 - (n >> 4));
  // ponytail: _moves es interno de chess.js (copiado local, versión fija)
  const pseudo = c._moves({ legal: false, square: from }).some(m => sqName(m.to) === to);
  if (c.inCheck()) return '¡Tu rey está en jaque! Primero tienes que salvarlo.';
  if (pseudo) return 'No se puede: tu rey quedaría en peligro.';
  const dx = to.charCodeAt(0) - from.charCodeAt(0), dy = +to[1] - +from[1], ax = Math.abs(dx), ay = Math.abs(dy);
  if (p.type === 'k' && ax === 2 && !dy) return 'Para enrocar, ni el rey ni la torre deben haberse movido, y el camino debe estar libre.';
  const ahead = dy * (p.color === 'w' ? 1 : -1) > 0;
  if (p.type === 'p' && !dx && ahead && ay <= 2) return 'Hay alguien enfrente: el peón no puede pasar.';
  if (p.type === 'p' && ax === 1 && ay === 1 && ahead) return 'El peón solo va en diagonal cuando come.';
  const line = !dx || !dy, diag = ax === ay;
  if ((p.type === 'r' && line) || (p.type === 'b' && diag) || (p.type === 'q' && (line || diag))) return 'Hay alguien en el camino.';
  return HOW[p.type];
}

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
    return G.sleepy && p.color === turn ? 'sleepy' : 'idle';
  };
  const pieces = {}, kings = {};
  for (const row of c.board()) for (const p of row) {
    if (!p) continue;
    pieces[p.square] = { type: p.type, color: p.color, mood: mood(p) };
    if (p.type === 'k') kings[p.color] = p.square;
  }
  const emotes = [];
  if (check && !over) emotes.push({ sq: kings[turn], kind: '!' });
  if (over && c.isCheckmate()) emotes.push({ sq: kings[other(turn)], kind: 'heart' });
  if (G.sleepy && !check) emotes.push({ sq: kings[turn], kind: 'z' });
  if (G.oops && pieces[G.oops.sq]) emotes.push(G.oops);
  view.draw({
    pieces, emotes, flipped: flipped(), check: check ? kings[turn] : null, hint: G.hint, anim,
    last: last && { from: last.from, to: last.to, color: last.color, knight: last.piece === 'n' },
  });
  world(c, turn, over);

  let s;
  if (G.say && !over) s = `<span class="say">${G.say}</span>`;
  else if (over) s = result().title;
  else if (G.thinking) s = 'El bot está pensando<span class="dots"></span>';
  else if (G.hinting) s = 'Buscando una pista<span class="dots"></span>';
  else if (G.mode === 'bot') s = '¡Te toca!';
  else s = `Turno de <b class="ink-${turn}">${NAME[turn]}</b>`;
  if (check && !over) s += ' <b class="alert">¡Jaque!</b>';
  $('#status').innerHTML = s;

  const bottom = flipped() ? 'b' : 'w';
  for (const [el, color] of [[$('#p-bottom'), bottom], [$('#p-top'), other(bottom)]]) {
    const name = G.mode === 'bot' ? (color === G.human ? 'Tú' : `Bot ${LEVEL[G.level]}`) : NAME[color];
    const caps = hist.filter(m => m.captured && m.color === color).map(m => m.captured).sort((a, b) => VAL[b] - VAL[a]);
    el.className = `player ink-${color}${turn === color && !over ? ' on' : ''}`;
    // las piezas comidas se van a dormir junto a quien las comió
    el.innerHTML = `<span class="who">${pieceSVG('k', color)}<span>${name}</span></span><span class="caps">${caps.map(t => pieceSVG(t, other(color), 'sleepy')).join('')}</span>`;
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

// ---------- el mundo alrededor del tablero sigue la partida (tablet acostada) ----------
const NOTES = [
  ['¿Quién va ganando?', '¡Shhh, estoy pensando!'],
  ['¡Qué buena jugada!', 'Ya lo sé :)'],
  ['¿Y si me rindo?', '¡Nunca jamás!'],
  ['El caballo me da miedo', 'A mí también'],
  ['¿Tienes hambre?', 'Después del jaque mate'],
  ['Mi peón quiere ser reina', '¡Que siga caminando!'],
  ['¿Un descanso?', '¡Una jugada más!'],
  ['Cuida a tu rey', 'Cuida tú al tuyo'],
];
function world(c, turn, over) {
  const el = $('#world');
  if (getComputedStyle(el).display === 'none') return;
  const plies = G.moves.length, x = 14 + Math.min(plies, 100) * 2.3;
  const note = plies >= 6 ? NOTES[(Math.floor(plies / 6) - 1) % NOTES.length] : null;
  el.innerHTML = `
    <div class="sky-row">${skySVG('sun', turn === 'w' && !over)}${skySVG('moon', turn === 'b' && !over)}</div>
    <div class="snail-path"><svg viewBox="0 0 270 56" aria-hidden="true"><path d="M8 50L262 50" stroke="currentColor" stroke-width="2.4" stroke-dasharray="2 9" stroke-linecap="round"/><g transform="translate(${x} 2) scale(.66)">${doodle('snail')}</g></svg><small>jugada ${Math.ceil(plies / 2) || 0}</small></div>
    ${note ? `<p class="sticky"><span class="ink-w">${note[0]}</span><span class="ink-b">${note[1]}</span></p>` : ''}`;
}

function gameOver() {
  if (!G.chess.isGameOver()) return;
  const r = result();
  if (G.mode === 'bot') {
    store.results = [{ level: G.level, r: r.happy ? 'w' : r.win ? 'l' : 'd' }, ...(store.results || [])].slice(0, 200);
    save();
  }
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

// si nadie toca la pantalla un rato, las piezas del que juega se duermen
let lastTouch = Date.now();
addEventListener('pointerdown', () => {
  lastTouch = Date.now();
  if (G?.sleepy) { G.sleepy = false; render(); }
}, true);
setInterval(() => {
  if (!G || G.sleepy || document.body.dataset.screen !== 'game' || G.thinking || G.chess.isGameOver() || !humanTurn()) return;
  if (Date.now() - lastTouch > 25000) { G.sleepy = true; render(); }
}, 5000);

// ---------- arranque ----------
const learn = initLearn({ show, pickPromotion, sound, whyIllegal });

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
for (const b of $$('[data-art]')) b.insertAdjacentHTML('afterbegin', pieceSVG(b.dataset.art, b.dataset.color || 'w', b.dataset.mood));

// marco a pluma en cada botón y tarjeta, también en los que se crean después; se redibuja si cambia de tamaño
const FRAMED = '.btn, .seg button, .mode, .card';
const drawFrame = el => {
  const w = el.offsetWidth, h = el.offsetHeight;
  return w && h ? frame(w, h, el.seed ??= Math.random() * 1e6 | 0) : '<svg class="frame" aria-hidden="true"></svg>';
};
const sized = new ResizeObserver(list => {
  for (const { target: el } of list) {
    const old = el.querySelector(':scope > .frame');
    if (old && el.offsetWidth) old.outerHTML = drawFrame(el);
  }
});
const addFrame = el => {
  if (el.querySelector(':scope > .frame')) return;
  el.insertAdjacentHTML('afterbegin', drawFrame(el));
  sized.observe(el);
};
for (const el of $$(FRAMED)) addFrame(el);
new MutationObserver(list => {
  for (const m of list) for (const n of [m.target, ...m.addedNodes]) {
    if (n.nodeType !== 1 || n instanceof SVGElement) continue; // el tablero cambia mucho; ahí no hay botones
    if (n.matches(FRAMED)) addFrame(n);
    for (const el of n.querySelectorAll(FRAMED)) addFrame(el);
  }
}).observe(document.body, { childList: true, subtree: true });
$('.hero').innerHTML = pieceSVG('k', 'w', 'happy') + pieceSVG('p', 'b') + pieceSVG('q', 'b', 'happy');
paintSound();
drawDoodles();
addEventListener('resize', drawDoodles);
startBoil();
show('menu');

if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
