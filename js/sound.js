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
}

export async function say(key) {
  if (prefs.mute || !prefs.voice) return;
  try {
    const buf = await load(`audio/voz/${key}.mp3`);
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
  } catch { /* sin archivo o sin audio: el texto ya está en pantalla */ }
}

function duck(on) {
  if (!musicBus) return;
  const t = ctx.currentTime;
  musicBus.gain.cancelScheduledValues(t);
  musicBus.gain.setValueAtTime(musicBus.gain.value, t);
  musicBus.gain.linearRampToValueAtTime(on ? DUCK_VOL : MUSIC_VOL, t + (on ? 0.15 : 0.6));
}

// ---------- voces de personajes (al agarrar una pieza, al ser comida) ----------
export async function creature(name) {
  if (prefs.mute || !prefs.fx) return;
  try { shot(await load(`audio/sfx/${name}.mp3`), master, 0.7); } catch { /* nada */ }
}

// ---------- música: calma, tensión o victoria; cambia con cruce suave ----------
let mood = null, track = null;
export function music(m) {
  mood = m;
  if (ctx) applyMusic();
}

async function applyMusic() {
  const want = prefs.music && !prefs.mute ? mood : null;
  if ((track?.mood ?? null) === want) return;
  if (track) fadeOut(track);
  track = want ? { mood: want, parts: [], timer: 0 } : null;
  if (!track) return;
  const t = track;
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
    try { s.stop(now + 1.3); } catch { /* ya paró */ }
  }
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
