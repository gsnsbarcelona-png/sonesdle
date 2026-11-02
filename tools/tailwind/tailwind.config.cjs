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
      // Los colores salen de las variables de shared/css/variables.css (canales RGB),
      // así cambian solos con el tema claro/oscuro y admiten opacidad (bg-gold/10)
      colors: {
        gold:  { DEFAULT: 'rgb(var(--gold-rgb) / <alpha-value>)', light: 'rgb(var(--text-rgb) / <alpha-value>)', dark: 'rgb(var(--gold-dark-rgb) / <alpha-value>)' },
        danger: { DEFAULT: 'rgb(var(--danger-rgb) / <alpha-value>)', border: 'rgb(var(--danger-border-rgb) / <alpha-value>)', bg: 'rgb(var(--danger-bg-rgb) / <alpha-value>)' },
        lol:   {
          bg:       'rgb(var(--bg-rgb) / <alpha-value>)',
          surface:  'rgb(var(--surface-rgb) / <alpha-value>)',
          surface2: 'rgb(var(--surface2-rgb) / <alpha-value>)',
          border:   'rgb(var(--border-rgb) / <alpha-value>)',
          dim:      'rgb(var(--dim-rgb) / <alpha-value>)',
          text:     'rgb(var(--text-rgb) / <alpha-value>)',
          teal:     'rgb(var(--teal-rgb) / <alpha-value>)',
        },
      },
      fontFamily: {
        display:  ['Barlow Condensed', 'sans-serif'],
        body:     ['Barlow', 'sans-serif'],
        mono:     ['JetBrains Mono', 'monospace'],
      },
    },
  },
};
