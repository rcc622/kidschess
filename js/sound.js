// Sonido: efectos hechos con código (Web Audio) + voz de Lápiz, voces de personajes y música
// generadas con ElevenLabs (carpeta audio/). Todo pasa por un mezclador con volumen por canal.
let ctx = null, master = null, musicBus = null, voiceBus = null;
export const prefs = { fx: true, voice: true, music: true, mute: false };

const MUSIC_VOL = 0.32, DUCK_VOL = 0.1, XF = 2.5;

function ac() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.connect(ctx.destination);
    musicBus = ctx.createGain();
    musicBus.gain.value = MUSIC_VOL;
    musicBus.connect(master);
    voiceBus = ctx.createGain();
    voiceBus.connect(master);
  }
  if (ctx.state === 'suspended' && !document.hidden) ctx.resume();
  return ctx;
}

// el navegador solo deja sonar después de un toque: se llama en el primer pointerdown
export function unlock() {
  try { ac(); applyMusic(); } catch { /* sin audio */ }
}
document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend(); else ctx.resume();
});

export function setPrefs(p) {
  Object.assign(prefs, p);
  if (prefs.mute || !prefs.voice) stopVoice();
  if (ctx) applyMusic();
}

// ---------- archivos ----------
const cache = new Map();
function load(url) {
  if (!cache.has(url)) {
    cache.set(url, fetch(url)
      .then(r => { if (!r.ok) throw new Error(url); return r.arrayBuffer(); })
      .then(b => new Promise((res, rej) => ac().decodeAudioData(b, res, rej))));
    cache.get(url).catch(() => cache.delete(url));
  }
  return cache.get(url);
}

function shot(buf, bus, vol = 1) {
  const c = ac(), g = c.createGain(), s = c.createBufferSource();
  g.gain.value = vol;
  s.buffer = buf;
  s.connect(g).connect(bus);
  s.start();
  return s;
}

// ---------- voz de Lápiz ----------
let talking = null, onTalk = null;
export const setOnTalk = f => { onTalk = f; };

function stopVoice() {
  try { talking?.stop(); } catch { /* ya terminó */ }
  talking = null;
  window.speechSynthesis?.cancel();
}

// si falta el audio de una frase, la lee la voz del sistema (si el teléfono tiene español)
function speak(text) {
  const ss = window.speechSynthesis;
  if (!ss || !text) return;
  stopVoice();
  const u = new SpeechSynthesisUtterance(text), vs = ss.getVoices();
  u.lang = 'es-MX';
  u.pitch = 1.1;
  u.voice = vs.find(v => v.lang === 'es-MX') || vs.find(v => v.lang.startsWith('es')) || null;
  duck(true);
  onTalk?.(true);
  u.onend = u.onerror = () => { duck(false); onTalk?.(false); };
  ss.speak(u);
}

// Lápiz habla con voz de mujer o de hombre (audio/voz/<mujer|hombre>/)
let voz = 'mujer';
export const setVoice = v => { voz = v; };

export async function say(key, text) {
  if (prefs.mute || !prefs.voice) return;
  if (!key) return speak(text);
  try {
    const buf = await load(`audio/voz/${voz}/${key}.mp3`);
    if (prefs.mute || !prefs.voice) return;
    stopVoice();
    const s = shot(buf, voiceBus);
    talking = s;
    duck(true);
    onTalk?.(true);
    s.onended = () => {
      if (talking !== s) return;
      talking = null;
      duck(false);
      onTalk?.(false);
    };
  } catch { speak(text); /* sin archivo: voz del sistema, o solo el texto en pantalla */ }
}

function duck(on) {
  if (!musicBus) return;
  const t = ctx.currentTime;
  musicBus.gain.cancelScheduledValues(t);
  musicBus.gain.setValueAtTime(musicBus.gain.value, t);
  musicBus.gain.linearRampToValueAtTime(on ? DUCK_VOL : MUSIC_VOL, t + (on ? 0.15 : 0.6));
}

// ---------- voces de personajes (al agarrar una pieza, al ser comida) ----------
// sonidos grabados que hay por tema (audio/sfx/<tema>_<pieza>.mp3); Garabato usa <pieza>.mp3
const SFX = { bosque: 'pbrqk', mar: 'pnbrqk', robots: 'k' };
export async function creature(name, set = 'garabato') {
  if (prefs.mute || !prefs.fx) return;
  let file = name;
  if (set !== 'garabato' && name !== 'ay') {
    if (SFX[set]?.includes(name)) file = `${set}_${name}`;
    else if (set !== 'bosque') return critter(set, name); // al bosque le falta el caballo: usa el de Garabato
  }
  try { clip(await load(`audio/sfx/${file}.mp3`), name === 'k' ? 0.35 : 0.5); } catch { /* nada */ }
}

