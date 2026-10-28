# Guía de despliegue de NexSuite (Fase 17.4)

Paso a paso para poner NexSuite a funcionar de verdad: el **servidor (API) y la base de datos en un
VPS propio** con Linux, y las **pantallas en Netlify**. Al final quedan respaldos automáticos cada
noche y la forma de actualizar a una versión nueva.

> **Nunca pegues contraseñas, el `TOKEN_SECRET` ni el `.env` en chats, correos ni en el repositorio.**
> En esta guía los valores secretos aparecen como `<…>`: los inventas tú y solo viven en el VPS.

---

## 0. Lo que necesitas

| Qué | Para qué | Recomendación |
|---|---|---|
| Un VPS con Ubuntu 24.04 LTS | Servidor (API), base de datos y respaldos | 2 GB de RAM, 1–2 vCPU, 40 GB de disco (DigitalOcean, Hostinger, Contabo…) |
| Un dominio | Direcciones con HTTPS | `api.tudominio.com` para la API; las pantallas pueden quedar en `tusitio.netlify.app` o en `app.tudominio.com` |
| Cuenta de Netlify | Publicar las pantallas | La misma del demo; el sitio real es **otro sitio** |
| Un lugar fuera del VPS para los respaldos | Si el VPS se pierde, los datos no | Google Drive, OneDrive o un bucket S3 (con rclone) |

Tiempo aproximado: 2 a 3 horas la primera vez.

---

## 1. Preparar el VPS

Entra por SSH como `root` (lo da el proveedor) y crea un usuario para trabajar:

```bash
adduser nexsuite
usermod -aG sudo nexsuite
```

Copia tu llave SSH a ese usuario (desde tu computador: `ssh-copy-id nexsuite@IP_DEL_VPS`) y desde
ahora entra como `nexsuite`. Luego:

```bash
# Actualizaciones de seguridad automáticas
sudo apt update && sudo apt upgrade -y
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades

# Firewall: solo SSH, HTTP y HTTPS (MySQL y el puerto 8080 NO quedan abiertos a internet)
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'   # si Nginx aún no está instalado, repite esta línea después del paso 2
sudo ufw enable

# Zona horaria del VPS (los registros y el cron de respaldos en hora de Colombia)
sudo timedatectl set-timezone America/Bogota
```

> Recomendado: en `/etc/ssh/sshd_config` pon `PasswordAuthentication no` y `PermitRootLogin no`, y
> reinicia con `sudo systemctl restart ssh` (prueba antes, en otra terminal, que entras con tu llave).

---

## 2. Instalar Node, MySQL, Nginx, PM2, certbot y rclone

```bash
# Node 22 LTS (la versión con la que se desarrolló y probó NexSuite)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v22.x

# MySQL 8, Nginx, certbot (HTTPS gratis) y rclone (copia de los respaldos fuera del VPS)
sudo apt install -y mysql-server nginx certbot python3-certbot-nginx rclone

# PM2: mantiene el servidor andando y lo levanta al reiniciar el VPS
sudo npm install -g pm2
```

---

## 3. Base de datos

```bash
sudo mysql_secure_installation   # contraseña fuerte para root, quita usuarios anónimos y la base de prueba
sudo mysql
```

Dentro de MySQL crea la base y un usuario **solo para ella** (inventa la contraseña):

