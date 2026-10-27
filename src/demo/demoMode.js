/**
 * Modo demostración: el frontend funciona SIN el backend, con los datos ficticios de
 * demo-db.json (raíz del proyecto). Sirve para publicarlo (Netlify) y que alguien lo pruebe.
 *
 * Se activa con la variable de entorno VITE_DEMO_MODE=true (netlify.toml ya la pone en Netlify).
 * Sin ella —como en tu equipo con `npm run dev`— todo sigue conectado al backend real.
 */
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";
