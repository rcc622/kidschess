// "Aprender a mover": una lección por pieza (cómete a los rojos) + reglas especiales.
import { Chess } from './chess.js';
import { createBoard } from './board.js';
import { pieceSVG, pieceSet, scheme, SCHEMES } from './art.js';

const LESSONS = [
  { art: 'p', title: 'El peón', goal: 'eat', fen: '8/8/8/8/2p5/3p4/4P3/8 w - - 0 1',
    text: 'La ranita brinca derecho, de una en una. En su primer brinco puede avanzar dos. ¡Pero come en diagonal! Cómete a los rojos.' },
  { art: 'r', title: 'La torre', goal: 'eat', fen: '8/8/p4p2/8/8/8/5p2/R7 w - - 0 1',
    text: 'El castillo corre en línea recta: adelante, atrás y a los lados, todas las casillas que quiera. Cómete a los rojos.' },
  { art: 'b', title: 'El alfil', goal: 'eat', fen: '8/8/7p/8/1p3p2/8/8/2B5 w - - 0 1',
    text: 'El mago se mueve en diagonal, todas las casillas que quiera. ¡Siempre se queda en casillas del mismo color! Cómete a los rojos.' },
  { art: 'n', title: 'El caballo', goal: 'eat', fen: '8/8/4p3/6p1/3Np3/8/8/8 w - - 0 1',
    text: 'El caballito salta en forma de L: dos casillas derecho y una de lado. ¡Es el único que puede saltar sobre otras piezas! Cómete a los rojos.' },
  { art: 'q', title: 'La reina', goal: 'eat', fen: '8/3p4/8/7p/p7/8/8/3Q4 w - - 0 1',
    text: 'La reina flor es la más poderosa: se mueve como torre y como alfil juntos. Cómete a los rojos.' },
  { art: 'k', title: 'El rey', goal: 'eat', fen: '8/8/2p5/6p1/8/4p3/8/4K3 w - - 0 1',
    text: 'El rey sol camina una casilla hacia cualquier lado. Nunca puede pararse donde lo atacan. Cómete a los rojos.' },
  { art: 'k', title: 'Jaque', goal: 'check', fen: '4k3/8/8/8/8/8/8/R3K3 w - - 0 1', special: true,
    text: 'Jaque es cuando atacas al rey. El otro tiene que salvarlo: moverlo, taparlo o comerse al atacante. ¡Dale jaque al rey rojo!' },
  { art: 'k', title: 'Jaque mate', goal: 'mate', fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', special: true,
    text: 'Jaque mate es un jaque sin escapatoria. ¡Así se gana! Encuentra el jaque mate en una jugada.' },
  { art: 'q', title: 'Mate con reina', goal: 'mate', fen: 'k7/8/1K6/8/8/8/8/7Q w - - 0 1', special: true,
    text: 'Tu reina y tu rey trabajan en equipo. ¿Dónde está el jaque mate?' },
  { art: 'r', title: 'Enroque', goal: 'castle', fen: '8/8/8/8/8/8/8/R3K2R w KQ - 0 1', special: true,
    text: 'El rey y la torre hacen equipo: el rey camina dos casillas hacia una torre y la torre salta a su otro lado. Solo si ninguno se ha movido y no hay nadie en medio. Toca al rey.' },
  { art: 'p', title: 'Coronar', goal: 'promote', fen: '8/4P3/8/8/8/8/8/8 w - - 0 1', special: true,
    text: 'Si un peón llega hasta el otro lado del tablero, ¡se convierte en la pieza que quieras! Casi siempre se elige la reina.' },
  { art: 'p', title: 'Al paso', goal: 'ep', fen: '8/8/8/3pP3/8/8/8/8 w - d6 0 1', special: true,
    text: 'Truco secreto: el peón rojo acaba de avanzar dos casillas y quedó junto al tuyo. Puedes comerlo "al paso", como si solo hubiera avanzado una. ¡Solo en ese mismo turno!' },
];

