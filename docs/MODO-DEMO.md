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
- **Registrar de verdad** (se guarda en el navegador de quien prueba):
  - **crear, editar y borrar** categorías, clientes, proveedores, productos, usuarios, roles, sucursales y cajas;
  - **asignar un producto a sucursales** (carga inicial de existencias);
  - **vender** en el punto de venta: la venta sale en Ventas con su número y detalle, y baja las existencias.
- Lo que se registra **sigue ahí al recargar**. El botón **"Reiniciar demo"** (en el aviso de abajo) lo borra todo y vuelven los datos de ejemplo.
- **No se guarda** el resto (compras, traslados, toma física, abonos de cartera, ingresos y cierres de caja): responden con un aviso.
- No se generan archivos (comprobantes PDF, balance en PDF o Excel).
- El inicio, los reportes y el balance muestran los datos de ejemplo: no suman lo vendido en la demo.

## Los datos: `demo-db.json` (raíz del proyecto)

- Son respuestas **grabadas del servidor real** con una **base de prueba de datos ficticios** (María Gómez, Ana Administradora, Rovira Centro…). No contienen datos reales del negocio.
- Clave = ruta de la API con sus parámetros (`/sales?page=1&from=…`). Si una consulta no está grabada tal cual, se usa la de la misma ruta con los parámetros más parecidos (las fechas cambian cada día).
- Se puede editar a mano (nombres, montos) respetando la forma de cada respuesta.
- Los cambios de quien prueba se guardan en su navegador (`localStorage`, clave `nexsuite.demo.changes.v1`) como una lista de operaciones que se vuelve a aplicar al recargar. **Nunca** se escribe en `demo-db.json` ni en el backend.
- El código: `src/demo/` (interruptor, adaptador, cambios y aviso) y `src/api/client.js` (usa el adaptador solo en modo demo).
