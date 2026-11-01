/**
 * Analítica de visitas con Umami (sin cookies ni datos personales).
 *
 * El script y los envíos pasan por el propio dominio (/umami/*, ver "rewrites" en vercel.json):
 * así la CSP no necesita abrirse a un tercero y los bloqueadores no lo confunden con publicidad.
 *
 * Mientras WEBSITE_ID esté vacío no hace nada. Para activarlo, pega aquí el "Website ID"
 * que da Umami al añadir el sitio.
 */
const WEBSITE_ID = '82a7b089-3542-4ca2-a019-3c5e4fca7277';

// Solo se mide la web real: las vistas previas de Vercel y localhost no contaminan las cifras
const DOMAINS = 'lolprogames.com,www.lolprogames.com';

if (WEBSITE_ID && !document.querySelector('script[data-umami]')) {
  const s = document.createElement('script');
  s.defer = true;
  s.src = '/umami/script.js';
  s.dataset.umami = '1';
  s.dataset.websiteId = WEBSITE_ID;
  s.dataset.hostUrl = `${location.origin}/umami`;
  s.dataset.domains = DOMAINS;
  s.dataset.doNotTrack = 'true';   // respeta "No rastrear" del navegador
  document.head.appendChild(s);
}
