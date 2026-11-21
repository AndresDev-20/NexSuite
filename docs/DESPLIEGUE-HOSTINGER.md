# Despliegue en el VPS de Hostinger: Armando y Carlos

Hoja de ruta para **este** VPS (Hostinger KVM 4, Ubuntu) con **dos empresas**: la de **Carlos** y la de **Armando**.
Los comandos ya traen los nombres puestos. La explicación completa de cada paso está en
[DESPLIEGUE.md](DESPLIEGUE.md) (el número entre paréntesis es su sección).

> Nunca pegues contraseñas, el `TOKEN_SECRET`, llaves privadas ni el `.env` en chats, correos ni en GitHub.
> Donde dice `<…>` va un valor que inventas tú y que solo vive en el VPS o en los *Secrets* de GitHub.
> Este archivo está en el repositorio: **no escribas aquí la IP ni ninguna contraseña**.

## Cómo queda

| | Carlos | Armando |
|---|---|---|
| Carpeta | `~/apps/carlos/BackEnd` | `~/apps/armando/BackEnd` |
| Base / usuario MySQL | `db_carlos` / `carlos` | `db_armando` / `armando` |
| `APP_NAME` (PM2) | `carlos-api` | `armando-api` |
| `PORT` | `8080` | `8081` |
| API (ejemplo) | `carlos-api.tudominio.com` | `armando-api.tudominio.com` |
| Pantallas (Netlify) | `nexsuite-carlos.netlify.app` | `nexsuite-armando.netlify.app` |
| Respaldos | `~/respaldos/carlos` · 2:30 a. m. | `~/respaldos/armando` · 2:45 a. m. |
| `TOKEN_SECRET`, contraseña de la base | propios | propios (distintos a los de Carlos) |

Un solo código para las dos. Cada una con su base, su `.env`, su proceso, su dirección y sus respaldos: los datos
de Carlos y los de Armando nunca se mezclan. Cuando subes un cambio a GitHub, se actualizan las dos solas.

---

## Paso 0. Antes de empezar (en tu computador)

1. **Sube todo a GitHub**, los dos repositorios, a la rama `main`:
   - `NexSuite__Backend` (servidor). Lleva las migraciones de las últimas fases (apartados, ofertas, compras,
     subcategorías…) y `.github/workflows/deploy.yml`, que hace la actualización automática.
   - `NexSuite` (pantallas).
2. Corre `npm test` en `BackEnd` antes de subir: debe quedar todo en verde.
3. Revisa que **`.env` del servidor no se suba** (ya está en `.gitignore`).

## Paso 1. Revisar el VPS en el panel de Hostinger (1)

En **VPS → Administrar**:

- **Ubicación del servidor:** el mapa del panel señala **Indonesia**. Si el servidor está en Asia, cada clic
  en las pantallas tarda bastante más desde Colombia. Revisa la ubicación en la vista general del VPS. Si de
  verdad está en Asia, pide en el chat de Hostinger que lo pasen a **Estados Unidos** o **Brasil**
  (es mejor hacerlo ahora, con el VPS vacío).
- **Sistema operativo:** debe ser **Ubuntu 24.04** limpio, **sin panel**: sin CloudPanel, Coolify ni
  WordPress. Si tiene otra cosa, reinstálalo desde el panel con «Ubuntu 24.04» simple (borra todo lo que
  tenga el VPS, pero ahora está vacío).
- **Contraseña de root:** pon una larga y guárdala en tu gestor de contraseñas.
- **Llave SSH:** si no tienes, créala en tu computador (PowerShell) y pega en el panel el contenido de la
  pública (`id_ed25519.pub`):

```powershell
ssh-keygen -t ed25519
```

```powershell
Get-Content $HOME\.ssh\id_ed25519.pub
```

- **Firewall del panel:** apagado, o abierto solo para 22, 80 y 443.

Prueba que entras (cambia `IP_DEL_VPS` por la IP que muestra el panel):

```powershell
ssh root@IP_DEL_VPS
```

## Paso 2. Direcciones (DNS) (2)

Cada empresa necesita una dirección para su API. Con un dominio tuyo, en su zona DNS crea:

| Tipo | Nombre | Valor |
|---|---|---|
| A | `carlos-api` | IP del VPS |
| A | `armando-api` | IP del VPS |

Si cada primo tiene su propio dominio, puede ser `api.dominiodecarlos.com` y `api.dominiodearmando.com`.
Espera hasta que `ping carlos-api.tudominio.com` responda con la IP del VPS.

## Paso 3. Preparar el VPS (3) — una vez

Entra como `root` y crea tu usuario de trabajo:

```bash
adduser nexsuite
usermod -aG sudo nexsuite
mkdir -p /home/nexsuite/.ssh
cp ~/.ssh/authorized_keys /home/nexsuite/.ssh/
chown -R nexsuite:nexsuite /home/nexsuite/.ssh
chmod 700 /home/nexsuite/.ssh && chmod 600 /home/nexsuite/.ssh/authorized_keys
```