// sonido de personaje cortito (máx. 0.8 s, se apaga suave) y sin encimarse con el anterior
let lastClip = null;
function clip(buf, vol) {
  const c = ac(), g = c.createGain(), s = c.createBufferSource(), now = c.currentTime, end = Math.min(buf.duration, 0.8);
  try { lastClip?.stop(); } catch { /* ya terminó */ }
  g.gain.setValueAtTime(vol, now);
  g.gain.setValueAtTime(vol, now + end * 0.6);
  g.gain.linearRampToValueAtTime(0.0001, now + end);
  s.buffer = buf;
  s.connect(g).connect(master);
  s.start(now);
  s.stop(now + end + 0.02);
  lastClip = s;
}

// personajes sin grabación: bip-bup de robot, gruñido de dino, theremin espacial (peón agudo … rey grave)
const PITCH = { p: 1.5, n: 1.25, b: 1.12, r: 0.85, q: 1, k: 0.72 };
function critter(set, type) {
  try {
    const c = ac(), t = c.currentTime + 0.01, k = PITCH[type] || 1;
    if (set === 'robots') {
      const n = type === 'q' ? 3 : 2;
      for (let i = 0; i < n; i++) tone(c, t + i * 0.1, 700 * k * (i % 2 ? 0.75 : 1), 0.08, 'square', 0.05);
    } else if (set === 'clasicas') { // "toc" de pieza de madera
      scratch(c, t, 0.05, 1800, 900, 0.25);
      tone(c, t, 320 * k, 0.08, 'sine', 0.14, 220 * k);
    } else if (set === 'dinos') {
      if (type === 'p') tone(c, t, 900, 0.16, 'sine', 0.15, 1500);
      else { tone(c, t, 240 * k, 0.32, 'sawtooth', 0.07, 110 * k); scratch(c, t, 0.28, 700, 200, 0.18); }
    } else {
      const o = c.createOscillator(), lfo = c.createOscillator(), depth = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(480 * k, t);
      o.frequency.exponentialRampToValueAtTime(860 * k, t + 0.3);
      lfo.frequency.value = 8;
      depth.gain.value = 22 * k;
      lfo.connect(depth).connect(o.frequency);
      o.connect(env(c, t, 0.13, 0.45));
      o.start(t); lfo.start(t);
      o.stop(t + 0.5); lfo.stop(t + 0.5);
    }
  } catch { /* sin audio */ }
}

// ---------- música: calma, tensión o victoria; cambia con cruce suave ----------
// estilo "infantil" = archivos de audio/musica; los demás se tocan con código (ver STYLES)
let mood = null, track = null, style = 'infantil';
export function music(m) {
  mood = m;
  if (ctx) applyMusic();
}
export function setMusicStyle(s) {
  style = s;
  if (ctx) applyMusic();
}

async function applyMusic() {
  const want = prefs.music && !prefs.mute ? mood : null;
  if ((track?.mood ?? null) === want && (!track || track.style === style)) return;
  if (track) fadeOut(track);
  track = want ? { mood: want, style, parts: [], timer: 0 } : null;
  if (!track) return;
  const t = track;
  if (style !== 'infantil') return synth(t);
  try {
    const buf = await load(`audio/musica/${want}.mp3`);
    if (track === t) part(t, buf);
  } catch { /* sin música */ }
}

// cada vuelta del loop entra con fade mientras la anterior se apaga: sin "corte" al repetir
function part(t, buf) {
  if (track !== t) return;
  const c = ac(), now = c.currentTime, g = c.createGain(), s = c.createBufferSource();
  const loop = t.mood !== 'victoria', end = now + buf.duration;
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(1, now + (loop ? XF : 0.05));
  if (loop) {
    g.gain.setValueAtTime(1, end - XF);
    g.gain.linearRampToValueAtTime(0, end);
  }
  s.buffer = buf;
  s.connect(g).connect(musicBus);
  s.start(now);
  t.parts.push({ s, g });
  if (t.parts.length > 2) t.parts.shift();
  if (loop) t.timer = setTimeout(() => part(t, buf), (buf.duration - XF) * 1000);
}

function fadeOut(t) {
  clearTimeout(t.timer);
  const now = ctx.currentTime;
  for (const { s, g } of t.parts) {
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(g.gain.value, now);
    g.gain.linearRampToValueAtTime(0, now + 1.2);
    try { s?.stop(now + 1.3); } catch { /* ya paró */ }
  }
}