// las lecciones de cada pieza nombran a los personajes del tema elegido (y Lápiz las lee con su audio)
const THEMED = {
  bosque: [
    'El pollito camina derecho, de una en una. En su primer paso puede avanzar dos. ¡Pero come en diagonal! Cómete a los rojos.',
    'La tortuga carga su castillo en línea recta: adelante, atrás y a los lados, todas las casillas que quiera. Cómete a los rojos.',
    'El búho vuela en diagonal, todas las casillas que quiera. ¡Siempre se queda en casillas del mismo color! Cómete a los rojos.',
    null, // el caballito es igual que en Garabato
    'La abeja reina es la más poderosa: vuela como torre y como alfil juntos. Cómete a los rojos.',
    'El rey león camina una casilla hacia cualquier lado. Nunca puede pararse donde lo atacan. Cómete a los rojos.',
  ],
  mar: [
    'El pececito nada derecho, de una en una. En su primer paso puede avanzar dos. ¡Pero come en diagonal! Cómete a los rojos.',
    'El cangrejo lleva su castillo en línea recta: adelante, atrás y a los lados, todas las casillas que quiera. Cómete a los rojos.',
    'El pulpo mago nada en diagonal, todas las casillas que quiera. ¡Siempre se queda en casillas del mismo color! Cómete a los rojos.',
    'El caballito de mar salta en forma de L: dos casillas derecho y una de lado. ¡Es el único que puede saltar sobre otras piezas! Cómete a los rojos.',
    'La estrella de mar reina es la más poderosa: se mueve como torre y como alfil juntos. Cómete a los rojos.',
    'La morsa rey camina una casilla hacia cualquier lado. Nunca puede pararse donde la atacan. Cómete a los rojos.',
  ],
  robots: [
    'El robotito rueda derecho, de una en una. En su primer paso puede avanzar dos. ¡Pero come en diagonal! Cómete a los rojos.',
    'El robot castillo avanza en línea recta: adelante, atrás y a los lados, todas las casillas que quiera. Cómete a los rojos.',
    'El dron vuela en diagonal, todas las casillas que quiera. ¡Siempre se queda en casillas del mismo color! Cómete a los rojos.',
    'El caballo robot salta en forma de L: dos casillas derecho y una de lado. ¡Es el único que puede saltar sobre otras piezas! Cómete a los rojos.',
    'La reina robot es la más poderosa: se mueve como torre y como alfil juntos. Cómete a los rojos.',
    'El rey robot camina una casilla hacia cualquier lado. Nunca puede pararse donde lo atacan. Cómete a los rojos.',
  ],
  dinos: [
    'El dino bebé camina derecho, de una en una. En su primer paso puede avanzar dos. ¡Pero come en diagonal! Cómete a los rojos.',
    'El triceratops embiste en línea recta: adelante, atrás y a los lados, todas las casillas que quiera. Cómete a los rojos.',
    'El braquiosaurio estira el cuello en diagonal, todas las casillas que quiera. ¡Siempre se queda en casillas del mismo color! Cómete a los rojos.',
    'El pterodáctilo vuela en forma de L: dos casillas derecho y una de lado. ¡Es el único que puede pasar sobre otras piezas! Cómete a los rojos.',
    'La estegosaurio reina es la más poderosa: se mueve como torre y como alfil juntos. Cómete a los rojos.',
    'El tiranosaurio rey camina una casilla hacia cualquier lado. Nunca puede pararse donde lo atacan. Cómete a los rojos.',
  ],
  espacio: [
    'El marcianito flota derecho, de una en una. En su primer paso puede avanzar dos. ¡Pero come en diagonal! Cómete a los rojos.',
    'El astronauta avanza en línea recta: adelante, atrás y a los lados, todas las casillas que quiera. Cómete a los rojos.',
    'El ovni vuela en diagonal, todas las casillas que quiera. ¡Siempre se queda en casillas del mismo color! Cómete a los rojos.',
    'El cohete salta en forma de L: dos casillas derecho y una de lado. ¡Es el único que puede saltar sobre otras piezas! Cómete a los rojos.',
    'La luna reina es la más poderosa: se mueve como torre y como alfil juntos. Cómete a los rojos.',
    'El rey Saturno camina una casilla hacia cualquier lado. Nunca puede pararse donde lo atacan. Cómete a los rojos.',
  ],
};
const themed = i => THEMED[pieceSet]?.[i];
// los textos nombran a "los rojos"; con otros colores de piezas se cambian por los del esquema
const recolor = t => (scheme === 'tinta' ? t : t.replace('los rojos', SCHEMES[scheme].them).replace(/(rey|peón) rojo/g, `$1 ${SCHEMES[scheme].foe}`));
const lessonText = i => recolor(themed(i) || LESSONS[i].text);
// con otros colores se usa el audio sin la última frase ("…a los rojos"), que queda escrita en pantalla
const lessonVoice = i => (themed(i) ? `lec_${i}_${pieceSet}` : `lec_${i}`) + (scheme !== 'tinta' && i <= 6 ? '_x' : '');

