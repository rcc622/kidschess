// Tablero SVG: dibuja casillas, marcas y piezas; maneja toque-toque y arrastre.
// Lo usan la partida y las lecciones; las reglas viven afuera (callbacks).
import { pieceArt, boardArt, marks, INK } from './art.js';

const FILES = 'abcdefgh';
const seedOf = sq => sq.charCodeAt(0) * 13 + sq.charCodeAt(1) * 7;

// cb: pick(sq) → bool, targets(sq) → [{to, capture}], move(from, to, dragged), showTargets() → bool, sound(name), miss(from, to)
export function createBoard(svg, cb) {
  svg.setAttribute('viewBox', '-20 -20 840 840');
  svg.innerHTML = '<g class="b-base"></g><g class="b-marks"></g><g class="b-under"></g><g class="b-pieces"></g><g class="b-emo"></g><g class="b-over"></g>';
  const [gBase, gMarks, gUnder, gPieces, gEmo, gOver] = svg.children;
  let st = { pieces: {} }, flipped = null, sel = null, targets = [], drag = null;

  const xy = sq => {
    const c = sq.charCodeAt(0) - 97, r = +sq[1] - 1;
    return [(flipped ? 7 - c : c) * 100, (flipped ? r : 7 - r) * 100];
  };
  const toSvg = e => {
    const p = svg.createSVGPoint();
    p.x = e.clientX; p.y = e.clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  };
  const sqAt = e => {
    const { x, y } = toSvg(e);
    if (x < 0 || y < 0 || x >= 800 || y >= 800) return null;
    let c = Math.floor(x / 100), w = Math.floor(y / 100);
    if (flipped) { c = 7 - c; w = 7 - w; }
    return FILES[c] + (8 - w);
  };

  function base() {
    let coords = '';
    for (let i = 0; i < 8; i++) {
      coords += `<text x="${i * 100 + 90}" y="792" text-anchor="end">${FILES[flipped ? 7 - i : i]}</text>`;
      coords += `<text x="7" y="${i * 100 + 24}">${flipped ? i + 1 : 8 - i}</text>`;
    }
    gBase.innerHTML = boardArt() + `<g class="coords">${coords}</g>`;
  }

  function paint() {
    let m = '';
    const { last, check, hint } = st;
    if (last) {
      for (const sq of [last.from, last.to]) m += marks.hi(...xy(sq), seedOf(sq));
      m += marks.trail(...xy(last.from), ...xy(last.to), INK[last.color || 'w'], last.knight);
    }
    if (check) m += marks.check(...xy(check), seedOf(check));
    if (sel) {
      const color = INK[st.pieces[sel]?.color || 'w'];
      m += marks.sel(...xy(sel), color, seedOf(sel));
      if (cb.showTargets()) for (const t of targets) {
        m += (t.capture ? marks.ring : marks.dot)(...xy(t.to), color, seedOf(t.to));
      }
    }
    if (hint) {
      const [x1, y1] = xy(hint.from), [x2, y2] = xy(hint.to);
      m += marks.arrow(x1 + 50, y1 + 50, x2 + 50, y2 + 50, 9);
    }
    gMarks.innerHTML = m;

    let p = '';
    for (const [sq, pc] of Object.entries(st.pieces)) {
      const [x, y] = xy(sq);
      const mood = sq === sel && pc.mood === 'idle' ? 'happy' : pc.mood;
      p += `<g class="pc${sq === sel ? ' sel' : ''}" data-sq="${sq}" transform="translate(${x} ${y})"><g class="pc-in">${pieceArt(pc.type, pc.color, mood)}</g></g>`;
    }
    gPieces.innerHTML = p;
    gEmo.innerHTML = (st.emotes || []).map(e => marks.emote(...xy(e.sq), e.kind, seedOf(e.sq))).join('');
  }

  // al empezar: la hoja se dibuja sola y las piezas brincan a su lugar, fila por fila
  function intro() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    svg.classList.add('drawing');
    setTimeout(() => svg.classList.remove('drawing'), 1700);
    for (const el of gPieces.querySelectorAll('.pc')) {
      const r = +el.dataset.sq[1], row = r <= 4 ? r - 1 : 8 - r; // de afuera hacia adentro
      el.firstElementChild.animate?.([
        { transform: 'translateY(-40px) scale(.5)', opacity: 0 },
        { transform: 'translateY(0) scale(1)', opacity: 1 },
      ], { duration: 360, delay: 700 + row * 140 + Math.random() * 80, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'backwards' });
    }
  }

  function animate(anim) {
    if (anim.intro) intro();
    for (const { from, to } of anim.moves || []) {
      const el = gPieces.querySelector(`[data-sq="${to}"] .pc-in`);
      if (!el || !el.animate) continue;
      const [x1, y1] = xy(from), [x2, y2] = xy(to), dx = x1 - x2, dy = y1 - y2;
      el.animate([
        { transform: `translate(${dx}px, ${dy}px)` },
        { transform: `translate(${dx / 2}px, ${dy / 2 - 22}px) scale(1.1)`, offset: 0.5 },
        { transform: 'translate(0px, 0px)' },
      ], { duration: 340, easing: 'ease-in-out' });
    }
    if (anim.captured) {
      const { sq, type, color } = anim.captured, [x, y] = xy(sq);
      gUnder.insertAdjacentHTML('beforeend', `<g class="fx" transform="translate(${x} ${y})"><g class="poof">${pieceArt(type, color, 'scared')}</g></g>`);
      gOver.insertAdjacentHTML('beforeend', `<g class="fx dust">${marks.poof(x, y, Date.now() % 1000)}</g>`);
      setTimeout(() => { gUnder.innerHTML = ''; gOver.innerHTML = ''; }, 1000);
    }
  }

  function select(sq) {
    sel = sq;
    targets = sq ? cb.targets(sq) : [];
    paint();
  }

  svg.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    const sq = sqAt(e);
    if (!sq) return;
    if (sel && targets.some(t => t.to === sq)) {
      const from = sel;
      select(null);
      cb.move(from, sq, false);
      return;
    }
    if (cb.pick(sq)) {
      const wasSel = sel === sq;
      if (!wasSel) { cb.sound?.('select'); select(sq); }
      drag = { from: sq, x: e.clientX, y: e.clientY, moved: false, wasSel, el: null };
      svg.setPointerCapture?.(e.pointerId);
      return;
    }
    if (sel) { cb.miss ? cb.miss(sel, sq) : cb.sound?.('bonk'); select(null); }
  });

  svg.addEventListener('pointermove', e => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 8) return;
    if (!drag.moved) {
      drag.moved = true;
      drag.el = gPieces.querySelector(`[data-sq="${drag.from}"]`);
      if (drag.el) { gPieces.appendChild(drag.el); drag.el.classList.add('drag'); }
    }
    const p = toSvg(e), lift = e.pointerType === 'touch' ? 45 : 0;
    drag.el?.setAttribute('transform', `translate(${p.x - 50} ${p.y - 60 - lift})`);
  });

  const endDrag = e => {
    if (!drag) return;
    const d = drag;
    drag = null;
    if (e.type === 'pointercancel') return paint();
    if (d.moved) {
      // con el dedo la pieza va levantada: se suelta donde se ve, no bajo la yema
      const sq = sqAt(e.pointerType === 'touch' ? { clientX: e.clientX, clientY: e.clientY - liftPx() } : e);
      if (sq && targets.some(t => t.to === sq)) { select(null); cb.move(d.from, sq, true); return; }
      if (sq && sq !== d.from) cb.miss ? cb.miss(d.from, sq) : cb.sound?.('bonk');
      paint();
    } else if (d.wasSel) select(null);
  };
  const liftPx = () => 45 * svg.getBoundingClientRect().width / 840;
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);

  return {
    // state: { pieces: {sq: {type, color, mood}}, flipped, last, check, hint, anim }
    draw(state) {
      st = state;
      if (state.flipped !== flipped) { flipped = state.flipped; base(); }
      if (state.anim || (sel && !cb.pick(sel))) sel = null;
      targets = sel ? cb.targets(sel) : [];
      paint();
      if (state.anim) animate(state.anim);
    },
    deselect: () => select(null),
  };
}