```sql
CREATE DATABASE db_nexsuite CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'nexsuite'@'localhost' IDENTIFIED BY '<contraseña-de-la-base>';
GRANT ALL PRIVILEGES ON db_nexsuite.* TO 'nexsuite'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

MySQL queda escuchando solo en el VPS (el firewall no abre el 3306).

---

## 4. Subir el código del servidor

El proyecto está en **dos repositorios de GitHub**: el del servidor (`NexSuite__Backend`) va al VPS; el
de las pantallas (`NexSuite`) va a Netlify (paso 9). **Antes de desplegar, sube a GitHub (commit y push)
lo último de los dos.**

En el VPS se clona **solo el del servidor**, en la carpeta `~/app/BackEnd` (las rutas de esta guía
usan esa carpeta):

```bash
mkdir -p ~/app ~/logs ~/respaldos
cd ~/app
git clone https://github.com/AndresDev-20/NexSuite__Backend.git BackEnd
cd BackEnd
npm ci                                   # instala todo (sequelize-cli hace falta para las migraciones)
```

> **Si el repositorio es privado**, GitHub pide permiso. Lo más seguro es una **llave de despliegue**
> de solo lectura: en el VPS `ssh-keygen -t ed25519 -f ~/.ssh/github_nexsuite` y agrega el contenido
> de `~/.ssh/github_nexsuite.pub` en GitHub → el repositorio → *Settings → Deploy keys* (sin permiso
> de escritura). Luego clona con la dirección SSH (`git@github.com:AndresDev-20/NexSuite__Backend.git`).
> El `.env` nunca se sube a GitHub (está en `.gitignore`): se crea en el VPS en el paso 5.

> `npm ci` (no `npm ci --omit=dev`): las migraciones usan `sequelize-cli`, que está entre las
> dependencias de desarrollo.

---

## 5. El `.env` de producción

En `~/app/BackEnd` copia el ejemplo y llénalo: `cp .env.example .env && nano .env`. Las variables
que importan en producción:

| Variable | Valor | Nota |
|---|---|---|
| `NODE_ENV` | `production` | Usa las variables `DB_*` sin sufijo y exige `CORS_ORIGINS` |
| `PORT` | `8080` | Solo lo ve Nginx |
| `TRUST_PROXY` | `1` | Hay un proxy delante (Nginx): así se lee la IP real del cliente (auditoría y límites) |
| `CORS_ORIGINS` | `https://tusitio.netlify.app` | La dirección exacta de las pantallas reales (varias, separadas por coma) |
| `TOKEN_SECRET` | `<secreto>` | Mínimo 32 caracteres. Genéralo con `openssl rand -hex 48` |
| `DB_HOST` / `DB_PORT` | `127.0.0.1` / `3306` | |
| `DB_NAME` / `DB_USERNAME` / `DB_PASSWORD` | `db_nexsuite` / `nexsuite` / `<contraseña-de-la-base>` | Los del paso 3 |
| `DB_SSL` | `false` | MySQL está en el mismo VPS; si la base estuviera en otro servidor, déjalo en `true` |
| `BUSINESS_NAME`, `BUSINESS_NIT`, `BUSINESS_PHONE`, `RECEIPT_FOOTER` | opcionales | Solo de respaldo: los datos del negocio se llenan en **Configuración → Datos del negocio** |
| `SMTP_*`, `MAIL_FROM` | opcionales | Para enviar comprobantes por correo (ver los comentarios del `.env.example`) |
| `BACKUP_DIR` | `/home/nexsuite/respaldos` | |
| `BACKUP_KEEP_DAYS` / `BACKUP_KEEP_MONTHS` | `30` / `12` | |
| `BACKUP_REMOTE` | `drive:nexsuite-respaldos` | El destino de rclone del paso 10 (vacío = sin copia afuera) |
| `WHATSAPP_*`, `ANTHROPIC_API_KEY`, `CHATBOT_*` | ver `docs/CHATBOT-WHATSAPP.md` | Solo si usas el chatbot de WhatsApp (Fase 16) |

Las variables `*_DEV` y `*_TEST` no se usan en producción. Protege el archivo: `chmod 600 .env`.

---

## 6. Crear la base desde cero y el primer usuario

```bash
cd ~/app/BackEnd
npm run db:setup
```

Corre todas las migraciones y crea los permisos y los roles del sistema (Administrador y Developer).
Es el mismo orden con el que las pruebas arman su base desde cero cada vez.

Luego crea **tu usuario** (Developer) — en una base nueva nadie puede entrar todavía:

```bash
npm run setup:first-user -- --cc <tu-cédula> --nombres "<Nombres>" --apellidos "<Apellidos>" --correo <tu-correo>
```

Muestra **una sola vez** una contraseña temporal: entra con ella y cámbiala en Administrativo →
Usuarios. Con `--admin` crea el primer **Administrador** (por ejemplo, el de Carlos); los demás
usuarios se crean desde la aplicación.

