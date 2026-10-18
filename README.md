# Ajedrez Garabato

Ajedrez para jugar en familia, dibujado a pluma sobre una hoja de libreta. Funciona en celular y tablet, se instala como app y juega sin internet.

**Jugar:** https://rcc622.github.io/kidschess/

## Qué trae

- **Contra el bot**: fácil (a veces se equivoca), medio y difícil. Puedes jugar con azul (empieza), rojo o sorpresa.
- **En pareja** en el mismo dispositivo, con opción de girar el tablero en cada turno.
- **Ayudas por edad**: muchas (5–7: ves los movimientos, las piezas se asustan si están en peligro, deshacer y pistas sin límite), algunas (8–10: 3 deshacer y 3 pistas), pocas (11+).
- **Aprender a mover**: una lección por pieza ("cómete los renacuajos rojos") y reglas especiales: jaque, jaque mate, enroque, coronar y al paso.
- Piezas-personaje: renacuajo (peón), castillo de arena (torre), mago (alfil), caballito con crin loca, flor con corona (reina) y sol con bigote (rey). Tiemblan como dibujo vivo y cambian de cara.
- Sonidos hechos con código, la partida se guarda sola y se retoma al volver a abrir.

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
| `js/art.js` | todo el arte a mano: piezas, caras, marcas, doodles, íconos |
| `js/bot.js` | bot alpha-beta (corre en un Web Worker) |
| `js/learn.js` | lecciones |
| `js/sound.js` | sonidos con Web Audio |
| `js/chess.js` | reglas — [chess.js](https://github.com/jhlywa/chess.js) 1.4.0 (BSD-2) |

## Créditos

- Reglas: chess.js de Jeff Hlywa (licencia BSD-2, incluida en el archivo).
- Letra: Patrick Hand de Patrick Wagesreiter (SIL OFL 1.1, ver `fonts/OFL.txt`).
- Idea visual inspirada en *Ballpoint Gambit* (Kevin Ngo) y *Toadstool Chess*; todo el arte aquí es original, dibujado con código.
