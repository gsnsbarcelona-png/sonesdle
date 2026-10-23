/**
 * Service worker de LOL Pro Games.
 *
 * Estrategia "red primero": siempre se pide la versión actual (los datos cambian cada día) y
 * la copia guardada solo se usa si no hay conexión. Así nunca se sirve algo viejo con red,
 * y los juegos ya visitados abren sin conexión.
 */
const CACHE = 'sonesdle-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
  await self.clients.claim();
})()));

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);
  // Solo lo propio y por GET: Supabase, Google y demás van directos a la red
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname === '/sw.js') return;
  e.respondWith(networkFirst(request, url));
});

async function networkFirst(request, url) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    // Se guarda lo completo y sin datos de sesión (?code= es la vuelta del login)
    if (response.status === 200 && response.type === 'basic' && !url.searchParams.has('code')) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const hit = await cache.match(request, { ignoreSearch: request.mode === 'navigate' });
    if (hit) return hit;
    throw err;   // sin red y sin copia: error normal del navegador
  }
}
