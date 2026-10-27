# Modo demostración (sin backend)

El frontend puede funcionar **sin el backend**, con datos ficticios, para publicarlo (por ejemplo en
Netlify) y que otra persona lo pruebe.

## Cómo se prende y se apaga

Un solo interruptor: la variable de entorno **`VITE_DEMO_MODE`**.

| Dónde | Valor | Qué pasa |
|---|---|---|
| Netlify | `true` (ya está en `netlify.toml`) | El sitio publicado usa `demo-db.json`, sin backend |
| Tu equipo (`npm run dev`) | sin definir | Todo sigue conectado al backend real, como siempre |

- Para conectar el sitio publicado a un backend real: en `netlify.toml` cambia `"true"` por `"false"` y define `VITE_REACT_APP_URL` con la URL pública de la API.
- Para probar la demo en tu equipo: `VITE_DEMO_MODE=true npm run dev` (en PowerShell: `$env:VITE_DEMO_MODE="true"; npm run dev`).
- Si en Netlify el sitio usa otra carpeta base, define la variable en Netlify → Site configuration → Environment variables.

## Qué se puede hacer en la demo

- **Entrar** con cualquier cédula y contraseña (entra como la usuaria de demostración, administradora).
- **Recorrer todo el sistema**: inicio con gráficas, ventas, reportes, cartera, compras, inventario, caja, administración y configuración (modo noche incluido).
- **No se guarda nada**: crear, editar, vender, abonar… responden "Esto es una demostración: … los cambios no se guardan".
- No se generan archivos (comprobantes PDF, balance en PDF o Excel).
- Un aviso fijo abajo indica que es una demostración.

## Los datos: `demo-db.json` (raíz del proyecto)

- Son respuestas **grabadas del servidor real** con una **base de prueba de datos ficticios** (María Gómez, Ana Administradora, Rovira Centro…). No contienen datos reales del negocio.
- Clave = ruta de la API con sus parámetros (`/sales?page=1&from=…`). Si una consulta no está grabada tal cual, se usa la de la misma ruta con los parámetros más parecidos (las fechas cambian cada día).
- Se puede editar a mano (nombres, montos) respetando la forma de cada respuesta.
- El código: `src/demo/` (interruptor, adaptador y aviso) y `src/api/client.js` (usa el adaptador solo en modo demo).
