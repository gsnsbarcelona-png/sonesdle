# Instrucciones para Claude en este proyecto

Sonesdle (lolprogames.com): cinco juegos de LoL más Family Grid, como webs estáticas en Vercel con cuentas en Supabase. Los datos los genera cada día `league_players scrapper/league_players scrapper/build.py` desde el workflow `Actualizar datos`.

## Ramas: GitFlow (obligatorio)

Referencia completa: `docs/flujo-de-ramas.md`. Resumen para trabajar:

- `main` = producción (Vercel). `develop` = integración.
- Cada tarea nueva va en su propia rama, **la creo yo** sin preguntar, con el nombre que corresponda:
  - `feature/<nombre>` sale de `develop` y vuelve a `develop` (PR con **Squash**).
  - `release/<AAAA-MM-DD>` sale de `develop` y va a `main` (PR con **merge commit**). No hace falta devolverla a `develop` si no lleva cambios propios.
  - `hotfix/<nombre>` sale de `main` y va a `main` (merge commit), y **siempre** luego `main` → `develop`.
- Antes de empezar una `feature/*`, actualizo `develop` (`git fetch` y partir de `origin/develop`). Si la tarea toca datos o el generador y `git diff --stat origin/develop..origin/main` muestra ficheros, lo digo y propongo el PR de `main` a `develop` antes de empezar.
- Decido yo qué tipo de rama es cada cosa: una mejora o juego nuevo es `feature`; un fallo que se ve en producción y no puede esperar, `hotfix`; un cambio del generador de datos que debe llegar ya a los datos reales también es `hotfix` (el workflow de datos solo corre sobre `main`).
- Nunca subo directamente a `main` ni a `develop`. Nunca pongo `develop` como rama de origen de un PR a `main`: siempre una `release/*`.
- Nunca lanzo el workflow `Actualizar datos` sobre una rama que no sea `main`.
- **No hago PR ni merge sin que me lo pidan.** Abro el PR cuando el usuario lo diga y mergeo solo cuando lo diga explícitamente ("mergea el N").
- **`main` → `develop` solo cuando hace falta:** tras un hotfix, si la release llevó arreglos propios, o antes de una feature que toque datos con `main` por delante. Compruebo con `git diff --stat origin/develop..origin/main`: si no sale ningún fichero (solo un commit de merge), no abro ese PR.
- El nombre de la rama no lleva mayúsculas, espacios ni acentos.

## Cosas que no se rompen

- CSP estricta: nada de scripts ni estilos en línea (`style-src 'self'`).
- Estilos con los tokens compartidos de `shared/css/variables.css` (canales RGB, tema oscuro y claro).
- Textos en castellano e inglés (`i18n.js` de cada juego); el código y los commits en castellano.
- Un fichero de datos nuevo se añade también a `tools/data_guard.py` (lista `FILES`) y al `git add` del workflow.
- Un id de juego nuevo exige actualizar `supabase/schema.sql` y que el usuario ejecute la migración a mano.
- `build.py` no se puede ejecutar en local (Leaguepedia bloquea la sesión): los datos reales solo se prueban en el workflow.
- Los PR de datos del bot (`datos/automatico`) los gestiona el workflow; no los toco salvo petición.

## Estilo de trabajo con el usuario

- Respuestas en castellano, cortas y claras; si propongo algo, doy una recomendación, no un menú.
- Antes de borrar o sobrescribir, miro el destino. Los cambios con efecto en producción se explican antes de mergear.
- No puedo borrar ramas (GitHub devuelve 403); las ramas se borran solas al mergear y, si queda alguna, se lo digo al usuario.