Sal y entra como `nexsuite` (`ssh nexsuite@IP_DEL_VPS`). Luego copia los comandos de la sección **3** de
DESPLIEGUE.md: actualizaciones automáticas, firewall (`ufw`), zona horaria de Bogotá, swap de 4 GB, carpetas
y cerrar la entrada con contraseña. **Antes de cerrar la contraseña, comprueba en otra ventana que entras
con la llave.**

## Paso 4. Instalar y ajustar (4 y 5) — una vez

Copia tal cual las secciones **4** (Node 22, MySQL, Nginx, PM2, certbot, rclone) y **5** de DESPLIEGUE.md.
En la 5.1, con los 16 GB del KVM 4: `innodb_buffer_pool_size = 4G`.

## Paso 5. Llave para que el VPS lea GitHub (7.1) — una vez

Sigue la sección **7.1**: crea la llave `github_nexsuite` en el VPS y agrégala como *Deploy key* (solo
lectura) en el repositorio `NexSuite__Backend`.

## Paso 6. Empresa de Carlos

### 6.1 Base de datos (6)

```bash
openssl rand -base64 24     # contraseña de la base de Carlos: guárdala
sudo mysql
```

```sql
CREATE DATABASE db_carlos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'carlos'@'localhost' IDENTIFIED BY '<contraseña-base-carlos>';
GRANT ALL PRIVILEGES ON db_carlos.* TO 'carlos'@'localhost';
ALTER USER 'carlos'@'localhost' WITH MAX_USER_CONNECTIONS 20;
FLUSH PRIVILEGES;
EXIT;
```

### 6.2 Código (7.2)

```bash
mkdir -p ~/apps/carlos ~/respaldos/carlos
cd ~/apps/carlos
git clone git@github.com:AndresDev-20/NexSuite__Backend.git BackEnd
cd BackEnd
npm ci
```

### 6.3 El `.env` (8)

```bash
openssl rand -hex 48        # TOKEN_SECRET de Carlos: guárdalo
cp .env.example .env
nano .env
chmod 600 .env
```

Lo que cambia frente al ejemplo:

```ini
NODE_ENV=production
APP_NAME=carlos-api
APP_MAX_MEMORY=400M
PORT=8080
TRUST_PROXY=1
CORS_ORIGINS=https://nexsuite-carlos.netlify.app
TOKEN_SECRET=<el de openssl rand -hex 48>
DB_HOST=127.0.0.1
DB_PORT=3306
DB_SSL=false
DB_NAME=db_carlos
DB_USERNAME=carlos
DB_PASSWORD=<contraseña-base-carlos>
DB_STORAGE_LIMIT_MB=20000
BACKUP_DIR=/home/nexsuite/respaldos/carlos
BACKUP_KEEP_DAYS=30
BACKUP_KEEP_MONTHS=12
BACKUP_REMOTE=drive:nexsuite-respaldos/carlos
```

(El correo, `WHATSAPP_*` y `ANTHROPIC_API_KEY` se llenan después, solo si Carlos los usa.)

### 6.4 Crear la base y tu usuario (9)

```bash
npm run db:migrate
npm run seed:permissions
npm run seed:admin
npm run setup:first-user -- --cc <tu-cédula> --nombres "<Nombres>" --apellidos "<Apellidos>" --correo <tu-correo>
```

> En un VPS **no uses `npm run db:setup`**: además corre el seeder del Developer pensado para Render, con una
> contraseña fija que está en el repositorio, y luego `setup:first-user` ya no deja crear tu usuario.

Muestra una contraseña temporal **una sola vez**: guárdala para entrar y cambiarla. Para que Carlos tenga su
propio Administrador, créalo desde la aplicación (Administrativo → Usuarios) o con `--admin`.

> La base arranca **vacía**. Lo que hay en tu base de desarrollo son datos de prueba: no se pasa.

### 6.5 Arrancar (10)

```bash
pm2 start deploy/ecosystem.config.js
pm2 save
curl http://127.0.0.1:8080/health
pm2 startup      # SOLO esta primera vez: ejecuta la línea sudo que te muestra
pm2 save
```

### 6.6 Nginx y HTTPS (11)

```bash
sudo cp ~/apps/carlos/BackEnd/deploy/nginx/nexsuite-api.conf /etc/nginx/sites-available/carlos-api
sudo nano /etc/nginx/sites-available/carlos-api
```

Cambia `server_name` por `carlos-api.tudominio.com` y deja `proxy_pass http://127.0.0.1:8080;`. Agrega
`limit_req zone=nexsuite_api burst=40 nodelay;` como primera línea dentro de `location / {`.

```bash
sudo ln -s /etc/nginx/sites-available/carlos-api /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d carlos-api.tudominio.com
```

