# Prueba en la nube: Render + Aiven (MySQL)

Para **probar NexSuite en la nube**, sin el chatbot:

- el **servidor** (repositorio `NexSuite__Backend`) va en un *Web Service* de **Render**;
- las **pantallas** (repositorio `NexSuite`) van en un *Static Site* de **Render**;
- la **base de datos** es una **MySQL gratis de Aiven**.

> Es para **pruebas**. Los planes gratis tienen límites (sección 7). Para el uso real del negocio está
> `docs/DESPLIEGUE.md` (VPS).

> **Nunca pegues contraseñas, el `TOKEN_SECRET` ni los datos de conexión en el chat, en GitHub ni en
> capturas.** Solo van en los paneles de Render y Aiven (y un momento en tu terminal, en el paso 3).

Antes de empezar: **sube a GitHub (commit y push) lo último de los dos repositorios.**

---

## 1. La base de datos en Aiven

1. Entra a **console.aiven.io** y crea tu cuenta.
2. **Create service → MySQL → plan Free**. Elige la región más cercana a la de Render que vas a usar
   (por ejemplo, Estados Unidos).
3. Espera a que el servicio diga **Running** (unos minutos).
4. En la pestaña **Overview**, en *Connection information*, quedan los datos que vas a necesitar:
   **Host**, **Port** (no es 3306: es otro número), **User** (`avnadmin`) y **Password**.
5. En la pestaña **Databases**, crea una base llamada `nexsuite`. También sirve la que trae, `defaultdb`.

Aiven exige conexión cifrada (SSL): NexSuite ya la usa en producción (`DB_SSL=true`, que es el valor por
defecto). Aiven también exige que cada tabla tenga llave primaria: las 39 tablas de NexSuite la tienen.

## 2. El servidor en Render (Web Service)

1. Entra a **dashboard.render.com**, conecta tu GitHub y crea **New → Web Service** con el repositorio
   **`NexSuite__Backend`**.
2. Configuración:

| Campo | Valor |
|---|---|
| **Language / Runtime** | Node |
| **Branch** | la rama que subiste (por ejemplo `main`) |
| **Root Directory** | vacío (la raíz del repositorio) |
| **Build Command** | `npm ci --include=dev` |
| **Start Command** | `npm run db:setup && npm start` |
| **Instance Type** | Free |
| **Health Check Path** (en *Advanced*) | `/health` |

- `--include=dev` hace falta porque `NODE_ENV=production` haría que `npm ci` se salte `sequelize-cli`, que
  es el que corre las migraciones.
- `db:setup` corre en cada arranque las migraciones nuevas, los permisos y los roles del sistema. Se puede
  repetir sin duplicar nada. Así no hace falta una consola en Render, que en el plan gratis no hay.

3. **Environment Variables** (*Environment*):

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `22` |
| `TRUST_PROXY` | `1` |
| `TOKEN_SECRET` | Un secreto de 96 caracteres. Genéralo en tu PC con `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `CORS_ORIGINS` | La dirección de las pantallas del paso 4, **exacta y sin `/` al final**, por ejemplo `https://nexsuite-app.onrender.com`. Mientras no la tengas, pon cualquiera y cámbiala después |
| `DB_HOST` | El *Host* de Aiven |
| `DB_PORT` | El *Port* de Aiven |
| `DB_USERNAME` | `avnadmin` |
| `DB_PASSWORD` | La *Password* de Aiven |
| `DB_NAME` | `nexsuite` (o `defaultdb`) |
| `DB_SSL` | `true` |
| `CHATBOT_ENABLED` | `false` (el chatbot no se prueba todavía) |
| `BUSINESS_NAME`, `BUSINESS_NIT`, `BUSINESS_PHONE`, `RECEIPT_FOOTER` | Opcionales: los datos del negocio se llenan después en *Configuración → Datos del negocio* |

No pongas `PORT`: Render lo da solo. No pongas variables de WhatsApp ni de Anthropic.

4. **Create Web Service**. En **Logs** debe verse que corren las migraciones y, al final,
   `✅ Conexión a la base de datos establecida` y `🚀 Server running`.
5. Comprueba en el navegador: `https://<tu-servicio>.onrender.com/health` debe responder
   `{"status":"ok","database":"ok",…}`.

## 3. Crear tu primer usuario (desde tu PC)

En una base nueva nadie puede entrar todavía. En el plan gratis de Render no hay consola, así que el
primer usuario se crea **desde tu computador**, conectado a la base de Aiven.

En **PowerShell**, dentro de la carpeta `BackEnd` de tu proyecto, pon los mismos valores que en Render.
Solo valen para esa ventana: al cerrarla, se borran.