> ¿Quieres llevar los datos que ya cargaron en desarrollo? Saca un respaldo en tu equipo
> (`npm run backup`), cópialo al VPS y restáuralo (paso 10) **en vez** de `db:setup`. Revisa antes
> que no lleve datos de prueba.

---

## 7. Arrancar el servidor con PM2

```bash
cd ~/app/BackEnd
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup          # copia y ejecuta la línea que te muestra (con sudo)
curl http://127.0.0.1:8080/health
```

Debe responder `{"status":"ok","database":"ok",…}`. Para ver el registro: `pm2 logs nexsuite-api`.

PM2 corre **una sola instancia** a propósito: la caja automática (abrir a las 8:00 y dejar de vender a
las 19:00) va dentro del servidor y no debe duplicarse.

---

## 8. Nginx y HTTPS para la API

1. En tu proveedor de dominio crea un registro **A**: `api.tudominio.com` → IP del VPS. Espera a que
   responda (`ping api.tudominio.com`).
2. Configura Nginx con la plantilla del proyecto:

```bash
sudo cp ~/app/BackEnd/deploy/nginx/nexsuite-api.conf /etc/nginx/sites-available/nexsuite-api
sudo nano /etc/nginx/sites-available/nexsuite-api       # cambia api.tudominio.com por el tuyo
sudo ln -s /etc/nginx/sites-available/nexsuite-api /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.tudominio.com              # HTTPS gratis; elige redirigir http a https
```

3. Comprueba desde tu computador: `https://api.tudominio.com/health` → `"status":"ok"`.

El certificado se renueva solo (certbot deja programada la renovación).

---

## 9. Las pantallas reales en Netlify

El sitio de **demostración** sigue como está. El real es **otro sitio** con el mismo repositorio:

1. Netlify → *Add new site* → *Import an existing project* → GitHub.
2. Elige el repositorio de las **pantallas** (`AndresDev-20/NexSuite`). **Base directory**: vacío (la raíz del repositorio) · **Build command**: `npm run build` · **Publish directory**: `dist`.
3. *Site configuration → Environment variables*:
   - `VITE_PRODUCTION_SITE` = `true` (apaga el demo que activa `netlify.toml` solo en este sitio)
   - `VITE_REACT_APP_URL` = `https://api.tudominio.com/api/v1`
   - `NODE_VERSION` = `22`
4. Despliega. Copia la dirección del sitio (`https://…netlify.app` o tu dominio `app.tudominio.com`)
   y ponla en `CORS_ORIGINS` del `.env` del VPS; luego `pm2 reload nexsuite-api`.
5. Entra con tu usuario del paso 6. En **Configuración → Datos del negocio** llena nombre, NIT,
   teléfono y demás: salen en los comprobantes.

> Las variables `VITE_*` quedan visibles en el navegador: nunca pongas secretos ahí.

---

## 10. Respaldos automáticos

### 10.1 Copia fuera del VPS (rclone)

```bash
rclone config
```

Crea un destino (*remote*), por ejemplo `drive` de tipo Google Drive, y sigue las instrucciones
(autoriza desde tu navegador). Prueba: `rclone lsd drive:`. Pon `BACKUP_REMOTE=drive:nexsuite-respaldos`
en el `.env`.

### 10.2 Probar y programar

```bash
cd ~/app/BackEnd
npm run backup        # debe decir ✅ Respaldo… y ☁️ Copia fuera del servidor…
crontab -e
```

Agrega esta línea (todas las noches a las 2:30 a. m., hora de Colombia):

```cron
30 2 * * * cd /home/nexsuite/app/BackEnd && /usr/bin/npm run backup >> /home/nexsuite/logs/respaldos.log 2>&1
```

Queda así:

- `~/respaldos/diarios`: los de los últimos 30 días.
- `~/respaldos/mensuales`: el primero de cada mes, durante 12 meses.
- La misma carpeta copiada en `BACKUP_REMOTE`.

### 10.3 Restaurar

**Revisar un respaldo sin tocar la base real** (recomendado una vez al mes):

