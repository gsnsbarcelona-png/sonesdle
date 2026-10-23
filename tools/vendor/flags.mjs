// Copia las banderas (SVG 3x2) de country-flag-icons a shared/flags/<código en minúsculas>.svg
import { cpSync, mkdirSync, readdirSync } from 'node:fs';
const from = 'node_modules/country-flag-icons/3x2', to = '../../shared/flags';
mkdirSync(to, { recursive: true });
for (const f of readdirSync(from)) cpSync(`${from}/${f}`, `${to}/${f.toLowerCase()}`);
