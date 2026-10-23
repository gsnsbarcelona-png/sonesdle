// Copia a shared/ lo que la web sirve desde su propio dominio:
//  - banderas (SVG 3x2 de country-flag-icons) -> shared/flags/<código en minúsculas>.svg
//  - fuentes (woff2 de @fontsource, subsets latin y latin-ext) -> shared/fonts/ + fonts.css
import { cpSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

const flagsFrom = 'node_modules/country-flag-icons/3x2', flagsTo = '../../shared/flags';
mkdirSync(flagsTo, { recursive: true });
for (const f of readdirSync(flagsFrom).filter(f => f.endsWith('.svg'))) cpSync(`${flagsFrom}/${f}`, `${flagsTo}/${f.toLowerCase()}`);

const FONTS = {
  cinzel:   { family: 'Cinzel',   weights: [400, 600, 700, 900] },
  rajdhani: { family: 'Rajdhani', weights: [300, 400, 500, 600, 700] },
};
const fontsTo = '../../shared/fonts';
mkdirSync(fontsTo, { recursive: true });
let css = '/* Generado por tools/vendor/assets.mjs (@fontsource). No editar a mano. */\n';
for (const [pkg, { family, weights }] of Object.entries(FONTS)) {
  for (const weight of weights) {
    const src = readFileSync(`node_modules/@fontsource/${pkg}/${weight}.css`, 'utf8');
    for (const subset of ['latin-ext', 'latin']) {
      const file = `${pkg}-${subset}-${weight}-normal.woff2`;
      const range = new RegExp(`/\\* ${pkg}-${subset}-${weight}-normal \\*/[^}]*?unicode-range: ([^;]+);`).exec(src)?.[1];
      if (!range) throw new Error(`falta ${file} en el CSS de @fontsource`);
      cpSync(`node_modules/@fontsource/${pkg}/files/${file}`, `${fontsTo}/${file}`);
      css += `@font-face{font-family:'${family}';font-style:normal;font-display:swap;font-weight:${weight};`
           + `src:url(./${file}) format('woff2');unicode-range:${range}}\n`;
    }
  }
}
writeFileSync(`${fontsTo}/fonts.css`, css);
