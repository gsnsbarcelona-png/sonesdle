/**
 * auth.js — Cuenta de Google (Supabase) e historial de partidas.
 *
 * - Sin cuenta: los resultados se guardan en este navegador (localStorage).
 * - Con cuenta: también se suben a Supabase; al iniciar sesión se suben los
 *   que estaban pendientes en este navegador.
 *
 * La librería de Supabase se carga bajo demanda: si la CDN falla, los juegos
 * siguen funcionando y solo desaparece la cuenta.
 */

const SUPABASE_URL = 'https://pvztcqmmobmuymopyfej.supabase.co';
// Clave pública por diseño: la seguridad la dan las reglas RLS de supabase/schema.sql
const SUPABASE_KEY = 'sb_publishable_zXMAkTT5AM9PeC8l68OWlA_h8c3Kvup';
const SUPABASE_JS  = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm';

const LOCAL_KEY = 'lolpg_results';
export const GAMES = ['dle', 'rostergues', 'carrera', 'grid'];

let clientPromise = null;

/** Cliente de Supabase, o null si no se ha podido cargar. */
export function getClient() {
  clientPromise ??= import(SUPABASE_JS)
    .then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' },
    }))
    .catch(err => { console.warn('Supabase no disponible:', err); return null; });
  return clientPromise;
}

export async function getUser() {
  const sb = await getClient();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session?.user ?? null;
}

/** Llama a `cb(user|null)` ahora y cada vez que cambie la sesión. */
export async function onAuthChange(cb) {
  const sb = await getClient();
  if (!sb) return cb(null);
  sb.auth.onAuthStateChange((event, session) => {
    const user = session?.user ?? null;
    if (event === 'SIGNED_IN') syncPending();
    cb(user);
  });
}

export async function signIn() {
  const sb = await getClient();
  if (!sb) return;
  // Volver a la misma página, sin el ?code= de un login anterior
  const back = window.location.origin + window.location.pathname;
  await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: back } });
}

export async function signOut() {
  const sb = await getClient();
  if (sb) await sb.auth.signOut();
}

/** Borra la cuenta y todo su historial (también el de este navegador). */
export async function deleteAccount() {
  const sb = await getClient();
  if (!sb) return;
  const { error } = await sb.rpc('delete_my_account');
  if (error) throw error;
  localStorage.removeItem(LOCAL_KEY);
  await sb.auth.signOut();
}

// ── Resultados ─────────────────────────────────────────────────

/** Día del reto diario (UTC, igual que los juegos). */
export function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Guarda el resultado de una partida.
 * @param {{ game: string, mode: 'daily'|'free', won: boolean,
 *           attempts?: number|null, details?: object }} result
 */
export async function recordResult({ game, mode, won, attempts = null, details = {} }) {
  const row = { game, mode, played_on: today(), won, attempts, details, synced: false };
  const local = loadLocal();
  // El reto diario cuenta una sola vez al día
  if (mode === 'daily' && local.some(r => r.game === game && r.mode === 'daily' && r.played_on === row.played_on)) {
    return;
  }
  local.push(row);
  saveLocal(local);
  if (await getUser()) await syncPending();
}

/** Sube los resultados de este navegador que aún no están en la cuenta. */
export async function syncPending() {
  const sb = await getClient();
  if (!sb || !(await getUser())) return;
  const local = loadLocal();
  for (const row of local.filter(r => !r.synced)) {
    const { synced, ...data } = row;
    const { error } = await sb.from('results').insert(data);
    // 23505: ese reto diario ya estaba subido (desde otro dispositivo)
    if (!error || error.code === '23505') row.synced = true;
  }
  saveLocal(local);
}

/**
 * Reto diario de hoy ya guardado en la cuenta (jugado en otro dispositivo),
 * o null si no hay sesión o no lo ha jugado.
 */
export async function getTodayDaily(game) {
  const sb = await getClient();
  if (!sb || !(await getUser())) return null;
  const { data, error } = await sb.from('results')
    .select('won, attempts, details')
    .eq('game', game).eq('mode', 'daily').eq('played_on', today())
    .maybeSingle();
  return error ? null : data;
}

/** Resultados de un juego: de la cuenta si hay sesión, si no de este navegador. */
export async function getResults(game) {
  const sb = await getClient();
  if (sb && (await getUser())) {
    const { data, error } = await sb.from('results')
      .select('game, mode, played_on, won, attempts, details')
      .eq('game', game).order('played_on').order('created_at');
    if (!error) return data;
  }
  return loadLocal().filter(r => r.game === game);
}

/**
 * Estadísticas al estilo Wordle. Las rachas solo cuentan retos diarios
 * ganados en días seguidos.
 */
export function computeStats(results) {
  const played = results.length;
  const wins   = results.filter(r => r.won).length;
  const daily  = [...new Set(results.filter(r => r.mode === 'daily' && r.won).map(r => r.played_on))].sort();

  let best = 0, run = 0, prev = null;
  for (const day of daily) {
    run = prev && dayDiff(prev, day) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  // La racha actual sigue viva si el último reto ganado es de hoy o de ayer
  const current = prev && dayDiff(prev, today()) <= 1 ? run : 0;

  const distribution = {};
  for (const r of results) {
    if (r.won && r.attempts != null) distribution[r.attempts] = (distribution[r.attempts] ?? 0) + 1;
  }
  return { played, wins, winPct: played ? Math.round(100 * wins / played) : 0,
           currentStreak: current, maxStreak: best, distribution };
}

function dayDiff(a, b) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) ?? []; }
  catch { return []; }
}

function saveLocal(rows) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(rows)); } catch { /* modo privado */ }
}
