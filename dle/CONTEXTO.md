# Adivina el Pro Player — Descripción del proyecto

## ¿Qué es este juego?

Es un juego de adivinanza al estilo Wordle ambientado en el mundo de los esports de League of Legends.
Cada partida el jugador tiene que descubrir un pro player secreto haciendo intentos sucesivos.
Con cada intento el juego revela pistas visuales sobre cuánto se parece el jugador elegido al secreto.

No hay límite de intentos. El objetivo es acertar con los menos posibles.

Hay dos modos:
- **Reto diario** — el mismo jugador para todos, solo entre jugadores de ligas tier 1. El día cambia a las 00:00 UTC.
  El progreso se guarda tras cada intento (se puede recargar a mitad de partida) y, si hay sesión de Google,
  el resultado se sincroniza con la cuenta. El secreto del día se fija en el navegador la primera vez que se calcula.
- **Modo libre** — jugador aleatorio filtrado por tier (1, 2 o 3) y región, que se eligen al terminar el diario.

Además existe el **modo difícil**, que oculta las columnas de liga y equipo.

---

## ¿Cómo se juega?

1. El jugador escribe el nombre de un pro player en el buscador.
2. Puede seleccionarlo del desplegable que aparece (al seleccionar, se envía automáticamente).
3. El juego muestra una fila con 8 columnas de información comparada (7 en modo difícil, sin liga ni equipo):
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
   - Nombre, nombre real y número de intentos (foto solo si el jugador tiene `image`).
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
| tier      | 1 = liga con plaza a Worlds (reto diario), 2 = resto de ligas oficiales, 3 = el resto |
| region    | KR, CN, EMEA, NA, BR, LATAM o PAC                        |
| birthdate | `YYYY-MM-DD`, o solo `YYYY` si no se conoce más; la edad se calcula con ella |
| team      | Nombre del equipo actual (o el último si es agente libre reciente) |
| free_agent | Boolean — sigue con su último equipo sin contrato        |

`data/players.json` **lo genera `league_players scrapper/.../build.py`** desde Leaguepedia (lo ejecuta cada día
el workflow `.github/workflows/update-data.yml`). No hay que editarlo a mano: las correcciones van en
`league_players scrapper/.../curated/player_fixes.json`. El navegador solo lee ese fichero estático; no consulta
Leaguepedia. Hoy no hay fotos de jugadores (`image` está vacío), así que la pantalla de victoria no las muestra.

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
- Foto circular del jugador, si la hay.
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
- Los módulos compartidos con el resto de juegos están en `../shared/` (idioma, cuentas, accesibilidad, partículas, banderas).
- La CSP de `vercel.json` no permite scripts inline ni CDNs de terceros: todo lo que se cargue tiene que estar en el repositorio.

---

## Estilos (Tailwind compilado)

El dle usa clases de Tailwind, pero **no** carga Tailwind desde su CDN: usa un CSS ya generado,
`dle/css/tailwind.css` (14 KB en lugar de 124 KB de JavaScript que bloqueaba la carga).

Ese CSS solo contiene las clases que aparecen en `dle/index.html` y `dle/js/`. **Si añades o cambias
clases de Tailwind en el dle, hay que regenerarlo**, o las clases nuevas no tendrán estilo. Desde la
raíz del repositorio:

```
npx tailwindcss@3.4.17 -c tools/tailwind/tailwind.config.cjs -i tools/tailwind/input.css -o dle/css/tailwind.css --minify
```

- La configuración (colores `gold` y `lol`, fuentes `cinzel` y `rajdhani`) está en `tools/tailwind/tailwind.config.cjs`.
- Las clases tienen que aparecer escritas completas en el código: una clase montada por partes
  (por ejemplo `'text-' + color`) no se detecta y no se genera.
- `tools/` no se publica en la web (está en `.vercelignore`).
