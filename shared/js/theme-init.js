/* Aplica el tema elegido antes de pintar la página (se carga sin defer en el <head>).
   Sin elección guardada, manda el tema del sistema (ver shared/css/variables.css). */
try {
  var t = localStorage.getItem('app_theme');
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
} catch (e) { /* sin storage: tema del sistema */ }
