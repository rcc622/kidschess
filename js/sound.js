// Sonidos procedurales con Web Audio: trazo de pluma, "puf" de captura, melodías. Sin archivos.
let ctx = null;
export let on = true;
export const setOn = v => { on = v; };

function ac() {
  ctx ??= new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

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
  g.connect(c.destination);
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
  win: (c, t) => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(c, t + i * 0.11, f, i === 5 ? 0.5 : 0.16)),
  lose: (c, t) => [392, 330, 262].forEach((f, i) => tone(c, t + i * 0.18, f, 0.3, 'sine', 0.15)),
  draw: (c, t) => { tone(c, t, 440, 0.2, 'sine', 0.15); tone(c, t + 0.22, 440, 0.3, 'sine', 0.15); },
};

export function play(name) {
  if (!on) return;
  try { const c = ac(); tunes[name]?.(c, c.currentTime + 0.01); } catch { /* sin audio: no pasa nada */ }
}
