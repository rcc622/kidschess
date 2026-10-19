// Flujo de la app: menú → opciones → partida → fin. Guardado en localStorage.
import { Chess } from './chess.js';
import { createBoard } from './board.js';
import { pieceSVG, pieceArt, boardArt, frame, doodle, icon, skySVG, tallySVG, lapizSVG, spiderSVG, antsSVG, startBoil, DEFS, SETS, setPieceSet, pieceSet, SCHEMES, setScheme, scheme } from './art.js';
import * as sound from './sound.js';
import { initLearn } from './learn.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const other = c => (c === 'w' ? 'b' : 'w');
const NAME = c => SCHEMES[scheme].names[c]; // Azul/Rojo, Blancas/Negras o Naranja/Morado
const sideVoice = (base, c) => `${base}_${NAME(c).toLowerCase()}`; // turno_azul, mate_blancas…
const LEVEL = { 0: 'dormilón', 1: 'fácil', 2: 'medio', 3: 'difícil', 4: 'experto' };
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
store.opts = { mode: 'bot', level: '1', color: 'w', helps: 'muchas', spin: '0', set: 'garabato', guide: false, classic: false, clock: '10', scheme: 'tinta', musicStyle: 'infantil', voz: 'mujer', ...store.opts };
sound.setVoice(store.opts.voz);
setPieceSet(store.opts.set);
sound.setMusicStyle(store.opts.musicStyle);
function applyScheme() {
  setScheme(store.opts.scheme);
  const C = SCHEMES[store.opts.scheme], root = document.documentElement.style;
  root.setProperty('--side-w', C.ink.w);
  root.setProperty('--side-b', C.ink.b);
}
applyScheme();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* modo privado o sin espacio */ } };
store.audio = { fx: true, voice: true, music: true, ...store.audio, mute: false }; // el silencio general se cambió por los tres botones
sound.setPrefs(store.audio);

let G = null; // partida en curso: datos guardables + chess, thinking, hint...
const persist = () => {
  const { chess, thinking, hinting, hint, spinSide, sleepy, say, oops, sayTimer, guideAt, tickAt, lowSaid, ...data } = G;
  store.game = data;
  save();
};

// ---------- pantallas ----------
function show(id) {
  for (const s of $$('.screen')) s.hidden = s.id !== id;
  document.body.dataset.screen = id;
  if (id === 'menu') paintMenu();
  if (id !== 'game') sound.music('calma');
}

