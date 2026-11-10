/** Textos de la página 404 (castellano e inglés) y selector de idioma. */
import { mountSwitcher, applyStaticTranslations } from '/shared/lang.js';

const T = {
  es: {
    title: 'Página no encontrada',
    sub:   'La dirección no existe o se ha movido. Prueba con uno de los juegos.',
    home:  'Volver al inicio',
  },
  en: {
    title: 'Page not found',
    sub:   "This address doesn't exist or has moved. Try one of the games.",
    home:  'Back to home',
  },
};

function render() {
  applyStaticTranslations(T);
  document.title = `${T[document.documentElement.lang]?.title ?? T.es.title} · LoL Pro Games`;
}

mountSwitcher(document.getElementById('lang-slot'));
document.addEventListener('langchange', render);
render();
