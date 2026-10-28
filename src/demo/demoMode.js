/**
 * Modo demostración: el frontend funciona SIN el backend, con los datos ficticios de
 * demo-db.json (raíz del proyecto). Sirve para publicarlo (Netlify) y que alguien lo pruebe.
 *
 * Se activa con la variable de entorno VITE_DEMO_MODE=true (netlify.toml ya la pone en Netlify).
 * Sin ella —como en tu equipo con `npm run dev`— todo sigue conectado al backend real.
 *
 * El sitio real en Netlify (Fase 17.2) define en su panel VITE_PRODUCTION_SITE=true y
 * VITE_REACT_APP_URL: así usa la API aunque netlify.toml active el demo (las variables del archivo
 * mandan sobre las del panel, por eso se apaga con otra variable y no cambiando esta).
 */
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true" && import.meta.env.VITE_PRODUCTION_SITE !== "true";
