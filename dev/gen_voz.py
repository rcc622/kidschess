# Voces de Lápiz con edge-tts (neural, es-MX): audio/voz/<mujer|hombre>/<clave>.mp3
# uso: python gen_voz.py <raíz del proyecto> [solo,claves,separadas,por,coma]
import asyncio, os, re, subprocess, sys
import edge_tts

ROOT = sys.argv[1]
ONLY = set(sys.argv[2].split(',')) if len(sys.argv) > 2 else None
VOICES = {
    'mujer': ('es-MX-DaliaNeural', '+0%', '+4Hz'),
    'hombre': ('es-MX-JorgeNeural', '+0%', '+0Hz'),
}

T = {
    'hola': '¡Hola! Soy Lápiz. ¿Jugamos ajedrez?',
    'te_toca': '¡Te toca!',
    'jaque_tu': '¡Jaque! Cuidado con tu rey.',
    'jaque_bot': '¡Uy! ¡Jaque al bot!',
    'mate_ganaste': '¡Jaque mate! ¡Ganaste!',
    'mate_bot': 'Jaque mate. Ganó el bot. ¡La próxima le ganas!',
    'tablas': '¡Tablas! Esta vez nadie gana.',
    'tablas_jugadas': '¡Se acabaron las jugadas! Quedan tablas.',
    'pista': 'Psst… mira, esta jugada está buena.',
    'coronar': '¡Llegaste al final! ¿En qué se convierte tu peón?',
    'dormido': 'Ajá… ¿Hola? ¿Sigues ahí? ¡Te toca!',
    'casi': 'Casi… ¡intenta otra vez!',
    'nam': '¡Ñam ñam!',
    'ilegal_jaque': '¡Tu rey está en jaque! Primero tienes que salvarlo.',
    'ilegal_peligro': 'No se puede: tu rey quedaría en peligro.',
    'ilegal_enroque': 'Para enrocar, ni el rey ni la torre deben haberse movido, y el camino debe estar libre.',
    'ilegal_enfrente': 'Hay alguien enfrente: el peón no puede pasar.',
    'ilegal_diagonal': 'El peón solo va en diagonal cuando come.',
    'ilegal_camino': 'Hay alguien en el camino.',
    'como_p': 'El peón camina derecho y solo come en diagonal.',
    'como_n': 'El caballo salta en forma de ele.',
    'como_b': 'El alfil solo va en diagonal.',
    'como_r': 'La torre solo va en línea recta.',
    'como_q': 'La reina va en línea recta o en diagonal.',
    'como_k': 'El rey camina de una en una casilla.',
    'win_eat': '¡Te los comiste todos! ¡Muy bien!',
    'win_check': '¡Jaque! Ese rey está en peligro.',
    'win_mate': '¡Jaque mate! Así se gana una partida.',
    'win_castle': '¡Enroque! El rey quedó protegido.',
    'win_promote': '¡Se convirtió!',
    'win_ep': '¡Al paso! Ese truco casi nadie lo conoce.',
    'guia_hola': 'Modo guía: yo te ayudo. La flecha naranja es una buena idea, pero tú decides.',
    'guia_cuidado': '¡Cuidado! Ahí te pueden comer esa pieza.',
    'guia_mate': '¡Psst! Ahí hay un jaque mate. ¡Búscalo!',
    'solo_rey_bot': '¡Al bot solo le queda el rey! Arrincónalo en una orilla y dale jaque mate antes de que se acaben las jugadas.',
    'solo_rey_tu': '¡Uy, solo te queda el rey! Escápate de las esquinas hasta que se acaben las jugadas.',
    'solo_rey_pareja': '¡Solo queda un rey! Hay pocas jugadas para dar jaque mate.',
    'tema_garabato': '¡Vamos con los garabatos!',
    'tema_bosque': '¡Vamos con los animales del bosque!',
    'tema_mar': '¡Vamos con los animales del mar!',
    'tema_robots': '¡Vamos con los robots!',
    'tema_dinos': '¡Vamos con los dinosaurios!',
    'tema_espacio': '¡Vamos al espacio!',
    'tema_clasicas': '¡Vamos con las piezas de siempre!',
}
# turno y victoria de cada color de bando (Pluma, Clásico, Colorido)
for k, turno, gana in [('azul', 'Turno de Azul.', '¡Gana Azul!'), ('rojo', 'Turno de Rojo.', '¡Gana Rojo!'),
                       ('blancas', 'Turno de las blancas.', '¡Ganan las blancas!'), ('negras', 'Turno de las negras.', '¡Ganan las negras!'),
                       ('naranja', 'Turno de Naranja.', '¡Gana Naranja!'), ('morado', 'Turno de Morado.', '¡Gana Morado!')]:
    T[f'turno_{k}'] = turno
    T[f'mate_{k}'] = '¡Jaque mate! ' + gana
    T[f'tiempo_{k}'] = '¡Se acabó el tiempo! ' + gana
