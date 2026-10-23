# Dependencias propias (sin CDN)

`shared/vendor/supabase.js` (supabase-js, empaquetado) y `shared/flags/*.svg` (banderas) se
generan aquí para que la web no cargue nada de CDNs de terceros (privacidad y CSP).

    cd tools/vendor && npm install && npm run build

Para actualizar, cambia la versión en `package.json` y vuelve a ejecutarlo.
