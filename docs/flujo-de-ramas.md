# Flujo de ramas (GitFlow)

Desde noviembre de 2026 el proyecto trabaja con GitFlow. Esta es la referencia, en castellano y adaptada a lo que es Sonesdle: una web estática en Vercel con un workflow que actualiza los datos cada día.

## Las ramas

| Rama | Para qué | Sale de | Entra en |
|---|---|---|---|
| `main` | Producción. Lo que ve el público en lolprogames.com. Vercel despliega cada cambio. | — | — |
| `develop` | Integración. Todo lo que está listo pero aún no se ha publicado. Vercel le da una vista previa. | `main` | — |
| `feature/<nombre>` | Una funcionalidad o mejora. | `develop` | `develop` |
| `release/<AAAA-MM-DD>` | Preparar una publicación: últimas pruebas y retoques. | `develop` | `main` (y `develop` solo si lleva arreglos propios) |
| `hotfix/<nombre>` | Arreglo urgente en producción. | `main` | `main` **y** `develop` |

Nombres: `feature/familias-modo-libre`, `release/2026-11-12`, `hotfix/quitar-equipo-falso`. Minúsculas, guiones y sin espacios.

## Día a día

### Una funcionalidad
1. `feature/x` sale de `develop` (actualizado).
2. Se trabaja, se prueba y se abre un PR **hacia `develop`**.
3. Se mergea con **Squash**: un commit limpio por funcionalidad. La rama se borra sola.

### Publicar
1. Cuando `develop` tiene lo que se quiere publicar: `release/AAAA-MM-DD` sale de `develop`.
2. Solo se admiten arreglos en esa rama, no funcionalidades nuevas.
3. PR **hacia `main`**, mergeado con **Create a merge commit**. Nunca Squash ni Rebase: si se aplastara, `develop` y `main` divergerían y aparecerían conflictos fantasma.
4. Normalmente **no hace falta** más: la publicación sale de `develop` sin cambios y en `main` solo queda un commit de merge sin ficheros. Solo se sincroniza `main` con `develop` si hay algo real que `develop` no tiene (ver «Cuándo sincronizar»).
5. Etiqueta opcional en `main`: `vAAAA.MM.DD`.

### Un arreglo urgente
1. `hotfix/x` sale de `main`.
2. PR **hacia `main`**, mergeado con merge commit. Se publica al momento.
3. Después, PR de `main` hacia `develop` (un hotfix siempre se sincroniza: ese arreglo solo existe en `main`).

## Cosas propias de este proyecto

- **Los datos diarios van a `main`.** El workflow `Actualizar datos` abre un PR sobre `main` y lo mergea solo si el cambio es normal. Eso es una publicación de datos, no una funcionalidad. Por eso `develop` se queda atrás en datos; se pone al día al sincronizar (ver «Cuándo sincronizar»).
- **El workflow de datos solo corre sobre `main`.** Si se lanza sobre otra rama, el PR de datos arrastraría el código de esa rama a producción. Un cambio en `familias.py` o `build.py` no afecta a los datos reales hasta que llega a `main` con una publicación. Un arreglo pequeño y urgente del generador es un `hotfix`.
- **Las fusiones usan merge commit en publicaciones y hotfix, Squash en funcionalidades.**
- **No se publica desde `develop` directamente.** El PR a `main` sale siempre de una rama `release/*` o `hotfix/*`, nunca de `develop`: si se borra la rama de origen al mergear, `develop` desaparecería.
- **Dependabot** abre sus PR de versiones hacia `develop` (`target-branch`). Las actualizaciones de seguridad van a `main` porque GitHub usa la rama por defecto.
- **Nunca se sube directamente** a `main` ni a `develop`: todo va por PR.

## Cuándo sincronizar `main` con `develop`

El PR de `main` hacia `develop` (merge commit, nunca Squash) solo se hace cuando `main` tiene algo real que `develop` no tiene:

- **Después de un `hotfix`**, siempre: el arreglo solo está en `main`.
- **Si la `release/*` llevó arreglos propios** hechos dentro de la rama.
- **Antes de empezar una `feature/*` que toque datos o el generador**, si `main` lleva datos nuevos del bot (así se prueba contra los datos actuales y no hay conflictos luego).

Se comprueba así; si no sale ningún fichero, no hay nada que sincronizar y se omite:

```
git fetch origin
git diff --stat origin/develop..origin/main
```

El commit de merge de una publicación sin cambios **no** cuenta: no lleva ficheros y no justifica un PR.

## Vista previa y producción

- Vercel publica `main` en el dominio real.
- `develop` y cada `feature/*` o `release/*` tienen su propia vista previa en una URL de `vercel.app`. Sirve para revisar antes de mergear.
- Los resultados de la gente en la vista previa se guardan en la misma base de datos de Supabase que la web real. No hay una base de pruebas.

## Resumen en una línea

`feature/*` → `develop` → `release/*` → `main`, y `hotfix/*` → `main`; `main` → `develop` solo cuando `main` tenga algo real que `develop` no tenga (tras un hotfix, con datos nuevos antes de tocar datos o con arreglos de la release).