// ---------- música hecha con código ----------
// acordes: [nota raíz (0 = do), tipo]; tension = versión menor y un poco más rápida
const CH = { M: [0, 4, 7], m: [0, 3, 7], M7: [0, 4, 7, 11], m7: [0, 3, 7, 10], 7: [0, 4, 7, 10] };
const STYLES = {
  aventura: { bpm: 108, lead: 'triangle', bass: 'triangle', drums: 'soft', melody: [0, 2, 4, 6, 8, 10, 12, 14],
    prog: [[0, 'M'], [7, 'M'], [9, 'm'], [5, 'M']], tense: [[9, 'm'], [5, 'M'], [7, 'M'], [4, 'M']] },
  videojuego: { bpm: 128, lead: 'square', bass: 'square', drums: 'chip', arp: 1,
    prog: [[0, 'M'], [9, 'm'], [5, 'M'], [7, 'M']], tense: [[9, 'm'], [5, 'M'], [7, 'M'], [4, 'M']] },
  lofi: { bpm: 76, lead: 'sine', bass: 'sine', drums: 'lofi', keys: 1, melody: [0, 6, 10], swing: 0.3,
    prog: [[2, 'm7'], [7, '7'], [0, 'M7'], [9, 'm7']], tense: [[9, 'm7'], [5, 'M7'], [7, '7'], [4, '7']] },
  espacial: { bpm: 94, lead: 'sine', bass: 'triangle', drums: 'kick', arp: 2, pad: 1,
    prog: [[9, 'm'], [5, 'M'], [0, 'M'], [7, 'M']], tense: [[9, 'm'], [8, 'M'], [7, 'M'], [4, 'M']] },
};
const hz = n => 440 * 2 ** ((n - 69) / 12);

function note(c, out, t, n, dur, type, vol, attack = 0.012) {
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.value = hz(n);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.05);
}

let hissBuf = null;
function hiss(c, out, t, dur, type, freq, vol) {
  if (!hissBuf) {
    hissBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = hissBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = hissBuf;
  f.type = type;
  f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(out);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.02);
}

function kick(c, out, t, vol = 0.3) {
  const o = c.createOscillator(), g = c.createGain();
  o.frequency.setValueAtTime(130, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.2);
}

const DRUMS = { // bombo, tarola, platillo en 16 pasos (1 = suena)
  soft: ['1000000010000000', '0000000000001000', '0010001000100010'],
  chip: ['1000001010000000', '0000100000001000', '1010101010101010'],
  lofi: ['1000000100100000', '0000100000001000', '1010101010101010'],
  kick: ['1000000010000000', '0000000000000000', '0000100000001000'],
};

// frase de 4 compases que se repite: melodía pentatónica que en los tiempos fuertes cae en notas del acorde
function melodyNote(bar, step, chord) {
  let x = Math.sin((bar % 4) * 97.3 + step * 13.7) * 1e4;
  x -= Math.floor(x);
  if (x < 0.28 && step % 8) return null; // silencios
  const scale = [0, 2, 4, 7, 9, 12, 14, 16];
  return 72 + (step % 8 === 0 ? chord[Math.floor(x * 3)] : scale[Math.floor(x * scale.length)]);
}