Abre `https://carlos-api.tudominio.com/health` en el navegador: debe decir `"status":"ok"`.

### 6.7 Pantallas en Netlify (12)

Netlify → *Add new site → Import an existing project → GitHub* → repositorio **`NexSuite`** (pantallas).

- Branch `main` · Build command `npm run build` · Publish directory `dist`.
- *Environment variables*:
  - `VITE_PRODUCTION_SITE` = `true`
  - `VITE_REACT_APP_URL` = `https://carlos-api.tudominio.com/api/v1`
  - `NODE_VERSION` = `22`
- *Site name*: `nexsuite-carlos`.

Si el nombre del sitio quedó distinto, corrige `CORS_ORIGINS` en el `.env` de Carlos y luego:

```bash
pm2 reload deploy/ecosystem.config.js --update-env   # desde ~/apps/carlos/BackEnd
```

Entra con tu usuario y llena **Configuración → Datos del negocio** y el logo.

## Paso 7. Empresa de Armando

Es lo mismo que el paso 6, cambiando:

| Dónde | Carlos | Armando |
|---|---|---|
| Base, usuario | `db_carlos`, `carlos` | `db_armando`, `armando` |
| Carpetas | `~/apps/carlos`, `~/respaldos/carlos` | `~/apps/armando`, `~/respaldos/armando` |
| `.env`: `APP_NAME` / `PORT` | `carlos-api` / `8080` | `armando-api` / `8081` |
| `.env`: `CORS_ORIGINS` | `https://nexsuite-carlos.netlify.app` | `https://nexsuite-armando.netlify.app` |
| `.env`: `TOKEN_SECRET`, `DB_PASSWORD` | los de Carlos | **otros nuevos** |
| `.env`: `BACKUP_DIR` / `BACKUP_REMOTE` | `…/carlos` | `…/armando` |
| `curl` de salud | `127.0.0.1:8080` | `127.0.0.1:8081` |
| Nginx | `carlos-api`, `proxy_pass …:8080` | `armando-api`, `proxy_pass …:8081` |
| Certificado | `carlos-api.tudominio.com` | `armando-api.tudominio.com` |
| Netlify | sitio `nexsuite-carlos` | sitio `nexsuite-armando`, con `VITE_REACT_APP_URL` de Armando |

`pm2 startup` **no** se repite. Al final, `pm2 status` debe mostrar `carlos-api` y `armando-api` en *online*.

## Paso 8. Respaldos (13)

1. `rclone config` una vez (destino `drive`, Google Drive) y prueba con `rclone lsd drive:`.
2. En cada empresa, `npm run backup` debe terminar con ✅ y ☁️.
3. `crontab -e` y agrega:

```cron
30 2 * * * cd /home/nexsuite/apps/carlos/BackEnd && /usr/bin/npm run backup >> /home/nexsuite/logs/respaldos-carlos.log 2>&1
45 2 * * * cd /home/nexsuite/apps/armando/BackEnd && /usr/bin/npm run backup >> /home/nexsuite/logs/respaldos-armando.log 2>&1
```

## Paso 9. Actualización automática desde GitHub (14)

Sigue la sección **14**: llave `github-actions` en el VPS y, en GitHub → `NexSuite__Backend` → *Settings →
Secrets and variables → Actions*:

- **Secrets:** `VPS_HOST` (la IP), `VPS_USER` (`nexsuite`), `VPS_SSH_KEY` (la llave privada) y
  `VPS_KNOWN_HOSTS` (lo que muestra `ssh-keyscan -t ed25519 IP_DEL_VPS`).
- **Variables:** `DEPLOY_ENABLED` = `true`.

Prueba con *Actions → Desplegar en el VPS → Run workflow*: debe salir en verde **una vez por empresa**
(`✅ carlos-api…` y `✅ armando-api…`).

**Desde ahí, cada vez que subas a `main`:**

- **Servidor:** GitHub saca un respaldo de cada empresa, instala, aplica las migraciones nuevas y reinicia las
  dos sin cortarlas (1 a 3 minutos).
- **Pantallas:** Netlify reconstruye los dos sitios solo.
- **Orden:** si un cambio trae servidor y pantallas, sube primero el servidor, espera el verde, y luego las
  pantallas.

## Paso 10. Lista final (19)

Para **cada** empresa:

- [ ] `https://…-api…/health` responde `ok`.
- [ ] Las pantallas cargan sin el aviso de demostración y puedes entrar.
- [ ] Contraseña temporal cambiada; datos del negocio y logo llenos.
- [ ] Sucursales, cajas y usuarios creados.
- [ ] El respaldo llega a Drive y el cron quedó (`crontab -l`).
- [ ] Un push a `main` la actualiza sola (Actions en verde con su nombre).
- [ ] Después de `sudo reboot`, `pm2 status` muestra las dos en *online*.