function paintMenu() {
  const g = store.game, btn = $('[data-go="resume"]');
  const c = new Chess();
  let live = false;
  if (g?.moves?.length) {
    try { g.moves.forEach(m => c.move(m)); live = !c.isGameOver() && bareLeft(g) > 0 && !g.flag; } catch { live = false; }
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

// los dibujitos de botones y portada siguen al juego de piezas elegido
function paintArt() {
  for (const el of $$('[data-art]')) {
    const svg = pieceSVG(el.dataset.art, el.dataset.color || 'w', el.dataset.mood, el.dataset.set);
    if (el.tagName !== 'BUTTON') { el.innerHTML = svg; continue; }
    let slot = el.querySelector(':scope > .art-slot');
    if (!slot) { el.insertAdjacentHTML('afterbegin', '<span class="art-slot"></span>'); slot = el.querySelector(':scope > .art-slot'); }
    slot.innerHTML = svg;
  }
  $('.theme-mini').innerHTML = pieceSVG('k', 'w') + pieceSVG('q', 'b');
  for (const el of $$('[data-sch]')) el.innerHTML = pieceSVG('q', 'w', 'happy', undefined, el.dataset.sch) + pieceSVG('k', 'b', 'happy', undefined, el.dataset.sch);
  $('.hero').innerHTML = pieceSVG('k', 'w', 'happy') + `<button class="lapiz-btn hero-lapiz" data-act="lapiz" aria-label="Lápiz te saluda">${lapizSVG('happy')}</button>` + pieceSVG('q', 'b', 'happy');
}

// personalización: cada tema trae sus personajes, sus lecciones y su voz
function paintThemes() {
  const row = (k, c) => `<span class="theme-row">${[...'kqrbnp'].map(t => pieceSVG(t, c, 'idle', k)).join('')}</span>`;
  $('#theme-list').innerHTML = Object.entries(SETS).map(([k, S]) =>
    `<button class="btn theme-card${k === store.opts.set ? ' hi' : ''}" data-theme="${k}" aria-pressed="${k === store.opts.set}"><b>${S.name}</b>${row(k, 'w')}${row(k, 'b')}</button>`).join('');
}
function chooseTheme(k) {
  store.opts.set = k;
  setPieceSet(k);
  save();
  paintArt();
  paintThemes();
  paintSetup();
  sound.play('promote');
  sound.say(`tema_${k}`);
}

function paintSetup() {
  const o = store.opts;
  for (const el of $$('.bot-only')) el.hidden = o.mode !== 'bot';
  for (const el of $$('.pair-only')) el.hidden = o.mode !== 'pair';
  for (const seg of $$('.seg')) for (const b of $$('button', seg)) b.setAttribute('aria-pressed', b.dataset.val === o[seg.dataset.opt]);
  $('#helps-note').textContent = HELPS[o.helps].note;
  $('[data-check="guide"]').checked = o.guide;
  $('[data-check="classic"]').checked = o.classic;
  $('.clock-opt').hidden = !o.classic;
  if (o.classic) $('.guide-opt').hidden = true;
  for (const el of $$('[data-side]')) el.textContent = NAME(el.dataset.side);
}

// efectos, voz y música se prenden por separado en el menú; en la partida un solo botón calla todo
const AUDIO = { fx: ['sound', 'Efectos'], voice: ['voice', 'Voz'], music: ['music', 'Música'] };
function paintAudio() {
  const a = store.audio;
  for (const [k, [ico, label]] of Object.entries(AUDIO)) for (const b of $$(`[data-act="${k}"]`)) {
    b.innerHTML = icon(ico) + `<span>${label}</span>`;
    b.setAttribute('aria-pressed', a[k]);
  }
  const off = !a.fx && !a.voice && !a.music, b = $('[data-act="sound-menu"]');
  b.innerHTML = icon(off ? 'mute' : 'sound');
  b.setAttribute('aria-label', off ? 'Sonido apagado: prender efectos, voz o música' : 'Sonido: efectos, voz y música');
}
function soundMenu(open = $('#sound-pop').hidden) {
  $('#sound-pop').hidden = !open;
  $('[data-act="sound-menu"]').setAttribute('aria-expanded', open);
}
function setAudio(k) {
  store.audio[k] = !store.audio[k];
  sound.setPrefs(store.audio);
  save();
  paintAudio();
  sound.play('select');
}

// ---------- partida ----------
const humanTurn = () => G.mode === 'pair' || G.chess.turn() === G.human;
const flipped = () => (G.mode === 'bot' ? G.human === 'b' : G.spin === '1' && G.spinSide === 'b') !== G.flip;

function newGame() {
  const o = store.opts;
  const human = o.mode === 'bot' ? (o.color === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : o.color) : 'w';
  const clock = o.classic ? { w: o.clock * 60000, b: o.clock * 60000 } : null;
  loadGame({ mode: o.mode, level: o.level, helps: o.helps, spin: o.spin, human, moves: [], undos: 0, hints: 0, flip: false, guide: o.mode === 'bot' && o.guide && !o.classic, classic: o.classic, clock, flag: null, bareAt: null }, true);
  persist();
}

function loadGame(data, intro = false) {
  const chess = new Chess();
  try { data.moves.forEach(m => chess.move(m)); } catch { data.moves = chess.history({ verbose: true }).map(m => m.lan); }
  G = { ...data, chess, thinking: false, hinting: false, hint: null, spinSide: chess.turn() };
  checkBare(false);
  lastTouch = Date.now();
  $('#dialog').hidden = true;
  show('game');
  render(intro ? { intro: true } : undefined);
  if (ended()) return;
  if (!humanTurn()) setTimeout(botTurn, intro ? 1400 : 0);
  else {
    if (intro) setTimeout(() => G.chess === chess && sound.say(G.classic ? 'clasico_hola' : G.guide ? 'guia_hola' : G.mode === 'pair' ? sideVoice('turno', 'w') : 'te_toca'), 1300);
    setTimeout(() => G.chess === chess && guideTurn(), intro ? 2600 : 600);
  }
}

// ---------- final de rey solo: cuenta de jugadas para dar jaque mate; si se acaban, tablas ----------
const bareLimit = g => (g.mode === 'pair' || +g.level <= 1 ? 25 : 20);
const bareSide = c => ['w', 'b'].find(col => c.board().flat().every(p => !p || p.color !== col || p.type === 'k'));
const bareLeft = g => (g.bareAt == null || g.classic ? Infinity : bareLimit(g) - Math.floor((g.moves.length - g.bareAt) / 2));
const ended = () => G.chess.isGameOver() || bareLeft(G) <= 0 || !!G.flag;
function checkBare(announce) {
  const g = G, side = bareSide(g.chess);
  if (g.classic) return;
  if (!side) { g.bareAt = null; return; }
  if (g.bareAt != null && g.bareAt <= g.moves.length) return;
  g.bareAt = g.moves.length;
  if (announce) setTimeout(() => G === g && sound.say(g.mode === 'pair' ? 'solo_rey_pareja' : side === g.human ? 'solo_rey_tu' : 'solo_rey_bot'), 1300);
}

const view = createBoard($('#board'), {
  pick(sq) {
    if (!G || G.thinking || G.hinting || ended() || !humanTurn()) return false;
    return G.chess.get(sq)?.color === G.chess.turn();
  },
  targets: sq => G.chess.moves({ square: sq, verbose: true }).map(m => ({ to: m.to, capture: !!m.captured })),
  move: humanMove,
  showTargets: () => HELPS[G.helps].moves,
  sound: sound.play,
  select: sq => sound.creature(G.chess.get(sq)?.type, pieceSet),
  miss(from, to) {
    sound.play('bonk');
    const why = whyIllegal(G.chess, from, to);
    sound.say(why.key);
    G.oops = { sq: from, kind: '?' };
    tell(why.text);
  },
});

// frase corta de Lápiz en la barra de estado
function tell(text, ms = 2800) {
  const g = G;
  g.say = text;
  render();
  clearTimeout(g.sayTimer);
  g.sayTimer = setTimeout(() => { g.say = g.oops = null; if (G === g) render(); }, ms);
}

// explica con palabras de niño por qué esa jugada no vale
const WHY = {
  como_p: 'El peón camina derecho y solo come en diagonal.',
  como_n: 'El caballo salta en forma de L.',
  como_b: 'El alfil solo va en diagonal.',
  como_r: 'La torre solo va en línea recta.',
  como_q: 'La reina va en línea recta o en diagonal.',
  como_k: 'El rey camina de una en una casilla.',
  ilegal_jaque: '¡Tu rey está en jaque! Primero tienes que salvarlo.',
  ilegal_peligro: 'No se puede: tu rey quedaría en peligro.',
  ilegal_enroque: 'Para enrocar, ni el rey ni la torre deben haberse movido, y el camino debe estar libre.',
  ilegal_enfrente: 'Hay alguien enfrente: el peón no puede pasar.',
  ilegal_diagonal: 'El peón solo va en diagonal cuando come.',
  ilegal_camino: 'Hay alguien en el camino.',
};
// devuelve { key, text }: key es el audio de Lápiz con la misma frase
function whyIllegal(c, from, to) {
  const key = reason(c, from, to);
  return { key, text: WHY[key] || '' };
}
function reason(c, from, to) {
  const p = c.get(from);
  if (!p) return '';
  const sqName = n => 'abcdefgh'[n & 15] + (8 - (n >> 4));
  // ponytail: _moves es interno de chess.js (copiado local, versión fija)
  const pseudo = c._moves({ legal: false, square: from }).some(m => sqName(m.to) === to);
  if (c.inCheck()) return 'ilegal_jaque';
  if (pseudo) return 'ilegal_peligro';
  const dx = to.charCodeAt(0) - from.charCodeAt(0), dy = +to[1] - +from[1], ax = Math.abs(dx), ay = Math.abs(dy);
  if (p.type === 'k' && ax === 2 && !dy) return 'ilegal_enroque';
  const ahead = dy * (p.color === 'w' ? 1 : -1) > 0;
  if (p.type === 'p' && !dx && ahead && ay <= 2) return 'ilegal_enfrente';
  if (p.type === 'p' && ax === 1 && ay === 1 && ahead) return 'ilegal_diagonal';
  const line = !dx || !dy, diag = ax === ay;
  if ((p.type === 'r' && line) || (p.type === 'b' && diag) || (p.type === 'q' && (line || diag))) return 'ilegal_camino';
  return `como_${p.type}`;
}

async function humanMove(from, to, dragged) {
  const p = G.chess.get(from);
  let promotion;
  if (p.type === 'p' && (to[1] === '8' || to[1] === '1')) {
    promotion = await pickPromotion(p.color);
    if (!promotion) return render();
  }
  if (G.guide && risky({ from, to, promotion }) && !(await confirmRisk(G.chess.get(from).type, promotion))) return render();
  play({ from, to, promotion }, dragged);
}

// modo guía: ¿la pieza queda donde se la pueden comer y sale perdiendo?
function risky(m) {
  const c = G.chess, mv = c.move(m), p = { ...c.get(mv.to), square: mv.to };
  const bad = p.type !== 'p' && p.type !== 'k' && !c.isCheckmate() && inDanger(c, p) && VAL[p.type] > (VAL[mv.captured] || 0);
  c.undo();
  return bad;
}
function confirmRisk(type, promotion) {
  sound.say('guia_cuidado');
  const t = promotion || type;
  return new Promise(res => dialog({
    title: '¡Cuidado!',
    text: `Ahí te pueden comer tu ${PIECE_NAME[t].toLowerCase()}. ¿Seguro que quieres ir ahí?`,
    art: pieceSVG(t, G.human, 'scared'),
    buttons: [['Mejor no', () => res(false), 'red'], ['Sí, ir ahí', () => res(true)]],
    cancel: () => res(false),
  }));
}

// modo guía (y finales fáciles contra un rey solo): Lápiz enseña solito una buena jugada en cada turno
const guiding = () => G.mode === 'bot' && !G.classic && (G.guide || (+G.level <= 1 && bareSide(G.chess) === other(G.human)));
async function guideTurn() {
  const g = G, c = g.chess, n = g.moves.length;
  if (!guiding() || ended() || !humanTurn() || g.thinking || g.guideAt === n) return;
  g.guideAt = n;
  const mate = c.moves({ verbose: true }).some(m => { c.move(m); const x = c.isCheckmate(); c.undo(); return x; });
  if (mate) { sound.say('guia_mate'); tell('¡Psst! Hay un jaque mate. ¡Búscalo!', 3500); }
  await new Promise(r => setTimeout(r, mate ? 3500 : 900));
  if (G !== g || g.moves.length !== n || g.hint || g.hinting) return;
  const m = await askBot('hint');
  if (G !== g || g.moves.length !== n || g.hinting) return;
  g.hint = m;
  render();
}

function play(m, dragged = false) {
  const g = G, c = g.chess;
  if (g.flag) return;
  tickClock();
  let mv;
  try { mv = c.move(m); } catch { return render(); }
  g.hint = null;
  g.moves.push(mv.lan);
  lastTouch = Date.now();
  const castle = mv.isKingsideCastle() || mv.isQueensideCastle();
  const anim = { moves: dragged ? [] : [{ from: mv.from, to: mv.to }] };
  if (castle) {
    const ks = mv.isKingsideCastle(), r = mv.from[1];
    anim.moves.push({ from: (ks ? 'h' : 'a') + r, to: (ks ? 'f' : 'd') + r });
  }
  if (mv.captured) anim.captured = { type: mv.captured, color: other(mv.color), sq: mv.isEnPassant() ? mv.to[0] + mv.from[1] : mv.to };
  if (mv.promotion) anim.promote = mv.to;
  sound.play(c.inCheck() && !c.isCheckmate() ? 'check' : mv.captured ? 'capture' : castle ? 'castle' : mv.promotion ? 'promote' : 'move');
  if (mv.captured) sound.creature('ay');
  if (c.inCheck() && !c.isCheckmate()) sound.say(g.mode === 'bot' && c.turn() !== g.human ? 'jaque_bot' : 'jaque_tu');
  else if (g.mode === 'pair' && !c.isGameOver()) sound.say(sideVoice('turno', c.turn()));
  checkBare(true);
  persist();
  render(anim);
  if (g.mode === 'pair' && g.spin === '1') {
    setTimeout(() => { if (G === g && g.spinSide !== c.turn()) { g.spinSide = c.turn(); render(); } }, 800);
  }
  if (ended()) setTimeout(() => G === g && gameOver(), 900);
  else if (!humanTurn()) botTurn();
  else guideTurn();
}

// ---------- bot (Web Worker) ----------
// si el navegador no deja usar el Worker (iPad viejo, hosting raro), el bot piensa aquí mismo
let worker = null, reqId = 0, noWorker = false;
const thinkHere = (id, moves, level) => import('./bot.js').then(m => new Promise(res => setTimeout(() => res({ id, ...m.think(moves, level) }), 30)));
function askBot(level) {
  const id = ++reqId, moves = G.moves.slice();
  if (!noWorker) try { worker ??= new Worker(new URL('./bot.js', import.meta.url), { type: 'module' }); } catch { noWorker = true; }
  if (noWorker) return thinkHere(id, moves, level);
  return new Promise(res => {
    worker.onmessage = ({ data }) => data.id === id && res(data);
    worker.onerror = () => { noWorker = true; worker = null; thinkHere(id, moves, level).then(res); };
    worker.postMessage({ id, moves, level });
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
const canUndo = () => !G.classic && G.undos < helps().undo && humanMoved() && !G.hinting;
const canHint = () => !G.classic && G.hints < helps().hints && humanTurn() && !G.thinking && !G.hinting && !ended();

function undo() {
  if (!canUndo()) return;
  const c = G.chess;
  G.thinking = false;
  c.undo(); G.moves.pop();
  if (G.mode === 'bot') while (c.turn() !== G.human && G.moves.length) { c.undo(); G.moves.pop(); }
  G.undos++;
  G.hint = null;
  G.spinSide = c.turn();
  G.guideAt = null;
  checkBare(false);
  sound.play('select');
  persist();
  render();
  if (!humanTurn()) botTurn();
  else guideTurn();
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
  sound.say('pista');
  persist();
  render();
}

function inDanger(c, p) {
  const att = c.attackers(p.square, other(p.color));
  if (!att.length) return false;
  if (!c.isAttacked(p.square, p.color)) return true; // nadie la defiende
  return Math.min(...att.map(s => VAL[c.get(s).type])) < VAL[p.type]; // la ataca alguien que vale menos
}

// ¿le quedan piezas para poder dar mate? (si no, perder por tiempo es tablas)
const canMate = (c, col) => {
  const mine = c.board().flat().filter(p => p && p.color === col && p.type !== 'k');
  return mine.some(p => 'pqr'.includes(p.type)) || mine.length >= 2;
};

function result() {
  const c = G.chess;
  if (G.flag) {
    const win = other(G.flag);
    if (!canMate(c, win)) return { title: 'Tablas', text: 'Se acabó el tiempo, pero no quedan piezas para dar jaque mate.', win: null, happy: false, voice: 'tiempo_tablas' };
    if (G.mode === 'pair') return { title: `¡Gana ${NAME(win)}!`, text: `Se le acabó el tiempo a ${NAME(G.flag)}.`, win, happy: true, voice: sideVoice('tiempo', win) };
    return win === G.human
      ? { title: '¡Ganaste!', text: 'Al bot se le acabó el tiempo.', win, happy: true, voice: 'tiempo_ganaste' }
      : { title: 'Ganó el bot', text: 'Se te acabó el tiempo. ¡La próxima le ganas!', win, happy: false, voice: 'tiempo_bot' };
  }
  if (!c.isGameOver()) return { title: 'Tablas', text: 'Se acabaron las jugadas para dar jaque mate.', win: null, happy: false, out: true };
  if (c.isCheckmate()) {
    const win = other(c.turn());
    if (G.mode === 'pair') return { title: `¡Gana ${NAME(win)}!`, text: '¡Jaque mate!', win, happy: true };
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
  const c = G.chess, turn = c.turn(), over = ended(), check = c.inCheck(), h = helps();
  const hist = c.history({ verbose: true }), last = hist[hist.length - 1], mine = humanTurn();
  const mood = p => {
    if (over) return !c.isCheckmate() ? 'idle' : p.color === turn ? (p.type === 'k' ? 'dead' : 'scared') : 'happy';
    if (p.type === 'k' && p.color === turn && check) return 'scared';
    if (last && last.to === p.square && last.captured) return 'happy';
    if (h.danger && mine && p.color === turn && p.type !== 'k' && inDanger(c, p)) return 'scared';
    return G.sleepy && p.color === turn ? 'sleepy' : 'idle';
  };
  const mate = over && c.isCheckmate();
  const animOf = p => mate ? (p.color !== turn ? 'cheer' : p.type === 'k' ? 'dizzy' : null) : G.oops?.sq === p.square ? 'refuse' : null;
  const pieces = {}, kings = {};
  for (const row of c.board()) for (const p of row) {
    if (!p) continue;
    pieces[p.square] = { type: p.type, color: p.color, mood: mood(p), anim: animOf(p) };
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
  world(c, turn, over, hist);
  const won = over && c.isCheckmate() && (G.mode === 'pair' || other(turn) === G.human);
  sound.music(won ? 'victoria' : check && !over ? 'tension' : 'calma');

  let s;
  if (G.say && !over) s = `<span class="say">${G.say}</span>`;
  else if (over) s = result().title;
  else if (G.thinking) s = 'El bot está pensando<span class="dots"></span>';
  else if (G.hinting) s = 'Buscando una pista<span class="dots"></span>';
  else if (G.mode === 'bot') s = '¡Te toca!';
  else s = `Turno de <b class="ink-${turn}">${NAME(turn)}</b>`;
  if (check && !over) s += ' <b class="alert">¡Jaque!</b>';
  const left = bareLeft(G);
  if (left !== Infinity && !over) s += `<small class="count${left <= 5 ? ' alert' : ''}">${left === 1 ? 'Queda 1 jugada' : `Quedan ${left} jugadas`} para el jaque mate</small>`;
  $('#status').innerHTML = s;

  const bottom = flipped() ? 'b' : 'w';
  for (const [el, color] of [[$('#p-bottom'), bottom], [$('#p-top'), other(bottom)]]) {
    const name = G.mode === 'bot' ? (color === G.human ? 'Tú' : `Bot ${LEVEL[G.level]}`) : NAME(color);
    const caps = hist.filter(m => m.captured && m.color === color).map(m => m.captured).sort((a, b) => VAL[b] - VAL[a]);
    el.className = `player ink-${color}${turn === color && !over ? ' on' : ''}`;
    // las piezas comidas se van a dormir junto a quien las comió
    el.innerHTML = `<span class="who">${pieceSVG('k', color)}<span>${name}</span></span>${G.clock ? `<span class="clock" data-clock="${color}"></span>` : ''}<span class="caps">${caps.map(t => pieceSVG(t, other(color), 'sleepy')).join('')}</span>`;
  }
  paintClocks();

  const undoBtn = $('[data-act="undo"]'), hintBtn = $('[data-act="hint"]');
  undoBtn.disabled = !canUndo();
  undoBtn.hidden = h.undo === 0 || G.classic;
  $('span', undoBtn).textContent = h.undo === Infinity ? 'Deshacer' : `Deshacer (${Math.max(0, h.undo - G.undos)})`;
  hintBtn.hidden = h.hints === 0 || G.classic;
  hintBtn.disabled = !canHint();
  $('span', hintBtn).textContent = h.hints === Infinity ? 'Pista' : `Pista (${Math.max(0, h.hints - G.hints)})`;
  $('[data-act="again"]').hidden = !over;
}

// ---------- reloj del modo clásico: corre el del que tiene el turno; se pausa fuera de la partida ----------
const fmt = ms => { const s = Math.ceil(Math.max(0, ms) / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
function paintClocks() {
  if (!G?.clock) return;
  for (const el of $$('[data-clock]')) {
    const ms = G.clock[el.dataset.clock];
    el.textContent = fmt(ms);
    el.classList.toggle('low', ms < 30000);
  }
}
function tickClock() {
  const g = G, now = performance.now();
  if (!g?.clock || g.flag || g.chess.isGameOver() || document.hidden || document.body.dataset.screen !== 'game') { if (g) g.tickAt = null; return; }
  const turn = g.chess.turn();
  if (g.tickAt != null) g.clock[turn] -= now - g.tickAt;
  g.tickAt = now;
  if (g.clock[turn] < 30000 && !g.lowSaid?.[turn] && humanTurn()) { (g.lowSaid ??= {})[turn] = true; sound.say('poco_tiempo'); }
  if (g.clock[turn] <= 0) {
    g.clock[turn] = 0;
    g.flag = turn;
    g.thinking = false;
    persist();
    render();
    setTimeout(() => G === g && gameOver(), 600);
    return;
  }
  paintClocks();
}
setInterval(tickClock, 200);

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
const put = (el, html) => { if (el._h !== html) { el.innerHTML = html; el._h = html; } };
function world(c, turn, over, hist) {
  const el = $('#world');
  if (getComputedStyle(el).display === 'none') return;
  if (!el.firstElementChild) el.innerHTML = '<div class="sky-row"></div><div class="snail-path"></div><div class="nap"></div><div class="w-note"></div>' + spiderSVG();
  const [sky, snail, nap, note] = el.children;
  const plies = G.moves.length, x = 14 + Math.min(plies, 100) * 2.3;
  const n = plies >= 6 ? NOTES[(Math.floor(plies / 6) - 1) % NOTES.length] : null;
  put(sky, skySVG('sun', turn === 'w' && !over) + skySVG('moon', turn === 'b' && !over));
  put(snail, `<svg viewBox="0 0 270 56" aria-hidden="true"><path d="M8 50L262 50" stroke="currentColor" stroke-width="2.4" stroke-dasharray="2 9" stroke-linecap="round"/><g transform="translate(${x} 2) scale(.66)">${doodle('snail')}</g></svg><small>jugada ${Math.ceil(plies / 2) || 0}</small>`);
  // las piezas comidas se van a dormir; la última llega cargada por hormigas
  const caps = hist.filter(m => m.captured).map(m => [m.captured, other(m.color)]).slice(-8);
  put(nap, caps.map(([t, col], i) => `<span class="napper${i === caps.length - 1 ? ' carried' : ''}">${pieceSVG(t, col, 'sleepy')}${i === caps.length - 1 ? antsSVG() : ''}</span>`).join(''));
  put(note, n ? `<p class="sticky"><span class="ink-w">${n[0]}</span><span class="ink-b">${n[1]}</span></p>` : '');
  el.classList.toggle('thinking', !!G.thinking);
}

function gameOver() {
  if (!ended()) return;
  const r = result();
  if (G.mode === 'bot') {
    store.results = [{ level: G.level, r: r.happy ? 'w' : r.win ? 'l' : 'd' }, ...(store.results || [])].slice(0, 200);
    save();
  }
  if (!r.win) sound.play('draw'); else if (!r.happy) sound.play('lose');
  sound.say(r.voice || (!r.win ? (r.out ? 'tablas_jugadas' : 'tablas') : G.mode === 'pair' ? sideVoice('mate', r.win) : r.happy ? 'mate_ganaste' : 'mate_bot'));
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
  sound.say('coronar');
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
  sound.unlock();
  lastTouch = Date.now();
  if (G?.sleepy) { G.sleepy = false; render(); }
}, true);
setInterval(() => {
  if (!G || G.sleepy || document.body.dataset.screen !== 'game' || G.thinking || ended() || !humanTurn()) return;
  if (Date.now() - lastTouch > 25000) { G.sleepy = true; render(); sound.say('dormido'); }
}, 5000);

// gestos al azar: parpadear, mirar a los lados, brinquito, bailecito
const GAGS = ['blink', 'blink', 'blink', 'look', 'hop', 'wiggle'];
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) setInterval(() => {
  if (document.hidden) return;
  const arts = $$('.screen:not([hidden]) .art');
  for (let i = 0; i < 2 && arts.length; i++) {
    const el = arts[Math.floor(Math.random() * arts.length)], g = 'gag-' + GAGS[Math.floor(Math.random() * GAGS.length)];
    el.classList.add(g);
    setTimeout(() => el.classList.remove(g), 1600);
  }
}, 1500);

// ---------- arranque ----------
const learn = initLearn({ show, pickPromotion, sound, whyIllegal });

// Lápiz: en el menú saluda; en la partida da una pista si se puede, si no recuerda de quién es el turno
function tapLapiz() {
  const scr = document.body.dataset.screen;
  if (scr === 'lesson') return learn.speak();
  if (scr !== 'game' || !G) return sound.say('hola');
  if (canHint()) return hint();
  if (ended()) return;
  sound.say(G.thinking ? 'hola' : G.mode === 'pair' ? sideVoice('turno', G.chess.turn()) : 'te_toca');
}
sound.setOnTalk(on => document.body.classList.toggle('talking', on));

const actions = {
  fx: () => setAudio('fx'),
  voice: () => setAudio('voice'),
  music: () => setAudio('music'),
  'sound-menu': () => soundMenu(),
  lapiz: tapLapiz,
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
  if (!e.target.closest('#sound-pop, [data-act="sound-menu"]')) soundMenu(false);
  const b = e.target.closest('button');
  if (!b) return;
  const go = b.dataset.go, seg = b.closest('.seg');
  if (go === 'menu') show('menu');
  else if (go === 'resume') loadGame(store.game);
  else if (go === 'bot' || go === 'pair') openSetup(go);
  else if (go === 'learn') learn.open();
  else if (go === 'themes') { paintThemes(); show('themes'); }
  else if (go === 'settings') { paintSetup(); show('settings'); }
  if (b.dataset.theme) chooseTheme(b.dataset.theme);
  if (b.dataset.act) actions[b.dataset.act]?.();
  if (seg) {
    store.opts[seg.dataset.opt] = b.dataset.val;
    if (seg.dataset.opt === 'set') { setPieceSet(b.dataset.val); paintArt(); sound.say(`tema_${b.dataset.val}`); }
    if (seg.dataset.opt === 'scheme') { applyScheme(); paintArt(); }
    if (seg.dataset.opt === 'musicStyle') { sound.unlock(); sound.setMusicStyle(b.dataset.val); }
    if (seg.dataset.opt === 'voz') { sound.setVoice(b.dataset.val); sound.say('hola'); warmVoice(); }
    save(); paintSetup(); sound.play('select');
  }
});

document.addEventListener('change', e => {
  const k = e.target.dataset.check;
  if (!k) return;
  store.opts[k] = e.target.checked;
  save();
  paintSetup();
  sound.play('select');
});

for (const i of $$('[data-icon]')) i.outerHTML = icon(i.dataset.icon);
document.body.insertAdjacentHTML('afterbegin', DEFS);
paintArt();

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
for (const el of $$('.lapiz-slot')) el.innerHTML = lapizSVG();
paintAudio();
drawDoodles();
addEventListener('resize', drawDoodles);
startBoil();
show('menu');

// sin internet: el service worker guarda la app y la voz de Lápiz elegida
const warmVoice = () => navigator.serviceWorker?.ready.then(r => r.active?.postMessage({ voz: store.opts.voz }));
if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
  navigator.serviceWorker.register('sw.js').then(warmVoice).catch(() => {});
}