const WIN = {
  eat: n => `¡Te los comiste todos en ${n} jugadas!`,
  check: () => recolor('¡Jaque! El rey rojo está en peligro.'),
  mate: () => '¡Jaque mate! Así se gana una partida.',
  castle: () => '¡Enroque! El rey quedó protegido.',
  promote: () => '¡Se convirtió!',
  ep: () => '¡Al paso! Ese truco casi nadie lo conoce.',
};
// audio de Lápiz para cada logro (audio/voz/win_*.mp3)
const WIN_VOICE = { eat: 'win_eat', check: 'win_check', mate: 'win_mate', castle: 'win_castle', promote: 'win_promote', ep: 'win_ep' };

const KEY = 'ajedrez-garabato-lecciones';
const doneSet = (() => { try { return new Set(JSON.parse(localStorage.getItem(KEY)) || []); } catch { return new Set(); } })();
const $ = s => document.querySelector(s);

export function initLearn({ show, pickPromotion, sound, whyIllegal }) {
  let L = null; // lección actual: { i, chess, count, done, last }

  const view = createBoard($('#lesson-board'), {
    pick: sq => !!L && !L.done && L.chess.get(sq)?.color === 'w',
    targets: sq => L.chess.moves({ square: sq, verbose: true }).map(m => ({ to: m.to, capture: !!m.captured })),
    move,
    showTargets: () => true,
    sound: sound.play,
    select: sq => sound.creature(L.chess.get(sq)?.type, pieceSet),
    miss(from, to) {
      sound.play('bonk');
      const why = whyIllegal(L.chess, from, to);
      $('#lesson-msg').textContent = why.text;
      sound.say(why.key);
    },
  });

  function draw(anim) {
    const c = L.chess, les = LESSONS[L.i], pieces = {};
    let check = null;
    for (const row of c.board()) for (const p of row) {
      if (!p) continue;
      const anim = p.color === 'w' && L.won ? 'cheer' : null;
      const mood = p.color === 'w' ? (L.done ? 'happy' : 'idle')
        : p.type === 'k' ? (c.isCheckmate() ? 'dead' : c.inCheck() ? 'scared' : 'idle') : les.goal === 'eat' ? 'scared' : 'idle';
      pieces[p.square] = { type: p.type, color: p.color, mood, anim };
      if (p.type === 'k' && p.color === c.turn() && c.inCheck()) check = p.square;
    }
    view.draw({ pieces, flipped: false, last: L.last, check, anim });
    $('[data-act="lesson-next"]').classList.toggle('hi', L.done);
  }

  function start(i, speak = true) {
    L = { i, chess: new Chess(LESSONS[i].fen, { skipValidation: true }), count: 0, done: false, last: null };
    $('#lesson-title').textContent = LESSONS[i].title;
    $('#lesson-text').textContent = lessonText(i);
    $('#lesson-msg').textContent = '';
    show('lesson');
    draw();
    if (speak) sound.say(lessonVoice(i), lessonText(i));
  }

  async function move(from, to, dragged) {
    const c = L.chess, les = LESSONS[L.i], p = c.get(from);
    let promotion;
    if (p.type === 'p' && to[1] === '8') {
      promotion = les.goal === 'promote' ? await pickPromotion('w') : 'q';
      if (!promotion) return draw();
    }
    const mv = c.move({ from, to, promotion });
    const castle = mv.isKingsideCastle() || mv.isQueensideCastle();
    const anim = { moves: dragged ? [] : [{ from, to }] };
    if (castle) anim.moves.push(mv.isKingsideCastle() ? { from: 'h1', to: 'f1' } : { from: 'a1', to: 'd1' });
    if (mv.captured) anim.captured = { type: mv.captured, color: 'b', sq: mv.isEnPassant() ? to[0] + from[1] : to };
    if (mv.promotion) anim.promote = to;
    L.count++;
    L.last = { from, to, color: 'w', knight: p.type === 'n' };

    const reds = () => c.board().flat().filter(q => q && q.color === 'b').length;
    const ok = { eat: () => reds() === 0, check: () => c.inCheck(), mate: () => c.isCheckmate(), castle: () => castle, promote: () => !!mv.promotion, ep: () => mv.isEnPassant() }[les.goal]();
    const msg = $('#lesson-msg');
    if (ok) {
      L.done = true;
      L.won = true;
      msg.textContent = WIN[les.goal](L.count);
      sound.say(WIN_VOICE[les.goal]);
      sound.play('promote');
      doneSet.add(L.i);
      try { localStorage.setItem(KEY, JSON.stringify([...doneSet])); } catch { /* sin guardado */ }
    } else if (les.goal === 'eat') {
      // las rojas no se mueven: le devolvemos el turno al alumno
      const f = c.fen().split(' ');
      f[1] = 'w'; f[3] = '-';
      c.load(f.join(' '), { skipValidation: true });
      msg.textContent = mv.captured ? `¡Ñam! Quedan ${reds()}.` : '';
      sound.play(mv.captured ? 'capture' : 'move');
      if (mv.captured) { sound.creature('ay'); sound.say('nam'); }
    } else {
      msg.textContent = 'Casi… ¡intenta otra vez!';
      sound.play('bonk');
      sound.say('casi');
      const l = L;
      setTimeout(() => { if (L === l) start(l.i, false); }, 1300);
      L.done = true; // bloquea el tablero mientras se reinicia
    }
    draw(anim);
  }

  function open() {
    const btn = (l, i) => `<button class="btn${i % 2 ? ' red' : ''}${doneSet.has(i) ? ' done' : ''}" data-lesson="${i}">${pieceSVG(l.art, i % 2 ? 'b' : 'w', 'happy')}${l.title}</button>`;
    $('#lessons').innerHTML = '<h3>Cómo se mueve cada pieza</h3>' + LESSONS.map((l, i) => l.special ? '' : btn(l, i)).join('')
      + '<h3>Reglas especiales</h3>' + LESSONS.map((l, i) => l.special ? btn(l, i) : '').join('');
    show('learn');
  }

  $('#lessons').addEventListener('click', e => {
    const b = e.target.closest('[data-lesson]');
    if (b) start(+b.dataset.lesson);
  });

  return {
    open,
    reset: () => L && start(L.i),
    speak: () => L && sound.say(lessonVoice(L.i), lessonText(L.i)),
    next: () => (L && L.i + 1 < LESSONS.length ? start(L.i + 1) : open()),
  };
}
