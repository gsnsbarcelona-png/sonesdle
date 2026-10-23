/** Registra el service worker (raíz del sitio: cubre todos los juegos). */
if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.warn('Sin service worker:', err));
  });
}
