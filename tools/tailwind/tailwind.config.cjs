/**
 * CSS de Tailwind del dle, compilado (antes se generaba en el navegador con cdn.tailwindcss.com).
 * Si cambias clases de Tailwind en dle/, vuelve a generarlo desde la raíz del repo:
 *
 *   npx tailwindcss@3.4.17 -c tools/tailwind/tailwind.config.cjs -i tools/tailwind/input.css -o dle/css/tailwind.css --minify
 */
module.exports = {
  content: ['./dle/index.html', './dle/js/**/*.js'],
  theme: {
    extend: {
      colors: {
        gold:  { DEFAULT: '#c89b3c', light: '#f0e6d3', dark: '#785a28' },
        lol:   {
          bg:       '#010a13',
          surface:  '#0a1428',
          surface2: '#0f1e36',
          border:   '#1e3a5f',
          dim:      '#4a6080',
          text:     '#c8d4e8',
          teal:     '#0bc4c4',
        },
      },
      fontFamily: {
        cinzel:   ['Cinzel', 'serif'],
        rajdhani: ['Rajdhani', 'sans-serif'],
      },
    },
  },
};
