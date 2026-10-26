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
        gold:  { DEFAULT: '#e8b84a', light: '#e9edf1', dark: '#8a6a1f' },
        lol:   {
          bg:       '#0b0d10',
          surface:  '#12161b',
          surface2: '#181d24',
          border:   '#232a33',
          dim:      '#8b96a3',
          text:     '#e9edf1',
          teal:     '#3fc1c9',
        },
      },
      fontFamily: {
        display:  ['Barlow Condensed', 'sans-serif'],
        body:     ['Barlow', 'sans-serif'],
      },
    },
  },
};
