# Design — Ajedrez Garabato

Sistema de diseño fijo de la app. Cualquier pantalla nueva lo sigue; si algo no cabe, se cambia aquí primero.

**Regla de oro (del brief):** si algo se ve digital, está mal. Todo trazo sale de `js/art.js` con temblor y 3 frames ("boil").

## Género
Playful, hecho a mano. Hoja de libreta + pluma azul y roja + lápiz. Para niños de 5 a 11 años y sus papás, en teléfono y tablet.

## Tema (paleta del brief, bloqueada)
| Token | Valor | Uso |
|---|---|---|
| `--color-paper` | `#f1ebdc` | fondo de libreta |
| `--color-sheet` | `#fbf8ee` | relleno de botones, tablero, tarjetas |
| `--color-rule` | `#b8c7e0` | renglones |
| `--color-margin` | `#d9534f` | margen rojo, foco, alertas |
| `--color-ink` | `#1f3a93` | tinta azul (bando Azul, texto) |
| `--color-ink-red` | `#a4161a` | tinta roja (bando Rojo) |
| `--color-pencil` | `#555` | lápiz: rayado, notas, texto secundario |
| `--color-hi` | amarillo resaltador | seleccionado, le toca, opción elegida |
| `--color-tape` | cinta adhesiva | tablero y diálogos |
| `--color-note` | `#fff1a6` | notitas del margen |

## Tipografía
- Títulos: **Kalam 700** (`--font-display`), siempre derecha, nunca cursiva.
- Texto: **Patrick Hand 400** (`--font-body`). Mínimo 17 px.
- Las dos van locales en `fonts/` (offline).

## Componentes
- **Botones y tarjetas:** sin `border` ni `border-radius`. Un marco SVG a pluma (`frame()` en `art.js`) se dibuja al tamaño real del elemento y se redibuja si cambia. Variables: `--fill`, `--stroke`.
- **Elegido / le toca:** relleno o trazo de resaltador amarillo, nunca sombra.
- **Diálogos:** hoja con cinta adhesiva arriba, girada -1°.
- **Iconos:** trazos propios en `art.js` (`icon()`), nunca emoji.
- **Menú:** primero el dibujo, luego la palabra (los peques todavía no leen bien).

## Lápiz (mascota) y sonido
- Lápiz es un lápiz amarillo con borrador rosa y cara; vive en la portada y en la barra de la partida y las lecciones.
- Cuando habla, se mueve y abre la boca. Tocarlo: saluda (menú), da pista (partida), relee (lección).
- Toda frase que Lápiz dice también está escrita en pantalla: el audio nunca es la única forma de enterarse.
- Música bajita (calma / tensión en jaque / victoria); baja más cuando Lápiz habla.

## Movimiento
- `--ease-out` en todo; nada de rebotes en botones.
- Piezas: brinco con arco y aplastón al aterrizar, puf + espiral al ser comidas, se duermen tras 25 s sin tocar.
- Gestos al azar cada 1.5 s (parpadeo, mirar, brinquito, bailecito); temblor con miedo; "no" con la cabeza en jugada ilegal; festejo del ganador; destellos al coronar. Todo vive en el grupo `.art` de cada pieza.

## Juegos de piezas
- Garabato (original), Bosque y Mar. Los animales usan ojos con brillo, pestañas/cejas, chapitas y relleno con rayitas de lápiz de color (patrones `hatch-*`).
- Cada bando conserva su tinta (azul/rojo) y su tono: el color del equipo nunca se pierde.
- El tablero se dibuja solo al empezar una partida.
- Respeta `prefers-reduced-motion`.

## Pantallas
| Pantalla | Forma |
|---|---|
| Menú | Portada (título + personajes) y tarjetas ilustradas. Acostado: portada a la izquierda, tarjetas a la derecha. |
| Opciones | Una sola hoja con tres preguntas y opciones dibujadas. |
| Partida | Tablero lo más grande posible. De pie: barras de jugador pegadas al tablero, controles con ícono y palabra. Acostado: columna derecha con el mundo vivo (sol/luna del turno, caracol de jugadas, notitas). |
| Lecciones | Igual que la partida, con texto arriba y mensaje abajo. |

## No hacer
- Sombras, degradados de app, esquinas redondeadas con CSS, emoji como ícono.
- Margen rojo o doodles detrás del tablero o de los controles.
- Texto de botón partido en dos líneas en teléfono.