```powershell
$env:NODE_ENV = "production"
$env:DB_HOST = "<host de Aiven>"
$env:DB_PORT = "<puerto de Aiven>"
$env:DB_USERNAME = "avnadmin"
$env:DB_PASSWORD = "<contraseña de Aiven>"
$env:DB_NAME = "nexsuite"
$env:DB_SSL = "true"
$env:CHATBOT_ENABLED = "false"
$env:CORS_ORIGINS = "https://nexsuite-app.onrender.com"
$env:TOKEN_SECRET = "<el mismo de Render>"
npm run setup:first-user -- --cc <tu cédula> --nombres "<Nombres>" --apellidos "<Apellidos>" --correo <tu correo>
```

Muestra **una sola vez** una contraseña temporal. Entra con ella y cámbiala en *Administrativo →
Usuarios*. Para el Administrador del negocio, repite el comando con otra cédula y `--admin` al final.
Después, **cierra esa ventana de PowerShell**.

> Si dice «No existen los roles del sistema», el servidor de Render todavía no terminó de arrancar
> (`db:setup`). Espera a que `/health` responda y repite.

## 4. Las pantallas en Render (Static Site)

1. **New → Static Site** con el repositorio **`NexSuite`** (el de las pantallas).
2. Configuración:

| Campo | Valor |
|---|---|
| **Branch** | la rama que subiste |
| **Root Directory** | vacío |
| **Build Command** | `npm ci && npm run build` |
| **Publish Directory** | `dist` |

3. **Environment Variables**:

| Variable | Valor |
|---|---|
| `VITE_REACT_APP_URL` | `https://<tu-servicio-del-paso-2>.onrender.com/api/v1` |
| `VITE_PRODUCTION_SITE` | `true` |
| `NODE_VERSION` | `22` |

4. **Create Static Site**. Copia la dirección que te da (por ejemplo
   `https://nexsuite-app.onrender.com`).
5. **Vuelve al servidor** (paso 2) y pon esa dirección exacta en `CORS_ORIGINS`. Render reinicia el
   servidor solo.

Las pantallas usan rutas con `#` (`/#/ventas/...`), así que no hace falta configurar redirecciones.

> Las variables `VITE_*` quedan visibles en el navegador: nunca pongas secretos ahí. El sitio de
> demostración en Netlify no cambia.

## 5. Probar

1. Abre la dirección de las pantallas e inicia sesión con tu usuario del paso 3.
2. **La primera vez puede tardar hasta un minuto**: el servidor gratis se «duerme» y despierta con la
   primera petición.
3. Llena *Configuración → Datos del negocio*, crea las sucursales, las cajas y los usuarios, y prueba con
   `docs/VERIFICACION.md`.

## 6. Actualizar

Cada **push** a GitHub vuelve a desplegar solo: el servidor corre las migraciones nuevas al arrancar
(`db:setup`) y las pantallas se recompilan. Revisa los **Logs** de Render si algo no arranca.

## 7. Límites de la prueba gratis (para tenerlos en cuenta)

- **El servidor se duerme** tras unos 15 minutos sin uso, y la primera petición tarda en despertarlo.
  Mientras duerme **no corre el reloj de la caja automática**: las cajas no abren solas a las 8:00 ni dejan
  de vender a las 19:00 si nadie está usando el sistema. Al despertar se pone al día, pero no lo uses para
  probar horarios exactos.
- **Respaldos:** `npm run backup` no aplica aquí (el disco de Render no es permanente). Aiven guarda sus
  propias copias según su plan. No pongas datos reales que no puedas perder.
- **Aiven gratis:** espacio limitado y el servicio puede apagarse si pasa mucho tiempo sin uso (Aiven avisa
  por correo antes). Para encenderlo de nuevo, usa su consola.
- **Correo de comprobantes:** solo si agregas las variables `SMTP_*` (opcional).

## 8. Si algo falla

| Síntoma | Qué revisar |
|---|---|
| El log de Render dice «Configuración incompleta (production)» | Falta `DB_HOST`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`, `CORS_ORIGINS` o un `TOKEN_SECRET` de 32 caracteres o más |
| «No se pudo conectar a la base de datos» | Host, **puerto de Aiven** (no 3306), usuario y contraseña; que el servicio de Aiven esté *Running*; `DB_SSL=true` |
| `npm ci` dice «can only install with an existing package-lock.json» | El `package-lock.json` no está en GitHub: súbelo (el `.gitignore` del servidor ya no lo excluye) |
| `sequelize-cli: not found` al arrancar | El *Build Command* debe ser `npm ci --include=dev` |
| Las pantallas cargan pero todo dice «Network Error» | `VITE_REACT_APP_URL` (con `https://` y `/api/v1`) y que `CORS_ORIGINS` tenga la dirección exacta de las pantallas, sin `/` final. Después de cambiar `VITE_*`, vuelve a desplegar las pantallas (*Manual Deploy*) |
| Las pantallas muestran «Demostración · datos ficticios» | Falta `VITE_PRODUCTION_SITE=true` en el Static Site; vuelve a desplegar |
| Tarda mucho la primera vez | Normal en el plan gratis: el servidor estaba dormido |
| `setup:first-user` no conecta | Las variables de PowerShell del paso 3 (mismos valores que Render) y que estés en la carpeta `BackEnd` |
