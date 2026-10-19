# Ajedrez Garabato

Ajedrez para jugar en familia, dibujado a pluma sobre una hoja de libreta. Funciona en celular y tablet, se instala como app y juega sin internet.

**Jugar:** https://rcc622.github.io/kidschess/

## Qué trae

- **Contra el bot**: cinco niveles — dormilón, fácil (a veces se equivoca), medio, difícil y experto (usa libro de aperturas y piensa más). Puedes jugar con azul (empieza), rojo o sorpresa.
- **En pareja** en el mismo dispositivo, con opción de girar el tablero en cada turno.
- **Ayudas por edad**: muchas (5–7: ves los movimientos, las piezas se asustan si están en peligro, deshacer y pistas sin límite), algunas (8–10: 3 deshacer y 3 pistas), pocas (11+).
- **Aprender a mover**: una lección por pieza ("cómete los renacuajos rojos") y reglas especiales: jaque, jaque mate, enroque, coronar y al paso.
- **Personajes** (menú → Personajes): tres temas para personalizar el juego; cada uno trae sus dibujos, sus lecciones y la voz de Lápiz nombrando a sus personajes:
  - **Garabato**: ranita, castillo de arena, mago, caballito, flor con corona y sol con bigote.
  - **Bosque**: pollito con casco de cascarón, pony con mantita, búho con mitra, tortuga que carga un castillo, abeja reina y león con capa.
  - **Mar**: pececito, caballito de mar, pulpo mago, cangrejo ermitaño con concha-castillo, estrella de mar reina y morsa rey.
- Las piezas están vivas: tiemblan como dibujo, parpadean, miran a los lados, dan brinquitos, tiemblan de miedo, dicen "no" con la cabeza si la jugada no vale, se aplastan al aterrizar, echan destellos al coronar y el equipo ganador festeja.
- **Lápiz**, la mascota, habla (voz en español mexicano): lee las lecciones, avisa jaque, explica por qué una jugada no vale, festeja al ganar y da pistas si lo tocas.
- Cada pieza tiene su voz (el caballito relincha, la reina suena a flor mágica…), música tranquila que se pone nerviosa cuando hay jaque y fanfarria al ganar. Efectos, voz y música se prenden por separado en el menú.
- La partida se guarda sola y se retoma al volver a abrir.
- Si una jugada no vale, la app explica por qué ("El caballo salta en forma de L", "Tu rey quedaría en peligro").
- Puntitos que muestran por dónde pasó la última pieza (en L si fue el caballo).
- Las piezas se duermen si nadie juega un rato, el tablero se dibuja solo al empezar y el menú cuenta las partidas ganadas al bot con palitos.
- Con la tablet acostada, junto al tablero vive un mundito: el sol o la luna despierta según a quién le toca, un caracol que avanza con las jugadas, notitas en el margen, una araña que baja mientras el bot piensa y hormigas que cargan a las piezas comidas a dormir.

## Instalar en el celular o tablet

- **Android (Chrome):** abre el enlace → menú ⋮ → *Instalar app* (o *Agregar a pantalla principal*).
- **iPhone / iPad (Safari):** abre el enlace → botón Compartir → *Agregar a inicio*.

Después de abrirla una vez ya funciona sin internet.

## Desarrollo

HTML + CSS + JS sin compilar. Necesita un servidor local (los módulos y el Web Worker no abren con doble clic):

```bash
python -m http.server 5173
```

y abrir http://localhost:5173. En `localhost` el service worker no se registra para no estorbar; para probar offline usa http://127.0.0.1:5173.

**Publicar cambios:** push a `main` (GitHub Pages sirve la raíz). Si agregas o quitas archivos, actualiza la lista y sube la versión de `CACHE` en `sw.js`. Los usuarios reciben la versión nueva la segunda vez que abren la app.

| Archivo | Qué hace |
|---|---|
| `js/app.js` | menú, partida, guardado, diálogos |
| `js/board.js` | tablero SVG, tocar y arrastrar, animaciones |
| `js/art.js` | arte a mano: juego Garabato, caras, marcas, doodles, íconos, Lápiz |
| `js/animals.js` | juegos Bosque y Mar |
| `js/ink.js` | ayudantes de trazo (temblor, curvas, patas, melenas) |
| `dev/muestras.html` | hoja de muestras de un juego: `dev/muestras.html?set=bosque` |
| `js/bot.js` | bot alpha-beta (corre en un Web Worker) |
| `js/learn.js` | lecciones |
| `js/sound.js` | mezclador: efectos con Web Audio, voz de Lápiz, voces de personajes y música |
| `audio/` | voces, efectos y música generados con ElevenLabs (mp3 mono, ya comprimidos) |
| `js/chess.js` | reglas — [chess.js](https://github.com/jhlywa/chess.js) 1.4.0 (BSD-2) |

## Créditos

- Reglas: chess.js de Jeff Hlywa (licencia BSD-2, incluida en el archivo).
- Letras: Patrick Hand de Patrick Wagesreiter y Kalam de Indian Type Foundry (SIL OFL 1.1, ver `fonts/OFL-*.txt`).
- Voz de Lápiz (voz "Alejandro"), voces de personajes y música: generadas con ElevenLabs.
- Sistema de diseño: ver `design.md`.
- Idea visual inspirada en *Ballpoint Gambit* (Kevin Ngo) y *Toadstool Chess*; todo el arte aquí es original, dibujado con código.
