-- Historial de partidas de LoL Pro Games.
-- Pegar en Supabase → SQL Editor → New query → Run. Se puede ejecutar varias veces.

-- ── Resultados ────────────────────────────────────────────────
create table if not exists public.results (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  game        text not null check (game in ('dle', 'rostergues', 'carrera', 'grid')),
  mode        text not null check (mode in ('daily', 'free')),
  played_on   date not null,                 -- día UTC, el mismo que usa el reto diario
  won         boolean not null,
  attempts    integer check (attempts >= 0),
  details     jsonb not null default '{}',   -- específico de cada juego (jugador, plantilla...)
  created_at  timestamptz not null default now()
);

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

-- ── Borrar la cuenta (derecho de supresión) ──────────────────
-- Borra el usuario de auth.users; sus resultados se borran en cascada.
create or replace function public.delete_my_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
