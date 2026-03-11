# Adivina el Pro Player — Descripción del proyecto

## ¿Qué es este juego?

Es un juego de adivinanza al estilo Wordle ambientado en el mundo de los esports de League of Legends.
Cada partida el jugador tiene que descubrir un pro player secreto haciendo intentos sucesivos.
Con cada intento el juego revela pistas visuales sobre cuánto se parece el jugador elegido al secreto.

No hay límite de intentos. El objetivo es acertar con los menos posibles.

---

## ¿Cómo se juega?

1. El jugador escribe el nombre de un pro player en el buscador.
2. Puede seleccionarlo del desplegable que aparece (al seleccionar, se envía automáticamente).
3. El juego muestra una fila con 8 columnas de información comparada:
   - **Nombre** — visible siempre, sin código de color.
   - **País** — muestra bandera + nombre del país.
   - **Liga** — la liga en la que juega actualmente.
   - **Equipo** — el equipo actual del jugador.
   - **Posición** — Top, Jungle, Mid, ADC o Support.
   - **Títulos** — si ha ganado algún título regional.
   - **Worlds** — si ha ganado el Campeonato Mundial.
   - **Edad** — con flecha ↑ o ↓ si el secreto es mayor o menor.

4. Cada celda se colorea:
   - 🟢 **Verde** → coincide exactamente con el jugador secreto.
   - 🟠 **Naranja** → coincidencia parcial (por ejemplo, comparte una posición).
   - 🔴 **Rojo** → no coincide.

5. Si el jugador no quiere seguir, puede pulsar **Rendirse**. El juego revela entonces quién era el jugador secreto y muestra una animación de derrota.

6. Al acertar aparece una pantalla de victoria con:
   - Foto del jugador, nombre, nombre real y número de intentos.
   - Animación de confeti de celebración.

---

## Datos de los jugadores

Cada jugador tiene los siguientes campos:

| Campo     | Descripción                                              |
|-----------|----------------------------------------------------------|
| name      | Nombre en el juego (el que se usa para buscar y mostrar) |
| real      | Nombre real completo                                     |
| country   | País de origen en texto libre                            |
| flag      | Emoji de bandera del país                                |
| league    | Liga actual (LCK, LEC, LCS, LPL, CBLOL…)                |
| position  | Array con una o más posiciones                           |
| titles    | Boolean — ha ganado algún título regional                |
| worlds    | Boolean — ha ganado el Campeonato Mundial                |
| age       | Edad como número entero                                  |
| team      | Nombre del equipo actual                                 |
| image     | URL de la foto del jugador (se obtiene de Leaguepedia)   |

Los datos se guardan en `data/players.json` y se pueden editar manualmente.
La aplicación también intenta cargar datos frescos desde la API de Leaguepedia en cada sesión,
usando el archivo local como caché (estrategia stale-while-revalidate).

---

## Idiomas

El juego está disponible en **español** e **inglés**.
El selector de idioma aparece en la esquina superior derecha con la bandera de cada idioma.
La preferencia se guarda en `localStorage` si el usuario ha aceptado las cookies de preferencias.

---

## Estética visual

El diseño está inspirado en la identidad visual de League of Legends:
- Fondo oscuro azul marino (`#010a13`) con imagen de fondo escalable.
- Tipografías **Cinzel** (títulos, estilo clásico/heráldico) y **Rajdhani** (texto, estilo moderno/tech).
- Paleta dorada (`#c89b3c`, `#f0e6d3`, `#785a28`) para acentos, bordes y textos destacados.
- Animaciones de reveal (flip de celdas), confeti de victoria y partículas de derrota.
- Partículas flotantes de fondo siempre activas.

---

## Pantallas principales

### Pantalla de juego
- **Header** con el logo "DLE GAMES" y subtítulo "Adivina el Pro Player".
- **Buscador** con desplegable de sugerencias (muestra bandera, nombre y posición).
- **Botón Adivinar** para confirmar el intento.
- **Contador de intentos** y **botón Rendirse** en dos recuadros separados.
- **Grid de intentos** que crece hacia abajo con cada fila revelada.

### Pantalla de victoria / derrota
- Overlay con animación de entrada.
- Foto circular del jugador.
- Nombre en el juego, nombre real y resumen del resultado.
- Botón "Jugar de nuevo" para reiniciar.

---

## Cookies y privacidad

La aplicación incluye un banner de consentimiento de cookies (GDPR) con:
- **Cookies necesarias** — siempre activas (estado del juego, caché de jugadores).
- **Cookies de preferencias** — opcionales (idioma seleccionado).
- Modal de configuración con toggles por categoría.
- Botón persistente en la esquina inferior izquierda para revisar preferencias en cualquier momento.

---

## Contexto de uso

- El proyecto está pensado para desplegarse en **lolprogames.com**.
- Se sirve como archivos estáticos (HTML + JS modules + JSON). No requiere backend.
- Necesita un servidor local para funcionar en desarrollo (no funciona abriéndolo directamente como archivo).
- Compatible con móvil, tablet y escritorio.