T['clasico_hola'] = 'Modo clásico: cada quien tiene su reloj. ¡Piensa bien, pero no te tardes!'
T['poco_tiempo'] = '¡Ojo! Te queda poco tiempo.'
T['tiempo_ganaste'] = '¡Al bot se le acabó el tiempo! ¡Ganaste!'
T['tiempo_bot'] = 'Se te acabó el tiempo. ¡La próxima le ganas!'
T['tiempo_tablas'] = 'Se acabó el tiempo, pero no quedan piezas para dar jaque mate. ¡Tablas!'

LESSONS = [
    'La ranita brinca derecho, de una en una. En su primer brinco puede avanzar dos. ¡Pero come en diagonal! Cómete a los rojos.',
    'El castillo corre en línea recta: adelante, atrás y a los lados, todas las casillas que quiera. Cómete a los rojos.',
    'El mago se mueve en diagonal, todas las casillas que quiera. ¡Siempre se queda en casillas del mismo color! Cómete a los rojos.',
    'El caballito salta en forma de L: dos casillas derecho y una de lado. ¡Es el único que puede saltar sobre otras piezas! Cómete a los rojos.',
    'La reina flor es la más poderosa: se mueve como torre y como alfil juntos. Cómete a los rojos.',
    'El rey sol camina una casilla hacia cualquier lado. Nunca puede pararse donde lo atacan. Cómete a los rojos.',
    'Jaque es cuando atacas al rey. El otro tiene que salvarlo: moverlo, taparlo o comerse al atacante. ¡Dale jaque al rey rojo!',
    'Jaque mate es un jaque sin escapatoria. ¡Así se gana! Encuentra el jaque mate en una jugada.',
    'Tu reina y tu rey trabajan en equipo. ¿Dónde está el jaque mate?',
    'El rey y la torre hacen equipo: el rey camina dos casillas hacia una torre y la torre salta a su otro lado. Solo si ninguno se ha movido y no hay nadie en medio. Toca al rey.',
    'Si un peón llega hasta el otro lado del tablero, ¡se convierte en la pieza que quieras! Casi siempre se elige la reina.',
    'Truco secreto: el peón rojo acaba de avanzar dos casillas y quedó junto al tuyo. Puedes comerlo al paso, como si solo hubiera avanzado una. ¡Solo en ese mismo turno!',
]
THEMED = {
    'bosque': [
        'El pollito camina derecho, de una en una. En su primer paso puede avanzar dos. ¡Pero come en diagonal! Cómete a los rojos.',
        'La tortuga carga su castillo en línea recta: adelante, atrás y a los lados, todas las casillas que quiera. Cómete a los rojos.',
        'El búho vuela en diagonal, todas las casillas que quiera. ¡Siempre se queda en casillas del mismo color! Cómete a los rojos.',
        None,
        'La abeja reina es la más poderosa: vuela como torre y como alfil juntos. Cómete a los rojos.',
        'El rey león camina una casilla hacia cualquier lado. Nunca puede pararse donde lo atacan. Cómete a los rojos.',
    ],
    'mar': [
        'El pececito nada derecho, de una en una. En su primer paso puede avanzar dos. ¡Pero come en diagonal! Cómete a los rojos.',
        'El cangrejo lleva su castillo en línea recta: adelante, atrás y a los lados, todas las casillas que quiera. Cómete a los rojos.',
        'El pulpo mago nada en diagonal, todas las casillas que quiera. ¡Siempre se queda en casillas del mismo color! Cómete a los rojos.',
        'El caballito de mar salta en forma de L: dos casillas derecho y una de lado. ¡Es el único que puede saltar sobre otras piezas! Cómete a los rojos.',
        'La estrella de mar reina es la más poderosa: se mueve como torre y como alfil juntos. Cómete a los rojos.',
        'La morsa rey camina una casilla hacia cualquier lado. Nunca puede pararse donde la atacan. Cómete a los rojos.',
    ],
    'robots': [
        'El robotito rueda derecho, de una en una. En su primer paso puede avanzar dos. ¡Pero come en diagonal! Cómete a los rojos.',
        'El robot castillo avanza en línea recta: adelante, atrás y a los lados, todas las casillas que quiera. Cómete a los rojos.',
        'El dron vuela en diagonal, todas las casillas que quiera. ¡Siempre se queda en casillas del mismo color! Cómete a los rojos.',
        'El caballo robot salta en forma de L: dos casillas derecho y una de lado. ¡Es el único que puede saltar sobre otras piezas! Cómete a los rojos.',
        'La reina robot es la más poderosa: se mueve como torre y como alfil juntos. Cómete a los rojos.',
        'El rey robot camina una casilla hacia cualquier lado. Nunca puede pararse donde lo atacan. Cómete a los rojos.',
    ],
    'dinos': [
        'El dino bebé camina derecho, de una en una. En su primer paso puede avanzar dos. ¡Pero come en diagonal! Cómete a los rojos.',
        'El triceratops embiste en línea recta: adelante, atrás y a los lados, todas las casillas que quiera. Cómete a los rojos.',
        'El braquiosaurio estira el cuello en diagonal, todas las casillas que quiera. ¡Siempre se queda en casillas del mismo color! Cómete a los rojos.',
        'El pterodáctilo vuela en forma de L: dos casillas derecho y una de lado. ¡Es el único que puede pasar sobre otras piezas! Cómete a los rojos.',
        'La estegosaurio reina es la más poderosa: se mueve como torre y como alfil juntos. Cómete a los rojos.',
        'El tiranosaurio rey camina una casilla hacia cualquier lado. Nunca puede pararse donde lo atacan. Cómete a los rojos.',
    ],
    'espacio': [
        'El marcianito flota derecho, de una en una. En su primer paso puede avanzar dos. ¡Pero come en diagonal! Cómete a los rojos.',
        'El astronauta avanza en línea recta: adelante, atrás y a los lados, todas las casillas que quiera. Cómete a los rojos.',
        'El ovni vuela en diagonal, todas las casillas que quiera. ¡Siempre se queda en casillas del mismo color! Cómete a los rojos.',
        'El cohete salta en forma de L: dos casillas derecho y una de lado. ¡Es el único que puede saltar sobre otras piezas! Cómete a los rojos.',
        'La luna reina es la más poderosa: se mueve como torre y como alfil juntos. Cómete a los rojos.',
        'El rey Saturno camina una casilla hacia cualquier lado. Nunca puede pararse donde lo atacan. Cómete a los rojos.',
    ],
    'clasicas': [
        'El peón camina derecho, de una en una. En su primer paso puede avanzar dos. ¡Pero come en diagonal! Cómete a los rojos.',
        'La torre corre en línea recta: adelante, atrás y a los lados, todas las casillas que quiera. Cómete a los rojos.',
        'El alfil se mueve en diagonal, todas las casillas que quiera. ¡Siempre se queda en casillas del mismo color! Cómete a los rojos.',
        'El caballo salta en forma de L: dos casillas derecho y una de lado. ¡Es el único que puede saltar sobre otras piezas! Cómete a los rojos.',
        'La reina es la más poderosa: se mueve como torre y como alfil juntos. Cómete a los rojos.',
        'El rey camina una casilla hacia cualquier lado. Nunca puede pararse donde lo atacan. Cómete a los rojos.',
    ],
}
LAST = re.compile(r'\s*(Cómete a los rojos\.|¡Dale jaque al rey rojo!)$')
for i, t in enumerate(LESSONS):
    T[f'lec_{i}'] = t
    if i <= 6:
        T[f'lec_{i}_x'] = LAST.sub('', t)  # sin "a los rojos": para otros colores de piezas