```bash
npm run restore -- --archivo ~/respaldos/diarios/<archivo>.sql.gz --base revision_respaldo --confirmar revision_respaldo --crear
```

Revisa las tablas en `revision_respaldo` y bórrala después (`DROP DATABASE revision_respaldo;`).

**Volver la base real a un respaldo** (solo si de verdad hace falta):

```bash
pm2 stop nexsuite-api
npm run restore -- --archivo ~/respaldos/diarios/<archivo>.sql.gz --confirmar db_nexsuite
pm2 start nexsuite-api
```

Antes de reemplazar la base, el script guarda cómo estaba en `~/respaldos/antes-de-restaurar`, por si
hay que devolverse. Se pierde todo lo que se hizo después de ese respaldo.

---

## 11. Actualizar a una versión nueva

```bash
cd ~/app/BackEnd
npm run backup                     # siempre un respaldo antes de actualizar
git pull                           # o copia el código nuevo
npm ci
npm run db:migrate                 # aplica solo las migraciones nuevas
pm2 reload nexsuite-api            # sin cortar: termina lo que está atendiendo y reinicia
curl http://127.0.0.1:8080/health
```

Las pantallas se actualizan solas en Netlify al subir el código (o con *Trigger deploy*).

> Cada migración nueva viene descrita en `PROGRESS.md`: léela antes. Si un permiso nuevo debe llegar a
> los roles del sistema que no lo tienen, `npm run seed:admin` lo asigna (se puede correr las veces que
> haga falta).

---

## 12. Si algo falla

| Síntoma | Qué revisar |
|---|---|
| `pm2 logs` dice «Configuración incompleta (production)» | Falta una variable del paso 5 (`DB_*`, `CORS_ORIGINS` o un `TOKEN_SECRET` de 32+ caracteres) |
| «No se pudo conectar a la base de datos» | Usuario, contraseña y nombre de la base; `DB_SSL=false` si MySQL está en el mismo VPS; `sudo systemctl status mysql` |
| `/health` responde 503 | El servidor anda pero la base no responde: `sudo systemctl restart mysql` y revisa el disco (`df -h`) |
| Las pantallas dicen «Network Error» o fallan todas las peticiones | `VITE_REACT_APP_URL` en Netlify (con `https://` y `/api/v1`) y que `CORS_ORIGINS` tenga la dirección exacta del sitio |
| Las pantallas reales muestran «Demostración · datos ficticios» | Falta `VITE_PRODUCTION_SITE=true` en ese sitio de Netlify; vuelve a desplegar |
| La caja no abre sola a las 8:00 | `pm2 status` (debe estar *online*), la caja con «Abre sola» y sin «día sin abrir»; el reloj usa la hora de Colombia |
| Todos aparecen con la misma IP en la auditoría | `TRUST_PROXY=1` en el `.env` y `pm2 reload nexsuite-api` |
| `npm run backup` dice «mysqldump: not found» | `sudo apt install mysql-client` o define `MYSQL_BIN_DIR` |
| El respaldo no llega a Drive | `rclone lsd drive:` y el log `~/logs/respaldos.log` |
| Un certificado vencido | `sudo certbot renew --dry-run` |

---

## 13. Lista final antes de entregar

> El chatbot de WhatsApp (Fase 16) se conecta aparte, cuando el servidor ya está publicado: sigue
> `docs/CHATBOT-WHATSAPP.md`.

- [ ] `https://api.tudominio.com/health` responde `ok`.
- [ ] Las pantallas reales cargan **sin** el aviso de demostración y se puede iniciar sesión.
- [ ] Contraseña temporal del primer usuario cambiada.
- [ ] Datos del negocio llenos en Configuración; un comprobante de prueba sale con ellos.
- [ ] Sucursales, cajas (horario y base del día) y usuarios creados con sus roles.
- [ ] `npm run backup` funciona y el respaldo aparece en el destino de rclone.
- [ ] El cron de respaldos quedó programado (`crontab -l`).
- [ ] Probaste restaurar un respaldo en una base de revisión.
- [ ] `pm2 startup` hecho: el servidor vuelve solo si se reinicia el VPS (pruébalo con `sudo reboot`).
