# Juego de las familias — propuesta de diseño

Estado: borrador para decidir. Nada de código todavía.

## Idea
Un tablero de 4×4 con 16 jugadores (foto + apodo). Entre ellos hay 4 "familias" de 4 jugadores
unidas por algo en común. La persona elige 4, pulsa **Validar**, y si es una familia se descubre su
título; si no, pierde una vida. Estilo *Connections* de The New York Times, con datos de LoL.

Solo entran jugadores con foto en Leaguepedia (hoy ~1120 de los 1756 de dle). Ni equipos ni gente sin foto.

## Cómo se juega
- 16 fichas con foto y apodo debajo. Se eligen 4 (se marcan), "Validar".
- Acierto: las 4 fichas suben a una banda de color con el título de la familia ("Jugaron en G2 en 2019").
- Fallo: se pierde 1 de 4 vidas. Si faltaba solo una ficha, aviso "A una de acertar".
- Botón de mezclar y de quitar la selección.
- Fin: ganas al descubrir las 4 familias; pierdes al quedarte sin vidas (se enseñan las que faltaban).
- Diario (mismo para todos, calendario por adelantado como wordle/grid) y modo libre (puzles al azar).
- Resultado para compartir con cuadraditos de colores por orden de aciertos.

## Dificultad de cada familia (colores)
| Color | Dificultad | Ejemplos de familia |
|---|---|---|
| Amarillo | fácil | mismo equipo actual · misma nacionalidad · misma región |
| Verde | media | jugaron en un equipo concreto en un año (G2 2019) · mismo año de debut |
| Azul | difícil | campeones del mundo · jugaron en dos posiciones distintas · pasaron por dos regiones |
| Morado | truco | apellido real compartido (Kim, Lee…) · el apodo cumple algo (lleva un número, es una palabra…) |

## De dónde salen los datos
- Ya hay: país, región, liga, equipo actual, año de debut, títulos, foto (`dle/data/players.json`).
- Hace falta el historial de equipos con años y las posiciones por jugador. Existe en el maestro que genera
  `build.py` (`players_master.json`: `history`, `roles`, títulos). No se publica hoy: habría que generar un
  fichero propio del juego (jugadores con foto y sus atributos).
- Las familias de "apodo" necesitan listas curadas a mano (fichero en `curated/`).

## Generar puzles justos
1. Elegir 4 familias de tipos distintos y con dificultades repartidas.
2. Elegir 4 jugadores por familia, con algún "señuelo" que encaje en dos familias (da gracia).
3. **Comprobar con un solucionador** que la única forma de repartir las 16 fichas en 4 grupos válidos es la
   prevista. Si hay otra, se descarta el puzle.
4. Diario: calendario de 60 días generado por `build.py` con semilla por fecha. Libre: se genera en el navegador.

## Piezas a tocar
- `build.py`: datos del juego, catálogo de familias, generador y solucionador (+ el guardián de datos `data_guard.py`).
- Carpeta nueva del juego (HTML, CSS, JS), con los componentes compartidos (barra, tema, idioma, cuenta).
- Portada y navegación: una tarjeta y un icono nuevos; `sitemap.xml`; `manifest.json` si hay atajos.
- Resultados en la cuenta: `supabase/schema.sql` limita los juegos permitidos (`results_game_check`);
  hay que añadir el nuevo y ejecutar esa migración en Supabase (paso manual).
- Privacidad: las fotos ya se cargan de Fandom (ya está explicado); no cambia nada más.

## Riesgos
- Calidad de las fotos de Leaguepedia (alguna será de otro año o de baja calidad): conviene lista de exclusión.
- El historial por meses tiene huecos y suplentes: la familia "jugaron en X en el año Y" necesita reglas claras.
- "Dos posiciones" depende de una heurística (≥15 % de partidas): validar a mano las primeras familias.
- Cargar 16 fotos remotas por puzle: miniaturas de 160 px, con marcador de posición si fallan.

## Fases
1. Datos y generador con solucionador, comprobados con puzles reales (sin interfaz).
2. Interfaz del juego (diario y libre) en ES/EN.
3. Integración: portada, cuenta, compartir, calendario y pruebas.

## Preguntas abiertas
- Nombre del juego.
- ¿Foto + apodo, o solo foto?
- ¿4 vidas y aviso "a una de acertar"?
- ¿Familias de "apodo" (morado) desde el principio o en una segunda versión?
- ¿Diario y libre desde el inicio?