for s, lst in THEMED.items():
    for i, t in enumerate(lst):
        if t:
            T[f'lec_{i}_{s}'] = t
            T[f'lec_{i}_{s}_x'] = LAST.sub('', t)


def speakable(t):
    return t.replace('forma de L', 'forma de ele').replace('…', '... ')


async def one(sem, voice, key, text, out):
    async with sem:
        name, rate, pitch = VOICES[voice]
        raw = out + '.raw.mp3'
        for attempt in range(3):
            try:
                await edge_tts.Communicate(speakable(text), name, rate=rate, pitch=pitch).save(raw)
                break
            except Exception as e:  # red inestable: reintenta
                if attempt == 2:
                    print('FALLO', voice, key, e)
                    return
                await asyncio.sleep(2)
        # mono, sin silencio al inicio/fin, volumen parejo
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-af',
                        'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-16:TP=-1.5',
                        '-ar', '24000', '-ac', '1', '-b:a', '40k', out], check=True)
        os.remove(raw)


async def main():
    sem = asyncio.Semaphore(6)
    jobs = []
    for voice in VOICES:
        d = os.path.join(ROOT, 'audio', 'voz', voice)
        os.makedirs(d, exist_ok=True)
        for k, t in T.items():
            if ONLY and k not in ONLY:
                continue
            jobs.append(one(sem, voice, k, t, os.path.join(d, k + '.mp3')))
    await asyncio.gather(*jobs)
    print('listo', len(jobs))

asyncio.run(main())