function synth(t) {
  const c = ac(), S = STYLES[t.style], out = c.createGain(), now = c.currentTime;
  out.gain.setValueAtTime(0.0001, now);
  out.gain.exponentialRampToValueAtTime(1, now + 1.2);
  out.connect(musicBus);
  t.parts.push({ s: null, g: out });
  if (t.mood === 'victoria') { // fanfarria corta y silencio
    [60, 64, 67, 72].forEach((n, i) => note(c, out, now + 0.1 + i * 0.13, n, 0.2, S.lead, 0.16));
    [72, 76, 79].forEach(n => note(c, out, now + 0.65, n, 1.6, S.lead, 0.1));
    kick(c, out, now + 0.65);
    return;
  }
  const tense = t.mood === 'tension', prog = tense ? S.tense : S.prog, sd = 60 / (S.bpm * (tense ? 1.15 : 1)) / 4;
  const [kk, sn, hh] = DRUMS[S.drums], lofi = S.drums === 'lofi', chip = S.drums === 'chip';
  let echo = null, soft = out;
  if (S.pad) { // eco espacial para el arpegio y colchón de sintetizador suavecito
    soft = c.createBiquadFilter();
    soft.frequency.value = 900;
    soft.connect(out);
    echo = c.createDelay();
    const fb = c.createGain();
    echo.delayTime.value = sd * 3;
    fb.gain.value = 0.35;
    echo.connect(fb).connect(echo);
    echo.connect(out);
  }
  let step = 0, at = now + 0.1;
  const tick = () => {
    if (track !== t) return;
    while (at < c.currentTime + 0.3) {
      const i = step % 16, bar = Math.floor(step / 16), [root, kind] = prog[bar % 4], chord = CH[kind].map(n => n + root);
      const when = at + (S.swing && i % 2 ? sd * S.swing : 0);
      if (kk[i] === '1') kick(c, out, when, lofi ? 0.22 : 0.28);
      if (sn[i] === '1') hiss(c, out, when, 0.13, 'bandpass', chip ? 3000 : 1800, lofi ? 0.09 : 0.12);
      if (hh[i] === '1') hiss(c, out, when, 0.035, 'highpass', 7000, tense ? 0.05 : 0.035);
      if (i % 8 === 0 || (chip && i % 4 === 2)) note(c, out, when, 36 + root + (chip && i % 4 === 2 ? 12 : 0), sd * 3.5, S.bass, 0.15);
      if (i === 0 && (S.keys || S.pad)) chord.forEach(n => note(c, soft, when, 60 + n, sd * 15, S.pad ? 'sawtooth' : 'triangle', S.pad ? 0.025 : 0.05, S.pad ? 0.6 : 0.03));
      if (S.arp && i % S.arp === 0) {
        const j = i / S.arp;
        note(c, echo || out, when, 72 + chord[j % chord.length] + (Math.floor(j / chord.length) % 2) * 12, sd * 1.6, S.lead, S.lead === 'square' ? 0.045 : 0.09);
      }
      if (S.melody?.includes(i)) {
        const n = melodyNote(bar, i, chord);
        if (n) note(c, out, when, n, sd * (S.keys ? 5 : 1.8), S.lead, S.keys ? 0.1 : 0.12);
      }
      step++;
      at += sd;
    }
    t.timer = setTimeout(tick, 80);
  };
  tick();
}

// ---------- efectos hechos con código ----------
function noise(c, dur) {
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  return src;
}

function env(c, t, peak, dur) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(master);
  return g;
}

function scratch(c, t, dur = 0.09, f1 = 3200, f2 = 1400, vol = 0.35) {
  const n = noise(c, dur), bp = c.createBiquadFilter();
  bp.type = 'bandpass'; bp.Q.value = 1.4;
  bp.frequency.setValueAtTime(f1, t);
  bp.frequency.exponentialRampToValueAtTime(f2, t + dur);
  n.connect(bp).connect(env(c, t, vol, dur));
  n.start(t);
}

function tone(c, t, freq, dur, type = 'triangle', vol = 0.18, to) {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  o.connect(env(c, t, vol, dur));
  o.start(t);
  o.stop(t + dur + 0.05);
}

const tunes = {
  select: (c, t) => tone(c, t, 880, 0.06, 'sine', 0.08),
  move: (c, t) => { scratch(c, t); scratch(c, t + 0.07, 0.07, 2600, 1800, 0.22); },
  capture: (c, t) => {
    const n = noise(c, 0.4), lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1200, t);
    lp.frequency.exponentialRampToValueAtTime(150, t + 0.4);
    n.connect(lp).connect(env(c, t, 0.6, 0.4));
    n.start(t);
    tone(c, t, 160, 0.25, 'sine', 0.3, 60);
  },
  castle: (c, t) => { scratch(c, t); scratch(c, t + 0.12); tone(c, t + 0.2, 660, 0.12); },
  promote: (c, t) => [523, 659, 784, 1046].forEach((f, i) => tone(c, t + i * 0.07, f, 0.15)),
  check: (c, t) => { tone(c, t, 660, 0.14, 'square', 0.07); tone(c, t + 0.16, 494, 0.2, 'square', 0.07); },
  bonk: (c, t) => tone(c, t, 200, 0.15, 'sine', 0.2, 110),
  lose: (c, t) => [392, 330, 262].forEach((f, i) => tone(c, t + i * 0.18, f, 0.3, 'sine', 0.15)),
  draw: (c, t) => { tone(c, t, 440, 0.2, 'sine', 0.15); tone(c, t + 0.22, 440, 0.3, 'sine', 0.15); },
};

export function play(name) {
  if (prefs.mute || !prefs.fx) return;
  try { const c = ac(); tunes[name]?.(c, c.currentTime + 0.01); } catch { /* sin audio */ }
}
