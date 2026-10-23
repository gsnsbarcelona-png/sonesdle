-- Historial de partidas de LoL Pro Games.
-- Pegar en Supabase → SQL Editor → New query → Run. Se puede ejecutar varias veces.

-- ── Resultados ────────────────────────────────────────────────
create table if not exists public.results (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  game        text not null,
  mode        text not null check (mode in ('daily', 'free')),
  played_on   date not null,                 -- día UTC, el mismo que usa el reto diario
  won         boolean not null,
  attempts    integer check (attempts >= 0),
  details     jsonb not null default '{}',   -- específico de cada juego (jugador, plantilla...)
  created_at  timestamptz not null default now()
);

-- Juegos válidos (aparte, para poder añadir juegos a una tabla ya creada)
alter table public.results drop constraint if exists results_game_check;
alter table public.results add constraint results_game_check
  check (game in ('dle', 'rostergues', 'carrera', 'grid', 'wordle'));

-- Límites de lo que puede enviar el cliente (la anon key es pública, así que se validan aquí).
-- "not valid": solo se aplican a filas nuevas, por si ya hay datos antiguos.
alter table public.results drop constraint if exists results_limits_check;
alter table public.results add constraint results_limits_check check (
  (attempts is null or attempts between 0 and 500)
  and octet_length(details::text) <= 16384
) not valid;

-- El día lo fija el servidor: el cliente solo puede decir hoy o ayer (UTC), así no se
-- pueden rellenar rachas de días pasados o futuros. Además, un tope de partidas por hora.
create or replace function public.results_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  today date := (now() at time zone 'utc')::date;
begin
  if new.played_on is null or new.played_on not between today - 1 and today then
    new.played_on := today;
  end if;
  if (select count(*) from public.results
        where user_id = new.user_id and created_at > now() - interval '1 hour') >= 200 then
    raise exception 'demasiadas partidas guardadas, inténtalo más tarde';
  end if;
  return new;
end;
$$;

drop trigger if exists results_before_insert on public.results;
create trigger results_before_insert before insert on public.results
  for each row execute function public.results_before_insert();

-- Una sola partida diaria por usuario, juego y día
create unique index if not exists results_one_daily
  on public.results (user_id, game, played_on) where mode = 'daily';

create index if not exists results_user_game
  on public.results (user_id, game, played_on desc);

-- ── Seguridad: cada usuario solo ve y guarda lo suyo ─────────
alter table public.results enable row level security;

drop policy if exists "leer mis resultados"   on public.results;
drop policy if exists "guardar mis resultados" on public.results;
drop policy if exists "borrar mis resultados"  on public.results;

create policy "leer mis resultados" on public.results
  for select to authenticated using (user_id = auth.uid());

create policy "guardar mis resultados" on public.results
  for insert to authenticated with check (user_id = auth.uid());

create policy "borrar mis resultados" on public.results
  for delete to authenticated using (user_id = auth.uid());

-- Defensa en profundidad: sin acceso anónimo y sin UPDATE (no hay política para ello)
revoke all on public.results from anon;
revoke update on public.results from authenticated;
grant select, insert, delete on public.results to authenticated;

-- ── Borrar la cuenta (derecho de supresión) ──────────────────
-- Borra el usuario de auth.users; sus resultados se borran en cascada.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'sesión no válida';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
